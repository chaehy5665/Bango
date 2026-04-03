# PC-bang Source Discovery, Crawling, and Supabase Load

> **Status:** Historical / pre-Lite Mode.
>
> This document describes the earlier approval-heavy and load-policy-centered ingestion plan.
> It is **not** the operational default anymore.
>
> Current default workflow:
> `raw collect -> parse -> canonical.json -> lite loader -> venues`
>
> Use `@.sisyphus/plans/pcbang-current-state-handoff.md` and `@docs/ops/pcbang-venue-ops.md` for current operational guidance.

## TL;DR
> **Summary**: Add a manual-run PC-bang ingestion workflow that first approves a single source with hard legal/data-quality gates, then captures venue listing/enrichment data, normalizes it, and loads only safe venue records into the existing Supabase model.
> **Deliverables**:
> - Approved-source evaluation rubric and score artifact for Seoul-first coverage
> - Source auth/acquisition flow with redacted evidence
> - Fixture-driven venue normalizer and DB loader
> - Manual-run command plus structured evidence bundle and rollback/runbook
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2 → 3 → 7 → 8 → 9 → 11 → 12

## Context
### Original Request
- "pc방 데이터 크롤링 플랜"

### Interview Summary
- Source is not yet decided, so source discovery and approval are in scope.
- Data scope is now limited to basic venue listing/enrichment data. Pricing will be user-managed after ingestion and is no longer required for crawler insertability.
- Output scope is crawl + normalize + DB load into the existing Supabase-backed storage layer.
- Execution cadence is one-time/manual only; no recurring scheduler is in scope.
- Login-required sources are allowed only if automation is permitted and no bypass behavior is required.
- Preferred verification mode is tests-after, using the repo's existing Playwright baseline plus lightweight automated contract tests.

### Metis Review (gaps addressed)
- Added a hard source-approval rubric with stop conditions instead of leaving source choice to executor judgment.
- Locked default geography to Seoul-first because current map/data patterns are Seoul-centered (`src/app/map/page.tsx:11-24`, `supabase/migrations/20260302113127_seed_initial_venues.sql:3-17`).
- Locked default overwrite policy to **no destructive overwrite**: new venues may insert automatically; matched venues and matched pricing rows go to a review bucket instead of replacing admin-managed data.
- Locked fallback behavior: if no candidate source passes legal/access/data-quality gates, execution stops after the evaluation artifact and later implementation tasks are cancelled.
- Locked pricing ownership: crawled pricing is optional and not required for venue insertability; user/admin-managed pricing remains the source of truth after venue ingestion.
- Locked source-approval realism: Kakao Map and Naver Map public place pages are treated as legal/access baseline candidates that are expected to fail unless later evidence proves automation is permitted, and any approvable venue-owned candidate must resolve to one repeatable site family rather than a grab-bag of unrelated official pages.

### Pricing Policy Update
- Venue discovery and enrichment are in scope for crawler automation.
- Pricing is explicitly out of scope for crawler acceptance and insertability. Missing pricing must not block venue-only classification or insert review artifacts.
- Any remaining pricing-related tasks or thresholds below are superseded where they require crawled pricing as a prerequisite for venue ingestion.
- Task 5 and pricing-specific parts of Tasks 8-12 are historical context only unless a later product decision restores crawler-managed pricing.

## Work Objectives
### Core Objective
Create a decision-complete execution path for a single approved PC-bang data source that can be run manually to acquire Seoul-first venue data, normalize it into the repo's venue model, and write safe results plus evidence without overwriting existing curated rows.

### Deliverables
- A machine-readable source-evaluation artifact for at least 3 candidate sources and one approved source (or an explicit halt report)
- Approved-source auth/acquisition proof with redacted screenshots/traces
- Canonical field contract for venue data, with optional crawler pricing passthrough only when available
- Fixture set for listing/detail parsing, including failure fixtures
- Automated normalizer and loader verification
- Manual-run command that outputs inserted/skipped/review/error artifacts
- Operator runbook and rollback instructions

### Definition of Done (verifiable conditions with commands)
- `bun run crawl:source-eval -- --city seoul --sample-size 20 --output .sisyphus/evidence/pcbang/task-2-source-scorecard.json --sample-output .sisyphus/evidence/pcbang/task-1-seoul-sample.json` exits 0 and `bun run crawl:source-approve -- --input .sisyphus/evidence/pcbang/task-2-source-scorecard.json --output .sisyphus/evidence/pcbang/task-3-source-decision.json` exits 0.
- `bun test src/lib/pcbang` exits 0 for normalizer, dedupe, and loader contract tests.
- `bunx playwright test e2e/pcbang-source-auth.spec.ts --project=chromium-desktop` exits 0 and writes auth/acquisition evidence under `.sisyphus/evidence/pcbang/`.
- `bun run crawl:run -- --city seoul --limit 20 --output-dir .sisyphus/evidence/pcbang/run` exits 0 and writes `summary.json`, `inserted.json`, `review-needed.json`, `skipped.json`, and `errors.json`.
- `bun run lint` exits 0.

