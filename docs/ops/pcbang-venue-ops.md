# PC Bang Venue Operations Runbook

This runbook documents the end-to-end venue data collection and import process for the GetO and Pica sources.

## Overview

The `crawl:run` command orchestrates the full pipeline:

1. **Raw Collection**: Capture HTTP responses from source APIs
2. **Follow-up Collection**: Fetch detail pages for each venue
   - **Pica**: Fetches detail pages for venues extracted from paginated list (default 20 pages, configurable)
   - **GetO**: Fetches Seoul district list, generates list pages across multiple districts/pages (default: 5 districts × 2 pages/district, capped at 10 total), then fetches detail pages for all unique shop_seq values
3. **Parsing**: Extract structured data from raw captures
4. **Load-Policy Classification**: Determine insertability and dedupe against existing venues
5. **Venue Import**: Insert new venues into the database (dry-run by default)

Each stage writes artifacts to `.sisyphus/evidence/pcbang/`, and a top-level operation summary is written to `.sisyphus/evidence/pcbang/run/<source>/<operation_id>/summary.json`.

## Prerequisites

### Environment Variables

Required for venue import (stage 5):

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

These must be set in your `.env` file or environment before running `--apply`.
Dry-run import still reads the live `venues` table for deduplication, so these variables are also required for `crawl:run` dry-runs.

### Dependencies

- Node.js/Bun runtime
- Supabase project with `venues` table
- Network access to current public source surfaces (GetO: `playgeto.com`, Pica: `picaplay.com`)

### Permissions

- Service role key must have INSERT permissions on `venues` table
- Raw collection targets must be accessible (no auth/captcha required for current presets)

## Command Reference

### Basic Syntax

```bash
bun run crawl:run -- --source <geto|pica> [options]
```

### Flags

| Flag | Required | Values | Description |
|------|----------|--------|-------------|
| `--source` | Yes | `geto`, `pica` | Source to collect from |
| `--run-id` | No | string | Custom operation ID (default: timestamp) |
| `--apply` | No | (flag) | Apply inserts to database (default: dry-run) |
| `--output-root` | No | path | Evidence root directory (default: `.sisyphus/evidence/pcbang`) |
| `--timeout-ms` | No | integer | HTTP timeout in ms (default: 30000) |
| `--existing-snapshot` | No | path | Path to existing venue snapshot JSON for deduplication |
| `--limit` | No | integer | Limit venue count (Pica only) |
| `--seoul-only` | No | (flag) | Filter to Seoul venues only (Pica only) |
| `--pica-max-pages` | No | integer | Max list pages to fetch (Pica only, default: 20) |
| `--geto-district-limit` | No | integer | Max districts to fetch (GetO only, default: 5) |
| `--geto-max-pages-per-district` | No | integer | Max pages per district (GetO only, default: 2) |
| `--geto-max-list-pages` | No | integer | Max total list pages (GetO only, default: 10) |
| `--geto-max-details` | No | integer | Max detail pages to fetch (GetO only, no default limit) |

### Flag Validation

- `--limit`, `--seoul-only`, and `--pica-max-pages` are **only valid for Pica** source. Using them with GetO will fail.
- `--geto-district-limit`, `--geto-max-pages-per-district`, `--geto-max-list-pages`, and `--geto-max-details` are **only valid for GetO** source. Using them with Pica will fail.
- `--apply` affects **only the final venue import stage**. All prior stages always run.

## Usage Examples

### GetO: Dry-Run

Collect GetO targets across Seoul districts, parse, classify, and prepare for import (no database writes):

```bash
bun run crawl:run -- --source geto
```

**Expected output:**
- District fetch manifest in `.sisyphus/evidence/pcbang/raw/geto/<operation_id>-districts/`
- Raw collection (list pages) manifest in `.sisyphus/evidence/pcbang/raw/geto/<operation_id>-raw/`
- Raw collection (detail) manifest in `.sisyphus/evidence/pcbang/raw/geto/<operation_id>-detail/`
- Parsed canonical venues in `.sisyphus/evidence/pcbang/parser/geto/<operation_id>-detail/canonical.json`
- Insertable venues in `.sisyphus/evidence/pcbang/load-policy/geto/<operation_id>-detail/insertable.json`
- Dry-run import report in `.sisyphus/evidence/pcbang/venue-import/geto/<operation_id>/`
- Top-level summary in `.sisyphus/evidence/pcbang/run/geto/<operation_id>/summary.json`

**Note:** GetO now performs three raw collection stages: (1) fetch Seoul district list, (2) fetch list pages across districts, (3) fetch detail pages for all extracted shop_seq values.

**Default behavior:** Fetches 5 districts × 2 pages/district = 10 list pages (default cap), then extracts all unique shop_seq values and fetches their detail pages.

### GetO: Apply

Same as above, but inserts new venues into the database:

```bash
bun run crawl:run -- --source geto --apply
```

**Caution:** This writes to production if `SUPABASE_SERVICE_ROLE_KEY` points to production.

### GetO: Custom Operation ID

