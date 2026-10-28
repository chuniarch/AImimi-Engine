import { mat4, vec3 } from 'gl-matrix'
import { afterEach, describe, expect, it } from 'vitest'

import { mountOrbitCameraInput } from '@/rendering/controls/mountOrbitCameraInput'
import type { Vec3Tuple } from '@/rendering/core/math/tuples'
import { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'

/** 仅替换浏览器事件表面；相机、Transform、矩阵计算均使用真实实现。 */
class InputCanvas extends EventTarget {
  clientHeight = 200
  style = { touchAction: 'pan-y' }
  ownerDocument = { defaultView: new EventTarget() }
  captured: number | null = null

  setPointerCapture(id: number): void {
    this.captured = id
  }

  hasPointerCapture(id: number): boolean {
    return this.captured === id
  }

  releasePointerCapture(id: number): void {
    if (this.captured === id) this.captured = null
  }
}

/** Node 没有 PointerEvent；仅填充输入处理器读取的标准事件字段。 */
function pointer(canvas: InputCanvas, type: string, values: Partial<PointerEvent> = {}): Event {
  const event = new Event(type, { cancelable: true })
  Object.assign(event, {
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: 100,
    clientY: 100,
    ...values
  })
  canvas.dispatchEvent(event)
  return event
}

function wheel(canvas: InputCanvas, deltaY: number, deltaMode = 0): Event {
  const event = new Event('wheel', { cancelable: true })
  Object.assign(event, { deltaY, deltaMode })
  canvas.dispatchEvent(event)
  return event
}

function cameraAt(
  position: Vec3Tuple = [0, 0, 10],
  fovY = Math.PI / 4,
  aspect = 1
): PerspectiveCamera {
  const camera = new PerspectiveCamera({ fovY, aspect, near: 0.1, far: 1000 })
  camera.transform.setPosition(position)
  return camera
}

/** 模拟一段完整的右键拖动；坐标是 CSS 像素，不替代生产代码的位移换算。 */
function pan(canvas: InputCanvas, dx: number, dy: number): void {
  pointer(canvas, 'pointerdown', { button: 2, buttons: 2 })
  pointer(canvas, 'pointermove', { buttons: 2, clientX: 100 + dx, clientY: 100 + dy })
  pointer(canvas, 'pointerup', { button: 2, buttons: 0 })
}

/** 允许 Float32 存储的舍入误差，但期望值必须由测试场景独立给定。 */
function expectPosition(camera: PerspectiveCamera, expected: Vec3Tuple): void {
  const actual = camera.transform.position
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 4))
}

/** 用 view matrix 验证目标确实处于相机正前方，而不是复制控制器的欧拉角公式。 */
function expectLookingAt(camera: PerspectiveCamera, target: Vec3Tuple): void {
  const world = mat4.create()
  camera.copyWorldMatrixTo(world)
  const view = mat4.invert(mat4.create(), world)!
  const inView = vec3.transformMat4(vec3.create(), target, view)
  expect(inView[0]).toBeCloseTo(0, 4)
  expect(inView[1]).toBeCloseTo(0, 4)
  expect(inView[2]).toBeLessThan(0)
}

const disposers: (() => void)[] = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** 挂载 helper 不拥有相机；测试也通过公共 Transform/事件观察行为。 */
function mount(
  canvas: InputCanvas,
  getCamera: () => PerspectiveCamera | null,
  options: Parameters<typeof mountOrbitCameraInput>[2] = { target: [0, 0, 0] }
): () => void {
  const dispose = mountOrbitCameraInput(canvas as unknown as HTMLCanvasElement, getCamera, options)
  disposers.push(dispose)
  return dispose
}

