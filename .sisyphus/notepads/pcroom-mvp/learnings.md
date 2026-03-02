
## Task 2: Next.js 16 Project Scaffolding

### Key Learnings

#### Next.js 16 Defaults & Breaking Changes
1. **TypeScript, App Router, Tailwind, ESLint**: All default in v16 — the create-next-app wizard made them default options
   - Passing flags like `--typescript --tailwind --eslint` is redundant but doesn't hurt
   - These are pre-selected in the interactive prompts

2. **Turbopack is Default Bundler**:
   - No `--turbopack` flag needed — it's automatically used
   - Confirmed in build output: "Next.js 16.1.6 (Turbopack)"
   - Build time is fast: ~2.5s TypeScript compilation

3. **ESLint Flat Config (Breaking Change)**:
   - `next lint` command NO LONGER EXISTS
   - Must use `eslint .` directly (not `eslint` alone)
   - ESLint 9+ is installed with flat config support
   - Config file: `eslint.config.mjs` (not .eslintrc.json)

4. **Package Manager: Bun**:
   - `bun add` works identically to npm/yarn
   - `bun run` for scripts
   - Lockfile: `bun.lock` (replaces package-lock.json)
   - Installation was ~4 seconds for 14 packages (very fast)

#### Project Structure (src-dir mode)
```
src/
├── app/          # App Router pages
│   ├── globals.css (generated with Tailwind variables)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/       (empty, ready for shadcn components)
└── lib/
    ├── utils.ts  (shadcn utilities)
    └── query-client.ts (created manually)
```

#### shadcn/ui Integration (v3.8.5)
- **Command**: `bunx shadcn@latest init -d` (with -d flag for defaults)
- **Config**: `components.json` created with:
  - Style: "new-york"
  - RSC: true
  - Tailwind CSS variables enabled
  - Aliases configured for @/components, @/lib, etc.
- **Dependencies Added**: 
  - lucide-react (icons)
  - radix-ui (headless component library)
  - class-variance-authority & clsx (styling utilities)
  - tailwind-merge (utility merging)

#### QueryClient Configuration
- Created `src/lib/query-client.ts` with React Query 5.90.21
- Default settings:
  - staleTime: 5 minutes
  - gcTime (formerly cacheTime): 10 minutes
  - refetchOnWindowFocus: false
  - retry: 1 for both queries and mutations
- Ready to be used with QueryClientProvider in root layout

#### Package Versions Installed
- Next.js 16.1.6
- React 19.2.3
- React DOM 19.2.3
- TypeScript 5.9.3
- Tailwind CSS 4.2.1 (with PostCSS 4.2.1)
- ESLint 9.39.3
- @supabase/ssr 0.8.0 (Next.js 16 SSR compatible)
- @tanstack/react-query 5.90.21

#### Import Alias Configuration
- `@/*` → `./src/*` (correctly set in tsconfig.json)
- Works seamlessly with TypeScript language server
- Applied to all scaffolding imports automatically

#### Build & Lint Verification
- ✓ `bun run build`: Complete success, zero errors
- ✓ `bun run lint`: Zero ESLint errors
- Both commands run without warnings (except turbopack.root note, which is informational)

### Next Steps (Post-Scaffolding)
1. Create `.env.local` from `.env.example` (not needed yet, Task 1 provides template)
2. Set up Root Layout QueryClientProvider wrapper (Task 4)
3. Create Supabase client initialization (Task 4)
4. All async patterns (params, cookies, headers) will be needed in later tasks

### Gotchas & Notes
- ⚠️ create-next-app auto-initializes git repository — will be reset in Task 3
- ⚠️ Had to backup/restore existing .env and .sisyphus files before scaffolding
- ⚠️ ESLint script MUST be `eslint .` not just `eslint` to avoid errors
- ✓ All Bun operations work identically to npm (fast & reliable)
- ✓ TypeScript strict mode enabled by default

## Task 3: Supabase Setup + PostGIS Migration

### Key Learnings

#### Supabase CLI Installation & Init
- `bun add -D supabase` installs CLI as dev dependency (v2.76.15)
- `bunx supabase init` creates supabase/ directory with:
  - `config.toml`: Full configuration template
  - `migrations/`: Directory for SQL migrations
  - `.gitignore`: Excludes `.temp/` directory
- **No interactive prompts** when running `init` (unlike some CLI tools)

#### Config.toml Setup
- Auto-generated with sensible defaults for local development
- Must update:
  - `project_id = "jbldwfoxshfterhlhns"` (extracted from NEXT_PUBLIC_SUPABASE_URL)
  - `api_url = "https://jbldwfoxshfterhlhns.supabase.co"` (from .env)
- Other configs (DB ports, auth settings) use defaults fine for local dev
- `site_url = "http://127.0.0.1:3000"` (already correct for Next.js dev server)

#### PostGIS Migration Pattern
- `bunx supabase migration new enable_postgis` creates timestamped SQL file
- Naming: `20260302111633_enable_postgis.sql` (timestamp format)
- Content: `CREATE EXTENSION IF NOT EXISTS postgis;` is idempotent
- **IF NOT EXISTS** pattern prevents errors on re-runs