### Must Have
- One approved source only; do not build a generalized multi-source platform.
- Seoul-first source evaluation using a fixed sample panel of 20 candidate venues across at least 5 districts.
- Legal/access gates: no CAPTCHA bypass, no MFA bypass, no anti-bot evasion, no ToS-violating automation.
- Venue-only insert classification must remain valid when pricing is absent.
- Insert-only safe load for unmatched venues; matched records go to review artifacts rather than overwrite existing curated data.
- Structured evidence for happy path and failure path in `.sisyphus/evidence/pcbang/`.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No cron jobs, queues, CI setup, Docker, monitoring, recurring sync, or background workers.
- No menu/spec/peripherals/image ingestion in this scope.
- No credential, cookie, or protected raw-content commits.
- No vague “choose best source” language; the rubric must decide.
- No acceptance criteria that require a human to inspect manually before pass/fail is known.
- No destructive updates to existing `venues` / `venue_pricing` rows.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after using **Bun test** for parser/loader contracts and **Playwright** for source auth/acquisition proof
- QA policy: Every task below includes agent-executed happy-path and failure-path scenarios
- Evidence: `.sisyphus/evidence/pcbang/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. Extract shared dependencies early so later implementation work is blocked only by source approval, not by unresolved schema decisions.

Wave 1: Source rubric, canonical data contracts, and non-destructive load policy
Wave 2: Candidate-source evaluation and approval gate
Wave 3: Approved-source auth, fixture capture, parser/normalizer implementation
Wave 4: Loader, manual-run orchestration, runbook, and end-to-end proof

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | — | 2, 3 |
| 2 | 1 | 3 |
| 3 | 2 | 7, 8, 9, 10, 11, 12 |
| 4 | — | 8, 9, 11 |
| 5 | — | 8, 9, 11 |
| 6 | — | 9, 11 |
| 7 | 3 | 8, 11 |
| 8 | 3, 4, 5, 7 | 9, 11 |
| 9 | 4, 5, 6, 8 | 10, 11 |
| 10 | 9 | 11, 12 |
| 11 | 7, 8, 9, 10 | 12 |
| 12 | 11 | Final Verification Wave |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → deep / unspecified-high
- Wave 2 → 2 tasks → deep
- Wave 3 → 2 tasks → unspecified-high / quick
- Wave 4 → 4 tasks → unspecified-high / quick / writing
- Note: Waves 2 and 3 are intentionally narrow because source approval is a hard gate; parallelizing around that gate would create wasted work.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Lock the source-approval rubric and Seoul sample panel

  **What to do**: Define the exact rubric that decides pass/fail for candidate sources before any crawler code exists. Use a Seoul-first panel of 20 venues spanning at least 5 districts. Hard gates: automation must be legally/permissibly accessible; no CAPTCHA/MFA/bypass behavior; required identity fields (`name`, `address_full`, `address_district`) must be recoverable for at least 16/20 samples; pricing recoverability is informational only and must not block venue ingestion; selector/navigation stability must succeed on at least 18/20 samples; median acquisition time per venue must stay under 15 seconds in a clean session. Write the rubric and the fixed sample panel to evidence files so later tasks do not improvise.
  **Must NOT do**: Do not approve any source in this task; do not expand geography beyond Seoul; do not use fuzzy language like “mostly works”.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: locks objective thresholds and stop conditions that later tasks depend on.
  - Skills: `[]` — No special skill is needed.
  - Omitted: `oracle` — Not needed because this is bounded scope, not whole-system architecture.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 3 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `src/app/map/page.tsx:11-24` — current product behavior is Seoul-centered, so the first-run geography is Seoul.
  - Pattern: `supabase/migrations/20260302113127_seed_initial_venues.sql:3-17` — existing sample data is Seoul-only and already spans multiple districts.
  - Pattern: `package.json:5-12` — existing command surface uses Bun-based scripts.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run crawl:source-eval -- --city seoul --sample-size 20 --rubric-only --output .sisyphus/evidence/pcbang/task-1-source-rubric.json --sample-output .sisyphus/evidence/pcbang/task-1-seoul-sample.json` exits 0.
  - [ ] `.sisyphus/evidence/pcbang/task-1-source-rubric.json` contains the fixed thresholds above and `.sisyphus/evidence/pcbang/task-1-seoul-sample.json` lists 20 Seoul sample venues across at least 5 districts.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Rubric artifact generated
    Tool: Bash
    Steps: Run `bun run crawl:source-eval -- --city seoul --sample-size 20 --rubric-only --output .sisyphus/evidence/pcbang/task-1-source-rubric.json --sample-output .sisyphus/evidence/pcbang/task-1-seoul-sample.json`
    Expected: Exit code 0; rubric JSON contains `legal_gate`, `identity_threshold`, `pricing_threshold`, `stability_threshold`, `time_budget_seconds`, and the sample JSON contains 20 venues across at least 5 Seoul districts.
    Evidence: .sisyphus/evidence/pcbang/task-1-source-rubric.json

  Scenario: Invalid sample size rejected
    Tool: Bash
    Steps: Run `bun run crawl:source-eval -- --city seoul --sample-size 4 --rubric-only --output .sisyphus/evidence/pcbang/task-1-source-rubric-invalid.json`
    Expected: Exit code non-zero; stderr contains `sample-size must be >= 20`; no approval file is written.
    Evidence: .sisyphus/evidence/pcbang/task-1-source-rubric-error.txt
  ```

  **Commit**: YES | Message: `chore(crawl): define source approval rubric` | Files: `package.json`, `scripts/pcbang/source-eval.ts`, `src/lib/pcbang/source-rubric.ts`

- [ ] 2. Inventory candidate sources and produce a scored decision report

  **What to do**: Evaluate exactly three candidate families against Task 1’s rubric: (1) Kakao Map public place pages, (2) Naver Map public place pages, and (3) an official venue-owned page only when it is directly linked from one of the first two sources. Treat the first two as legal/access baseline candidates that may fail on robots/terms even when public in a browser. The venue-owned candidate is only approvable if it collapses to one repeatable site family with shared selectors/markup and terms that permit the intended manual automation. Score each source on legality/access, listing completeness, optional pricing coverage (informational only), selector stability, and execution cost. Capture pass/fail reasons in a machine-readable scorecard. If a source requires login, note whether automation appears permitted and whether login is optional or mandatory.
  **Must NOT do**: Do not start parser or loader work here; do not score more than one venue-owned site family; do not ignore robots/terms/access gates; do not treat a heterogeneous set of one-off official pages as a single approved source.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: source scoring is the main feasibility gate.
  - Skills: `[]` — No injected skill needed.
  - Omitted: `quick` — Too shallow for access/legal/data-quality tradeoffs.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3 | Blocked By: 1

  **References** (executor has NO interview context — be exhaustive):
  - External: `https://map.kakao.com/` — fixed candidate family #1.
  - External: `https://m.map.naver.com/` — fixed candidate family #2.
  - Pattern: `playwright.config.ts:7-35` — existing browser automation baseline and evidence-friendly HTML reporter.
  - Pattern: `tests/task-15-admin-auth.spec.ts:7-89` — screenshot-on-proof pattern to reuse for gated flows.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run crawl:source-eval -- --city seoul --sample-size 20 --candidates kakao-map,naver-map,linked-official --output .sisyphus/evidence/pcbang/task-2-source-scorecard.json` exits 0.
  - [ ] `.sisyphus/evidence/pcbang/task-2-source-scorecard.json` contains all three candidate families and explicit pass/fail reasons per rubric dimension.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Candidate scorecard generated
    Tool: Bash
    Steps: Run `bun run crawl:source-eval -- --city seoul --sample-size 20 --candidates kakao-map,naver-map,linked-official --output .sisyphus/evidence/pcbang/task-2-source-scorecard.json`
    Expected: Exit code 0; scorecard contains 3 candidates, numeric scores, and explicit `pass`/`fail` reasons.
    Evidence: .sisyphus/evidence/pcbang/task-2-source-scorecard.json

  Scenario: Access-blocked candidate rejected
    Tool: Bash
    Steps: Run `bun run crawl:source-eval -- --city seoul --sample-size 20 --candidates forced-captcha-source --output .sisyphus/evidence/pcbang/task-2-source-scorecard-blocked.json`
    Expected: Exit code 0; blocked candidate is marked `fail` with reason `captcha_or_mfa_required` and cannot become approved.
    Evidence: .sisyphus/evidence/pcbang/task-2-source-scorecard-blocked.json
  ```

  **Commit**: YES | Message: `chore(crawl): score candidate sources` | Files: `scripts/pcbang/source-eval.ts`, `src/lib/pcbang/source-probes/*`, `.sisyphus/evidence/pcbang/task-2-source-scorecard.json`

