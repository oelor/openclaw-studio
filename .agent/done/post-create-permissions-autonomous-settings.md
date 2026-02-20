# Post-Create Permissions UX With Autonomous Default And Immediate Settings Focus

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

The source of truth for plan format in this repository is `.agent/PLANS.md`, and this document must be maintained in accordance with it.

## Purpose / Big Picture

After this change, agent creation stays intentionally minimal (name + avatar only), and permissions are configured only after create. Immediately after a successful create, Studio should open the new agent’s Settings sidebar, and that agent should default to autonomous command authority.

A user can verify success by creating an agent and observing: the create modal has no permission controls, Settings opens automatically for that new agent, and the permissions preset is already autonomous on first view.

## Progress

- [x] (2026-02-19 00:00Z) Reviewed `.agent/PLANS.md`, current create flow, and current settings sidebar implementation.
- [x] (2026-02-19 00:00Z) Captured user requirements and UX constraints for post-create permissions only.
- [x] (2026-02-19 00:00Z) Implemented immediate settings-open transition after successful create.
- [x] (2026-02-19 00:00Z) Implemented autonomous-by-default post-create role application.
- [x] (2026-02-19 00:00Z) Replaced current execution-role-only UI with concise permissions UX in Settings.
- [x] (2026-02-19 00:00Z) Added/updated unit tests for permissions operation and settings panel behavior.
- [x] (2026-02-19 00:00Z) Updated docs to describe post-create permissioning and new defaults.

## Surprises & Discoveries

- Observation: the create modal is already permission-free, which aligns with the new product direction.
  Evidence: `src/features/agents/components/AgentCreateModal.tsx` only captures name and avatar.

- Observation: current create success path explicitly routes back to chat and clears settings selection.
  Evidence: `src/app/page.tsx` in `handleCreateAgentSubmit` sets `setSettingsAgentId(null)` and `setMobilePane("chat")`.

- Observation: the Settings sidebar currently models only execution behavior, not broader permissions.
  Evidence: `src/features/agents/components/AgentInspectPanels.tsx` renders only `Execution role` controls for permissioning.

- Observation: a fresh agent resolves to collaborative in UI only when session fields indicate that state; otherwise it can fall back to conservative.
  Evidence: `resolvedExecutionRole` in `src/features/agents/components/AgentInspectPanels.tsx` derives from `sessionExecSecurity` and `sessionExecAsk`.

- Observation: existing role update path is guarded by mutation-block checks, so naive chaining can no-op if invoked while create block is active.
  Evidence: `handleUpdateExecutionRole` in `src/app/page.tsx` calls `resolveMutationStartGuard` with `hasCreateBlock`.

- Observation: `createGatewayAgent` does not return a session key, so post-create role updates cannot run from create response alone.
  Evidence: `src/lib/gateway/agentConfig.ts` `createGatewayAgent` returns `Promise<ConfigAgentEntry>` with `{ id, name }`.

- Observation: opening Settings before the created agent exists in hydrated state will auto-close back to chat.
  Evidence: `src/app/page.tsx` effect `if (mobilePane !== "settings") return; if (settingsAgent) return; setMobilePane("chat");` and the `settingsAgentId` clearing effects.

- Observation: `gatewayConfigSnapshot` is only set when null, so it becomes stale after config mutations.
  Evidence: `loadAgents` in `src/app/page.tsx` only calls `setGatewayConfigSnapshot(result.configSnapshot)` under `if (!gatewayConfigSnapshot && result.configSnapshot)`.

- Observation: current npm script for Playwright is `e2e`, not `test:e2e`.
  Evidence: `package.json` scripts define `"e2e": "playwright test"`.

- Observation: there is no current unit coverage for the execution-role section in Settings.
  Evidence: `tests/unit/agentSettingsPanel.test.ts` has no assertions for `Execution role`, `Conservative`, `Collaborative`, or `Autonomous` text.

