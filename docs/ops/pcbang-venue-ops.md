# PC Bang Venue Operations Runbook

This runbook documents the operational PCBang venue ingestion workflow for the GetO and Pica sources.

## Default Workflow

Lite Mode is the **default practical ingestion path** for this repo.

The primary operational path is:

1. **Raw Collection** — capture source responses using the existing collectors
2. **Parsing** — normalize raw captures into stable canonical venue records
3. **Canonical Artifact** — inspect or reuse `canonical.json`
4. **Lite Load** — validate essential fields, dedupe, and load directly into `venues`

In short:

`raw collect -> parse -> canonical.json -> lite loader -> venues`

The legacy `load-policy -> venue-import` path still exists, but it is **advanced/manual only**.

---

## Lite Mode

Lite Mode keeps the current raw collectors and parser, skips the heavier load-policy stage, and loads `canonical.json` directly into the `venues` table with a simpler summary.

### What Lite Mode keeps

- Raw collection that already exists
- Source-specific parsing and canonical normalization
- Essential field validation (`name`, `address_full`, `address_district`, `lat`, `lng`)
- Dry-run by default
- Safe DB writes limited to the `venues` table
- Source provenance updates through `source_ids`
- Reproducible snapshot-backed dry-runs via `crawl:lite-load`

### What Lite Mode defers

- Source approval/evaluation workflows
- Load-policy review buckets
- Rollback preview / evidence freeze workflows
- Pricing ingestion beyond parser-level traceability
- Browser E2E verification for the data pipeline

### Minimal canonical shape

The Lite pipeline operates on canonical venue records with these practical fields:

- `source`
- `source_id`
- `name`
- `location_text`
- `address_full`
- `address_district`
- `lat`
- `lng`
- `pricing_summary` (when derivable)
- `raw_metadata` (for traceability)
- `source_ids`

---

## Prerequisites

### Environment Variables

Required for live DB apply operations:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

These must be set in your `.env` file or environment before running `--apply`.

For deterministic snapshot-backed dry-runs with `crawl:lite-load`, live DB credentials are **not required**.

For `crawl:lite-run` dry-runs without `--existing-snapshot`, the Lite loader still reads existing `venues` for deduplication, so env credentials are required in that mode.

### Dependencies

- Node.js/Bun runtime
- Supabase project with `venues` table
- Network access to current public source surfaces (GetO: `playgeto.com`, Pica: `picaplay.com`) for raw collection

### Permissions

- Service role key must have INSERT/UPDATE permissions on `venues` for `--apply`
- Raw collection targets must be accessible (no auth/captcha required for current presets)
- The target DB schema must include `venues.source_ids` for provenance-safe Lite apply runs

---

## Command Reference

### Default commands

```bash
bun run crawl:lite-run -- --source <geto|pica> [options]
bun run crawl:lite-load -- --input <canonical.json> [options]
```

### Default Lite commands

| Command | Purpose |
|---|---|
| `crawl:lite-run` | Default end-to-end path: collect -> parse -> lite load |
| `crawl:lite-load` | Load `canonical.json` directly into `venues` |
| `crawl:raw-collect` | Manual raw collection stage |
| `crawl:pica-followup` | Manual Pica detail follow-up stage |
| `crawl:parse-raw` | Manual raw -> canonical stage |

### `crawl:lite-run` flags

| Flag | Required | Values | Description |
|------|----------|--------|-------------|
| `--source` | Yes | `geto`, `pica` | Source to collect from |
| `--run-id` | No | string | Custom operation ID (default: timestamp) |
| `--apply` | No | (flag) | Apply inserts/updates to database (default: dry-run) |
| `--output-root` | No | path | Evidence root directory (default: `.sisyphus/evidence/pcbang`) |
| `--timeout-ms` | No | integer | HTTP timeout in ms (default: 30000) |
| `--existing-snapshot` | No | path | Existing venue snapshot JSON used by Lite load dedupe |
| `--limit` | No | integer | Limit venue count (Pica only) |
| `--seoul-only` | No | (flag) | Filter to Seoul venues only (Pica only) |
| `--pica-max-pages` | No | integer | Max list pages to fetch (Pica only, default: 20) |
| `--geto-district-limit` | No | integer | Max districts to fetch (GetO only, default: 5) |
| `--geto-max-pages-per-district` | No | integer | Max pages per district (GetO only, default: 2) |
| `--geto-max-list-pages` | No | integer | Max total list pages (GetO only, default: 10) |
| `--geto-max-details` | No | integer | Max detail pages to fetch (GetO only, no default limit) |

### `crawl:lite-load` flags