- [ ] 3. Approve one source or halt execution with a machine-readable stop artifact

  **What to do**: Apply Task 1 thresholds to Task 2 results. Approve exactly one source: the highest-scoring candidate that passes every hard gate and is still a single repeatable source family. If no source passes, write a halt artifact and stop all remaining implementation tasks. If the approved source requires login, require proof that automation is permitted and that the flow does not require CAPTCHA/MFA or anti-bot bypass. Later tasks may not proceed without this artifact.
  **Must NOT do**: Do not “pick the least bad option” when no source passes; do not allow multiple approved sources; do not continue after `status = halt`; do not approve Kakao Map or Naver Map public place pages unless their legal/access posture is revalidated with stronger evidence at execution time.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this is the go/no-go decision point for the entire plan.
  - Skills: `[]` — No additional skill needed.
  - Omitted: `writing` — Decision logic matters more than prose here.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7, 8, 9, 10, 11, 12 | Blocked By: 2

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `.sisyphus/evidence/pcbang/task-1-source-rubric.json` — approval thresholds are fixed here.
  - Pattern: `.sisyphus/evidence/pcbang/task-2-source-scorecard.json` — approval input.
  - Pattern: `playwright.config.ts:14-17` — traces are available for later auth/acquisition proof if a source is approved.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run crawl:source-approve -- --input .sisyphus/evidence/pcbang/task-2-source-scorecard.json --output .sisyphus/evidence/pcbang/task-3-source-decision.json` exits 0.
  - [ ] `.sisyphus/evidence/pcbang/task-3-source-decision.json` contains exactly one of: `status=approved` with `source`, or `status=halt` with `reasons`.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: One source approved
    Tool: Bash
    Steps: Run `bun run crawl:source-approve -- --input .sisyphus/evidence/pcbang/task-2-source-scorecard.json --output .sisyphus/evidence/pcbang/task-3-source-decision.json`
    Expected: Exit code 0; output JSON contains one approved source and no second approval.
    Evidence: .sisyphus/evidence/pcbang/task-3-source-decision.json

  Scenario: No source passes so execution halts
    Tool: Bash
    Steps: Run `bun run crawl:source-approve -- --input .sisyphus/evidence/pcbang/task-2-source-scorecard-blocked.json --output .sisyphus/evidence/pcbang/task-3-source-decision-blocked.json`
    Expected: Exit code 0; output JSON contains `status: halt`; later tasks are marked blocked in the orchestration layer.
    Evidence: .sisyphus/evidence/pcbang/task-3-source-decision-blocked.json
  ```

  **Commit**: YES | Message: `chore(crawl): add source approval gate` | Files: `scripts/pcbang/source-approve.ts`, `src/lib/pcbang/source-approval.ts`