## Decision Log

- Decision: permissions remain out of agent creation entirely and are configured only after create.
  Rationale: user explicitly requested a clean create path and post-create permission control.
  Date/Author: 2026-02-19 / George+Codex.

- Decision: on successful create, Studio should focus the new agent and open the Settings pane automatically.
  Rationale: this makes permission context immediate without bloating create flow.
  Date/Author: 2026-02-19 / George+Codex.

- Decision: default permission mode for new agents is `Autonomous`.
  Rationale: user explicitly overrode the earlier conservative-default idea and wants autonomous as the launch baseline.
  Date/Author: 2026-02-19 / George+Codex.

- Decision: settings UX should be concise with preset-first controls and optional advanced controls.
  Rationale: preserve clarity for most users while exposing deeper control when needed.
  Date/Author: 2026-02-19 / George+Codex.

- Decision: apply autonomous defaults inside the create mutation run path, not through `handleUpdateExecutionRole`.
  Rationale: `handleUpdateExecutionRole` is mutation-guarded and may deny while create block is active; direct operation invocation inside the queued run avoids this race.
  Date/Author: 2026-02-19 / Codex.

- Decision: perform a hydration pass before opening Settings for the created agent.
  Rationale: Settings view stability depends on `settingsAgent` being present; otherwise existing effects reset to chat.
  Date/Author: 2026-02-19 / Codex.

- Decision: permission UI must not rely on stale cached config snapshot.
  Rationale: post-mutation `gatewayConfigSnapshot` staleness would make advanced toggles inaccurate unless snapshot refresh is explicit.
  Date/Author: 2026-02-19 / Codex.

## Outcomes & Retrospective

Implemented. Create remains permission-free, and on successful create Studio now hydrates the new agent, applies autonomous defaults, then opens that agent's Settings sidebar. Permissions in Settings are now preset-first with concise advanced controls and a custom-state badge. Docs and unit tests were updated to reflect the shipped behavior.

## Context and Orientation

This repository is OpenClaw Studio (UI + gateway orchestration).

Agent creation UI is in `src/features/agents/components/AgentCreateModal.tsx`. Creation orchestration is in `src/features/agents/operations/createAgentMutationLifecycleOperation.ts`, and page-level create behavior is in `src/app/page.tsx` (`handleCreateAgentSubmit`).

The settings sidebar UI is in `src/features/agents/components/AgentInspectPanels.tsx` (`AgentSettingsPanel`). The current permissions concept in that panel is only execution role (`conservative`, `collaborative`, `autonomous`).

Execution-role persistence is implemented in `src/features/agents/operations/executionRoleUpdateOperation.ts` and writes three things:

1. exec approvals policy (`exec.approvals.get` + `exec.approvals.set`),
2. runtime tool group overrides (`group:runtime` via config patch),
3. session exec settings (`sessions.patch` through `syncGatewaySessionSettings`).

Hydration is in `src/features/agents/operations/agentFleetHydration.ts` and `src/features/agents/operations/agentFleetHydrationDerivation.ts`. Local runtime state is `src/features/agents/state/store.tsx`. Global gateway config snapshot state exists in `src/app/page.tsx` as `gatewayConfigSnapshot`, but is not kept fresh after all mutations.

A "mutation queue" in this repo means config-changing operations serialized by `useConfigMutationQueue` (`src/features/agents/operations/useConfigMutationQueue.ts`) to avoid overlapping create/rename/delete/update writes.

## Plan of Work

Implement this in six milestones with explicit sequencing to avoid known races.

First, modify post-create orchestration in `src/app/page.tsx` so the new agent is hydrated before opening Settings, and autonomous defaults are applied immediately after create without using mutation-guarded handlers.

Second, add an explicit gateway-config refresh helper in `src/app/page.tsx` and use it in permission-related flows so UI derivation is based on current config state, not stale snapshots.