#### Supabase Client Patterns (Next.js 16)

##### Browser Client (`src/lib/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```
- Minimal, synchronous function
- Returns configured Supabase client for browser contexts
- Use in Client Components only
- Non-async (no cookies needed in browser)

##### Server Client (`src/lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // CRITICAL: await in Next.js 16+
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — setAll called from Server Component
            // This error is expected and can be safely ignored
          }
        },
      },
    }
  )
}
```

Key differences from Next.js 15:
- **async function** (not sync)
- **await cookies()** is REQUIRED in Next.js 16+ (breaking change)
- Try-catch for setAll is expected (Server Component limitation)
- Both named exports: `createClient()` (client.ts) and `createClient()` (server.ts)
  - Import them separately: `import { createClient as createBrowserClient } from '@/lib/supabase/client'`

#### Environment Variables
Minimum required in .env.example:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Note:
- NEXT_PUBLIC_* are exposed to browser (safe to use in Client Components)
- SUPABASE_SERVICE_ROLE_KEY is SECRET (server-only, never exposed)

#### Build & TypeScript Verification
- `bun run build` succeeds with zero errors
- All new files compile correctly
- No additional type definitions needed (@supabase/ssr includes them)
- Next.js dev server works with new configs

#### Project Structure After Task 3
```
supabase/
├── config.toml (project_id + api_url set)
├── migrations/
│   └── 20260302111633_enable_postgis.sql (PostGIS extension)
└── .gitignore

src/lib/supabase/
├── client.ts (browser client factory)
└── server.ts (server client factory, async cookies)