- [ ] 4. Define the canonical venue contract for crawl output

  **What to do**: Lock the canonical venue payload that every parser must emit before DB load. Required fields: `name`, `address_full`, `address_district`, `lat`, `lng`. Optional fields: `phone`, `operating_hours`, `amenities`, `total_seats`, `parking_available`. Korean names/addresses remain canonical; no transliteration is required. If source data lacks coordinates, geocoding is allowed only from a Seoul address and unresolved geo must be sent to the review bucket, not inserted. The contract must match the current `venues` table and generated database types.
  **Must NOT do**: Do not add menu/spec/peripherals/image fields; do not let parser output skip `address_district`; do not allow raw source payloads to reach the loader unnormalized.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: schema mapping is precise but not conceptually huge.
  - Skills: `[]` — No extra skill needed.
  - Omitted: `visual-engineering` — No UI work is involved.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8, 9, 11 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - API/Type: `src/types/database.ts:271-315` — current `venues` row/insert/update contract.
  - API/Type: `src/types/venue.ts:5-16` — venue typing and location expectations.
  - Pattern: `supabase/migrations/20260302112153_create_venue_schema.sql:6-24` — required venue columns and constraints.
  - Pattern: `src/app/venues/[id]/page.tsx:72-120` — current read path depends on venue fields being stable and complete.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun test src/lib/pcbang/contracts/venue-contract.test.ts` exits 0.
  - [ ] `src/lib/pcbang/contracts/venue-contract.ts` rejects missing `address_district` and unresolved coordinates.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Valid Seoul venue contract passes
    Tool: Bash
    Steps: Run `bun test src/lib/pcbang/contracts/venue-contract.test.ts`
    Expected: Exit code 0; fixtures with `name`, full address, district, and coordinates are accepted.
    Evidence: .sisyphus/evidence/pcbang/task-4-venue-contract.txt

  Scenario: Missing district or geo is rejected
    Tool: Bash
    Steps: Run `bun test src/lib/pcbang/contracts/venue-contract.test.ts --filter "reject missing district and geo"`
    Expected: Exit code 0; invalid fixture is routed to review/error classification, never accepted as loadable.
    Evidence: .sisyphus/evidence/pcbang/task-4-venue-contract-error.txt
  ```

  **Commit**: YES | Message: `feat(crawl): add venue contract` | Files: `src/lib/pcbang/contracts/venue-contract.ts`, `src/lib/pcbang/contracts/venue-contract.test.ts`

- [ ] 5. Define the canonical pricing schema and reconcile current repo inconsistencies

  **What to do**: Standardize pricing into one JSON shape per `tier_name`: `{ hourly, package_3h, package_6h, package_overnight, notes }`, with absent values stored as `null` or omitted keys by rule, not mixed aliases. Normalize legacy repo shapes (`3hours`, `6hours`, `overnight`, nested `package`) into the canonical keys before load. Treat seat/member/VIP/couple variants as `tier_name` values, not as schema branches. Only listing + pricing are in scope.
  **Must NOT do**: Do not preserve mixed key names; do not load pricing without `tier_name`; do not expand into menu/spec/peripheral pricing.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: data-contract work with concrete migration implications.
  - Skills: `[]` — No special skill needed.
  - Omitted: `deep` — This is a contract cleanup, not a broad research task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8, 9, 11 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `supabase/migrations/20260302112153_create_venue_schema.sql:25-35` — `venue_pricing` table contract.
  - Pattern: `src/app/admin/actions.ts:74-107` — current admin create path writes `hourly`, `package_3h`, `package_6h`, `package_overnight`.
  - Pattern: `src/app/admin/actions.ts:252-287` — update path reuses the same pricing keys.
  - Pattern: `supabase/migrations/20260302113127_seed_initial_venues.sql:46-77` — seed data currently uses inconsistent keys such as `3hours`, `6hours`, `overnight`, and nested `package`.
  - Pattern: `src/app/venues/[id]/page.tsx:223-240` — pricing display expects a stable structure it can iterate safely.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun test src/lib/pcbang/contracts/pricing-contract.test.ts` exits 0.
  - [ ] Tests prove that legacy seed/admin formats normalize into the canonical key set before DB load.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Mixed legacy pricing keys normalize correctly
    Tool: Bash
    Steps: Run `bun test src/lib/pcbang/contracts/pricing-contract.test.ts`
    Expected: Exit code 0; fixtures using `3hours`, `6hours`, or nested `package` are transformed into canonical keys.
    Evidence: .sisyphus/evidence/pcbang/task-5-pricing-contract.txt

  Scenario: Missing tier name is rejected
    Tool: Bash
    Steps: Run `bun test src/lib/pcbang/contracts/pricing-contract.test.ts --filter "reject missing tier name"`
    Expected: Exit code 0; pricing payload without `tier_name` is marked invalid and cannot reach the loader.
    Evidence: .sisyphus/evidence/pcbang/task-5-pricing-contract-error.txt
  ```

  **Commit**: YES | Message: `feat(crawl): add pricing contract` | Files: `src/lib/pcbang/contracts/pricing-contract.ts`, `src/lib/pcbang/contracts/pricing-contract.test.ts`