Third, extract permissions mapping logic from one-off UI code into a small operation module so permissions derivation and save payloads are unit-testable.

Fourth, redesign the Settings permissions section to remain concise: preset-first controls, short effective summary, and collapsible advanced controls.

Fifth, wire advanced controls to real gateway writes (tool group overrides and role/session settings) using existing config patch and approval/session helpers.

Sixth, align tests and docs with shipped behavior and existing project scripts.

## Milestones

### Milestone 1: Create flow opens Settings and applies autonomous default safely

At the end of this milestone, create completion hydrates the new agent, applies autonomous defaults, and opens Settings for that agent.

Edit `src/app/page.tsx` `handleCreateAgentSubmit`.

1. In `createAgent` callback, remove post-create UI actions that force chat (`setSettingsAgentId(null)`, `setMobilePane("chat")`) and keep only create-side effects that are valid before hydration (avatar persistence, focus filter update if still required).
2. In `onCompletion(completion)`, perform deterministic sequencing:

   - `await loadAgents()` to ensure created agent exists in state with session key.
   - Resolve created agent from `stateRef.current.agents` by `completion.agentId`.
   - If missing, set a clear error and stop before opening settings (prevents immediate settings auto-close race).
   - If created agent is not already autonomous (`sessionExecSecurity !== "full" || sessionExecAsk !== "off"`), call `updateExecutionRoleViaStudio` directly with role `"autonomous"`, passing `loadAgents: async () => {}`.
   - `await loadAgents()` again after role write so UI reflects persisted defaults.
   - Call `handleOpenAgentSettings(completion.agentId)`.
   - Close modal and clear create block.

3. Error path: if autonomous bootstrap fails, keep created agent selected and open settings if possible, surface actionable error text, and do not roll back creation.

Files touched:

- `src/app/page.tsx`

### Milestone 2: Add explicit config snapshot refresh for permissions flows

At the end of this milestone, permission derivation reads current config data.

Edit `src/app/page.tsx`:

1. Add `refreshGatewayConfigSnapshot()` helper that calls `client.call("config.get", {})` and sets `setGatewayConfigSnapshot(...)`.
2. Call this helper after permission-save mutations and before deriving advanced permission values for the currently focused settings agent.
3. Update `loadAgents` snapshot handling to avoid one-time-only behavior for permission-sensitive paths. Either:

   - always replace `gatewayConfigSnapshot` when `result.configSnapshot` exists, or
   - keep existing behavior and require `refreshGatewayConfigSnapshot()` in all permission paths.

Choose one approach and document it in `Decision Log` during implementation.

Files touched:

- `src/app/page.tsx`

### Milestone 3: Add a dedicated permissions operation module for derivation + patch planning

At the end of this milestone, permission-state derivation and update planning are not embedded in component JSX.

Create `src/features/agents/operations/agentPermissionsOperation.ts` with pure helpers and one mutation entry point.

Required helpers:

1. `resolveExecutionRoleFromAgent(agent)` (move duplicated logic out of panel).
2. `resolveToolGroupStateFromConfigEntry(entryTools)` for `group:runtime`, `group:web`, `group:fs` using `allow`/`alsoAllow`/`deny` precedence.
3. `resolveToolGroupOverrides(params)` that toggles one or more groups while preserving whether the config currently uses `allow` or `alsoAllow` and de-duplicating deny conflicts.
4. `resolveEffectivePermissionsSummary(...)` that returns concise UI text for the summary line.

Required mutation entry point:

- `updateAgentPermissionsViaStudio(params)` that applies command mode (role mapping) plus advanced toggles (`web`, `fileTools`) in one queued operation using existing helpers:
  - `readGatewayAgentExecApprovals` / `upsertGatewayAgentExecApprovals`
  - `updateGatewayAgentOverrides`
  - `syncGatewaySessionSettings`

Keep `updateExecutionRoleViaStudio` behavior intact and make it call shared helpers from this new module where sensible, so existing callers keep working.

