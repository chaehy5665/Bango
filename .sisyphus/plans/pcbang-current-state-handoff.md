# PCBang Current State Handoff

This file is the **current operational handoff** for PCBang venue ingestion.

Use this file as the operational starting point. Treat `@.sisyphus/plans/pcbang-data-crawling.md` as historical background only.

---

## 1. Default Operational Workflow

Lite Mode is the **default practical ingestion path**.

The primary workflow is:

`raw collect -> parse -> canonical.json -> lite loader -> venues`

Operational meaning:

1. Collect raw source data using the existing collectors
2. Parse raw captures into canonical venue records
3. Inspect or reuse `canonical.json`
4. Load directly into `venues` with Lite Mode

The older `load-policy -> venue-import` path still exists, but should be treated as **advanced/manual only** when you explicitly need review artifacts like `insertable.json` or `review-needed.json`.

---

## 2. Default Commands

### One-command Lite pipeline

```bash
# Dry-run
bun run crawl:lite-run -- --source pica --seoul-only --limit 10

# Dry-run with snapshot-based dedupe
bun run crawl:lite-run -- --source pica --seoul-only --limit 10 --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json

# Apply
bun run crawl:lite-run -- --source pica --seoul-only --limit 10 --apply
```

### Stage-by-stage Lite pipeline

```bash
# Pica seed collection
bun run crawl:raw-collect -- --source pica --run-id lite-pica-seed

# Pica detail follow-up
bun run crawl:pica-followup -- --from-run lite-pica-seed --run-id lite-pica-detail --limit 10 --seoul-only

# Canonical normalization
bun run crawl:parse-raw -- --source pica --run-id lite-pica-detail

# Lite dry-run load
bun run crawl:lite-load -- --input .sisyphus/evidence/pcbang/parser/pica/lite-pica-detail/canonical.json

# Lite apply load
bun run crawl:lite-load -- --input .sisyphus/evidence/pcbang/parser/pica/lite-pica-detail/canonical.json --apply
```

### Reproducible fixture-based dry-run

```bash
bun run crawl:lite-load -- --input tests/fixtures/pcbang/lite-canonical.json --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json
```

---

## 3. What Is Verified

### Lite Mode verification

- `bun test src/lib/pcbang/pipeline/run-parser.test.ts src/lib/pcbang/pipeline/run-lite-venue-load.test.ts` passes
- `bun run crawl:lite-load -- --input tests/fixtures/pcbang/lite-canonical.json --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json --output-dir .sisyphus/evidence/pcbang/lite-load/verify-fixture` passes
- `bun run build` passes

### Verified fixture dry-run summary

- `total_seen = 3`
- `valid = 2`
- `inserted = 1`
- `updated = 1`
- `skipped = 1`
- `errors = 0`
- `apply_ran = false`

---

## 4. Current Repo State

### Lite Mode files

- `scripts/pcbang/run-lite.ts`
- `scripts/pcbang/run-lite-load.ts`
- `src/lib/pcbang/pipeline/run-lite-crawl.ts`
- `src/lib/pcbang/pipeline/run-lite-venue-load.ts`
- `src/lib/pcbang/pipeline/run-lite-venue-load.test.ts`
- `tests/fixtures/pcbang/lite-canonical.json`
- `tests/fixtures/pcbang/lite-existing-snapshot.json`

### Documentation aligned to Lite Mode

- `README.md`
- `docs/ops/pcbang-venue-ops.md`
- `.sisyphus/plans/pcbang-lite-mode-handoff.md`

### Important limitation

The working tree may still contain unrelated local changes outside the Lite Mode slice (for example source provenance / filter UI work). Those should be isolated before release or PR creation.

### Apply-path blocker

The current target DB used for operational verification is missing `venues.source_ids`.

Result:
- Lite dry-run is verified
- real Lite `--apply` is currently blocked
- provenance-safe source merge cannot be validated until the DB schema is aligned

---

## 5. Background / Legacy Context

### Broader crawl-era background

- The live DB was previously repopulated using the broader crawler/import pipeline.
- Historical broader crawl work reached **114 live venues**.
- Historical pushed crawl commits ended at `26a8083`.

### Legacy operational path

The old path was:

`raw collect -> parse -> load-policy -> venue-import`

That path is still available through:

- `crawl:run`
- `crawl:classify-load-policy`
- `crawl:import-venues`

Use it only if you intentionally need manual review artifacts.

### Historical docs and evidence

- `@.sisyphus/plans/pcbang-data-crawling.md` is historical / pre-Lite Mode
- Older `.sisyphus/evidence/pcbang/task-*.json` files belong to the earlier approval-oriented workflow and are not the current operational default

---

## 6. Caveats

- Lite Mode still depends on the existing source-specific raw collection shape
- `crawl:lite-load` supports deterministic dry-runs with `--existing-snapshot`
- `crawl:lite-run` dry-runs still need env credentials unless `--existing-snapshot` is supplied
- DB writes remain limited to `venues` and `source_ids` provenance updates
- `pricing_tiers` are still not loaded into the DB in Lite Mode

---

## 7. Recommended Next Step

Treat Lite Mode as the standard ingestion path.

Only use the legacy `load-policy` stage when you explicitly need manual review artifacts.