- [ ] 6. Lock non-destructive dedupe and review-bucket load policy

  **What to do**: Define the exact match and collision behavior for crawler output. Use `normalized(name) + normalized(address_full) + address_district` as the primary dedupe key. Unmatched venues may insert automatically. Matched venues must not be overwritten; instead emit a diff entry to `review-needed.json`. Pricing for newly inserted venues may insert automatically. Pricing for matched venues or matched `(venue_id, tier_name)` combinations must also go to the review bucket. Invalid rows go to `errors.json`; incomplete but non-fatal rows go to `skipped.json` only when they fail contract checks. This task exists specifically to avoid copying the admin panel’s destructive update behavior.
  **Must NOT do**: Do not delete and re-insert existing pricing rows; do not auto-update admin-curated rows; do not use fuzzy duplicate matching beyond the locked key.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this task removes the biggest data-loss ambiguity.
  - Skills: `[]` — No special skill needed.
  - Omitted: `quick` — Collision policy must be explicit and testable.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 9, 11 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `src/app/admin/actions.ts:232-287` — current admin update path deletes and re-inserts pricing; crawler must not reuse that destructive policy.
  - Pattern: `src/app/admin/actions.ts:53-107` — service-role insert flow is reusable for new records only.
  - API/Type: `src/types/database.ts:271-315` — venue table shape to compare against.
  - Pattern: `tests/task-16-admin-crud.spec.ts:82-104` — existing repo already treats destructive deletes as an explicit action, so crawler automation must not hide equivalent behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun test src/lib/pcbang/load-policy.test.ts` exits 0.
  - [ ] Tests prove that matched venues and matched pricing tiers are written to `review-needed.json`, not updated in-place.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: New venue is insertable and existing venue is reviewed
    Tool: Bash
    Steps: Run `bun test src/lib/pcbang/load-policy.test.ts`
    Expected: Exit code 0; new fixture is marked `insertable`, matched fixture is marked `review-needed`.
    Evidence: .sisyphus/evidence/pcbang/task-6-load-policy.txt

  Scenario: Destructive overwrite attempt is blocked
    Tool: Bash
    Steps: Run `bun test src/lib/pcbang/load-policy.test.ts --filter "reject destructive overwrite"`
    Expected: Exit code 0; policy forbids delete/reinsert or update-in-place for matched crawler records.
    Evidence: .sisyphus/evidence/pcbang/task-6-load-policy-error.txt
  ```

  **Commit**: YES | Message: `feat(crawl): add non-destructive load policy` | Files: `src/lib/pcbang/load-policy.ts`, `src/lib/pcbang/load-policy.test.ts`

- [ ] 7. Implement approved-source auth and acquisition proof harness

  **What to do**: Build Playwright-based source access for the single approved source from Task 3. If the source is public, the harness must still verify clean-session access and sample venue navigation. If the source requires login, store ephemeral auth state outside git under `.sisyphus/evidence/pcbang/runtime/` and redact screenshots/traces before evidence publication. The harness must open the approved source, execute the fixed Seoul sample query, navigate to at least one detail page, and save stable selectors for later fixture capture.
  **Must NOT do**: Do not proceed if Task 3 returned `halt`; do not commit cookies/auth state; do not bypass CAPTCHA, MFA, or anti-bot defenses.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: browser automation and access control proof are implementation-heavy but bounded.
  - Skills: `[]` — No extra skill needed.
  - Omitted: `librarian` — Research is done; this is execution planning.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 8, 11 | Blocked By: 3

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `playwright.config.ts:7-35` — base Playwright configuration, desktop/mobile projects, trace policy, and dev server contract.
  - Pattern: `tests/task-15-admin-auth.spec.ts:7-89` — happy-path and failure-path auth proof pattern, including screenshot evidence.
  - Pattern: `e2e/admin.spec.ts:11-55` — end-to-end navigation and stable role-based selectors pattern.
  - Pattern: `.env.example:1-8` — env-driven secret handling precedent.
  - Pattern: `src/app/admin/login/actions.ts:17-27` — cookie/session state is already treated as runtime-only, not source-controlled.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx playwright test e2e/pcbang-source-auth.spec.ts --project=chromium-desktop` exits 0 after Task 3 approves a source.
  - [ ] The run writes redacted evidence under `.sisyphus/evidence/pcbang/` and keeps runtime auth state only under `.sisyphus/evidence/pcbang/runtime/`.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Clean-session acquisition succeeds
    Tool: Playwright
    Steps: Run `bunx playwright test e2e/pcbang-source-auth.spec.ts --project=chromium-desktop`; the spec must load `.sisyphus/evidence/pcbang/task-1-seoul-sample.json`, use selector aliases `search_input`, `first_result`, `detail_title`, and `price_section`, then capture a screenshot plus trace.
    Expected: Exit code 0; screenshot and trace exist; selector manifest is written with the four required aliases.
    Evidence: .sisyphus/evidence/pcbang/task-7-auth-proof.png

  Scenario: Expired auth or blocked access fails safely
    Tool: Playwright
    Steps: Run the same test with an intentionally expired session file or blocked access fixture.
    Expected: Exit code non-zero; error screenshot is written; no auth state is committed into tracked files.
    Evidence: .sisyphus/evidence/pcbang/task-7-auth-proof-error.png
  ```

  **Commit**: YES | Message: `feat(crawl): add source auth harness` | Files: `e2e/pcbang-source-auth.spec.ts`, `src/lib/pcbang/source-session.ts`, `package.json`