| Flag | Required | Values | Description |
|------|----------|--------|-------------|
| `--input` | Yes | path | Path to parser `canonical.json` or direct canonical JSON array |
| `--output-dir` | No | path | Output directory for Lite load reports |
| `--existing-snapshot` | No | path | Existing venue snapshot JSON for deterministic dry-runs |
| `--apply` | No | (flag) | Apply inserts/updates to database (default: dry-run) |

### Flag validation

- `--limit`, `--seoul-only`, and `--pica-max-pages` are only valid for Pica.
- `--geto-district-limit`, `--geto-max-pages-per-district`, `--geto-max-list-pages`, and `--geto-max-details` are only valid for GetO.
- `--apply` affects only the final Lite load stage.

---

## Usage Examples

### Lite Mode: one-command dry-run

```bash
# Pica example
bun run crawl:lite-run -- --source pica --seoul-only --limit 10

# GetO example
bun run crawl:lite-run -- --source geto --geto-max-details 20
```

### Lite Mode: one-command dry-run with snapshot-backed dedupe

```bash
bun run crawl:lite-run -- --source pica --seoul-only --limit 10 --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json
```

### Lite Mode: one-command apply

```bash
bun run crawl:lite-run -- --source pica --seoul-only --limit 10 --apply
```

### Lite Mode: stage-by-stage workflow

If you want to inspect the stable canonical layer directly:

```bash
# 1) Collect raw data (Pica example)
bun run crawl:raw-collect -- --source pica --run-id lite-pica-seed
bun run crawl:pica-followup -- --from-run lite-pica-seed --run-id lite-pica-detail --limit 10 --seoul-only

# 2) Normalize into canonical records
bun run crawl:parse-raw -- --source pica --run-id lite-pica-detail

# 3) Load canonical records with Lite Mode dry-run
bun run crawl:lite-load -- --input .sisyphus/evidence/pcbang/parser/pica/lite-pica-detail/canonical.json

# 4) Apply the same load to DB
bun run crawl:lite-load -- --input .sisyphus/evidence/pcbang/parser/pica/lite-pica-detail/canonical.json --apply
```

### Lite Mode: fully reproducible fixture dry-run

This requires no live DB because it uses a checked-in snapshot:

```bash
bun run crawl:lite-load -- --input tests/fixtures/pcbang/lite-canonical.json --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json
```

### Lite Mode summary output

Every Lite load prints and persists the same high-level counters:

- `total_seen`
- `valid`
- `inserted`
- `updated`
- `skipped`
- `errors`

`valid` is the number of deduped canonical venue records that passed essential field validation and are eligible for insert/update/skip decisions.

Artifacts are written under `.sisyphus/evidence/pcbang/lite-load/` and Lite orchestration summaries under `.sisyphus/evidence/pcbang/lite-run/`.

---

## Advanced / Manual Legacy Workflow

The older `load-policy -> venue-import` path still exists for manual inspection-heavy runs, but it is no longer the default operational workflow.

Use it only when you explicitly want `review-needed`, `skipped`, and `insertable.json` artifacts.

### Legacy orchestrator

```bash
bun run crawl:run -- --source <geto|pica> [options]
```

### Legacy stages

1. **Raw Collection** — Capture HTTP responses from source APIs
2. **Follow-up Collection** — Fetch detail pages for each venue
3. **Parsing** — Extract structured data from raw captures
4. **Load-Policy Classification** — Determine insertability and dedupe against existing venues
5. **Venue Import** — Insert new venues into the database (dry-run by default)

### Legacy examples

```bash
# GetO legacy dry-run
bun run crawl:run -- --source geto

# Pica legacy dry-run
bun run crawl:run -- --source pica --seoul-only --limit 10

# Legacy manual classification stage
bun run crawl:classify-load-policy -- --source pica --run-id lite-pica-detail
```

### Legacy artifacts

The legacy path writes `load-policy/` and `venue-import/` artifacts such as:

- `insertable.json`
- `review-needed.json`
- `skipped.json`
- `venue-import/summary.json`

---

## Artifact Layout

All artifacts are written under `.sisyphus/evidence/pcbang/` by default. You can override with `--output-root`.

```text
.sisyphus/evidence/pcbang/
├── raw/                          # Stage 1: Raw HTTP captures
│   ├── geto/
│   └── pica/
├── parser/                       # Parsed canonical data
│   ├── geto/
│   └── pica/
├── lite-load/                    # Default final load stage
│   ├── geto/
│   └── pica/
├── lite-run/                     # Default end-to-end Lite summaries
│   ├── geto/
│   └── pica/
├── load-policy/                  # Legacy advanced/manual classification
├── venue-import/                 # Legacy advanced/manual import results
└── run/                          # Legacy end-to-end summaries
```

### Key artifacts

#### Lite load summary

Path: `.sisyphus/evidence/pcbang/lite-load/<source>/<operation_id>/summary.json`

