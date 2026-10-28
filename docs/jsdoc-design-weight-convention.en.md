# JSDoc Design Weight Convention

## 1. Purpose

This document defines searchable importance markers for non-obvious design contracts in the
HW2 WebGL1 implementation.

The markers help future readers answer:

- Which comments describe correctness-critical invariants?
- Which implementation details must be understood before modification?
- Which tests protect the same design decision?
- How can related source and test explanations be found quickly?

Design weight is a reading and maintenance signal. It is not:

- issue priority;
- runtime severity;
- performance weight;
- test execution order;
- a replacement for TODO comments.

## 2. Marker syntax

Place the marker inside a standard JSDoc `@remarks` block:

```ts
/**
 * @remarks
 * [DESIGN-WEIGHT:3][transform-float32-canonicalization]
 *
 * Explanation of the invariant and the production error it prevents.
 */
```

The marker has two components:

```text
[DESIGN-WEIGHT:<weight>][<topic-id>]
```

Rules:

1. `<weight>` must be `1`, `2`, or `3`.
2. `<topic-id>` must use lowercase kebab-case.
3. The marker must remain on one line so `rg` can find it reliably.
4. Source and tests protecting the same decision should reuse the same topic ID.
5. Do not create a marker for comments that merely restate syntax.
6. Do not use a design-weight marker as a substitute for an unfinished-work TODO.

## 3. Weight meanings

### DESIGN-WEIGHT:3 — critical invariant

Use weight 3 when changing the described behavior incorrectly can cause:

- silent data corruption;
- stale caches;
- broken ownership or lifecycle behavior;
- unstable identity;
- numerically inconsistent state;
- failures that may only appear after several frames or operations.

A weight-3 runtime contract must normally have a regression test. If direct testing is
impossible, its registry entry must explain why.

### DESIGN-WEIGHT:2 — important design rationale

Use weight 2 for:

- lifecycle ordering;
- ownership boundaries;
- API encapsulation decisions;
- performance-sensitive caching choices;
- behavior that is easy to misunderstand but not independently critical.

Add a test when the behavior is publicly observable.

### DESIGN-WEIGHT:1 — learning and local trade-off

Use weight 1 for:

- useful mathematical background;
- a local library compatibility note;
- a deliberately selected implementation style;
- an explanation that helps future learning but is not an invariant.

Weight 1 does not require a dedicated regression test.

## 4. Search commands

Find all correctness-critical notes:

```bash
rg -n '\[DESIGN-WEIGHT:3\]' src tests
```

Find weight 2 and weight 3 notes:

```bash
rg -n '\[DESIGN-WEIGHT:[23]\]' src tests
```

Find all source and test explanations for one topic:

```bash
rg -n '\[transform-float32-canonicalization\]' src tests
```

Find every design-weight marker:

```bash
rg -n '\[DESIGN-WEIGHT:[123]\]' src tests
```

## 5. Maintenance rules

When a marked contract changes:

1. Update the production JSDoc.
2. Update the corresponding test JSDoc and assertions.
3. Update the registry entry below.
4. Keep the same topic ID when the underlying contract remains the same.
5. Create a new topic ID when the new contract is conceptually different.
6. Remove obsolete markers rather than leaving contradictory historical notes.

Do not increase a weight merely because a comment is long. Weight describes the importance of
the contract, not the amount of explanation.

## 6. Topic registry

| Topic ID                                  | Weight | Contract                                                                                                                                                                                         | Production location                                                    | Test location                                                                                             |
| ----------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `transform-float32-canonicalization`      |      3 | Public binary64 inputs are quantized with `Math.fround()` before comparison and storage, so repeated decimal assignments do not create false changes.                                            | `src/rendering/scene/Transform.ts`                                     | `tests/unit/rendering/scene/Transform.test.ts`                                                            |
| `transform-dirty-version-separation`      |      3 | `localMatrixDirty` tracks the internal matrix cache, while `version` remains a persistent external observation token. Reading the matrix may clear dirty but must not reset or increase version. | `src/rendering/scene/Transform.ts`                                     | `tests/unit/rendering/scene/Transform.test.ts`                                                            |
| `scene-node-local-world-cache-separation` |      3 | Transform owns local TRS and local-matrix caching; SceneNode combines parent world and local matrices and tracks world-cache validity.                                                           | `src/rendering/scene/SceneNode.ts`                                     | `tests/unit/rendering/scene/SceneNode.test.ts`                                                            |
| `scene-node-stable-debug-type`            |      2 | Debug labels use an explicit stable type string rather than a bundler-renamable runtime constructor name.                                                                                        | `src/rendering/scene/SceneNode.ts`                                     | `tests/unit/rendering/scene/SceneNode.test.ts`                                                            |
| `scene-node-in-place-world-matrix`        |      2 | SceneNode copies local matrix data into its world cache, then relies on gl-matrix alias-safe multiplication to compute `parentWorld * local` in place without a second mat4.                     | `src/rendering/scene/SceneNode.ts`                                     | `tests/unit/rendering/scene/SceneNode.test.ts` verifies non-commuting parent scale and child translation. |
| `version-safe-integer-horizon`            |      1 | Transform and world versions use precise JavaScript integers; at 60 increments per second, reaching `Number.MAX_SAFE_INTEGER` takes about 4.76 million years.                                    | `src/rendering/scene/Transform.ts`, `src/rendering/scene/SceneNode.ts` | No dedicated test; this documents the numeric horizon rather than runtime behavior.                       |

