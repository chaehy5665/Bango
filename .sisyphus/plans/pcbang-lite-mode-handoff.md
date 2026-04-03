# PCBang Lite Mode Handoff

## What Lite Mode is

Lite Mode is the smallest production-usable PCBang data path in this repo:

1. collect raw source data
2. normalize it into canonical venue records
3. validate essential required fields
4. load directly into `venues`
5. print a simple reproducible summary

It intentionally reuses the existing collectors and parser while skipping the heavier `load-policy` classification workflow.

This is now the **default operational workflow** for practical PCBang ingestion in this repo.

The legacy `load-policy -> venue-import` path is retained for advanced/manual inspection only.

## What was intentionally deferred

- source approval / evaluation gates
- review-needed classification buckets
- rollback preview / evidence freeze workflows
- pricing ingestion beyond parser traceability
- broad browser E2E verification
- schema redesign beyond the existing `venues` table

## Repo paths added for Lite Mode

- `src/lib/pcbang/pipeline/run-lite-venue-load.ts`
- `src/lib/pcbang/pipeline/run-lite-crawl.ts`
- `scripts/pcbang/run-lite-load.ts`
- `scripts/pcbang/run-lite.ts`

## Commands to run

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

# Reproducible fixture-based dry-run (no live DB required)
bun run crawl:lite-load -- --input tests/fixtures/pcbang/lite-canonical.json --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json
```

## Current limitations

- Lite Mode still depends on the existing source-specific raw collection shape
- Standalone staged example is simplest for `pica`; `geto` is easiest through `crawl:lite-run`
- DB writes remain limited to `venues` and source provenance updates via `source_ids`
- `pricing_tiers` are still not loaded into the DB in Lite Mode

## Next recommended step

Treat Lite Mode as the standard ingestion path. Only use the old `load-policy` stage when you explicitly need manual review artifacts such as `review-needed.json` and `insertable.json`.