Contains:
- `total_seen`
- `valid`
- `inserted`
- `updated`
- `skipped`
- `errors`
- `apply_ran`

#### Lite run summary

Path: `.sisyphus/evidence/pcbang/lite-run/<source>/<operation_id>/summary.json`

Contains:
- Operation ID, source, mode
- Artifact paths for raw, parser, and Lite load stages
- Counts for raw success/failure and Lite load summary fields

#### Legacy insertable venues

Path: `.sisyphus/evidence/pcbang/load-policy/<source>/<stage_run_id>/insertable.json`

This is the input to the legacy `crawl:import-venues` stage.

#### Legacy venue import summary

Path: `.sisyphus/evidence/pcbang/venue-import/<source>/<operation_id>/summary.json`

Contains legacy import counts such as input venue count, deduped insert count, already-present count, and `apply_ran`.

---

## Caveats and Limitations

### No Automatic Resume/Retry

If a stage fails mid-operation, the pipeline does not resume automatically. Re-run the failed flow or stage.

### Pica Two-Stage Collection

Pica requires two raw collection stages:
1. **Seed** — Fetch paginated list pages to extract venue IDs
2. **Detail** — Dedupe seeds by SEQ, then fetch detail+map pages for each unique venue

The Lite path reuses this existing collection behavior.

### GetO Three-Stage Collection

GetO performs three raw collection stages:
1. **District fetch** — Fetch Seoul district list from the public API
2. **List pages** — Generate and fetch list page targets across Seoul districts/pages
3. **Detail** — Extract unique `shop_seq` values and fetch detail pages

The Lite path reuses this existing collection behavior.

### Deduplication

Venue deduplication uses `dedupe_key = name::address_full::district`.

For deterministic dry-runs, pass `--existing-snapshot` to `crawl:lite-load` or `crawl:lite-run`.

### Dry-Run is Default

Lite commands default to dry-run. No database writes occur unless you explicitly pass `--apply`.

### Legacy Commands Still Work

The legacy orchestrator and stage commands are still available for manual/advanced flows:

- `crawl:raw-collect`
- `crawl:pica-followup`
- `crawl:parse-raw`
- `crawl:classify-load-policy`
- `crawl:import-venues`

Lite Mode does not remove them; it simply stops treating them as the default operational path.

---

## Troubleshooting

### Raw Collection Fails

**Symptom:** `run-manifest.json` shows failures or partial failures.

**Diagnosis:**
1. Check `.sisyphus/evidence/pcbang/raw/<source>/<run_id>/run-manifest.json`
2. Look at `errors` for specific targets and messages

**Common causes:**
- Network timeout (increase `--timeout-ms`)
- Source API rate limiting
- Source shape changes requiring parser updates

### Parser Fails

**Symptom:** Parser throws or produces empty/invalid `canonical.json`.

**Diagnosis:**
1. Check `.sisyphus/evidence/pcbang/parser/<source>/<run_id>/diagnostics.json`
2. Look for `severity: "error"` entries

### Lite Load Fails

**Symptom:** Lite load completes but `errors.json` is non-empty.

**Diagnosis:**
1. Check `.sisyphus/evidence/pcbang/lite-load/<source>/<operation_id>/errors.json`
2. Look for `reason` such as `insert_failed` or `source_update_failed`

**Common causes:**
- Conflicting or malformed canonical input
- Database constraint violation
- Missing required fields (`name`, `address_full`, `address_district`, `lat`, `lng`)

### Supabase Connection Fails

**Symptom:** Apply mode throws that Supabase URL/service role key must be provided.

**Fix:** Set environment variables in `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Schema Missing `source_ids`

**Symptom:** Lite apply fails with an error that `venues.source_ids` does not exist.

**Meaning:** The code is Lite-Mode-ready, but the target DB schema has not received the provenance-safe `source_ids` column yet.

**Impact:**
- Dry-runs with `--existing-snapshot` still work
- Real Lite apply verification is blocked
- Provenance-safe `source_ids` merge behavior cannot be validated until the DB schema is aligned

---

## Next Steps

After a successful Lite `--apply` run:
1. Verify inserts in Supabase dashboard or via SQL
2. Review Lite load `summary.json`, `to-insert.json`, and `to-update.json`
3. If you intentionally used the legacy path, review `review-needed.json` in load-policy output
4. Archive the Lite or legacy operation summary for audit/reference

## Related Documentation

- [Source Evaluation](../../src/lib/pcbang/source-evaluation.ts) — Safety and feasibility rubric
- [Load Policy](../../src/lib/pcbang/load-policy.ts) — Legacy advanced/manual classification logic
- [Venue Contract](../../src/lib/pcbang/contracts/venue-contract.ts) — Schema validation
