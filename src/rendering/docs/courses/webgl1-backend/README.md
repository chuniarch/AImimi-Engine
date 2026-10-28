# WebGL1 渲染架构精读课程

[打开 HTML 课程首页](./index.html) · [维护与重复更新](./MAINTENANCE.md) · [参考资料](./RESOURCES.md)

下载项目后，直接用浏览器打开本目录的 index.html。课程也支持在静态网站子目录中访问；需要完整发布本目录及其 assets、reference、lessons。

## 按文件名顺序阅读

- [第 1 课 · 一次 draw 的四段调用](lessons/0001-one-draw-four-stages.html)
- [第 2 课 · GL 怎样告诉你失败了](lessons/0002-five-failure-channels.html)
- [第 3 课 · src/rendering 全景](lessons/0003-architecture-overview.html)
- [第 4 课 · CPU 资源与 GPU 表示](lessons/0004-cpu-resource-gpu-representation.html)
- [第 5 课 · 所有权与生命周期](lessons/0005-ownership-and-lifecycle.html)
- [第 6 课 · 边界与失败](lessons/0006-boundaries-and-failure.html)
- [第 7 课 · core 精读](lessons/0007-core-resource-errors.html)
- [第 8 课 · Transform 与 SceneNode](lessons/0008-transform-and-scenenode.html)
- [第 9 课 · Group、Scene、Mesh 与 Camera](lessons/0009-group-scene-mesh-camera.html)
- [第 10 课 · VertexAttribute 与 Geometry](lessons/0010-vertex-attribute-and-geometry.html)
- [第 11 课 · ShaderModule 与 Material](lessons/0011-shader-module-and-material.html)
- [第 12 课 · Texture 家族与 RenderTarget](lessons/0012-textures-and-render-targets.html)
- [第 13 课 · Capabilities 与 ContextLifecycle](lessons/0013-capabilities-and-context-lifecycle.html)
- [第 14 课 · WebGL1State](lessons/0014-webgl1-state.html)
- [第 15 课 · ProgramManager](lessons/0015-program-manager.html)
- [第 16 课 · 顶点数据交给 GPU](lessons/0016-geometry-and-vertex-input.html)
- [第 17 课 · 把图片交给 GPU](lessons/0017-cube-texture-manager.html)
- [第 18 课 · 资源协调器](lessons/0018-resource-manager.html)
- [第 19 课 · Task 15 编排](lessons/0019-task15-backend-orchestration.html)
- [第 20 课 · 模型文件、PRT 数据与异步加载](lessons/0020-model-files-prt-data-async.html)
- [第 21 课 · HW2 的 OBJ 与 PRT 加载](lessons/0021-task19-hw2-loaders.html)
- [第 22 课 · 拿仿真需求审 src/rendering](lessons/0022-code-review-for-simulation.html)
- [第 23 课 · 从零设计 fetchWithTimeout](lessons/0023-designing-fetch-with-timeout.html)
- [第 24 课 · 一次请求在网络上怎么走](lessons/0024-http-on-the-wire.html)
- [第 25 课已拆成两课](lessons/0025-camera-and-orbit-controls.html)
- [第 25 课 · 相机的数学](lessons/0025-camera-math.html)
- [第 26 课 · 轨道控制](lessons/0026-orbit-controls.html)
- [第 27 课 · 离屏画布](lessons/0027-render-target-manager.html)
- [第 28 课 · 生命周期的边角](lessons/0028-lifecycle-edge-cases.html)
- [第 29 课 · 纹理一族的设计思路](lessons/0029-texture-family-design.html)
- [第 30 课 · 帧编排](lessons/0030-frame-orchestration.html)
- [第 31 课 · 一帧的全局图](lessons/0031-frame-overview.html)
- [第 32 课 · 点落在哪个像素](lessons/0032-point-to-pixel.html)
- [第 33 课 · 平移](lessons/0033-pan-from-the-formula.html)
- [第 34 课 · 滚轮缩放](lessons/0034-zoom-by-multiplying.html)
- [第 35 课 · 歪头](lessons/0035-roll-orbit-vs-arcball.html)
- [第 36 课 · 浏览器事件从零开始](lessons/0036-events-from-zero.html)
- [第 37 课 · 拖动与指针捕获](lessons/0037-drag-and-capture.html)
- [第 38 课 · 右键、滚轮、两根手指](lessons/0038-buttons-wheel-two-fingers.html)
- [第 39 课 · FFT 为什么频繁查询](lessons/0039-why-fft-queries-so-often.html)
- [第 40 课 · 一个函数画完阴影](lessons/0040-shadow-one-function.html)
- [第 41 课 · 只做一次与每帧做](lessons/0041-build-once-lookup-by-object.html)
- [第 42 课 · 画什么写成数据](lessons/0042-what-to-draw-as-data.html)
- [第 43 课 · 每帧先抄一份](lessons/0043-snapshot-each-frame.html)
- [第 44 课 · 两遍变成两个 Pass](lessons/0044-passes-and-surface-scope.html)
- [第 45 课 · 阴影值怎样送进 shader](lessons/0045-values-into-shader.html)
- [第 46 课 · 不正常的时候](lessons/0046-when-things-go-wrong.html)
- [第 47 课 · 一次 draw 怎样接起三样东西](lessons/0047-how-draw-connects.html)
- [第 48 课 · 两遍之间谁插得进来](lessons/0048-who-runs-between-passes.html)

## 内容和版本

这是原教学工作区的公开发布副本。未包含个人学习记录、教学备忘、草稿及独立实验。引用文件快照只包含课文实际引用的项目文件、选定设计文档和课程维护源码。

演示 bundle 保留原有二进制内容，来自不同历史版本，不能据此宣称与当前引擎源码完全一致。课程中的行号、完成状态和设计提案可能随源码演进而过时；具体出处见快照与维护说明。

自动发布的文件由 .publication-state.json 记录。正文在原工作区编辑后再更新本副本；本副本如有人工修改，发布工具会报告冲突。
