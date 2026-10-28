import { fileURLToPath, URL } from 'url'
import {
  defineConfig,
  loadEnv,
  PluginOption,
  // UserConfig,
  type Plugin
} from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'node:path'
import { cp, stat } from 'node:fs/promises'

// type ViteConfigEnv = 'staging' | 'production'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const relativeDirectoryKeys = [
  'VITE_SHADER_BASE',
  'VITE_TEXTURE_BASE',
  'VITE_MODEL_BASE',
  'VITE_PRT_SH_BASE'
] as const

function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`[vite.config] Missing required environment variable: ${key}`)
  }
  return value
}

function validateBaseUrl(value: string): string {
  if (!value.startsWith('/') || !value.endsWith('/')) {
    throw new Error(`[vite.config] VITE_BASE_URL must start and end with "/"; received "${value}"`)
  }
  return value
}

function validateRelativeDirectory(key: string, value: string): void {
  if (value.startsWith('/') || !value.endsWith('/')) {
    throw new Error(
      `[vite.config] ${key} must be a relative directory without a leading "/" and with a trailing "/"; received "${value}"`
    )
  }
}

function parsePort(value: string): number {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `[vite.config] VITE_PORT must be an integer from 1 to 65535; received "${value}"`
    )
  }
  return port
}

function copyShadersPlugin(): Plugin {
  let shaderSource = ''
  let shaderTarget = ''

  return {
    name: 'project/copy-shaders',

    apply: 'build',

    configResolved(config) {
      shaderSource = resolve(config.root, 'src/shaders')
      shaderTarget = resolve(config.root, config.build.outDir, 'shaders')
    },

    async writeBundle() {
      await cp(shaderSource, shaderTarget, {
        recursive: true,
        filter: async (source) => {
          const sourceStat = await stat(source)

          return sourceStat.isDirectory() || /\.(?:vert|frag)$/i.test(source)
        }
      })
    }
  }
}

function createPlugins(analyze: boolean): PluginOption[] {
  const plugins: PluginOption[] = [copyShadersPlugin()]

  if (analyze) {
    plugins.push(
      visualizer({
        filename: resolve(projectRoot, 'dist/bundle-report.html'),
        open: false,
        gzipSize: true,
        brotliSize: true
      }) as PluginOption
    )
  }

  return plugins
}

export default defineConfig(({ command, mode, isPreview }) => {
  console.log(`Command: ${command}, Mode: ${mode}, isPreview: ${isPreview}`)

  const env = loadEnv(mode, projectRoot)
  const base = validateBaseUrl(env.VITE_BASE_URL || '/')

  for (const key of relativeDirectoryKeys) {
    validateRelativeDirectory(key, requireEnv(env, key))
  }

  // 只有 npm run dev 时为 true。
  //   dev:     'serve' 且 !false → true
  //   build:   'build'           → false（&& 左边已经是 false）
  //   preview: 'serve' 且 !true  → false
  //   给条件起个名字，读下面一行时一眼就知道它在问什么
  const isDevServer = command === 'serve' && !isPreview

  return {
    base,
    plugins: createPlugins(command === 'build' && process.env.ANALYZE === 'true'),
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src')
      }
      // extensions: ['.mjs', '.js', '.ts', '.d.ts', '.json']
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    server: isDevServer
      ? {
          port: parsePort(requireEnv(env, 'VITE_PORT')),
          strictPort: true,
          host: true,
          open: false
        }
      : undefined,
    build: {
      assetsDir: 'bundle',
      minify: 'terser',
      reportCompressedSize: false, // 普通构建不重复计算 gzip 大小；需要分析时使用 visualizer
      terserOptions: {
        compress: {
          drop_debugger: true // 删除断点语句
          // 不设置 drop_console：保证 Logger 的生产日志能够输出
        }
      }
    }
  }
})