.env.example (documented all Supabase vars)
```

### Gotchas & Notes
- ⚠️ Supabase CLI shows version mismatch warning (v2.76.0 available, v2.15.8 installed)
  - Not blocking; update can be deferred to future maintenance
- ✓ CLI commands work perfectly even with version diff
- ✓ Migration naming is automatic (doesn't require manual timestamp)
- ✓ config.toml has 295 lines; only need to edit `project_id` and `api_url`
- ✓ Both client.ts and server.ts patterns match official Supabase + Next.js 16 docs

### Dependencies Ready for Next Tasks
- Task 4 can now create database tables and indexes
- Task 5 can set up Realtime subscriptions
- Task 6 can implement Row-Level Security (RLS)
- Task 7 can seed initial data

### Manual Setup NOT DONE (expected)
- ❌ `supabase login` (requires manual interactive auth with Supabase account)
- ❌ `supabase db push` (will be done in Task 4 when schema exists)
- ❌ Linking to remote Supabase project (requires live credentials)

These are expected; local dev setup is complete.

## Task 4: Database Schema Design + Migration

### Key Learnings
- A single normalized venue core table plus six dependent tables covers MVP read-only needs cleanly while keeping write complexity low for future admin tooling.
- Enforcing enum types in SQL (`peripheral_type`, `image_category`) gives downstream TypeScript generators deterministic unions without extra application-level validation.
- Adding `created_at`/`updated_at` to every table with one shared trigger function keeps auditing consistent and reduces per-query timestamp handling in app code.

### Schema Design Decisions
- `venues.location` uses `GEOGRAPHY(POINT, 4326)` for accurate distance calculations on lat/lng coordinates from Kakao Maps; this avoids planar-distance distortion from `geometry` in city-wide radius queries.
- `operating_hours` and `pricing_structure` use JSONB so each PC bang can model real-world variability (weekday/weekend windows, package tiers like 3-hour/overnight) without migration churn.
- All dependent tables use `ON DELETE CASCADE` to prevent orphaned rows when a venue is removed, which is important for operational cleanup as seed/admin pipelines evolve.
- Added practical check constraints (non-negative prices/seats/speeds, positive RAM, JSON object validation for pricing) to protect data quality at the DB boundary.

### PostGIS Patterns
- Spatial performance is anchored on `CREATE INDEX idx_venues_location ON venues USING GIST (location);` for nearest-neighbor and radius filters.
- District-level browse filters are supported with `idx_venues_address_district`, letting app queries combine coarse district filtering with fine spatial sorting.
- Geography + GIST is the right default for Seoul-first map browsing where distance accuracy and geo-query performance both matter.

### Korean-Specific Considerations
- Address fields separate full road-name address (`address_full`) from district (`address_district`) to match Korean filtering UX patterns (구 단위 탐색).
- `amenities` as `TEXT[]` supports common Korean PC bang labels directly (24시간, 흡연실, 샤워실, 무료 음료) without join-table overhead in MVP.
- Menu schema keeps category text flexible for Korean taxonomy (라면, 음료, 스낵, 주류) while preserving strict KRW integer pricing.

### Gotchas & Notes
- `bunx supabase db lint` completed without schema errors; only pre-existing warnings for unused parameters in unrelated public functions were reported.
- `bun run build` succeeded with zero TypeScript errors after migration creation.
- Supabase CLI emitted a non-blocking update notice (installed v2.15.8 vs latest v2.75.0).

## Task 5: PostGIS RPC Functions for Geo-Queries

### Key Learnings
- Consolidating the user point construction into a local `user_location` geography variable keeps both `nearby_venues` and `nearest_venues` readable and avoids repeating `ST_SetSRID(ST_MakePoint(...))` in multiple clauses.
- Returning full venue payload plus `distance_meters` from SQL lets map/list UIs consume one RPC response without extra distance calculations in TypeScript.
- Setting `STABLE` on read-only RPC functions aligns with Supabase/PostgreSQL planner expectations for deterministic query optimization.

### PostGIS RPC Patterns
- `ST_DWithin(v.location, user_location, radius_meters)` is used for radius filtering because it can leverage the existing `venues.location` GIST index efficiently.
- `ST_Distance(v.location, user_location)` is used for precise meter-distance output and ordering in both functions.
- Coordinate construction must remain `ST_MakePoint(user_lng, user_lat)` (longitude first, latitude second) to avoid silently incorrect distance sorting.

### Security Model
- Both functions are `SECURITY DEFINER` so Phase 1 map reads can execute reliably even before RLS policies are introduced in later phases.
- Explicit grants to `anon` and `authenticated` expose only function execution, not unrestricted table privileges.
- `SET search_path = public` is included in each SECURITY DEFINER function to reduce search-path hijacking risk.

### Performance Considerations
- Radius query uses index-friendly `ST_DWithin` prefiltering before sorting by `ST_Distance`.
- Both functions enforce `LIMIT` defaults (`20` for nearby, `10` for nearest) to cap result-set size in dense Seoul districts.
- Keeping `location` as `GEOGRAPHY(POINT, 4326)` preserves accurate meter-based calculations without manual projection handling.

### Gotchas & Notes
- `supabase db lint` reported only pre-existing warnings for unrelated queue functions (`unused parameter processor_name`), with no new migration errors.
- `bun run build` completed successfully; only the existing Turbopack workspace-root warning appeared.

## Task 6: Initial Data Seeding Pipeline

### Key Learnings
- Seed migrations stay maintainable by separating venue base rows from dependent table inserts and joining by stable venue names.
- Realistic MVP test data should mirror Korean PC bang ops patterns (24시간 운영, 시간권 패키지, 라면/음료 중심 메뉴) so UI edge cases surface early.
- Multi-row VALUES blocks keep large seed sets readable while preserving deterministic relationships across tables.

### Korean Data Patterns
- Venue naming followed Korean local style with district/branch qualifiers (강남역점, 홍대, 잠실) for map and detail-page realism.
- Hourly seat pricing kept within market range (1,200~1,900원), with 3시간/6시간/야간 패키지 and occasional 30시간/50시간 package JSON.
- Amenities used localized labels in TEXT[] (`24시간`, `무료 음료`, `흡연실`, `샤워실`, `프린터`, `VR존`) to match expected filter vocabulary.
- Menu catalog used common PC bang items and KRW prices across 라면/음료/스낵/식사/주류 categories.

### PostGIS Seeding
- Venue points were inserted with `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` and kept in Seoul bounds.
- Coordinate ordering remained longitude-first to align with existing PostGIS RPC expectations.

### JSONB Seeding
- `operating_hours` seeded as JSON objects (weekday/weekend or full-day style) per venue profile.
- `pricing_structure` seeded as JSON objects with hourly/package keys, complying with schema check constraints.

### Seed Data Strategy
- Seeded 10 venues across 10 Seoul districts (강남구, 마포구, 종로구, 송파구, 영등포구, 관악구, 광진구, 노원구, 서대문구, 구로구).
- Each venue includes complete dependent data: pricing tiers, one hardware spec row, four peripherals, six menu items, and three image rows.
- Data variety balances realistic operational differences (24시간 vs 심야영업, parking availability, hardware tiers) for richer UI/QA coverage.

### Gotchas & Notes
- `supabase db lint` returned only pre-existing warnings for unused parameters in queue functions; no new migration issues.
- `bun run build` succeeded; existing Next.js turbopack root warning remains unrelated to migration changes.

## Task 9: Kakao Map Integration
- **PostGIS Parsing**: Supabase RPC with `GEOGRAPHY` type returns EWKB hex string (e.g., `0101000020...`). Client-side parsing is needed. Implemented robust parser in `src/utils/geo-parser.ts`.
- **Kakao Maps SDK**: Requires `NEXT_PUBLIC_KAKAO_MAP_KEY` in `.env`. The key must be valid for the domain.
- **Migration Issues**: Supabase migrations were not applied initially. Used `supabase link` and `supabase db push` to fix.
- **Environment**: Fixed `NEXT_PUBLIC_SUPABASE_URL` in `.env` (was malformed). Added dummy `NEXT_PUBLIC_KAKAO_MAP_KEY` placeholder.
- **RPC Verification**: Verified `nearby_venues` returns correct data structure matching `Venue` interface.
