# Development Workflow

Status: **active for new repository work**

## One goal, one short-lived Worktree

Product and architecture changes start from the latest `origin/main` in a clean,
dedicated Worktree. Content production assets and unrelated local work remain in
their existing workspace.

Branch names use the `codex/` prefix. A branch owns one reviewable goal and must
not become a permanent integration branch.

## Before implementation

For a material change, record:

- user or operational outcome;
- observable acceptance;
- non-goals;
- affected Apps/packages and public contracts;
- data or Evidence migration risk;
- durable decisions that require an ADR;
- validation and rollback path.

GitHub Issues own cross-PR tracking. A scoped Initiative/spec may own detailed
requirements and acceptance, but it must link to current product and architecture
truth rather than restating a competing system model.

## Implementation rules

- Prefer a vertical slice that can be verified end to end.
- Preserve public API and stored-data compatibility unless migration is explicit.
- Import another package only through its public entry point.
- Define ports in the domain that needs the capability; implement them in adapters.
- Create durable resources only in a Composition Root and close them in the owning
  process lifecycle.
- Do not mix content-production artifacts with a product-code PR.
- Do not move or delete historical evidence without the Evidence migration gate.
- Keep every frontend source file under 1000 physical lines; split by ownership
  before `npm run check:frontend-lines` fails.

## Required validation

Run before opening a PR:

```bash
npm ci
npm run check:docs
npm run check:repo
npm run typecheck
npm test
npm run lint
npm run build
npm run smoke:entrypoints
```

`check:repo` examines newly added files. In CI it compares the PR with its base;
locally it checks staged and untracked additions. Existing historical artifacts
are not treated as newly introduced debt.

Behavioral, visual, provider, or live claims need proportional evidence beyond an
exit code. State whether validation was unit, contract, browser, fixture, or live.

## Pull request contract

Every PR states:

- the outcome and linked Issue;
- changed Apps/packages and why each owns the change;
- public contracts and migrations;
- documentation truth added, replaced, or intentionally unchanged;
- checks run and their actual result;
- remaining risks and rollback path.

CI must pass before merge. If a check is flaky or does not protect a stable
commitment, repair or demote the check instead of normalizing ignored failures.

## After merge

- Confirm `origin/main` contains the merged commit.
- Update the parent Issue checklist.
- Promote durable conclusions to product, architecture, ADR, schema, or code.
- Move completed implementation records to completed history; mark replaced
  material superseded and point to its replacement.
- Remove the short-lived Worktree only after confirming it has no unique changes.

## Stop conditions

Stop and request owner direction before:

- destructive or irreversible product/data choices;
- public contract breakage without a compatibility plan;
- external Evidence storage selection involving new cost or access policy;
- Git history rewriting;
- deletion whose consumers or replacement cannot be established.