Use a custom operation ID for audit/reference:

```bash
bun run crawl:run -- --source geto --run-id prod-geto-2026-03-28
```

Stage run IDs will be:
- District fetch: `prod-geto-2026-03-28-districts`
- Raw (list pages): `prod-geto-2026-03-28-raw`
- Raw (detail): `prod-geto-2026-03-28-detail`
- Parser: `prod-geto-2026-03-28-detail`
- Load policy: `prod-geto-2026-03-28-detail`
- Venue import: `prod-geto-2026-03-28`

### GetO: Custom District and Page Limits

Control coverage breadth:

```bash
# Narrow: 2 districts × 1 page/district
bun run crawl:run -- --source geto --geto-district-limit 2 --geto-max-pages-per-district 1

# Broad: 10 districts × 3 pages/district, capped at 20 list pages
bun run crawl:run -- --source geto --geto-district-limit 10 --geto-max-pages-per-district 3 --geto-max-list-pages 20

# Limit detail fetches to first 50 unique venues
bun run crawl:run -- --source geto --geto-max-details 50
```

### Pica: Dry-Run with Seoul Filter and Limit

Collect Pica paginated list (default 20 pages), follow up with detail pages for up to 10 Seoul venues, then parse/classify/dry-run import:

```bash
bun run crawl:run -- --source pica --seoul-only --limit 10
```

**Expected behavior:**
1. Seed collection: Fetch Pica venue list pages 1-20 (default, configurable)
2. Extract and dedupe seeds by SEQ across all list pages
3. Detail collection: Filter to Seoul addresses, limit to 10, fetch detail+map pages (20 HTTP requests total)
4. Parse the 20 detail captures
5. Classify and prepare insertable venues
6. Dry-run import (no DB writes)

### Pica: Custom Page Count

Increase coverage by fetching more list pages:

```bash
# Fetch 50 list pages instead of default 20
bun run crawl:run -- --source pica --pica-max-pages 50 --seoul-only

# Narrow test: 3 pages only
bun run crawl:run -- --source pica --pica-max-pages 3 --limit 5
```

### Pica: Apply

Full Pica collection with database inserts:

```bash
bun run crawl:run -- --source pica --apply
```

**Caution:** Without `--limit`, this collects **all Pica venues** (potentially hundreds). Use `--limit` for testing.

### Pica: With Existing Snapshot

Pass an existing venue snapshot to improve deduplication accuracy:

```bash
bun run crawl:run -- --source pica --existing-snapshot .sisyphus/evidence/venue-snapshot-2026-03-27.json --apply
```

## Artifact Layout

All artifacts are written under `.sisyphus/evidence/pcbang/` by default. You can override with `--output-root`.

### Directory Structure

```
.sisyphus/evidence/pcbang/
├── raw/                          # Stage 1: Raw HTTP captures
│   ├── geto/
│   │   └── <operation_id>-raw/
│   │       ├── captures/         # Individual target captures
│   │       └── run-manifest.json # Collection metadata
│   └── pica/
│       ├── <operation_id>-seed/  # Pica seed (list) collection
│       └── <operation_id>-detail/ # Pica follow-up (detail) collection
├── parser/                       # Stage 3: Parsed canonical data
│   ├── geto/
│   │   └── <operation_id>-detail/
│   │       ├── canonical.json    # Valid canonical venues
│   │       ├── diagnostics.json  # Parser warnings/errors
│   │       └── parser-manifest.json
│   └── pica/
│       └── <operation_id>-detail/
├── load-policy/                  # Stage 4: Classification
│   ├── geto/
│   │   └── <operation_id>-detail/
│   │       ├── insertable.json   # Ready to insert
│   │       ├── review-needed.json # Manual review required
│   │       ├── skipped.json      # Filtered out
│   │       ├── errors.json       # Classification errors
│   │       └── summary.json
│   └── pica/
│       └── <operation_id>-detail/
├── venue-import/                 # Stage 5: Import results
│   ├── geto/
│   │   └── <operation_id>/
│   │       ├── to-insert.json    # Venues that would be inserted
│   │       ├── already-present.json # Dedupe matches
│   │       ├── errors.json       # Import errors
│   │       └── summary.json
│   └── pica/
│       └── <operation_id>/
└── run/                          # Top-level operation summaries
    ├── geto/
    │   └── <operation_id>/
    │       └── summary.json      # End-to-end operation summary
    └── pica/
        └── <operation_id>/
            └── summary.json
```

### Key Artifacts

#### Operation Summary

Path: `.sisyphus/evidence/pcbang/run/<source>/<operation_id>/summary.json`

Contains:
- Operation ID, source, mode (dry-run or apply)
- Start/completion timestamps
- Stage run IDs (raw, parser, load-policy, venue-import)
- Artifact paths for all stages
- Counts: raw success/failure, parsed canonical, insertable venues/pricing, already present, import errors
- Whether `--apply` ran

#### Insertable Venues

Path: `.sisyphus/evidence/pcbang/load-policy/<source>/<stage_run_id>/insertable.json`

