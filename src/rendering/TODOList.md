# Rendering TODO List

This document records rendering decisions that are intentionally unresolved. An item in this file is not authorization to implement it; each item still requires an explicit contract, tests, and source-path approval before production code changes.

## Resource dispose-listener failure semantics

**Status:** Unresolved. The current `Resource.dispose()` implementation and tests do not define behavior for a dispose listener that throws.

### Current behavior

`Resource.dispose()` currently:

1. marks the resource as disposed;
2. invokes listeners in registration order;
3. clears the listener set;
4. calls `disposeCPUData()`.

Because the current loop does not catch listener errors, a throwing listener interrupts disposal immediately. Later listeners are not invoked, the listener set is not cleared, and `disposeCPUData()` is not called.

### Decisions required before implementation

- Decide whether disposal must continue notifying later listeners after one listener throws.
- Decide whether listener cleanup and `disposeCPUData()` must run even when a listener throws.
- Decide whether disposal reports the first error, the last error, or an `AggregateError` containing every listener and CPU-disposal failure.
- Decide how repeated `dispose()` calls behave after a partially failed disposal attempt.
- Decide whether backend and resource-manager listeners are contractually forbidden from throwing, or whether `Resource` must defend against arbitrary listener failures.

### Required verification

Before changing `Resource.dispose()`, add focused tests for the chosen ordering, cleanup guarantee, repeated-dispose behavior, and error-reporting policy. Do not silently swallow listener or CPU-disposal failures.

### Related files

- `src/rendering/core/Resource.ts`
- `tests/unit/rendering/core/Resource.test.ts`

## Retained scene cleanup failures and bounded retries

**Status:** Deferred; added to the future plan on 2026-10-08. Retaining failed cleanup work and retrying it within a limit is the intended follow-up, not implemented behavior. The retry limit, scheduling, and terminal-failure policy still require a separate design decision and source-path approval.

### Current behavior and prerequisite