- [ ] 8. Capture sanitized fixtures and implement listing/pricing normalization

  **What to do**: Using the approved source and Task 7 harness, capture sanitized fixtures for the fixed Seoul sample panel, then implement parser/normalizer logic that converts source HTML/JSON into the canonical venue and pricing contracts from Tasks 4 and 5. Fixtures must include happy-path listing pages, detail pages, ambiguous price layouts, missing-geo cases, and duplicate-name cases. Redact tokens, cookies, account identifiers, and protected content before saving fixtures. Parsing logic must stop before any DB writes.
  **Must NOT do**: Do not load to Supabase in this task; do not store unredacted auth material; do not accept source-specific field names beyond the parser boundary.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: parsing and normalization are the core implementation slice.
  - Skills: `[]` — No special skill needed.
  - Omitted: `visual-engineering` — UI polish is irrelevant; only DOM extraction matters.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 9, 11 | Blocked By: 3, 4, 5, 7

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `src/types/venue.ts:18-37` — pricing is consumed as structured data attached to a venue.
  - Pattern: `src/app/map/page.tsx:28-56` — current map flow expects venue rows and related pricing/spec/peripheral fetches to be coherent.
  - Pattern: `src/utils/geo-parser.ts:14-56` — existing repo already isolates geo parsing behind a helper; follow that normalization style.
  - Pattern: `tests/task-16-admin-crud.spec.ts:53-56` — evidence screenshot path convention under `.sisyphus/evidence/`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run crawl:fixtures -- --source approved --sample-file .sisyphus/evidence/pcbang/task-1-seoul-sample.json --output-dir src/lib/pcbang/fixtures/approved-source` exits 0.
  - [ ] `bun run crawl:normalize -- --fixtures-dir src/lib/pcbang/fixtures/approved-source --output .sisyphus/evidence/pcbang/task-8-normalized.json` exits 0.
  - [ ] `bun test src/lib/pcbang/parser` exits 0 for happy, ambiguous-price, missing-geo, and duplicate-name fixtures.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Sanitized fixtures and normalized records generated
    Tool: Bash
    Steps: Run `bun run crawl:fixtures -- --source approved --sample-file .sisyphus/evidence/pcbang/task-1-seoul-sample.json --output-dir src/lib/pcbang/fixtures/approved-source`, then `bun run crawl:normalize -- --fixtures-dir src/lib/pcbang/fixtures/approved-source --output .sisyphus/evidence/pcbang/task-8-normalized.json`, then `bun test src/lib/pcbang/parser`
    Expected: Exit code 0 for all commands; fixtures are present; parser tests pass for canonical venue and pricing output; `.sisyphus/evidence/pcbang/task-8-normalized.json` exists and is load-ready.
    Evidence: .sisyphus/evidence/pcbang/task-8-normalized.json

  Scenario: Redaction guard blocks unsafe fixture content
    Tool: Bash
    Steps: Run `bun run crawl:fixtures -- --source approved --inject-fake-token --output-dir src/lib/pcbang/fixtures/approved-source-unsafe`
    Expected: Exit code non-zero; command reports token/cookie leakage; unsafe fixture directory is not accepted for downstream parsing.
    Evidence: .sisyphus/evidence/pcbang/task-8-fixtures-error.txt
  ```

  **Commit**: YES | Message: `feat(crawl): add fixtures and parser normalization` | Files: `src/lib/pcbang/fixtures/approved-source/*`, `src/lib/pcbang/parser/*`, `src/lib/pcbang/parser/*.test.ts`, `package.json`

- [ ] 9. Implement the Supabase loader with dry-run, insert, review, skip, and error outputs

  **What to do**: Build the loader that takes normalized records and applies the Task 6 policy against Supabase. Use the existing service-role client pattern, but only for `venues` and `venue_pricing`. Support `--dry-run` and `--apply`. For dry-run, emit deterministic `insertable.json`, `review-needed.json`, `skipped.json`, and `errors.json` without changing the database. For apply mode, insert only unmatched venues plus their pricing. On any child-row failure after a parent insert, roll back that venue’s inserted rows and record the row-level failure in `errors.json`.
  **Must NOT do**: Do not touch `venue_specs`, `venue_peripherals`, `venue_menu_items`, or `venue_images`; do not reuse the admin panel’s delete/reinsert update flow; do not perform partial successful writes without recording them.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: this is concrete persistence logic with edge-case handling.
  - Skills: `[]` — No extra skill needed.
  - Omitted: `artistry` — Creative exploration is not useful; correctness is.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 10, 11 | Blocked By: 4, 5, 6, 8

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `src/app/admin/actions.ts:14-19` — service-role Supabase client creation pattern.
  - Pattern: `src/app/admin/actions.ts:53-107` — safe insert path for new venue + pricing rows.
  - Pattern: `supabase/migrations/20260302112153_create_venue_schema.sql:6-35` — only `venues` and `venue_pricing` are in scope for this loader.
  - API/Type: `src/types/database.ts:271-315` — venue row shape used by the loader.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun test src/lib/pcbang/loader` exits 0.
  - [ ] `bun run crawl:load -- --input .sisyphus/evidence/pcbang/task-8-normalized.json --dry-run --output-dir .sisyphus/evidence/pcbang/task-9-load` exits 0 and writes all four artifact classes.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Dry-run classifies rows without mutating DB
    Tool: Bash
    Steps: Run `bun run crawl:load -- --input .sisyphus/evidence/pcbang/task-8-normalized.json --dry-run --output-dir .sisyphus/evidence/pcbang/task-9-load`
    Expected: Exit code 0; `insertable.json`, `review-needed.json`, `skipped.json`, and `errors.json` are all present; database row counts remain unchanged.
    Evidence: .sisyphus/evidence/pcbang/task-9-load/summary.json

  Scenario: Child-row failure rolls back parent insert
    Tool: Bash
    Steps: Run `bun test src/lib/pcbang/loader --filter "rollback on pricing insert failure"`
    Expected: Exit code 0; failed venue does not remain inserted; failure is recorded under `errors.json`.
    Evidence: .sisyphus/evidence/pcbang/task-9-load-error.txt
  ```

  **Commit**: YES | Message: `feat(crawl): add safe supabase loader` | Files: `scripts/pcbang/load.ts`, `src/lib/pcbang/loader/*`, `src/lib/pcbang/loader/*.test.ts`, `package.json`

