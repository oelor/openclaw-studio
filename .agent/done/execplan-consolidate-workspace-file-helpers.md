# Consolidate workspace file helpers

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository does not include PLANS.md. The source of truth for this plan is `.agent/PLANS.md` from the repository root; this document must be maintained in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Workspace file name validation and empty-state construction are duplicated between the UI and server. After this change, a single shared helper module will define workspace file validation and default state so the UI tabs, API validation, and workspace provisioning all agree on the same list and behaviors. A user will see consistent workspace file tabs and validation errors because the same shared helpers drive both client and server logic.

## Progress

- [x] (2026-01-29 04:27Z) Add shared workspace file helpers in `src/lib/projects/workspaceFiles.ts` and unit tests to pin behavior.
- [x] (2026-01-29 04:27Z) Replace local duplicates in `src/lib/projects/workspaceFiles.server.ts`, `src/features/canvas/components/AgentTile.tsx`, and update API routes to use shared validation helpers.
- [x] (2026-01-29 04:27Z) Verify tests and typecheck after refactor.

## Surprises & Discoveries

- Observation: The workspace-files API route imported `isWorkspaceFileName` from the server module, so moving the helper required updating the import to the shared module.
  Evidence: `tsc --noEmit` reported missing export in `src/lib/projects/workspaceFiles.server.ts` until the route import was updated.

## Decision Log

- Decision: Consolidate workspace file validation and default state in the shared `src/lib/projects/workspaceFiles.ts` module rather than adding new UI-only helpers.
  Rationale: The file list is already shared across client and server, and keeping validation and default state next to it prevents drift with minimal blast radius.
  Date/Author: 2026-01-29, Codex.

## Outcomes & Retrospective

Workspace file validation and default state creation now live in `src/lib/projects/workspaceFiles.ts`. The server, UI, and API route all import shared helpers, and `npm test -- tests/unit/workspaceFiles.test.ts` plus `npm run typecheck` pass.

## Context and Orientation

Workspace file definitions live in `src/lib/projects/workspaceFiles.ts` as `WORKSPACE_FILE_NAMES`, `WORKSPACE_FILE_META`, and `WORKSPACE_FILE_PLACEHOLDERS`. The server module `src/lib/projects/workspaceFiles.server.ts` defines its own `isWorkspaceFileName`, while the UI component `src/features/canvas/components/AgentTile.tsx` defines `buildWorkspaceState` and a local `isWorkspaceFileName`. This duplication makes it easy for validation and UI state to drift if the file list changes. Consolidating these helpers into the shared module keeps client and server behavior aligned.

## Plan of Work

First, add shared helpers to `src/lib/projects/workspaceFiles.ts` for validation and default state construction. Next, add unit tests that verify the new helpers behave as expected. Then, update `src/lib/projects/workspaceFiles.server.ts` and `src/features/canvas/components/AgentTile.tsx` to import the shared helpers and delete their local versions. Finally, run the focused unit test and typecheck to confirm the refactor is safe.

## Concrete Steps

From the repository root `/Users/georgepickett/clawdbot-agent-ui`:

1. Add shared helpers in `src/lib/projects/workspaceFiles.ts`:

   - Export `isWorkspaceFileName(value: string): value is WorkspaceFileName`.
   - Export `createWorkspaceFilesState(): Record<WorkspaceFileName, { content: string; exists: boolean }>`.

2. Update unit tests in `tests/unit/workspaceFiles.test.ts` to cover:

   - `isWorkspaceFileName` returns true for known names and false for unknown names.
   - `createWorkspaceFilesState` returns entries for every `WORKSPACE_FILE_NAMES` value with empty content and `exists: false`.

3. Update server helper usage:

   - In `src/lib/projects/workspaceFiles.server.ts`, remove the local `isWorkspaceFileName` and import the shared one from `src/lib/projects/workspaceFiles.ts`.

4. Update UI usage:

   - In `src/features/canvas/components/AgentTile.tsx`, remove local `buildWorkspaceState` and `isWorkspaceFileName` and use the shared helpers from `src/lib/projects/workspaceFiles.ts`.

5. Run tests and typecheck:

   npm test -- tests/unit/workspaceFiles.test.ts
   npm run typecheck

## Validation and Acceptance

Acceptance means the only `isWorkspaceFileName` and workspace default-state constructors live in `src/lib/projects/workspaceFiles.ts`, and both UI and server import them. Unit tests verify the helpers, and the focused tests and typecheck pass.

Verification workflow by milestone:

Milestone 1: Shared helpers + tests.
- Tests to write: Extend `tests/unit/workspaceFiles.test.ts` with the new helper tests. Run `npm test -- tests/unit/workspaceFiles.test.ts` and confirm the tests fail before the helpers exist.
- Implementation: Add and export `isWorkspaceFileName` and `createWorkspaceFilesState` in `src/lib/projects/workspaceFiles.ts`.
- Verification: Re-run `npm test -- tests/unit/workspaceFiles.test.ts` and confirm all tests pass.
- Commit: `git commit -am "Milestone 1: add shared workspace file helpers"`.

Milestone 2: Replace duplicates.
- Tests to write: No new tests required beyond Milestone 1.
- Implementation: Update `src/lib/projects/workspaceFiles.server.ts` and `src/features/canvas/components/AgentTile.tsx` to use the shared helpers and delete local duplicates.
- Verification: Run `npm test -- tests/unit/workspaceFiles.test.ts` and `npm run typecheck`.
- Commit: `git commit -am "Milestone 2: reuse workspace file helpers"`.

## Idempotence and Recovery

These steps are safe to rerun. If a refactor introduces errors, restore the local helper in the affected file and re-run the unit test to isolate the breakage. The shared helpers are pure and do not access the filesystem, so rollback is limited to import changes.

## Artifacts and Notes

Expected unit test transcript example:

    $ npm test -- tests/unit/workspaceFiles.test.ts
    ✓ tests/unit/workspaceFiles.test.ts (4)

## Interfaces and Dependencies

`src/lib/projects/workspaceFiles.ts` should export:

- `isWorkspaceFileName(value: string): value is WorkspaceFileName`
- `createWorkspaceFilesState(): Record<WorkspaceFileName, { content: string; exists: boolean }>`

These helpers must be pure and should not touch the filesystem.

Plan update (2026-01-29 04:27Z): Marked milestones complete and recorded the API route import adjustment and validation results.