- `EngineSceneSlot.setScene()` commits the new Scene/Camera pair before attempting to dispose the previous Scene. A previous-scene cleanup failure does not undo that commit or become a scene-installation exception.
- `lastCleanupFailure` records only the latest operation, Scene UUID, and cause. It does not deliberately retain the failed Scene or create a cleanup job; references retained indirectly by a cause are not an ownership mechanism.
- `Scene.dispose()` and `Resource` cleanup mark their objects disposed before all cleanup steps finish. A later call can therefore return early after an earlier failure. Repeated calls to the current `dispose()` do not constitute resumable cleanup.
- Resolve [Resource dispose-listener failure semantics](#resource-dispose-listener-failure-semantics) before implementing a retry scheduler. Distinguish "no longer usable" from "all cleanup completed."

### Required future design

1. Define resumable Scene/Resource cleanup, including progress tracking and the policy for a step that partially succeeds before throwing. Do not repeat completed listener work or decrement a shared Resource's Scene reference count twice. Only explicitly retry-safe work may be retried.
2. Give failed cleanup work an explicit owner that retains the object and unfinished work, not just its UUID/error. Support failures from several retired Scenes without overwriting earlier cleanup responsibility; define deduplication, retention limits, and overflow behavior.
3. Define retryable failures, manual versus automatic triggers, a maximum attempt count (including whether the initial attempt counts), and scheduling/backoff. Prevent overlapping or synchronously reentrant attempts; do not busy-loop inside `setScene()` or block rendering while waiting.
4. Preserve scene handoff boundaries: during replacement, the current Scene remains installed until a valid latest candidate commits. After commit, cleanup failure must neither roll back the new pair nor make the Controller dispose it as a rejected candidate. Explicit clearing/Engine shutdown remain separate operations.
5. Define exhaustion handling and diagnostics: object identity, failed phase, attempts, and causes must remain observable. Decide when to keep rendering, refuse further switches, allow manual intervention, or stop the Engine. Reaching the limit, throwing an error, or dropping a reference must never be reported as successful resource cleanup.
6. Define cleanup ownership across Engine shutdown, context loss, and Backend disposal. Cancel or drain scheduled work according to that contract; stale work must not operate on obsolete GPU handles or release resources belonging to the current Scene. Release retained cleanup references after confirmed completion; unresolved work at shutdown needs an explicit terminal policy.

### Required verification

- Installing B succeeds even when cleanup of A fails; B remains installed and is not disposed by failure handling.
- Switching again to C does not lose unfinished cleanup for A or B; duplicate enqueue/reentrant callbacks do not duplicate ownership or cleanup work.
- A retry can finish the remaining work after a recoverable failure without replaying completed steps or double-releasing shared Resource references. `disposed === true` alone is not evidence of cleanup completion.
- A controllable scheduler proves eventual recovery, maximum-attempt exhaustion, non-retryable failure handling, no overlapping attempts, and the chosen notification sequence.
- Engine shutdown and context loss obey the chosen cancellation/draining and Backend ordering rules; successful cleanup releases retained references and stale callbacks cannot touch the active scene.

### Scope and search marker

This follows the existing Engine scene-cleanup TODO. It is separate from WebGL context restoration retries and does not claim that Renderer/Backend cleanup mechanisms automatically make Scene/Resource cleanup resumable. Candidate-build cancellation cleanup is not silently included; its owner and any integration must be reviewed separately.

```text
TODO(scene-dispose-failure-policy)
```

### Related files

- `src/engine/EngineSceneSlot.ts`
- `src/engine.ts`
- `src/rendering/scene/Scene.ts`
- `src/rendering/core/Resource.ts`
- `tests/unit/engine/EngineSceneSlot.test.ts`
- `tests/unit/engine/hw2RenderMode.test.ts`
- `tests/unit/rendering/scene/Scene.test.ts`
- `tests/unit/rendering/core/Resource.test.ts`

## WebGL context restore retry policy

**Status:** Deferred and undecided. The current `WebGLContextLifecycle` reports a current restore failure as `restore-failed`, but it does not automatically call `restore()` again.

### Current behavior

- A browser `webglcontextrestored` event starts one engine-side restore attempt.
- If the current attempt fails in `restore()` or `onReady()`, the lifecycle records the failure, enters `restore-failed`, and notifies `onRestoreFailed(error)`.
- `onRestoreFailed` and `onSuppressedError` are notification hooks. Neither hook performs or schedules another restore attempt.
- A stale callback failure may be reported for diagnostics, but it cannot start a retry or overwrite a newer lifecycle state.
- No retry timer, retry counter, backoff policy, or public manual-retry entry point exists yet.

### Decisions required before implementation

- Decide whether recovery uses an explicit manual retry API, bounded automatic retries, or both.
- Decide which restore failures are retryable and which failures should remain terminal until external intervention.
- If automatic retry is allowed, define the maximum attempt count, delay/backoff policy, and whether jitter is required.
- Define how `dispose()`, a newer context-lost transition, and another browser restored event cancel or supersede an in-flight or scheduled retry.
- Define transactional cleanup for a partially rebuilt backend so one failed attempt cannot leak GPU resources into the next attempt.
- Define how the render loop, UI, logging, and telemetry observe retrying, final failure, and eventual recovery.
- Preserve `transitionVersion` authority: a retry originating from a stale callback must never mutate the current lifecycle.

### Required verification

Before implementing retries, add focused tests using a controllable scheduler for eventual success, maximum-attempt exhaustion, no overlapping attempts, cancellation by `dispose()`, supersession by a newer lost/restored transition, partial-rebuild cleanup, and the resulting `state`/`lastFailure`/notification sequence.

### Search marker

```text
TODO(webgl-context-restore-retry-policy)
```

### Related files

- `src/rendering/backend/webgl1/WebGLContextLifecycle.ts`
- `tests/unit/rendering/backend/webgl1/WebGLContextLifecycle.test.ts`
- future `src/rendering/backend/webgl1/WebGL1Backend.ts`
- future backend and browser context-recovery tests

## Camera view-matrix cache

**Status:** Deferred; recorded on 2026-10-08. This is a future optimization to discuss, not an approved implementation change. The current mouse-panning work does not change Camera or RenderListBuilder.

### Current behavior

- `SceneNode` already caches the camera world matrix. `RenderListBuilder.build()` still computes its inverse for each view extraction, even if that world matrix has not changed.
- An active, ready `Renderer.render()` builds one ViewState and shares it across its Passes. The inverse is not recomputed for every Mesh; several render/view extractions can still perform several inversions.
- Repeated inversion of an unchanged matrix is redundant, but no benchmark currently establishes it as a bottleneck.

### Candidate design and decisions

- Consider a Camera-owned view-matrix cache exposed through a copying interface such as `copyViewMatrixTo(out)`, with the inverse recomputed only when the camera world version changes.
- Update the camera and ancestor world matrices before checking `worldVersion`. Local `Transform.version` alone misses parent movement and reparenting.
- Publish the cached inverse and its observed version only after inversion and finite-value validation succeed. A singular or invalid current world matrix must not return an old view matrix as if it were current.
- Keep Builder's independent, frozen per-extraction ViewState. Caching a computation and preserving a frame snapshot are separate responsibilities; do not expose a mutable internal cache to Passes.
- Decide the error ownership, exact interface, and whether measurements justify the cache before approving implementation paths. Do not simply copy Three.js r177's stored `matrixWorldInverse`: its update methods still run inversion on each call rather than checking our `worldVersion`.

### Required verification

Verify reuse for an unchanged world version, invalidation after local/ancestor changes and reparenting, unchanged view after projection-only edits, failure and recovery for singular/non-finite transforms, and isolation of previously returned snapshots and output buffers. If reduced inversion work is claimed, verify that separately from numerical equality; equal matrices alone do not prove cache reuse.

### Search marker and related files

```text
TODO(camera-view-matrix-cache)
```

- `src/rendering/scene/cameras/Camera.ts`
- `src/rendering/scene/SceneNode.ts`
- `src/rendering/frame/RenderListBuilder.ts`
- `src/rendering/frame/ViewState.ts`
- `tests/unit/rendering/scene/cameras/PerspectiveCamera.test.ts`
- `tests/unit/rendering/frame/RenderListBuilder.test.ts`

## Geometry topology expansion

**Status:** Deferred. The current static Geometry contract supports `triangles`, `lines`, `line-strip`, and `triangle-strip` only.

### Trigger

Revisit this item only when a later homework or runtime feature actually requires another primitive topology. Starting FFT Ocean by itself is not a trigger: a fullscreen FFT Ocean pass can continue using triangles unless its concrete rendering design requires something else.

### Required implementation scope

Adding `points`, `line-loop`, `triangle-fan`, or another topology requires all of the following changes in the same tested batch:

1. extend `PrimitiveTopology`;
2. define and test its valid `drawCount` rules;
3. map it to the corresponding WebGL1 primitive enum in the backend;
4. add CPU Geometry tests and backend draw tests;
5. update or remove `TODO(geometry-topology-expansion)` only after the complete path exists.

Do not extend only the TypeScript union. Doing so would let CPU Geometry accept a topology that the backend may not be able to draw correctly.

### Search marker

```text
TODO(geometry-topology-expansion)
```

### Related files

- `src/rendering/resources/Geometry.ts`
- `tests/unit/rendering/resources/Geometry.test.ts`
- future WebGL1 topology mapping and backend draw tests
