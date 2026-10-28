import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import type { Camera } from '@/rendering/scene/cameras/Camera'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'

/**
 * 单指/鼠标左键轨道旋转、鼠标右键屏幕平移与滚轮缩放的配置。
 *
 * target 与 camera.transform.position 使用同一个父节点局部空间，局部 +Y 为上方。
 * 当前 HW2 的 Scene 变换为单位矩阵，因此这里也就是世界空间。
 * 右键平移目前支持 PerspectiveCamera；不提供地面平移模式、惯性、双指手势或任意 up 轴。
 * 像素到场景距离的换算面向 HW2 的无缩放相机及单位变换父节点。
 */
export interface OrbitCameraInputOptions {
  readonly target: Vec3Tuple
  /** 距离范围必须为有限正数；默认 0.1～1000。 */
  readonly minDistance?: number
  readonly maxDistance?: number
  /** 拖动一个 canvas CSS 高度对应的整圈数；默认 1。 */
  readonly rotateSpeed?: number
  /** 屏幕平移倍率，默认 1；0 禁用右键平移，HW2 接线显式采用 0.8。 */
  readonly panSpeed?: number
  /** 每个滚轮像素产生的对数距离变化；默认 0.001。 */
  readonly zoomSpeed?: number
}

/** 一次拖动绑定一个 pointer 和一个相机；相机替换后该手势失效。 */
interface DragState {
  readonly pointerId: number
  readonly camera: Camera
  /** 一次手势固定为旋转或平移；中途按其他键不切换模式。 */
  readonly mode: 'rotate' | 'pan'
  x: number
  y: number
}

const TWO_PI = 2 * Math.PI
/** 避开两极，保持确定的水平朝向和有限的旋转矩阵。 */
const MAX_ELEVATION = Math.PI / 2 - 0.001

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 给新 CPU Camera 挂载浏览器输入，不创建帧循环，也不调用 WebGL。
 *
 * @param canvas - 接收输入的真实 DOM canvas。
 * @param getCamera - 每次输入时查询当前相机；加载前/退出后可以返回 null。
 * @param options - 轨道目标及速度/距离限制；挂载时复制，不借用可变 target 数组。
 * @returns 幂等卸载函数；调用者应在清理 HW2 场景之前执行它。
 * @throws RangeError 配置不合法时抛出，此时尚未修改 DOM 或登记监听器。
 *
 * @remarks
 * [DESIGN-WEIGHT:3][orbit-current-camera-and-session-lifetime]
 *
 * 预设切换会创建新的 Camera，所以不能捕获挂载时的首个相机。
 * 拖动中发生替换时终止旧手势；新手势与滚轮使用新相机自己的当前位置。
 * 挂载本身不修改 Transform，因此不会覆盖工厂设置的初始取景。
 * 修改 Transform 后，由 Engine 原有的帧循环绘制，不引入第二条 rAF 链。
 */