- [ ] 10. Implement the manual-run orchestration command

  **What to do**: Create a single orchestration entrypoint `crawl:run` that enforces the source-approval gate, executes auth/acquisition, refreshes or reuses fixtures, normalizes records, performs a dry-run classification, and optionally applies insertable rows. It must support `--city seoul`, `--limit`, `--dry-run`, and `--output-dir`. It must stop immediately when the approved-source artifact is missing or when Task 3 wrote `status=halt`. Summary output must include `source`, `sample_size`, `inserted_count`, `review_count`, `skipped_count`, `error_count`, and `duration_ms`.
  **Must NOT do**: Do not hide dry-run vs apply mode; do not proceed without Task 3 output; do not require a human to manually stitch together subcommands.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: this is orchestration glue over already-defined modules.
  - Skills: `[]` — No additional skill needed.
  - Omitted: `deep` — The decision complexity is already resolved by earlier tasks.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 11, 12 | Blocked By: 9

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `package.json:5-12` — existing repo command registration style.
  - Pattern: `playwright.config.ts:30-34` — local dev server assumption for browser-driven steps.
  - Pattern: `.sisyphus/evidence/pcbang/task-3-source-decision.json` — orchestration gate input.
  - Pattern: `.sisyphus/evidence/pcbang/task-9-load/summary.json` — downstream artifact shape to preserve.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run crawl:run -- --city seoul --limit 20 --dry-run --output-dir .sisyphus/evidence/pcbang/run` exits 0.
  - [ ] The run writes `.sisyphus/evidence/pcbang/run/summary.json` with the required counters and approved source metadata.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Full dry-run orchestration succeeds
    Tool: Bash
    Steps: Run `bun run crawl:run -- --city seoul --limit 20 --dry-run --output-dir .sisyphus/evidence/pcbang/run`
    Expected: Exit code 0; summary artifact exists; all stage artifacts are nested under the chosen output directory.
    Evidence: .sisyphus/evidence/pcbang/run/summary.json

  Scenario: Missing approval gate stops execution
    Tool: Bash
    Steps: Temporarily point the command to a missing approval file and run `bun run crawl:run -- --city seoul --limit 20 --dry-run --decision-file .sisyphus/evidence/pcbang/missing.json --output-dir .sisyphus/evidence/pcbang/run-missing`
    Expected: Exit code non-zero; stderr contains `approved source decision file not found`; no DB load stage runs.
    Evidence: .sisyphus/evidence/pcbang/task-10-run-error.txt
  ```

  **Commit**: YES | Message: `feat(crawl): add manual run command` | Files: `scripts/pcbang/run.ts`, `src/lib/pcbang/orchestrator.ts`, `package.json`

- [ ] 11. Add rollback preview, env contract, and operator runbook

  **What to do**: Document the exact manual-run operating procedure and create a rollback preview command driven by the orchestration summary. Extend `.env.example` with the minimal crawler settings for the approved source (source identifier, optional username, optional password, optional session path), all clearly marked as runtime-only secrets. Write a runbook that covers dry-run, apply, review-bucket triage, rerun rules, and rollback preview. The rollback command may preview deletes for inserted venue/pricing rows only; it must never propose removing pre-existing rows.
  **Must NOT do**: Do not add recurring operations guidance; do not document or persist live secrets; do not allow rollback to target review-bucket or pre-existing records.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: operator-facing accuracy and clarity matter most here.
  - Skills: `[]` — No extra skill needed.
  - Omitted: `quick` — This must be careful, not terse.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 12 | Blocked By: 7, 8, 9, 10

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `.env.example:1-8` — current env file style and secret placeholders.
  - Pattern: `package.json:5-12` — script naming pattern to extend.
  - Pattern: `vercel.json:1-4` — deployment is simple; no recurring worker infra should be documented.
  - Pattern: `.sisyphus/evidence/pcbang/run/summary.json` — rollback preview input contract.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run crawl:rollback -- --summary .sisyphus/evidence/pcbang/run/summary.json --dry-run --output .sisyphus/evidence/pcbang/task-11-rollback-preview.json` exits 0.
  - [ ] `.env.example` documents crawler env keys without embedding real values, and `docs/ops/pcbang-manual-run.md` exists with dry-run/apply/review/rollback sections.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Rollback preview generated for inserted rows only
    Tool: Bash
    Steps: Run `bun run crawl:rollback -- --summary .sisyphus/evidence/pcbang/run/summary.json --dry-run --output .sisyphus/evidence/pcbang/task-11-rollback-preview.json`
    Expected: Exit code 0; preview lists only rows inserted by the current run and excludes pre-existing or review-bucket rows.
    Evidence: .sisyphus/evidence/pcbang/task-11-rollback-preview.json

  Scenario: Unsafe rollback target is rejected
    Tool: Bash
    Steps: Run `bun run crawl:rollback -- --summary .sisyphus/evidence/pcbang/forged-summary.json --dry-run --output .sisyphus/evidence/pcbang/task-11-rollback-invalid.json`
    Expected: Exit code non-zero; command reports invalid or forged run provenance and refuses to emit destructive actions.
    Evidence: .sisyphus/evidence/pcbang/task-11-rollback-error.txt
  ```

  **Commit**: YES | Message: `docs(crawl): add runbook and rollback preview` | Files: `.env.example`, `scripts/pcbang/rollback.ts`, `docs/ops/pcbang-manual-run.md`, `package.json`