describe('HW2 orbit camera input', () => {
  /** 防止挂载控制器就覆盖工厂预设；第一次点击也不应让画面跳动。 */
  it('挂载和按下指针不改变相机，拖动四分之一圈后仍看向目标', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt()
    const version = camera.transform.version
    mount(canvas, () => camera)
    pointer(canvas, 'pointerdown')
    expect(camera.transform.version).toBe(version)
    expect(canvas.captured).toBe(1)

    pointer(canvas, 'pointermove', { clientX: 50 })
    const [x, y, z] = camera.transform.position
    expect(x).toBeCloseTo(10)
    expect(y).toBeCloseTo(0)
    expect(z).toBeCloseTo(0)
    expectLookingAt(camera, [0, 0, 0])
  })

  it.each([
    [-30, 15],
    [70, -20],
    [110, 40],
    [-160, -40]
  ])('同时绕水平和俯仰方向拖动 %s/%s 后，保持半径且目标在画面中心', (dx, dy) => {
    const canvas = new InputCanvas()
    const camera = cameraAt([0, 10, 10])
    mount(canvas, () => camera, { target: [0, 10, 0] })
    pointer(canvas, 'pointerdown')
    pointer(canvas, 'pointermove', { clientX: 100 + dx, clientY: 100 + dy })
    const [x, y, z] = camera.transform.position
    expect(Math.hypot(x, y - 10, z)).toBeCloseTo(10, 4)
    expectLookingAt(camera, [0, 10, 0])
  })

  /** 极点附近不能翻转相机或产生退化朝向。 */
  it('俯仰被限制在两极之间，零高度 canvas 不产生 NaN', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt()
    mount(canvas, () => camera)
    pointer(canvas, 'pointerdown')
    pointer(canvas, 'pointermove', { clientY: 10000 })
    expect(camera.transform.position[1]).toBeGreaterThan(9)
    expect(Math.hypot(camera.transform.position[0], camera.transform.position[2])).toBeGreaterThan(
      0
    )
    expectLookingAt(camera, [0, 0, 0])
    canvas.clientHeight = 0
    pointer(canvas, 'pointermove', { clientX: 120, clientY: -10000 })
    expect(camera.transform.position.every(Number.isFinite)).toBe(true)
  })

  it('滚轮只改变轨道距离，并遵守最小/最大距离', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt()
    mount(canvas, () => camera, { target: [0, 0, 0], minDistance: 2, maxDistance: 20 })
    expect(wheel(canvas, 100).defaultPrevented).toBe(true)
    expect(camera.transform.position[2]).toBeGreaterThan(10)
    wheel(canvas, -100000)
    expect(camera.transform.position).toEqual([0, 0, 2])
    wheel(canvas, 100000)
    expect(camera.transform.position).toEqual([0, 0, 20])
    expectLookingAt(camera, [0, 0, 0])
  })

  it('统一滚轮的 pixel、line 和 page 单位', () => {
    const positions = [
      [16, 0],
      [1, 1],
      [0.08, 2]
    ].map(([delta, mode]) => {
      const canvas = new InputCanvas()
      const camera = cameraAt()
      mount(canvas, () => camera)
      wheel(canvas, delta!, mode!)
      return camera.transform.position
    })
    expect(positions[1]).toEqual(positions[0])
    expect(positions[2]).toEqual(positions[0])
  })

  /** 删除动态 getter、缓存首个相机会让这个测试失败。 */
  it('加载前输入无副作用；预设换相机后不再修改旧相机', () => {
    const canvas = new InputCanvas()
    let current: PerspectiveCamera | null = null
    mount(canvas, () => current)
    expect(wheel(canvas, 100).defaultPrevented).toBe(false)
    pointer(canvas, 'pointerdown')
    expect(canvas.captured).toBeNull()

    const previous = cameraAt()
    current = previous
    pointer(canvas, 'pointerdown')
    current = cameraAt([0, 0, 20])
    pointer(canvas, 'pointermove', { clientX: 50 })
    expect(previous.transform.position).toEqual([0, 0, 10])
    expect(current.transform.position).toEqual([0, 0, 20])
    expect(canvas.captured).toBeNull()
    wheel(canvas, -100)
    expect(current.transform.position[2]).toBeLessThan(20)
    expect(previous.transform.position).toEqual([0, 0, 10])
  })

  it.each(['pointerup', 'pointercancel', 'lostpointercapture', 'blur', 'webglcontextlost'])(
    '%s 终止拖动，迟到的 move 不改变相机',
    (type) => {
      const canvas = new InputCanvas()
      const camera = cameraAt()
      mount(canvas, () => camera)
      pointer(canvas, 'pointerdown')
      if (type === 'blur') canvas.ownerDocument.defaultView.dispatchEvent(new Event('blur'))
      else pointer(canvas, type)
      pointer(canvas, 'pointermove', { clientX: 50 })
      expect(camera.transform.position).toEqual([0, 0, 10])
      expect(canvas.captured).toBeNull()
    }
  )

  it('忽略中键、第二根手指和不属于本次拖动的 pointerId', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt()
    mount(canvas, () => camera)
    pointer(canvas, 'pointerdown', { button: 1, buttons: 4 })
    pointer(canvas, 'pointermove', { clientX: 50 })
    pointer(canvas, 'pointerdown', { isPrimary: false })
    expect(canvas.captured).toBeNull()
    pointer(canvas, 'pointerdown')
    pointer(canvas, 'pointerup', { pointerId: 2 })
    pointer(canvas, 'pointermove', { pointerId: 2, clientX: 50 })
    expect(camera.transform.position).toEqual([0, 0, 10])
    expect(canvas.captured).toBe(1)
  })

  it('卸载幂等、释放捕获、恢复 touchAction，且所有输入不再修改相机', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt()
    const dispose = mount(canvas, () => camera)
    expect(canvas.style.touchAction).toBe('none')
    pointer(canvas, 'pointerdown')
    dispose()
    dispose()
    expect(canvas.captured).toBeNull()
    expect(canvas.style.touchAction).toBe('pan-y')
    pointer(canvas, 'pointerdown')
    pointer(canvas, 'pointermove', { clientX: 50 })
    expect(wheel(canvas, -100).defaultPrevented).toBe(false)
    expect(camera.transform.position).toEqual([0, 0, 10])
  })

  it('非法选项在挂载前拒绝，不能留下 touchAction 或 listener 副作用', () => {
    const canvas = new InputCanvas()
    expect(() => mount(canvas, () => cameraAt(), { target: [0, NaN, 0] })).toThrow(RangeError)
    expect(() => mount(canvas, () => cameraAt(), { target: [0, 0, 0], minDistance: 0 })).toThrow(
      RangeError
    )
    expect(() => mount(canvas, () => cameraAt(), { target: [0, 0, 0], maxDistance: -1 })).toThrow(
      RangeError
    )
    expect(canvas.style.touchAction).toBe('pan-y')
    expect(wheel(canvas, 100).defaultPrevented).toBe(false)
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][orbit-screen-space-pan]
   * Given: 90° 视角、距离 10、高度 200，目标平面的可见高度为 20。
   * When: 右拖 50px、下拖 25px。
   * Then: 默认倍率相机向左 5、向上 2.5；0.8 倍率为向左 4、向上 2。
   * 错误地旋转相机、忽略倍率或颠倒屏幕方向，都会让本例失败。
   */
  it.each([
    { speed: undefined, expected: [-5, 2.5, 10] as Vec3Tuple },
    { speed: 0.8, expected: [-4, 2, 10] as Vec3Tuple },
    { speed: 0, expected: [0, 0, 10] as Vec3Tuple }
  ])('右键只平移并保留朝向，panSpeed=$speed', ({ speed, expected }) => {
    const canvas = new InputCanvas()
    const camera = cameraAt([0, 0, 10], Math.PI / 2)
    const rotation = camera.transform.rotation
    mount(canvas, () => camera, { target: [0, 0, 0], panSpeed: speed })

    pan(canvas, 50, 25)

    expectPosition(camera, expected)
    expect(camera.transform.rotation).toEqual(rotation)
    expectLookingAt(camera, [expected[0], expected[1], 0])
  })

  /** 固定像素输入：距离加倍应移动加倍，高度加倍应减半，不能再乘一次 aspect。 */
  it.each([
    { distance: 20, height: 200, fov: Math.PI / 2, aspect: 1, x: -8 },
    { distance: 10, height: 400, fov: Math.PI / 2, aspect: 1, x: -2 },
    { distance: 10, height: 200, fov: 2 * Math.atan(0.5), aspect: 1, x: -2 },
    { distance: 10, height: 200, fov: Math.PI / 2, aspect: 2, x: -4 }
  ])('平移采用当前透视参数与 CSS 高度：$distance/$height/$fov/$aspect', (sample) => {
    const canvas = new InputCanvas()
    canvas.clientHeight = sample.height
    const camera = cameraAt([0, 0, sample.distance], sample.fov, sample.aspect)
    mount(canvas, () => camera, { target: [0, 0, 0], panSpeed: 0.8 })

    pan(canvas, 50, 0)

    expectPosition(camera, [sample.x, 0, sample.distance])
  })

  /**
   * Given: 相机不再朝世界 -Z；第二组还带俯仰。
   * Then: 平移沿相机屏幕的右/上轴，不能硬编码修改世界 X/Y 或地面 X/Z。
   */
  it.each([
    { position: [10, 0, 0], rotation: [0, Math.PI / 2, 0], expected: [10, 2, 4] },
    { position: [0, 6, 8], rotation: [-Math.atan(0.75), 0, 0], expected: [-4, 7.6, 6.8] }
  ] as { position: Vec3Tuple; rotation: Vec3Tuple; expected: Vec3Tuple }[])(
    '旋转后的屏幕平移保持原始朝向：$position',
    ({ position, rotation, expected }) => {
      const canvas = new InputCanvas()
      const camera = cameraAt(position, Math.PI / 2)
      camera.transform.setRotation(rotation)
      const beforeRotation = camera.transform.rotation
      mount(canvas, () => camera, { target: [0, 0, 0], panSpeed: 0.8 })

      pan(canvas, 50, 25)

      expectPosition(camera, expected)
      expect(camera.transform.rotation).toEqual(beforeRotation)
    }
  )

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][orbit-pan-target-consistency]
   * 如果只平移 position 而没有平移 target，随后旋转/缩放就会围绕原点跳转。
   * 本例只观察真实相机与 view matrix，不读取控制器内部 target。
   */
  it('平移后左键旋转和滚轮缩放继续围绕新的 target', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt([0, 0, 10], Math.PI / 2)
    mount(canvas, () => camera, { target: [0, 0, 0], panSpeed: 0.8 })
    pan(canvas, 50, 25)

    pointer(canvas, 'pointerdown')
    pointer(canvas, 'pointermove', { clientX: 50 })
    pointer(canvas, 'pointerup', { buttons: 0 })
    expectPosition(camera, [6, 2, 0])
    expectLookingAt(camera, [-4, 2, 0])

    wheel(canvas, Math.log(2) / 0.001)
    expectPosition(camera, [16, 2, 0])
    expectLookingAt(camera, [-4, 2, 0])
  })

  /** 每个 Camera 独享平移 target；切换时也必须结束已经开始的旧手势。 */
  it('换相机后不继承旧 target，迟到的右键 move 不修改任何一台相机', () => {
    const canvas = new InputCanvas()
    const previous = cameraAt([0, 0, 10], Math.PI / 2)
    let current = previous
    mount(canvas, () => current, { target: [0, 0, 0], panSpeed: 0.8, minDistance: 2 })
    pan(canvas, 50, 25)
    expectPosition(previous, [-4, 2, 10])
    pointer(canvas, 'pointerdown', { button: 2, buttons: 2 })

    current = cameraAt([0, 0, 20])
    pointer(canvas, 'pointermove', { buttons: 2, clientX: 150 })
    expect(canvas.captured).toBeNull()
    expectPosition(previous, [-4, 2, 10])
    expectPosition(current, [0, 0, 20])
    wheel(canvas, -100000)
    expectPosition(current, [0, 0, 2])
    expectLookingAt(current, [0, 0, 0])

    // 同一个对象重新成为当前相机时，它自己的 target 仍与已有 position 对应。
    current = previous
    wheel(canvas, -100000)
    expectPosition(previous, [-4, 2, 2])
  })

  /** options.target 是输入快照；内部平移不得修改调用者的数组。 */
  it('复制初始 target，不受外部改写影响，也不把平移写回输入数组', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt([0, 10, 10], Math.PI / 2)
    const target: [number, number, number] = [0, 10, 0]
    mount(canvas, () => camera, { target, panSpeed: 0.8 })
    target[0] = 100

    pan(canvas, 50, 25)

    expectPosition(camera, [-4, 12, 10])
    expect(target).toEqual([100, 10, 0])
  })

  /** 右键对应 buttons 的位 2；松开后即使没有收到 pointerup，也必须终止拖动。 */
  it.each([
    'pointerup',
    'pointercancel',
    'lostpointercapture',
    'blur',
    'webglcontextlost',
    'release'
  ])('右键拖动在 %s 后终止，迟到移动不再生效', (type) => {
    const canvas = new InputCanvas()
    const camera = cameraAt([0, 0, 10], Math.PI / 2)
    mount(canvas, () => camera, { target: [0, 0, 0], panSpeed: 0.8 })
    pointer(canvas, 'pointerdown', { button: 2, buttons: 2 })
    pointer(canvas, 'pointermove', { buttons: 2, clientX: 150 })
    expectPosition(camera, [-4, 0, 10])

    if (type === 'blur') canvas.ownerDocument.defaultView.dispatchEvent(new Event('blur'))
    else if (type === 'release') pointer(canvas, 'pointermove', { buttons: 0, clientX: 170 })
    else pointer(canvas, type, { button: 2, buttons: 0 })
    pointer(canvas, 'pointermove', { buttons: 2, clientX: 200 })

    expectPosition(camera, [-4, 0, 10])
    expect(canvas.captured).toBeNull()
  })

  /** contextmenu 拦截和右键 capture 都必须随卸载结束，不能遗留页面级副作用。 */
  it('挂载时阻止 canvas 右键菜单，卸载后恢复菜单并停止右键输入', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt([0, 0, 10], Math.PI / 2)
    const dispose = mount(canvas, () => camera, { target: [0, 0, 0], panSpeed: 0.8 })
    expect(pointer(canvas, 'contextmenu', { button: 2 }).defaultPrevented).toBe(true)
    pointer(canvas, 'pointerdown', { button: 2, buttons: 2 })
    expect(canvas.captured).toBe(1)

    dispose()
    dispose()

    expect(canvas.captured).toBeNull()
    expect(pointer(canvas, 'contextmenu', { button: 2 }).defaultPrevented).toBe(false)
    pan(canvas, 50, 25)
    expectPosition(camera, [0, 0, 10])
  })

  /** 非有限/负速度必须在登记 listener 之前拒绝；零速度由上面的正常配置用例覆盖。 */
  it.each([-1, NaN, Infinity])('拒绝非法 panSpeed %s，且不留下 DOM 副作用', (panSpeed) => {
    const canvas = new InputCanvas()
    expect(() => mount(canvas, () => cameraAt(), { target: [0, 0, 0], panSpeed })).toThrow(
      RangeError
    )
    expect(canvas.style.touchAction).toBe('pan-y')
    expect(pointer(canvas, 'contextmenu').defaultPrevented).toBe(false)
  })

  /** 数值溢出不能只拒绝 position 却偷偷提交 target，否则下一次合法输入会跳变。 */
  it('溢出输入不污染 position 或 target，后续合法拖动仍正常', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt([0, 0, 10], Math.PI / 2)
    mount(canvas, () => camera, { target: [0, 0, 0], panSpeed: 0.8 })

    pan(canvas, Number.MAX_VALUE, 0)
    expectPosition(camera, [0, 0, 10])
    pan(canvas, 50, 25)
    expectPosition(camera, [-4, 2, 10])
    expectLookingAt(camera, [-4, 2, 0])
  })

  /**
   * @remarks
   * [DESIGN-WEIGHT:3][orbit-pan-target-consistency]
   * 在 2^24 附近，向左 0.08 小于 Float32 的位置精度。position 没动时 target
   * 也不能独自移动，否则下一次缩放会使本应保持为零的相机旋转出现偏转。
   */
  it('被 Float32 舍入掉的微小平移不会单独移动 target', () => {
    const canvas = new InputCanvas()
    const camera = cameraAt([16777216, 0, 10], Math.PI / 2)
    mount(canvas, () => camera, { target: [16777216, 0, 0], panSpeed: 0.8, minDistance: 2 })

    pan(canvas, 1, 0)
    expectPosition(camera, [16777216, 0, 10])
    wheel(canvas, -100000)

    expectPosition(camera, [16777216, 0, 2])
    expect(camera.transform.rotation[1]).toBe(0)
  })
})