export function mountOrbitCameraInput(
  canvas: HTMLCanvasElement,
  getCamera: () => Camera | null,
  options: OrbitCameraInputOptions
): () => void {
  const initialTarget: Vec3Tuple = [...options.target]
  const minDistance = options.minDistance ?? 0.1
  const maxDistance = options.maxDistance ?? 1000
  const rotateSpeed = options.rotateSpeed ?? 1
  const panSpeed = options.panSpeed ?? 1
  const zoomSpeed = options.zoomSpeed ?? 0.001

  if (
    initialTarget.length !== 3 ||
    !initialTarget.every((value) => Number.isFinite(Math.fround(value))) ||
    ![minDistance, maxDistance, rotateSpeed, panSpeed, zoomSpeed].every(Number.isFinite) ||
    minDistance <= 0 ||
    maxDistance < minDistance ||
    rotateSpeed < 0 ||
    panSpeed < 0 ||
    zoomSpeed < 0
  ) {
    throw new RangeError(
      'Orbit input requires a finite target, positive distance bounds and nonnegative speeds'
    )
  }

  const hostWindow = canvas.ownerDocument.defaultView
  const previousTouchAction = canvas.style.touchAction
  let closed = false
  let drag: DragState | null = null

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][orbit-pan-target-consistency]
   * 只有发生平移的相机才需要保存自己的新 target。新预设创建的 Camera 默认使用
   * initialTarget，不继承旧相机的偏移；同一个相机再次被使用时则保留自己的 target。
   * WeakMap 不以强引用阻止已退出相机被回收，也不拥有 Scene/Camera 的生命周期。
   */
  const targets = new WeakMap<Camera, Vec3Tuple>()
  /** 复用局部矩阵的复制缓冲，仅用于读取屏幕右/上轴，不是 view matrix 缓存。 */
  const panLocalMatrix = new Float32Array(16)

  /**
   * 先清空手势，再交还 pointer capture，避免 lostpointercapture 同步重入。
   * 浏览器可能已因取消/元素移除而撤销 capture，不能让它阻止场景退出。
   */
  function endDrag(): void {
    const previous = drag
    drag = null
    if (previous === null) return
    try {
      if (canvas.hasPointerCapture(previous.pointerId)) {
        canvas.releasePointerCapture(previous.pointerId)
      }
    } catch {
      // pointer 已失效；本地手势已结束，不再保留旧 Camera 引用。
    }
  }

  /**
   * 从当前 position 重新读取球坐标，不维护可能落后于预设或外部修改的相机副本。
   *
   * [DESIGN-WEIGHT:3][orbit-position-to-transform-rotation]
   *
   * offset = r × [sin(azimuth) cos(elevation), sin(elevation),
   *               cos(azimuth) cos(elevation)]。
   * Transform 使用 gl-matrix 的欧拉约定；写入 [-elevation, azimuth, 0]
   * 对应 R_y(azimuth) R_x(-elevation)，让相机局部 -Z 指向 target。
   * 这里不能只更新位置，否则相机会绕圈移动却始终看向旧方向。
   */
  function applyOrbit(
    camera: Camera,
    azimuthDelta: number,
    elevationDelta: number,
    zoom: number
  ): void {
    const target = targets.get(camera) ?? initialTarget
    const position = camera.transform.position
    const x = position[0] - target[0]
    const y = position[1] - target[1]
    const z = position[2] - target[2]
    const horizontal = Math.hypot(x, z)
    const distance = Math.hypot(horizontal, y)
    if (!Number.isFinite(distance)) return

    const radius = clamp((distance || minDistance) * zoom, minDistance, maxDistance)
    const azimuth = (Math.atan2(x, z) + azimuthDelta) % TWO_PI
    const elevation = clamp(
      Math.atan2(y, horizontal) + elevationDelta,
      -MAX_ELEVATION,
      MAX_ELEVATION
    )
    const ringRadius = radius * Math.cos(elevation)
    const next: Vec3Tuple = [
      target[0] + ringRadius * Math.sin(azimuth),
      target[1] + radius * Math.sin(elevation),
      target[2] + ringRadius * Math.cos(azimuth)
    ]
    // Transform 保存 Float32，不能把溢出的输入写成 Infinity 而破坏下一帧矩阵。
    if (!next.every((value) => Number.isFinite(Math.fround(value)))) return
    camera.transform.setPosition(next)
    camera.transform.setRotation([-elevation, azimuth, 0])
  }

  /**
   * 在与相机屏幕平行的平面中同步平移 position 和 target，不改变旋转或观察距离。
   *
   * @param camera - 当前手势绑定的相机；本阶段仅处理透视相机。
   * @param dx - 鼠标向右为正的 CSS 像素差。
   * @param dy - 鼠标向下为正的 CSS 像素差。
   *
   * @remarks
   * [DESIGN-WEIGHT:3][orbit-screen-space-pan]
   * 距离 target 为 d 时，可见平面的高度为 2*d*tan(fovY/2)。除以 canvas CSS 高度
   * 得到每像素对应的场景距离，再乘 panSpeed；横纵共用该比例，不再次乘 aspect。
   * 使用 CSS 而非 drawing buffer 高度，避免 DPR 改变手感。
   *
   * 局部矩阵的第 0、1 列分别是屏幕右、上方向在父节点空间中的表示。归一化后，
   * 位移为 -dx*right + dy*up：相机向左/上移，画面中的物体相应向右/下移动。
   * position 与 target 使用相同位移，因此 position-target 不变；后续旋转/缩放
   * 必须继续读取这个新 target，不能回到挂载时的 initialTarget。
   */
  function applyPan(camera: Camera, dx: number, dy: number): void {
    if (!(camera instanceof PerspectiveCamera) || panSpeed === 0) return
    const target = targets.get(camera) ?? initialTarget
    const position = camera.transform.position
    const distance = Math.hypot(
      position[0] - target[0],
      position[1] - target[1],
      position[2] - target[2]
    )
    const unitsPerPixel =
      (2 * distance * Math.tan(camera.fovY / 2) * panSpeed) / Math.max(1, canvas.clientHeight)
    if (!Number.isFinite(unitsPerPixel) || unitsPerPixel === 0) return

    camera.transform.copyLocalMatrixTo(panLocalMatrix)
    const rightLength = Math.hypot(panLocalMatrix[0]!, panLocalMatrix[1]!, panLocalMatrix[2]!)
    const upLength = Math.hypot(panLocalMatrix[4]!, panLocalMatrix[5]!, panLocalMatrix[6]!)
    if (
      !Number.isFinite(rightLength) ||
      !Number.isFinite(upLength) ||
      rightLength === 0 ||
      upLength === 0
    )
      return

    const horizontal = (-dx * unitsPerPixel) / rightLength
    const vertical = (dy * unitsPerPixel) / upLength
    // 先得到实际将写入 Transform 的 Float32 位置，所有分量都有效后才提交。
    const nextPosition: Vec3Tuple = [
      Math.fround(position[0] + horizontal * panLocalMatrix[0]! + vertical * panLocalMatrix[4]!),
      Math.fround(position[1] + horizontal * panLocalMatrix[1]! + vertical * panLocalMatrix[5]!),
      Math.fround(position[2] + horizontal * panLocalMatrix[2]! + vertical * panLocalMatrix[6]!)
    ]
    // target 跟随量化后的真实位移；微小拖动被 Float32 舍入掉时，target 也不能单独移动。
    const nextTarget: Vec3Tuple = [
      target[0] + (nextPosition[0] - position[0]),
      target[1] + (nextPosition[1] - position[1]),
      target[2] + (nextPosition[2] - position[2])
    ]
    if (
      !nextPosition.every(Number.isFinite) ||
      !nextTarget.every((value) => Number.isFinite(Math.fround(value)))
    )
      return

    camera.transform.setPosition(nextPosition)
    targets.set(camera, nextTarget)
  }

  /** 捕获指针后，拖出 canvas 的移动和释放仍会送到本元素；只接受左键/单指和鼠标右键。 */
  function onPointerDown(event: PointerEvent): void {
    if (closed || drag !== null || !event.isPrimary) return
    const mode =
      event.button === 0
        ? 'rotate'
        : event.button === 2 && event.pointerType === 'mouse'
          ? 'pan'
          : null
    if (mode === null) return
    const camera = getCamera()
    if (camera === null) return
    if (mode === 'pan' && (!(camera instanceof PerspectiveCamera) || panSpeed === 0)) return
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      // 元素已经脱离文档或 pointer 已失效，不启动一个无法可靠结束的手势。
      return
    }
    drag = { pointerId: event.pointerId, camera, mode, x: event.clientX, y: event.clientY }
    event.preventDefault()
  }

  /** 使用 CSS 像素而非 drawing buffer 像素，避免高 DPR 屏幕改变手感。 */
  function onPointerMove(event: PointerEvent): void {
    if (closed || event.pointerId !== drag?.pointerId) return
    const camera = getCamera()
    // button 是按下的键编号；buttons 是当前按键位掩码，左键为 1、右键为 2。
    const requiredButtons = drag.mode === 'pan' ? 2 : 1
    if (
      camera !== drag.camera ||
      (event.pointerType === 'mouse' && (event.buttons & requiredButtons) === 0)
    ) {
      endDrag()
      return
    }
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    drag.x = event.clientX
    drag.y = event.clientY
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return
    if (drag.mode === 'pan') {
      applyPan(camera, dx, dy)
    } else {
      const radiansPerPixel = (TWO_PI * rotateSpeed) / Math.max(1, canvas.clientHeight)
      applyOrbit(camera, -dx * radiansPerPixel, dy * radiansPerPixel, 1)
    }
    event.preventDefault()
  }

  function onPointerEnd(event: PointerEvent): void {
    if (event.pointerId === drag?.pointerId) endDrag()
  }

  /** 仅在挂载期间阻止 canvas 的右键菜单，不影响页面其他元素或卸载后的默认行为。 */
  function onContextMenu(event: Event): void {
    if (!closed) event.preventDefault()
  }

  /**
   * wheel 的 deltaMode 可为像素、行或页；行按 16 CSS px，页按 canvas 高度换算。
   * 指数缩放保持距离始终为正；先限制指数，再限制距离，避免极大滚轮输入溢出。
   * passive:false 允许在实际控制相机时阻止浏览器同时滚动页面。
   */
  function onWheel(event: WheelEvent): void {
    if (closed || !Number.isFinite(event.deltaY) || event.deltaY === 0) return
    const camera = getCamera()
    if (camera === null) return
    if (drag !== null && camera !== drag.camera) endDrag()
    const unit =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, canvas.clientHeight) : 1
    const zoom = Math.exp(clamp(event.deltaY * unit * zoomSpeed, -50, 50))
    applyOrbit(camera, 0, 0, zoom)
    event.preventDefault()
  }

  canvas.style.touchAction = 'none'
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerEnd)
  canvas.addEventListener('pointercancel', onPointerEnd)
  canvas.addEventListener('lostpointercapture', onPointerEnd)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('contextmenu', onContextMenu)
  // 只取消手势；context 的 preventDefault/恢复仍由 Backend 生命周期管理。
  canvas.addEventListener('webglcontextlost', endDrag)
  hostWindow?.addEventListener('blur', endDrag)

  return () => {
    if (closed) return
    closed = true
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerEnd)
    canvas.removeEventListener('pointercancel', onPointerEnd)
    canvas.removeEventListener('lostpointercapture', onPointerEnd)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('contextmenu', onContextMenu)
    canvas.removeEventListener('webglcontextlost', endDrag)
    hostWindow?.removeEventListener('blur', endDrag)
    endDrag()
    canvas.style.touchAction = previousTouchAction
  }
}