- [ ] 12. Produce an end-to-end proof run and freeze the evidence bundle

  **What to do**: Execute one full end-to-end proof for the approved source against the Seoul-first sample set: source gate already approved, auth/acquisition verified, fixtures sanitized, parser passing, loader dry-run passing, then one final orchestrated dry-run against the designated local/test environment. Freeze the evidence bundle under `.sisyphus/evidence/pcbang/final/` with the approved source decision, auth proof, fixture manifest, test outputs, run summary, insert/review/skip/error artifacts, and rollback preview. This task is the only one that certifies the workflow as ready for `/start-work` execution.
  **Must NOT do**: Do not run apply mode against production without explicit human approval; do not leave the final evidence bundle incomplete; do not mark success if any required artifact is missing.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: this task coordinates multi-stage verification and evidence freezing.
  - Skills: `[]` — No extra skill needed.
  - Omitted: `deep` — Research is finished; this is a proof run.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: 10, 11

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `playwright.config.ts:13-17` — HTML report + trace settings for browser proof.
  - Pattern: `tests/task-16-admin-crud.spec.ts:53-56,76-79,100-103` — evidence screenshot convention.
  - Pattern: `.sisyphus/evidence/` — existing repo evidence root to preserve.
  - Pattern: `.sisyphus/evidence/pcbang/run/summary.json` — final summary schema to freeze.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx playwright test e2e/pcbang-source-auth.spec.ts --project=chromium-desktop && bun test src/lib/pcbang && bun run crawl:run -- --city seoul --limit 20 --dry-run --output-dir .sisyphus/evidence/pcbang/final && bun run crawl:rollback -- --summary .sisyphus/evidence/pcbang/final/summary.json --dry-run --output .sisyphus/evidence/pcbang/final/rollback-preview.json` exits 0.
  - [ ] `.sisyphus/evidence/pcbang/final/` contains the approved-source decision, auth proof, fixture manifest, summary, insert/review/skip/error artifacts, and rollback preview.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Final end-to-end evidence bundle is complete
    Tool: Bash
    Steps: Run `bunx playwright test e2e/pcbang-source-auth.spec.ts --project=chromium-desktop && bun test src/lib/pcbang && bun run crawl:run -- --city seoul --limit 20 --dry-run --output-dir .sisyphus/evidence/pcbang/final && bun run crawl:rollback -- --summary .sisyphus/evidence/pcbang/final/summary.json --dry-run --output .sisyphus/evidence/pcbang/final/rollback-preview.json`
    Expected: Exit code 0; final evidence directory contains every required artifact and no missing-file errors.
    Evidence: .sisyphus/evidence/pcbang/final/summary.json

  Scenario: Missing artifact prevents completion
    Tool: Bash
    Steps: Delete or rename one required artifact in a temporary copy of the final output and run the final verification script again.
    Expected: Exit code non-zero; verifier reports the missing artifact by exact filename and refuses to mark the bundle complete.
    Evidence: .sisyphus/evidence/pcbang/task-12-final-error.txt
  ```

  **Commit**: YES | Message: `test(crawl): freeze final evidence bundle` | Files: `.sisyphus/evidence/pcbang/final/*`, `scripts/pcbang/verify-final.ts`, `package.json`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> ZERO HUMAN INTERVENTION: all checks below are executable and agent-runnable with pass/fail exit codes.
- [ ] F1. Plan Compliance checks pass
  - Command: `bun run crawl:verify -- --check plan-compliance --plan .sisyphus/plans/pcbang-data-crawling.md --evidence-dir .sisyphus/evidence/pcbang/final`
  - Pass criteria: exit 0 and report includes `pass: true`.
- [ ] F2. Code quality checks pass
  - Command: `bun run lint && bun test src/lib/pcbang`
  - Pass criteria: all commands exit 0.
- [ ] F3. End-to-end dry-run proof passes
  - Command: `bunx playwright test e2e/pcbang-source-auth.spec.ts --project=chromium-desktop && bun run crawl:run -- --city seoul --limit 20 --dry-run --output-dir .sisyphus/evidence/pcbang/final`
  - Pass criteria: all commands exit 0 and `summary.json` is generated under `.sisyphus/evidence/pcbang/final/`.
- [ ] F4. Evidence completeness checks pass
  - Command: `bun run crawl:verify-final -- --dir .sisyphus/evidence/pcbang/final`
  - Pass criteria: exit 0 and verifier reports no missing required artifact.

## Commit Strategy
- Commit 1: `chore(crawl): add source evaluation rubric and artifacts`
- Commit 2: `test(crawl): add fixture capture and parser contracts`
- Commit 3: `feat(crawl): add approved-source acquisition flow`
- Commit 4: `feat(crawl): add venue and pricing normalizer`
- Commit 5: `feat(crawl): add safe supabase loader`
- Commit 6: `feat(crawl): add manual run orchestration`
- Commit 7: `docs(crawl): add runbook and evidence guide`

## Success Criteria
- Exactly one source is approved by the rubric, or execution halts with a machine-readable rejection artifact.
- All automated tests and Playwright acquisition proofs pass.
- Manual run loads only unmatched venues/pricing into Supabase and emits review artifacts for collisions.
- Evidence bundle is complete enough to replay pass/fail decisions without human memory.
- No credentials, cookies, or protected content are committed.
