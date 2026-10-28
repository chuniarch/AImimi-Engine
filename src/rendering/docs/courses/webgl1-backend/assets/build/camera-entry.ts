// 第 25 课用：项目的相机、Transform、轨道输入，加上同版本 three.js（r177）的相机与 OrbitControls，
// 好在同一页里并排运行、逐项比较。three 来自 dual-webgl-backend worktree 的 node_modules（只读）；
// 构建时加 --alias:three=three-slim.js，只打包用到的模块。
export { Camera } from '@/rendering/scene/cameras/Camera'
export { PerspectiveCamera } from '@/rendering/scene/cameras/PerspectiveCamera'
export { Transform } from '@/rendering/scene/Transform'
export { Scene } from '@/rendering/scene/Scene'
export { Group } from '@/rendering/scene/Group'
export { mountOrbitCameraInput } from '@/rendering/controls/mountOrbitCameraInput'
export { mat4, vec3, vec4, quat } from 'gl-matrix'
export {
  PerspectiveCamera as ThreePerspectiveCamera,
  Euler as ThreeEuler,
  Matrix4 as ThreeMatrix4,
  Vector3 as ThreeVector3,
  Quaternion as ThreeQuaternion,
  Object3D as ThreeObject3D,
  Spherical as ThreeSpherical
} from 'three'
export { OrbitControls as ThreeOrbitControls } from './three-orbit.js'
