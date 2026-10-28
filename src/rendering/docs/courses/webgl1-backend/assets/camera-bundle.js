// 自动生成：esbuild 打包 dual-webgl-backend worktree 的相机、Transform、轨道控制与 three r177 的对照类（2026-10-13，含工作区未提交的右键平移）。不要手改，重新构建见 NOTES.md。
"use strict";
var RTeachCamera = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../refactored-games202-project/claude-workspace/webgl1-backend/teach/assets/build/camera-entry.ts
  var camera_entry_exports = {};
  __export(camera_entry_exports, {
    Camera: () => Camera,
    Group: () => Group,
    PerspectiveCamera: () => PerspectiveCamera,
    Scene: () => Scene,
    ThreeEuler: () => Euler,
    ThreeMatrix4: () => Matrix4,
    ThreeObject3D: () => Object3D,
    ThreeOrbitControls: () => OrbitControls,
    ThreePerspectiveCamera: () => PerspectiveCamera2,
    ThreeQuaternion: () => Quaternion,
    ThreeSpherical: () => Spherical,
    ThreeVector3: () => Vector3,
    Transform: () => Transform,
    mat4: () => mat4_exports,
    mountOrbitCameraInput: () => mountOrbitCameraInput,
    quat: () => quat_exports,
    vec3: () => vec3_exports,
    vec4: () => vec4_exports
  });

  // node_modules/gl-matrix/esm/common.js
  var EPSILON = 1e-6;
  var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
  var RANDOM = Math.random;
  var degree = Math.PI / 180;
  if (!Math.hypot) Math.hypot = function() {
    var y = 0, i = arguments.length;
    while (i--) {
      y += arguments[i] * arguments[i];
    }
    return Math.sqrt(y);
  };

  // node_modules/gl-matrix/esm/mat3.js
  function create() {
    var out = new ARRAY_TYPE(9);
    if (ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[5] = 0;
      out[6] = 0;
      out[7] = 0;
    }
    out[0] = 1;
    out[4] = 1;
    out[8] = 1;
    return out;
  }
  __name(create, "create");

  // node_modules/gl-matrix/esm/mat4.js
  var mat4_exports = {};
  __export(mat4_exports, {
    add: () => add,
    adjoint: () => adjoint,
    clone: () => clone,
    copy: () => copy,
    create: () => create2,
    determinant: () => determinant,
    equals: () => equals,
    exactEquals: () => exactEquals,
    frob: () => frob,
    fromQuat: () => fromQuat,
    fromQuat2: () => fromQuat2,
    fromRotation: () => fromRotation,
    fromRotationTranslation: () => fromRotationTranslation,
    fromRotationTranslationScale: () => fromRotationTranslationScale,
    fromRotationTranslationScaleOrigin: () => fromRotationTranslationScaleOrigin,
    fromScaling: () => fromScaling,
    fromTranslation: () => fromTranslation,
    fromValues: () => fromValues,
    fromXRotation: () => fromXRotation,
    fromYRotation: () => fromYRotation,
    fromZRotation: () => fromZRotation,
    frustum: () => frustum,
    getRotation: () => getRotation,
    getScaling: () => getScaling,
    getTranslation: () => getTranslation,
    identity: () => identity,
    invert: () => invert,
    lookAt: () => lookAt,
    mul: () => mul,
    multiply: () => multiply,
    multiplyScalar: () => multiplyScalar,
    multiplyScalarAndAdd: () => multiplyScalarAndAdd,
    ortho: () => ortho,
    orthoNO: () => orthoNO,
    orthoZO: () => orthoZO,
    perspective: () => perspective,
    perspectiveFromFieldOfView: () => perspectiveFromFieldOfView,
    perspectiveNO: () => perspectiveNO,
    perspectiveZO: () => perspectiveZO,
    rotate: () => rotate,
    rotateX: () => rotateX,
    rotateY: () => rotateY,
    rotateZ: () => rotateZ,
    scale: () => scale,
    set: () => set,
    str: () => str,
    sub: () => sub,
    subtract: () => subtract,
    targetTo: () => targetTo,
    translate: () => translate,
    transpose: () => transpose
  });
  function create2() {
    var out = new ARRAY_TYPE(16);
    if (ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[11] = 0;
      out[12] = 0;
      out[13] = 0;
      out[14] = 0;
    }
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
  }
  __name(create2, "create");
  function clone(a) {
    var out = new ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  __name(clone, "clone");
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  __name(copy, "copy");
  function fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    var out = new ARRAY_TYPE(16);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
  }
  __name(fromValues, "fromValues");
  function set(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
  }
  __name(set, "set");
  function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(identity, "identity");
  function transpose(out, a) {
    if (out === a) {
      var a01 = a[1], a02 = a[2], a03 = a[3];
      var a12 = a[6], a13 = a[7];
      var a23 = a[11];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a01;
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a02;
      out[9] = a12;
      out[11] = a[14];
      out[12] = a03;
      out[13] = a13;
      out[14] = a23;
    } else {
      out[0] = a[0];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a[1];
      out[5] = a[5];
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a[2];
      out[9] = a[6];
      out[10] = a[10];
      out[11] = a[14];
      out[12] = a[3];
      out[13] = a[7];
      out[14] = a[11];
      out[15] = a[15];
    }
    return out;
  }
  __name(transpose, "transpose");
  function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  __name(invert, "invert");
  function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
    out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
    out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
    out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
    out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
    out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
    return out;
  }
  __name(adjoint, "adjoint");
  function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  }
  __name(determinant, "determinant");
  function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }
  __name(multiply, "multiply");
  function translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2];
    var a00, a01, a02, a03;
    var a10, a11, a12, a13;
    var a20, a21, a22, a23;
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0];
      a01 = a[1];
      a02 = a[2];
      a03 = a[3];
      a10 = a[4];
      a11 = a[5];
      a12 = a[6];
      a13 = a[7];
      a20 = a[8];
      a21 = a[9];
      a22 = a[10];
      a23 = a[11];
      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;
      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;
      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
  }
  __name(translate, "translate");
  function scale(out, a, v) {
    var x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  __name(scale, "scale");
  function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2];
    var len4 = Math.hypot(x, y, z);
    var s, c, t;
    var a00, a01, a02, a03;
    var a10, a11, a12, a13;
    var a20, a21, a22, a23;
    var b00, b01, b02;
    var b10, b11, b12;
    var b20, b21, b22;
    if (len4 < EPSILON) {
      return null;
    }
    len4 = 1 / len4;
    x *= len4;
    y *= len4;
    z *= len4;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    b00 = x * x * t + c;
    b01 = y * x * t + z * s;
    b02 = z * x * t - y * s;
    b10 = x * y * t - z * s;
    b11 = y * y * t + c;
    b12 = z * y * t + x * s;
    b20 = x * z * t + y * s;
    b21 = y * z * t - x * s;
    b22 = z * z * t + c;
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    return out;
  }
  __name(rotate, "rotate");
  function rotateX(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a10 = a[4];
    var a11 = a[5];
    var a12 = a[6];
    var a13 = a[7];
    var a20 = a[8];
    var a21 = a[9];
    var a22 = a[10];
    var a23 = a[11];
    if (a !== out) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
  }
  __name(rotateX, "rotateX");
  function rotateY(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a00 = a[0];
    var a01 = a[1];
    var a02 = a[2];
    var a03 = a[3];
    var a20 = a[8];
    var a21 = a[9];
    var a22 = a[10];
    var a23 = a[11];
    if (a !== out) {
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
  }
  __name(rotateY, "rotateY");
  function rotateZ(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a00 = a[0];
    var a01 = a[1];
    var a02 = a[2];
    var a03 = a[3];
    var a10 = a[4];
    var a11 = a[5];
    var a12 = a[6];
    var a13 = a[7];
    if (a !== out) {
      out[8] = a[8];
      out[9] = a[9];
      out[10] = a[10];
      out[11] = a[11];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
  }
  __name(rotateZ, "rotateZ");
  function fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  __name(fromTranslation, "fromTranslation");
  function fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromScaling, "fromScaling");
  function fromRotation(out, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2];
    var len4 = Math.hypot(x, y, z);
    var s, c, t;
    if (len4 < EPSILON) {
      return null;
    }
    len4 = 1 / len4;
    x *= len4;
    y *= len4;
    z *= len4;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromRotation, "fromRotation");
  function fromXRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromXRotation, "fromXRotation");
  function fromYRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromYRotation, "fromYRotation");
  function fromZRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromZRotation, "fromZRotation");
  function fromRotationTranslation(out, q, v) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  __name(fromRotationTranslation, "fromRotationTranslation");
  function fromQuat2(out, a) {
    var translation = new ARRAY_TYPE(3);
    var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3], ax = a[4], ay = a[5], az = a[6], aw = a[7];
    var magnitude = bx * bx + by * by + bz * bz + bw * bw;
    if (magnitude > 0) {
      translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
      translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
      translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
    } else {
      translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    }
    fromRotationTranslation(out, a, translation);
    return out;
  }
  __name(fromQuat2, "fromQuat2");
  function getTranslation(out, mat) {
    out[0] = mat[12];
    out[1] = mat[13];
    out[2] = mat[14];
    return out;
  }
  __name(getTranslation, "getTranslation");
  function getScaling(out, mat) {
    var m11 = mat[0];
    var m12 = mat[1];
    var m13 = mat[2];
    var m21 = mat[4];
    var m22 = mat[5];
    var m23 = mat[6];
    var m31 = mat[8];
    var m32 = mat[9];
    var m33 = mat[10];
    out[0] = Math.hypot(m11, m12, m13);
    out[1] = Math.hypot(m21, m22, m23);
    out[2] = Math.hypot(m31, m32, m33);
    return out;
  }
  __name(getScaling, "getScaling");
  function getRotation(out, mat) {
    var scaling = new ARRAY_TYPE(3);
    getScaling(scaling, mat);
    var is1 = 1 / scaling[0];
    var is2 = 1 / scaling[1];
    var is3 = 1 / scaling[2];
    var sm11 = mat[0] * is1;
    var sm12 = mat[1] * is2;
    var sm13 = mat[2] * is3;
    var sm21 = mat[4] * is1;
    var sm22 = mat[5] * is2;
    var sm23 = mat[6] * is3;
    var sm31 = mat[8] * is1;
    var sm32 = mat[9] * is2;
    var sm33 = mat[10] * is3;
    var trace = sm11 + sm22 + sm33;
    var S = 0;
    if (trace > 0) {
      S = Math.sqrt(trace + 1) * 2;
      out[3] = 0.25 * S;
      out[0] = (sm23 - sm32) / S;
      out[1] = (sm31 - sm13) / S;
      out[2] = (sm12 - sm21) / S;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out[3] = (sm23 - sm32) / S;
      out[0] = 0.25 * S;
      out[1] = (sm12 + sm21) / S;
      out[2] = (sm31 + sm13) / S;
    } else if (sm22 > sm33) {
      S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out[3] = (sm31 - sm13) / S;
      out[0] = (sm12 + sm21) / S;
      out[1] = 0.25 * S;
      out[2] = (sm23 + sm32) / S;
    } else {
      S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out[3] = (sm12 - sm21) / S;
      out[0] = (sm31 + sm13) / S;
      out[1] = (sm23 + sm32) / S;
      out[2] = 0.25 * S;
    }
    return out;
  }
  __name(getRotation, "getRotation");
  function fromRotationTranslationScale(out, q, v, s) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    var sx = s[0];
    var sy = s[1];
    var sz = s[2];
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  __name(fromRotationTranslationScale, "fromRotationTranslationScale");
  function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    var sx = s[0];
    var sy = s[1];
    var sz = s[2];
    var ox = o[0];
    var oy = o[1];
    var oz = o[2];
    var out0 = (1 - (yy + zz)) * sx;
    var out1 = (xy + wz) * sx;
    var out2 = (xz - wy) * sx;
    var out4 = (xy - wz) * sy;
    var out5 = (1 - (xx + zz)) * sy;
    var out6 = (yz + wx) * sy;
    var out8 = (xz + wy) * sz;
    var out9 = (yz - wx) * sz;
    var out10 = (1 - (xx + yy)) * sz;
    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = 0;
    out[4] = out4;
    out[5] = out5;
    out[6] = out6;
    out[7] = 0;
    out[8] = out8;
    out[9] = out9;
    out[10] = out10;
    out[11] = 0;
    out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
    out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
    out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
    out[15] = 1;
    return out;
  }
  __name(fromRotationTranslationScaleOrigin, "fromRotationTranslationScaleOrigin");
  function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var yx = y * x2;
    var yy = y * y2;
    var zx = z * x2;
    var zy = z * y2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  __name(fromQuat, "fromQuat");
  function frustum(out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left);
    var tb = 1 / (top - bottom);
    var nf = 1 / (near - far);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near * 2 * nf;
    out[15] = 0;
    return out;
  }
  __name(frustum, "frustum");
  function perspectiveNO(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf;
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }
  __name(perspectiveNO, "perspectiveNO");
  var perspective = perspectiveNO;
  function perspectiveZO(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf;
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      nf = 1 / (near - far);
      out[10] = far * nf;
      out[14] = far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -near;
    }
    return out;
  }
  __name(perspectiveZO, "perspectiveZO");
  function perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI / 180);
    var downTan = Math.tan(fov.downDegrees * Math.PI / 180);
    var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180);
    var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180);
    var xScale = 2 / (leftTan + rightTan);
    var yScale = 2 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = yScale;
    out[6] = 0;
    out[7] = 0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near / (near - far);
    out[15] = 0;
    return out;
  }
  __name(perspectiveFromFieldOfView, "perspectiveFromFieldOfView");
  function orthoNO(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  }
  __name(orthoNO, "orthoNO");
  var ortho = orthoNO;
  function orthoZO(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return out;
  }
  __name(orthoZO, "orthoZO");
  function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len4;
    var eyex = eye[0];
    var eyey = eye[1];
    var eyez = eye[2];
    var upx = up[0];
    var upy = up[1];
    var upz = up[2];
    var centerx = center[0];
    var centery = center[1];
    var centerz = center[2];
    if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
      return identity(out);
    }
    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;
    len4 = 1 / Math.hypot(z0, z1, z2);
    z0 *= len4;
    z1 *= len4;
    z2 *= len4;
    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len4 = Math.hypot(x0, x1, x2);
    if (!len4) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len4 = 1 / len4;
      x0 *= len4;
      x1 *= len4;
      x2 *= len4;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    len4 = Math.hypot(y0, y1, y2);
    if (!len4) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len4 = 1 / len4;
      y0 *= len4;
      y1 *= len4;
      y2 *= len4;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  }
  __name(lookAt, "lookAt");
  function targetTo(out, eye, target, up) {
    var eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2];
    var z0 = eyex - target[0], z1 = eyey - target[1], z2 = eyez - target[2];
    var len4 = z0 * z0 + z1 * z1 + z2 * z2;
    if (len4 > 0) {
      len4 = 1 / Math.sqrt(len4);
      z0 *= len4;
      z1 *= len4;
      z2 *= len4;
    }
    var x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
    len4 = x0 * x0 + x1 * x1 + x2 * x2;
    if (len4 > 0) {
      len4 = 1 / Math.sqrt(len4);
      x0 *= len4;
      x1 *= len4;
      x2 *= len4;
    }
    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eyex;
    out[13] = eyey;
    out[14] = eyez;
    out[15] = 1;
    return out;
  }
  __name(targetTo, "targetTo");
  function str(a) {
    return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
  }
  __name(str, "str");
  function frob(a) {
    return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]);
  }
  __name(frob, "frob");
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    out[9] = a[9] + b[9];
    out[10] = a[10] + b[10];
    out[11] = a[11] + b[11];
    out[12] = a[12] + b[12];
    out[13] = a[13] + b[13];
    out[14] = a[14] + b[14];
    out[15] = a[15] + b[15];
    return out;
  }
  __name(add, "add");
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    out[9] = a[9] - b[9];
    out[10] = a[10] - b[10];
    out[11] = a[11] - b[11];
    out[12] = a[12] - b[12];
    out[13] = a[13] - b[13];
    out[14] = a[14] - b[14];
    out[15] = a[15] - b[15];
    return out;
  }
  __name(subtract, "subtract");
  function multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    out[9] = a[9] * b;
    out[10] = a[10] * b;
    out[11] = a[11] * b;
    out[12] = a[12] * b;
    out[13] = a[13] * b;
    out[14] = a[14] * b;
    out[15] = a[15] * b;
    return out;
  }
  __name(multiplyScalar, "multiplyScalar");
  function multiplyScalarAndAdd(out, a, b, scale5) {
    out[0] = a[0] + b[0] * scale5;
    out[1] = a[1] + b[1] * scale5;
    out[2] = a[2] + b[2] * scale5;
    out[3] = a[3] + b[3] * scale5;
    out[4] = a[4] + b[4] * scale5;
    out[5] = a[5] + b[5] * scale5;
    out[6] = a[6] + b[6] * scale5;
    out[7] = a[7] + b[7] * scale5;
    out[8] = a[8] + b[8] * scale5;
    out[9] = a[9] + b[9] * scale5;
    out[10] = a[10] + b[10] * scale5;
    out[11] = a[11] + b[11] * scale5;
    out[12] = a[12] + b[12] * scale5;
    out[13] = a[13] + b[13] * scale5;
    out[14] = a[14] + b[14] * scale5;
    out[15] = a[15] + b[15] * scale5;
    return out;
  }
  __name(multiplyScalarAndAdd, "multiplyScalarAndAdd");
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
  }
  __name(exactEquals, "exactEquals");
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
    var a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11];
    var a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    var b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
    var b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
    var b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= EPSILON * Math.max(1, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= EPSILON * Math.max(1, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= EPSILON * Math.max(1, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= EPSILON * Math.max(1, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= EPSILON * Math.max(1, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= EPSILON * Math.max(1, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= EPSILON * Math.max(1, Math.abs(a15), Math.abs(b15));
  }
  __name(equals, "equals");
  var mul = multiply;
  var sub = subtract;

  // node_modules/gl-matrix/esm/quat.js
  var quat_exports = {};
  __export(quat_exports, {
    add: () => add4,
    calculateW: () => calculateW,
    clone: () => clone4,
    conjugate: () => conjugate,
    copy: () => copy4,
    create: () => create5,
    dot: () => dot3,
    equals: () => equals4,
    exactEquals: () => exactEquals4,
    exp: () => exp,
    fromEuler: () => fromEuler,
    fromMat3: () => fromMat3,
    fromValues: () => fromValues4,
    getAngle: () => getAngle,
    getAxisAngle: () => getAxisAngle,
    identity: () => identity2,
    invert: () => invert2,
    len: () => len3,
    length: () => length3,
    lerp: () => lerp3,
    ln: () => ln,
    mul: () => mul4,
    multiply: () => multiply4,
    normalize: () => normalize3,
    pow: () => pow,
    random: () => random3,
    rotateX: () => rotateX3,
    rotateY: () => rotateY3,
    rotateZ: () => rotateZ3,
    rotationTo: () => rotationTo,
    scale: () => scale4,
    set: () => set4,
    setAxes: () => setAxes,
    setAxisAngle: () => setAxisAngle,
    slerp: () => slerp,
    sqlerp: () => sqlerp,
    sqrLen: () => sqrLen3,
    squaredLength: () => squaredLength3,
    str: () => str4
  });

  // node_modules/gl-matrix/esm/vec3.js
  var vec3_exports = {};
  __export(vec3_exports, {
    add: () => add2,
    angle: () => angle,
    bezier: () => bezier,
    ceil: () => ceil,
    clone: () => clone2,
    copy: () => copy2,
    create: () => create3,
    cross: () => cross,
    dist: () => dist,
    distance: () => distance,
    div: () => div,
    divide: () => divide,
    dot: () => dot,
    equals: () => equals2,
    exactEquals: () => exactEquals2,
    floor: () => floor,
    forEach: () => forEach,
    fromValues: () => fromValues2,
    hermite: () => hermite,
    inverse: () => inverse,
    len: () => len,
    length: () => length,
    lerp: () => lerp,
    max: () => max,
    min: () => min,
    mul: () => mul2,
    multiply: () => multiply2,
    negate: () => negate,
    normalize: () => normalize,
    random: () => random,
    rotateX: () => rotateX2,
    rotateY: () => rotateY2,
    rotateZ: () => rotateZ2,
    round: () => round,
    scale: () => scale2,
    scaleAndAdd: () => scaleAndAdd,
    set: () => set2,
    sqrDist: () => sqrDist,
    sqrLen: () => sqrLen,
    squaredDistance: () => squaredDistance,
    squaredLength: () => squaredLength,
    str: () => str2,
    sub: () => sub2,
    subtract: () => subtract2,
    transformMat3: () => transformMat3,
    transformMat4: () => transformMat4,
    transformQuat: () => transformQuat,
    zero: () => zero
  });
  function create3() {
    var out = new ARRAY_TYPE(3);
    if (ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
    }
    return out;
  }
  __name(create3, "create");
  function clone2(a) {
    var out = new ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  __name(clone2, "clone");
  function length(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    return Math.hypot(x, y, z);
  }
  __name(length, "length");
  function fromValues2(x, y, z) {
    var out = new ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  __name(fromValues2, "fromValues");
  function copy2(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  __name(copy2, "copy");
  function set2(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  __name(set2, "set");
  function add2(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
  }
  __name(add2, "add");
  function subtract2(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  }
  __name(subtract2, "subtract");
  function multiply2(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
  }
  __name(multiply2, "multiply");
  function divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
  }
  __name(divide, "divide");
  function ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    return out;
  }
  __name(ceil, "ceil");
  function floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    return out;
  }
  __name(floor, "floor");
  function min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
  }
  __name(min, "min");
  function max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
  }
  __name(max, "max");
  function round(out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    out[2] = Math.round(a[2]);
    return out;
  }
  __name(round, "round");
  function scale2(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
  }
  __name(scale2, "scale");
  function scaleAndAdd(out, a, b, scale5) {
    out[0] = a[0] + b[0] * scale5;
    out[1] = a[1] + b[1] * scale5;
    out[2] = a[2] + b[2] * scale5;
    return out;
  }
  __name(scaleAndAdd, "scaleAndAdd");
  function distance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    return Math.hypot(x, y, z);
  }
  __name(distance, "distance");
  function squaredDistance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    return x * x + y * y + z * z;
  }
  __name(squaredDistance, "squaredDistance");
  function squaredLength(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    return x * x + y * y + z * z;
  }
  __name(squaredLength, "squaredLength");
  function negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
  }
  __name(negate, "negate");
  function inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    return out;
  }
  __name(inverse, "inverse");
  function normalize(out, a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var len4 = x * x + y * y + z * z;
    if (len4 > 0) {
      len4 = 1 / Math.sqrt(len4);
    }
    out[0] = a[0] * len4;
    out[1] = a[1] * len4;
    out[2] = a[2] * len4;
    return out;
  }
  __name(normalize, "normalize");
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  __name(dot, "dot");
  function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2];
    var bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }
  __name(cross, "cross");
  function lerp(out, a, b, t) {
    var ax = a[0];
    var ay = a[1];
    var az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
  }
  __name(lerp, "lerp");
  function hermite(out, a, b, c, d, t) {
    var factorTimes2 = t * t;
    var factor1 = factorTimes2 * (2 * t - 3) + 1;
    var factor2 = factorTimes2 * (t - 2) + t;
    var factor3 = factorTimes2 * (t - 1);
    var factor4 = factorTimes2 * (3 - 2 * t);
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  __name(hermite, "hermite");
  function bezier(out, a, b, c, d, t) {
    var inverseFactor = 1 - t;
    var inverseFactorTimesTwo = inverseFactor * inverseFactor;
    var factorTimes2 = t * t;
    var factor1 = inverseFactorTimesTwo * inverseFactor;
    var factor2 = 3 * t * inverseFactorTimesTwo;
    var factor3 = 3 * factorTimes2 * inverseFactor;
    var factor4 = factorTimes2 * t;
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  __name(bezier, "bezier");
  function random(out, scale5) {
    scale5 = scale5 || 1;
    var r = RANDOM() * 2 * Math.PI;
    var z = RANDOM() * 2 - 1;
    var zScale = Math.sqrt(1 - z * z) * scale5;
    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale5;
    return out;
  }
  __name(random, "random");
  function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
  }
  __name(transformMat4, "transformMat4");
  function transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
  }
  __name(transformMat3, "transformMat3");
  function transformQuat(out, a, q) {
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    var x = a[0], y = a[1], z = a[2];
    var uvx = qy * z - qz * y, uvy = qz * x - qx * z, uvz = qx * y - qy * x;
    var uuvx = qy * uvz - qz * uvy, uuvy = qz * uvx - qx * uvz, uuvz = qx * uvy - qy * uvx;
    var w2 = qw * 2;
    uvx *= w2;
    uvy *= w2;
    uvz *= w2;
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;
    out[0] = x + uvx + uuvx;
    out[1] = y + uvy + uuvy;
    out[2] = z + uvz + uuvz;
    return out;
  }
  __name(transformQuat, "transformQuat");
  function rotateX2(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0];
    r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
    r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad);
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  __name(rotateX2, "rotateX");
  function rotateY2(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
    r[1] = p[1];
    r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  __name(rotateY2, "rotateY");
  function rotateZ2(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
    r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
    r[2] = p[2];
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  __name(rotateZ2, "rotateZ");
  function angle(a, b) {
    var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2], mag1 = Math.sqrt(ax * ax + ay * ay + az * az), mag2 = Math.sqrt(bx * bx + by * by + bz * bz), mag = mag1 * mag2, cosine = mag && dot(a, b) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
  }
  __name(angle, "angle");
  function zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  __name(zero, "zero");
  function str2(a) {
    return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
  }
  __name(str2, "str");
  function exactEquals2(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }
  __name(exactEquals2, "exactEquals");
  function equals2(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2];
    var b0 = b[0], b1 = b[1], b2 = b[2];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2));
  }
  __name(equals2, "equals");
  var sub2 = subtract2;
  var mul2 = multiply2;
  var div = divide;
  var dist = distance;
  var sqrDist = squaredDistance;
  var len = length;
  var sqrLen = squaredLength;
  var forEach = function() {
    var vec = create3();
    return function(a, stride, offset, count, fn, arg) {
      var i, l;
      if (!stride) {
        stride = 3;
      }
      if (!offset) {
        offset = 0;
      }
      if (count) {
        l = Math.min(count * stride + offset, a.length);
      } else {
        l = a.length;
      }
      for (i = offset; i < l; i += stride) {
        vec[0] = a[i];
        vec[1] = a[i + 1];
        vec[2] = a[i + 2];
        fn(vec, vec, arg);
        a[i] = vec[0];
        a[i + 1] = vec[1];
        a[i + 2] = vec[2];
      }
      return a;
    };
  }();

  // node_modules/gl-matrix/esm/vec4.js
  var vec4_exports = {};
  __export(vec4_exports, {
    add: () => add3,
    ceil: () => ceil2,
    clone: () => clone3,
    copy: () => copy3,
    create: () => create4,
    cross: () => cross2,
    dist: () => dist2,
    distance: () => distance2,
    div: () => div2,
    divide: () => divide2,
    dot: () => dot2,
    equals: () => equals3,
    exactEquals: () => exactEquals3,
    floor: () => floor2,
    forEach: () => forEach2,
    fromValues: () => fromValues3,
    inverse: () => inverse2,
    len: () => len2,
    length: () => length2,
    lerp: () => lerp2,
    max: () => max2,
    min: () => min2,
    mul: () => mul3,
    multiply: () => multiply3,
    negate: () => negate2,
    normalize: () => normalize2,
    random: () => random2,
    round: () => round2,
    scale: () => scale3,
    scaleAndAdd: () => scaleAndAdd2,
    set: () => set3,
    sqrDist: () => sqrDist2,
    sqrLen: () => sqrLen2,
    squaredDistance: () => squaredDistance2,
    squaredLength: () => squaredLength2,
    str: () => str3,
    sub: () => sub3,
    subtract: () => subtract3,
    transformMat4: () => transformMat42,
    transformQuat: () => transformQuat2,
    zero: () => zero2
  });
  function create4() {
    var out = new ARRAY_TYPE(4);
    if (ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
    }
    return out;
  }
  __name(create4, "create");
  function clone3(a) {
    var out = new ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  __name(clone3, "clone");
  function fromValues3(x, y, z, w) {
    var out = new ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  __name(fromValues3, "fromValues");
  function copy3(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  __name(copy3, "copy");
  function set3(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  __name(set3, "set");
  function add3(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
  }
  __name(add3, "add");
  function subtract3(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
  }
  __name(subtract3, "subtract");
  function multiply3(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
  }
  __name(multiply3, "multiply");
  function divide2(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
  }
  __name(divide2, "divide");
  function ceil2(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    out[3] = Math.ceil(a[3]);
    return out;
  }
  __name(ceil2, "ceil");
  function floor2(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    out[3] = Math.floor(a[3]);
    return out;
  }
  __name(floor2, "floor");
  function min2(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
  }
  __name(min2, "min");
  function max2(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
  }
  __name(max2, "max");
  function round2(out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    out[2] = Math.round(a[2]);
    out[3] = Math.round(a[3]);
    return out;
  }
  __name(round2, "round");
  function scale3(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
  }
  __name(scale3, "scale");
  function scaleAndAdd2(out, a, b, scale5) {
    out[0] = a[0] + b[0] * scale5;
    out[1] = a[1] + b[1] * scale5;
    out[2] = a[2] + b[2] * scale5;
    out[3] = a[3] + b[3] * scale5;
    return out;
  }
  __name(scaleAndAdd2, "scaleAndAdd");
  function distance2(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    var w = b[3] - a[3];
    return Math.hypot(x, y, z, w);
  }
  __name(distance2, "distance");
  function squaredDistance2(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    var w = b[3] - a[3];
    return x * x + y * y + z * z + w * w;
  }
  __name(squaredDistance2, "squaredDistance");
  function length2(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    return Math.hypot(x, y, z, w);
  }
  __name(length2, "length");
  function squaredLength2(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    return x * x + y * y + z * z + w * w;
  }
  __name(squaredLength2, "squaredLength");
  function negate2(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
  }
  __name(negate2, "negate");
  function inverse2(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    out[3] = 1 / a[3];
    return out;
  }
  __name(inverse2, "inverse");
  function normalize2(out, a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    var len4 = x * x + y * y + z * z + w * w;
    if (len4 > 0) {
      len4 = 1 / Math.sqrt(len4);
    }
    out[0] = x * len4;
    out[1] = y * len4;
    out[2] = z * len4;
    out[3] = w * len4;
    return out;
  }
  __name(normalize2, "normalize");
  function dot2(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  __name(dot2, "dot");
  function cross2(out, u, v, w) {
    var A = v[0] * w[1] - v[1] * w[0], B = v[0] * w[2] - v[2] * w[0], C = v[0] * w[3] - v[3] * w[0], D = v[1] * w[2] - v[2] * w[1], E = v[1] * w[3] - v[3] * w[1], F = v[2] * w[3] - v[3] * w[2];
    var G = u[0];
    var H = u[1];
    var I = u[2];
    var J = u[3];
    out[0] = H * F - I * E + J * D;
    out[1] = -(G * F) + I * C - J * B;
    out[2] = G * E - H * C + J * A;
    out[3] = -(G * D) + H * B - I * A;
    return out;
  }
  __name(cross2, "cross");
  function lerp2(out, a, b, t) {
    var ax = a[0];
    var ay = a[1];
    var az = a[2];
    var aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
  }
  __name(lerp2, "lerp");
  function random2(out, scale5) {
    scale5 = scale5 || 1;
    var v1, v2, v3, v4;
    var s1, s2;
    do {
      v1 = RANDOM() * 2 - 1;
      v2 = RANDOM() * 2 - 1;
      s1 = v1 * v1 + v2 * v2;
    } while (s1 >= 1);
    do {
      v3 = RANDOM() * 2 - 1;
      v4 = RANDOM() * 2 - 1;
      s2 = v3 * v3 + v4 * v4;
    } while (s2 >= 1);
    var d = Math.sqrt((1 - s1) / s2);
    out[0] = scale5 * v1;
    out[1] = scale5 * v2;
    out[2] = scale5 * v3 * d;
    out[3] = scale5 * v4 * d;
    return out;
  }
  __name(random2, "random");
  function transformMat42(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
  }
  __name(transformMat42, "transformMat4");
  function transformQuat2(out, a, q) {
    var x = a[0], y = a[1], z = a[2];
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    var ix = qw * x + qy * z - qz * y;
    var iy = qw * y + qz * x - qx * z;
    var iz = qw * z + qx * y - qy * x;
    var iw = -qx * x - qy * y - qz * z;
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    out[3] = a[3];
    return out;
  }
  __name(transformQuat2, "transformQuat");
  function zero2(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
  }
  __name(zero2, "zero");
  function str3(a) {
    return "vec4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
  }
  __name(str3, "str");
  function exactEquals3(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  __name(exactEquals3, "exactEquals");
  function equals3(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
  }
  __name(equals3, "equals");
  var sub3 = subtract3;
  var mul3 = multiply3;
  var div2 = divide2;
  var dist2 = distance2;
  var sqrDist2 = squaredDistance2;
  var len2 = length2;
  var sqrLen2 = squaredLength2;
  var forEach2 = function() {
    var vec = create4();
    return function(a, stride, offset, count, fn, arg) {
      var i, l;
      if (!stride) {
        stride = 4;
      }
      if (!offset) {
        offset = 0;
      }
      if (count) {
        l = Math.min(count * stride + offset, a.length);
      } else {
        l = a.length;
      }
      for (i = offset; i < l; i += stride) {
        vec[0] = a[i];
        vec[1] = a[i + 1];
        vec[2] = a[i + 2];
        vec[3] = a[i + 3];
        fn(vec, vec, arg);
        a[i] = vec[0];
        a[i + 1] = vec[1];
        a[i + 2] = vec[2];
        a[i + 3] = vec[3];
      }
      return a;
    };
  }();

  // node_modules/gl-matrix/esm/quat.js
  function create5() {
    var out = new ARRAY_TYPE(4);
    if (ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
    }
    out[3] = 1;
    return out;
  }
  __name(create5, "create");
  function identity2(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }
  __name(identity2, "identity");
  function setAxisAngle(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
  }
  __name(setAxisAngle, "setAxisAngle");
  function getAxisAngle(out_axis, q) {
    var rad = Math.acos(q[3]) * 2;
    var s = Math.sin(rad / 2);
    if (s > EPSILON) {
      out_axis[0] = q[0] / s;
      out_axis[1] = q[1] / s;
      out_axis[2] = q[2] / s;
    } else {
      out_axis[0] = 1;
      out_axis[1] = 0;
      out_axis[2] = 0;
    }
    return rad;
  }
  __name(getAxisAngle, "getAxisAngle");
  function getAngle(a, b) {
    var dotproduct = dot3(a, b);
    return Math.acos(2 * dotproduct * dotproduct - 1);
  }
  __name(getAngle, "getAngle");
  function multiply4(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }
  __name(multiply4, "multiply");
  function rotateX3(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
  }
  __name(rotateX3, "rotateX");
  function rotateY3(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var by = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
  }
  __name(rotateY3, "rotateY");
  function rotateZ3(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bz = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
  }
  __name(rotateZ3, "rotateZ");
  function calculateW(out, a) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1 - x * x - y * y - z * z));
    return out;
  }
  __name(calculateW, "calculateW");
  function exp(out, a) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    var r = Math.sqrt(x * x + y * y + z * z);
    var et = Math.exp(w);
    var s = r > 0 ? et * Math.sin(r) / r : 0;
    out[0] = x * s;
    out[1] = y * s;
    out[2] = z * s;
    out[3] = et * Math.cos(r);
    return out;
  }
  __name(exp, "exp");
  function ln(out, a) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    var r = Math.sqrt(x * x + y * y + z * z);
    var t = r > 0 ? Math.atan2(r, w) / r : 0;
    out[0] = x * t;
    out[1] = y * t;
    out[2] = z * t;
    out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
    return out;
  }
  __name(ln, "ln");
  function pow(out, a, b) {
    ln(out, a);
    scale4(out, out, b);
    exp(out, out);
    return out;
  }
  __name(pow, "pow");
  function slerp(out, a, b, t) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = b[0], by = b[1], bz = b[2], bw = b[3];
    var omega, cosom, sinom, scale0, scale1;
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    if (1 - cosom > EPSILON) {
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      scale0 = 1 - t;
      scale1 = t;
    }
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    return out;
  }
  __name(slerp, "slerp");
  function random3(out) {
    var u1 = RANDOM();
    var u2 = RANDOM();
    var u3 = RANDOM();
    var sqrt1MinusU1 = Math.sqrt(1 - u1);
    var sqrtU1 = Math.sqrt(u1);
    out[0] = sqrt1MinusU1 * Math.sin(2 * Math.PI * u2);
    out[1] = sqrt1MinusU1 * Math.cos(2 * Math.PI * u2);
    out[2] = sqrtU1 * Math.sin(2 * Math.PI * u3);
    out[3] = sqrtU1 * Math.cos(2 * Math.PI * u3);
    return out;
  }
  __name(random3, "random");
  function invert2(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var dot4 = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    var invDot = dot4 ? 1 / dot4 : 0;
    out[0] = -a0 * invDot;
    out[1] = -a1 * invDot;
    out[2] = -a2 * invDot;
    out[3] = a3 * invDot;
    return out;
  }
  __name(invert2, "invert");
  function conjugate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
  }
  __name(conjugate, "conjugate");
  function fromMat3(out, m) {
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;
    if (fTrace > 0) {
      fRoot = Math.sqrt(fTrace + 1);
      out[3] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[0] = (m[5] - m[7]) * fRoot;
      out[1] = (m[6] - m[2]) * fRoot;
      out[2] = (m[1] - m[3]) * fRoot;
    } else {
      var i = 0;
      if (m[4] > m[0]) i = 1;
      if (m[8] > m[i * 3 + i]) i = 2;
      var j = (i + 1) % 3;
      var k = (i + 2) % 3;
      fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1);
      out[i] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
      out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
      out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
    }
    return out;
  }
  __name(fromMat3, "fromMat3");
  function fromEuler(out, x, y, z) {
    var halfToRad = 0.5 * Math.PI / 180;
    x *= halfToRad;
    y *= halfToRad;
    z *= halfToRad;
    var sx = Math.sin(x);
    var cx = Math.cos(x);
    var sy = Math.sin(y);
    var cy = Math.cos(y);
    var sz = Math.sin(z);
    var cz = Math.cos(z);
    out[0] = sx * cy * cz - cx * sy * sz;
    out[1] = cx * sy * cz + sx * cy * sz;
    out[2] = cx * cy * sz - sx * sy * cz;
    out[3] = cx * cy * cz + sx * sy * sz;
    return out;
  }
  __name(fromEuler, "fromEuler");
  function str4(a) {
    return "quat(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
  }
  __name(str4, "str");
  var clone4 = clone3;
  var fromValues4 = fromValues3;
  var copy4 = copy3;
  var set4 = set3;
  var add4 = add3;
  var mul4 = multiply4;
  var scale4 = scale3;
  var dot3 = dot2;
  var lerp3 = lerp2;
  var length3 = length2;
  var len3 = length3;
  var squaredLength3 = squaredLength2;
  var sqrLen3 = squaredLength3;
  var normalize3 = normalize2;
  var exactEquals4 = exactEquals3;
  var equals4 = equals3;
  var rotationTo = function() {
    var tmpvec3 = create3();
    var xUnitVec3 = fromValues2(1, 0, 0);
    var yUnitVec3 = fromValues2(0, 1, 0);
    return function(out, a, b) {
      var dot4 = dot(a, b);
      if (dot4 < -0.999999) {
        cross(tmpvec3, xUnitVec3, a);
        if (len(tmpvec3) < 1e-6) cross(tmpvec3, yUnitVec3, a);
        normalize(tmpvec3, tmpvec3);
        setAxisAngle(out, tmpvec3, Math.PI);
        return out;
      } else if (dot4 > 0.999999) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        return out;
      } else {
        cross(tmpvec3, a, b);
        out[0] = tmpvec3[0];
        out[1] = tmpvec3[1];
        out[2] = tmpvec3[2];
        out[3] = 1 + dot4;
        return normalize3(out, out);
      }
    };
  }();
  var sqlerp = function() {
    var temp1 = create5();
    var temp2 = create5();
    return function(out, a, b, c, d, t) {
      slerp(temp1, a, d, t);
      slerp(temp2, b, c, t);
      slerp(out, temp1, temp2, 2 * t * (1 - t));
      return out;
    };
  }();
  var setAxes = function() {
    var matr = create();
    return function(out, view, right, up) {
      matr[0] = right[0];
      matr[3] = right[1];
      matr[6] = right[2];
      matr[1] = up[0];
      matr[4] = up[1];
      matr[7] = up[2];
      matr[2] = -view[0];
      matr[5] = -view[1];
      matr[8] = -view[2];
      return normalize3(out, fromMat3(out, matr));
    };
  }();

  // src/errors/EngineError/BaseError.ts
  var _EngineError = class _EngineError extends Error {
    constructor(message, code, options = {}) {
      super(message);
      // 错误代码（用于国际化、错误码映射等）
      __publicField(this, "code");
      // 时间戳
      __publicField(this, "timestamp");
      // 错误上下文（附加信息）
      __publicField(this, "context");
      // 是否可恢复
      __publicField(this, "recoverable");
      // 原始错误（Error Cause），用于错误链追踪
      __publicField(this, "cause");
      Object.setPrototypeOf(this, new.target.prototype);
      this.name = this.constructor.name;
      this.code = code;
      this.context = options.context;
      this.recoverable = options.recoverable ?? false;
      this.timestamp = /* @__PURE__ */ new Date();
      if (options.cause) {
        this.cause = options.cause;
      }
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, new.target);
      }
    }
    /**
     * 转换为JSON（用于日志和监控）
     *
     * @remarks
     * 适用于日志系统、监控平台或错误上报服务。
     */
    toJSON() {
      return {
        name: this.name,
        code: this.code,
        message: this.message,
        context: this.context,
        recoverable: this.recoverable,
        timestamp: this.timestamp.toISOString(),
        stack: this.stack
      };
    }
    /**
     * 转换为用户友好的消息
     *
     * @remarks
     * - 子类可重写该方法以支持国际化或更友好的提示
     * - 默认返回 `message`
     */
    toUserMessage() {
      return this.message;
    }
  };
  __name(_EngineError, "EngineError");
  var EngineError = _EngineError;

  // src/rendering/core/errors/RenderingError.ts
  var _RenderingError = class _RenderingError extends EngineError {
    /**
     * @param message - 面向开发者的可读错误描述。
     * @param code - 供程序分类、日志聚合或本地化映射使用的稳定错误码。
     * @param details - 创建错误时需要保留的领域上下文；只复制并冻结最外层。
     */
    constructor(message, code, details = {}) {
      const frozenDetails = Object.freeze({
        ...details
      });
      super(message, code, {
        context: frozenDetails,
        recoverable: false
      });
      /** 与 `EngineError.context` 引用相同对象的冻结诊断快照。 */
      __publicField(this, "details");
      this.details = frozenDetails;
    }
  };
  __name(_RenderingError, "RenderingError");
  var RenderingError = _RenderingError;
  var _ResourceDisposedError = class _ResourceDisposedError extends RenderingError {
    /** @param resourceName - 不依赖压缩后类名的稳定资源诊断类型。 */
    constructor(resourceName) {
      super(`${resourceName} has been disposed`, "RESOURCE_DISPOSED", {
        resourceName
      });
    }
  };
  __name(_ResourceDisposedError, "ResourceDisposedError");
  var ResourceDisposedError = _ResourceDisposedError;
  var _SceneGraphCycleError = class _SceneGraphCycleError extends RenderingError {
    /**
     * @param parentLabel - 尝试收养子节点的父节点诊断标签。
     * @param childLabel - 会形成循环的子节点诊断标签。
     */
    constructor(parentLabel, childLabel) {
      super(
        `Adding ${childLabel} to ${parentLabel} would create a scene graph cycle`,
        "SCENE_GRAPH_CYCLE",
        {
          parentLabel,
          childLabel
        }
      );
    }
  };
  __name(_SceneGraphCycleError, "SceneGraphCycleError");
  var SceneGraphCycleError = _SceneGraphCycleError;
  var _DuplicateSceneNodeError = class _DuplicateSceneNodeError extends RenderingError {
    /** @param nodeLabel - 重复节点的可读调试标签。 */
    constructor(nodeLabel) {
      super(
        `Scene node ${nodeLabel} appears more than once in the same operation`,
        "DUPLICATE_SCENE_NODE",
        {
          nodeLabel
        }
      );
    }
  };
  __name(_DuplicateSceneNodeError, "DuplicateSceneNodeError");
  var DuplicateSceneNodeError = _DuplicateSceneNodeError;

  // src/rendering/core/errors/InvalidPerspectiveCameraError.ts
  var _InvalidPerspectiveCameraError = class _InvalidPerspectiveCameraError extends RenderingError {
    /**
     * @param fieldName - 无效字段，或表示计算结果的 projectionMatrix。
     * @param reason - 具体违反的约束。
     * @param details - 原始参数等诊断现场；不能覆盖 fieldName 和 reason。
     */
    constructor(fieldName, reason, details = {}) {
      super(
        "PerspectiveCamera " + fieldName + " is invalid: " + reason,
        "INVALID_PERSPECTIVE_CAMERA",
        {
          ...details,
          fieldName,
          reason
        }
      );
      this.name = "InvalidPerspectiveCameraError";
    }
  };
  __name(_InvalidPerspectiveCameraError, "InvalidPerspectiveCameraError");
  var InvalidPerspectiveCameraError = _InvalidPerspectiveCameraError;

  // src/rendering/scene/Transform.ts
  var RADIANS_TO_DEGREES = 180 / Math.PI;
  function setFloat32ComponentsIfChanged(current, next) {
    const nextX = Math.fround(next[0]);
    const nextY = Math.fround(next[1]);
    const nextZ = Math.fround(next[2]);
    const unchanged = Object.is(current[0], nextX) && Object.is(current[1], nextY) && Object.is(current[2], nextZ);
    if (unchanged) {
      return false;
    }
    vec3_exports.set(current, nextX, nextY, nextZ);
    return true;
  }
  __name(setFloat32ComponentsIfChanged, "setFloat32ComponentsIfChanged");
  var _Transform = class _Transform {
    constructor() {
      /**
       * 内部 translation。
       *
       * `readonly` 只禁止把字段改指向另一个 vec3；setter 仍可修改该 vec3 的三个分量。
       */
      __publicField(this, "positionValue", vec3_exports.create());
      /** 内部 XYZ 欧拉角，单位为弧度。 */
      __publicField(this, "rotationValue", vec3_exports.create());
      /** 内部 scale；默认值为 identity scale `[1, 1, 1]`。 */
      __publicField(this, "scaleValue", vec3_exports.fromValues(1, 1, 1));
      /** 最近一次按当前 TRS 生成的 local matrix 缓存。 */
      __publicField(this, "localMatrixValue", mat4_exports.create());
      /**
       * 表示 localMatrixValue 是否落后于当前 TRS。
       *
       * @remarks
       * setter 只把它设为 true，不立即执行矩阵运算。矩阵在调用复制 API 时按需更新。
       *
       * 重算完成后它会恢复为 false，因此它只属于 Transform 的内部缓存协议，
       * 不能替代提供给外部观察者的 `version`。
       */
      __publicField(this, "localMatrixDirty", true);
      /**
       * 每次真实 Float32 TRS 修改恰好增加一次的单调版本号。
       *
       * @remarks
       * [DESIGN-WEIGHT:1][version-safe-integer-horizon]
       *
       * 它不会因为 local matrix 被读取、重算或复制而重置或额外增加。
       * SceneNode 使用它判断当前 world matrix 是否已经包含最新 local transform。
       *
       * JavaScript `number` 在 `Number.MAX_SAFE_INTEGER` 以内可精确表示整数。即使同一个
       * Transform 每秒发生 60 次真实修改，也需要约 476 万年才会到达该上限，因此
       * 当前实时渲染生命周期不引入 BigInt 或回绕协议。
       */
      __publicField(this, "versionValue", 0);
    }
    /**
     * 获取 translation 的独立只读副本。
     *
     * @returns 新建的、反映内部 Float32 存储值的 `[x, y, z]` tuple。
     */
    get position() {
      return [this.positionValue[0], this.positionValue[1], this.positionValue[2]];
    }
    /**
     * 获取 XYZ 欧拉旋转的独立只读副本，单位为弧度。
     *
     * @returns 新建的、反映内部 Float32 存储值的 `[xRadians, yRadians, zRadians]` tuple。
     */
    get rotation() {
      return [this.rotationValue[0], this.rotationValue[1], this.rotationValue[2]];
    }
    /**
     * 获取 scale 的独立只读副本。
     *
     * @returns 新建的、反映内部 Float32 存储值的 `[x, y, z]` tuple。
     */
    get scale() {
      return [this.scaleValue[0], this.scaleValue[1], this.scaleValue[2]];
    }
    /**
     * 获取 local TRS 的当前版本。
     *
     * @remarks
     * 读取或重算矩阵不会增加 version；只有 setter 造成真实 Float32 存储变化时
     * 才会增加。
     */
    get version() {
      return this.versionValue;
    }
    /**
     * 设置 local translation。
     *
     * @param position - 新的 `[x, y, z]`；写入前按 Float32 语义量化。
     */
    setPosition(position) {
      if (!setFloat32ComponentsIfChanged(this.positionValue, position)) {
        return;
      }
      this.invalidateLocalMatrix();
    }
    /**
     * 设置 local XYZ 欧拉旋转。
     *
     * @param rotation - 以弧度表示的 `[x, y, z]`；写入前按 Float32 语义量化。
     */
    setRotation(rotation) {
      if (!setFloat32ComponentsIfChanged(this.rotationValue, rotation)) {
        return;
      }
      this.invalidateLocalMatrix();
    }
    /**
     * 设置 local scale。
     *
     * @param scale - 新的 `[x, y, z]` 缩放；写入前按 Float32 语义量化。
     */
    setScale(scale5) {
      if (!setFloat32ComponentsIfChanged(this.scaleValue, scale5)) {
        return;
      }
      this.invalidateLocalMatrix();
    }
    /**
     * 把当前 local matrix 复制到调用者提供的输出矩阵。
     *
     * @param out - 由调用者拥有并接收结果的 mat4。
     *
     * @remarks
     * 如果 TRS 自上次计算后没有变化，该方法只执行复制；否则先按需更新内部缓存。
     * 调用者修改 `out` 不会污染 Transform 的内部矩阵。
     */
    copyLocalMatrixTo(out) {
      this.updateLocalMatrixIfNeeded();
      mat4_exports.copy(out, this.localMatrixValue);
    }
    /**
     * 统一记录一次真实 local TRS 修改。
     *
     * @remarks
     * 一个 setter 无论修改几个分量都只调用一次，因此 version 恰好增加一次。
     * 多次 setter 可以让 dirty 保持 true，但每次真实状态变化仍拥有独立 version。
     */
    invalidateLocalMatrix() {
      this.localMatrixDirty = true;
      this.versionValue += 1;
    }
    /**
     * 在缓存失效时根据 translation、rotation、scale 重算 local matrix。
     *
     * @remarks
     * 成功重算只会清除 dirty，不会修改 version。version 描述的是 TRS 状态变化，
     * 不是矩阵缓存被读取或计算的次数。
     */
    updateLocalMatrixIfNeeded() {
      if (!this.localMatrixDirty) return;
      const rotationQuaternion = quat_exports.create();
      quat_exports.fromEuler(
        rotationQuaternion,
        this.rotationValue[0] * RADIANS_TO_DEGREES,
        this.rotationValue[1] * RADIANS_TO_DEGREES,
        this.rotationValue[2] * RADIANS_TO_DEGREES
      );
      mat4_exports.fromRotationTranslationScale(
        this.localMatrixValue,
        rotationQuaternion,
        this.positionValue,
        this.scaleValue
      );
      this.localMatrixDirty = false;
    }
  };
  __name(_Transform, "Transform");
  var Transform = _Transform;

  // src/rendering/scene/SceneNode.ts
  var _SceneNode = class _SceneNode {
    constructor() {
      /**
       * 面向开发者的可读标签。
       *
       * @remarks
       * name 可以为空、可以修改、也可以与其他节点重复，不能作为机器身份或缓存键。
       */
      __publicField(this, "name", "");
      /**
       * 当前节点及其子树是否参加 visible traversal。
       *
       * @remarks
       * `traverseVisible()` 遇到 false 时会跳过整个子树，而不只是跳过当前节点。
       */
      __publicField(this, "visible", true);
      /**
       * 节点唯一的 local Transform。
       *
       * `readonly` 禁止调用者替换 Transform 对象，但仍允许调用它的 TRS setter。
       */
      __publicField(this, "transform", new Transform());
      /**
       * 结构变化产生的显式失效标志。
       *
       * @remarks
       * reparent 可能发生在 local Transform 和 parent version 都没有变化时，因此不能只靠
       * 两个版本号判断；移动节点及其后代时必须递归设置该标志。
       */
      __publicField(this, "worldMatrixDirty", true);
      /**
       * 创建节点时生成并永久保存的完整 UUID v4。
       *
       * @remarks
       * 短 UUID 只允许由 debugLabel 派生用于显示，内部身份始终保留完整字符串。
       */
      __publicField(this, "uuidValue", globalThis.crypto.randomUUID());
      // TODO(scene-serialization): When saving and reloading the same logical scene,
      // restore its original full UUID. clone() and repeated instantiation of the
      // same asset must allocate new UUIDs. SceneLoader must reject duplicate UUIDs
      // within one Scene. Do not add a general-purpose public UUID setter;
      // restoration must use a constrained loader-only mechanism.
      /** 当前父节点；null 表示该节点是一个 root。 */
      __publicField(this, "parentValue", null);
      /** 按插入顺序保存的直接子节点。 */
      __publicField(this, "childrenValue", []);
      /** 最近一次计算得到的世界矩阵缓存。 */
      __publicField(this, "worldMatrixValue", mat4_exports.create());
      /**
       * 最近一次世界矩阵计算观察到的 local Transform.version。
       *
       * @remarks
       * 当前值与 `transform.version` 不同时，说明 worldMatrixValue 尚未包含最新 local TRS。
       * 初始值 -1 与 Transform 从 0 开始的版本不相等，确保第一次更新必定执行。
       */
      __publicField(this, "observedTransformVersion", -1);
      /**
       * 最近一次世界矩阵计算观察到的 parent.worldVersion。
       *
       * @remarks
       * 即使当前节点的 local Transform 没变，parent 的 world matrix 变化也会改变当前节点
       * 的世界位置。root 使用 -1 代表“没有 parent”。
       */
      __publicField(this, "observedParentWorldVersion", -1);
      /**
       * 每次真正重算 worldMatrixValue 时恰好增加一次的单调版本号。
       *
       * @remarks
       * [DESIGN-WEIGHT:1][version-safe-integer-horizon]
       *
       * 子节点通过该值判断 parent world matrix 是否产生了新版本。重复调用
       * `updateWorldMatrix()` 但缓存仍有效时不会增加。
       *
       * JavaScript `number` 在 `Number.MAX_SAFE_INTEGER` 以内可精确表示整数。即使同一个
       * 节点每秒重算 60 次，也需要约 476 万年才会到达该上限，因此当前实时渲染生命周期
       * 不引入 BigInt 或回绕协议。
       */
      __publicField(this, "worldVersionValue", 0);
    }
    /**
     * 获取完整且稳定的机器身份。
     *
     * @returns 创建节点时生成的完整 UUID v4。
     *
     * @remarks
     * 该属性只有 getter，没有普通 public setter。
     */
    get uuid() {
      return this.uuidValue;
    }
    /**
     * 获取不受打包器类名压缩影响的稳定诊断类型。
     *
     * @returns 当前节点类型用于日志显示的稳定名称。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][scene-node-stable-debug-type]
     *
     * SceneNode 本身是可直接实例化的具体类，因此提供 `'SceneNode'` 默认实现，而不是
     * 声明 abstract member。Group、Scene、Mesh 等子类可以 override 该 getter，返回
     * 显式字符串；生产构建即使重命名 constructor，也不会改变 debugLabel。
     */
    get debugType() {
      return "SceneNode";
    }
    /**
     * 获取面向日志和调试界面的短显示标签。
     *
     * @returns `${name 或稳定 debugType}#${UUID 前 8 位}`。
     *
     * @remarks
     * debugLabel 不是机器身份、序列化主键或 ResourceManager 缓存键。
     * 不使用 `this.constructor.name`，避免生产打包器重命名类后使日志失去可读性。
     */
    get debugLabel() {
      const readableName = this.name || this.debugType;
      return `${readableName}#${this.uuidValue.slice(0, 8)}`;
    }
    /** 获取当前父节点。 */
    get parent() {
      return this.parentValue;
    }
    /**
     * 获取直接子节点的浅拷贝。
     *
     * @returns 保持插入顺序的新数组。
     *
     * @remarks
     * 返回副本可以阻止调用者绕过 add/remove 修改内部数组并破坏双向关系。
     */
    get children() {
      return [...this.childrenValue];
    }
    /**
     * 获取世界矩阵缓存版本。
     *
     * @remarks
     * local 或 parent 变化不会立刻增加该值；只有 `updateWorldMatrix()` 真正重算时增加。
     * `observedParentWorldVersion` 是子节点保存的旧快照，本 getter 返回的是当前节点对外
     * 发布的新版本；二者形成 parent 到 child 的缓存失效通知链。
     */
    get worldVersion() {
      return this.worldVersionValue;
    }
    /**
     * 原子地把一个或多个节点接到当前节点下面。
     *
     * @param nodes - 按参数顺序接入的节点。
     * @returns 当前节点，支持链式调用。
     *
     * @throws {@link DuplicateSceneNodeError}
     * 同一次调用中出现相同节点对象时抛出，并保证树完全不变。
     *
     * @throws {@link SceneGraphCycleError}
     * 接入当前节点自身或其祖先时抛出，并保证树完全不变。
     *
     * @remarks
     * 方法先完成全部验证，之后才进行 detach/attach。节点已有旧 parent 时会先从旧 parent
     * 原子移除；local Transform 保持不变，但移动节点及其后代的世界矩阵缓存全部失效。
     */
    add(...nodes) {
      const seen = /* @__PURE__ */ new Set();
      for (const node of nodes) {
        if (seen.has(node)) throw new DuplicateSceneNodeError(node.debugLabel);
        seen.add(node);
        this.assertCanAdopt(node);
      }
      for (const node of nodes) {
        node.removeFromParent();
        node.parentValue = this;
        this.childrenValue.push(node);
        node.markWorldMatrixDirtyRecursively();
      }
      return this;
    }
    /**
     * 从当前节点移除一个直接子节点。
     *
     * @param node - 尝试移除的节点。
     * @returns 当前节点，支持链式调用。
     *
     * @remarks
     * node 不是直接子节点时保持幂等，不抛错也不修改其他关系。
     */
    remove(node) {
      const childIndex = this.childrenValue.indexOf(node);
      if (childIndex === -1) {
        return this;
      }
      this.childrenValue.splice(childIndex, 1);
      node.parentValue = null;
      node.markWorldMatrixDirtyRecursively();
      return this;
    }
    /**
     * 从当前 parent 移除自身。
     *
     * @returns 当前节点，支持链式调用。
     */
    removeFromParent() {
      if (this.parentValue !== null) {
        this.parentValue.remove(this);
      }
      return this;
    }
    /**
     * 断开全部直接子节点并保持双方关系一致。
     *
     * @returns 当前节点，支持链式调用。
     */
    removeAllChildren() {
      for (const child of this.childrenValue) {
        child.parentValue = null;
        child.markWorldMatrixDirtyRecursively();
      }
      this.childrenValue.length = 0;
      return this;
    }
    /**
     * 以先父后子的深度优先顺序访问当前节点及全部后代。
     *
     * @param visitor - 对每个节点同步调用的处理函数。
     */
    traverse(visitor) {
      visitor(this);
      for (const child of this.childrenValue) {
        child.traverse(visitor);
      }
    }
    /**
     * 以先父后子的深度优先顺序访问可见节点。
     *
     * @param visitor - 对每个可见节点同步调用的处理函数。
     *
     * @remarks
     * 当前节点不可见时立即返回，不访问 visitor，也不继续访问任何后代。
     */
    traverseVisible(visitor) {
      if (!this.visible) {
        return;
      }
      visitor(this);
      for (const child of this.childrenValue) {
        child.traverseVisible(visitor);
      }
    }
    /**
     * 按需更新当前节点的世界矩阵。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][scene-node-local-world-cache-separation]
     *
     * 更新顺序固定为：
     *
     * 1. 先确保 parent 世界矩阵最新；
     * 2. 比较 local Transform.version、parent worldVersion 和结构 dirty flag；
     * 3. 没有变化时直接返回；
     * 4. 把 local matrix 直接复制进 worldMatrixValue；
     * 5. 非 root 原地计算 `parent world * local`，root 在上一步已经完成；
     * 6. 记录观察到的版本并增加本节点 worldVersion。
     *
     * 三类失效来源分别由不同状态检测：
     *
     * - `observedTransformVersion` 检测自己的 local TRS 变化；
     * - `observedParentWorldVersion` 检测 parent world matrix 变化；
     * - `worldMatrixDirty` 检测 reparent 等结构变化。
     *
     * dirty 不能被两个版本号完全替代：两个不同 parent 可能碰巧具有相同的
     * worldVersion 数字，但它们的 world matrix 不同。reparent 必须显式使缓存失效。
     *
     * [DESIGN-WEIGHT:2][scene-node-in-place-world-matrix]
     *
     * Transform 是管理 TRS、version 和 local-matrix cache 的对象，不是 `mat4`。
     * 本方法先通过复制 API 把 local matrix 写入 `worldMatrixValue`，再把同一个矩阵同时
     * 作为 `mat4.multiply()` 的输出和右操作数：
     *
     * ```text
     * out = parentWorld × out
     * ```
     *
     * 当前 gl-matrix 实现明确支持 `out === b`：它会在覆盖每组输出前缓存对应的右操作数。
     * 这样无需为每个 SceneNode 永久保存第二个 mat4。乘法顺序不能交换；parent 带旋转或
     * scale 时，`local × parentWorld` 会产生不同且错误的世界变换。
     */
    updateWorldMatrix() {
      let parentWorldVersion = -1;
      if (this.parentValue !== null) {
        this.parentValue.updateWorldMatrix();
        parentWorldVersion = this.parentValue.worldVersionValue;
      }
      const transformVersion = this.transform.version;
      const cacheIsCurrent = !this.worldMatrixDirty && this.observedTransformVersion === transformVersion && this.observedParentWorldVersion === parentWorldVersion;
      if (cacheIsCurrent) {
        return;
      }
      this.transform.copyLocalMatrixTo(this.worldMatrixValue);
      if (this.parentValue !== null) {
        mat4_exports.multiply(this.worldMatrixValue, this.parentValue.worldMatrixValue, this.worldMatrixValue);
      }
      this.observedTransformVersion = transformVersion;
      this.observedParentWorldVersion = parentWorldVersion;
      this.worldMatrixDirty = false;
      this.worldVersionValue += 1;
    }
    /**
     * 把最新世界矩阵复制到调用者提供的输出矩阵。
     *
     * @param out - 由调用者拥有并接收结果的 mat4。
     *
     * @remarks
     * 方法会先按需更新当前节点及祖先。调用者修改 out 不会污染内部世界矩阵缓存。
     */
    copyWorldMatrixTo(out) {
      this.updateWorldMatrix();
      mat4_exports.copy(out, this.worldMatrixValue);
    }
    /**
     * 验证当前节点是否可以收养目标节点。
     *
     * @param node - 准备接入的目标节点。
     * @throws {@link SceneGraphCycleError} node 是当前节点或当前节点祖先时抛出。
     *
     * @remarks
     * 新增边 `this → node` 只会在 node 已位于 this 的祖先链上时形成循环。
     * 因此从 this 沿 parent 向上检查即可，复杂度为 O(tree height)、额外空间 O(1)。
     */
    assertCanAdopt(node) {
      for (let current = this; current !== null; current = current.parentValue) {
        if (current === node) throw new SceneGraphCycleError(this.debugLabel, node.debugLabel);
      }
    }
    /**
     * 递归使当前节点及其全部后代的世界矩阵缓存失效。
     *
     * @remarks
     * 结构变化不会立即重算矩阵或增加 worldVersion；真正的更新仍由
     * `updateWorldMatrix()` 延迟执行。
     */
    markWorldMatrixDirtyRecursively() {
      this.worldMatrixDirty = true;
      for (const child of this.childrenValue) {
        child.markWorldMatrixDirtyRecursively();
      }
    }
  };
  __name(_SceneNode, "SceneNode");
  var SceneNode = _SceneNode;

  // src/rendering/scene/cameras/Camera.ts
  var _Camera = class _Camera extends SceneNode {
    /** 仅允许具体相机子类选择公开的构造参数。 */
    constructor() {
      super();
      /** 固定使用 Float32 缓冲；子类在构造结束前写入自己的有效投影。 */
      __publicField(this, "projectionMatrixValue", mat4_exports.identity(new Float32Array(16)));
      /** 构造完成为 0，每次成功的投影配置修改增加一次。 */
      __publicField(this, "projectionVersionValue", 0);
    }
    /** 提供稳定的基类诊断类型；具体相机可以覆盖。 */
    get debugType() {
      return "Camera";
    }
    /**
     * 投影配置的版本，而不是读取次数。
     * 移动相机、更新 world matrix、复制 projection matrix 都不增加它。
     */
    get projectionVersion() {
      return this.projectionVersionValue;
    }
  };
  __name(_Camera, "Camera");
  var Camera = _Camera;

  // src/rendering/core/validation.ts
  function assertNonArrayObject(value, errorFactory) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw errorFactory();
    }
  }
  __name(assertNonArrayObject, "assertNonArrayObject");
  function requireFiniteNumber(value, errorFactory) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw errorFactory();
    }
    return value;
  }
  __name(requireFiniteNumber, "requireFiniteNumber");

  // src/rendering/scene/cameras/PerspectiveCamera.ts
  function copyValidatedOptions(options) {
    assertNonArrayObject(
      options,
      () => new InvalidPerspectiveCameraError("options", "must be a non-array object")
    );
    const fovYInput = options.fovY;
    const fovY = requireFiniteNumber(
      fovYInput,
      () => new InvalidPerspectiveCameraError("fovY", "must be a finite number", { received: fovYInput })
    );
    const aspectInput = options.aspect;
    const aspect = requireFiniteNumber(
      aspectInput,
      () => new InvalidPerspectiveCameraError("aspect", "must be a finite number", {
        received: aspectInput
      })
    );
    const nearInput = options.near;
    const near = requireFiniteNumber(
      nearInput,
      () => new InvalidPerspectiveCameraError("near", "must be a finite number", { received: nearInput })
    );
    const farInput = options.far;
    const far = requireFiniteNumber(
      farInput,
      () => new InvalidPerspectiveCameraError("far", "must be a finite number", { received: farInput })
    );
    if (fovY <= 0 || fovY >= Math.PI) {
      throw new InvalidPerspectiveCameraError("fovY", "must satisfy 0 < fovY < PI", { fovY });
    }
    if (aspect <= 0) {
      throw new InvalidPerspectiveCameraError("aspect", "must be positive", { aspect });
    }
    if (near <= 0) {
      throw new InvalidPerspectiveCameraError("near", "must be positive", { near });
    }
    if (far <= near) {
      throw new InvalidPerspectiveCameraError("far", "must be greater than near", { near, far });
    }
    return { fovY, aspect, near, far };
  }
  __name(copyValidatedOptions, "copyValidatedOptions");
  function createProjection(options) {
    const matrix = new Float32Array(16);
    const { fovY, aspect, near, far } = options;
    mat4_exports.perspective(matrix, fovY, aspect, near, far);
    for (const value of matrix) {
      if (!Number.isFinite(value))
        throw new InvalidPerspectiveCameraError(
          "projectionMatrix",
          "must contain only finite Float32 values",
          { ...options }
        );
    }
    if (matrix[0] === 0 || matrix[5] === 0 || matrix[14] === 0) {
      throw new InvalidPerspectiveCameraError(
        "projectionMatrix",
        "must not collapse a projection axis or depth term to zero",
        { ...options }
      );
    }
    return matrix;
  }
  __name(createProjection, "createProjection");
  var _PerspectiveCamera = class _PerspectiveCamera extends Camera {
    /**
     * 完成构造时投影已经有效，初始 projectionVersion 为 0。
     * @param options - 完整的初始透视参数。
     * @throws {@link InvalidPerspectiveCameraError} 参数或生成的矩阵不可用。
     */
    constructor(options) {
      super();
      /** 当前已提交的垂直视场角，单位为弧度。 */
      __publicField(this, "fovYValue");
      /** 当前已提交的宽高比。 */
      __publicField(this, "aspectValue");
      /** 当前已提交的近裁剪距离。 */
      __publicField(this, "nearValue");
      /** 当前已提交的远裁剪距离。 */
      __publicField(this, "farValue");
      const next = copyValidatedOptions(options);
      const projection = createProjection(next);
      this.fovYValue = next.fovY;
      this.aspectValue = next.aspect;
      this.nearValue = next.near;
      this.farValue = next.far;
      mat4_exports.copy(this.projectionMatrixValue, projection);
    }
    /** 不依赖 constructor.name 的稳定诊断类型。 */
    get debugType() {
      return "PerspectiveCamera";
    }
    /** 已提交的垂直视场角，单位为弧度。 */
    get fovY() {
      return this.fovYValue;
    }
    /** 已提交的视口宽 / 高。 */
    get aspect() {
      return this.aspectValue;
    }
    /** 已提交的近裁剪距离。 */
    get near() {
      return this.nearValue;
    }
    /** 已提交的远裁剪距离。 */
    get far() {
      return this.farValue;
    }
    /**
     * 原子地提交完整透视配置；完全相同的参数不会重算或增加版本。
     * 不接受部分更新；调用者需显式保留其余字段。
     * @param options - 完整的新透视参数。
     * @throws {@link InvalidPerspectiveCameraError} 验证失败时旧状态不变。
     */
    setPerspective(options) {
      const next = copyValidatedOptions(options);
      if (next.fovY === this.fovYValue && next.aspect === this.aspectValue && next.near === this.nearValue && next.far === this.farValue) {
        return;
      }
      const projection = createProjection(next);
      this.fovYValue = next.fovY;
      this.aspectValue = next.aspect;
      this.nearValue = next.near;
      this.farValue = next.far;
      mat4_exports.copy(this.projectionMatrixValue, projection);
      this.projectionVersionValue++;
    }
    /**
     * 复制投影，不重算、不增加版本，也不把内部缓冲交给外部。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][camera-projection-copy]
     *
     * @param out - 调用者提供的 16 分量矩阵；内容会被覆盖。
     */
    copyProjectionMatrixTo(out) {
      mat4_exports.copy(out, this.projectionMatrixValue);
    }
  };
  __name(_PerspectiveCamera, "PerspectiveCamera");
  var PerspectiveCamera = _PerspectiveCamera;

  // src/rendering/scene/Group.ts
  var _Group = class _Group extends SceneNode {
    /**
     * 为 debugLabel 提供不受生产构建类名压缩影响的稳定类型。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][scene-node-stable-debug-type]
     *
     * 如果不覆写该 getter，未命名的 Group 会继承 `'SceneNode'`，最终显示为
     * `SceneNode#xxxxxxxx`。显式返回 `'Group'` 后，即使打包器重命名 JavaScript
     * constructor，诊断输出仍然保持稳定。
     */
    get debugType() {
      return "Group";
    }
  };
  __name(_Group, "Group");
  var Group = _Group;

  // src/rendering/scene/Scene.ts
  var _Scene = class _Scene extends Group {
    constructor() {
      super(...arguments);
      /**
       * Scene 是否已经开始或完成释放。
       *
       * @remarks
       * 这是单向状态：false 可以变成 true，但不能重新变回 false。
       */
      __publicField(this, "disposedValue", false);
      /**
       * 当前 Scene 已经登记过的共享 Resource。
       *
       * @remarks
       * Set 保证每个 Scene 对同一 Resource 最多贡献一个引用。该 Set 记录的是当前 Scene
       * 自己的登记关系；总引用数量保存在每个 Resource.sceneReferenceCount 中。
       */
      __publicField(this, "retainedResources", /* @__PURE__ */ new Set());
    }
    /**
     * 为 debugLabel 提供稳定的 Scene 类型。
     *
     * @remarks
     * [DESIGN-WEIGHT:2][scene-node-stable-debug-type]
     */
    get debugType() {
      return "Scene";
    }
    /**
     * 获取 Scene 是否已经进入 disposed 状态。
     */
    get disposed() {
      return this.disposedValue;
    }
    /**
     * 为当前 Scene 登记一个 Resource 存活引用。
     *
     * @param resource - 当前 Scene 将要使用的 Resource。
     * @returns 原样返回具体 Resource 子类型，方便创建和登记写在同一个表达式中。
     *
     * @throws {@link ResourceDisposedError}
     * Scene 已经开始释放，或者 Resource 已经真正释放时抛出。
     *
     * @remarks
     * 方法先检查 Set。重复 retain 同一个对象时直接返回，不重复增加引用。
     *
     * 首次登记时先调用 Resource.retainSceneReference()，成功后才写入 Set。这样如果
     * Resource 已经 disposed 并拒绝 retain，Scene 不会留下错误的登记记录。
     *
     * @example
     * ```ts
     * const geometry = scene.retain(new Geometry(...))
     * ```
     */
    retain(resource) {
      if (this.disposedValue) throw new ResourceDisposedError("Scene");
      if (this.retainedResources.has(resource)) return resource;
      resource.retainSceneReference();
      this.retainedResources.add(resource);
      return resource;
    }
    /**
     * 释放当前 Scene 对一个 Resource 的存活引用。
     *
     * @param resource - 当前 Scene 不再使用的 Resource。
     * @returns 当前 Scene 确实持有该引用并成功释放时返回 true；否则返回 false。
     *
     * @remarks
     * 方法先从 Set 删除，再调用 Resource.releaseSceneReference()。这个顺序保证最后一个
     * 引用触发同步 dispose listener 时，listener 再次调用 `scene.release(resource)`
     * 会看到该登记已经不存在，不会递归释放同一个引用。
     *
     * Scene.dispose() 开始后返回 false，防止一个 Resource listener 取消同一轮中尚未
     * 处理的其他 Resource 引用。
     */
    release(resource) {
      if (this.disposedValue) return false;
      if (!this.retainedResources.delete(resource)) return false;
      resource.releaseSceneReference();
      return true;
    }
    /**
     * 以幂等方式释放场景层级和当前 Scene 持有的所有 Resource 引用。
     *
     * @remarks
     * [DESIGN-WEIGHT:3][scene-dispose-order]
     *
     * 正常路径顺序固定为：
     *
     * 1. 把 Scene 标记为 disposed；
     * 2. 断开全部直接 child；
     * 3. 对每个 retained Resource 调用 releaseSceneReference()；
     * 4. 清空当前 Scene 的 retainedResources Set。
     *
     * Scene 不再直接调用 Resource.dispose()。如果其他 Scene 仍持有同一 Resource，
     * 引用数只会减少；如果当前 Scene 持有最后一个引用，Resource 会自动真正清理。
     *
     * Resource listener 抛错时是否继续释放剩余资源仍遵循
     * `src/rendering/TODOList.md` 中尚未确定的异常策略。
     */
    dispose() {
      if (this.disposedValue) return;
      this.disposedValue = true;
      this.removeAllChildren();
      for (const resource of this.retainedResources) {
        resource.releaseSceneReference();
      }
      this.retainedResources.clear();
    }
  };
  __name(_Scene, "Scene");
  var Scene = _Scene;

  // src/rendering/controls/mountOrbitCameraInput.ts
  var TWO_PI = 2 * Math.PI;
  var MAX_ELEVATION = Math.PI / 2 - 1e-3;
  function clamp(value, min3, max3) {
    return Math.min(max3, Math.max(min3, value));
  }
  __name(clamp, "clamp");
  function mountOrbitCameraInput(canvas, getCamera, options) {
    const initialTarget = [...options.target];
    const minDistance = options.minDistance ?? 0.1;
    const maxDistance = options.maxDistance ?? 1e3;
    const rotateSpeed = options.rotateSpeed ?? 1;
    const panSpeed = options.panSpeed ?? 1;
    const zoomSpeed = options.zoomSpeed ?? 1e-3;
    if (initialTarget.length !== 3 || !initialTarget.every((value) => Number.isFinite(Math.fround(value))) || ![minDistance, maxDistance, rotateSpeed, panSpeed, zoomSpeed].every(Number.isFinite) || minDistance <= 0 || maxDistance < minDistance || rotateSpeed < 0 || panSpeed < 0 || zoomSpeed < 0) {
      throw new RangeError(
        "Orbit input requires a finite target, positive distance bounds and nonnegative speeds"
      );
    }
    const hostWindow = canvas.ownerDocument.defaultView;
    const previousTouchAction = canvas.style.touchAction;
    let closed = false;
    let drag = null;
    const targets = /* @__PURE__ */ new WeakMap();
    const panLocalMatrix = new Float32Array(16);
    function endDrag() {
      const previous = drag;
      drag = null;
      if (previous === null) return;
      try {
        if (canvas.hasPointerCapture(previous.pointerId)) {
          canvas.releasePointerCapture(previous.pointerId);
        }
      } catch {
      }
    }
    __name(endDrag, "endDrag");
    function applyOrbit(camera, azimuthDelta, elevationDelta, zoom) {
      const target = targets.get(camera) ?? initialTarget;
      const position = camera.transform.position;
      const x = position[0] - target[0];
      const y = position[1] - target[1];
      const z = position[2] - target[2];
      const horizontal = Math.hypot(x, z);
      const distance3 = Math.hypot(horizontal, y);
      if (!Number.isFinite(distance3)) return;
      const radius = clamp((distance3 || minDistance) * zoom, minDistance, maxDistance);
      const azimuth = (Math.atan2(x, z) + azimuthDelta) % TWO_PI;
      const elevation = clamp(
        Math.atan2(y, horizontal) + elevationDelta,
        -MAX_ELEVATION,
        MAX_ELEVATION
      );
      const ringRadius = radius * Math.cos(elevation);
      const next = [
        target[0] + ringRadius * Math.sin(azimuth),
        target[1] + radius * Math.sin(elevation),
        target[2] + ringRadius * Math.cos(azimuth)
      ];
      if (!next.every((value) => Number.isFinite(Math.fround(value)))) return;
      camera.transform.setPosition(next);
      camera.transform.setRotation([-elevation, azimuth, 0]);
    }
    __name(applyOrbit, "applyOrbit");
    function applyPan(camera, dx, dy) {
      if (!(camera instanceof PerspectiveCamera) || panSpeed === 0) return;
      const target = targets.get(camera) ?? initialTarget;
      const position = camera.transform.position;
      const distance3 = Math.hypot(
        position[0] - target[0],
        position[1] - target[1],
        position[2] - target[2]
      );
      const unitsPerPixel = 2 * distance3 * Math.tan(camera.fovY / 2) * panSpeed / Math.max(1, canvas.clientHeight);
      if (!Number.isFinite(unitsPerPixel) || unitsPerPixel === 0) return;
      camera.transform.copyLocalMatrixTo(panLocalMatrix);
      const rightLength = Math.hypot(panLocalMatrix[0], panLocalMatrix[1], panLocalMatrix[2]);
      const upLength = Math.hypot(panLocalMatrix[4], panLocalMatrix[5], panLocalMatrix[6]);
      if (!Number.isFinite(rightLength) || !Number.isFinite(upLength) || rightLength === 0 || upLength === 0)
        return;
      const horizontal = -dx * unitsPerPixel / rightLength;
      const vertical = dy * unitsPerPixel / upLength;
      const nextPosition = [
        Math.fround(position[0] + horizontal * panLocalMatrix[0] + vertical * panLocalMatrix[4]),
        Math.fround(position[1] + horizontal * panLocalMatrix[1] + vertical * panLocalMatrix[5]),
        Math.fround(position[2] + horizontal * panLocalMatrix[2] + vertical * panLocalMatrix[6])
      ];
      const nextTarget = [
        target[0] + (nextPosition[0] - position[0]),
        target[1] + (nextPosition[1] - position[1]),
        target[2] + (nextPosition[2] - position[2])
      ];
      if (!nextPosition.every(Number.isFinite) || !nextTarget.every((value) => Number.isFinite(Math.fround(value))))
        return;
      camera.transform.setPosition(nextPosition);
      targets.set(camera, nextTarget);
    }
    __name(applyPan, "applyPan");
    function onPointerDown2(event) {
      if (closed || drag !== null || !event.isPrimary) return;
      const mode = event.button === 0 ? "rotate" : event.button === 2 && event.pointerType === "mouse" ? "pan" : null;
      if (mode === null) return;
      const camera = getCamera();
      if (camera === null) return;
      if (mode === "pan" && (!(camera instanceof PerspectiveCamera) || panSpeed === 0)) return;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        return;
      }
      drag = { pointerId: event.pointerId, camera, mode, x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
    __name(onPointerDown2, "onPointerDown");
    function onPointerMove2(event) {
      if (closed || event.pointerId !== drag?.pointerId) return;
      const camera = getCamera();
      const requiredButtons = drag.mode === "pan" ? 2 : 1;
      if (camera !== drag.camera || event.pointerType === "mouse" && (event.buttons & requiredButtons) === 0) {
        endDrag();
        return;
      }
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx === 0 && dy === 0) return;
      if (drag.mode === "pan") {
        applyPan(camera, dx, dy);
      } else {
        const radiansPerPixel = TWO_PI * rotateSpeed / Math.max(1, canvas.clientHeight);
        applyOrbit(camera, -dx * radiansPerPixel, dy * radiansPerPixel, 1);
      }
      event.preventDefault();
    }
    __name(onPointerMove2, "onPointerMove");
    function onPointerEnd(event) {
      if (event.pointerId === drag?.pointerId) endDrag();
    }
    __name(onPointerEnd, "onPointerEnd");
    function onContextMenu2(event) {
      if (!closed) event.preventDefault();
    }
    __name(onContextMenu2, "onContextMenu");
    function onWheel(event) {
      if (closed || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
      const camera = getCamera();
      if (camera === null) return;
      if (drag !== null && camera !== drag.camera) endDrag();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, canvas.clientHeight) : 1;
      const zoom = Math.exp(clamp(event.deltaY * unit * zoomSpeed, -50, 50));
      applyOrbit(camera, 0, 0, zoom);
      event.preventDefault();
    }
    __name(onWheel, "onWheel");
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown2);
    canvas.addEventListener("pointermove", onPointerMove2);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("lostpointercapture", onPointerEnd);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu2);
    canvas.addEventListener("webglcontextlost", endDrag);
    hostWindow?.addEventListener("blur", endDrag);
    return () => {
      if (closed) return;
      closed = true;
      canvas.removeEventListener("pointerdown", onPointerDown2);
      canvas.removeEventListener("pointermove", onPointerMove2);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("lostpointercapture", onPointerEnd);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu2);
      canvas.removeEventListener("webglcontextlost", endDrag);
      hostWindow?.removeEventListener("blur", endDrag);
      endDrag();
      canvas.style.touchAction = previousTouchAction;
    };
  }
  __name(mountOrbitCameraInput, "mountOrbitCameraInput");

  // node_modules/three/src/core/EventDispatcher.js
  var _EventDispatcher = class _EventDispatcher {
    /**
     * Adds the given event listener to the given event type.
     *
     * @param {string} type - The type of event to listen to.
     * @param {Function} listener - The function that gets called when the event is fired.
     */
    addEventListener(type, listener) {
      if (this._listeners === void 0) this._listeners = {};
      const listeners = this._listeners;
      if (listeners[type] === void 0) {
        listeners[type] = [];
      }
      if (listeners[type].indexOf(listener) === -1) {
        listeners[type].push(listener);
      }
    }
    /**
     * Returns `true` if the given event listener has been added to the given event type.
     *
     * @param {string} type - The type of event.
     * @param {Function} listener - The listener to check.
     * @return {boolean} Whether the given event listener has been added to the given event type.
     */
    hasEventListener(type, listener) {
      const listeners = this._listeners;
      if (listeners === void 0) return false;
      return listeners[type] !== void 0 && listeners[type].indexOf(listener) !== -1;
    }
    /**
     * Removes the given event listener from the given event type.
     *
     * @param {string} type - The type of event.
     * @param {Function} listener - The listener to remove.
     */
    removeEventListener(type, listener) {
      const listeners = this._listeners;
      if (listeners === void 0) return;
      const listenerArray = listeners[type];
      if (listenerArray !== void 0) {
        const index = listenerArray.indexOf(listener);
        if (index !== -1) {
          listenerArray.splice(index, 1);
        }
      }
    }
    /**
     * Dispatches an event object.
     *
     * @param {Object} event - The event that gets fired.
     */
    dispatchEvent(event) {
      const listeners = this._listeners;
      if (listeners === void 0) return;
      const listenerArray = listeners[event.type];
      if (listenerArray !== void 0) {
        event.target = this;
        const array = listenerArray.slice(0);
        for (let i = 0, l = array.length; i < l; i++) {
          array[i].call(this, event);
        }
        event.target = null;
      }
    }
  };
  __name(_EventDispatcher, "EventDispatcher");
  var EventDispatcher = _EventDispatcher;

  // node_modules/three/src/extras/Controls.js
  var _Controls = class _Controls extends EventDispatcher {
    /**
     * Constructs a new controls instance.
     *
     * @param {Object3D} object - The object that is managed by the controls.
     * @param {?HTMLDOMElement} domElement - The HTML element used for event listeners.
     */
    constructor(object, domElement = null) {
      super();
      this.object = object;
      this.domElement = domElement;
      this.enabled = true;
      this.state = -1;
      this.keys = {};
      this.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: null };
      this.touches = { ONE: null, TWO: null };
    }
    /**
     * Connects the controls to the DOM. This method has so called "side effects" since
     * it adds the module's event listeners to the DOM.
     *
     * @param {HTMLDOMElement} element - The DOM element to connect to.
     */
    connect(element) {
      if (element === void 0) {
        console.warn("THREE.Controls: connect() now requires an element.");
        return;
      }
      if (this.domElement !== null) this.disconnect();
      this.domElement = element;
    }
    /**
     * Disconnects the controls from the DOM.
     */
    disconnect() {
    }
    /**
     * Call this method if you no longer want use to the controls. It frees all internal
     * resources and removes all event listeners.
     */
    dispose() {
    }
    /**
     * Controls should implement this method if they have to update their internal state
     * per simulation step.
     *
     * @param {number} [delta] - The time delta in seconds.
     */
    update() {
    }
  };
  __name(_Controls, "Controls");
  var Controls = _Controls;

  // node_modules/three/src/constants.js
  var MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2, ROTATE: 0, DOLLY: 1, PAN: 2 };
  var TOUCH = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 };
  var WebGLCoordinateSystem = 2e3;
  var WebGPUCoordinateSystem = 2001;

  // node_modules/three/src/math/MathUtils.js
  var MathUtils_exports = {};
  __export(MathUtils_exports, {
    DEG2RAD: () => DEG2RAD,
    MathUtils: () => MathUtils,
    RAD2DEG: () => RAD2DEG,
    ceilPowerOfTwo: () => ceilPowerOfTwo,
    clamp: () => clamp2,
    damp: () => damp,
    degToRad: () => degToRad,
    denormalize: () => denormalize,
    euclideanModulo: () => euclideanModulo,
    floorPowerOfTwo: () => floorPowerOfTwo,
    generateUUID: () => generateUUID,
    inverseLerp: () => inverseLerp,
    isPowerOfTwo: () => isPowerOfTwo,
    lerp: () => lerp4,
    mapLinear: () => mapLinear,
    normalize: () => normalize4,
    pingpong: () => pingpong,
    radToDeg: () => radToDeg,
    randFloat: () => randFloat,
    randFloatSpread: () => randFloatSpread,
    randInt: () => randInt,
    seededRandom: () => seededRandom,
    setQuaternionFromProperEuler: () => setQuaternionFromProperEuler,
    smootherstep: () => smootherstep,
    smoothstep: () => smoothstep
  });
  var _lut = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af", "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf", "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf", "d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df", "e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef", "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff"];
  var _seed = 1234567;
  var DEG2RAD = Math.PI / 180;
  var RAD2DEG = 180 / Math.PI;
  function generateUUID() {
    const d0 = Math.random() * 4294967295 | 0;
    const d1 = Math.random() * 4294967295 | 0;
    const d2 = Math.random() * 4294967295 | 0;
    const d3 = Math.random() * 4294967295 | 0;
    const uuid = _lut[d0 & 255] + _lut[d0 >> 8 & 255] + _lut[d0 >> 16 & 255] + _lut[d0 >> 24 & 255] + "-" + _lut[d1 & 255] + _lut[d1 >> 8 & 255] + "-" + _lut[d1 >> 16 & 15 | 64] + _lut[d1 >> 24 & 255] + "-" + _lut[d2 & 63 | 128] + _lut[d2 >> 8 & 255] + "-" + _lut[d2 >> 16 & 255] + _lut[d2 >> 24 & 255] + _lut[d3 & 255] + _lut[d3 >> 8 & 255] + _lut[d3 >> 16 & 255] + _lut[d3 >> 24 & 255];
    return uuid.toLowerCase();
  }
  __name(generateUUID, "generateUUID");
  function clamp2(value, min3, max3) {
    return Math.max(min3, Math.min(max3, value));
  }
  __name(clamp2, "clamp");
  function euclideanModulo(n, m) {
    return (n % m + m) % m;
  }
  __name(euclideanModulo, "euclideanModulo");
  function mapLinear(x, a1, a2, b1, b2) {
    return b1 + (x - a1) * (b2 - b1) / (a2 - a1);
  }
  __name(mapLinear, "mapLinear");
  function inverseLerp(x, y, value) {
    if (x !== y) {
      return (value - x) / (y - x);
    } else {
      return 0;
    }
  }
  __name(inverseLerp, "inverseLerp");
  function lerp4(x, y, t) {
    return (1 - t) * x + t * y;
  }
  __name(lerp4, "lerp");
  function damp(x, y, lambda, dt) {
    return lerp4(x, y, 1 - Math.exp(-lambda * dt));
  }
  __name(damp, "damp");
  function pingpong(x, length4 = 1) {
    return length4 - Math.abs(euclideanModulo(x, length4 * 2) - length4);
  }
  __name(pingpong, "pingpong");
  function smoothstep(x, min3, max3) {
    if (x <= min3) return 0;
    if (x >= max3) return 1;
    x = (x - min3) / (max3 - min3);
    return x * x * (3 - 2 * x);
  }
  __name(smoothstep, "smoothstep");
  function smootherstep(x, min3, max3) {
    if (x <= min3) return 0;
    if (x >= max3) return 1;
    x = (x - min3) / (max3 - min3);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }
  __name(smootherstep, "smootherstep");
  function randInt(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
  }
  __name(randInt, "randInt");
  function randFloat(low, high) {
    return low + Math.random() * (high - low);
  }
  __name(randFloat, "randFloat");
  function randFloatSpread(range) {
    return range * (0.5 - Math.random());
  }
  __name(randFloatSpread, "randFloatSpread");
  function seededRandom(s) {
    if (s !== void 0) _seed = s;
    let t = _seed += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  __name(seededRandom, "seededRandom");
  function degToRad(degrees) {
    return degrees * DEG2RAD;
  }
  __name(degToRad, "degToRad");
  function radToDeg(radians) {
    return radians * RAD2DEG;
  }
  __name(radToDeg, "radToDeg");
  function isPowerOfTwo(value) {
    return (value & value - 1) === 0 && value !== 0;
  }
  __name(isPowerOfTwo, "isPowerOfTwo");
  function ceilPowerOfTwo(value) {
    return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
  }
  __name(ceilPowerOfTwo, "ceilPowerOfTwo");
  function floorPowerOfTwo(value) {
    return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
  }
  __name(floorPowerOfTwo, "floorPowerOfTwo");
  function setQuaternionFromProperEuler(q, a, b, c, order) {
    const cos = Math.cos;
    const sin = Math.sin;
    const c2 = cos(b / 2);
    const s2 = sin(b / 2);
    const c13 = cos((a + c) / 2);
    const s13 = sin((a + c) / 2);
    const c1_3 = cos((a - c) / 2);
    const s1_3 = sin((a - c) / 2);
    const c3_1 = cos((c - a) / 2);
    const s3_1 = sin((c - a) / 2);
    switch (order) {
      case "XYX":
        q.set(c2 * s13, s2 * c1_3, s2 * s1_3, c2 * c13);
        break;
      case "YZY":
        q.set(s2 * s1_3, c2 * s13, s2 * c1_3, c2 * c13);
        break;
      case "ZXZ":
        q.set(s2 * c1_3, s2 * s1_3, c2 * s13, c2 * c13);
        break;
      case "XZX":
        q.set(c2 * s13, s2 * s3_1, s2 * c3_1, c2 * c13);
        break;
      case "YXY":
        q.set(s2 * c3_1, c2 * s13, s2 * s3_1, c2 * c13);
        break;
      case "ZYZ":
        q.set(s2 * s3_1, s2 * c3_1, c2 * s13, c2 * c13);
        break;
      default:
        console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: " + order);
    }
  }
  __name(setQuaternionFromProperEuler, "setQuaternionFromProperEuler");
  function denormalize(value, array) {
    switch (array.constructor) {
      case Float32Array:
        return value;
      case Uint32Array:
        return value / 4294967295;
      case Uint16Array:
        return value / 65535;
      case Uint8Array:
        return value / 255;
      case Int32Array:
        return Math.max(value / 2147483647, -1);
      case Int16Array:
        return Math.max(value / 32767, -1);
      case Int8Array:
        return Math.max(value / 127, -1);
      default:
        throw new Error("Invalid component type.");
    }
  }
  __name(denormalize, "denormalize");
  function normalize4(value, array) {
    switch (array.constructor) {
      case Float32Array:
        return value;
      case Uint32Array:
        return Math.round(value * 4294967295);
      case Uint16Array:
        return Math.round(value * 65535);
      case Uint8Array:
        return Math.round(value * 255);
      case Int32Array:
        return Math.round(value * 2147483647);
      case Int16Array:
        return Math.round(value * 32767);
      case Int8Array:
        return Math.round(value * 127);
      default:
        throw new Error("Invalid component type.");
    }
  }
  __name(normalize4, "normalize");
  var MathUtils = {
    DEG2RAD,
    RAD2DEG,
    /**
     * Generate a [UUID]{@link https://en.wikipedia.org/wiki/Universally_unique_identifier}
     * (universally unique identifier).
     *
     * @static
     * @method
     * @return {string} The UUID.
     */
    generateUUID,
    /**
     * Clamps the given value between min and max.
     *
     * @static
     * @method
     * @param {number} value - The value to clamp.
     * @param {number} min - The min value.
     * @param {number} max - The max value.
     * @return {number} The clamped value.
     */
    clamp: clamp2,
    /**
     * Computes the Euclidean modulo of the given parameters that
     * is `( ( n % m ) + m ) % m`.
     *
     * @static
     * @method
     * @param {number} n - The first parameter.
     * @param {number} m - The second parameter.
     * @return {number} The Euclidean modulo.
     */
    euclideanModulo,
    /**
     * Performs a linear mapping from range `<a1, a2>` to range `<b1, b2>`
     * for the given value.
     *
     * @static
     * @method
     * @param {number} x - The value to be mapped.
     * @param {number} a1 - Minimum value for range A.
     * @param {number} a2 - Maximum value for range A.
     * @param {number} b1 - Minimum value for range B.
     * @param {number} b2 - Maximum value for range B.
     * @return {number} The mapped value.
     */
    mapLinear,
    /**
     * Returns the percentage in the closed interval `[0, 1]` of the given value
     * between the start and end point.
     *
     * @static
     * @method
     * @param {number} x - The start point
     * @param {number} y - The end point.
     * @param {number} value - A value between start and end.
     * @return {number} The interpolation factor.
     */
    inverseLerp,
    /**
     * Returns a value linearly interpolated from two known points based on the given interval -
     * `t = 0` will return `x` and `t = 1` will return `y`.
     *
     * @static
     * @method
     * @param {number} x - The start point
     * @param {number} y - The end point.
     * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
     * @return {number} The interpolated value.
     */
    lerp: lerp4,
    /**
     * Smoothly interpolate a number from `x` to `y` in  a spring-like manner using a delta
     * time to maintain frame rate independent movement. For details, see
     * [Frame rate independent damping using lerp]{@link http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/}.
     *
     * @static
     * @method
     * @param {number} x - The current point.
     * @param {number} y - The target point.
     * @param {number} lambda - A higher lambda value will make the movement more sudden,
     * and a lower value will make the movement more gradual.
     * @param {number} dt - Delta time in seconds.
     * @return {number} The interpolated value.
     */
    damp,
    /**
     * Returns a value that alternates between `0` and the given `length` parameter.
     *
     * @static
     * @method
     * @param {number} x - The value to pingpong.
     * @param {number} [length=1] - The positive value the function will pingpong to.
     * @return {number} The alternated value.
     */
    pingpong,
    /**
     * Returns a value in the range `[0,1]` that represents the percentage that `x` has
     * moved between `min` and `max`, but smoothed or slowed down the closer `x` is to
     * the `min` and `max`.
     *
     * See [Smoothstep]{@link http://en.wikipedia.org/wiki/Smoothstep} for more details.
     *
     * @static
     * @method
     * @param {number} x - The value to evaluate based on its position between min and max.
     * @param {number} min - The min value. Any x value below min will be `0`.
     * @param {number} max - The max value. Any x value above max will be `1`.
     * @return {number} The alternated value.
     */
    smoothstep,
    /**
     * A [variation on smoothstep]{@link https://en.wikipedia.org/wiki/Smoothstep#Variations}
     * that has zero 1st and 2nd order derivatives at x=0 and x=1.
     *
     * @static
     * @method
     * @param {number} x - The value to evaluate based on its position between min and max.
     * @param {number} min - The min value. Any x value below min will be `0`.
     * @param {number} max - The max value. Any x value above max will be `1`.
     * @return {number} The alternated value.
     */
    smootherstep,
    /**
     * Returns a random integer from `<low, high>` interval.
     *
     * @static
     * @method
     * @param {number} low - The lower value boundary.
     * @param {number} high - The upper value boundary
     * @return {number} A random integer.
     */
    randInt,
    /**
     * Returns a random float from `<low, high>` interval.
     *
     * @static
     * @method
     * @param {number} low - The lower value boundary.
     * @param {number} high - The upper value boundary
     * @return {number} A random float.
     */
    randFloat,
    /**
     * Returns a random integer from `<-range/2, range/2>` interval.
     *
     * @static
     * @method
     * @param {number} range - Defines the value range.
     * @return {number} A random float.
     */
    randFloatSpread,
    /**
     * Returns a deterministic pseudo-random float in the interval `[0, 1]`.
     *
     * @static
     * @method
     * @param {number} [s] - The integer seed.
     * @return {number} A random float.
     */
    seededRandom,
    /**
     * Converts degrees to radians.
     *
     * @static
     * @method
     * @param {number} degrees - A value in degrees.
     * @return {number} The converted value in radians.
     */
    degToRad,
    /**
     * Converts radians to degrees.
     *
     * @static
     * @method
     * @param {number} radians - A value in radians.
     * @return {number} The converted value in degrees.
     */
    radToDeg,
    /**
     * Returns `true` if the given number is a power of two.
     *
     * @static
     * @method
     * @param {number} value - The value to check.
     * @return {boolean} Whether the given number is a power of two or not.
     */
    isPowerOfTwo,
    /**
     * Returns the smallest power of two that is greater than or equal to the given number.
     *
     * @static
     * @method
     * @param {number} value - The value to find a POT for.
     * @return {number} The smallest power of two that is greater than or equal to the given number.
     */
    ceilPowerOfTwo,
    /**
     * Returns the largest power of two that is less than or equal to the given number.
     *
     * @static
     * @method
     * @param {number} value - The value to find a POT for.
     * @return {number} The largest power of two that is less than or equal to the given number.
     */
    floorPowerOfTwo,
    /**
     * Sets the given quaternion from the [Intrinsic Proper Euler Angles]{@link https://en.wikipedia.org/wiki/Euler_angles}
     * defined by the given angles and order.
     *
     * Rotations are applied to the axes in the order specified by order:
     * rotation by angle `a` is applied first, then by angle `b`, then by angle `c`.
     *
     * @static
     * @method
     * @param {Quaternion} q - The quaternion to set.
     * @param {number} a - The rotation applied to the first axis, in radians.
     * @param {number} b - The rotation applied to the second axis, in radians.
     * @param {number} c - The rotation applied to the third axis, in radians.
     * @param {('XYX'|'XZX'|'YXY'|'YZY'|'ZXZ'|'ZYZ')} order - A string specifying the axes order.
     */
    setQuaternionFromProperEuler,
    /**
     * Normalizes the given value according to the given typed array.
     *
     * @static
     * @method
     * @param {number} value - The float value in the range `[0,1]` to normalize.
     * @param {TypedArray} array - The typed array that defines the data type of the value.
     * @return {number} The normalize value.
     */
    normalize: normalize4,
    /**
     * Denormalizes the given value according to the given typed array.
     *
     * @static
     * @method
     * @param {number} value - The value to denormalize.
     * @param {TypedArray} array - The typed array that defines the data type of the value.
     * @return {number} The denormalize (float) value in the range `[0,1]`.
     */
    denormalize
  };

  // node_modules/three/src/math/Quaternion.js
  var _Quaternion = class _Quaternion {
    /**
     * Constructs a new quaternion.
     *
     * @param {number} [x=0] - The x value of this quaternion.
     * @param {number} [y=0] - The y value of this quaternion.
     * @param {number} [z=0] - The z value of this quaternion.
     * @param {number} [w=1] - The w value of this quaternion.
     */
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.isQuaternion = true;
      this._x = x;
      this._y = y;
      this._z = z;
      this._w = w;
    }
    /**
     * Interpolates between two quaternions via SLERP. This implementation assumes the
     * quaternion data are managed  in flat arrays.
     *
     * @param {Array<number>} dst - The destination array.
     * @param {number} dstOffset - An offset into the destination array.
     * @param {Array<number>} src0 - The source array of the first quaternion.
     * @param {number} srcOffset0 - An offset into the first source array.
     * @param {Array<number>} src1 -  The source array of the second quaternion.
     * @param {number} srcOffset1 - An offset into the second source array.
     * @param {number} t - The interpolation factor in the range `[0,1]`.
     * @see {@link Quaternion#slerp}
     */
    static slerpFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t) {
      let x0 = src0[srcOffset0 + 0], y0 = src0[srcOffset0 + 1], z0 = src0[srcOffset0 + 2], w0 = src0[srcOffset0 + 3];
      const x1 = src1[srcOffset1 + 0], y1 = src1[srcOffset1 + 1], z1 = src1[srcOffset1 + 2], w1 = src1[srcOffset1 + 3];
      if (t === 0) {
        dst[dstOffset + 0] = x0;
        dst[dstOffset + 1] = y0;
        dst[dstOffset + 2] = z0;
        dst[dstOffset + 3] = w0;
        return;
      }
      if (t === 1) {
        dst[dstOffset + 0] = x1;
        dst[dstOffset + 1] = y1;
        dst[dstOffset + 2] = z1;
        dst[dstOffset + 3] = w1;
        return;
      }
      if (w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1) {
        let s = 1 - t;
        const cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1, dir = cos >= 0 ? 1 : -1, sqrSin = 1 - cos * cos;
        if (sqrSin > Number.EPSILON) {
          const sin = Math.sqrt(sqrSin), len4 = Math.atan2(sin, cos * dir);
          s = Math.sin(s * len4) / sin;
          t = Math.sin(t * len4) / sin;
        }
        const tDir = t * dir;
        x0 = x0 * s + x1 * tDir;
        y0 = y0 * s + y1 * tDir;
        z0 = z0 * s + z1 * tDir;
        w0 = w0 * s + w1 * tDir;
        if (s === 1 - t) {
          const f = 1 / Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0);
          x0 *= f;
          y0 *= f;
          z0 *= f;
          w0 *= f;
        }
      }
      dst[dstOffset] = x0;
      dst[dstOffset + 1] = y0;
      dst[dstOffset + 2] = z0;
      dst[dstOffset + 3] = w0;
    }
    /**
     * Multiplies two quaternions. This implementation assumes the quaternion data are managed
     * in flat arrays.
     *
     * @param {Array<number>} dst - The destination array.
     * @param {number} dstOffset - An offset into the destination array.
     * @param {Array<number>} src0 - The source array of the first quaternion.
     * @param {number} srcOffset0 - An offset into the first source array.
     * @param {Array<number>} src1 -  The source array of the second quaternion.
     * @param {number} srcOffset1 - An offset into the second source array.
     * @return {Array<number>} The destination array.
     * @see {@link Quaternion#multiplyQuaternions}.
     */
    static multiplyQuaternionsFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1) {
      const x0 = src0[srcOffset0];
      const y0 = src0[srcOffset0 + 1];
      const z0 = src0[srcOffset0 + 2];
      const w0 = src0[srcOffset0 + 3];
      const x1 = src1[srcOffset1];
      const y1 = src1[srcOffset1 + 1];
      const z1 = src1[srcOffset1 + 2];
      const w1 = src1[srcOffset1 + 3];
      dst[dstOffset] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1;
      dst[dstOffset + 1] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1;
      dst[dstOffset + 2] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1;
      dst[dstOffset + 3] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1;
      return dst;
    }
    /**
     * The x value of this quaternion.
     *
     * @type {number}
     * @default 0
     */
    get x() {
      return this._x;
    }
    set x(value) {
      this._x = value;
      this._onChangeCallback();
    }
    /**
     * The y value of this quaternion.
     *
     * @type {number}
     * @default 0
     */
    get y() {
      return this._y;
    }
    set y(value) {
      this._y = value;
      this._onChangeCallback();
    }
    /**
     * The z value of this quaternion.
     *
     * @type {number}
     * @default 0
     */
    get z() {
      return this._z;
    }
    set z(value) {
      this._z = value;
      this._onChangeCallback();
    }
    /**
     * The w value of this quaternion.
     *
     * @type {number}
     * @default 1
     */
    get w() {
      return this._w;
    }
    set w(value) {
      this._w = value;
      this._onChangeCallback();
    }
    /**
     * Sets the quaternion components.
     *
     * @param {number} x - The x value of this quaternion.
     * @param {number} y - The y value of this quaternion.
     * @param {number} z - The z value of this quaternion.
     * @param {number} w - The w value of this quaternion.
     * @return {Quaternion} A reference to this quaternion.
     */
    set(x, y, z, w) {
      this._x = x;
      this._y = y;
      this._z = z;
      this._w = w;
      this._onChangeCallback();
      return this;
    }
    /**
     * Returns a new quaternion with copied values from this instance.
     *
     * @return {Quaternion} A clone of this instance.
     */
    clone() {
      return new this.constructor(this._x, this._y, this._z, this._w);
    }
    /**
     * Copies the values of the given quaternion to this instance.
     *
     * @param {Quaternion} quaternion - The quaternion to copy.
     * @return {Quaternion} A reference to this quaternion.
     */
    copy(quaternion) {
      this._x = quaternion.x;
      this._y = quaternion.y;
      this._z = quaternion.z;
      this._w = quaternion.w;
      this._onChangeCallback();
      return this;
    }
    /**
     * Sets this quaternion from the rotation specified by the given
     * Euler angles.
     *
     * @param {Euler} euler - The Euler angles.
     * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
     * @return {Quaternion} A reference to this quaternion.
     */
    setFromEuler(euler, update = true) {
      const x = euler._x, y = euler._y, z = euler._z, order = euler._order;
      const cos = Math.cos;
      const sin = Math.sin;
      const c1 = cos(x / 2);
      const c2 = cos(y / 2);
      const c3 = cos(z / 2);
      const s1 = sin(x / 2);
      const s2 = sin(y / 2);
      const s3 = sin(z / 2);
      switch (order) {
        case "XYZ":
          this._x = s1 * c2 * c3 + c1 * s2 * s3;
          this._y = c1 * s2 * c3 - s1 * c2 * s3;
          this._z = c1 * c2 * s3 + s1 * s2 * c3;
          this._w = c1 * c2 * c3 - s1 * s2 * s3;
          break;
        case "YXZ":
          this._x = s1 * c2 * c3 + c1 * s2 * s3;
          this._y = c1 * s2 * c3 - s1 * c2 * s3;
          this._z = c1 * c2 * s3 - s1 * s2 * c3;
          this._w = c1 * c2 * c3 + s1 * s2 * s3;
          break;
        case "ZXY":
          this._x = s1 * c2 * c3 - c1 * s2 * s3;
          this._y = c1 * s2 * c3 + s1 * c2 * s3;
          this._z = c1 * c2 * s3 + s1 * s2 * c3;
          this._w = c1 * c2 * c3 - s1 * s2 * s3;
          break;
        case "ZYX":
          this._x = s1 * c2 * c3 - c1 * s2 * s3;
          this._y = c1 * s2 * c3 + s1 * c2 * s3;
          this._z = c1 * c2 * s3 - s1 * s2 * c3;
          this._w = c1 * c2 * c3 + s1 * s2 * s3;
          break;
        case "YZX":
          this._x = s1 * c2 * c3 + c1 * s2 * s3;
          this._y = c1 * s2 * c3 + s1 * c2 * s3;
          this._z = c1 * c2 * s3 - s1 * s2 * c3;
          this._w = c1 * c2 * c3 - s1 * s2 * s3;
          break;
        case "XZY":
          this._x = s1 * c2 * c3 - c1 * s2 * s3;
          this._y = c1 * s2 * c3 - s1 * c2 * s3;
          this._z = c1 * c2 * s3 + s1 * s2 * c3;
          this._w = c1 * c2 * c3 + s1 * s2 * s3;
          break;
        default:
          console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: " + order);
      }
      if (update === true) this._onChangeCallback();
      return this;
    }
    /**
     * Sets this quaternion from the given axis and angle.
     *
     * @param {Vector3} axis - The normalized axis.
     * @param {number} angle - The angle in radians.
     * @return {Quaternion} A reference to this quaternion.
     */
    setFromAxisAngle(axis, angle2) {
      const halfAngle = angle2 / 2, s = Math.sin(halfAngle);
      this._x = axis.x * s;
      this._y = axis.y * s;
      this._z = axis.z * s;
      this._w = Math.cos(halfAngle);
      this._onChangeCallback();
      return this;
    }
    /**
     * Sets this quaternion from the given rotation matrix.
     *
     * @param {Matrix4} m - A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
     * @return {Quaternion} A reference to this quaternion.
     */
    setFromRotationMatrix(m) {
      const te = m.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], trace = m11 + m22 + m33;
      if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        this._w = 0.25 / s;
        this._x = (m32 - m23) * s;
        this._y = (m13 - m31) * s;
        this._z = (m21 - m12) * s;
      } else if (m11 > m22 && m11 > m33) {
        const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
        this._w = (m32 - m23) / s;
        this._x = 0.25 * s;
        this._y = (m12 + m21) / s;
        this._z = (m13 + m31) / s;
      } else if (m22 > m33) {
        const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
        this._w = (m13 - m31) / s;
        this._x = (m12 + m21) / s;
        this._y = 0.25 * s;
        this._z = (m23 + m32) / s;
      } else {
        const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
        this._w = (m21 - m12) / s;
        this._x = (m13 + m31) / s;
        this._y = (m23 + m32) / s;
        this._z = 0.25 * s;
      }
      this._onChangeCallback();
      return this;
    }
    /**
     * Sets this quaternion to the rotation required to rotate the direction vector
     * `vFrom` to the direction vector `vTo`.
     *
     * @param {Vector3} vFrom - The first (normalized) direction vector.
     * @param {Vector3} vTo - The second (normalized) direction vector.
     * @return {Quaternion} A reference to this quaternion.
     */
    setFromUnitVectors(vFrom, vTo) {
      let r = vFrom.dot(vTo) + 1;
      if (r < Number.EPSILON) {
        r = 0;
        if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
          this._x = -vFrom.y;
          this._y = vFrom.x;
          this._z = 0;
          this._w = r;
        } else {
          this._x = 0;
          this._y = -vFrom.z;
          this._z = vFrom.y;
          this._w = r;
        }
      } else {
        this._x = vFrom.y * vTo.z - vFrom.z * vTo.y;
        this._y = vFrom.z * vTo.x - vFrom.x * vTo.z;
        this._z = vFrom.x * vTo.y - vFrom.y * vTo.x;
        this._w = r;
      }
      return this.normalize();
    }
    /**
     * Returns the angle between this quaternion and the given one in radians.
     *
     * @param {Quaternion} q - The quaternion to compute the angle with.
     * @return {number} The angle in radians.
     */
    angleTo(q) {
      return 2 * Math.acos(Math.abs(clamp2(this.dot(q), -1, 1)));
    }
    /**
     * Rotates this quaternion by a given angular step to the given quaternion.
     * The method ensures that the final quaternion will not overshoot `q`.
     *
     * @param {Quaternion} q - The target quaternion.
     * @param {number} step - The angular step in radians.
     * @return {Quaternion} A reference to this quaternion.
     */
    rotateTowards(q, step) {
      const angle2 = this.angleTo(q);
      if (angle2 === 0) return this;
      const t = Math.min(1, step / angle2);
      this.slerp(q, t);
      return this;
    }
    /**
     * Sets this quaternion to the identity quaternion; that is, to the
     * quaternion that represents "no rotation".
     *
     * @return {Quaternion} A reference to this quaternion.
     */
    identity() {
      return this.set(0, 0, 0, 1);
    }
    /**
     * Inverts this quaternion via {@link Quaternion#conjugate}. The
     * quaternion is assumed to have unit length.
     *
     * @return {Quaternion} A reference to this quaternion.
     */
    invert() {
      return this.conjugate();
    }
    /**
     * Returns the rotational conjugate of this quaternion. The conjugate of a
     * quaternion represents the same rotation in the opposite direction about
     * the rotational axis.
     *
     * @return {Quaternion} A reference to this quaternion.
     */
    conjugate() {
      this._x *= -1;
      this._y *= -1;
      this._z *= -1;
      this._onChangeCallback();
      return this;
    }
    /**
     * Calculates the dot product of this quaternion and the given one.
     *
     * @param {Quaternion} v - The quaternion to compute the dot product with.
     * @return {number} The result of the dot product.
     */
    dot(v) {
      return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;
    }
    /**
     * Computes the squared Euclidean length (straight-line length) of this quaternion,
     * considered as a 4 dimensional vector. This can be useful if you are comparing the
     * lengths of two quaternions, as this is a slightly more efficient calculation than
     * {@link Quaternion#length}.
     *
     * @return {number} The squared Euclidean length.
     */
    lengthSq() {
      return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
    }
    /**
     * Computes the Euclidean length (straight-line length) of this quaternion,
     * considered as a 4 dimensional vector.
     *
     * @return {number} The Euclidean length.
     */
    length() {
      return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
    }
    /**
     * Normalizes this quaternion - that is, calculated the quaternion that performs
     * the same rotation as this one, but has a length equal to `1`.
     *
     * @return {Quaternion} A reference to this quaternion.
     */
    normalize() {
      let l = this.length();
      if (l === 0) {
        this._x = 0;
        this._y = 0;
        this._z = 0;
        this._w = 1;
      } else {
        l = 1 / l;
        this._x = this._x * l;
        this._y = this._y * l;
        this._z = this._z * l;
        this._w = this._w * l;
      }
      this._onChangeCallback();
      return this;
    }
    /**
     * Multiplies this quaternion by the given one.
     *
     * @param {Quaternion} q - The quaternion.
     * @return {Quaternion} A reference to this quaternion.
     */
    multiply(q) {
      return this.multiplyQuaternions(this, q);
    }
    /**
     * Pre-multiplies this quaternion by the given one.
     *
     * @param {Quaternion} q - The quaternion.
     * @return {Quaternion} A reference to this quaternion.
     */
    premultiply(q) {
      return this.multiplyQuaternions(q, this);
    }
    /**
     * Multiplies the given quaternions and stores the result in this instance.
     *
     * @param {Quaternion} a - The first quaternion.
     * @param {Quaternion} b - The second quaternion.
     * @return {Quaternion} A reference to this quaternion.
     */
    multiplyQuaternions(a, b) {
      const qax = a._x, qay = a._y, qaz = a._z, qaw = a._w;
      const qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;
      this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
      this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
      this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
      this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
      this._onChangeCallback();
      return this;
    }
    /**
     * Performs a spherical linear interpolation between quaternions.
     *
     * @param {Quaternion} qb - The target quaternion.
     * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
     * @return {Quaternion} A reference to this quaternion.
     */
    slerp(qb, t) {
      if (t === 0) return this;
      if (t === 1) return this.copy(qb);
      const x = this._x, y = this._y, z = this._z, w = this._w;
      let cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;
      if (cosHalfTheta < 0) {
        this._w = -qb._w;
        this._x = -qb._x;
        this._y = -qb._y;
        this._z = -qb._z;
        cosHalfTheta = -cosHalfTheta;
      } else {
        this.copy(qb);
      }
      if (cosHalfTheta >= 1) {
        this._w = w;
        this._x = x;
        this._y = y;
        this._z = z;
        return this;
      }
      const sqrSinHalfTheta = 1 - cosHalfTheta * cosHalfTheta;
      if (sqrSinHalfTheta <= Number.EPSILON) {
        const s = 1 - t;
        this._w = s * w + t * this._w;
        this._x = s * x + t * this._x;
        this._y = s * y + t * this._y;
        this._z = s * z + t * this._z;
        this.normalize();
        return this;
      }
      const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
      const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
      const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta, ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
      this._w = w * ratioA + this._w * ratioB;
      this._x = x * ratioA + this._x * ratioB;
      this._y = y * ratioA + this._y * ratioB;
      this._z = z * ratioA + this._z * ratioB;
      this._onChangeCallback();
      return this;
    }
    /**
     * Performs a spherical linear interpolation between the given quaternions
     * and stores the result in this quaternion.
     *
     * @param {Quaternion} qa - The source quaternion.
     * @param {Quaternion} qb - The target quaternion.
     * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
     * @return {Quaternion} A reference to this quaternion.
     */
    slerpQuaternions(qa, qb, t) {
      return this.copy(qa).slerp(qb, t);
    }
    /**
     * Sets this quaternion to a uniformly random, normalized quaternion.
     *
     * @return {Quaternion} A reference to this quaternion.
     */
    random() {
      const theta1 = 2 * Math.PI * Math.random();
      const theta2 = 2 * Math.PI * Math.random();
      const x0 = Math.random();
      const r1 = Math.sqrt(1 - x0);
      const r2 = Math.sqrt(x0);
      return this.set(
        r1 * Math.sin(theta1),
        r1 * Math.cos(theta1),
        r2 * Math.sin(theta2),
        r2 * Math.cos(theta2)
      );
    }
    /**
     * Returns `true` if this quaternion is equal with the given one.
     *
     * @param {Quaternion} quaternion - The quaternion to test for equality.
     * @return {boolean} Whether this quaternion is equal with the given one.
     */
    equals(quaternion) {
      return quaternion._x === this._x && quaternion._y === this._y && quaternion._z === this._z && quaternion._w === this._w;
    }
    /**
     * Sets this quaternion's components from the given array.
     *
     * @param {Array<number>} array - An array holding the quaternion component values.
     * @param {number} [offset=0] - The offset into the array.
     * @return {Quaternion} A reference to this quaternion.
     */
    fromArray(array, offset = 0) {
      this._x = array[offset];
      this._y = array[offset + 1];
      this._z = array[offset + 2];
      this._w = array[offset + 3];
      this._onChangeCallback();
      return this;
    }
    /**
     * Writes the components of this quaternion to the given array. If no array is provided,
     * the method returns a new instance.
     *
     * @param {Array<number>} [array=[]] - The target array holding the quaternion components.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Array<number>} The quaternion components.
     */
    toArray(array = [], offset = 0) {
      array[offset] = this._x;
      array[offset + 1] = this._y;
      array[offset + 2] = this._z;
      array[offset + 3] = this._w;
      return array;
    }
    /**
     * Sets the components of this quaternion from the given buffer attribute.
     *
     * @param {BufferAttribute} attribute - The buffer attribute holding quaternion data.
     * @param {number} index - The index into the attribute.
     * @return {Quaternion} A reference to this quaternion.
     */
    fromBufferAttribute(attribute, index) {
      this._x = attribute.getX(index);
      this._y = attribute.getY(index);
      this._z = attribute.getZ(index);
      this._w = attribute.getW(index);
      this._onChangeCallback();
      return this;
    }
    /**
     * This methods defines the serialization result of this class. Returns the
     * numerical elements of this quaternion in an array of format `[x, y, z, w]`.
     *
     * @return {Array<number>} The serialized quaternion.
     */
    toJSON() {
      return this.toArray();
    }
    _onChange(callback) {
      this._onChangeCallback = callback;
      return this;
    }
    _onChangeCallback() {
    }
    *[Symbol.iterator]() {
      yield this._x;
      yield this._y;
      yield this._z;
      yield this._w;
    }
  };
  __name(_Quaternion, "Quaternion");
  var Quaternion = _Quaternion;

  // node_modules/three/src/math/Spherical.js
  var _Spherical = class _Spherical {
    /**
     * Constructs a new spherical.
     *
     * @param {number} [radius=1] - The radius, or the Euclidean distance (straight-line distance) from the point to the origin.
     * @param {number} [phi=0] - The polar angle in radians from the y (up) axis.
     * @param {number} [theta=0] - The equator/azimuthal angle in radians around the y (up) axis.
     */
    constructor(radius = 1, phi = 0, theta = 0) {
      this.radius = radius;
      this.phi = phi;
      this.theta = theta;
    }
    /**
     * Sets the spherical components by copying the given values.
     *
     * @param {number} radius - The radius.
     * @param {number} phi - The polar angle.
     * @param {number} theta - The azimuthal angle.
     * @return {Spherical} A reference to this spherical.
     */
    set(radius, phi, theta) {
      this.radius = radius;
      this.phi = phi;
      this.theta = theta;
      return this;
    }
    /**
     * Copies the values of the given spherical to this instance.
     *
     * @param {Spherical} other - The spherical to copy.
     * @return {Spherical} A reference to this spherical.
     */
    copy(other) {
      this.radius = other.radius;
      this.phi = other.phi;
      this.theta = other.theta;
      return this;
    }
    /**
     * Restricts the polar angle [page:.phi phi] to be between `0.000001` and pi -
     * `0.000001`.
     *
     * @return {Spherical} A reference to this spherical.
     */
    makeSafe() {
      const EPS = 1e-6;
      this.phi = clamp2(this.phi, EPS, Math.PI - EPS);
      return this;
    }
    /**
     * Sets the spherical components from the given vector which is assumed to hold
     * Cartesian coordinates.
     *
     * @param {Vector3} v - The vector to set.
     * @return {Spherical} A reference to this spherical.
     */
    setFromVector3(v) {
      return this.setFromCartesianCoords(v.x, v.y, v.z);
    }
    /**
     * Sets the spherical components from the given Cartesian coordinates.
     *
     * @param {number} x - The x value.
     * @param {number} y - The x value.
     * @param {number} z - The x value.
     * @return {Spherical} A reference to this spherical.
     */
    setFromCartesianCoords(x, y, z) {
      this.radius = Math.sqrt(x * x + y * y + z * z);
      if (this.radius === 0) {
        this.theta = 0;
        this.phi = 0;
      } else {
        this.theta = Math.atan2(x, z);
        this.phi = Math.acos(clamp2(y / this.radius, -1, 1));
      }
      return this;
    }
    /**
     * Returns a new spherical with copied values from this instance.
     *
     * @return {Spherical} A clone of this instance.
     */
    clone() {
      return new this.constructor().copy(this);
    }
  };
  __name(_Spherical, "Spherical");
  var Spherical = _Spherical;

  // node_modules/three/src/math/Vector2.js
  var _Vector2 = class _Vector2 {
    /**
     * Constructs a new 2D vector.
     *
     * @param {number} [x=0] - The x value of this vector.
     * @param {number} [y=0] - The y value of this vector.
     */
    constructor(x = 0, y = 0) {
      _Vector2.prototype.isVector2 = true;
      this.x = x;
      this.y = y;
    }
    /**
     * Alias for {@link Vector2#x}.
     *
     * @type {number}
     */
    get width() {
      return this.x;
    }
    set width(value) {
      this.x = value;
    }
    /**
     * Alias for {@link Vector2#y}.
     *
     * @type {number}
     */
    get height() {
      return this.y;
    }
    set height(value) {
      this.y = value;
    }
    /**
     * Sets the vector components.
     *
     * @param {number} x - The value of the x component.
     * @param {number} y - The value of the y component.
     * @return {Vector2} A reference to this vector.
     */
    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }
    /**
     * Sets the vector components to the same value.
     *
     * @param {number} scalar - The value to set for all vector components.
     * @return {Vector2} A reference to this vector.
     */
    setScalar(scalar) {
      this.x = scalar;
      this.y = scalar;
      return this;
    }
    /**
     * Sets the vector's x component to the given value
     *
     * @param {number} x - The value to set.
     * @return {Vector2} A reference to this vector.
     */
    setX(x) {
      this.x = x;
      return this;
    }
    /**
     * Sets the vector's y component to the given value
     *
     * @param {number} y - The value to set.
     * @return {Vector2} A reference to this vector.
     */
    setY(y) {
      this.y = y;
      return this;
    }
    /**
     * Allows to set a vector component with an index.
     *
     * @param {number} index - The component index. `0` equals to x, `1` equals to y.
     * @param {number} value - The value to set.
     * @return {Vector2} A reference to this vector.
     */
    setComponent(index, value) {
      switch (index) {
        case 0:
          this.x = value;
          break;
        case 1:
          this.y = value;
          break;
        default:
          throw new Error("index is out of range: " + index);
      }
      return this;
    }
    /**
     * Returns the value of the vector component which matches the given index.
     *
     * @param {number} index - The component index. `0` equals to x, `1` equals to y.
     * @return {number} A vector component value.
     */
    getComponent(index) {
      switch (index) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        default:
          throw new Error("index is out of range: " + index);
      }
    }
    /**
     * Returns a new vector with copied values from this instance.
     *
     * @return {Vector2} A clone of this instance.
     */
    clone() {
      return new this.constructor(this.x, this.y);
    }
    /**
     * Copies the values of the given vector to this instance.
     *
     * @param {Vector2} v - The vector to copy.
     * @return {Vector2} A reference to this vector.
     */
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      return this;
    }
    /**
     * Adds the given vector to this instance.
     *
     * @param {Vector2} v - The vector to add.
     * @return {Vector2} A reference to this vector.
     */
    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }
    /**
     * Adds the given scalar value to all components of this instance.
     *
     * @param {number} s - The scalar to add.
     * @return {Vector2} A reference to this vector.
     */
    addScalar(s) {
      this.x += s;
      this.y += s;
      return this;
    }
    /**
     * Adds the given vectors and stores the result in this instance.
     *
     * @param {Vector2} a - The first vector.
     * @param {Vector2} b - The second vector.
     * @return {Vector2} A reference to this vector.
     */
    addVectors(a, b) {
      this.x = a.x + b.x;
      this.y = a.y + b.y;
      return this;
    }
    /**
     * Adds the given vector scaled by the given factor to this instance.
     *
     * @param {Vector2} v - The vector.
     * @param {number} s - The factor that scales `v`.
     * @return {Vector2} A reference to this vector.
     */
    addScaledVector(v, s) {
      this.x += v.x * s;
      this.y += v.y * s;
      return this;
    }
    /**
     * Subtracts the given vector from this instance.
     *
     * @param {Vector2} v - The vector to subtract.
     * @return {Vector2} A reference to this vector.
     */
    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }
    /**
     * Subtracts the given scalar value from all components of this instance.
     *
     * @param {number} s - The scalar to subtract.
     * @return {Vector2} A reference to this vector.
     */
    subScalar(s) {
      this.x -= s;
      this.y -= s;
      return this;
    }
    /**
     * Subtracts the given vectors and stores the result in this instance.
     *
     * @param {Vector2} a - The first vector.
     * @param {Vector2} b - The second vector.
     * @return {Vector2} A reference to this vector.
     */
    subVectors(a, b) {
      this.x = a.x - b.x;
      this.y = a.y - b.y;
      return this;
    }
    /**
     * Multiplies the given vector with this instance.
     *
     * @param {Vector2} v - The vector to multiply.
     * @return {Vector2} A reference to this vector.
     */
    multiply(v) {
      this.x *= v.x;
      this.y *= v.y;
      return this;
    }
    /**
     * Multiplies the given scalar value with all components of this instance.
     *
     * @param {number} scalar - The scalar to multiply.
     * @return {Vector2} A reference to this vector.
     */
    multiplyScalar(scalar) {
      this.x *= scalar;
      this.y *= scalar;
      return this;
    }
    /**
     * Divides this instance by the given vector.
     *
     * @param {Vector2} v - The vector to divide.
     * @return {Vector2} A reference to this vector.
     */
    divide(v) {
      this.x /= v.x;
      this.y /= v.y;
      return this;
    }
    /**
     * Divides this vector by the given scalar.
     *
     * @param {number} scalar - The scalar to divide.
     * @return {Vector2} A reference to this vector.
     */
    divideScalar(scalar) {
      return this.multiplyScalar(1 / scalar);
    }
    /**
     * Multiplies this vector (with an implicit 1 as the 3rd component) by
     * the given 3x3 matrix.
     *
     * @param {Matrix3} m - The matrix to apply.
     * @return {Vector2} A reference to this vector.
     */
    applyMatrix3(m) {
      const x = this.x, y = this.y;
      const e = m.elements;
      this.x = e[0] * x + e[3] * y + e[6];
      this.y = e[1] * x + e[4] * y + e[7];
      return this;
    }
    /**
     * If this vector's x or y value is greater than the given vector's x or y
     * value, replace that value with the corresponding min value.
     *
     * @param {Vector2} v - The vector.
     * @return {Vector2} A reference to this vector.
     */
    min(v) {
      this.x = Math.min(this.x, v.x);
      this.y = Math.min(this.y, v.y);
      return this;
    }
    /**
     * If this vector's x or y value is less than the given vector's x or y
     * value, replace that value with the corresponding max value.
     *
     * @param {Vector2} v - The vector.
     * @return {Vector2} A reference to this vector.
     */
    max(v) {
      this.x = Math.max(this.x, v.x);
      this.y = Math.max(this.y, v.y);
      return this;
    }
    /**
     * If this vector's x or y value is greater than the max vector's x or y
     * value, it is replaced by the corresponding value.
     * If this vector's x or y value is less than the min vector's x or y value,
     * it is replaced by the corresponding value.
     *
     * @param {Vector2} min - The minimum x and y values.
     * @param {Vector2} max - The maximum x and y values in the desired range.
     * @return {Vector2} A reference to this vector.
     */
    clamp(min3, max3) {
      this.x = clamp2(this.x, min3.x, max3.x);
      this.y = clamp2(this.y, min3.y, max3.y);
      return this;
    }
    /**
     * If this vector's x or y values are greater than the max value, they are
     * replaced by the max value.
     * If this vector's x or y values are less than the min value, they are
     * replaced by the min value.
     *
     * @param {number} minVal - The minimum value the components will be clamped to.
     * @param {number} maxVal - The maximum value the components will be clamped to.
     * @return {Vector2} A reference to this vector.
     */
    clampScalar(minVal, maxVal) {
      this.x = clamp2(this.x, minVal, maxVal);
      this.y = clamp2(this.y, minVal, maxVal);
      return this;
    }
    /**
     * If this vector's length is greater than the max value, it is replaced by
     * the max value.
     * If this vector's length is less than the min value, it is replaced by the
     * min value.
     *
     * @param {number} min - The minimum value the vector length will be clamped to.
     * @param {number} max - The maximum value the vector length will be clamped to.
     * @return {Vector2} A reference to this vector.
     */
    clampLength(min3, max3) {
      const length4 = this.length();
      return this.divideScalar(length4 || 1).multiplyScalar(clamp2(length4, min3, max3));
    }
    /**
     * The components of this vector are rounded down to the nearest integer value.
     *
     * @return {Vector2} A reference to this vector.
     */
    floor() {
      this.x = Math.floor(this.x);
      this.y = Math.floor(this.y);
      return this;
    }
    /**
     * The components of this vector are rounded up to the nearest integer value.
     *
     * @return {Vector2} A reference to this vector.
     */
    ceil() {
      this.x = Math.ceil(this.x);
      this.y = Math.ceil(this.y);
      return this;
    }
    /**
     * The components of this vector are rounded to the nearest integer value
     *
     * @return {Vector2} A reference to this vector.
     */
    round() {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      return this;
    }
    /**
     * The components of this vector are rounded towards zero (up if negative,
     * down if positive) to an integer value.
     *
     * @return {Vector2} A reference to this vector.
     */
    roundToZero() {
      this.x = Math.trunc(this.x);
      this.y = Math.trunc(this.y);
      return this;
    }
    /**
     * Inverts this vector - i.e. sets x = -x and y = -y.
     *
     * @return {Vector2} A reference to this vector.
     */
    negate() {
      this.x = -this.x;
      this.y = -this.y;
      return this;
    }
    /**
     * Calculates the dot product of the given vector with this instance.
     *
     * @param {Vector2} v - The vector to compute the dot product with.
     * @return {number} The result of the dot product.
     */
    dot(v) {
      return this.x * v.x + this.y * v.y;
    }
    /**
     * Calculates the cross product of the given vector with this instance.
     *
     * @param {Vector2} v - The vector to compute the cross product with.
     * @return {number} The result of the cross product.
     */
    cross(v) {
      return this.x * v.y - this.y * v.x;
    }
    /**
     * Computes the square of the Euclidean length (straight-line length) from
     * (0, 0) to (x, y). If you are comparing the lengths of vectors, you should
     * compare the length squared instead as it is slightly more efficient to calculate.
     *
     * @return {number} The square length of this vector.
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    /**
     * Computes the  Euclidean length (straight-line length) from (0, 0) to (x, y).
     *
     * @return {number} The length of this vector.
     */
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    /**
     * Computes the Manhattan length of this vector.
     *
     * @return {number} The length of this vector.
     */
    manhattanLength() {
      return Math.abs(this.x) + Math.abs(this.y);
    }
    /**
     * Converts this vector to a unit vector - that is, sets it equal to a vector
     * with the same direction as this one, but with a vector length of `1`.
     *
     * @return {Vector2} A reference to this vector.
     */
    normalize() {
      return this.divideScalar(this.length() || 1);
    }
    /**
     * Computes the angle in radians of this vector with respect to the positive x-axis.
     *
     * @return {number} The angle in radians.
     */
    angle() {
      const angle2 = Math.atan2(-this.y, -this.x) + Math.PI;
      return angle2;
    }
    /**
     * Returns the angle between the given vector and this instance in radians.
     *
     * @param {Vector2} v - The vector to compute the angle with.
     * @return {number} The angle in radians.
     */
    angleTo(v) {
      const denominator = Math.sqrt(this.lengthSq() * v.lengthSq());
      if (denominator === 0) return Math.PI / 2;
      const theta = this.dot(v) / denominator;
      return Math.acos(clamp2(theta, -1, 1));
    }
    /**
     * Computes the distance from the given vector to this instance.
     *
     * @param {Vector2} v - The vector to compute the distance to.
     * @return {number} The distance.
     */
    distanceTo(v) {
      return Math.sqrt(this.distanceToSquared(v));
    }
    /**
     * Computes the squared distance from the given vector to this instance.
     * If you are just comparing the distance with another distance, you should compare
     * the distance squared instead as it is slightly more efficient to calculate.
     *
     * @param {Vector2} v - The vector to compute the squared distance to.
     * @return {number} The squared distance.
     */
    distanceToSquared(v) {
      const dx = this.x - v.x, dy = this.y - v.y;
      return dx * dx + dy * dy;
    }
    /**
     * Computes the Manhattan distance from the given vector to this instance.
     *
     * @param {Vector2} v - The vector to compute the Manhattan distance to.
     * @return {number} The Manhattan distance.
     */
    manhattanDistanceTo(v) {
      return Math.abs(this.x - v.x) + Math.abs(this.y - v.y);
    }
    /**
     * Sets this vector to a vector with the same direction as this one, but
     * with the specified length.
     *
     * @param {number} length - The new length of this vector.
     * @return {Vector2} A reference to this vector.
     */
    setLength(length4) {
      return this.normalize().multiplyScalar(length4);
    }
    /**
     * Linearly interpolates between the given vector and this instance, where
     * alpha is the percent distance along the line - alpha = 0 will be this
     * vector, and alpha = 1 will be the given one.
     *
     * @param {Vector2} v - The vector to interpolate towards.
     * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
     * @return {Vector2} A reference to this vector.
     */
    lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      return this;
    }
    /**
     * Linearly interpolates between the given vectors, where alpha is the percent
     * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
     * be the second one. The result is stored in this instance.
     *
     * @param {Vector2} v1 - The first vector.
     * @param {Vector2} v2 - The second vector.
     * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
     * @return {Vector2} A reference to this vector.
     */
    lerpVectors(v1, v2, alpha) {
      this.x = v1.x + (v2.x - v1.x) * alpha;
      this.y = v1.y + (v2.y - v1.y) * alpha;
      return this;
    }
    /**
     * Returns `true` if this vector is equal with the given one.
     *
     * @param {Vector2} v - The vector to test for equality.
     * @return {boolean} Whether this vector is equal with the given one.
     */
    equals(v) {
      return v.x === this.x && v.y === this.y;
    }
    /**
     * Sets this vector's x value to be `array[ offset ]` and y
     * value to be `array[ offset + 1 ]`.
     *
     * @param {Array<number>} array - An array holding the vector component values.
     * @param {number} [offset=0] - The offset into the array.
     * @return {Vector2} A reference to this vector.
     */
    fromArray(array, offset = 0) {
      this.x = array[offset];
      this.y = array[offset + 1];
      return this;
    }
    /**
     * Writes the components of this vector to the given array. If no array is provided,
     * the method returns a new instance.
     *
     * @param {Array<number>} [array=[]] - The target array holding the vector components.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Array<number>} The vector components.
     */
    toArray(array = [], offset = 0) {
      array[offset] = this.x;
      array[offset + 1] = this.y;
      return array;
    }
    /**
     * Sets the components of this vector from the given buffer attribute.
     *
     * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
     * @param {number} index - The index into the attribute.
     * @return {Vector2} A reference to this vector.
     */
    fromBufferAttribute(attribute, index) {
      this.x = attribute.getX(index);
      this.y = attribute.getY(index);
      return this;
    }
    /**
     * Rotates this vector around the given center by the given angle.
     *
     * @param {Vector2} center - The point around which to rotate.
     * @param {number} angle - The angle to rotate, in radians.
     * @return {Vector2} A reference to this vector.
     */
    rotateAround(center, angle2) {
      const c = Math.cos(angle2), s = Math.sin(angle2);
      const x = this.x - center.x;
      const y = this.y - center.y;
      this.x = x * c - y * s + center.x;
      this.y = x * s + y * c + center.y;
      return this;
    }
    /**
     * Sets each component of this vector to a pseudo-random value between `0` and
     * `1`, excluding `1`.
     *
     * @return {Vector2} A reference to this vector.
     */
    random() {
      this.x = Math.random();
      this.y = Math.random();
      return this;
    }
    *[Symbol.iterator]() {
      yield this.x;
      yield this.y;
    }
  };
  __name(_Vector2, "Vector2");
  var Vector2 = _Vector2;

  // node_modules/three/src/math/Vector3.js
  var _Vector3 = class _Vector3 {
    /**
     * Constructs a new 3D vector.
     *
     * @param {number} [x=0] - The x value of this vector.
     * @param {number} [y=0] - The y value of this vector.
     * @param {number} [z=0] - The z value of this vector.
     */
    constructor(x = 0, y = 0, z = 0) {
      _Vector3.prototype.isVector3 = true;
      this.x = x;
      this.y = y;
      this.z = z;
    }
    /**
     * Sets the vector components.
     *
     * @param {number} x - The value of the x component.
     * @param {number} y - The value of the y component.
     * @param {number} z - The value of the z component.
     * @return {Vector3} A reference to this vector.
     */
    set(x, y, z) {
      if (z === void 0) z = this.z;
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    /**
     * Sets the vector components to the same value.
     *
     * @param {number} scalar - The value to set for all vector components.
     * @return {Vector3} A reference to this vector.
     */
    setScalar(scalar) {
      this.x = scalar;
      this.y = scalar;
      this.z = scalar;
      return this;
    }
    /**
     * Sets the vector's x component to the given value
     *
     * @param {number} x - The value to set.
     * @return {Vector3} A reference to this vector.
     */
    setX(x) {
      this.x = x;
      return this;
    }
    /**
     * Sets the vector's y component to the given value
     *
     * @param {number} y - The value to set.
     * @return {Vector3} A reference to this vector.
     */
    setY(y) {
      this.y = y;
      return this;
    }
    /**
     * Sets the vector's z component to the given value
     *
     * @param {number} z - The value to set.
     * @return {Vector3} A reference to this vector.
     */
    setZ(z) {
      this.z = z;
      return this;
    }
    /**
     * Allows to set a vector component with an index.
     *
     * @param {number} index - The component index. `0` equals to x, `1` equals to y, `2` equals to z.
     * @param {number} value - The value to set.
     * @return {Vector3} A reference to this vector.
     */
    setComponent(index, value) {
      switch (index) {
        case 0:
          this.x = value;
          break;
        case 1:
          this.y = value;
          break;
        case 2:
          this.z = value;
          break;
        default:
          throw new Error("index is out of range: " + index);
      }
      return this;
    }
    /**
     * Returns the value of the vector component which matches the given index.
     *
     * @param {number} index - The component index. `0` equals to x, `1` equals to y, `2` equals to z.
     * @return {number} A vector component value.
     */
    getComponent(index) {
      switch (index) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        case 2:
          return this.z;
        default:
          throw new Error("index is out of range: " + index);
      }
    }
    /**
     * Returns a new vector with copied values from this instance.
     *
     * @return {Vector3} A clone of this instance.
     */
    clone() {
      return new this.constructor(this.x, this.y, this.z);
    }
    /**
     * Copies the values of the given vector to this instance.
     *
     * @param {Vector3} v - The vector to copy.
     * @return {Vector3} A reference to this vector.
     */
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
    /**
     * Adds the given vector to this instance.
     *
     * @param {Vector3} v - The vector to add.
     * @return {Vector3} A reference to this vector.
     */
    add(v) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    /**
     * Adds the given scalar value to all components of this instance.
     *
     * @param {number} s - The scalar to add.
     * @return {Vector3} A reference to this vector.
     */
    addScalar(s) {
      this.x += s;
      this.y += s;
      this.z += s;
      return this;
    }
    /**
     * Adds the given vectors and stores the result in this instance.
     *
     * @param {Vector3} a - The first vector.
     * @param {Vector3} b - The second vector.
     * @return {Vector3} A reference to this vector.
     */
    addVectors(a, b) {
      this.x = a.x + b.x;
      this.y = a.y + b.y;
      this.z = a.z + b.z;
      return this;
    }
    /**
     * Adds the given vector scaled by the given factor to this instance.
     *
     * @param {Vector3|Vector4} v - The vector.
     * @param {number} s - The factor that scales `v`.
     * @return {Vector3} A reference to this vector.
     */
    addScaledVector(v, s) {
      this.x += v.x * s;
      this.y += v.y * s;
      this.z += v.z * s;
      return this;
    }
    /**
     * Subtracts the given vector from this instance.
     *
     * @param {Vector3} v - The vector to subtract.
     * @return {Vector3} A reference to this vector.
     */
    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
    /**
     * Subtracts the given scalar value from all components of this instance.
     *
     * @param {number} s - The scalar to subtract.
     * @return {Vector3} A reference to this vector.
     */
    subScalar(s) {
      this.x -= s;
      this.y -= s;
      this.z -= s;
      return this;
    }
    /**
     * Subtracts the given vectors and stores the result in this instance.
     *
     * @param {Vector3} a - The first vector.
     * @param {Vector3} b - The second vector.
     * @return {Vector3} A reference to this vector.
     */
    subVectors(a, b) {
      this.x = a.x - b.x;
      this.y = a.y - b.y;
      this.z = a.z - b.z;
      return this;
    }
    /**
     * Multiplies the given vector with this instance.
     *
     * @param {Vector3} v - The vector to multiply.
     * @return {Vector3} A reference to this vector.
     */
    multiply(v) {
      this.x *= v.x;
      this.y *= v.y;
      this.z *= v.z;
      return this;
    }
    /**
     * Multiplies the given scalar value with all components of this instance.
     *
     * @param {number} scalar - The scalar to multiply.
     * @return {Vector3} A reference to this vector.
     */
    multiplyScalar(scalar) {
      this.x *= scalar;
      this.y *= scalar;
      this.z *= scalar;
      return this;
    }
    /**
     * Multiplies the given vectors and stores the result in this instance.
     *
     * @param {Vector3} a - The first vector.
     * @param {Vector3} b - The second vector.
     * @return {Vector3} A reference to this vector.
     */
    multiplyVectors(a, b) {
      this.x = a.x * b.x;
      this.y = a.y * b.y;
      this.z = a.z * b.z;
      return this;
    }
    /**
     * Applies the given Euler rotation to this vector.
     *
     * @param {Euler} euler - The Euler angles.
     * @return {Vector3} A reference to this vector.
     */
    applyEuler(euler) {
      return this.applyQuaternion(_quaternion.setFromEuler(euler));
    }
    /**
     * Applies a rotation specified by an axis and an angle to this vector.
     *
     * @param {Vector3} axis - A normalized vector representing the rotation axis.
     * @param {number} angle - The angle in radians.
     * @return {Vector3} A reference to this vector.
     */
    applyAxisAngle(axis, angle2) {
      return this.applyQuaternion(_quaternion.setFromAxisAngle(axis, angle2));
    }
    /**
     * Multiplies this vector with the given 3x3 matrix.
     *
     * @param {Matrix3} m - The 3x3 matrix.
     * @return {Vector3} A reference to this vector.
     */
    applyMatrix3(m) {
      const x = this.x, y = this.y, z = this.z;
      const e = m.elements;
      this.x = e[0] * x + e[3] * y + e[6] * z;
      this.y = e[1] * x + e[4] * y + e[7] * z;
      this.z = e[2] * x + e[5] * y + e[8] * z;
      return this;
    }
    /**
     * Multiplies this vector by the given normal matrix and normalizes
     * the result.
     *
     * @param {Matrix3} m - The normal matrix.
     * @return {Vector3} A reference to this vector.
     */
    applyNormalMatrix(m) {
      return this.applyMatrix3(m).normalize();
    }
    /**
     * Multiplies this vector (with an implicit 1 in the 4th dimension) by m, and
     * divides by perspective.
     *
     * @param {Matrix4} m - The matrix to apply.
     * @return {Vector3} A reference to this vector.
     */
    applyMatrix4(m) {
      const x = this.x, y = this.y, z = this.z;
      const e = m.elements;
      const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
      this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
      this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
      this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
      return this;
    }
    /**
     * Applies the given Quaternion to this vector.
     *
     * @param {Quaternion} q - The Quaternion.
     * @return {Vector3} A reference to this vector.
     */
    applyQuaternion(q) {
      const vx = this.x, vy = this.y, vz = this.z;
      const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
      const tx = 2 * (qy * vz - qz * vy);
      const ty = 2 * (qz * vx - qx * vz);
      const tz = 2 * (qx * vy - qy * vx);
      this.x = vx + qw * tx + qy * tz - qz * ty;
      this.y = vy + qw * ty + qz * tx - qx * tz;
      this.z = vz + qw * tz + qx * ty - qy * tx;
      return this;
    }
    /**
     * Projects this vector from world space into the camera's normalized
     * device coordinate (NDC) space.
     *
     * @param {Camera} camera - The camera.
     * @return {Vector3} A reference to this vector.
     */
    project(camera) {
      return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    }
    /**
     * Unprojects this vector from the camera's normalized device coordinate (NDC)
     * space into world space.
     *
     * @param {Camera} camera - The camera.
     * @return {Vector3} A reference to this vector.
     */
    unproject(camera) {
      return this.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
    }
    /**
     * Transforms the direction of this vector by a matrix (the upper left 3 x 3
     * subset of the given 4x4 matrix and then normalizes the result.
     *
     * @param {Matrix4} m - The matrix.
     * @return {Vector3} A reference to this vector.
     */
    transformDirection(m) {
      const x = this.x, y = this.y, z = this.z;
      const e = m.elements;
      this.x = e[0] * x + e[4] * y + e[8] * z;
      this.y = e[1] * x + e[5] * y + e[9] * z;
      this.z = e[2] * x + e[6] * y + e[10] * z;
      return this.normalize();
    }
    /**
     * Divides this instance by the given vector.
     *
     * @param {Vector3} v - The vector to divide.
     * @return {Vector3} A reference to this vector.
     */
    divide(v) {
      this.x /= v.x;
      this.y /= v.y;
      this.z /= v.z;
      return this;
    }
    /**
     * Divides this vector by the given scalar.
     *
     * @param {number} scalar - The scalar to divide.
     * @return {Vector3} A reference to this vector.
     */
    divideScalar(scalar) {
      return this.multiplyScalar(1 / scalar);
    }
    /**
     * If this vector's x, y or z value is greater than the given vector's x, y or z
     * value, replace that value with the corresponding min value.
     *
     * @param {Vector3} v - The vector.
     * @return {Vector3} A reference to this vector.
     */
    min(v) {
      this.x = Math.min(this.x, v.x);
      this.y = Math.min(this.y, v.y);
      this.z = Math.min(this.z, v.z);
      return this;
    }
    /**
     * If this vector's x, y or z value is less than the given vector's x, y or z
     * value, replace that value with the corresponding max value.
     *
     * @param {Vector3} v - The vector.
     * @return {Vector3} A reference to this vector.
     */
    max(v) {
      this.x = Math.max(this.x, v.x);
      this.y = Math.max(this.y, v.y);
      this.z = Math.max(this.z, v.z);
      return this;
    }
    /**
     * If this vector's x, y or z value is greater than the max vector's x, y or z
     * value, it is replaced by the corresponding value.
     * If this vector's x, y or z value is less than the min vector's x, y or z value,
     * it is replaced by the corresponding value.
     *
     * @param {Vector3} min - The minimum x, y and z values.
     * @param {Vector3} max - The maximum x, y and z values in the desired range.
     * @return {Vector3} A reference to this vector.
     */
    clamp(min3, max3) {
      this.x = clamp2(this.x, min3.x, max3.x);
      this.y = clamp2(this.y, min3.y, max3.y);
      this.z = clamp2(this.z, min3.z, max3.z);
      return this;
    }
    /**
     * If this vector's x, y or z values are greater than the max value, they are
     * replaced by the max value.
     * If this vector's x, y or z values are less than the min value, they are
     * replaced by the min value.
     *
     * @param {number} minVal - The minimum value the components will be clamped to.
     * @param {number} maxVal - The maximum value the components will be clamped to.
     * @return {Vector3} A reference to this vector.
     */
    clampScalar(minVal, maxVal) {
      this.x = clamp2(this.x, minVal, maxVal);
      this.y = clamp2(this.y, minVal, maxVal);
      this.z = clamp2(this.z, minVal, maxVal);
      return this;
    }
    /**
     * If this vector's length is greater than the max value, it is replaced by
     * the max value.
     * If this vector's length is less than the min value, it is replaced by the
     * min value.
     *
     * @param {number} min - The minimum value the vector length will be clamped to.
     * @param {number} max - The maximum value the vector length will be clamped to.
     * @return {Vector3} A reference to this vector.
     */
    clampLength(min3, max3) {
      const length4 = this.length();
      return this.divideScalar(length4 || 1).multiplyScalar(clamp2(length4, min3, max3));
    }
    /**
     * The components of this vector are rounded down to the nearest integer value.
     *
     * @return {Vector3} A reference to this vector.
     */
    floor() {
      this.x = Math.floor(this.x);
      this.y = Math.floor(this.y);
      this.z = Math.floor(this.z);
      return this;
    }
    /**
     * The components of this vector are rounded up to the nearest integer value.
     *
     * @return {Vector3} A reference to this vector.
     */
    ceil() {
      this.x = Math.ceil(this.x);
      this.y = Math.ceil(this.y);
      this.z = Math.ceil(this.z);
      return this;
    }
    /**
     * The components of this vector are rounded to the nearest integer value
     *
     * @return {Vector3} A reference to this vector.
     */
    round() {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      this.z = Math.round(this.z);
      return this;
    }
    /**
     * The components of this vector are rounded towards zero (up if negative,
     * down if positive) to an integer value.
     *
     * @return {Vector3} A reference to this vector.
     */
    roundToZero() {
      this.x = Math.trunc(this.x);
      this.y = Math.trunc(this.y);
      this.z = Math.trunc(this.z);
      return this;
    }
    /**
     * Inverts this vector - i.e. sets x = -x, y = -y and z = -z.
     *
     * @return {Vector3} A reference to this vector.
     */
    negate() {
      this.x = -this.x;
      this.y = -this.y;
      this.z = -this.z;
      return this;
    }
    /**
     * Calculates the dot product of the given vector with this instance.
     *
     * @param {Vector3} v - The vector to compute the dot product with.
     * @return {number} The result of the dot product.
     */
    dot(v) {
      return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    // TODO lengthSquared?
    /**
     * Computes the square of the Euclidean length (straight-line length) from
     * (0, 0, 0) to (x, y, z). If you are comparing the lengths of vectors, you should
     * compare the length squared instead as it is slightly more efficient to calculate.
     *
     * @return {number} The square length of this vector.
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    /**
     * Computes the  Euclidean length (straight-line length) from (0, 0, 0) to (x, y, z).
     *
     * @return {number} The length of this vector.
     */
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    /**
     * Computes the Manhattan length of this vector.
     *
     * @return {number} The length of this vector.
     */
    manhattanLength() {
      return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
    }
    /**
     * Converts this vector to a unit vector - that is, sets it equal to a vector
     * with the same direction as this one, but with a vector length of `1`.
     *
     * @return {Vector3} A reference to this vector.
     */
    normalize() {
      return this.divideScalar(this.length() || 1);
    }
    /**
     * Sets this vector to a vector with the same direction as this one, but
     * with the specified length.
     *
     * @param {number} length - The new length of this vector.
     * @return {Vector3} A reference to this vector.
     */
    setLength(length4) {
      return this.normalize().multiplyScalar(length4);
    }
    /**
     * Linearly interpolates between the given vector and this instance, where
     * alpha is the percent distance along the line - alpha = 0 will be this
     * vector, and alpha = 1 will be the given one.
     *
     * @param {Vector3} v - The vector to interpolate towards.
     * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
     * @return {Vector3} A reference to this vector.
     */
    lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    }
    /**
     * Linearly interpolates between the given vectors, where alpha is the percent
     * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
     * be the second one. The result is stored in this instance.
     *
     * @param {Vector3} v1 - The first vector.
     * @param {Vector3} v2 - The second vector.
     * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
     * @return {Vector3} A reference to this vector.
     */
    lerpVectors(v1, v2, alpha) {
      this.x = v1.x + (v2.x - v1.x) * alpha;
      this.y = v1.y + (v2.y - v1.y) * alpha;
      this.z = v1.z + (v2.z - v1.z) * alpha;
      return this;
    }
    /**
     * Calculates the cross product of the given vector with this instance.
     *
     * @param {Vector3} v - The vector to compute the cross product with.
     * @return {Vector3} The result of the cross product.
     */
    cross(v) {
      return this.crossVectors(this, v);
    }
    /**
     * Calculates the cross product of the given vectors and stores the result
     * in this instance.
     *
     * @param {Vector3} a - The first vector.
     * @param {Vector3} b - The second vector.
     * @return {Vector3} A reference to this vector.
     */
    crossVectors(a, b) {
      const ax = a.x, ay = a.y, az = a.z;
      const bx = b.x, by = b.y, bz = b.z;
      this.x = ay * bz - az * by;
      this.y = az * bx - ax * bz;
      this.z = ax * by - ay * bx;
      return this;
    }
    /**
     * Projects this vector onto the given one.
     *
     * @param {Vector3} v - The vector to project to.
     * @return {Vector3} A reference to this vector.
     */
    projectOnVector(v) {
      const denominator = v.lengthSq();
      if (denominator === 0) return this.set(0, 0, 0);
      const scalar = v.dot(this) / denominator;
      return this.copy(v).multiplyScalar(scalar);
    }
    /**
     * Projects this vector onto a plane by subtracting this
     * vector projected onto the plane's normal from this vector.
     *
     * @param {Vector3} planeNormal - The plane normal.
     * @return {Vector3} A reference to this vector.
     */
    projectOnPlane(planeNormal) {
      _vector.copy(this).projectOnVector(planeNormal);
      return this.sub(_vector);
    }
    /**
     * Reflects this vector off a plane orthogonal to the given normal vector.
     *
     * @param {Vector3} normal - The (normalized) normal vector.
     * @return {Vector3} A reference to this vector.
     */
    reflect(normal) {
      return this.sub(_vector.copy(normal).multiplyScalar(2 * this.dot(normal)));
    }
    /**
     * Returns the angle between the given vector and this instance in radians.
     *
     * @param {Vector3} v - The vector to compute the angle with.
     * @return {number} The angle in radians.
     */
    angleTo(v) {
      const denominator = Math.sqrt(this.lengthSq() * v.lengthSq());
      if (denominator === 0) return Math.PI / 2;
      const theta = this.dot(v) / denominator;
      return Math.acos(clamp2(theta, -1, 1));
    }
    /**
     * Computes the distance from the given vector to this instance.
     *
     * @param {Vector3} v - The vector to compute the distance to.
     * @return {number} The distance.
     */
    distanceTo(v) {
      return Math.sqrt(this.distanceToSquared(v));
    }
    /**
     * Computes the squared distance from the given vector to this instance.
     * If you are just comparing the distance with another distance, you should compare
     * the distance squared instead as it is slightly more efficient to calculate.
     *
     * @param {Vector3} v - The vector to compute the squared distance to.
     * @return {number} The squared distance.
     */
    distanceToSquared(v) {
      const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
      return dx * dx + dy * dy + dz * dz;
    }
    /**
     * Computes the Manhattan distance from the given vector to this instance.
     *
     * @param {Vector3} v - The vector to compute the Manhattan distance to.
     * @return {number} The Manhattan distance.
     */
    manhattanDistanceTo(v) {
      return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z);
    }
    /**
     * Sets the vector components from the given spherical coordinates.
     *
     * @param {Spherical} s - The spherical coordinates.
     * @return {Vector3} A reference to this vector.
     */
    setFromSpherical(s) {
      return this.setFromSphericalCoords(s.radius, s.phi, s.theta);
    }
    /**
     * Sets the vector components from the given spherical coordinates.
     *
     * @param {number} radius - The radius.
     * @param {number} phi - The phi angle in radians.
     * @param {number} theta - The theta angle in radians.
     * @return {Vector3} A reference to this vector.
     */
    setFromSphericalCoords(radius, phi, theta) {
      const sinPhiRadius = Math.sin(phi) * radius;
      this.x = sinPhiRadius * Math.sin(theta);
      this.y = Math.cos(phi) * radius;
      this.z = sinPhiRadius * Math.cos(theta);
      return this;
    }
    /**
     * Sets the vector components from the given cylindrical coordinates.
     *
     * @param {Cylindrical} c - The cylindrical coordinates.
     * @return {Vector3} A reference to this vector.
     */
    setFromCylindrical(c) {
      return this.setFromCylindricalCoords(c.radius, c.theta, c.y);
    }
    /**
     * Sets the vector components from the given cylindrical coordinates.
     *
     * @param {number} radius - The radius.
     * @param {number} theta - The theta angle in radians.
     * @param {number} y - The y value.
     * @return {Vector3} A reference to this vector.
     */
    setFromCylindricalCoords(radius, theta, y) {
      this.x = radius * Math.sin(theta);
      this.y = y;
      this.z = radius * Math.cos(theta);
      return this;
    }
    /**
     * Sets the vector components to the position elements of the
     * given transformation matrix.
     *
     * @param {Matrix4} m - The 4x4 matrix.
     * @return {Vector3} A reference to this vector.
     */
    setFromMatrixPosition(m) {
      const e = m.elements;
      this.x = e[12];
      this.y = e[13];
      this.z = e[14];
      return this;
    }
    /**
     * Sets the vector components to the scale elements of the
     * given transformation matrix.
     *
     * @param {Matrix4} m - The 4x4 matrix.
     * @return {Vector3} A reference to this vector.
     */
    setFromMatrixScale(m) {
      const sx = this.setFromMatrixColumn(m, 0).length();
      const sy = this.setFromMatrixColumn(m, 1).length();
      const sz = this.setFromMatrixColumn(m, 2).length();
      this.x = sx;
      this.y = sy;
      this.z = sz;
      return this;
    }
    /**
     * Sets the vector components from the specified matrix column.
     *
     * @param {Matrix4} m - The 4x4 matrix.
     * @param {number} index - The column index.
     * @return {Vector3} A reference to this vector.
     */
    setFromMatrixColumn(m, index) {
      return this.fromArray(m.elements, index * 4);
    }
    /**
     * Sets the vector components from the specified matrix column.
     *
     * @param {Matrix3} m - The 3x3 matrix.
     * @param {number} index - The column index.
     * @return {Vector3} A reference to this vector.
     */
    setFromMatrix3Column(m, index) {
      return this.fromArray(m.elements, index * 3);
    }
    /**
     * Sets the vector components from the given Euler angles.
     *
     * @param {Euler} e - The Euler angles to set.
     * @return {Vector3} A reference to this vector.
     */
    setFromEuler(e) {
      this.x = e._x;
      this.y = e._y;
      this.z = e._z;
      return this;
    }
    /**
     * Sets the vector components from the RGB components of the
     * given color.
     *
     * @param {Color} c - The color to set.
     * @return {Vector3} A reference to this vector.
     */
    setFromColor(c) {
      this.x = c.r;
      this.y = c.g;
      this.z = c.b;
      return this;
    }
    /**
     * Returns `true` if this vector is equal with the given one.
     *
     * @param {Vector3} v - The vector to test for equality.
     * @return {boolean} Whether this vector is equal with the given one.
     */
    equals(v) {
      return v.x === this.x && v.y === this.y && v.z === this.z;
    }
    /**
     * Sets this vector's x value to be `array[ offset ]`, y value to be `array[ offset + 1 ]`
     * and z value to be `array[ offset + 2 ]`.
     *
     * @param {Array<number>} array - An array holding the vector component values.
     * @param {number} [offset=0] - The offset into the array.
     * @return {Vector3} A reference to this vector.
     */
    fromArray(array, offset = 0) {
      this.x = array[offset];
      this.y = array[offset + 1];
      this.z = array[offset + 2];
      return this;
    }
    /**
     * Writes the components of this vector to the given array. If no array is provided,
     * the method returns a new instance.
     *
     * @param {Array<number>} [array=[]] - The target array holding the vector components.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Array<number>} The vector components.
     */
    toArray(array = [], offset = 0) {
      array[offset] = this.x;
      array[offset + 1] = this.y;
      array[offset + 2] = this.z;
      return array;
    }
    /**
     * Sets the components of this vector from the given buffer attribute.
     *
     * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
     * @param {number} index - The index into the attribute.
     * @return {Vector3} A reference to this vector.
     */
    fromBufferAttribute(attribute, index) {
      this.x = attribute.getX(index);
      this.y = attribute.getY(index);
      this.z = attribute.getZ(index);
      return this;
    }
    /**
     * Sets each component of this vector to a pseudo-random value between `0` and
     * `1`, excluding `1`.
     *
     * @return {Vector3} A reference to this vector.
     */
    random() {
      this.x = Math.random();
      this.y = Math.random();
      this.z = Math.random();
      return this;
    }
    /**
     * Sets this vector to a uniformly random point on a unit sphere.
     *
     * @return {Vector3} A reference to this vector.
     */
    randomDirection() {
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const c = Math.sqrt(1 - u * u);
      this.x = c * Math.cos(theta);
      this.y = u;
      this.z = c * Math.sin(theta);
      return this;
    }
    *[Symbol.iterator]() {
      yield this.x;
      yield this.y;
      yield this.z;
    }
  };
  __name(_Vector3, "Vector3");
  var Vector3 = _Vector3;
  var _vector = /* @__PURE__ */ new Vector3();
  var _quaternion = /* @__PURE__ */ new Quaternion();

  // node_modules/three/src/math/Matrix3.js
  var _Matrix3 = class _Matrix3 {
    /**
     * Constructs a new 3x3 matrix. The arguments are supposed to be
     * in row-major order. If no arguments are provided, the constructor
     * initializes the matrix as an identity matrix.
     *
     * @param {number} [n11] - 1-1 matrix element.
     * @param {number} [n12] - 1-2 matrix element.
     * @param {number} [n13] - 1-3 matrix element.
     * @param {number} [n21] - 2-1 matrix element.
     * @param {number} [n22] - 2-2 matrix element.
     * @param {number} [n23] - 2-3 matrix element.
     * @param {number} [n31] - 3-1 matrix element.
     * @param {number} [n32] - 3-2 matrix element.
     * @param {number} [n33] - 3-3 matrix element.
     */
    constructor(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
      _Matrix3.prototype.isMatrix3 = true;
      this.elements = [
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1
      ];
      if (n11 !== void 0) {
        this.set(n11, n12, n13, n21, n22, n23, n31, n32, n33);
      }
    }
    /**
     * Sets the elements of the matrix.The arguments are supposed to be
     * in row-major order.
     *
     * @param {number} [n11] - 1-1 matrix element.
     * @param {number} [n12] - 1-2 matrix element.
     * @param {number} [n13] - 1-3 matrix element.
     * @param {number} [n21] - 2-1 matrix element.
     * @param {number} [n22] - 2-2 matrix element.
     * @param {number} [n23] - 2-3 matrix element.
     * @param {number} [n31] - 3-1 matrix element.
     * @param {number} [n32] - 3-2 matrix element.
     * @param {number} [n33] - 3-3 matrix element.
     * @return {Matrix3} A reference to this matrix.
     */
    set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
      const te = this.elements;
      te[0] = n11;
      te[1] = n21;
      te[2] = n31;
      te[3] = n12;
      te[4] = n22;
      te[5] = n32;
      te[6] = n13;
      te[7] = n23;
      te[8] = n33;
      return this;
    }
    /**
     * Sets this matrix to the 3x3 identity matrix.
     *
     * @return {Matrix3} A reference to this matrix.
     */
    identity() {
      this.set(
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Copies the values of the given matrix to this instance.
     *
     * @param {Matrix3} m - The matrix to copy.
     * @return {Matrix3} A reference to this matrix.
     */
    copy(m) {
      const te = this.elements;
      const me = m.elements;
      te[0] = me[0];
      te[1] = me[1];
      te[2] = me[2];
      te[3] = me[3];
      te[4] = me[4];
      te[5] = me[5];
      te[6] = me[6];
      te[7] = me[7];
      te[8] = me[8];
      return this;
    }
    /**
     * Extracts the basis of this matrix into the three axis vectors provided.
     *
     * @param {Vector3} xAxis - The basis's x axis.
     * @param {Vector3} yAxis - The basis's y axis.
     * @param {Vector3} zAxis - The basis's z axis.
     * @return {Matrix3} A reference to this matrix.
     */
    extractBasis(xAxis, yAxis, zAxis) {
      xAxis.setFromMatrix3Column(this, 0);
      yAxis.setFromMatrix3Column(this, 1);
      zAxis.setFromMatrix3Column(this, 2);
      return this;
    }
    /**
     * Set this matrix to the upper 3x3 matrix of the given 4x4 matrix.
     *
     * @param {Matrix4} m - The 4x4 matrix.
     * @return {Matrix3} A reference to this matrix.
     */
    setFromMatrix4(m) {
      const me = m.elements;
      this.set(
        me[0],
        me[4],
        me[8],
        me[1],
        me[5],
        me[9],
        me[2],
        me[6],
        me[10]
      );
      return this;
    }
    /**
     * Post-multiplies this matrix by the given 3x3 matrix.
     *
     * @param {Matrix3} m - The matrix to multiply with.
     * @return {Matrix3} A reference to this matrix.
     */
    multiply(m) {
      return this.multiplyMatrices(this, m);
    }
    /**
     * Pre-multiplies this matrix by the given 3x3 matrix.
     *
     * @param {Matrix3} m - The matrix to multiply with.
     * @return {Matrix3} A reference to this matrix.
     */
    premultiply(m) {
      return this.multiplyMatrices(m, this);
    }
    /**
     * Multiples the given 3x3 matrices and stores the result
     * in this matrix.
     *
     * @param {Matrix3} a - The first matrix.
     * @param {Matrix3} b - The second matrix.
     * @return {Matrix3} A reference to this matrix.
     */
    multiplyMatrices(a, b) {
      const ae = a.elements;
      const be = b.elements;
      const te = this.elements;
      const a11 = ae[0], a12 = ae[3], a13 = ae[6];
      const a21 = ae[1], a22 = ae[4], a23 = ae[7];
      const a31 = ae[2], a32 = ae[5], a33 = ae[8];
      const b11 = be[0], b12 = be[3], b13 = be[6];
      const b21 = be[1], b22 = be[4], b23 = be[7];
      const b31 = be[2], b32 = be[5], b33 = be[8];
      te[0] = a11 * b11 + a12 * b21 + a13 * b31;
      te[3] = a11 * b12 + a12 * b22 + a13 * b32;
      te[6] = a11 * b13 + a12 * b23 + a13 * b33;
      te[1] = a21 * b11 + a22 * b21 + a23 * b31;
      te[4] = a21 * b12 + a22 * b22 + a23 * b32;
      te[7] = a21 * b13 + a22 * b23 + a23 * b33;
      te[2] = a31 * b11 + a32 * b21 + a33 * b31;
      te[5] = a31 * b12 + a32 * b22 + a33 * b32;
      te[8] = a31 * b13 + a32 * b23 + a33 * b33;
      return this;
    }
    /**
     * Multiplies every component of the matrix by the given scalar.
     *
     * @param {number} s - The scalar.
     * @return {Matrix3} A reference to this matrix.
     */
    multiplyScalar(s) {
      const te = this.elements;
      te[0] *= s;
      te[3] *= s;
      te[6] *= s;
      te[1] *= s;
      te[4] *= s;
      te[7] *= s;
      te[2] *= s;
      te[5] *= s;
      te[8] *= s;
      return this;
    }
    /**
     * Computes and returns the determinant of this matrix.
     *
     * @return {number} The determinant.
     */
    determinant() {
      const te = this.elements;
      const a = te[0], b = te[1], c = te[2], d = te[3], e = te[4], f = te[5], g = te[6], h = te[7], i = te[8];
      return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;
    }
    /**
     * Inverts this matrix, using the [analytic method]{@link https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution}.
     * You can not invert with a determinant of zero. If you attempt this, the method produces
     * a zero matrix instead.
     *
     * @return {Matrix3} A reference to this matrix.
     */
    invert() {
      const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n12 = te[3], n22 = te[4], n32 = te[5], n13 = te[6], n23 = te[7], n33 = te[8], t11 = n33 * n22 - n32 * n23, t12 = n32 * n13 - n33 * n12, t13 = n23 * n12 - n22 * n13, det = n11 * t11 + n21 * t12 + n31 * t13;
      if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
      const detInv = 1 / det;
      te[0] = t11 * detInv;
      te[1] = (n31 * n23 - n33 * n21) * detInv;
      te[2] = (n32 * n21 - n31 * n22) * detInv;
      te[3] = t12 * detInv;
      te[4] = (n33 * n11 - n31 * n13) * detInv;
      te[5] = (n31 * n12 - n32 * n11) * detInv;
      te[6] = t13 * detInv;
      te[7] = (n21 * n13 - n23 * n11) * detInv;
      te[8] = (n22 * n11 - n21 * n12) * detInv;
      return this;
    }
    /**
     * Transposes this matrix in place.
     *
     * @return {Matrix3} A reference to this matrix.
     */
    transpose() {
      let tmp;
      const m = this.elements;
      tmp = m[1];
      m[1] = m[3];
      m[3] = tmp;
      tmp = m[2];
      m[2] = m[6];
      m[6] = tmp;
      tmp = m[5];
      m[5] = m[7];
      m[7] = tmp;
      return this;
    }
    /**
     * Computes the normal matrix which is the inverse transpose of the upper
     * left 3x3 portion of the given 4x4 matrix.
     *
     * @param {Matrix4} matrix4 - The 4x4 matrix.
     * @return {Matrix3} A reference to this matrix.
     */
    getNormalMatrix(matrix4) {
      return this.setFromMatrix4(matrix4).invert().transpose();
    }
    /**
     * Transposes this matrix into the supplied array, and returns itself unchanged.
     *
     * @param {Array<number>} r - An array to store the transposed matrix elements.
     * @return {Matrix3} A reference to this matrix.
     */
    transposeIntoArray(r) {
      const m = this.elements;
      r[0] = m[0];
      r[1] = m[3];
      r[2] = m[6];
      r[3] = m[1];
      r[4] = m[4];
      r[5] = m[7];
      r[6] = m[2];
      r[7] = m[5];
      r[8] = m[8];
      return this;
    }
    /**
     * Sets the UV transform matrix from offset, repeat, rotation, and center.
     *
     * @param {number} tx - Offset x.
     * @param {number} ty - Offset y.
     * @param {number} sx - Repeat x.
     * @param {number} sy - Repeat y.
     * @param {number} rotation - Rotation, in radians. Positive values rotate counterclockwise.
     * @param {number} cx - Center x of rotation.
     * @param {number} cy - Center y of rotation
     * @return {Matrix3} A reference to this matrix.
     */
    setUvTransform(tx, ty, sx, sy, rotation, cx, cy) {
      const c = Math.cos(rotation);
      const s = Math.sin(rotation);
      this.set(
        sx * c,
        sx * s,
        -sx * (c * cx + s * cy) + cx + tx,
        -sy * s,
        sy * c,
        -sy * (-s * cx + c * cy) + cy + ty,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Scales this matrix with the given scalar values.
     *
     * @param {number} sx - The amount to scale in the X axis.
     * @param {number} sy - The amount to scale in the Y axis.
     * @return {Matrix3} A reference to this matrix.
     */
    scale(sx, sy) {
      this.premultiply(_m3.makeScale(sx, sy));
      return this;
    }
    /**
     * Rotates this matrix by the given angle.
     *
     * @param {number} theta - The rotation in radians.
     * @return {Matrix3} A reference to this matrix.
     */
    rotate(theta) {
      this.premultiply(_m3.makeRotation(-theta));
      return this;
    }
    /**
     * Translates this matrix by the given scalar values.
     *
     * @param {number} tx - The amount to translate in the X axis.
     * @param {number} ty - The amount to translate in the Y axis.
     * @return {Matrix3} A reference to this matrix.
     */
    translate(tx, ty) {
      this.premultiply(_m3.makeTranslation(tx, ty));
      return this;
    }
    // for 2D Transforms
    /**
     * Sets this matrix as a 2D translation transform.
     *
     * @param {number|Vector2} x - The amount to translate in the X axis or alternatively a translation vector.
     * @param {number} y - The amount to translate in the Y axis.
     * @return {Matrix3} A reference to this matrix.
     */
    makeTranslation(x, y) {
      if (x.isVector2) {
        this.set(
          1,
          0,
          x.x,
          0,
          1,
          x.y,
          0,
          0,
          1
        );
      } else {
        this.set(
          1,
          0,
          x,
          0,
          1,
          y,
          0,
          0,
          1
        );
      }
      return this;
    }
    /**
     * Sets this matrix as a 2D rotational transformation.
     *
     * @param {number} theta - The rotation in radians.
     * @return {Matrix3} A reference to this matrix.
     */
    makeRotation(theta) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      this.set(
        c,
        -s,
        0,
        s,
        c,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets this matrix as a 2D scale transform.
     *
     * @param {number} x - The amount to scale in the X axis.
     * @param {number} y - The amount to scale in the Y axis.
     * @return {Matrix3} A reference to this matrix.
     */
    makeScale(x, y) {
      this.set(
        x,
        0,
        0,
        0,
        y,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Returns `true` if this matrix is equal with the given one.
     *
     * @param {Matrix3} matrix - The matrix to test for equality.
     * @return {boolean} Whether this matrix is equal with the given one.
     */
    equals(matrix) {
      const te = this.elements;
      const me = matrix.elements;
      for (let i = 0; i < 9; i++) {
        if (te[i] !== me[i]) return false;
      }
      return true;
    }
    /**
     * Sets the elements of the matrix from the given array.
     *
     * @param {Array<number>} array - The matrix elements in column-major order.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Matrix3} A reference to this matrix.
     */
    fromArray(array, offset = 0) {
      for (let i = 0; i < 9; i++) {
        this.elements[i] = array[i + offset];
      }
      return this;
    }
    /**
     * Writes the elements of this matrix to the given array. If no array is provided,
     * the method returns a new instance.
     *
     * @param {Array<number>} [array=[]] - The target array holding the matrix elements in column-major order.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Array<number>} The matrix elements in column-major order.
     */
    toArray(array = [], offset = 0) {
      const te = this.elements;
      array[offset] = te[0];
      array[offset + 1] = te[1];
      array[offset + 2] = te[2];
      array[offset + 3] = te[3];
      array[offset + 4] = te[4];
      array[offset + 5] = te[5];
      array[offset + 6] = te[6];
      array[offset + 7] = te[7];
      array[offset + 8] = te[8];
      return array;
    }
    /**
     * Returns a matrix with copied values from this instance.
     *
     * @return {Matrix3} A clone of this instance.
     */
    clone() {
      return new this.constructor().fromArray(this.elements);
    }
  };
  __name(_Matrix3, "Matrix3");
  var Matrix3 = _Matrix3;
  var _m3 = /* @__PURE__ */ new Matrix3();

  // node_modules/three/src/math/Plane.js
  var _vector1 = /* @__PURE__ */ new Vector3();
  var _vector2 = /* @__PURE__ */ new Vector3();
  var _normalMatrix = /* @__PURE__ */ new Matrix3();
  var _Plane = class _Plane {
    /**
     * Constructs a new plane.
     *
     * @param {Vector3} [normal=(1,0,0)] - A unit length vector defining the normal of the plane.
     * @param {number} [constant=0] - The signed distance from the origin to the plane.
     */
    constructor(normal = new Vector3(1, 0, 0), constant = 0) {
      this.isPlane = true;
      this.normal = normal;
      this.constant = constant;
    }
    /**
     * Sets the plane components by copying the given values.
     *
     * @param {Vector3} normal - The normal.
     * @param {number} constant - The constant.
     * @return {Plane} A reference to this plane.
     */
    set(normal, constant) {
      this.normal.copy(normal);
      this.constant = constant;
      return this;
    }
    /**
     * Sets the plane components by defining `x`, `y`, `z` as the
     * plane normal and `w` as the constant.
     *
     * @param {number} x - The value for the normal's x component.
     * @param {number} y - The value for the normal's y component.
     * @param {number} z - The value for the normal's z component.
     * @param {number} w - The constant value.
     * @return {Plane} A reference to this plane.
     */
    setComponents(x, y, z, w) {
      this.normal.set(x, y, z);
      this.constant = w;
      return this;
    }
    /**
     * Sets the plane from the given normal and coplanar point (that is a point
     * that lies onto the plane).
     *
     * @param {Vector3} normal - The normal.
     * @param {Vector3} point - A coplanar point.
     * @return {Plane} A reference to this plane.
     */
    setFromNormalAndCoplanarPoint(normal, point) {
      this.normal.copy(normal);
      this.constant = -point.dot(this.normal);
      return this;
    }
    /**
     * Sets the plane from three coplanar points. The winding order is
     * assumed to be counter-clockwise, and determines the direction of
     * the plane normal.
     *
     * @param {Vector3} a - The first coplanar point.
     * @param {Vector3} b - The second coplanar point.
     * @param {Vector3} c - The third coplanar point.
     * @return {Plane} A reference to this plane.
     */
    setFromCoplanarPoints(a, b, c) {
      const normal = _vector1.subVectors(c, b).cross(_vector2.subVectors(a, b)).normalize();
      this.setFromNormalAndCoplanarPoint(normal, a);
      return this;
    }
    /**
     * Copies the values of the given plane to this instance.
     *
     * @param {Plane} plane - The plane to copy.
     * @return {Plane} A reference to this plane.
     */
    copy(plane) {
      this.normal.copy(plane.normal);
      this.constant = plane.constant;
      return this;
    }
    /**
     * Normalizes the plane normal and adjusts the constant accordingly.
     *
     * @return {Plane} A reference to this plane.
     */
    normalize() {
      const inverseNormalLength = 1 / this.normal.length();
      this.normal.multiplyScalar(inverseNormalLength);
      this.constant *= inverseNormalLength;
      return this;
    }
    /**
     * Negates both the plane normal and the constant.
     *
     * @return {Plane} A reference to this plane.
     */
    negate() {
      this.constant *= -1;
      this.normal.negate();
      return this;
    }
    /**
     * Returns the signed distance from the given point to this plane.
     *
     * @param {Vector3} point - The point to compute the distance for.
     * @return {number} The signed distance.
     */
    distanceToPoint(point) {
      return this.normal.dot(point) + this.constant;
    }
    /**
     * Returns the signed distance from the given sphere to this plane.
     *
     * @param {Sphere} sphere - The sphere to compute the distance for.
     * @return {number} The signed distance.
     */
    distanceToSphere(sphere) {
      return this.distanceToPoint(sphere.center) - sphere.radius;
    }
    /**
     * Projects a the given point onto the plane.
     *
     * @param {Vector3} point - The point to project.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {Vector3} The projected point on the plane.
     */
    projectPoint(point, target) {
      return target.copy(point).addScaledVector(this.normal, -this.distanceToPoint(point));
    }
    /**
     * Returns the intersection point of the passed line and the plane. Returns
     * `null` if the line does not intersect. Returns the line's starting point if
     * the line is coplanar with the plane.
     *
     * @param {Line3} line - The line to compute the intersection for.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {?Vector3} The intersection point.
     */
    intersectLine(line, target) {
      const direction = line.delta(_vector1);
      const denominator = this.normal.dot(direction);
      if (denominator === 0) {
        if (this.distanceToPoint(line.start) === 0) {
          return target.copy(line.start);
        }
        return null;
      }
      const t = -(line.start.dot(this.normal) + this.constant) / denominator;
      if (t < 0 || t > 1) {
        return null;
      }
      return target.copy(line.start).addScaledVector(direction, t);
    }
    /**
     * Returns `true` if the given line segment intersects with (passes through) the plane.
     *
     * @param {Line3} line - The line to test.
     * @return {boolean} Whether the given line segment intersects with the plane or not.
     */
    intersectsLine(line) {
      const startSign = this.distanceToPoint(line.start);
      const endSign = this.distanceToPoint(line.end);
      return startSign < 0 && endSign > 0 || endSign < 0 && startSign > 0;
    }
    /**
     * Returns `true` if the given bounding box intersects with the plane.
     *
     * @param {Box3} box - The bounding box to test.
     * @return {boolean} Whether the given bounding box intersects with the plane or not.
     */
    intersectsBox(box) {
      return box.intersectsPlane(this);
    }
    /**
     * Returns `true` if the given bounding sphere intersects with the plane.
     *
     * @param {Sphere} sphere - The bounding sphere to test.
     * @return {boolean} Whether the given bounding sphere intersects with the plane or not.
     */
    intersectsSphere(sphere) {
      return sphere.intersectsPlane(this);
    }
    /**
     * Returns a coplanar vector to the plane, by calculating the
     * projection of the normal at the origin onto the plane.
     *
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {Vector3} The coplanar point.
     */
    coplanarPoint(target) {
      return target.copy(this.normal).multiplyScalar(-this.constant);
    }
    /**
     * Apply a 4x4 matrix to the plane. The matrix must be an affine, homogeneous transform.
     *
     * The optional normal matrix can be pre-computed like so:
     * ```js
     * const optionalNormalMatrix = new THREE.Matrix3().getNormalMatrix( matrix );
     * ```
     *
     * @param {Matrix4} matrix - The transformation matrix.
     * @param {Matrix4} [optionalNormalMatrix] - A pre-computed normal matrix.
     * @return {Plane} A reference to this plane.
     */
    applyMatrix4(matrix, optionalNormalMatrix) {
      const normalMatrix = optionalNormalMatrix || _normalMatrix.getNormalMatrix(matrix);
      const referencePoint = this.coplanarPoint(_vector1).applyMatrix4(matrix);
      const normal = this.normal.applyMatrix3(normalMatrix).normalize();
      this.constant = -referencePoint.dot(normal);
      return this;
    }
    /**
     * Translates the plane by the distance defined by the given offset vector.
     * Note that this only affects the plane constant and will not affect the normal vector.
     *
     * @param {Vector3} offset - The offset vector.
     * @return {Plane} A reference to this plane.
     */
    translate(offset) {
      this.constant -= offset.dot(this.normal);
      return this;
    }
    /**
     * Returns `true` if this plane is equal with the given one.
     *
     * @param {Plane} plane - The plane to test for equality.
     * @return {boolean} Whether this plane is equal with the given one.
     */
    equals(plane) {
      return plane.normal.equals(this.normal) && plane.constant === this.constant;
    }
    /**
     * Returns a new plane with copied values from this instance.
     *
     * @return {Plane} A clone of this instance.
     */
    clone() {
      return new this.constructor().copy(this);
    }
  };
  __name(_Plane, "Plane");
  var Plane = _Plane;

  // node_modules/three/src/math/Ray.js
  var _vector3 = /* @__PURE__ */ new Vector3();
  var _segCenter = /* @__PURE__ */ new Vector3();
  var _segDir = /* @__PURE__ */ new Vector3();
  var _diff = /* @__PURE__ */ new Vector3();
  var _edge1 = /* @__PURE__ */ new Vector3();
  var _edge2 = /* @__PURE__ */ new Vector3();
  var _normal = /* @__PURE__ */ new Vector3();
  var _Ray = class _Ray {
    /**
     * Constructs a new ray.
     *
     * @param {Vector3} [origin=(0,0,0)] - The origin of the ray.
     * @param {Vector3} [direction=(0,0,-1)] - The (normalized) direction of the ray.
     */
    constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
      this.origin = origin;
      this.direction = direction;
    }
    /**
     * Sets the ray's components by copying the given values.
     *
     * @param {Vector3} origin - The origin.
     * @param {Vector3} direction - The direction.
     * @return {Ray} A reference to this ray.
     */
    set(origin, direction) {
      this.origin.copy(origin);
      this.direction.copy(direction);
      return this;
    }
    /**
     * Copies the values of the given ray to this instance.
     *
     * @param {Ray} ray - The ray to copy.
     * @return {Ray} A reference to this ray.
     */
    copy(ray) {
      this.origin.copy(ray.origin);
      this.direction.copy(ray.direction);
      return this;
    }
    /**
     * Returns a vector that is located at a given distance along this ray.
     *
     * @param {number} t - The distance along the ray to retrieve a position for.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {Vector3} A position on the ray.
     */
    at(t, target) {
      return target.copy(this.origin).addScaledVector(this.direction, t);
    }
    /**
     * Adjusts the direction of the ray to point at the given vector in world space.
     *
     * @param {Vector3} v - The target position.
     * @return {Ray} A reference to this ray.
     */
    lookAt(v) {
      this.direction.copy(v).sub(this.origin).normalize();
      return this;
    }
    /**
     * Shift the origin of this ray along its direction by the given distance.
     *
     * @param {number} t - The distance along the ray to interpolate.
     * @return {Ray} A reference to this ray.
     */
    recast(t) {
      this.origin.copy(this.at(t, _vector3));
      return this;
    }
    /**
     * Returns the point along this ray that is closest to the given point.
     *
     * @param {Vector3} point - A point in 3D space to get the closet location on the ray for.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {Vector3} The closest point on this ray.
     */
    closestPointToPoint(point, target) {
      target.subVectors(point, this.origin);
      const directionDistance = target.dot(this.direction);
      if (directionDistance < 0) {
        return target.copy(this.origin);
      }
      return target.copy(this.origin).addScaledVector(this.direction, directionDistance);
    }
    /**
     * Returns the distance of the closest approach between this ray and the given point.
     *
     * @param {Vector3} point - A point in 3D space to compute the distance to.
     * @return {number} The distance.
     */
    distanceToPoint(point) {
      return Math.sqrt(this.distanceSqToPoint(point));
    }
    /**
     * Returns the squared distance of the closest approach between this ray and the given point.
     *
     * @param {Vector3} point - A point in 3D space to compute the distance to.
     * @return {number} The squared distance.
     */
    distanceSqToPoint(point) {
      const directionDistance = _vector3.subVectors(point, this.origin).dot(this.direction);
      if (directionDistance < 0) {
        return this.origin.distanceToSquared(point);
      }
      _vector3.copy(this.origin).addScaledVector(this.direction, directionDistance);
      return _vector3.distanceToSquared(point);
    }
    /**
     * Returns the squared distance between this ray and the given line segment.
     *
     * @param {Vector3} v0 - The start point of the line segment.
     * @param {Vector3} v1 - The end point of the line segment.
     * @param {Vector3} [optionalPointOnRay] - When provided, it receives the point on this ray that is closest to the segment.
     * @param {Vector3} [optionalPointOnSegment] - When provided, it receives the point on the line segment that is closest to this ray.
     * @return {number} The squared distance.
     */
    distanceSqToSegment(v0, v1, optionalPointOnRay, optionalPointOnSegment) {
      _segCenter.copy(v0).add(v1).multiplyScalar(0.5);
      _segDir.copy(v1).sub(v0).normalize();
      _diff.copy(this.origin).sub(_segCenter);
      const segExtent = v0.distanceTo(v1) * 0.5;
      const a01 = -this.direction.dot(_segDir);
      const b0 = _diff.dot(this.direction);
      const b1 = -_diff.dot(_segDir);
      const c = _diff.lengthSq();
      const det = Math.abs(1 - a01 * a01);
      let s0, s1, sqrDist3, extDet;
      if (det > 0) {
        s0 = a01 * b1 - b0;
        s1 = a01 * b0 - b1;
        extDet = segExtent * det;
        if (s0 >= 0) {
          if (s1 >= -extDet) {
            if (s1 <= extDet) {
              const invDet = 1 / det;
              s0 *= invDet;
              s1 *= invDet;
              sqrDist3 = s0 * (s0 + a01 * s1 + 2 * b0) + s1 * (a01 * s0 + s1 + 2 * b1) + c;
            } else {
              s1 = segExtent;
              s0 = Math.max(0, -(a01 * s1 + b0));
              sqrDist3 = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
            }
          } else {
            s1 = -segExtent;
            s0 = Math.max(0, -(a01 * s1 + b0));
            sqrDist3 = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
          }
        } else {
          if (s1 <= -extDet) {
            s0 = Math.max(0, -(-a01 * segExtent + b0));
            s1 = s0 > 0 ? -segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
            sqrDist3 = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
          } else if (s1 <= extDet) {
            s0 = 0;
            s1 = Math.min(Math.max(-segExtent, -b1), segExtent);
            sqrDist3 = s1 * (s1 + 2 * b1) + c;
          } else {
            s0 = Math.max(0, -(a01 * segExtent + b0));
            s1 = s0 > 0 ? segExtent : Math.min(Math.max(-segExtent, -b1), segExtent);
            sqrDist3 = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
          }
        }
      } else {
        s1 = a01 > 0 ? -segExtent : segExtent;
        s0 = Math.max(0, -(a01 * s1 + b0));
        sqrDist3 = -s0 * s0 + s1 * (s1 + 2 * b1) + c;
      }
      if (optionalPointOnRay) {
        optionalPointOnRay.copy(this.origin).addScaledVector(this.direction, s0);
      }
      if (optionalPointOnSegment) {
        optionalPointOnSegment.copy(_segCenter).addScaledVector(_segDir, s1);
      }
      return sqrDist3;
    }
    /**
     * Intersects this ray with the given sphere, returning the intersection
     * point or `null` if there is no intersection.
     *
     * @param {Sphere} sphere - The sphere to intersect.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {?Vector3} The intersection point.
     */
    intersectSphere(sphere, target) {
      _vector3.subVectors(sphere.center, this.origin);
      const tca = _vector3.dot(this.direction);
      const d2 = _vector3.dot(_vector3) - tca * tca;
      const radius2 = sphere.radius * sphere.radius;
      if (d2 > radius2) return null;
      const thc = Math.sqrt(radius2 - d2);
      const t0 = tca - thc;
      const t1 = tca + thc;
      if (t1 < 0) return null;
      if (t0 < 0) return this.at(t1, target);
      return this.at(t0, target);
    }
    /**
     * Returns `true` if this ray intersects with the given sphere.
     *
     * @param {Sphere} sphere - The sphere to intersect.
     * @return {boolean} Whether this ray intersects with the given sphere or not.
     */
    intersectsSphere(sphere) {
      if (sphere.radius < 0) return false;
      return this.distanceSqToPoint(sphere.center) <= sphere.radius * sphere.radius;
    }
    /**
     * Computes the distance from the ray's origin to the given plane. Returns `null` if the ray
     * does not intersect with the plane.
     *
     * @param {Plane} plane - The plane to compute the distance to.
     * @return {?number} Whether this ray intersects with the given sphere or not.
     */
    distanceToPlane(plane) {
      const denominator = plane.normal.dot(this.direction);
      if (denominator === 0) {
        if (plane.distanceToPoint(this.origin) === 0) {
          return 0;
        }
        return null;
      }
      const t = -(this.origin.dot(plane.normal) + plane.constant) / denominator;
      return t >= 0 ? t : null;
    }
    /**
     * Intersects this ray with the given plane, returning the intersection
     * point or `null` if there is no intersection.
     *
     * @param {Plane} plane - The plane to intersect.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {?Vector3} The intersection point.
     */
    intersectPlane(plane, target) {
      const t = this.distanceToPlane(plane);
      if (t === null) {
        return null;
      }
      return this.at(t, target);
    }
    /**
     * Returns `true` if this ray intersects with the given plane.
     *
     * @param {Plane} plane - The plane to intersect.
     * @return {boolean} Whether this ray intersects with the given plane or not.
     */
    intersectsPlane(plane) {
      const distToPoint = plane.distanceToPoint(this.origin);
      if (distToPoint === 0) {
        return true;
      }
      const denominator = plane.normal.dot(this.direction);
      if (denominator * distToPoint < 0) {
        return true;
      }
      return false;
    }
    /**
     * Intersects this ray with the given bounding box, returning the intersection
     * point or `null` if there is no intersection.
     *
     * @param {Box3} box - The box to intersect.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {?Vector3} The intersection point.
     */
    intersectBox(box, target) {
      let tmin, tmax, tymin, tymax, tzmin, tzmax;
      const invdirx = 1 / this.direction.x, invdiry = 1 / this.direction.y, invdirz = 1 / this.direction.z;
      const origin = this.origin;
      if (invdirx >= 0) {
        tmin = (box.min.x - origin.x) * invdirx;
        tmax = (box.max.x - origin.x) * invdirx;
      } else {
        tmin = (box.max.x - origin.x) * invdirx;
        tmax = (box.min.x - origin.x) * invdirx;
      }
      if (invdiry >= 0) {
        tymin = (box.min.y - origin.y) * invdiry;
        tymax = (box.max.y - origin.y) * invdiry;
      } else {
        tymin = (box.max.y - origin.y) * invdiry;
        tymax = (box.min.y - origin.y) * invdiry;
      }
      if (tmin > tymax || tymin > tmax) return null;
      if (tymin > tmin || isNaN(tmin)) tmin = tymin;
      if (tymax < tmax || isNaN(tmax)) tmax = tymax;
      if (invdirz >= 0) {
        tzmin = (box.min.z - origin.z) * invdirz;
        tzmax = (box.max.z - origin.z) * invdirz;
      } else {
        tzmin = (box.max.z - origin.z) * invdirz;
        tzmax = (box.min.z - origin.z) * invdirz;
      }
      if (tmin > tzmax || tzmin > tmax) return null;
      if (tzmin > tmin || tmin !== tmin) tmin = tzmin;
      if (tzmax < tmax || tmax !== tmax) tmax = tzmax;
      if (tmax < 0) return null;
      return this.at(tmin >= 0 ? tmin : tmax, target);
    }
    /**
     * Returns `true` if this ray intersects with the given box.
     *
     * @param {Box3} box - The box to intersect.
     * @return {boolean} Whether this ray intersects with the given box or not.
     */
    intersectsBox(box) {
      return this.intersectBox(box, _vector3) !== null;
    }
    /**
     * Intersects this ray with the given triangle, returning the intersection
     * point or `null` if there is no intersection.
     *
     * @param {Vector3} a - The first vertex of the triangle.
     * @param {Vector3} b - The second vertex of the triangle.
     * @param {Vector3} c - The third vertex of the triangle.
     * @param {boolean} backfaceCulling - Whether to use backface culling or not.
     * @param {Vector3} target - The target vector that is used to store the method's result.
     * @return {?Vector3} The intersection point.
     */
    intersectTriangle(a, b, c, backfaceCulling, target) {
      _edge1.subVectors(b, a);
      _edge2.subVectors(c, a);
      _normal.crossVectors(_edge1, _edge2);
      let DdN = this.direction.dot(_normal);
      let sign;
      if (DdN > 0) {
        if (backfaceCulling) return null;
        sign = 1;
      } else if (DdN < 0) {
        sign = -1;
        DdN = -DdN;
      } else {
        return null;
      }
      _diff.subVectors(this.origin, a);
      const DdQxE2 = sign * this.direction.dot(_edge2.crossVectors(_diff, _edge2));
      if (DdQxE2 < 0) {
        return null;
      }
      const DdE1xQ = sign * this.direction.dot(_edge1.cross(_diff));
      if (DdE1xQ < 0) {
        return null;
      }
      if (DdQxE2 + DdE1xQ > DdN) {
        return null;
      }
      const QdN = -sign * _diff.dot(_normal);
      if (QdN < 0) {
        return null;
      }
      return this.at(QdN / DdN, target);
    }
    /**
     * Transforms this ray with the given 4x4 transformation matrix.
     *
     * @param {Matrix4} matrix4 - The transformation matrix.
     * @return {Ray} A reference to this ray.
     */
    applyMatrix4(matrix4) {
      this.origin.applyMatrix4(matrix4);
      this.direction.transformDirection(matrix4);
      return this;
    }
    /**
     * Returns `true` if this ray is equal with the given one.
     *
     * @param {Ray} ray - The ray to test for equality.
     * @return {boolean} Whether this ray is equal with the given one.
     */
    equals(ray) {
      return ray.origin.equals(this.origin) && ray.direction.equals(this.direction);
    }
    /**
     * Returns a new ray with copied values from this instance.
     *
     * @return {Ray} A clone of this instance.
     */
    clone() {
      return new this.constructor().copy(this);
    }
  };
  __name(_Ray, "Ray");
  var Ray = _Ray;

  // node_modules/three/src/math/Matrix4.js
  var _Matrix4 = class _Matrix4 {
    /**
     * Constructs a new 4x4 matrix. The arguments are supposed to be
     * in row-major order. If no arguments are provided, the constructor
     * initializes the matrix as an identity matrix.
     *
     * @param {number} [n11] - 1-1 matrix element.
     * @param {number} [n12] - 1-2 matrix element.
     * @param {number} [n13] - 1-3 matrix element.
     * @param {number} [n14] - 1-4 matrix element.
     * @param {number} [n21] - 2-1 matrix element.
     * @param {number} [n22] - 2-2 matrix element.
     * @param {number} [n23] - 2-3 matrix element.
     * @param {number} [n24] - 2-4 matrix element.
     * @param {number} [n31] - 3-1 matrix element.
     * @param {number} [n32] - 3-2 matrix element.
     * @param {number} [n33] - 3-3 matrix element.
     * @param {number} [n34] - 3-4 matrix element.
     * @param {number} [n41] - 4-1 matrix element.
     * @param {number} [n42] - 4-2 matrix element.
     * @param {number} [n43] - 4-3 matrix element.
     * @param {number} [n44] - 4-4 matrix element.
     */
    constructor(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
      _Matrix4.prototype.isMatrix4 = true;
      this.elements = [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      ];
      if (n11 !== void 0) {
        this.set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44);
      }
    }
    /**
     * Sets the elements of the matrix.The arguments are supposed to be
     * in row-major order.
     *
     * @param {number} [n11] - 1-1 matrix element.
     * @param {number} [n12] - 1-2 matrix element.
     * @param {number} [n13] - 1-3 matrix element.
     * @param {number} [n14] - 1-4 matrix element.
     * @param {number} [n21] - 2-1 matrix element.
     * @param {number} [n22] - 2-2 matrix element.
     * @param {number} [n23] - 2-3 matrix element.
     * @param {number} [n24] - 2-4 matrix element.
     * @param {number} [n31] - 3-1 matrix element.
     * @param {number} [n32] - 3-2 matrix element.
     * @param {number} [n33] - 3-3 matrix element.
     * @param {number} [n34] - 3-4 matrix element.
     * @param {number} [n41] - 4-1 matrix element.
     * @param {number} [n42] - 4-2 matrix element.
     * @param {number} [n43] - 4-3 matrix element.
     * @param {number} [n44] - 4-4 matrix element.
     * @return {Matrix4} A reference to this matrix.
     */
    set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
      const te = this.elements;
      te[0] = n11;
      te[4] = n12;
      te[8] = n13;
      te[12] = n14;
      te[1] = n21;
      te[5] = n22;
      te[9] = n23;
      te[13] = n24;
      te[2] = n31;
      te[6] = n32;
      te[10] = n33;
      te[14] = n34;
      te[3] = n41;
      te[7] = n42;
      te[11] = n43;
      te[15] = n44;
      return this;
    }
    /**
     * Sets this matrix to the 4x4 identity matrix.
     *
     * @return {Matrix4} A reference to this matrix.
     */
    identity() {
      this.set(
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Returns a matrix with copied values from this instance.
     *
     * @return {Matrix4} A clone of this instance.
     */
    clone() {
      return new _Matrix4().fromArray(this.elements);
    }
    /**
     * Copies the values of the given matrix to this instance.
     *
     * @param {Matrix4} m - The matrix to copy.
     * @return {Matrix4} A reference to this matrix.
     */
    copy(m) {
      const te = this.elements;
      const me = m.elements;
      te[0] = me[0];
      te[1] = me[1];
      te[2] = me[2];
      te[3] = me[3];
      te[4] = me[4];
      te[5] = me[5];
      te[6] = me[6];
      te[7] = me[7];
      te[8] = me[8];
      te[9] = me[9];
      te[10] = me[10];
      te[11] = me[11];
      te[12] = me[12];
      te[13] = me[13];
      te[14] = me[14];
      te[15] = me[15];
      return this;
    }
    /**
     * Copies the translation component of the given matrix
     * into this matrix's translation component.
     *
     * @param {Matrix4} m - The matrix to copy the translation component.
     * @return {Matrix4} A reference to this matrix.
     */
    copyPosition(m) {
      const te = this.elements, me = m.elements;
      te[12] = me[12];
      te[13] = me[13];
      te[14] = me[14];
      return this;
    }
    /**
     * Set the upper 3x3 elements of this matrix to the values of given 3x3 matrix.
     *
     * @param {Matrix3} m - The 3x3 matrix.
     * @return {Matrix4} A reference to this matrix.
     */
    setFromMatrix3(m) {
      const me = m.elements;
      this.set(
        me[0],
        me[3],
        me[6],
        0,
        me[1],
        me[4],
        me[7],
        0,
        me[2],
        me[5],
        me[8],
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Extracts the basis of this matrix into the three axis vectors provided.
     *
     * @param {Vector3} xAxis - The basis's x axis.
     * @param {Vector3} yAxis - The basis's y axis.
     * @param {Vector3} zAxis - The basis's z axis.
     * @return {Matrix4} A reference to this matrix.
     */
    extractBasis(xAxis, yAxis, zAxis) {
      xAxis.setFromMatrixColumn(this, 0);
      yAxis.setFromMatrixColumn(this, 1);
      zAxis.setFromMatrixColumn(this, 2);
      return this;
    }
    /**
     * Sets the given basis vectors to this matrix.
     *
     * @param {Vector3} xAxis - The basis's x axis.
     * @param {Vector3} yAxis - The basis's y axis.
     * @param {Vector3} zAxis - The basis's z axis.
     * @return {Matrix4} A reference to this matrix.
     */
    makeBasis(xAxis, yAxis, zAxis) {
      this.set(
        xAxis.x,
        yAxis.x,
        zAxis.x,
        0,
        xAxis.y,
        yAxis.y,
        zAxis.y,
        0,
        xAxis.z,
        yAxis.z,
        zAxis.z,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Extracts the rotation component of the given matrix
     * into this matrix's rotation component.
     *
     * Note: This method does not support reflection matrices.
     *
     * @param {Matrix4} m - The matrix.
     * @return {Matrix4} A reference to this matrix.
     */
    extractRotation(m) {
      const te = this.elements;
      const me = m.elements;
      const scaleX = 1 / _v1.setFromMatrixColumn(m, 0).length();
      const scaleY = 1 / _v1.setFromMatrixColumn(m, 1).length();
      const scaleZ = 1 / _v1.setFromMatrixColumn(m, 2).length();
      te[0] = me[0] * scaleX;
      te[1] = me[1] * scaleX;
      te[2] = me[2] * scaleX;
      te[3] = 0;
      te[4] = me[4] * scaleY;
      te[5] = me[5] * scaleY;
      te[6] = me[6] * scaleY;
      te[7] = 0;
      te[8] = me[8] * scaleZ;
      te[9] = me[9] * scaleZ;
      te[10] = me[10] * scaleZ;
      te[11] = 0;
      te[12] = 0;
      te[13] = 0;
      te[14] = 0;
      te[15] = 1;
      return this;
    }
    /**
     * Sets the rotation component (the upper left 3x3 matrix) of this matrix to
     * the rotation specified by the given Euler angles. The rest of
     * the matrix is set to the identity. Depending on the {@link Euler#order},
     * there are six possible outcomes. See [this page]{@link https://en.wikipedia.org/wiki/Euler_angles#Rotation_matrix}
     * for a complete list.
     *
     * @param {Euler} euler - The Euler angles.
     * @return {Matrix4} A reference to this matrix.
     */
    makeRotationFromEuler(euler) {
      const te = this.elements;
      const x = euler.x, y = euler.y, z = euler.z;
      const a = Math.cos(x), b = Math.sin(x);
      const c = Math.cos(y), d = Math.sin(y);
      const e = Math.cos(z), f = Math.sin(z);
      if (euler.order === "XYZ") {
        const ae = a * e, af = a * f, be = b * e, bf = b * f;
        te[0] = c * e;
        te[4] = -c * f;
        te[8] = d;
        te[1] = af + be * d;
        te[5] = ae - bf * d;
        te[9] = -b * c;
        te[2] = bf - ae * d;
        te[6] = be + af * d;
        te[10] = a * c;
      } else if (euler.order === "YXZ") {
        const ce = c * e, cf = c * f, de = d * e, df = d * f;
        te[0] = ce + df * b;
        te[4] = de * b - cf;
        te[8] = a * d;
        te[1] = a * f;
        te[5] = a * e;
        te[9] = -b;
        te[2] = cf * b - de;
        te[6] = df + ce * b;
        te[10] = a * c;
      } else if (euler.order === "ZXY") {
        const ce = c * e, cf = c * f, de = d * e, df = d * f;
        te[0] = ce - df * b;
        te[4] = -a * f;
        te[8] = de + cf * b;
        te[1] = cf + de * b;
        te[5] = a * e;
        te[9] = df - ce * b;
        te[2] = -a * d;
        te[6] = b;
        te[10] = a * c;
      } else if (euler.order === "ZYX") {
        const ae = a * e, af = a * f, be = b * e, bf = b * f;
        te[0] = c * e;
        te[4] = be * d - af;
        te[8] = ae * d + bf;
        te[1] = c * f;
        te[5] = bf * d + ae;
        te[9] = af * d - be;
        te[2] = -d;
        te[6] = b * c;
        te[10] = a * c;
      } else if (euler.order === "YZX") {
        const ac = a * c, ad = a * d, bc = b * c, bd = b * d;
        te[0] = c * e;
        te[4] = bd - ac * f;
        te[8] = bc * f + ad;
        te[1] = f;
        te[5] = a * e;
        te[9] = -b * e;
        te[2] = -d * e;
        te[6] = ad * f + bc;
        te[10] = ac - bd * f;
      } else if (euler.order === "XZY") {
        const ac = a * c, ad = a * d, bc = b * c, bd = b * d;
        te[0] = c * e;
        te[4] = -f;
        te[8] = d * e;
        te[1] = ac * f + bd;
        te[5] = a * e;
        te[9] = ad * f - bc;
        te[2] = bc * f - ad;
        te[6] = b * e;
        te[10] = bd * f + ac;
      }
      te[3] = 0;
      te[7] = 0;
      te[11] = 0;
      te[12] = 0;
      te[13] = 0;
      te[14] = 0;
      te[15] = 1;
      return this;
    }
    /**
     * Sets the rotation component of this matrix to the rotation specified by
     * the given Quaternion as outlined [here]{@link https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion}
     * The rest of the matrix is set to the identity.
     *
     * @param {Quaternion} q - The Quaternion.
     * @return {Matrix4} A reference to this matrix.
     */
    makeRotationFromQuaternion(q) {
      return this.compose(_zero, q, _one);
    }
    /**
     * Sets the rotation component of the transformation matrix, looking from `eye` towards
     * `target`, and oriented by the up-direction.
     *
     * @param {Vector3} eye - The eye vector.
     * @param {Vector3} target - The target vector.
     * @param {Vector3} up - The up vector.
     * @return {Matrix4} A reference to this matrix.
     */
    lookAt(eye, target, up) {
      const te = this.elements;
      _z.subVectors(eye, target);
      if (_z.lengthSq() === 0) {
        _z.z = 1;
      }
      _z.normalize();
      _x.crossVectors(up, _z);
      if (_x.lengthSq() === 0) {
        if (Math.abs(up.z) === 1) {
          _z.x += 1e-4;
        } else {
          _z.z += 1e-4;
        }
        _z.normalize();
        _x.crossVectors(up, _z);
      }
      _x.normalize();
      _y.crossVectors(_z, _x);
      te[0] = _x.x;
      te[4] = _y.x;
      te[8] = _z.x;
      te[1] = _x.y;
      te[5] = _y.y;
      te[9] = _z.y;
      te[2] = _x.z;
      te[6] = _y.z;
      te[10] = _z.z;
      return this;
    }
    /**
     * Post-multiplies this matrix by the given 4x4 matrix.
     *
     * @param {Matrix4} m - The matrix to multiply with.
     * @return {Matrix4} A reference to this matrix.
     */
    multiply(m) {
      return this.multiplyMatrices(this, m);
    }
    /**
     * Pre-multiplies this matrix by the given 4x4 matrix.
     *
     * @param {Matrix4} m - The matrix to multiply with.
     * @return {Matrix4} A reference to this matrix.
     */
    premultiply(m) {
      return this.multiplyMatrices(m, this);
    }
    /**
     * Multiples the given 4x4 matrices and stores the result
     * in this matrix.
     *
     * @param {Matrix4} a - The first matrix.
     * @param {Matrix4} b - The second matrix.
     * @return {Matrix4} A reference to this matrix.
     */
    multiplyMatrices(a, b) {
      const ae = a.elements;
      const be = b.elements;
      const te = this.elements;
      const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
      const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
      const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
      const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
      const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
      const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
      const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
      const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
      te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
      te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
      te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
      te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
      te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
      te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
      te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
      te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
      te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
      te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
      te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
      te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
      te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
      te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
      te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
      te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
      return this;
    }
    /**
     * Multiplies every component of the matrix by the given scalar.
     *
     * @param {number} s - The scalar.
     * @return {Matrix4} A reference to this matrix.
     */
    multiplyScalar(s) {
      const te = this.elements;
      te[0] *= s;
      te[4] *= s;
      te[8] *= s;
      te[12] *= s;
      te[1] *= s;
      te[5] *= s;
      te[9] *= s;
      te[13] *= s;
      te[2] *= s;
      te[6] *= s;
      te[10] *= s;
      te[14] *= s;
      te[3] *= s;
      te[7] *= s;
      te[11] *= s;
      te[15] *= s;
      return this;
    }
    /**
     * Computes and returns the determinant of this matrix.
     *
     * Based on the method outlined [here]{@link http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.html}.
     *
     * @return {number} The determinant.
     */
    determinant() {
      const te = this.elements;
      const n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12];
      const n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13];
      const n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14];
      const n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];
      return n41 * (+n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34) + n42 * (+n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31) + n43 * (+n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31) + n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31);
    }
    /**
     * Transposes this matrix in place.
     *
     * @return {Matrix4} A reference to this matrix.
     */
    transpose() {
      const te = this.elements;
      let tmp;
      tmp = te[1];
      te[1] = te[4];
      te[4] = tmp;
      tmp = te[2];
      te[2] = te[8];
      te[8] = tmp;
      tmp = te[6];
      te[6] = te[9];
      te[9] = tmp;
      tmp = te[3];
      te[3] = te[12];
      te[12] = tmp;
      tmp = te[7];
      te[7] = te[13];
      te[13] = tmp;
      tmp = te[11];
      te[11] = te[14];
      te[14] = tmp;
      return this;
    }
    /**
     * Sets the position component for this matrix from the given vector,
     * without affecting the rest of the matrix.
     *
     * @param {number|Vector3} x - The x component of the vector or alternatively the vector object.
     * @param {number} y - The y component of the vector.
     * @param {number} z - The z component of the vector.
     * @return {Matrix4} A reference to this matrix.
     */
    setPosition(x, y, z) {
      const te = this.elements;
      if (x.isVector3) {
        te[12] = x.x;
        te[13] = x.y;
        te[14] = x.z;
      } else {
        te[12] = x;
        te[13] = y;
        te[14] = z;
      }
      return this;
    }
    /**
     * Inverts this matrix, using the [analytic method]{@link https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution}.
     * You can not invert with a determinant of zero. If you attempt this, the method produces
     * a zero matrix instead.
     *
     * @return {Matrix4} A reference to this matrix.
     */
    invert() {
      const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15], t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44, t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44, t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44, t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
      const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
      if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      const detInv = 1 / det;
      te[0] = t11 * detInv;
      te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
      te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
      te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;
      te[4] = t12 * detInv;
      te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
      te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
      te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;
      te[8] = t13 * detInv;
      te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
      te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
      te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;
      te[12] = t14 * detInv;
      te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
      te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
      te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
      return this;
    }
    /**
     * Multiplies the columns of this matrix by the given vector.
     *
     * @param {Vector3} v - The scale vector.
     * @return {Matrix4} A reference to this matrix.
     */
    scale(v) {
      const te = this.elements;
      const x = v.x, y = v.y, z = v.z;
      te[0] *= x;
      te[4] *= y;
      te[8] *= z;
      te[1] *= x;
      te[5] *= y;
      te[9] *= z;
      te[2] *= x;
      te[6] *= y;
      te[10] *= z;
      te[3] *= x;
      te[7] *= y;
      te[11] *= z;
      return this;
    }
    /**
     * Gets the maximum scale value of the three axes.
     *
     * @return {number} The maximum scale.
     */
    getMaxScaleOnAxis() {
      const te = this.elements;
      const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2];
      const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6];
      const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10];
      return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
    }
    /**
     * Sets this matrix as a translation transform from the given vector.
     *
     * @param {number|Vector3} x - The amount to translate in the X axis or alternatively a translation vector.
     * @param {number} y - The amount to translate in the Y axis.
     * @param {number} z - The amount to translate in the z axis.
     * @return {Matrix4} A reference to this matrix.
     */
    makeTranslation(x, y, z) {
      if (x.isVector3) {
        this.set(
          1,
          0,
          0,
          x.x,
          0,
          1,
          0,
          x.y,
          0,
          0,
          1,
          x.z,
          0,
          0,
          0,
          1
        );
      } else {
        this.set(
          1,
          0,
          0,
          x,
          0,
          1,
          0,
          y,
          0,
          0,
          1,
          z,
          0,
          0,
          0,
          1
        );
      }
      return this;
    }
    /**
     * Sets this matrix as a rotational transformation around the X axis by
     * the given angle.
     *
     * @param {number} theta - The rotation in radians.
     * @return {Matrix4} A reference to this matrix.
     */
    makeRotationX(theta) {
      const c = Math.cos(theta), s = Math.sin(theta);
      this.set(
        1,
        0,
        0,
        0,
        0,
        c,
        -s,
        0,
        0,
        s,
        c,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets this matrix as a rotational transformation around the Y axis by
     * the given angle.
     *
     * @param {number} theta - The rotation in radians.
     * @return {Matrix4} A reference to this matrix.
     */
    makeRotationY(theta) {
      const c = Math.cos(theta), s = Math.sin(theta);
      this.set(
        c,
        0,
        s,
        0,
        0,
        1,
        0,
        0,
        -s,
        0,
        c,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets this matrix as a rotational transformation around the Z axis by
     * the given angle.
     *
     * @param {number} theta - The rotation in radians.
     * @return {Matrix4} A reference to this matrix.
     */
    makeRotationZ(theta) {
      const c = Math.cos(theta), s = Math.sin(theta);
      this.set(
        c,
        -s,
        0,
        0,
        s,
        c,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets this matrix as a rotational transformation around the given axis by
     * the given angle.
     *
     * This is a somewhat controversial but mathematically sound alternative to
     * rotating via Quaternions. See the discussion [here]{@link https://www.gamedev.net/articles/programming/math-and-physics/do-we-really-need-quaternions-r1199}.
     *
     * @param {Vector3} axis - The normalized rotation axis.
     * @param {number} angle - The rotation in radians.
     * @return {Matrix4} A reference to this matrix.
     */
    makeRotationAxis(axis, angle2) {
      const c = Math.cos(angle2);
      const s = Math.sin(angle2);
      const t = 1 - c;
      const x = axis.x, y = axis.y, z = axis.z;
      const tx = t * x, ty = t * y;
      this.set(
        tx * x + c,
        tx * y - s * z,
        tx * z + s * y,
        0,
        tx * y + s * z,
        ty * y + c,
        ty * z - s * x,
        0,
        tx * z - s * y,
        ty * z + s * x,
        t * z * z + c,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets this matrix as a scale transformation.
     *
     * @param {number} x - The amount to scale in the X axis.
     * @param {number} y - The amount to scale in the Y axis.
     * @param {number} z - The amount to scale in the Z axis.
     * @return {Matrix4} A reference to this matrix.
     */
    makeScale(x, y, z) {
      this.set(
        x,
        0,
        0,
        0,
        0,
        y,
        0,
        0,
        0,
        0,
        z,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets this matrix as a shear transformation.
     *
     * @param {number} xy - The amount to shear X by Y.
     * @param {number} xz - The amount to shear X by Z.
     * @param {number} yx - The amount to shear Y by X.
     * @param {number} yz - The amount to shear Y by Z.
     * @param {number} zx - The amount to shear Z by X.
     * @param {number} zy - The amount to shear Z by Y.
     * @return {Matrix4} A reference to this matrix.
     */
    makeShear(xy, xz, yx, yz, zx, zy) {
      this.set(
        1,
        yx,
        zx,
        0,
        xy,
        1,
        zy,
        0,
        xz,
        yz,
        1,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets this matrix to the transformation composed of the given position,
     * rotation (Quaternion) and scale.
     *
     * @param {Vector3} position - The position vector.
     * @param {Quaternion} quaternion - The rotation as a Quaternion.
     * @param {Vector3} scale - The scale vector.
     * @return {Matrix4} A reference to this matrix.
     */
    compose(position, quaternion, scale5) {
      const te = this.elements;
      const x = quaternion._x, y = quaternion._y, z = quaternion._z, w = quaternion._w;
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      const sx = scale5.x, sy = scale5.y, sz = scale5.z;
      te[0] = (1 - (yy + zz)) * sx;
      te[1] = (xy + wz) * sx;
      te[2] = (xz - wy) * sx;
      te[3] = 0;
      te[4] = (xy - wz) * sy;
      te[5] = (1 - (xx + zz)) * sy;
      te[6] = (yz + wx) * sy;
      te[7] = 0;
      te[8] = (xz + wy) * sz;
      te[9] = (yz - wx) * sz;
      te[10] = (1 - (xx + yy)) * sz;
      te[11] = 0;
      te[12] = position.x;
      te[13] = position.y;
      te[14] = position.z;
      te[15] = 1;
      return this;
    }
    /**
     * Decomposes this matrix into its position, rotation and scale components
     * and provides the result in the given objects.
     *
     * Note: Not all matrices are decomposable in this way. For example, if an
     * object has a non-uniformly scaled parent, then the object's world matrix
     * may not be decomposable, and this method may not be appropriate.
     *
     * @param {Vector3} position - The position vector.
     * @param {Quaternion} quaternion - The rotation as a Quaternion.
     * @param {Vector3} scale - The scale vector.
     * @return {Matrix4} A reference to this matrix.
     */
    decompose(position, quaternion, scale5) {
      const te = this.elements;
      let sx = _v1.set(te[0], te[1], te[2]).length();
      const sy = _v1.set(te[4], te[5], te[6]).length();
      const sz = _v1.set(te[8], te[9], te[10]).length();
      const det = this.determinant();
      if (det < 0) sx = -sx;
      position.x = te[12];
      position.y = te[13];
      position.z = te[14];
      _m1.copy(this);
      const invSX = 1 / sx;
      const invSY = 1 / sy;
      const invSZ = 1 / sz;
      _m1.elements[0] *= invSX;
      _m1.elements[1] *= invSX;
      _m1.elements[2] *= invSX;
      _m1.elements[4] *= invSY;
      _m1.elements[5] *= invSY;
      _m1.elements[6] *= invSY;
      _m1.elements[8] *= invSZ;
      _m1.elements[9] *= invSZ;
      _m1.elements[10] *= invSZ;
      quaternion.setFromRotationMatrix(_m1);
      scale5.x = sx;
      scale5.y = sy;
      scale5.z = sz;
      return this;
    }
    /**
    	 * Creates a perspective projection matrix. This is used internally by
    	 * {@link PerspectiveCamera#updateProjectionMatrix}.
    
    	 * @param {number} left - Left boundary of the viewing frustum at the near plane.
    	 * @param {number} right - Right boundary of the viewing frustum at the near plane.
    	 * @param {number} top - Top boundary of the viewing frustum at the near plane.
    	 * @param {number} bottom - Bottom boundary of the viewing frustum at the near plane.
    	 * @param {number} near - The distance from the camera to the near plane.
    	 * @param {number} far - The distance from the camera to the far plane.
    	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - The coordinate system.
    	 * @return {Matrix4} A reference to this matrix.
    	 */
    makePerspective(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem) {
      const te = this.elements;
      const x = 2 * near / (right - left);
      const y = 2 * near / (top - bottom);
      const a = (right + left) / (right - left);
      const b = (top + bottom) / (top - bottom);
      let c, d;
      if (coordinateSystem === WebGLCoordinateSystem) {
        c = -(far + near) / (far - near);
        d = -2 * far * near / (far - near);
      } else if (coordinateSystem === WebGPUCoordinateSystem) {
        c = -far / (far - near);
        d = -far * near / (far - near);
      } else {
        throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + coordinateSystem);
      }
      te[0] = x;
      te[4] = 0;
      te[8] = a;
      te[12] = 0;
      te[1] = 0;
      te[5] = y;
      te[9] = b;
      te[13] = 0;
      te[2] = 0;
      te[6] = 0;
      te[10] = c;
      te[14] = d;
      te[3] = 0;
      te[7] = 0;
      te[11] = -1;
      te[15] = 0;
      return this;
    }
    /**
    	 * Creates a orthographic projection matrix. This is used internally by
    	 * {@link OrthographicCamera#updateProjectionMatrix}.
    
    	 * @param {number} left - Left boundary of the viewing frustum at the near plane.
    	 * @param {number} right - Right boundary of the viewing frustum at the near plane.
    	 * @param {number} top - Top boundary of the viewing frustum at the near plane.
    	 * @param {number} bottom - Bottom boundary of the viewing frustum at the near plane.
    	 * @param {number} near - The distance from the camera to the near plane.
    	 * @param {number} far - The distance from the camera to the far plane.
    	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - The coordinate system.
    	 * @return {Matrix4} A reference to this matrix.
    	 */
    makeOrthographic(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem) {
      const te = this.elements;
      const w = 1 / (right - left);
      const h = 1 / (top - bottom);
      const p = 1 / (far - near);
      const x = (right + left) * w;
      const y = (top + bottom) * h;
      let z, zInv;
      if (coordinateSystem === WebGLCoordinateSystem) {
        z = (far + near) * p;
        zInv = -2 * p;
      } else if (coordinateSystem === WebGPUCoordinateSystem) {
        z = near * p;
        zInv = -1 * p;
      } else {
        throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + coordinateSystem);
      }
      te[0] = 2 * w;
      te[4] = 0;
      te[8] = 0;
      te[12] = -x;
      te[1] = 0;
      te[5] = 2 * h;
      te[9] = 0;
      te[13] = -y;
      te[2] = 0;
      te[6] = 0;
      te[10] = zInv;
      te[14] = -z;
      te[3] = 0;
      te[7] = 0;
      te[11] = 0;
      te[15] = 1;
      return this;
    }
    /**
     * Returns `true` if this matrix is equal with the given one.
     *
     * @param {Matrix4} matrix - The matrix to test for equality.
     * @return {boolean} Whether this matrix is equal with the given one.
     */
    equals(matrix) {
      const te = this.elements;
      const me = matrix.elements;
      for (let i = 0; i < 16; i++) {
        if (te[i] !== me[i]) return false;
      }
      return true;
    }
    /**
     * Sets the elements of the matrix from the given array.
     *
     * @param {Array<number>} array - The matrix elements in column-major order.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Matrix4} A reference to this matrix.
     */
    fromArray(array, offset = 0) {
      for (let i = 0; i < 16; i++) {
        this.elements[i] = array[i + offset];
      }
      return this;
    }
    /**
     * Writes the elements of this matrix to the given array. If no array is provided,
     * the method returns a new instance.
     *
     * @param {Array<number>} [array=[]] - The target array holding the matrix elements in column-major order.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Array<number>} The matrix elements in column-major order.
     */
    toArray(array = [], offset = 0) {
      const te = this.elements;
      array[offset] = te[0];
      array[offset + 1] = te[1];
      array[offset + 2] = te[2];
      array[offset + 3] = te[3];
      array[offset + 4] = te[4];
      array[offset + 5] = te[5];
      array[offset + 6] = te[6];
      array[offset + 7] = te[7];
      array[offset + 8] = te[8];
      array[offset + 9] = te[9];
      array[offset + 10] = te[10];
      array[offset + 11] = te[11];
      array[offset + 12] = te[12];
      array[offset + 13] = te[13];
      array[offset + 14] = te[14];
      array[offset + 15] = te[15];
      return array;
    }
  };
  __name(_Matrix4, "Matrix4");
  var Matrix4 = _Matrix4;
  var _v1 = /* @__PURE__ */ new Vector3();
  var _m1 = /* @__PURE__ */ new Matrix4();
  var _zero = /* @__PURE__ */ new Vector3(0, 0, 0);
  var _one = /* @__PURE__ */ new Vector3(1, 1, 1);
  var _x = /* @__PURE__ */ new Vector3();
  var _y = /* @__PURE__ */ new Vector3();
  var _z = /* @__PURE__ */ new Vector3();

  // node_modules/three/src/math/Euler.js
  var _matrix = /* @__PURE__ */ new Matrix4();
  var _quaternion2 = /* @__PURE__ */ new Quaternion();
  var _Euler = class _Euler {
    /**
     * Constructs a new euler instance.
     *
     * @param {number} [x=0] - The angle of the x axis in radians.
     * @param {number} [y=0] - The angle of the y axis in radians.
     * @param {number} [z=0] - The angle of the z axis in radians.
     * @param {string} [order=Euler.DEFAULT_ORDER] - A string representing the order that the rotations are applied.
     */
    constructor(x = 0, y = 0, z = 0, order = _Euler.DEFAULT_ORDER) {
      this.isEuler = true;
      this._x = x;
      this._y = y;
      this._z = z;
      this._order = order;
    }
    /**
     * The angle of the x axis in radians.
     *
     * @type {number}
     * @default 0
     */
    get x() {
      return this._x;
    }
    set x(value) {
      this._x = value;
      this._onChangeCallback();
    }
    /**
     * The angle of the y axis in radians.
     *
     * @type {number}
     * @default 0
     */
    get y() {
      return this._y;
    }
    set y(value) {
      this._y = value;
      this._onChangeCallback();
    }
    /**
     * The angle of the z axis in radians.
     *
     * @type {number}
     * @default 0
     */
    get z() {
      return this._z;
    }
    set z(value) {
      this._z = value;
      this._onChangeCallback();
    }
    /**
     * A string representing the order that the rotations are applied.
     *
     * @type {string}
     * @default 'XYZ'
     */
    get order() {
      return this._order;
    }
    set order(value) {
      this._order = value;
      this._onChangeCallback();
    }
    /**
     * Sets the Euler components.
     *
     * @param {number} x - The angle of the x axis in radians.
     * @param {number} y - The angle of the y axis in radians.
     * @param {number} z - The angle of the z axis in radians.
     * @param {string} [order] - A string representing the order that the rotations are applied.
     * @return {Euler} A reference to this Euler instance.
     */
    set(x, y, z, order = this._order) {
      this._x = x;
      this._y = y;
      this._z = z;
      this._order = order;
      this._onChangeCallback();
      return this;
    }
    /**
     * Returns a new Euler instance with copied values from this instance.
     *
     * @return {Euler} A clone of this instance.
     */
    clone() {
      return new this.constructor(this._x, this._y, this._z, this._order);
    }
    /**
     * Copies the values of the given Euler instance to this instance.
     *
     * @param {Euler} euler - The Euler instance to copy.
     * @return {Euler} A reference to this Euler instance.
     */
    copy(euler) {
      this._x = euler._x;
      this._y = euler._y;
      this._z = euler._z;
      this._order = euler._order;
      this._onChangeCallback();
      return this;
    }
    /**
     * Sets the angles of this Euler instance from a pure rotation matrix.
     *
     * @param {Matrix4} m - A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
     * @param {string} [order] - A string representing the order that the rotations are applied.
     * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
     * @return {Euler} A reference to this Euler instance.
     */
    setFromRotationMatrix(m, order = this._order, update = true) {
      const te = m.elements;
      const m11 = te[0], m12 = te[4], m13 = te[8];
      const m21 = te[1], m22 = te[5], m23 = te[9];
      const m31 = te[2], m32 = te[6], m33 = te[10];
      switch (order) {
        case "XYZ":
          this._y = Math.asin(clamp2(m13, -1, 1));
          if (Math.abs(m13) < 0.9999999) {
            this._x = Math.atan2(-m23, m33);
            this._z = Math.atan2(-m12, m11);
          } else {
            this._x = Math.atan2(m32, m22);
            this._z = 0;
          }
          break;
        case "YXZ":
          this._x = Math.asin(-clamp2(m23, -1, 1));
          if (Math.abs(m23) < 0.9999999) {
            this._y = Math.atan2(m13, m33);
            this._z = Math.atan2(m21, m22);
          } else {
            this._y = Math.atan2(-m31, m11);
            this._z = 0;
          }
          break;
        case "ZXY":
          this._x = Math.asin(clamp2(m32, -1, 1));
          if (Math.abs(m32) < 0.9999999) {
            this._y = Math.atan2(-m31, m33);
            this._z = Math.atan2(-m12, m22);
          } else {
            this._y = 0;
            this._z = Math.atan2(m21, m11);
          }
          break;
        case "ZYX":
          this._y = Math.asin(-clamp2(m31, -1, 1));
          if (Math.abs(m31) < 0.9999999) {
            this._x = Math.atan2(m32, m33);
            this._z = Math.atan2(m21, m11);
          } else {
            this._x = 0;
            this._z = Math.atan2(-m12, m22);
          }
          break;
        case "YZX":
          this._z = Math.asin(clamp2(m21, -1, 1));
          if (Math.abs(m21) < 0.9999999) {
            this._x = Math.atan2(-m23, m22);
            this._y = Math.atan2(-m31, m11);
          } else {
            this._x = 0;
            this._y = Math.atan2(m13, m33);
          }
          break;
        case "XZY":
          this._z = Math.asin(-clamp2(m12, -1, 1));
          if (Math.abs(m12) < 0.9999999) {
            this._x = Math.atan2(m32, m22);
            this._y = Math.atan2(m13, m11);
          } else {
            this._x = Math.atan2(-m23, m33);
            this._y = 0;
          }
          break;
        default:
          console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: " + order);
      }
      this._order = order;
      if (update === true) this._onChangeCallback();
      return this;
    }
    /**
     * Sets the angles of this Euler instance from a normalized quaternion.
     *
     * @param {Quaternion} q - A normalized Quaternion.
     * @param {string} [order] - A string representing the order that the rotations are applied.
     * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
     * @return {Euler} A reference to this Euler instance.
     */
    setFromQuaternion(q, order, update) {
      _matrix.makeRotationFromQuaternion(q);
      return this.setFromRotationMatrix(_matrix, order, update);
    }
    /**
     * Sets the angles of this Euler instance from the given vector.
     *
     * @param {Vector3} v - The vector.
     * @param {string} [order] - A string representing the order that the rotations are applied.
     * @return {Euler} A reference to this Euler instance.
     */
    setFromVector3(v, order = this._order) {
      return this.set(v.x, v.y, v.z, order);
    }
    /**
     * Resets the euler angle with a new order by creating a quaternion from this
     * euler angle and then setting this euler angle with the quaternion and the
     * new order.
     *
     * Warning: This discards revolution information.
     *
     * @param {string} [newOrder] - A string representing the new order that the rotations are applied.
     * @return {Euler} A reference to this Euler instance.
     */
    reorder(newOrder) {
      _quaternion2.setFromEuler(this);
      return this.setFromQuaternion(_quaternion2, newOrder);
    }
    /**
     * Returns `true` if this Euler instance is equal with the given one.
     *
     * @param {Euler} euler - The Euler instance to test for equality.
     * @return {boolean} Whether this Euler instance is equal with the given one.
     */
    equals(euler) {
      return euler._x === this._x && euler._y === this._y && euler._z === this._z && euler._order === this._order;
    }
    /**
     * Sets this Euler instance's components to values from the given array. The first three
     * entries of the array are assign to the x,y and z components. An optional fourth entry
     * defines the Euler order.
     *
     * @param {Array<number,number,number,?string>} array - An array holding the Euler component values.
     * @return {Euler} A reference to this Euler instance.
     */
    fromArray(array) {
      this._x = array[0];
      this._y = array[1];
      this._z = array[2];
      if (array[3] !== void 0) this._order = array[3];
      this._onChangeCallback();
      return this;
    }
    /**
     * Writes the components of this Euler instance to the given array. If no array is provided,
     * the method returns a new instance.
     *
     * @param {Array<number,number,number,string>} [array=[]] - The target array holding the Euler components.
     * @param {number} [offset=0] - Index of the first element in the array.
     * @return {Array<number,number,number,string>} The Euler components.
     */
    toArray(array = [], offset = 0) {
      array[offset] = this._x;
      array[offset + 1] = this._y;
      array[offset + 2] = this._z;
      array[offset + 3] = this._order;
      return array;
    }
    _onChange(callback) {
      this._onChangeCallback = callback;
      return this;
    }
    _onChangeCallback() {
    }
    *[Symbol.iterator]() {
      yield this._x;
      yield this._y;
      yield this._z;
      yield this._order;
    }
  };
  __name(_Euler, "Euler");
  var Euler = _Euler;
  Euler.DEFAULT_ORDER = "XYZ";

  // node_modules/three/src/core/Layers.js
  var _Layers = class _Layers {
    /**
     * Constructs a new layers instance, with membership
     * initially set to layer `0`.
     */
    constructor() {
      this.mask = 1 | 0;
    }
    /**
     * Sets membership to the given layer, and remove membership all other layers.
     *
     * @param {number} layer - The layer to set.
     */
    set(layer) {
      this.mask = (1 << layer | 0) >>> 0;
    }
    /**
     * Adds membership of the given layer.
     *
     * @param {number} layer - The layer to enable.
     */
    enable(layer) {
      this.mask |= 1 << layer | 0;
    }
    /**
     * Adds membership to all layers.
     */
    enableAll() {
      this.mask = 4294967295 | 0;
    }
    /**
     * Toggles the membership of the given layer.
     *
     * @param {number} layer - The layer to toggle.
     */
    toggle(layer) {
      this.mask ^= 1 << layer | 0;
    }
    /**
     * Removes membership of the given layer.
     *
     * @param {number} layer - The layer to enable.
     */
    disable(layer) {
      this.mask &= ~(1 << layer | 0);
    }
    /**
     * Removes the membership from all layers.
     */
    disableAll() {
      this.mask = 0;
    }
    /**
     * Returns `true` if this and the given layers object have at least one
     * layer in common.
     *
     * @param {Layers} layers - The layers to test.
     * @return {boolean } Whether this and the given layers object have at least one layer in common or not.
     */
    test(layers) {
      return (this.mask & layers.mask) !== 0;
    }
    /**
     * Returns `true` if the given layer is enabled.
     *
     * @param {number} layer - The layer to test.
     * @return {boolean } Whether the given layer is enabled or not.
     */
    isEnabled(layer) {
      return (this.mask & (1 << layer | 0)) !== 0;
    }
  };
  __name(_Layers, "Layers");
  var Layers = _Layers;

  // node_modules/three/src/core/Object3D.js
  var _object3DId = 0;
  var _v12 = /* @__PURE__ */ new Vector3();
  var _q1 = /* @__PURE__ */ new Quaternion();
  var _m12 = /* @__PURE__ */ new Matrix4();
  var _target = /* @__PURE__ */ new Vector3();
  var _position = /* @__PURE__ */ new Vector3();
  var _scale = /* @__PURE__ */ new Vector3();
  var _quaternion3 = /* @__PURE__ */ new Quaternion();
  var _xAxis = /* @__PURE__ */ new Vector3(1, 0, 0);
  var _yAxis = /* @__PURE__ */ new Vector3(0, 1, 0);
  var _zAxis = /* @__PURE__ */ new Vector3(0, 0, 1);
  var _addedEvent = { type: "added" };
  var _removedEvent = { type: "removed" };
  var _childaddedEvent = { type: "childadded", child: null };
  var _childremovedEvent = { type: "childremoved", child: null };
  var _Object3D = class _Object3D extends EventDispatcher {
    /**
     * Constructs a new 3D object.
     */
    constructor() {
      super();
      this.isObject3D = true;
      Object.defineProperty(this, "id", { value: _object3DId++ });
      this.uuid = generateUUID();
      this.name = "";
      this.type = "Object3D";
      this.parent = null;
      this.children = [];
      this.up = _Object3D.DEFAULT_UP.clone();
      const position = new Vector3();
      const rotation = new Euler();
      const quaternion = new Quaternion();
      const scale5 = new Vector3(1, 1, 1);
      function onRotationChange() {
        quaternion.setFromEuler(rotation, false);
      }
      __name(onRotationChange, "onRotationChange");
      function onQuaternionChange() {
        rotation.setFromQuaternion(quaternion, void 0, false);
      }
      __name(onQuaternionChange, "onQuaternionChange");
      rotation._onChange(onRotationChange);
      quaternion._onChange(onQuaternionChange);
      Object.defineProperties(this, {
        /**
         * Represents the object's local position.
         *
         * @name Object3D#position
         * @type {Vector3}
         * @default (0,0,0)
         */
        position: {
          configurable: true,
          enumerable: true,
          value: position
        },
        /**
         * Represents the object's local rotation as Euler angles, in radians.
         *
         * @name Object3D#rotation
         * @type {Euler}
         * @default (0,0,0)
         */
        rotation: {
          configurable: true,
          enumerable: true,
          value: rotation
        },
        /**
         * Represents the object's local rotation as Quaternions.
         *
         * @name Object3D#quaternion
         * @type {Quaternion}
         */
        quaternion: {
          configurable: true,
          enumerable: true,
          value: quaternion
        },
        /**
         * Represents the object's local scale.
         *
         * @name Object3D#scale
         * @type {Vector3}
         * @default (1,1,1)
         */
        scale: {
          configurable: true,
          enumerable: true,
          value: scale5
        },
        /**
         * Represents the object's model-view matrix.
         *
         * @name Object3D#modelViewMatrix
         * @type {Matrix4}
         */
        modelViewMatrix: {
          value: new Matrix4()
        },
        /**
         * Represents the object's normal matrix.
         *
         * @name Object3D#normalMatrix
         * @type {Matrix3}
         */
        normalMatrix: {
          value: new Matrix3()
        }
      });
      this.matrix = new Matrix4();
      this.matrixWorld = new Matrix4();
      this.matrixAutoUpdate = _Object3D.DEFAULT_MATRIX_AUTO_UPDATE;
      this.matrixWorldAutoUpdate = _Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE;
      this.matrixWorldNeedsUpdate = false;
      this.layers = new Layers();
      this.visible = true;
      this.castShadow = false;
      this.receiveShadow = false;
      this.frustumCulled = true;
      this.renderOrder = 0;
      this.animations = [];
      this.customDepthMaterial = void 0;
      this.customDistanceMaterial = void 0;
      this.userData = {};
    }
    /**
     * A callback that is executed immediately before a 3D object is rendered to a shadow map.
     *
     * @param {Renderer|WebGLRenderer} renderer - The renderer.
     * @param {Object3D} object - The 3D object.
     * @param {Camera} camera - The camera that is used to render the scene.
     * @param {Camera} shadowCamera - The shadow camera.
     * @param {BufferGeometry} geometry - The 3D object's geometry.
     * @param {Material} depthMaterial - The depth material.
     * @param {Object} group - The geometry group data.
     */
    onBeforeShadow() {
    }
    /**
     * A callback that is executed immediately after a 3D object is rendered to a shadow map.
     *
     * @param {Renderer|WebGLRenderer} renderer - The renderer.
     * @param {Object3D} object - The 3D object.
     * @param {Camera} camera - The camera that is used to render the scene.
     * @param {Camera} shadowCamera - The shadow camera.
     * @param {BufferGeometry} geometry - The 3D object's geometry.
     * @param {Material} depthMaterial - The depth material.
     * @param {Object} group - The geometry group data.
     */
    onAfterShadow() {
    }
    /**
     * A callback that is executed immediately before a 3D object is rendered.
     *
     * @param {Renderer|WebGLRenderer} renderer - The renderer.
     * @param {Object3D} object - The 3D object.
     * @param {Camera} camera - The camera that is used to render the scene.
     * @param {BufferGeometry} geometry - The 3D object's geometry.
     * @param {Material} material - The 3D object's material.
     * @param {Object} group - The geometry group data.
     */
    onBeforeRender() {
    }
    /**
     * A callback that is executed immediately after a 3D object is rendered.
     *
     * @param {Renderer|WebGLRenderer} renderer - The renderer.
     * @param {Object3D} object - The 3D object.
     * @param {Camera} camera - The camera that is used to render the scene.
     * @param {BufferGeometry} geometry - The 3D object's geometry.
     * @param {Material} material - The 3D object's material.
     * @param {Object} group - The geometry group data.
     */
    onAfterRender() {
    }
    /**
     * Applies the given transformation matrix to the object and updates the object's position,
     * rotation and scale.
     *
     * @param {Matrix4} matrix - The transformation matrix.
     */
    applyMatrix4(matrix) {
      if (this.matrixAutoUpdate) this.updateMatrix();
      this.matrix.premultiply(matrix);
      this.matrix.decompose(this.position, this.quaternion, this.scale);
    }
    /**
     * Applies a rotation represented by given the quaternion to the 3D object.
     *
     * @param {Quaternion} q - The quaternion.
     * @return {Object3D} A reference to this instance.
     */
    applyQuaternion(q) {
      this.quaternion.premultiply(q);
      return this;
    }
    /**
     * Sets the given rotation represented as an axis/angle couple to the 3D object.
     *
     * @param {Vector3} axis - The (normalized) axis vector.
     * @param {number} angle - The angle in radians.
     */
    setRotationFromAxisAngle(axis, angle2) {
      this.quaternion.setFromAxisAngle(axis, angle2);
    }
    /**
     * Sets the given rotation represented as Euler angles to the 3D object.
     *
     * @param {Euler} euler - The Euler angles.
     */
    setRotationFromEuler(euler) {
      this.quaternion.setFromEuler(euler, true);
    }
    /**
     * Sets the given rotation represented as rotation matrix to the 3D object.
     *
     * @param {Matrix4} m - Although a 4x4 matrix is expected, the upper 3x3 portion must be
     * a pure rotation matrix (i.e, unscaled).
     */
    setRotationFromMatrix(m) {
      this.quaternion.setFromRotationMatrix(m);
    }
    /**
     * Sets the given rotation represented as a Quaternion to the 3D object.
     *
     * @param {Quaternion} q - The Quaternion
     */
    setRotationFromQuaternion(q) {
      this.quaternion.copy(q);
    }
    /**
     * Rotates the 3D object along an axis in local space.
     *
     * @param {Vector3} axis - The (normalized) axis vector.
     * @param {number} angle - The angle in radians.
     * @return {Object3D} A reference to this instance.
     */
    rotateOnAxis(axis, angle2) {
      _q1.setFromAxisAngle(axis, angle2);
      this.quaternion.multiply(_q1);
      return this;
    }
    /**
     * Rotates the 3D object along an axis in world space.
     *
     * @param {Vector3} axis - The (normalized) axis vector.
     * @param {number} angle - The angle in radians.
     * @return {Object3D} A reference to this instance.
     */
    rotateOnWorldAxis(axis, angle2) {
      _q1.setFromAxisAngle(axis, angle2);
      this.quaternion.premultiply(_q1);
      return this;
    }
    /**
     * Rotates the 3D object around its X axis in local space.
     *
     * @param {number} angle - The angle in radians.
     * @return {Object3D} A reference to this instance.
     */
    rotateX(angle2) {
      return this.rotateOnAxis(_xAxis, angle2);
    }
    /**
     * Rotates the 3D object around its Y axis in local space.
     *
     * @param {number} angle - The angle in radians.
     * @return {Object3D} A reference to this instance.
     */
    rotateY(angle2) {
      return this.rotateOnAxis(_yAxis, angle2);
    }
    /**
     * Rotates the 3D object around its Z axis in local space.
     *
     * @param {number} angle - The angle in radians.
     * @return {Object3D} A reference to this instance.
     */
    rotateZ(angle2) {
      return this.rotateOnAxis(_zAxis, angle2);
    }
    /**
     * Translate the 3D object by a distance along the given axis in local space.
     *
     * @param {Vector3} axis - The (normalized) axis vector.
     * @param {number} distance - The distance in world units.
     * @return {Object3D} A reference to this instance.
     */
    translateOnAxis(axis, distance3) {
      _v12.copy(axis).applyQuaternion(this.quaternion);
      this.position.add(_v12.multiplyScalar(distance3));
      return this;
    }
    /**
     * Translate the 3D object by a distance along its X-axis in local space.
     *
     * @param {number} distance - The distance in world units.
     * @return {Object3D} A reference to this instance.
     */
    translateX(distance3) {
      return this.translateOnAxis(_xAxis, distance3);
    }
    /**
     * Translate the 3D object by a distance along its Y-axis in local space.
     *
     * @param {number} distance - The distance in world units.
     * @return {Object3D} A reference to this instance.
     */
    translateY(distance3) {
      return this.translateOnAxis(_yAxis, distance3);
    }
    /**
     * Translate the 3D object by a distance along its Z-axis in local space.
     *
     * @param {number} distance - The distance in world units.
     * @return {Object3D} A reference to this instance.
     */
    translateZ(distance3) {
      return this.translateOnAxis(_zAxis, distance3);
    }
    /**
     * Converts the given vector from this 3D object's local space to world space.
     *
     * @param {Vector3} vector - The vector to convert.
     * @return {Vector3} The converted vector.
     */
    localToWorld(vector) {
      this.updateWorldMatrix(true, false);
      return vector.applyMatrix4(this.matrixWorld);
    }
    /**
     * Converts the given vector from this 3D object's word space to local space.
     *
     * @param {Vector3} vector - The vector to convert.
     * @return {Vector3} The converted vector.
     */
    worldToLocal(vector) {
      this.updateWorldMatrix(true, false);
      return vector.applyMatrix4(_m12.copy(this.matrixWorld).invert());
    }
    /**
     * Rotates the object to face a point in world space.
     *
     * This method does not support objects having non-uniformly-scaled parent(s).
     *
     * @param {number|Vector3} x - The x coordinate in world space. Alternatively, a vector representing a position in world space
     * @param {number} [y] - The y coordinate in world space.
     * @param {number} [z] - The z coordinate in world space.
     */
    lookAt(x, y, z) {
      if (x.isVector3) {
        _target.copy(x);
      } else {
        _target.set(x, y, z);
      }
      const parent = this.parent;
      this.updateWorldMatrix(true, false);
      _position.setFromMatrixPosition(this.matrixWorld);
      if (this.isCamera || this.isLight) {
        _m12.lookAt(_position, _target, this.up);
      } else {
        _m12.lookAt(_target, _position, this.up);
      }
      this.quaternion.setFromRotationMatrix(_m12);
      if (parent) {
        _m12.extractRotation(parent.matrixWorld);
        _q1.setFromRotationMatrix(_m12);
        this.quaternion.premultiply(_q1.invert());
      }
    }
    /**
     * Adds the given 3D object as a child to this 3D object. An arbitrary number of
     * objects may be added. Any current parent on an object passed in here will be
     * removed, since an object can have at most one parent.
     *
     * @fires Object3D#added
     * @fires Object3D#childadded
     * @param {Object3D} object - The 3D object to add.
     * @return {Object3D} A reference to this instance.
     */
    add(object) {
      if (arguments.length > 1) {
        for (let i = 0; i < arguments.length; i++) {
          this.add(arguments[i]);
        }
        return this;
      }
      if (object === this) {
        console.error("THREE.Object3D.add: object can't be added as a child of itself.", object);
        return this;
      }
      if (object && object.isObject3D) {
        object.removeFromParent();
        object.parent = this;
        this.children.push(object);
        object.dispatchEvent(_addedEvent);
        _childaddedEvent.child = object;
        this.dispatchEvent(_childaddedEvent);
        _childaddedEvent.child = null;
      } else {
        console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", object);
      }
      return this;
    }
    /**
     * Removes the given 3D object as child from this 3D object.
     * An arbitrary number of objects may be removed.
     *
     * @fires Object3D#removed
     * @fires Object3D#childremoved
     * @param {Object3D} object - The 3D object to remove.
     * @return {Object3D} A reference to this instance.
     */
    remove(object) {
      if (arguments.length > 1) {
        for (let i = 0; i < arguments.length; i++) {
          this.remove(arguments[i]);
        }
        return this;
      }
      const index = this.children.indexOf(object);
      if (index !== -1) {
        object.parent = null;
        this.children.splice(index, 1);
        object.dispatchEvent(_removedEvent);
        _childremovedEvent.child = object;
        this.dispatchEvent(_childremovedEvent);
        _childremovedEvent.child = null;
      }
      return this;
    }
    /**
     * Removes this 3D object from its current parent.
     *
     * @fires Object3D#removed
     * @fires Object3D#childremoved
     * @return {Object3D} A reference to this instance.
     */
    removeFromParent() {
      const parent = this.parent;
      if (parent !== null) {
        parent.remove(this);
      }
      return this;
    }
    /**
     * Removes all child objects.
     *
     * @fires Object3D#removed
     * @fires Object3D#childremoved
     * @return {Object3D} A reference to this instance.
     */
    clear() {
      return this.remove(...this.children);
    }
    /**
     * Adds the given 3D object as a child of this 3D object, while maintaining the object's world
     * transform. This method does not support scene graphs having non-uniformly-scaled nodes(s).
     *
     * @fires Object3D#added
     * @fires Object3D#childadded
     * @param {Object3D} object - The 3D object to attach.
     * @return {Object3D} A reference to this instance.
     */
    attach(object) {
      this.updateWorldMatrix(true, false);
      _m12.copy(this.matrixWorld).invert();
      if (object.parent !== null) {
        object.parent.updateWorldMatrix(true, false);
        _m12.multiply(object.parent.matrixWorld);
      }
      object.applyMatrix4(_m12);
      object.removeFromParent();
      object.parent = this;
      this.children.push(object);
      object.updateWorldMatrix(false, true);
      object.dispatchEvent(_addedEvent);
      _childaddedEvent.child = object;
      this.dispatchEvent(_childaddedEvent);
      _childaddedEvent.child = null;
      return this;
    }
    /**
     * Searches through the 3D object and its children, starting with the 3D object
     * itself, and returns the first with a matching ID.
     *
     * @param {number} id - The id.
     * @return {Object3D|undefined} The found 3D object. Returns `undefined` if no 3D object has been found.
     */
    getObjectById(id) {
      return this.getObjectByProperty("id", id);
    }
    /**
     * Searches through the 3D object and its children, starting with the 3D object
     * itself, and returns the first with a matching name.
     *
     * @param {string} name - The name.
     * @return {Object3D|undefined} The found 3D object. Returns `undefined` if no 3D object has been found.
     */
    getObjectByName(name) {
      return this.getObjectByProperty("name", name);
    }
    /**
     * Searches through the 3D object and its children, starting with the 3D object
     * itself, and returns the first with a matching property value.
     *
     * @param {string} name - The name of the property.
     * @param {any} value - The value.
     * @return {Object3D|undefined} The found 3D object. Returns `undefined` if no 3D object has been found.
     */
    getObjectByProperty(name, value) {
      if (this[name] === value) return this;
      for (let i = 0, l = this.children.length; i < l; i++) {
        const child = this.children[i];
        const object = child.getObjectByProperty(name, value);
        if (object !== void 0) {
          return object;
        }
      }
      return void 0;
    }
    /**
     * Searches through the 3D object and its children, starting with the 3D object
     * itself, and returns all 3D objects with a matching property value.
     *
     * @param {string} name - The name of the property.
     * @param {any} value - The value.
     * @param {Array<Object3D>} result - The method stores the result in this array.
     * @return {Array<Object3D>} The found 3D objects.
     */
    getObjectsByProperty(name, value, result = []) {
      if (this[name] === value) result.push(this);
      const children = this.children;
      for (let i = 0, l = children.length; i < l; i++) {
        children[i].getObjectsByProperty(name, value, result);
      }
      return result;
    }
    /**
     * Returns a vector representing the position of the 3D object in world space.
     *
     * @param {Vector3} target - The target vector the result is stored to.
     * @return {Vector3} The 3D object's position in world space.
     */
    getWorldPosition(target) {
      this.updateWorldMatrix(true, false);
      return target.setFromMatrixPosition(this.matrixWorld);
    }
    /**
     * Returns a Quaternion representing the position of the 3D object in world space.
     *
     * @param {Quaternion} target - The target Quaternion the result is stored to.
     * @return {Quaternion} The 3D object's rotation in world space.
     */
    getWorldQuaternion(target) {
      this.updateWorldMatrix(true, false);
      this.matrixWorld.decompose(_position, target, _scale);
      return target;
    }
    /**
     * Returns a vector representing the scale of the 3D object in world space.
     *
     * @param {Vector3} target - The target vector the result is stored to.
     * @return {Vector3} The 3D object's scale in world space.
     */
    getWorldScale(target) {
      this.updateWorldMatrix(true, false);
      this.matrixWorld.decompose(_position, _quaternion3, target);
      return target;
    }
    /**
     * Returns a vector representing the ("look") direction of the 3D object in world space.
     *
     * @param {Vector3} target - The target vector the result is stored to.
     * @return {Vector3} The 3D object's direction in world space.
     */
    getWorldDirection(target) {
      this.updateWorldMatrix(true, false);
      const e = this.matrixWorld.elements;
      return target.set(e[8], e[9], e[10]).normalize();
    }
    /**
     * Abstract method to get intersections between a casted ray and this
     * 3D object. Renderable 3D objects such as {@link Mesh}, {@link Line} or {@link Points}
     * implement this method in order to use raycasting.
     *
     * @abstract
     * @param {Raycaster} raycaster - The raycaster.
     * @param {Array<Object>} intersects - An array holding the result of the method.
     */
    raycast() {
    }
    /**
     * Executes the callback on this 3D object and all descendants.
     *
     * Note: Modifying the scene graph inside the callback is discouraged.
     *
     * @param {Function} callback - A callback function that allows to process the current 3D object.
     */
    traverse(callback) {
      callback(this);
      const children = this.children;
      for (let i = 0, l = children.length; i < l; i++) {
        children[i].traverse(callback);
      }
    }
    /**
     * Like {@link Object3D#traverse}, but the callback will only be executed for visible 3D objects.
     * Descendants of invisible 3D objects are not traversed.
     *
     * Note: Modifying the scene graph inside the callback is discouraged.
     *
     * @param {Function} callback - A callback function that allows to process the current 3D object.
     */
    traverseVisible(callback) {
      if (this.visible === false) return;
      callback(this);
      const children = this.children;
      for (let i = 0, l = children.length; i < l; i++) {
        children[i].traverseVisible(callback);
      }
    }
    /**
     * Like {@link Object3D#traverse}, but the callback will only be executed for all ancestors.
     *
     * Note: Modifying the scene graph inside the callback is discouraged.
     *
     * @param {Function} callback - A callback function that allows to process the current 3D object.
     */
    traverseAncestors(callback) {
      const parent = this.parent;
      if (parent !== null) {
        callback(parent);
        parent.traverseAncestors(callback);
      }
    }
    /**
     * Updates the transformation matrix in local space by computing it from the current
     * position, rotation and scale values.
     */
    updateMatrix() {
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.matrixWorldNeedsUpdate = true;
    }
    /**
     * Updates the transformation matrix in world space of this 3D objects and its descendants.
     *
     * To ensure correct results, this method also recomputes the 3D object's transformation matrix in
     * local space. The computation of the local and world matrix can be controlled with the
     * {@link Object3D#matrixAutoUpdate} and {@link Object3D#matrixWorldAutoUpdate} flags which are both
     * `true` by default.  Set these flags to `false` if you need more control over the update matrix process.
     *
     * @param {boolean} [force=false] - When set to `true`, a recomputation of world matrices is forced even
     * when {@link Object3D#matrixWorldAutoUpdate} is set to `false`.
     */
    updateMatrixWorld(force) {
      if (this.matrixAutoUpdate) this.updateMatrix();
      if (this.matrixWorldNeedsUpdate || force) {
        if (this.matrixWorldAutoUpdate === true) {
          if (this.parent === null) {
            this.matrixWorld.copy(this.matrix);
          } else {
            this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
          }
        }
        this.matrixWorldNeedsUpdate = false;
        force = true;
      }
      const children = this.children;
      for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];
        child.updateMatrixWorld(force);
      }
    }
    /**
     * An alternative version of {@link Object3D#updateMatrixWorld} with more control over the
     * update of ancestor and descendant nodes.
     *
     * @param {boolean} [updateParents=false] Whether ancestor nodes should be updated or not.
     * @param {boolean} [updateChildren=false] Whether descendant nodes should be updated or not.
     */
    updateWorldMatrix(updateParents, updateChildren) {
      const parent = this.parent;
      if (updateParents === true && parent !== null) {
        parent.updateWorldMatrix(true, false);
      }
      if (this.matrixAutoUpdate) this.updateMatrix();
      if (this.matrixWorldAutoUpdate === true) {
        if (this.parent === null) {
          this.matrixWorld.copy(this.matrix);
        } else {
          this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
        }
      }
      if (updateChildren === true) {
        const children = this.children;
        for (let i = 0, l = children.length; i < l; i++) {
          const child = children[i];
          child.updateWorldMatrix(false, true);
        }
      }
    }
    /**
     * Serializes the 3D object into JSON.
     *
     * @param {?(Object|string)} meta - An optional value holding meta information about the serialization.
     * @return {Object} A JSON object representing the serialized 3D object.
     * @see {@link ObjectLoader#parse}
     */
    toJSON(meta) {
      const isRootObject = meta === void 0 || typeof meta === "string";
      const output = {};
      if (isRootObject) {
        meta = {
          geometries: {},
          materials: {},
          textures: {},
          images: {},
          shapes: {},
          skeletons: {},
          animations: {},
          nodes: {}
        };
        output.metadata = {
          version: 4.7,
          type: "Object",
          generator: "Object3D.toJSON"
        };
      }
      const object = {};
      object.uuid = this.uuid;
      object.type = this.type;
      if (this.name !== "") object.name = this.name;
      if (this.castShadow === true) object.castShadow = true;
      if (this.receiveShadow === true) object.receiveShadow = true;
      if (this.visible === false) object.visible = false;
      if (this.frustumCulled === false) object.frustumCulled = false;
      if (this.renderOrder !== 0) object.renderOrder = this.renderOrder;
      if (Object.keys(this.userData).length > 0) object.userData = this.userData;
      object.layers = this.layers.mask;
      object.matrix = this.matrix.toArray();
      object.up = this.up.toArray();
      if (this.matrixAutoUpdate === false) object.matrixAutoUpdate = false;
      if (this.isInstancedMesh) {
        object.type = "InstancedMesh";
        object.count = this.count;
        object.instanceMatrix = this.instanceMatrix.toJSON();
        if (this.instanceColor !== null) object.instanceColor = this.instanceColor.toJSON();
      }
      if (this.isBatchedMesh) {
        object.type = "BatchedMesh";
        object.perObjectFrustumCulled = this.perObjectFrustumCulled;
        object.sortObjects = this.sortObjects;
        object.drawRanges = this._drawRanges;
        object.reservedRanges = this._reservedRanges;
        object.geometryInfo = this._geometryInfo.map((info) => ({
          ...info,
          boundingBox: info.boundingBox ? info.boundingBox.toJSON() : void 0,
          boundingSphere: info.boundingSphere ? info.boundingSphere.toJSON() : void 0
        }));
        object.instanceInfo = this._instanceInfo.map((info) => ({ ...info }));
        object.availableInstanceIds = this._availableInstanceIds.slice();
        object.availableGeometryIds = this._availableGeometryIds.slice();
        object.nextIndexStart = this._nextIndexStart;
        object.nextVertexStart = this._nextVertexStart;
        object.geometryCount = this._geometryCount;
        object.maxInstanceCount = this._maxInstanceCount;
        object.maxVertexCount = this._maxVertexCount;
        object.maxIndexCount = this._maxIndexCount;
        object.geometryInitialized = this._geometryInitialized;
        object.matricesTexture = this._matricesTexture.toJSON(meta);
        object.indirectTexture = this._indirectTexture.toJSON(meta);
        if (this._colorsTexture !== null) {
          object.colorsTexture = this._colorsTexture.toJSON(meta);
        }
        if (this.boundingSphere !== null) {
          object.boundingSphere = this.boundingSphere.toJSON();
        }
        if (this.boundingBox !== null) {
          object.boundingBox = this.boundingBox.toJSON();
        }
      }
      function serialize(library, element) {
        if (library[element.uuid] === void 0) {
          library[element.uuid] = element.toJSON(meta);
        }
        return element.uuid;
      }
      __name(serialize, "serialize");
      if (this.isScene) {
        if (this.background) {
          if (this.background.isColor) {
            object.background = this.background.toJSON();
          } else if (this.background.isTexture) {
            object.background = this.background.toJSON(meta).uuid;
          }
        }
        if (this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== true) {
          object.environment = this.environment.toJSON(meta).uuid;
        }
      } else if (this.isMesh || this.isLine || this.isPoints) {
        object.geometry = serialize(meta.geometries, this.geometry);
        const parameters = this.geometry.parameters;
        if (parameters !== void 0 && parameters.shapes !== void 0) {
          const shapes = parameters.shapes;
          if (Array.isArray(shapes)) {
            for (let i = 0, l = shapes.length; i < l; i++) {
              const shape = shapes[i];
              serialize(meta.shapes, shape);
            }
          } else {
            serialize(meta.shapes, shapes);
          }
        }
      }
      if (this.isSkinnedMesh) {
        object.bindMode = this.bindMode;
        object.bindMatrix = this.bindMatrix.toArray();
        if (this.skeleton !== void 0) {
          serialize(meta.skeletons, this.skeleton);
          object.skeleton = this.skeleton.uuid;
        }
      }
      if (this.material !== void 0) {
        if (Array.isArray(this.material)) {
          const uuids = [];
          for (let i = 0, l = this.material.length; i < l; i++) {
            uuids.push(serialize(meta.materials, this.material[i]));
          }
          object.material = uuids;
        } else {
          object.material = serialize(meta.materials, this.material);
        }
      }
      if (this.children.length > 0) {
        object.children = [];
        for (let i = 0; i < this.children.length; i++) {
          object.children.push(this.children[i].toJSON(meta).object);
        }
      }
      if (this.animations.length > 0) {
        object.animations = [];
        for (let i = 0; i < this.animations.length; i++) {
          const animation = this.animations[i];
          object.animations.push(serialize(meta.animations, animation));
        }
      }
      if (isRootObject) {
        const geometries = extractFromCache(meta.geometries);
        const materials = extractFromCache(meta.materials);
        const textures = extractFromCache(meta.textures);
        const images = extractFromCache(meta.images);
        const shapes = extractFromCache(meta.shapes);
        const skeletons = extractFromCache(meta.skeletons);
        const animations = extractFromCache(meta.animations);
        const nodes = extractFromCache(meta.nodes);
        if (geometries.length > 0) output.geometries = geometries;
        if (materials.length > 0) output.materials = materials;
        if (textures.length > 0) output.textures = textures;
        if (images.length > 0) output.images = images;
        if (shapes.length > 0) output.shapes = shapes;
        if (skeletons.length > 0) output.skeletons = skeletons;
        if (animations.length > 0) output.animations = animations;
        if (nodes.length > 0) output.nodes = nodes;
      }
      output.object = object;
      return output;
      function extractFromCache(cache) {
        const values = [];
        for (const key in cache) {
          const data = cache[key];
          delete data.metadata;
          values.push(data);
        }
        return values;
      }
      __name(extractFromCache, "extractFromCache");
    }
    /**
     * Returns a new 3D object with copied values from this instance.
     *
     * @param {boolean} [recursive=true] - When set to `true`, descendants of the 3D object are also cloned.
     * @return {Object3D} A clone of this instance.
     */
    clone(recursive) {
      return new this.constructor().copy(this, recursive);
    }
    /**
     * Copies the values of the given 3D object to this instance.
     *
     * @param {Object3D} source - The 3D object to copy.
     * @param {boolean} [recursive=true] - When set to `true`, descendants of the 3D object are cloned.
     * @return {Object3D} A reference to this instance.
     */
    copy(source, recursive = true) {
      this.name = source.name;
      this.up.copy(source.up);
      this.position.copy(source.position);
      this.rotation.order = source.rotation.order;
      this.quaternion.copy(source.quaternion);
      this.scale.copy(source.scale);
      this.matrix.copy(source.matrix);
      this.matrixWorld.copy(source.matrixWorld);
      this.matrixAutoUpdate = source.matrixAutoUpdate;
      this.matrixWorldAutoUpdate = source.matrixWorldAutoUpdate;
      this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;
      this.layers.mask = source.layers.mask;
      this.visible = source.visible;
      this.castShadow = source.castShadow;
      this.receiveShadow = source.receiveShadow;
      this.frustumCulled = source.frustumCulled;
      this.renderOrder = source.renderOrder;
      this.animations = source.animations.slice();
      this.userData = JSON.parse(JSON.stringify(source.userData));
      if (recursive === true) {
        for (let i = 0; i < source.children.length; i++) {
          const child = source.children[i];
          this.add(child.clone());
        }
      }
      return this;
    }
  };
  __name(_Object3D, "Object3D");
  var Object3D = _Object3D;
  Object3D.DEFAULT_UP = /* @__PURE__ */ new Vector3(0, 1, 0);
  Object3D.DEFAULT_MATRIX_AUTO_UPDATE = true;
  Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = true;

  // node_modules/three/src/cameras/Camera.js
  var _Camera2 = class _Camera2 extends Object3D {
    /**
     * Constructs a new camera.
     */
    constructor() {
      super();
      this.isCamera = true;
      this.type = "Camera";
      this.matrixWorldInverse = new Matrix4();
      this.projectionMatrix = new Matrix4();
      this.projectionMatrixInverse = new Matrix4();
      this.coordinateSystem = WebGLCoordinateSystem;
    }
    copy(source, recursive) {
      super.copy(source, recursive);
      this.matrixWorldInverse.copy(source.matrixWorldInverse);
      this.projectionMatrix.copy(source.projectionMatrix);
      this.projectionMatrixInverse.copy(source.projectionMatrixInverse);
      this.coordinateSystem = source.coordinateSystem;
      return this;
    }
    /**
     * Returns a vector representing the ("look") direction of the 3D object in world space.
     *
     * This method is overwritten since cameras have a different forward vector compared to other
     * 3D objects. A camera looks down its local, negative z-axis by default.
     *
     * @param {Vector3} target - The target vector the result is stored to.
     * @return {Vector3} The 3D object's direction in world space.
     */
    getWorldDirection(target) {
      return super.getWorldDirection(target).negate();
    }
    updateMatrixWorld(force) {
      super.updateMatrixWorld(force);
      this.matrixWorldInverse.copy(this.matrixWorld).invert();
    }
    updateWorldMatrix(updateParents, updateChildren) {
      super.updateWorldMatrix(updateParents, updateChildren);
      this.matrixWorldInverse.copy(this.matrixWorld).invert();
    }
    clone() {
      return new this.constructor().copy(this);
    }
  };
  __name(_Camera2, "Camera");
  var Camera2 = _Camera2;

  // node_modules/three/src/cameras/PerspectiveCamera.js
  var _v3 = /* @__PURE__ */ new Vector3();
  var _minTarget = /* @__PURE__ */ new Vector2();
  var _maxTarget = /* @__PURE__ */ new Vector2();
  var _PerspectiveCamera2 = class _PerspectiveCamera2 extends Camera2 {
    /**
     * Constructs a new perspective camera.
     *
     * @param {number} [fov=50] - The vertical field of view.
     * @param {number} [aspect=1] - The aspect ratio.
     * @param {number} [near=0.1] - The camera's near plane.
     * @param {number} [far=2000] - The camera's far plane.
     */
    constructor(fov = 50, aspect = 1, near = 0.1, far = 2e3) {
      super();
      this.isPerspectiveCamera = true;
      this.type = "PerspectiveCamera";
      this.fov = fov;
      this.zoom = 1;
      this.near = near;
      this.far = far;
      this.focus = 10;
      this.aspect = aspect;
      this.view = null;
      this.filmGauge = 35;
      this.filmOffset = 0;
      this.updateProjectionMatrix();
    }
    copy(source, recursive) {
      super.copy(source, recursive);
      this.fov = source.fov;
      this.zoom = source.zoom;
      this.near = source.near;
      this.far = source.far;
      this.focus = source.focus;
      this.aspect = source.aspect;
      this.view = source.view === null ? null : Object.assign({}, source.view);
      this.filmGauge = source.filmGauge;
      this.filmOffset = source.filmOffset;
      return this;
    }
    /**
     * Sets the FOV by focal length in respect to the current {@link PerspectiveCamera#filmGauge}.
     *
     * The default film gauge is 35, so that the focal length can be specified for
     * a 35mm (full frame) camera.
     *
     * @param {number} focalLength - Values for focal length and film gauge must have the same unit.
     */
    setFocalLength(focalLength) {
      const vExtentSlope = 0.5 * this.getFilmHeight() / focalLength;
      this.fov = RAD2DEG * 2 * Math.atan(vExtentSlope);
      this.updateProjectionMatrix();
    }
    /**
     * Returns the focal length from the current {@link PerspectiveCamera#fov} and
     * {@link PerspectiveCamera#filmGauge}.
     *
     * @return {number} The computed focal length.
     */
    getFocalLength() {
      const vExtentSlope = Math.tan(DEG2RAD * 0.5 * this.fov);
      return 0.5 * this.getFilmHeight() / vExtentSlope;
    }
    /**
     * Returns the current vertical field of view angle in degrees considering {@link PerspectiveCamera#zoom}.
     *
     * @return {number} The effective FOV.
     */
    getEffectiveFOV() {
      return RAD2DEG * 2 * Math.atan(
        Math.tan(DEG2RAD * 0.5 * this.fov) / this.zoom
      );
    }
    /**
     * Returns the width of the image on the film. If {@link PerspectiveCamera#aspect} is greater than or
     * equal to one (landscape format), the result equals {@link PerspectiveCamera#filmGauge}.
     *
     * @return {number} The film width.
     */
    getFilmWidth() {
      return this.filmGauge * Math.min(this.aspect, 1);
    }
    /**
     * Returns the height of the image on the film. If {@link PerspectiveCamera#aspect} is greater than or
     * equal to one (landscape format), the result equals {@link PerspectiveCamera#filmGauge}.
     *
     * @return {number} The film width.
     */
    getFilmHeight() {
      return this.filmGauge / Math.max(this.aspect, 1);
    }
    /**
     * Computes the 2D bounds of the camera's viewable rectangle at a given distance along the viewing direction.
     * Sets `minTarget` and `maxTarget` to the coordinates of the lower-left and upper-right corners of the view rectangle.
     *
     * @param {number} distance - The viewing distance.
     * @param {Vector2} minTarget - The lower-left corner of the view rectangle is written into this vector.
     * @param {Vector2} maxTarget - The upper-right corner of the view rectangle is written into this vector.
     */
    getViewBounds(distance3, minTarget, maxTarget) {
      _v3.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse);
      minTarget.set(_v3.x, _v3.y).multiplyScalar(-distance3 / _v3.z);
      _v3.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse);
      maxTarget.set(_v3.x, _v3.y).multiplyScalar(-distance3 / _v3.z);
    }
    /**
     * Computes the width and height of the camera's viewable rectangle at a given distance along the viewing direction.
     *
     * @param {number} distance - The viewing distance.
     * @param {Vector2} target - The target vector that is used to store result where x is width and y is height.
     * @returns {Vector2} The view size.
     */
    getViewSize(distance3, target) {
      this.getViewBounds(distance3, _minTarget, _maxTarget);
      return target.subVectors(_maxTarget, _minTarget);
    }
    /**
     * Sets an offset in a larger frustum. This is useful for multi-window or
     * multi-monitor/multi-machine setups.
     *
     * For example, if you have 3x2 monitors and each monitor is 1920x1080 and
     * the monitors are in grid like this
     *```
     *   +---+---+---+
     *   | A | B | C |
     *   +---+---+---+
     *   | D | E | F |
     *   +---+---+---+
     *```
     * then for each monitor you would call it like this:
     *```js
     * const w = 1920;
     * const h = 1080;
     * const fullWidth = w * 3;
     * const fullHeight = h * 2;
     *
     * // --A--
     * camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 0, w, h );
     * // --B--
     * camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 0, w, h );
     * // --C--
     * camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 0, w, h );
     * // --D--
     * camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 1, w, h );
     * // --E--
     * camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 1, w, h );
     * // --F--
     * camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 1, w, h );
     * ```
     *
     * Note there is no reason monitors have to be the same size or in a grid.
     *
     * @param {number} fullWidth - The full width of multiview setup.
     * @param {number} fullHeight - The full height of multiview setup.
     * @param {number} x - The horizontal offset of the subcamera.
     * @param {number} y - The vertical offset of the subcamera.
     * @param {number} width - The width of subcamera.
     * @param {number} height - The height of subcamera.
     */
    setViewOffset(fullWidth, fullHeight, x, y, width, height) {
      this.aspect = fullWidth / fullHeight;
      if (this.view === null) {
        this.view = {
          enabled: true,
          fullWidth: 1,
          fullHeight: 1,
          offsetX: 0,
          offsetY: 0,
          width: 1,
          height: 1
        };
      }
      this.view.enabled = true;
      this.view.fullWidth = fullWidth;
      this.view.fullHeight = fullHeight;
      this.view.offsetX = x;
      this.view.offsetY = y;
      this.view.width = width;
      this.view.height = height;
      this.updateProjectionMatrix();
    }
    /**
     * Removes the view offset from the projection matrix.
     */
    clearViewOffset() {
      if (this.view !== null) {
        this.view.enabled = false;
      }
      this.updateProjectionMatrix();
    }
    /**
     * Updates the camera's projection matrix. Must be called after any change of
     * camera properties.
     */
    updateProjectionMatrix() {
      const near = this.near;
      let top = near * Math.tan(DEG2RAD * 0.5 * this.fov) / this.zoom;
      let height = 2 * top;
      let width = this.aspect * height;
      let left = -0.5 * width;
      const view = this.view;
      if (this.view !== null && this.view.enabled) {
        const fullWidth = view.fullWidth, fullHeight = view.fullHeight;
        left += view.offsetX * width / fullWidth;
        top -= view.offsetY * height / fullHeight;
        width *= view.width / fullWidth;
        height *= view.height / fullHeight;
      }
      const skew = this.filmOffset;
      if (skew !== 0) left += near * skew / this.getFilmWidth();
      this.projectionMatrix.makePerspective(left, left + width, top, top - height, near, this.far, this.coordinateSystem);
      this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
    }
    toJSON(meta) {
      const data = super.toJSON(meta);
      data.object.fov = this.fov;
      data.object.zoom = this.zoom;
      data.object.near = this.near;
      data.object.far = this.far;
      data.object.focus = this.focus;
      data.object.aspect = this.aspect;
      if (this.view !== null) data.object.view = Object.assign({}, this.view);
      data.object.filmGauge = this.filmGauge;
      data.object.filmOffset = this.filmOffset;
      return data;
    }
  };
  __name(_PerspectiveCamera2, "PerspectiveCamera");
  var PerspectiveCamera2 = _PerspectiveCamera2;

  // node_modules/three/examples/jsm/controls/OrbitControls.js
  var _changeEvent = { type: "change" };
  var _startEvent = { type: "start" };
  var _endEvent = { type: "end" };
  var _ray = new Ray();
  var _plane = new Plane();
  var _TILT_LIMIT = Math.cos(70 * MathUtils_exports.DEG2RAD);
  var _v = new Vector3();
  var _twoPI = 2 * Math.PI;
  var _STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_PAN: 4,
    TOUCH_DOLLY_PAN: 5,
    TOUCH_DOLLY_ROTATE: 6
  };
  var _EPS = 1e-6;
  var _OrbitControls = class _OrbitControls extends Controls {
    /**
     * Constructs a new controls instance.
     *
     * @param {Object3D} object - The object that is managed by the controls.
     * @param {?HTMLDOMElement} domElement - The HTML element used for event listeners.
     */
    constructor(object, domElement = null) {
      super(object, domElement);
      this.state = _STATE.NONE;
      this.target = new Vector3();
      this.cursor = new Vector3();
      this.minDistance = 0;
      this.maxDistance = Infinity;
      this.minZoom = 0;
      this.maxZoom = Infinity;
      this.minTargetRadius = 0;
      this.maxTargetRadius = Infinity;
      this.minPolarAngle = 0;
      this.maxPolarAngle = Math.PI;
      this.minAzimuthAngle = -Infinity;
      this.maxAzimuthAngle = Infinity;
      this.enableDamping = false;
      this.dampingFactor = 0.05;
      this.enableZoom = true;
      this.zoomSpeed = 1;
      this.enableRotate = true;
      this.rotateSpeed = 1;
      this.keyRotateSpeed = 1;
      this.enablePan = true;
      this.panSpeed = 1;
      this.screenSpacePanning = true;
      this.keyPanSpeed = 7;
      this.zoomToCursor = false;
      this.autoRotate = false;
      this.autoRotateSpeed = 2;
      this.keys = { LEFT: "ArrowLeft", UP: "ArrowUp", RIGHT: "ArrowRight", BOTTOM: "ArrowDown" };
      this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
      this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
      this.target0 = this.target.clone();
      this.position0 = this.object.position.clone();
      this.zoom0 = this.object.zoom;
      this._domElementKeyEvents = null;
      this._lastPosition = new Vector3();
      this._lastQuaternion = new Quaternion();
      this._lastTargetPosition = new Vector3();
      this._quat = new Quaternion().setFromUnitVectors(object.up, new Vector3(0, 1, 0));
      this._quatInverse = this._quat.clone().invert();
      this._spherical = new Spherical();
      this._sphericalDelta = new Spherical();
      this._scale = 1;
      this._panOffset = new Vector3();
      this._rotateStart = new Vector2();
      this._rotateEnd = new Vector2();
      this._rotateDelta = new Vector2();
      this._panStart = new Vector2();
      this._panEnd = new Vector2();
      this._panDelta = new Vector2();
      this._dollyStart = new Vector2();
      this._dollyEnd = new Vector2();
      this._dollyDelta = new Vector2();
      this._dollyDirection = new Vector3();
      this._mouse = new Vector2();
      this._performCursorZoom = false;
      this._pointers = [];
      this._pointerPositions = {};
      this._controlActive = false;
      this._onPointerMove = onPointerMove.bind(this);
      this._onPointerDown = onPointerDown.bind(this);
      this._onPointerUp = onPointerUp.bind(this);
      this._onContextMenu = onContextMenu.bind(this);
      this._onMouseWheel = onMouseWheel.bind(this);
      this._onKeyDown = onKeyDown.bind(this);
      this._onTouchStart = onTouchStart.bind(this);
      this._onTouchMove = onTouchMove.bind(this);
      this._onMouseDown = onMouseDown.bind(this);
      this._onMouseMove = onMouseMove.bind(this);
      this._interceptControlDown = interceptControlDown.bind(this);
      this._interceptControlUp = interceptControlUp.bind(this);
      if (this.domElement !== null) {
        this.connect(this.domElement);
      }
      this.update();
    }
    connect(element) {
      super.connect(element);
      this.domElement.addEventListener("pointerdown", this._onPointerDown);
      this.domElement.addEventListener("pointercancel", this._onPointerUp);
      this.domElement.addEventListener("contextmenu", this._onContextMenu);
      this.domElement.addEventListener("wheel", this._onMouseWheel, { passive: false });
      const document = this.domElement.getRootNode();
      document.addEventListener("keydown", this._interceptControlDown, { passive: true, capture: true });
      this.domElement.style.touchAction = "none";
    }
    disconnect() {
      this.domElement.removeEventListener("pointerdown", this._onPointerDown);
      this.domElement.removeEventListener("pointermove", this._onPointerMove);
      this.domElement.removeEventListener("pointerup", this._onPointerUp);
      this.domElement.removeEventListener("pointercancel", this._onPointerUp);
      this.domElement.removeEventListener("wheel", this._onMouseWheel);
      this.domElement.removeEventListener("contextmenu", this._onContextMenu);
      this.stopListenToKeyEvents();
      const document = this.domElement.getRootNode();
      document.removeEventListener("keydown", this._interceptControlDown, { capture: true });
      this.domElement.style.touchAction = "auto";
    }
    dispose() {
      this.disconnect();
    }
    /**
     * Get the current vertical rotation, in radians.
     *
     * @return {number} The current vertical rotation, in radians.
     */
    getPolarAngle() {
      return this._spherical.phi;
    }
    /**
     * Get the current horizontal rotation, in radians.
     *
     * @return {number} The current horizontal rotation, in radians.
     */
    getAzimuthalAngle() {
      return this._spherical.theta;
    }
    /**
     * Returns the distance from the camera to the target.
     *
     * @return {number} The distance from the camera to the target.
     */
    getDistance() {
      return this.object.position.distanceTo(this.target);
    }
    /**
     * Adds key event listeners to the given DOM element.
     * `window` is a recommended argument for using this method.
     *
     * @param {HTMLDOMElement} domElement - The DOM element
     */
    listenToKeyEvents(domElement) {
      domElement.addEventListener("keydown", this._onKeyDown);
      this._domElementKeyEvents = domElement;
    }
    /**
     * Removes the key event listener previously defined with `listenToKeyEvents()`.
     */
    stopListenToKeyEvents() {
      if (this._domElementKeyEvents !== null) {
        this._domElementKeyEvents.removeEventListener("keydown", this._onKeyDown);
        this._domElementKeyEvents = null;
      }
    }
    /**
     * Save the current state of the controls. This can later be recovered with `reset()`.
     */
    saveState() {
      this.target0.copy(this.target);
      this.position0.copy(this.object.position);
      this.zoom0 = this.object.zoom;
    }
    /**
     * Reset the controls to their state from either the last time the `saveState()`
     * was called, or the initial state.
     */
    reset() {
      this.target.copy(this.target0);
      this.object.position.copy(this.position0);
      this.object.zoom = this.zoom0;
      this.object.updateProjectionMatrix();
      this.dispatchEvent(_changeEvent);
      this.update();
      this.state = _STATE.NONE;
    }
    update(deltaTime = null) {
      const position = this.object.position;
      _v.copy(position).sub(this.target);
      _v.applyQuaternion(this._quat);
      this._spherical.setFromVector3(_v);
      if (this.autoRotate && this.state === _STATE.NONE) {
        this._rotateLeft(this._getAutoRotationAngle(deltaTime));
      }
      if (this.enableDamping) {
        this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor;
        this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor;
      } else {
        this._spherical.theta += this._sphericalDelta.theta;
        this._spherical.phi += this._sphericalDelta.phi;
      }
      let min3 = this.minAzimuthAngle;
      let max3 = this.maxAzimuthAngle;
      if (isFinite(min3) && isFinite(max3)) {
        if (min3 < -Math.PI) min3 += _twoPI;
        else if (min3 > Math.PI) min3 -= _twoPI;
        if (max3 < -Math.PI) max3 += _twoPI;
        else if (max3 > Math.PI) max3 -= _twoPI;
        if (min3 <= max3) {
          this._spherical.theta = Math.max(min3, Math.min(max3, this._spherical.theta));
        } else {
          this._spherical.theta = this._spherical.theta > (min3 + max3) / 2 ? Math.max(min3, this._spherical.theta) : Math.min(max3, this._spherical.theta);
        }
      }
      this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi));
      this._spherical.makeSafe();
      if (this.enableDamping === true) {
        this.target.addScaledVector(this._panOffset, this.dampingFactor);
      } else {
        this.target.add(this._panOffset);
      }
      this.target.sub(this.cursor);
      this.target.clampLength(this.minTargetRadius, this.maxTargetRadius);
      this.target.add(this.cursor);
      let zoomChanged = false;
      if (this.zoomToCursor && this._performCursorZoom || this.object.isOrthographicCamera) {
        this._spherical.radius = this._clampDistance(this._spherical.radius);
      } else {
        const prevRadius = this._spherical.radius;
        this._spherical.radius = this._clampDistance(this._spherical.radius * this._scale);
        zoomChanged = prevRadius != this._spherical.radius;
      }
      _v.setFromSpherical(this._spherical);
      _v.applyQuaternion(this._quatInverse);
      position.copy(this.target).add(_v);
      this.object.lookAt(this.target);
      if (this.enableDamping === true) {
        this._sphericalDelta.theta *= 1 - this.dampingFactor;
        this._sphericalDelta.phi *= 1 - this.dampingFactor;
        this._panOffset.multiplyScalar(1 - this.dampingFactor);
      } else {
        this._sphericalDelta.set(0, 0, 0);
        this._panOffset.set(0, 0, 0);
      }
      if (this.zoomToCursor && this._performCursorZoom) {
        let newRadius = null;
        if (this.object.isPerspectiveCamera) {
          const prevRadius = _v.length();
          newRadius = this._clampDistance(prevRadius * this._scale);
          const radiusDelta = prevRadius - newRadius;
          this.object.position.addScaledVector(this._dollyDirection, radiusDelta);
          this.object.updateMatrixWorld();
          zoomChanged = !!radiusDelta;
        } else if (this.object.isOrthographicCamera) {
          const mouseBefore = new Vector3(this._mouse.x, this._mouse.y, 0);
          mouseBefore.unproject(this.object);
          const prevZoom = this.object.zoom;
          this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale));
          this.object.updateProjectionMatrix();
          zoomChanged = prevZoom !== this.object.zoom;
          const mouseAfter = new Vector3(this._mouse.x, this._mouse.y, 0);
          mouseAfter.unproject(this.object);
          this.object.position.sub(mouseAfter).add(mouseBefore);
          this.object.updateMatrixWorld();
          newRadius = _v.length();
        } else {
          console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled.");
          this.zoomToCursor = false;
        }
        if (newRadius !== null) {
          if (this.screenSpacePanning) {
            this.target.set(0, 0, -1).transformDirection(this.object.matrix).multiplyScalar(newRadius).add(this.object.position);
          } else {
            _ray.origin.copy(this.object.position);
            _ray.direction.set(0, 0, -1).transformDirection(this.object.matrix);
            if (Math.abs(this.object.up.dot(_ray.direction)) < _TILT_LIMIT) {
              this.object.lookAt(this.target);
            } else {
              _plane.setFromNormalAndCoplanarPoint(this.object.up, this.target);
              _ray.intersectPlane(_plane, this.target);
            }
          }
        }
      } else if (this.object.isOrthographicCamera) {
        const prevZoom = this.object.zoom;
        this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale));
        if (prevZoom !== this.object.zoom) {
          this.object.updateProjectionMatrix();
          zoomChanged = true;
        }
      }
      this._scale = 1;
      this._performCursorZoom = false;
      if (zoomChanged || this._lastPosition.distanceToSquared(this.object.position) > _EPS || 8 * (1 - this._lastQuaternion.dot(this.object.quaternion)) > _EPS || this._lastTargetPosition.distanceToSquared(this.target) > _EPS) {
        this.dispatchEvent(_changeEvent);
        this._lastPosition.copy(this.object.position);
        this._lastQuaternion.copy(this.object.quaternion);
        this._lastTargetPosition.copy(this.target);
        return true;
      }
      return false;
    }
    _getAutoRotationAngle(deltaTime) {
      if (deltaTime !== null) {
        return _twoPI / 60 * this.autoRotateSpeed * deltaTime;
      } else {
        return _twoPI / 60 / 60 * this.autoRotateSpeed;
      }
    }
    _getZoomScale(delta) {
      const normalizedDelta = Math.abs(delta * 0.01);
      return Math.pow(0.95, this.zoomSpeed * normalizedDelta);
    }
    _rotateLeft(angle2) {
      this._sphericalDelta.theta -= angle2;
    }
    _rotateUp(angle2) {
      this._sphericalDelta.phi -= angle2;
    }
    _panLeft(distance3, objectMatrix) {
      _v.setFromMatrixColumn(objectMatrix, 0);
      _v.multiplyScalar(-distance3);
      this._panOffset.add(_v);
    }
    _panUp(distance3, objectMatrix) {
      if (this.screenSpacePanning === true) {
        _v.setFromMatrixColumn(objectMatrix, 1);
      } else {
        _v.setFromMatrixColumn(objectMatrix, 0);
        _v.crossVectors(this.object.up, _v);
      }
      _v.multiplyScalar(distance3);
      this._panOffset.add(_v);
    }
    // deltaX and deltaY are in pixels; right and down are positive
    _pan(deltaX, deltaY) {
      const element = this.domElement;
      if (this.object.isPerspectiveCamera) {
        const position = this.object.position;
        _v.copy(position).sub(this.target);
        let targetDistance = _v.length();
        targetDistance *= Math.tan(this.object.fov / 2 * Math.PI / 180);
        this._panLeft(2 * deltaX * targetDistance / element.clientHeight, this.object.matrix);
        this._panUp(2 * deltaY * targetDistance / element.clientHeight, this.object.matrix);
      } else if (this.object.isOrthographicCamera) {
        this._panLeft(deltaX * (this.object.right - this.object.left) / this.object.zoom / element.clientWidth, this.object.matrix);
        this._panUp(deltaY * (this.object.top - this.object.bottom) / this.object.zoom / element.clientHeight, this.object.matrix);
      } else {
        console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.");
        this.enablePan = false;
      }
    }
    _dollyOut(dollyScale) {
      if (this.object.isPerspectiveCamera || this.object.isOrthographicCamera) {
        this._scale /= dollyScale;
      } else {
        console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.");
        this.enableZoom = false;
      }
    }
    _dollyIn(dollyScale) {
      if (this.object.isPerspectiveCamera || this.object.isOrthographicCamera) {
        this._scale *= dollyScale;
      } else {
        console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.");
        this.enableZoom = false;
      }
    }
    _updateZoomParameters(x, y) {
      if (!this.zoomToCursor) {
        return;
      }
      this._performCursorZoom = true;
      const rect = this.domElement.getBoundingClientRect();
      const dx = x - rect.left;
      const dy = y - rect.top;
      const w = rect.width;
      const h = rect.height;
      this._mouse.x = dx / w * 2 - 1;
      this._mouse.y = -(dy / h) * 2 + 1;
      this._dollyDirection.set(this._mouse.x, this._mouse.y, 1).unproject(this.object).sub(this.object.position).normalize();
    }
    _clampDistance(dist3) {
      return Math.max(this.minDistance, Math.min(this.maxDistance, dist3));
    }
    //
    // event callbacks - update the object state
    //
    _handleMouseDownRotate(event) {
      this._rotateStart.set(event.clientX, event.clientY);
    }
    _handleMouseDownDolly(event) {
      this._updateZoomParameters(event.clientX, event.clientX);
      this._dollyStart.set(event.clientX, event.clientY);
    }
    _handleMouseDownPan(event) {
      this._panStart.set(event.clientX, event.clientY);
    }
    _handleMouseMoveRotate(event) {
      this._rotateEnd.set(event.clientX, event.clientY);
      this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
      const element = this.domElement;
      this._rotateLeft(_twoPI * this._rotateDelta.x / element.clientHeight);
      this._rotateUp(_twoPI * this._rotateDelta.y / element.clientHeight);
      this._rotateStart.copy(this._rotateEnd);
      this.update();
    }
    _handleMouseMoveDolly(event) {
      this._dollyEnd.set(event.clientX, event.clientY);
      this._dollyDelta.subVectors(this._dollyEnd, this._dollyStart);
      if (this._dollyDelta.y > 0) {
        this._dollyOut(this._getZoomScale(this._dollyDelta.y));
      } else if (this._dollyDelta.y < 0) {
        this._dollyIn(this._getZoomScale(this._dollyDelta.y));
      }
      this._dollyStart.copy(this._dollyEnd);
      this.update();
    }
    _handleMouseMovePan(event) {
      this._panEnd.set(event.clientX, event.clientY);
      this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed);
      this._pan(this._panDelta.x, this._panDelta.y);
      this._panStart.copy(this._panEnd);
      this.update();
    }
    _handleMouseWheel(event) {
      this._updateZoomParameters(event.clientX, event.clientY);
      if (event.deltaY < 0) {
        this._dollyIn(this._getZoomScale(event.deltaY));
      } else if (event.deltaY > 0) {
        this._dollyOut(this._getZoomScale(event.deltaY));
      }
      this.update();
    }
    _handleKeyDown(event) {
      let needsUpdate = false;
      switch (event.code) {
        case this.keys.UP:
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            if (this.enableRotate) {
              this._rotateUp(_twoPI * this.keyRotateSpeed / this.domElement.clientHeight);
            }
          } else {
            if (this.enablePan) {
              this._pan(0, this.keyPanSpeed);
            }
          }
          needsUpdate = true;
          break;
        case this.keys.BOTTOM:
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            if (this.enableRotate) {
              this._rotateUp(-_twoPI * this.keyRotateSpeed / this.domElement.clientHeight);
            }
          } else {
            if (this.enablePan) {
              this._pan(0, -this.keyPanSpeed);
            }
          }
          needsUpdate = true;
          break;
        case this.keys.LEFT:
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            if (this.enableRotate) {
              this._rotateLeft(_twoPI * this.keyRotateSpeed / this.domElement.clientHeight);
            }
          } else {
            if (this.enablePan) {
              this._pan(this.keyPanSpeed, 0);
            }
          }
          needsUpdate = true;
          break;
        case this.keys.RIGHT:
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            if (this.enableRotate) {
              this._rotateLeft(-_twoPI * this.keyRotateSpeed / this.domElement.clientHeight);
            }
          } else {
            if (this.enablePan) {
              this._pan(-this.keyPanSpeed, 0);
            }
          }
          needsUpdate = true;
          break;
      }
      if (needsUpdate) {
        event.preventDefault();
        this.update();
      }
    }
    _handleTouchStartRotate(event) {
      if (this._pointers.length === 1) {
        this._rotateStart.set(event.pageX, event.pageY);
      } else {
        const position = this._getSecondPointerPosition(event);
        const x = 0.5 * (event.pageX + position.x);
        const y = 0.5 * (event.pageY + position.y);
        this._rotateStart.set(x, y);
      }
    }
    _handleTouchStartPan(event) {
      if (this._pointers.length === 1) {
        this._panStart.set(event.pageX, event.pageY);
      } else {
        const position = this._getSecondPointerPosition(event);
        const x = 0.5 * (event.pageX + position.x);
        const y = 0.5 * (event.pageY + position.y);
        this._panStart.set(x, y);
      }
    }
    _handleTouchStartDolly(event) {
      const position = this._getSecondPointerPosition(event);
      const dx = event.pageX - position.x;
      const dy = event.pageY - position.y;
      const distance3 = Math.sqrt(dx * dx + dy * dy);
      this._dollyStart.set(0, distance3);
    }
    _handleTouchStartDollyPan(event) {
      if (this.enableZoom) this._handleTouchStartDolly(event);
      if (this.enablePan) this._handleTouchStartPan(event);
    }
    _handleTouchStartDollyRotate(event) {
      if (this.enableZoom) this._handleTouchStartDolly(event);
      if (this.enableRotate) this._handleTouchStartRotate(event);
    }
    _handleTouchMoveRotate(event) {
      if (this._pointers.length == 1) {
        this._rotateEnd.set(event.pageX, event.pageY);
      } else {
        const position = this._getSecondPointerPosition(event);
        const x = 0.5 * (event.pageX + position.x);
        const y = 0.5 * (event.pageY + position.y);
        this._rotateEnd.set(x, y);
      }
      this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
      const element = this.domElement;
      this._rotateLeft(_twoPI * this._rotateDelta.x / element.clientHeight);
      this._rotateUp(_twoPI * this._rotateDelta.y / element.clientHeight);
      this._rotateStart.copy(this._rotateEnd);
    }
    _handleTouchMovePan(event) {
      if (this._pointers.length === 1) {
        this._panEnd.set(event.pageX, event.pageY);
      } else {
        const position = this._getSecondPointerPosition(event);
        const x = 0.5 * (event.pageX + position.x);
        const y = 0.5 * (event.pageY + position.y);
        this._panEnd.set(x, y);
      }
      this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed);
      this._pan(this._panDelta.x, this._panDelta.y);
      this._panStart.copy(this._panEnd);
    }
    _handleTouchMoveDolly(event) {
      const position = this._getSecondPointerPosition(event);
      const dx = event.pageX - position.x;
      const dy = event.pageY - position.y;
      const distance3 = Math.sqrt(dx * dx + dy * dy);
      this._dollyEnd.set(0, distance3);
      this._dollyDelta.set(0, Math.pow(this._dollyEnd.y / this._dollyStart.y, this.zoomSpeed));
      this._dollyOut(this._dollyDelta.y);
      this._dollyStart.copy(this._dollyEnd);
      const centerX = (event.pageX + position.x) * 0.5;
      const centerY = (event.pageY + position.y) * 0.5;
      this._updateZoomParameters(centerX, centerY);
    }
    _handleTouchMoveDollyPan(event) {
      if (this.enableZoom) this._handleTouchMoveDolly(event);
      if (this.enablePan) this._handleTouchMovePan(event);
    }
    _handleTouchMoveDollyRotate(event) {
      if (this.enableZoom) this._handleTouchMoveDolly(event);
      if (this.enableRotate) this._handleTouchMoveRotate(event);
    }
    // pointers
    _addPointer(event) {
      this._pointers.push(event.pointerId);
    }
    _removePointer(event) {
      delete this._pointerPositions[event.pointerId];
      for (let i = 0; i < this._pointers.length; i++) {
        if (this._pointers[i] == event.pointerId) {
          this._pointers.splice(i, 1);
          return;
        }
      }
    }
    _isTrackingPointer(event) {
      for (let i = 0; i < this._pointers.length; i++) {
        if (this._pointers[i] == event.pointerId) return true;
      }
      return false;
    }
    _trackPointer(event) {
      let position = this._pointerPositions[event.pointerId];
      if (position === void 0) {
        position = new Vector2();
        this._pointerPositions[event.pointerId] = position;
      }
      position.set(event.pageX, event.pageY);
    }
    _getSecondPointerPosition(event) {
      const pointerId = event.pointerId === this._pointers[0] ? this._pointers[1] : this._pointers[0];
      return this._pointerPositions[pointerId];
    }
    //
    _customWheelEvent(event) {
      const mode = event.deltaMode;
      const newEvent = {
        clientX: event.clientX,
        clientY: event.clientY,
        deltaY: event.deltaY
      };
      switch (mode) {
        case 1:
          newEvent.deltaY *= 16;
          break;
        case 2:
          newEvent.deltaY *= 100;
          break;
      }
      if (event.ctrlKey && !this._controlActive) {
        newEvent.deltaY *= 10;
      }
      return newEvent;
    }
  };
  __name(_OrbitControls, "OrbitControls");
  var OrbitControls = _OrbitControls;
  function onPointerDown(event) {
    if (this.enabled === false) return;
    if (this._pointers.length === 0) {
      this.domElement.setPointerCapture(event.pointerId);
      this.domElement.addEventListener("pointermove", this._onPointerMove);
      this.domElement.addEventListener("pointerup", this._onPointerUp);
    }
    if (this._isTrackingPointer(event)) return;
    this._addPointer(event);
    if (event.pointerType === "touch") {
      this._onTouchStart(event);
    } else {
      this._onMouseDown(event);
    }
  }
  __name(onPointerDown, "onPointerDown");
  function onPointerMove(event) {
    if (this.enabled === false) return;
    if (event.pointerType === "touch") {
      this._onTouchMove(event);
    } else {
      this._onMouseMove(event);
    }
  }
  __name(onPointerMove, "onPointerMove");
  function onPointerUp(event) {
    this._removePointer(event);
    switch (this._pointers.length) {
      case 0:
        this.domElement.releasePointerCapture(event.pointerId);
        this.domElement.removeEventListener("pointermove", this._onPointerMove);
        this.domElement.removeEventListener("pointerup", this._onPointerUp);
        this.dispatchEvent(_endEvent);
        this.state = _STATE.NONE;
        break;
      case 1:
        const pointerId = this._pointers[0];
        const position = this._pointerPositions[pointerId];
        this._onTouchStart({ pointerId, pageX: position.x, pageY: position.y });
        break;
    }
  }
  __name(onPointerUp, "onPointerUp");
  function onMouseDown(event) {
    let mouseAction;
    switch (event.button) {
      case 0:
        mouseAction = this.mouseButtons.LEFT;
        break;
      case 1:
        mouseAction = this.mouseButtons.MIDDLE;
        break;
      case 2:
        mouseAction = this.mouseButtons.RIGHT;
        break;
      default:
        mouseAction = -1;
    }
    switch (mouseAction) {
      case MOUSE.DOLLY:
        if (this.enableZoom === false) return;
        this._handleMouseDownDolly(event);
        this.state = _STATE.DOLLY;
        break;
      case MOUSE.ROTATE:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enablePan === false) return;
          this._handleMouseDownPan(event);
          this.state = _STATE.PAN;
        } else {
          if (this.enableRotate === false) return;
          this._handleMouseDownRotate(event);
          this.state = _STATE.ROTATE;
        }
        break;
      case MOUSE.PAN:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enableRotate === false) return;
          this._handleMouseDownRotate(event);
          this.state = _STATE.ROTATE;
        } else {
          if (this.enablePan === false) return;
          this._handleMouseDownPan(event);
          this.state = _STATE.PAN;
        }
        break;
      default:
        this.state = _STATE.NONE;
    }
    if (this.state !== _STATE.NONE) {
      this.dispatchEvent(_startEvent);
    }
  }
  __name(onMouseDown, "onMouseDown");
  function onMouseMove(event) {
    switch (this.state) {
      case _STATE.ROTATE:
        if (this.enableRotate === false) return;
        this._handleMouseMoveRotate(event);
        break;
      case _STATE.DOLLY:
        if (this.enableZoom === false) return;
        this._handleMouseMoveDolly(event);
        break;
      case _STATE.PAN:
        if (this.enablePan === false) return;
        this._handleMouseMovePan(event);
        break;
    }
  }
  __name(onMouseMove, "onMouseMove");
  function onMouseWheel(event) {
    if (this.enabled === false || this.enableZoom === false || this.state !== _STATE.NONE) return;
    event.preventDefault();
    this.dispatchEvent(_startEvent);
    this._handleMouseWheel(this._customWheelEvent(event));
    this.dispatchEvent(_endEvent);
  }
  __name(onMouseWheel, "onMouseWheel");
  function onKeyDown(event) {
    if (this.enabled === false) return;
    this._handleKeyDown(event);
  }
  __name(onKeyDown, "onKeyDown");
  function onTouchStart(event) {
    this._trackPointer(event);
    switch (this._pointers.length) {
      case 1:
        switch (this.touches.ONE) {
          case TOUCH.ROTATE:
            if (this.enableRotate === false) return;
            this._handleTouchStartRotate(event);
            this.state = _STATE.TOUCH_ROTATE;
            break;
          case TOUCH.PAN:
            if (this.enablePan === false) return;
            this._handleTouchStartPan(event);
            this.state = _STATE.TOUCH_PAN;
            break;
          default:
            this.state = _STATE.NONE;
        }
        break;
      case 2:
        switch (this.touches.TWO) {
          case TOUCH.DOLLY_PAN:
            if (this.enableZoom === false && this.enablePan === false) return;
            this._handleTouchStartDollyPan(event);
            this.state = _STATE.TOUCH_DOLLY_PAN;
            break;
          case TOUCH.DOLLY_ROTATE:
            if (this.enableZoom === false && this.enableRotate === false) return;
            this._handleTouchStartDollyRotate(event);
            this.state = _STATE.TOUCH_DOLLY_ROTATE;
            break;
          default:
            this.state = _STATE.NONE;
        }
        break;
      default:
        this.state = _STATE.NONE;
    }
    if (this.state !== _STATE.NONE) {
      this.dispatchEvent(_startEvent);
    }
  }
  __name(onTouchStart, "onTouchStart");
  function onTouchMove(event) {
    this._trackPointer(event);
    switch (this.state) {
      case _STATE.TOUCH_ROTATE:
        if (this.enableRotate === false) return;
        this._handleTouchMoveRotate(event);
        this.update();
        break;
      case _STATE.TOUCH_PAN:
        if (this.enablePan === false) return;
        this._handleTouchMovePan(event);
        this.update();
        break;
      case _STATE.TOUCH_DOLLY_PAN:
        if (this.enableZoom === false && this.enablePan === false) return;
        this._handleTouchMoveDollyPan(event);
        this.update();
        break;
      case _STATE.TOUCH_DOLLY_ROTATE:
        if (this.enableZoom === false && this.enableRotate === false) return;
        this._handleTouchMoveDollyRotate(event);
        this.update();
        break;
      default:
        this.state = _STATE.NONE;
    }
  }
  __name(onTouchMove, "onTouchMove");
  function onContextMenu(event) {
    if (this.enabled === false) return;
    event.preventDefault();
  }
  __name(onContextMenu, "onContextMenu");
  function interceptControlDown(event) {
    if (event.key === "Control") {
      this._controlActive = true;
      const document = this.domElement.getRootNode();
      document.addEventListener("keyup", this._interceptControlUp, { passive: true, capture: true });
    }
  }
  __name(interceptControlDown, "interceptControlDown");
  function interceptControlUp(event) {
    if (event.key === "Control") {
      this._controlActive = false;
      const document = this.domElement.getRootNode();
      document.removeEventListener("keyup", this._interceptControlUp, { passive: true, capture: true });
    }
  }
  __name(interceptControlUp, "interceptControlUp");
  return __toCommonJS(camera_entry_exports);
})();