### 6.1 HW1 2D texture and attachment sampling

These entries describe the connected sampling path, not an implemented ShadowMapPass,
shadow comparison, or HW1 entry point. Source and test paths are relative to the repository
root. Test locations identify verification entry points, not a guarantee of continuous success.

`render-target-sampler-snapshot` is the registry name for this batch's sampler snapshot;
source and tests currently reuse the `render-target-descriptor-snapshot` marker. Search the
existing marker for this contract; do not rename it. CPU attachment-address borrowing also
retains the `render-target-attachment-borrowing` marker.

| Topic ID                          | Weight | Contract                                                                                                                                                                                                                                                                                                                      | Production location                                                                                                                                          | Test location                                                                                                                                                                                                |
| --------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `texture2d-source-borrowing`      |      3 | Material borrows a Texture2D or logical attachment address without storing GPU handles or taking ownership. For each draw, Backend selects the texture or RenderTarget Manager; resolved handles must not be cached across draws.                                                                                             | `src/rendering/resources/Texture2DSamplingSource.ts`, `src/rendering/resources/Material.ts`, `src/rendering/backend/webgl1/WebGL1Backend.ts`                 | `tests/unit/rendering/resources/Texture2DSamplingSource.test.ts`, `tests/unit/rendering/resources/Material.test.ts`, `tests/unit/rendering/backend/webgl1/WebGL1Backend.test.ts`                             |
| `render-target-sampler-snapshot`  |      3 | Attachment min/mag filters accept only nearest/linear and default to linear. Inputs are copied, outputs are frozen at each level, and resize preserves filtering. The Manager must apply the descriptor, not merely keep it in a CPU snapshot.                                                                                | `src/rendering/resources/RenderTarget.ts` (existing `render-target-descriptor-snapshot` marker), `src/rendering/backend/webgl1/WebGL1RenderTargetManager.ts` | `tests/unit/rendering/resources/RenderTarget.test.ts`, `tests/unit/rendering/backend/webgl1/WebGL1RenderTargetManager.test.ts`, `tests/browser/rendering/backend/webgl1/WebGL1TextureSampling.test.ts`       |
| `texture2d-upload-transaction`    |      3 | Publish a cache entry only after validation, upload, and restoration of external upload state succeed. On non-loss failure, delete this attempt's temporary handle; on loss, drop old-generation references without restoring or deleting old handles. Closing rejects access but preserves failed cleanup entries for retry. | `src/rendering/backend/webgl1/WebGL1Texture2DManager.ts`                                                                                                     | `tests/unit/rendering/backend/webgl1/WebGL1Texture2DManager.test.ts`                                                                                                                                         |
| `surface-texture-feedback`        |      3 | Validate the lifetime and revision of every active scope, then compare only the stack-top output target's identity. An inner scope writing B may read paused outer A; after returning to A, reading A must be rejected before draw.                                                                                           | `src/rendering/backend/webgl1/WebGL1SurfaceScope.ts`, `src/rendering/backend/webgl1/WebGL1Backend.ts`                                                        | `tests/unit/rendering/backend/webgl1/WebGL1SurfaceScope.test.ts`, `tests/unit/rendering/backend/webgl1/WebGL1Backend.test.ts`, `tests/browser/rendering/backend/webgl1/WebGL1TextureSampling.test.ts`        |
| `uniform-sampler-unit-allocation` |      3 | sampler2D and samplerCube share a budget checked before resource resolution. Each active sampler gets its own unit, even for the same source. Allocation restarts at 0 for every draw; uniform1i receives a unit index, not a TEXTURE0 enum.                                                                                  | `src/rendering/backend/webgl1/WebGL1Uniforms.ts`                                                                                                             | `tests/unit/rendering/backend/webgl1/WebGL1Uniforms.test.ts`                                                                                                                                                 |
| `attachment-content-rebuild`      |      3 | Resolve the current revision after resize and the new generation after context restoration; the same logical address must not reuse old handles. Rebuilding storage does not restore contents: producers must redraw before consumers can obtain the expected sampled results.                                                | `src/rendering/backend/webgl1/WebGL1Backend.ts`, `src/rendering/backend/webgl1/WebGL1RenderTargetManager.ts`                                                 | `tests/unit/rendering/backend/webgl1/WebGL1Backend.test.ts`, `tests/unit/rendering/backend/webgl1/WebGL1RenderTargetManager.test.ts`, `tests/browser/rendering/backend/webgl1/WebGL1TextureSampling.test.ts` |
