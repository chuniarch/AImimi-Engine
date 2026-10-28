# 课程维护与重复更新

## 发布

在项目根目录执行，source 参数指向原工作区的 teach 目录，不要求任何固定用户名或项目下载位置：

```sh
node scripts/sync-webgl1-course.mjs --source /path/to/teach
node scripts/sync-webgl1-course.mjs --source /path/to/teach --apply
node scripts/build-docs-index.mjs
node scripts/sync-webgl1-course.mjs --source /path/to/teach --check
node --test scripts/webgl1-course/publication.test.mjs
```

第一条仅预览。新增课程、修改资源和首页变化通过同一工具发布；当前首页与 README 按课程文件名排序。未来自定义学习顺序尚未实现。

工具先构造并检查全部候选内容，再核对目标文件与上次发布的 SHA-256。人工修改、未管理文件覆盖和移除均会报告；冲突或待移除项目阻止本次写入，不会静默覆盖或删除。源目录和目标目录不能互相包含。写入使用同目录临时文件逐项替换；这不是跨文件系统事务，中断后应核对并重新发布。

原工作区只读，私人记录、草稿和独立实验不会自动收录。新引用的其他主 checkout 文档需要先加入发布工具的允许清单。引擎项目中新引用的 src、tests、docs 文件会保存为阅读快照。

## 路径

课程 HTML 使用 ../assets、../reference 等相对链接。course.js 的公开适配器由 scripts/webgl1-course/portable-links.js 提供：在经典脚本执行时捕获自身 URL，以它定位课程根目录。data-src/data-main 分别保存逻辑文件路径与可选行号；统一指向 reference/source-viewer.html。

source-viewer 使用经典脚本 sources.js 中的文本快照，通过 textContent 展示，既不 fetch 本地文件，也不要求 VS Code 或第二个 checkout。该目录独立部署后仍可阅读引用文件。Markdown 参考资料在浏览器中可能显示为文本；HTML 首页和课程正文不依赖 Markdown 渲染。

## 演示包

assets/\*-bundle.js 是历史演示的发布产物，本次复制不会重建。assets/build 是维护入口，其中 @/ 指向项目 src，three 和 gl-matrix 从项目依赖解析。不同包可能对应不同引擎版本；某些旧卡片使用旧构造契约，不能对所有入口一键重新打包。

需要重建时，在项目根目录使用已有 esbuild：选择对应 entry.ts，输出 IIFE 经典脚本，保持原来的 global-name、target=es2020 和 keep-names；camera 包还需要将 three 指向 assets/build/three-slim.js，并将 gl-matrix 指向项目安装的版本。重建后要逐项复查依赖该包的课程卡片。本次没有新增或安装构建依赖。

第三方来源包括 three.js r177 和 gl-matrix；许可文本见 reference/licenses。不要删除它们的署名与许可。

## 验收和上线

检查本地资源链接、源码快照、首页顺序、课程题目及实际演示。ESLint、Prettier、主工程 tsc 和提交前检查将本课程代码视为教学资源，检查范围见项目配置。

归档进入 Git 与部署为网站是独立步骤。项目现有 Vite 构建没有自动将本目录作为课程站点发布；上线时需完整复制本目录，保持内部相对结构，再验证网站子路径。无需将课程导入引擎 main.ts。