Files touched:

- `src/features/agents/operations/agentPermissionsOperation.ts` (new)
- `src/features/agents/operations/executionRoleUpdateOperation.ts`

### Milestone 4: Replace Settings “Execution role” block with concise “Permissions” block

At the end of this milestone, the Settings sidebar has clear, compact permission controls with no added complexity in create modal.

Edit `src/features/agents/components/AgentInspectPanels.tsx` (`AgentSettingsPanel`):

1. Rename section label from `Execution role` to `Permissions`.
2. Keep three preset options (`Conservative`, `Collaborative`, `Autonomous`) as top-level controls.
3. Add one-line effective summary under presets.
4. Add collapsed `Advanced controls` section containing:

   - `Command mode`: `Off`, `Ask`, `Auto` (maps to role/security/ask).
   - `Web access`: `Off`/`On` (maps to `group:web`).
   - `File tools`: `Off`/`On` (maps to `group:fs`).

5. Show `Custom` badge when advanced values diverge from preset baseline.
6. Keep copy concise and avoid adding extra explanatory paragraphs.

Update panel props to accept a single permission draft + save callback instead of only `onUpdateExecutionRole`.

Files touched:

- `src/features/agents/components/AgentInspectPanels.tsx`

### Milestone 5: Wire page-level permissions state and save action

At the end of this milestone, settings controls read real values from current config/session state and persist through queued mutations.

Edit `src/app/page.tsx`:

1. Derive selected-agent permission state from:

   - hydrated agent session fields (`sessionExecSecurity`, `sessionExecAsk`),
   - fresh config entry (`config.get` snapshot) for `tools.allow` / `tools.alsoAllow` / `tools.deny`.

2. Pass this derived state into `AgentSettingsPanel`.
3. Add `handleUpdateAgentPermissions(agentId, draft)` that enqueues a mutation kind (add new queue kind `update-agent-permissions`) and calls `updateAgentPermissionsViaStudio(...)`.
4. Refresh agents and gateway config snapshot after save, then keep settings pane focused on same agent.

Update queue type union:

- `src/features/agents/operations/useConfigMutationQueue.ts`

Files touched:

- `src/app/page.tsx`
- `src/features/agents/operations/useConfigMutationQueue.ts`

### Milestone 6: Tests and docs

At the end of this milestone, behavior is verified and docs match runtime behavior.

Unit tests:

1. Extend `tests/unit/createAgentMutationLifecycleOperation.test.ts` with explicit create-completion sequencing expectations where relevant.
2. Add `tests/unit/agentPermissionsOperation.test.ts` covering:

   - role mapping off/ask/auto,
   - group toggle merge behavior for `allow` and `alsoAllow` modes,
   - deny conflict resolution.

3. Expand `tests/unit/agentSettingsPanel.test.ts` with assertions for:

   - `Permissions` section render,
   - preset selection,
   - advanced expander behavior,
   - `Custom` badge and summary text.

4. Update `tests/unit/executionRoleUpdateOperation.test.ts` only where helpers were moved/reused.

Focused behavior coverage:

- Prefer unit/integration-first coverage by extracting any non-trivial page sequencing logic into a small operation helper if needed.
- Add e2e only if deterministic with existing local mocks.

Docs:

- `docs/ui-guide.md`: document create-without-permissions and immediate settings handoff.
- `docs/permissions-sandboxing.md`: document autonomous post-create bootstrap and updated settings permissions controls.

## Concrete Steps

Run commands from `/Users/georgepickett/openclaw-studio`.

1. Implement Milestones 1-2 (`src/app/page.tsx`), then run:

   npm run test -- --run tests/unit/createAgentMutationLifecycleOperation.test.ts

   Expected result: Vitest prints passing tests for create lifecycle; no hanging watch process.