Format:
```json
{
  "venues": [
    {
      "dedupe_key": "venue-name::address-full::district",
      "venue": {
        "name": "...",
        "lat": 37.123,
        "lng": 127.456,
        "address_full": "...",
        "address_district": "...",
        ...
      }
    }
  ],
  "pricing": [...]
}
```

This is the input to the venue import stage.

#### Venue Import Summary

Path: `.sisyphus/evidence/pcbang/venue-import/<source>/<operation_id>/summary.json`

Contains:
- Input venue count (before deduplication)
- Deduped insert count (unique venues to insert)
- Already present count (matched existing venues by dedupe key)
- Error count
- `apply_ran`: true if inserts were written to database

## Caveats and Limitations

### No Automatic Resume/Retry

If a stage fails mid-operation, the orchestrator **does not resume**. You must:
1. Diagnose the failure (check stage manifests/errors)
2. Re-run the full `crawl:run` command (or run individual stage commands if needed)

### Pica Two-Stage Collection

Pica requires two raw collection stages:
1. **Seed**: Fetch paginated list pages (default 20 pages, configurable via `--pica-max-pages`) to extract venue IDs
2. **Detail**: Dedupe seeds by SEQ, then fetch detail+map pages for each unique venue

The orchestrator handles this automatically. If you need to re-run only the detail stage, use the standalone `crawl:pica-followup` command.

### GetO Three-Stage Collection

GetO now performs three raw collection stages:
1. **District fetch**: Fetch Seoul district list from the public API
2. **List pages**: Generate and fetch list page targets across Seoul districts (default: 5 districts × 2 pages/district, capped at 10 total, configurable)
3. **Detail**: Extract unique shop_seq values from all list HTMLs, then fetch each detail page

The orchestrator handles this automatically. Default behavior fetches significantly more venues than the previous single-district approach.

### Deduplication

Venue deduplication uses `dedupe_key = name::address_full::district`. If any of these fields differ slightly (e.g., whitespace, typos), the venue will be treated as new.

**Best practice:** Pass `--existing-snapshot` with a recent venue snapshot to improve accuracy.

### Network Timeouts

Default timeout is 30 seconds per HTTP request. If targets are slow, increase with `--timeout-ms`:

```bash
bun run crawl:run -- --source geto --timeout-ms 60000
```

### Dry-Run is Default

**The orchestrator defaults to dry-run.** No database writes occur unless you explicitly pass `--apply`.

### Existing Stage Commands Still Work

The orchestrator wraps existing stage commands. You can still run them individually if needed:
- `crawl:raw-collect`
- `crawl:pica-followup`
- `crawl:parse-raw`
- `crawl:classify-load-policy`
- `crawl:import-venues`

The orchestrator does **not** replace them.

## Troubleshooting

### Raw Collection Fails

**Symptom:** `run-manifest.json` shows `status: "partial_failure"` and errors array is non-empty.

**Diagnosis:**
1. Check `.sisyphus/evidence/pcbang/raw/<source>/<run_id>/run-manifest.json`
2. Look at `errors` array for specific target IDs and error messages

**Common causes:**
- Network timeout (increase `--timeout-ms`)
- Source API rate limiting (add delay between requests in `collector.ts`)
- Auth/captcha requirement (check `source-presets.ts` target safety flags)

### Parser Fails

**Symptom:** Parser stage throws error or produces empty `canonical.json`.

**Diagnosis:**
1. Check `.sisyphus/evidence/pcbang/parser/<source>/<run_id>/diagnostics.json`
2. Look for `severity: "error"` entries

**Common causes:**
- Source changed response format (update parser logic in `parser/<source>/`)
- Raw capture is malformed (re-run raw collection)

### Import Fails

**Symptom:** Import stage completes but `errors.json` is non-empty.

**Diagnosis:**
1. Check `.sisyphus/evidence/pcbang/venue-import/<source>/<operation_id>/errors.json`
2. Look for `reason` field (e.g., `insert_failed`, `duplicate_input_dedupe_key`)

**Common causes:**
- Duplicate input venues (same dedupe key in input files)
- Database constraint violation (check schema requirements)
- Missing required fields (check `venue-contract.ts`)

### Supabase Connection Fails

**Symptom:** Import stage throws "Supabase URL and service role key must be provided".

**Fix:** Set environment variables in `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Next Steps

After a successful `--apply` run:
1. Verify inserts in Supabase dashboard or via `SELECT * FROM venues ORDER BY created_at DESC LIMIT 10`
2. Review `already-present.json` for venues that were skipped due to deduplication
3. Review `review-needed.json` in load-policy output for venues that need manual inspection
4. Archive the operation summary for audit/reference

## Related Documentation

- [Source Evaluation](../../src/lib/pcbang/source-evaluation.ts) — Safety and feasibility rubric
- [Load Policy](../../src/lib/pcbang/load-policy.ts) — Classification logic
- [Venue Contract](../../src/lib/pcbang/contracts/venue-contract.ts) — Schema validation