2. Implement Milestones 3-5, then run focused unit suite:

   npm run test -- --run tests/unit/agentPermissionsOperation.test.ts tests/unit/agentSettingsPanel.test.ts tests/unit/executionRoleUpdateOperation.test.ts tests/unit/agentFleetHydrationDerivation.test.ts

   Expected result: all targeted permission/hydration tests pass.

3. If deterministic e2e is added, run:

   npm run e2e -- tests/e2e/<new-create-settings-spec>.spec.ts

   Expected result: Playwright reports passing create -> settings handoff behavior.

4. Run full verification:

   npm run typecheck
   npm run test -- --run

   Expected result: typecheck exits 0; full unit suite passes.

## Validation and Acceptance

Manual acceptance:

1. Start Studio and connect to a gateway.
2. Create a new agent from `New Agent`.
3. Confirm create modal includes no permissions UI.
4. Confirm modal closes and Settings opens for that exact new agent.
5. Confirm preset/effective command mode is autonomous by default.
6. Toggle advanced controls, save, refresh agent list, and confirm values persist.

Behavioral acceptance conditions:

- Create never asks permissions.
- Post-create lands in Settings for the created agent (unless create itself fails).
- Autonomous defaults are applied idempotently.
- Permission controls reflect current config/session state rather than stale cached config.
- Permissions save path is queued like other config mutations.

## Idempotence and Recovery

All permission writes must be idempotent.

- Re-running autonomous bootstrap should converge on `security=full` + `ask=off` + runtime enabled.
- Group toggles should preserve unrelated allow/deny entries.
- If create succeeds but autonomous bootstrap fails, keep agent and open settings for manual correction.
- If config or exec approvals hash races occur, rely on existing retry semantics (`config.get`/`config.set` + `exec.approvals.get`/`exec.approvals.set`) rather than force-overwriting.

No destructive operations are required.

## Artifacts and Notes

Implementation artifacts:
- Updated create orchestration in `src/app/page.tsx` to hydrate first, apply autonomous defaults, and open Settings for the created agent.
- Added unified permissions operation module and queue wiring.
- Updated Settings permissions UI and tests.

During implementation, add concise evidence snippets here:

- one create-flow transcript showing modal close -> settings open,
- one payload example for permission save,
- one test summary excerpt from focused permission tests.

Note: test commands listed in this plan were not executed during this implementation pass.

## Interfaces and Dependencies

Primary interfaces in scope:

- `runCreateAgentMutationLifecycle` in `src/features/agents/operations/createAgentMutationLifecycleOperation.ts`.
- `updateExecutionRoleViaStudio` in `src/features/agents/operations/executionRoleUpdateOperation.ts`.
- New `updateAgentPermissionsViaStudio` in `src/features/agents/operations/agentPermissionsOperation.ts`.
- `updateGatewayAgentOverrides` and `createGatewayAgent` in `src/lib/gateway/agentConfig.ts`.
- `syncGatewaySessionSettings` in `src/lib/gateway/GatewayClient.ts`.
- `AgentSettingsPanel` in `src/features/agents/components/AgentInspectPanels.tsx`.
- `useConfigMutationQueue` in `src/features/agents/operations/useConfigMutationQueue.ts`.

Do not add permissions to create modal, and do not introduce a second mutation queue.

Revision Note: Initial draft created to implement user-requested behavior changes (post-create-only permissions, immediate settings focus, autonomous default, concise sidebar UX).

Revision Note (2026-02-19): Improved with code-grounded corrections: fixed create sequencing around real page effects and guard behavior, corrected npm/e2e commands to match `package.json`, added concrete module/function targets for permission derivation+persistence, and tightened validation criteria to observable outcomes.

Revision Note (2026-02-19, second improve pass): Added explicit handling for stale `gatewayConfigSnapshot`, split config-refresh work into its own milestone, and shifted testing guidance toward deterministic unit/integration-first coverage with optional e2e only when mocks are stable.
