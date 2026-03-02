# 방고 (bango) — PC방 가격비교 MVP Phase 1

## TL;DR

> **Quick Summary**: 서울 PC방의 가격, 사양, 메뉴, 주변기기를 지도 기반으로 비교할 수 있는 모바일 퍼스트 웹앱 MVP. 열람 전용(Phase 1), Kakao Maps + Supabase PostGIS 기반.
>
> **Deliverables**:
> - Kakao Maps 기반 지도 뷰 (마커, InfoWindow, 현재 위치)
> - PC방 상세 페이지 (가격/사양/메뉴/주변기기)
> - 검색 + 5개 필터 (가격, 거리, 사양, 주변기기, 영업시간)
> - 비밀번호 기반 어드민 패널 (CRUD)
> - 다크 모드, PWA 설치, Vercel Seoul 배포
> - 50개 이상 PC방 시드 데이터
> - Playwright E2E 테스트
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves + Final Verification
> **Critical Path**: Task 7 (initial commit) → Task 10 (layout) → Task 12 (detail page) → Task 14 (search/filter) → Task 16 (admin) → Task 18 (E2E) → Task 19 (deploy)

---

## Context

### Original Request
서울 PC방 가격비교 웹서비스 "방고(bango)" MVP Phase 1 구축. 열람 전용으로 사용자는 지도에서 PC방을 탐색하고, 가격/사양/메뉴/주변기기를 비교할 수 있다.

### Interview Summary
**Key Discussions**:
- 서비스 이름: **bango (방고)**
- 프레임워크: **Next.js 16** (Turbopack)
- DB: **Supabase PostgreSQL + PostGIS**
- 지도: **Kakao Maps JavaScript SDK** (수동 로딩, react-kakao-maps-sdk 사용 안 함)
- UI: **Tailwind CSS v4 + shadcn/ui v3**
- Phase 1 = 열람 전용, Phase 2 = 사용자 기여/로그인/리뷰

**Research Findings**:
- Next.js 16에서 `middleware.ts` → `proxy.ts`로 변경됨. 어드민 인증은 Server Action + cookie 방식 권장
- Tailwind v4는 `tailwind.config.js` 불필요 (CSS-first config)
- PWA는 Next.js 내장 `app/manifest.ts` 사용 (third-party 라이브러리 불필요)
- 다크 모드: `next-themes` + `suppressHydrationWarning`
- Vercel Seoul (`icn1`)은 Pro plan 필요할 수 있음
- 현재 RLS 없음 — MVP에서 SECURITY DEFINER RPC로 충분

### Metis Review
**Identified Gaps** (addressed):
- **seed.sql 미존재**: `supabase/config.toml`이 참조하지만 파일 없음 → 시드는 migration에 포함되어 있어 문제 없음
- **TypeScript 타입 생성 미설정**: `supabase gen types` 스크립트 없음 → Task에 포함
- **50개 PC방 목표 vs 현재 10개**: 추가 시드 데이터 생성 Task 포함
- **Git 커밋 0개**: 전체 작업이 uncommitted → 최초 커밋 Task 최우선

---

## Work Objectives

### Core Objective
서울의 PC방을 지도에서 탐색하고, 가격/사양/메뉴/주변기기를 상세 조회할 수 있는 모바일 퍼스트 웹앱 MVP를 완성하여 Vercel Seoul에 배포한다.

### Concrete Deliverables
- `/` — 랜딩 or 지도 리디렉트
- `/map` — Kakao Maps 지도 뷰 (마커, 클러스터링, InfoWindow)
- `/map/[id]` or `/venues/[id]` — PC방 상세 페이지
- `/admin` — 비밀번호 인증 어드민 CRUD 패널
- PWA manifest + service worker
- 50개 이상 시드 데이터
- Playwright E2E 테스트 스위트
- Vercel Seoul 배포 (icn1)

### Definition of Done
- [ ] `bun run build` 성공 (0 errors)
- [ ] `bunx playwright test` 전체 통과
- [ ] Vercel 배포 완료 + 프로덕션 URL 접근 가능
- [ ] Lighthouse Performance 90+ (모바일)

### Must Have
- 지도에서 PC방 마커 50개 이상 표시
- 마커 클릭 → 상세 페이지 이동
- 가격/사양/메뉴/주변기기 표시
- 검색 (이름/주소)
- 5개 필터 (가격, 거리, 사양, 주변기기, 영업시간)
- 어드민 패널 (추가/수정/삭제)
- 다크 모드
- PWA 설치
- 모바일 반응형 (375px 깨짐 없음)
- 30일 이상 미업데이트 데이터 경고 표시
- OG 메타 태그

### Must NOT Have (Guardrails)
- ❌ 로그인/회원가입 UI (Phase 2)
- ❌ 유저 기여 폼 — 가격 수정, 정보 추가 (Phase 2)
- ❌ 리뷰/평점 시스템 (Phase 2)
- ❌ Supabase Realtime 구독
- ❌ 즐겨찾기/북마크
- ❌ 공유 버튼 (OG 메타 태그는 포함)
- ❌ 알림/푸시
- ❌ 비교 뷰 (사이드 바이 사이드)
- ❌ 단위 테스트 (Playwright E2E만)
- ❌ 영어/다국어 지원
- ❌ 5개 초과 필터

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (신규 설정 필요)
- **Automated tests**: YES (Tests-after, Playwright E2E)
- **Framework**: Playwright (E2E only, 단위 테스트 제외)
- **TDD**: 미적용 — Playwright E2E 시나리오로 검증

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: interactive_bash (tmux) — Run command, validate output
- **API/Backend**: Bash (curl) — Send requests, assert status + response fields
- **Admin**: Playwright — Login, CRUD operations, verify persistence

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (COMPLETED ✅):
├── Task 1: .env.example + .gitignore ✅
├── Task 2: Next.js 16 scaffold ✅
└── Task 3: Supabase CLI + PostGIS migration ✅

Wave 1 (COMPLETED ✅ + 1 remaining):
├── Task 4: DB schema (6 tables) ✅
├── Task 5: PostGIS RPC functions ✅
├── Task 6: Seed data (10 venues) ✅
├── Task 7: Initial git commit (NEW — 전체 코드 uncommitted)
└── Task 8: Supabase TypeScript 타입 생성 + 추가 시드 데이터 (40+ venues)

Wave 2 (Frontend Core — 6 parallel tasks):
├── Task 9: Kakao Maps 지도 뷰 ✅
├── Task 10: Root layout 리라이트 (lang="ko", providers, nav, metadata)
├── Task 11: 랜딩 페이지 (/ → /map 리디렉트 or 히어로)
├── Task 12: PC방 상세 페이지 (/venues/[id])
├── Task 13: 검색 컴포넌트
└── Task 14: 필터 시스템 (5개 필터)

Wave 3 (Admin + Polish — 5 parallel tasks):
├── Task 15: 어드민 인증 (Server Action + cookie)
├── Task 16: 어드민 CRUD 패널
├── Task 17: 다크 모드 (next-themes)
├── Task 18: PWA manifest + 아이콘
└── Task 19: Playwright E2E 설정 + 테스트

Wave 4 (Deploy):
└── Task 20: Vercel Seoul 배포 + 최종 QA

Wave FINAL (After ALL — 4 parallel reviews):
├── F1: Plan Compliance Audit (oracle)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real Manual QA (unspecified-high + playwright)
└── F4: Scope Fidelity Check (deep)

Critical Path: T7 → T10 → T12 → T14 → T16 → T19 → T20 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T7 | — | T8, T10-T20 | 1 |
| T8 | T7 | T12, T13, T14, T16 | 1 |
| T9 | ✅ done | T14 | 2 |
| T10 | T7 | T11, T12, T17 | 2 |
| T11 | T10 | T20 | 2 |
| T12 | T8, T10 | T14, T19 | 2 |
| T13 | T8 | T14 | 2 |
| T14 | T9, T12, T13 | T19 | 2 |
| T15 | T7 | T16 | 3 |
| T16 | T8, T15 | T19 | 3 |
| T17 | T10 | T19 | 3 |
| T18 | T7 | T20 | 3 |
| T19 | T12, T14, T16, T17 | T20 | 3 |
| T20 | T11, T18, T19 | F1-F4 | 4 |
| F1-F4 | T20 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: T7 → `quick` + `git-master`, T8 → `unspecified-high`
- **Wave 2**: T10 → `quick`, T11 → `quick`, T12 → `unspecified-high`, T13 → `visual-engineering`, T14 → `visual-engineering`
- **Wave 3**: T15 → `quick`, T16 → `unspecified-high`, T17 → `quick`, T18 → `quick`, T19 → `deep`
- **Wave 4**: T20 → `unspecified-high`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + playwright, F4 → `deep`

---

## TODOs

> Implementation + QA = ONE Task. EVERY task MUST have QA Scenarios.
> Tasks 1-6 and 9 are already COMPLETED.

- [x] 1. .env.example + .gitignore ✅
- [x] 2. Next.js 16 scaffold (Turbopack, shadcn/ui, React Query) ✅
- [x] 3. Supabase CLI init + PostGIS migration + client factories ✅
- [x] 4. DB schema — 6 tables, 2 ENUMs, GIST index, update triggers ✅
- [x] 5. PostGIS RPC — nearby_venues + nearest_venues ✅
- [x] 6. Seed data — 10 Seoul PC bangs ✅

- [ ] 7. Initial Git Commit — 전체 기존 코드 커밋

  **What to do**:
  - 전체 프로젝트를 최초 git commit으로 생성
  - `.env`는 `.gitignore`에 포함되어 있으므로 커밋되지 않음을 확인
  - `supabase/.temp/` 등 임시 파일이 gitignore에 포함되어 있는지 확인
  - 커밋 메시지: `chore: initial commit — Next.js 16 scaffold, Supabase PostGIS schema, seed data, Kakao Maps view`

  **Must NOT do**:
  - `.env` 파일 커밋 금지
  - `node_modules/` 커밋 금지
  - `supabase/.temp/` 커밋 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Git 커밋 작업에 최적화

  **Parallelization**:
  - **Can Run In Parallel**: NO (전체 코드베이스의 첫 커밋이므로 선행 필요)
  - **Parallel Group**: Wave 1 — Sequential first
  - **Blocks**: T8, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20
  - **Blocked By**: None

  **References**:
  - `.gitignore` — 이미 구성된 ignore 패턴 확인
  - `.env.example` — 커밋할 환경변수 템플릿 (`.env`는 제외)
  - `package.json` — 프로젝트 의존성 목록

  **Acceptance Criteria**:
  - [ ] `git log --oneline` → 최소 1개 커밋 존재
  - [ ] `git status` → clean working tree
  - [ ] `git show --stat HEAD` → `.env` 파일 미포함 확인

  **QA Scenarios:**
  ```
  Scenario: Initial commit 생성 확인
    Tool: Bash
    Preconditions: Git repo 초기화됨, .gitignore 존재
    Steps:
      1. `git log --oneline -1` 실행
      2. 커밋 메시지에 'initial commit' 포함 확인
      3. `git diff --name-only HEAD` → 빈 출력 (모든 파일 커밋됨)
      4. `git show --stat HEAD | grep '.env'` → 결과 없음 (.env 미포함)
    Expected Result: 커밋 존재, .env 미포함, working tree clean
    Evidence: .sisyphus/evidence/task-7-initial-commit.txt

  Scenario: 민감 파일 미포함 확인
    Tool: Bash
    Steps:
      1. `git ls-files | grep -E '^\.env$'` → 결과 없음
      2. `git ls-files | grep 'node_modules'` → 결과 없음
      3. `git ls-files | grep '.temp'` → 결과 없음
    Expected Result: 민감/임시 파일 모두 tracked 안 됨
    Evidence: .sisyphus/evidence/task-7-no-secrets.txt
  ```

  **Commit**: YES
  - Message: `chore: initial commit — Next.js 16 scaffold, Supabase PostGIS schema, seed data, Kakao Maps view`
  - Files: 전체 프로젝트 (`git add .`)
  - Pre-commit: `bun run build`

- [ ] 8. Supabase TypeScript 타입 생성 + 추가 시드 데이터 (50+ venues)

  **What to do**:
  - `package.json`에 `supabase gen types` 스크립트 추가: `"db:types": "bunx supabase gen types --lang=typescript --project-id jbldwfoxshfterhlhns > src/types/database.ts"`
  - `src/types/database.ts` 생성 (Supabase CLI로 자동 생성)
  - `src/types/venue.ts`를 `database.ts` 기반으로 리팩토링 — DB 타입에서 파생
  - 추가 migration 파일 생성: `supabase/migrations/YYYYMMDD_expand_seed_data.sql`
  - 서울 전역 40개 이상 PC방 추가 (총 50개 이상): 강남, 홍대, 신촌, 건대, 잠실, 노원, 수원 등
  - 각 venue에 pricing (2-3개), specs, peripherals (3-5개), menu_items (5-8개), images (2-4개) 포함
  - 다양한 가격대 (1000원~2500원/시간), 다양한 사양 (RTX 3060~4090), 다양한 주변기기 브랜드

  **Must NOT do**:
  - 기존 10개 venue 데이터 수정/삭제 금지
  - RPC 함수 수정 금지
  - 스키마 변경 금지 (INSERT only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - 데이터 생성 + TypeScript 설정 작업으로 특수 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES (T7 이후, T10과 병렬)
  - **Parallel Group**: Wave 1 (with T7 completion gate)
  - **Blocks**: T12, T13, T14, T16
  - **Blocked By**: T7

  **References**:
  - `supabase/config.toml` — project_id: `jbldwfoxshfterhlhns`
  - `supabase/migrations/20260302112153_create_venue_schema.sql` — 6개 테이블 스키마 (INSERT 대상)
  - `supabase/migrations/20260302113127_seed_initial_venues.sql` — 기존 10개 venue 시드 패턴 참조
  - `src/types/venue.ts` — 현재 수동 타입 (database.ts 기반으로 리팩토링 대상)
  - `src/lib/supabase/client.ts` — Supabase 클라이언트 (타입 파라미터 업데이트 대상)
  - `src/lib/supabase/server.ts` — 서버 클라이언트 (타입 파라미터 업데이트 대상)

  **WHY Each Reference Matters**:
  - `create_venue_schema.sql`: INSERT문 작성 시 정확한 컬럼명, 타입, ENUM 값 확인 필수
  - `seed_initial_venues.sql`: 기존 시드 INSERT 패턴을 정확히 따라야 migration 충돌 방지
  - `venue.ts`: 현재 수동 타입을 database.ts에서 파생하도록 변경 필요
  - `client.ts`/`server.ts`: `createBrowserClient<Database>()` 형태로 타입 파라미터 추가

  **Acceptance Criteria**:
  - [ ] `bun run db:types` → `src/types/database.ts` 생성됨
  - [ ] `src/types/database.ts` 파일 크기 > 100줄
  - [ ] `bun run build` → 0 errors (타입 호환성)
  - [ ] Supabase에서 `SELECT count(*) FROM venues` → 50 이상

  **QA Scenarios:**
  ```
  Scenario: TypeScript 타입 생성 확인
    Tool: Bash
    Preconditions: Supabase 프로젝트 연결됨
    Steps:
      1. `bun run db:types` 실행
      2. `wc -l src/types/database.ts` → 100줄 이상
      3. `grep 'venues' src/types/database.ts` → venues 테이블 타입 존재
      4. `bun run build` → exit code 0
    Expected Result: 타입 파일 생성, 빌드 성공
    Evidence: .sisyphus/evidence/task-8-types-gen.txt

  Scenario: 50개 이상 시드 데이터 확인
    Tool: Bash (curl)
    Steps:
      1. Supabase RPC 호출: `curl -s -H 'apikey: [ANON_KEY]' -H 'Content-Type: application/json' -d '{"lat":37.5665,"lng":126.978,"radius_m":50000}' '[SUPABASE_URL]/rest/v1/rpc/nearby_venues'`
      2. 응답 JSON 파싱: `| jq 'length'`
      3. 결과가 50 이상인지 확인
    Expected Result: 50개 이상 venues 반환
    Failure Indicators: 50 미만 반환, RPC 에러, empty 배열
    Evidence: .sisyphus/evidence/task-8-seed-count.txt

  Scenario: 기존 데이터 보존 확인
    Tool: Bash (curl)
    Steps:
      1. 기존 시드의 첫 번째 venue 이름으로 검색 (예: nearby_venues RPC)
      2. 결과에 기존 10개 중 하나 포함 확인
    Expected Result: 기존 venue 데이터 그대로 존재
    Evidence: .sisyphus/evidence/task-8-data-preserved.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add TypeScript types generation and expand seed data to 50+ venues`
  - Files: `package.json`, `src/types/database.ts`, `src/types/venue.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `supabase/migrations/YYYYMMDD_expand_seed_data.sql`
  - Pre-commit: `bun run build`

- [x] 9. Kakao Maps 지도 뷰 ✅

- [ ] 10. Root Layout 리라이트 — lang="ko", Providers, Navigation, Metadata

  **What to do**:
  - `src/app/layout.tsx` 완전 리라이트:
    - `<html lang="ko">` + `suppressHydrationWarning` (다크 모드 준비)
    - `<title>`: "방고 - 서울 PC방 가격비교"
    - OG 메타 태그: title, description, og:image, og:url, og:type
    - Geist 폰트 유지 (Next.js 기본)
    - `QueryClientProvider` wrapper (기존 `src/lib/query-client.ts` 사용)
    - 모바일 하단 네비게이션 바: 지도(/map), 검색, 어드민
    - `viewport` export: `width=device-width, initial-scale=1`
  - `src/components/layout/bottom-nav.tsx` 생성:
    - 모바일: 하단 고정 네비게이션 (3개 탭: 지도, 검색, 어드민)
    - 데스크톱: 상단 네비게이션으로 전환 (또는 사이드바)
    - 현재 경로 활성 표시 (usePathname)
    - shadcn/ui 컴포넌트 활용

  **Must NOT do**:
  - 로그인/회원가입 UI 추가 금지
  - 사이드바에 즐겨찾기/북마크 탭 추가 금지
  - 영어 UI 텍스트 금지 (한국어만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - 레이아웃 변경으로 복잡도 낮음

  **Parallelization**:
  - **Can Run In Parallel**: YES (T8과 병렬 가능)
  - **Parallel Group**: Wave 2 (with T8, T11)
  - **Blocks**: T11, T12, T17
  - **Blocked By**: T7

  **References**:
  - `src/app/layout.tsx` — 현재 보일러플레이트 (Geist 폰트, className 패턴 유지)
  - `src/lib/query-client.ts` — React Query client provider 구성
  - `src/app/globals.css` — Tailwind v4 + shadcn 테마 변수 (라이트/다크 모두 정의됨)
  - `src/app/map/page.tsx` — 기존 map 페이지 패턴 참조

  **WHY Each Reference Matters**:
  - `layout.tsx`: 기존 Geist 폰트/className 패턴을 유지하면서 리라이트해야 (기존 인포트 패턴 참고)
  - `query-client.ts`: QueryClientProvider로 감싸야 하므로 import 경로 확인
  - `globals.css`: 라이트/다크 테마 변수가 이미 정의되어 있음 — `suppressHydrationWarning`만 추가하면 됨

  **Acceptance Criteria**:
  - [ ] `bun run build` → 0 errors
  - [ ] `<html lang="ko">` 확인
  - [ ] OG meta tags 존재 (og:title, og:description)
  - [ ] 모바일 375px에서 하단 네비게이션 표시

  **QA Scenarios:**
  ```
  Scenario: 레이아웃 기본 렌더링 확인
    Tool: Playwright
    Preconditions: `bun run dev` 실행 중 (localhost:3000)
    Steps:
      1. `page.goto('http://localhost:3000/map')`
      2. `page.locator('html').getAttribute('lang')` → 'ko' 확인
      3. `page.title()` → '방고' 포함 확인
      4. `page.locator('meta[property="og:title"]').getAttribute('content')` → '방고' 포함
      5. 모바일 viewport (375x812) 설정
      6. `page.locator('nav').isVisible()` → 하단 네비게이션 표시
    Expected Result: 한국어 lang, OG 태그, 모바일 네비게이션 모두 정상
    Evidence: .sisyphus/evidence/task-10-layout-render.png

  Scenario: 네비게이션 활성 상태 확인
    Tool: Playwright
    Steps:
      1. `page.goto('http://localhost:3000/map')`
      2. 지도 탭이 active 상태인지 CSS class 확인
      3. 검색 탭 클릭 → `/search` 로 이동 또는 검색 열림 확인
    Expected Result: 현재 경로에 따른 활성 탭 표시
    Evidence: .sisyphus/evidence/task-10-nav-active.png
  ```

  **Commit**: YES
  - Message: `feat(layout): rewrite root layout with ko locale, providers, navigation`
  - Files: `src/app/layout.tsx`, `src/components/layout/bottom-nav.tsx`
  - Pre-commit: `bun run build`

- [ ] 11. 랜딩 페이지 — 히어로 + /map 리디렉트

  **What to do**:
  - `src/app/page.tsx` 완전 리라이트:
    - 히어로 섹션: "방고 — 서울 PC방 가격비교" 타이틀 + 간단한 설명
    - CTA 버튼: "지도에서 찾아보기" → `/map` 이동
    - 모바일 퍼스트 디자인
    - 서울 PC방 통계 표시 (e.g., "서울 50+개 PC방 가격 비교")
    - 또는 바로 `/map`으로 리디렉트 (두 방식 모두 허용)
  - favicon + 앱 아이콘: `public/` 디렉토리에 방고 아이콘 추가
  - 기존 default SVGs (`file.svg`, `globe.svg` 등) 제거

  **Must NOT do**:
  - 복잡한 애니메이션 추가 금지
  - 선반로 떠다니며 복잡한 기능 소개 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10과 병렬, T10 완료 후)
  - **Parallel Group**: Wave 2
  - **Blocks**: T20
  - **Blocked By**: T10

  **References**:
  - `src/app/page.tsx` — 현재 보일러플레이트 (전체 리라이트 대상)
  - `src/app/globals.css` — Tailwind v4 테마 변수 활용
  - `public/` — 기존 default SVGs 제거 대상

  **Acceptance Criteria**:
  - [ ] `bun run build` → 0 errors
  - [ ] `/` 접속 시 히어로 또는 `/map` 리디렉트 동작
  - [ ] 기존 default SVGs 제거됨

  **QA Scenarios:**
  ```
  Scenario: 랜딩 페이지 렌더링
    Tool: Playwright
    Preconditions: `bun run dev` 실행 중
    Steps:
      1. `page.goto('http://localhost:3000/')`
      2. '방고' 텍스트 존재 확인 또는 `/map` 리디렉트 확인
      3. CTA 버튼 클릭 → URL이 `/map`으로 변경됨
    Expected Result: 랜딩 렌더링 또는 지도로 리디렉트
    Evidence: .sisyphus/evidence/task-11-landing.png

  Scenario: 기존 보일러플레이트 제거 확인
    Tool: Bash
    Steps:
      1. `ls public/` → file.svg, globe.svg 없음 확인
      2. `grep -r 'Create Next App' src/` → 결과 없음
    Expected Result: 기존 boilerplate 및 default SVGs 제거됨
    Evidence: .sisyphus/evidence/task-11-no-boilerplate.txt
  ```

  **Commit**: YES
  - Message: `feat(landing): add landing page with hero and map redirect`
  - Files: `src/app/page.tsx`, `public/*`
  - Pre-commit: `bun run build`

- [ ] 12. PC방 상세 페이지 — /venues/[id]

  **What to do**:
  - `src/app/venues/[id]/page.tsx` 생성 (Server Component):
    - Supabase에서 venue + pricing + specs + peripherals + menu_items + images 조회
    - 헤더: 이름, 주소, 이미지 캐러셀/갤러리
    - 가격 섹션: pricing tiers 테이블 (시간대, 가격, 비고)
    - 사양 섹션: CPU, GPU, RAM, 모니터, 마우스, 키보드, 체어, 헤드셋
    - 주변기기 섹션: 카테고리별 그룹핑 (mouse, keyboard, headset, monitor, chair, etc.)
    - 메뉴 섹션: 카테고리별 (food, drink, snack) + 가격
    - 30일 이상 미업데이트 경고 배지 (마지막 updated_at 기준)
    - 지도 돌아가기 버튼
    - OG 메타: 해당 업소 이름 + 가격 요약
  - `src/app/map/page.tsx` 에서 마커 클릭 시 `/venues/[id]`로 라우팅 연결
    - 기존 `onMarkerClick={(venue) => console.log(...)}`를 `router.push('/venues/${venue.id}')`로 변경
  - 모바일 우선 디자인: 카드 레이아웃, 섹션 구분, 탭 네비게이션
  - shadcn/ui 컴포넌트: Card, Tabs, Badge, Table

  **Must NOT do**:
  - 리뷰/평점 섹션 추가 금지
  - 즉겨찾기/북마크 버튼 추가 금지
  - 공유 버튼 추가 금지
  - 비교 기능 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T10, T13과 병렬 가능, T8 + T10 완료 후)
  - **Parallel Group**: Wave 2 (after T8, T10)
  - **Blocks**: T14, T19
  - **Blocked By**: T8 (TypeScript 타입), T10 (레이아웃)

  **References**:
  - `supabase/migrations/20260302112153_create_venue_schema.sql` — 6개 테이블 스키마 (조회 대상 컨럼 확인)
  - `src/types/venue.ts` — 현재 Venue 인터페이스 (T8 후 database.ts 기반으로 변경됨)
  - `src/lib/supabase/server.ts` — Server Component에서 Supabase 클라이언트 사용법
  - `src/app/map/page.tsx:77` — `onMarkerClick` 콜백 (현재 console.log → router.push로 변경)
  - `src/components/map/kakao-map.tsx:140-155` — InfoWindow 템플릿 (상세 페이지 링크 추가 위치)
  - `supabase/migrations/20260302113127_seed_initial_venues.sql` — 시드 데이터로 QA 시 테스트 값 확인

  **WHY Each Reference Matters**:
  - `create_venue_schema.sql`: 조회할 컨럼명, 타입, ENUM 값을 정확히 알아야 올바른 Supabase 쿼리 작성 가능
  - `map/page.tsx:77`: `onMarkerClick` 콜백의 현재 구현을 router.push로 대체해야 함
  - `kakao-map.tsx:140-155`: InfoWindow에 상세 페이지 링크를 추가할 정확한 위치 확인 필요
  - `seed_initial_venues.sql`: QA 시나리오에서 사용할 구체적인 테스트 데이터 확인

  **Acceptance Criteria**:
  - [ ] `/venues/[id]` 페이지 정상 렌더링
  - [ ] 가격, 사양, 주변기기, 메뉴 섹션 모두 표시
  - [ ] 지도에서 마커 클릭 → 상세 페이지 이동
  - [ ] 30일+ 미업데이트 경고 배지 표시 (해당 데이터 존재 시)
  - [ ] 모바일 375px 깊짐 없음

  **QA Scenarios:**
  ```
  Scenario: 상세 페이지 정상 표시
    Tool: Playwright
    Preconditions: `bun run dev` 실행 중, 시드 데이터 존재
    Steps:
      1. `page.goto('http://localhost:3000/venues/[first-seed-venue-id]')`
      2. 페이지 타이틀에 PC방 이름 포함 확인
      3. 가격 섹션: `.pricing-table` 또는 해당 셀렉터에서 시간당 가격 표시 확인 (e.g., '₩' 포함)
      4. 사양 섹션: GPU, CPU, RAM 정보 표시 확인
      5. 주변기기 섹션: 하나 이상 아이템 표시 확인
      6. 메뉴 섹션: 음식/음료 항목 + 가격 표시 확인
      7. 모바일 viewport(375x812)에서 스크린샷 캡처
    Expected Result: 모든 섹션 데이터 정상 표시, 모바일 깊짐 없음
    Evidence: .sisyphus/evidence/task-12-venue-detail.png

  Scenario: 지도에서 상세 페이지 이동
    Tool: Playwright
    Steps:
      1. `page.goto('http://localhost:3000/map')`
      2. 마커 클릭 (첫 번째 visible marker)
      3. URL이 `/venues/` 포함으로 변경 확인
      4. 상세 페이지에서 '지도 돌아가기' 버튼 클릭
      5. URL이 `/map`으로 돌아감 확인
    Expected Result: 지도 ↔ 상세 양방향 네비게이션 정상
    Evidence: .sisyphus/evidence/task-12-map-to-detail.png

  Scenario: 30일+ 미업데이트 경고
    Tool: Playwright
    Steps:
      1. 테스트용으로 updated_at이 40일 전인 venue 확인 (또는 DB에서 직접 업데이트)
      2. 해당 venue 상세 페이지 접속
      3. 경고 배지/배너 표시 확인 ('업데이트 필요' 또는 유사 텍스트)
    Expected Result: 30일 초과 데이터에 경고 표시
    Evidence: .sisyphus/evidence/task-12-stale-warning.png
  ```

  **Commit**: YES
  - Message: `feat(venue): add venue detail page with pricing, specs, menu, peripherals`
  - Files: `src/app/venues/[id]/page.tsx`, `src/app/map/page.tsx`, `src/components/map/kakao-map.tsx`
  - Pre-commit: `bun run build`

- [ ] 13. 검색 컴포넌트 — PC방 이름/주소 검색

  **What to do**:
  - `src/components/search/search-bar.tsx` 생성:
    - 텍스트 입력 기반 검색 (디바운스 300ms)
    - Supabase `.ilike()` 쿼리로 `venues.name` + `venues.address` 검색
    - 검색 결과 드롭다운 리스트 (최대 10개)
    - 결과 클릭 → `/venues/[id]`로 이동
    - 빈 결과 상태 표시 ("검색 결과가 없습니다")
    - 모바일: 전체 화면 검색 오버레이
    - 데스크톱: 상단 검색바
  - 하단 네비게이션 '검색' 탭과 연동

  **Must NOT do**:
  - 복잡한 자동완성/퍼지 검색 금지
  - 검색 히스토리 저장 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
    - UI/UX 디자인이 중요한 검색 컴포넌트

  **Parallelization**:
  - **Can Run In Parallel**: YES (T12와 병렬)
  - **Parallel Group**: Wave 2 (after T8)
  - **Blocks**: T14
  - **Blocked By**: T8

  **References**:
  - `supabase/migrations/20260302112153_create_venue_schema.sql:5-20` — venues 테이블 (name, address 컨럼으로 ilike 검색)
  - `src/lib/supabase/client.ts` — 브라우저 클라이언트 (클라이언트 사이드 검색 실행)
  - `src/components/layout/bottom-nav.tsx` — 검색 탭 연동 (클릭 시 검색 오버레이 열림)

  **WHY Each Reference Matters**:
  - `create_venue_schema.sql`: 검색 대상 컨럼(name, address)의 정확한 타입 확인
  - `client.ts`: 클라이언트 사이드에서 Supabase 쿼리 실행 패턴 확인
  - `bottom-nav.tsx`: 검색 탭과 연동할 방법 확인

  **Acceptance Criteria**:
  - [ ] 검색창에 텍스트 입력 시 결과 표시
  - [ ] 이름 검색 정상 동작
  - [ ] 주소 검색 정상 동작
  - [ ] 빈 결과 상태 표시
  - [ ] 결과 클릭 → 상세 페이지 이동

  **QA Scenarios:**
  ```
  Scenario: 이름 검색 테스트
    Tool: Playwright
    Preconditions: `bun run dev` 실행 중, 50+ 시드 데이터 존재
    Steps:
      1. `page.goto('http://localhost:3000/map')`
      2. 검색 탭 또는 검색바 클릭
      3. 시드 데이터의 첫 번째 venue 이름 입력 (e.g., '강남' 또는 특정 이름)
      4. 300ms 대기 후 검색 결과 드롭다운 표시 확인
      5. 첫 번째 결과 클릭
      6. URL이 `/venues/` 포함으로 변경 확인
    Expected Result: 검색 결과 드롭다운 표시, 클릭 시 상세 페이지 이동
    Evidence: .sisyphus/evidence/task-13-search-name.png

  Scenario: 빈 검색 결과
    Tool: Playwright
    Steps:
      1. 검색바에 '존재하지않는PC방XYZ' 입력
      2. 300ms 대기
      3. '검색 결과가 없습니다' 또는 유사 메시지 표시 확인
    Expected Result: 빈 상태 UI 정상 표시
    Evidence: .sisyphus/evidence/task-13-search-empty.png
  ```

  **Commit**: YES (T14와 그룹)
  - Message: `feat(search): add search component and 5-filter system`
  - Files: `src/components/search/search-bar.tsx`
  - Pre-commit: `bun run build`

- [ ] 14. 필터 시스템 — 5개 필터

  **What to do**:
  - `src/components/filter/filter-panel.tsx` 생성:
    - **가격대 필터**: 슬라이더 또는 버튼 그룹 (1000원 단위, 범위: 500~3000원)
    - **거리 필터**: 반경 선택 (500m, 1km, 3km, 5km, 10km)
    - **사양 필터**: GPU 등급 필터 (RTX 3060 이상, RTX 4060 이상, RTX 4080 이상)
    - **주변기기 필터**: 특정 분류 선택 (e.g., 특정 헤드셋 브랜드, 모니터 크기)
    - **영업시간 필터**: 현재 영업 중 / 24시간
  - 필터 상태 관리: URL search params 또는 React state
  - 지도 마커에 필터 적용: nearby_venues RPC에 필터 파라미터 전달 또는 클라이언트 사이드 필터링
  - 모바일: 하단 시트로 필터 패널 (드래그업 또는 모달)
  - 데스크톱: 사이드바 또는 상단 필터바
  - shadcn/ui: Slider, Select, Toggle, Sheet (mobile)

  **Must NOT do**:
  - 5개 초과 필터 추가 금지
  - 복잡한 필터 조합 로직 금지 (단순 AND)
  - 필터 프리셋/저장 기능 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
    - UI/UX 디자인이 중요한 필터 컴포넌트

  **Parallelization**:
  - **Can Run In Parallel**: NO (T12, T13 완료 필요)
  - **Parallel Group**: Wave 2 (after T12, T13)
  - **Blocks**: T19
  - **Blocked By**: T9 (지도 연동), T12 (상세 페이지), T13 (검색)

  **References**:
  - `supabase/migrations/20260302112653_create_geo_rpc_functions.sql` — nearby_venues RPC 파라미터 (radius_m 등) — 필터 연동 방법 확인
  - `supabase/migrations/20260302112153_create_venue_schema.sql` — venue_pricing, venue_specs, venue_peripherals 테이블 칸럼 확인
  - `src/app/map/page.tsx` — 현재 지도 페이지 (필터 UI 통합 위치)
  - `src/components/map/kakao-map.tsx` — 마커 렌더링 로직 (필터 적용 후 마커 업데이트)

  **WHY Each Reference Matters**:
  - `geo_rpc_functions.sql`: nearby_venues의 radius_m 파라미터로 거리 필터 구현, 반환값으로 가격/사양 필터 가능 여부 확인
  - `create_venue_schema.sql`: 필터링 대상 컨럼의 정확한 데이터 타입 확인 (ENUM 값 등)
  - `map/page.tsx`: 필터 UI를 지도 페이지에 통합할 정확한 위치 확인
  - `kakao-map.tsx`: 필터링된 데이터로 마커 업데이트하는 방법 확인

  **Acceptance Criteria**:
  - [ ] 5개 필터 모두 UI에 표시
  - [ ] 가격대 필터 적용 시 마커 감소 확인
  - [ ] 거리 필터 적용 시 마커 감소 확인
  - [ ] 필터 해제 시 전체 마커 복원
  - [ ] 모바일 375px에서 필터 패널 정상 표시

  **QA Scenarios:**
  ```
  Scenario: 가격대 필터 적용
    Tool: Playwright
    Preconditions: `bun run dev` 실행 중, 50+ venues 존재
    Steps:
      1. `page.goto('http://localhost:3000/map')`
      2. 필터 패널 열기
      3. 가격대 필터: 1000원 이하 선택
      4. 지도의 마커 수 확인 → 전체보다 적음
      5. 필터 해제
      6. 마커 수 복원 확인
    Expected Result: 필터 적용/해제에 따른 마커 수 변화
    Evidence: .sisyphus/evidence/task-14-price-filter.png

  Scenario: 모바일 필터 패널
    Tool: Playwright
    Steps:
      1. viewport 375x812 설정
      2. `page.goto('http://localhost:3000/map')`
      3. 필터 버튼 클릭 → 필터 시트/모달 표시
      4. 5개 필터 모두 보임 확인
      5. 필터 적용 후 닫기
      6. 지도에 필터링 결과 반영 확인
    Expected Result: 모바일에서 필터 패널 정상 사용 가능
    Evidence: .sisyphus/evidence/task-14-mobile-filter.png
  ```

  **Commit**: YES (T13과 그룹)
  - Message: `feat(search): add search component and 5-filter system`
  - Files: `src/components/filter/filter-panel.tsx`, `src/app/map/page.tsx`
  - Pre-commit: `bun run build`

- [ ] 15. 어드민 인증 — Server Action + Cookie 방식

  **What to do**:
  - `src/app/admin/login/page.tsx` 생성:
    - 비밀번호 입력 폼 (shadcn Input + Button)
    - Server Action으로 비밀번호 검증
    - 환경변수 `ADMIN_PASSWORD`로 비밀번호 설정 (.env에 추가)
    - 성공 시 httpOnly cookie 설정 (24시간 만료)
    - 실패 시 에러 메시지 표시
  - `src/lib/admin-auth.ts` 생성:
    - `verifyAdmin(password: string)`: 비밀번호 검증 함수
    - `getAdminSession()`: cookie에서 세션 확인
    - `requireAdmin()`: Server Component에서 인증 검증 + 리디렉트
  - `.env.example`에 `ADMIN_PASSWORD` 추가
  - **주의**: Next.js 16에서는 `middleware.ts` 대신 `proxy.ts`로 변경됨. 하지만 여기서는 Server Action + cookie 방식이 더 단순하므로 proxy.ts 낙필요

  **Must NOT do**:
  - 로그인/회원가입 UI 금지 (어드민 전용 방법 단순 비밀번호)
  - JWT 토큰 발행 금지 (단순 cookie)
  - OAuth 통합 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T17, T18과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: T16
  - **Blocked By**: T7

  **References**:
  - `src/lib/supabase/server.ts` — async cookies() 사용 패턴 (동일한 Next.js 16 cookies API 활용)
  - `.env.example` — 환경변수 템플릿 (ADMIN_PASSWORD 추가 위치)

  **WHY Each Reference Matters**:
  - `server.ts`: Next.js 16의 async cookies() 패턴을 이미 사용 중 — 동일 패턴으로 admin cookie 처리

  **Acceptance Criteria**:
  - [ ] `/admin/login` 로그인 페이지 렌더링
  - [ ] 올바른 비밀번호 → `/admin`으로 리디렉트 + cookie 설정
  - [ ] 틀린 비밀번호 → 에러 메시지
  - [ ] cookie 없이 `/admin` 접속 → `/admin/login` 리디렉트

  **QA Scenarios:**
  ```
  Scenario: 어드민 로그인 성공
    Tool: Playwright
    Preconditions: `bun run dev` 실행 중, ADMIN_PASSWORD 설정됨
    Steps:
      1. `page.goto('http://localhost:3000/admin/login')`
      2. 비밀번호 input에 환경변수 ADMIN_PASSWORD 값 입력
      3. 로그인 버튼 클릭
      4. URL이 `/admin`으로 변경 확인
      5. cookie에 admin 세션 존재 확인
    Expected Result: 로그인 성공, /admin 접속 가능
    Evidence: .sisyphus/evidence/task-15-admin-login.png

  Scenario: 미인증 접속 차단
    Tool: Playwright
    Steps:
      1. 새 브라우저 컨텍스트 (cookie 없음)
      2. `page.goto('http://localhost:3000/admin')`
      3. URL이 `/admin/login`으로 리디렉트 확인
    Expected Result: 비인증 상태에서 admin 접속 시 로그인으로 리디렉트
    Evidence: .sisyphus/evidence/task-15-admin-redirect.png

  Scenario: 틀린 비밀번호
    Tool: Playwright
    Steps:
      1. `page.goto('http://localhost:3000/admin/login')`
      2. 'wrong-password' 입력
      3. 로그인 버튼 클릭
      4. 에러 메시지 표시 확인 ('비밀번호가 일치하지 않습니다' 등)
      5. URL 변경 없음 확인 (여전히 /admin/login)
    Expected Result: 에러 메시지 표시, 로그인 불가
    Evidence: .sisyphus/evidence/task-15-wrong-password.png
  ```

  **Commit**: YES (T16과 그룹)
  - Message: `feat(admin): add password-protected admin CRUD panel`
  - Files: `src/app/admin/login/page.tsx`, `src/lib/admin-auth.ts`, `.env.example`
  - Pre-commit: `bun run build`

- [ ] 16. 어드민 CRUD 패널

  **What to do**:
  - `src/app/admin/page.tsx` 생성 (Server Component):
    - `requireAdmin()` 호출로 인증 확인
    - venue 목록 테이블 (shadcn Table)
    - 추가/수정/삭제 버튼
  - `src/app/admin/venues/new/page.tsx` — PC방 추가 폼:
    - 기본정보: 이름, 주소, 전화, 영업시간, 위도/경도
    - 가격: 동적 행 추가 (tier_name, hourly_rate, description)
    - 사양: CPU, GPU, RAM, 모니터 등
    - 주변기기: 동적 행 추가 (category, brand, model)
    - 메뉴: 동적 행 추가 (name, category, price)
    - Server Action으로 INSERT (Supabase service role key 사용)
  - `src/app/admin/venues/[id]/edit/page.tsx` — 수정 폼:
    - 기존 데이터 프리필
    - Server Action으로 UPDATE
  - 삭제: Server Action으로 DELETE (확인 다이얼로그)
  - `SUPABASE_SERVICE_ROLE_KEY` 사용 (어드민 전용 서버 사이드만)

  **Must NOT do**:
  - 일반 사용자용 폰 분리 금지 (어드민 전용)
  - 이미지 업로드 기능 금지 (URL만 저장)
  - 복잡한 버전 관리/대시보드 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (T15 완료 필요)
  - **Parallel Group**: Wave 3 (after T15)
  - **Blocks**: T19
  - **Blocked By**: T8 (TypeScript 타입), T15 (어드민 인증)

  **References**:
  - `supabase/migrations/20260302112153_create_venue_schema.sql` — 전체 테이블 스키마 (INSERT/UPDATE/DELETE 대상)
  - `src/lib/admin-auth.ts` — T15에서 생성될 인증 함수 (requireAdmin 사용법)
  - `src/lib/supabase/server.ts` — 서버 클라이언트 패턴
  - `.env` — `SUPABASE_SERVICE_ROLE_KEY` 확인 (어드민 CRUD에 service role 필요)

  **WHY Each Reference Matters**:
  - `create_venue_schema.sql`: INSERT/UPDATE/DELETE 쿼리의 정확한 컨럼명, 타입, ENUM 값, FK 관계 확인 필수
  - `admin-auth.ts`: requireAdmin() 함수로 인증 검증 패턴 참조
  - `.env`: service role key로 Supabase admin 쿼리 실행

  **Acceptance Criteria**:
  - [ ] `/admin` 페이지에 venue 목록 표시
  - [ ] PC방 추가 폼 정상 동작 (INSERT)
  - [ ] PC방 수정 폼 정상 동작 (UPDATE)
  - [ ] PC방 삭제 정상 동작 (DELETE + 확인)
  - [ ] service role key로 쿼리 실행됨 (anon key 아님)

  **QA Scenarios:**
  ```
  Scenario: PC방 추가 (Create)
    Tool: Playwright
    Preconditions: 어드민 로그인 상태
    Steps:
      1. `page.goto('http://localhost:3000/admin')`
      2. '추가' 버튼 클릭 → `/admin/venues/new`
      3. 폼 입력: 이름='테스트PC방', 주소='서울시 테스트구', 위도=37.5, 경도=127.0
      4. 가격 행 추가: tier='기본', rate=1500
      5. 저장 버튼 클릭
      6. `/admin` 목록에 '테스트PC방' 표시 확인
    Expected Result: 새 PC방 추가되어 목록에 표시
    Evidence: .sisyphus/evidence/task-16-admin-create.png

  Scenario: PC방 수정 (Update)
    Tool: Playwright
    Steps:
      1. `/admin` 목록에서 첫 번째 venue의 '수정' 클릭
      2. 이름 수정: '수정된이름'
      3. 저장 클릭
      4. 목록에서 '수정된이름' 확인
    Expected Result: venue 정보 수정 반영
    Evidence: .sisyphus/evidence/task-16-admin-update.png

  Scenario: PC방 삭제 (Delete)
    Tool: Playwright
    Steps:
      1. `/admin` 목록의 venue 수 확인
      2. 마지막 venue의 '삭제' 클릭
      3. 확인 다이얼로그에서 '삭제' 클릭
      4. venue 수가 1 감소 확인
    Expected Result: venue 삭제, 목록에서 제거
    Evidence: .sisyphus/evidence/task-16-admin-delete.png
  ```

  **Commit**: YES (T15와 그룹)
  - Message: `feat(admin): add password-protected admin CRUD panel`
  - Files: `src/app/admin/page.tsx`, `src/app/admin/venues/new/page.tsx`, `src/app/admin/venues/[id]/edit/page.tsx`
  - Pre-commit: `bun run build`

- [ ] 17. 다크 모드 — next-themes

  **What to do**:
  - `bun add next-themes` 설치
  - `src/components/theme/theme-provider.tsx` 생성:
    - `next-themes`의 `ThemeProvider` wrapper
    - `attribute="class"`, `defaultTheme="system"`
  - `src/app/layout.tsx`에 ThemeProvider 추가:
    - `<html>` 태그에 `suppressHydrationWarning` 추가 (이미 T10에서 준비됨)
  - `src/components/theme/theme-toggle.tsx` 생성:
    - 라이트/다크/시스템 토글 버튼
    - 네비게이션 바에 배치 또는 헤더 우측 상단
  - `src/app/globals.css` 확인: 라이트/다크 테마 변수 이미 정의됨 (추가 수정 최소화)

  **Must NOT do**:
  - globals.css 테마 변수 대규모 수정 금지 (이미 정의됨)
  - 다크 모드 전용 컴포넌트 생성 금지 (기존 컴포넌트에 적용만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T15, T18과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: T19
  - **Blocked By**: T10 (레이아웃)

  **References**:
  - `src/app/layout.tsx` — ThemeProvider 삽입 위치 (T10에서 이미 suppressHydrationWarning 준비)
  - `src/app/globals.css` — 라이트/다크 테마 변수 이미 정의됨 (`:root` + `.dark`)
  - `src/components/layout/bottom-nav.tsx` — 토글 버튼 배치 위치 후보

  **WHY Each Reference Matters**:
  - `layout.tsx`: ThemeProvider를 QueryClientProvider와 함께 wrapping해야 함
  - `globals.css`: 다크 모드 변수가 이미 정의되어 있어 `attribute="class"` 방식으로 next-themes 연동

  **Acceptance Criteria**:
  - [ ] 다크 모드 토글 버튼 존재
  - [ ] 토글 클릭 시 테마 전환
  - [ ] 다크 모드에서 가독성 문제 없음
  - [ ] 시스템 테마 기본 적용

  **QA Scenarios:**
  ```
  Scenario: 다크 모드 전환
    Tool: Playwright
    Preconditions: `bun run dev` 실행 중
    Steps:
      1. `page.goto('http://localhost:3000/map')`
      2. 테마 토글 버튼 클릭
      3. `<html>` 태그에 `class="dark"` 포함 확인
      4. 배경색이 어두운 색으로 변경 확인 (CSS computed style)
      5. 다시 토글 → 라이트 모드 복원 확인
    Expected Result: 라이트 ↔ 다크 전환 정상
    Evidence: .sisyphus/evidence/task-17-dark-mode.png

  Scenario: 다크 모드 가독성 점검
    Tool: Playwright
    Steps:
      1. 다크 모드 활성화
      2. `/map` 페이지 스크린샷
      3. `/venues/[id]` 상세 페이지 스크린샷
      4. 텍스트가 배경 대비 충분한 콘트라스트를 가지는지 확인
    Expected Result: 다크 모드에서 모든 페이지 가독성 확보
    Evidence: .sisyphus/evidence/task-17-dark-readability.png
  ```

  **Commit**: YES
  - Message: `feat(theme): add dark mode with next-themes`
  - Files: `src/components/theme/theme-provider.tsx`, `src/components/theme/theme-toggle.tsx`, `src/app/layout.tsx`
  - Pre-commit: `bun run build`

- [ ] 18. PWA Manifest + 아이콘

  **What to do**:
  - `src/app/manifest.ts` 생성 (Next.js 내장 API):
    - `name`: '방고 - 서울 PC방 가격비교'
    - `short_name`: '방고'
    - `start_url`: '/map'
    - `display`: 'standalone'
    - `theme_color`: shadcn 테마 primary 색상 참조
    - `background_color`: white
    - `icons`: 192x192, 512x512 PNG
  - PWA 아이콘 생성: `public/icons/icon-192x192.png`, `public/icons/icon-512x512.png`
    - 간단한 방고 로고 (텍스트 기반 또는 간단한 디자인)
  - `public/favicon.ico` 업데이트 (기존 Next.js 기본 제거)
  - `next.config.ts`에 PWA 관련 설정 추가 (필요 시)

  **Must NOT do**:
  - third-party PWA 라이브러리 설치 금지 (Next.js 내장 manifest 사용)
  - Service Worker 수동 등록 금지
  - 푸시 알림 기능 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (T15, T17과 병렬)
  - **Parallel Group**: Wave 3
  - **Blocks**: T20
  - **Blocked By**: T7

  **References**:
  - `src/app/globals.css` — `--primary` 색상값 확인 (theme_color에 사용)
  - `next.config.ts` — 현재 빈 설정 (필요시 수정 대상)
  - `public/` — 아이콘 파일 추가 위치

  **Acceptance Criteria**:
  - [ ] `/manifest.webmanifest` 또는 `/manifest.json` 응답 정상
  - [ ] manifest에 name, short_name, icons, start_url 포함
  - [ ] 아이콘 파일 존재 (192, 512)
  - [ ] Lighthouse PWA 검사 통과

  **QA Scenarios:**
  ```
  Scenario: Manifest 정상 응답
    Tool: Bash (curl)
    Steps:
      1. `curl -s http://localhost:3000/manifest.webmanifest | jq .name` → '방고' 포함
      2. `curl -s http://localhost:3000/manifest.webmanifest | jq '.icons | length'` → 2 이상
      3. `curl -s http://localhost:3000/manifest.webmanifest | jq .start_url` → '/map'
    Expected Result: manifest JSON 정상 구조
    Evidence: .sisyphus/evidence/task-18-manifest.txt

  Scenario: 아이콘 파일 존재 확인
    Tool: Bash
    Steps:
      1. `ls public/icons/icon-192x192.png` → 존재
      2. `ls public/icons/icon-512x512.png` → 존재
      3. `file public/icons/icon-512x512.png` → PNG image data 확인
    Expected Result: 아이콘 파일 정상 존재
    Evidence: .sisyphus/evidence/task-18-icons.txt
  ```

  **Commit**: YES
  - Message: `feat(pwa): add PWA manifest and icons`
  - Files: `src/app/manifest.ts`, `public/icons/*`, `public/favicon.ico`
  - Pre-commit: `bun run build`

- [ ] 19. Playwright E2E 테스트 설정 + 테스트 스위트

  **What to do**:
  - `bun add -d @playwright/test` 설치
  - `bunx playwright install chromium` (최소한의 브라우저)
  - `playwright.config.ts` 생성:
    - baseURL: `http://localhost:3000`
    - webServer: `bun run dev` 자동 시작
    - 프로젝트: chromium only
    - viewport: mobile (375x812) + desktop (1280x720)
  - `package.json`에 스크립트 추가: `"test:e2e": "bunx playwright test"`
  - 테스트 파일들 생성:
    - `e2e/map.spec.ts` — 지도 페이지 로드, 마커 표시, 클릭
    - `e2e/venue-detail.spec.ts` — 상세 페이지 렌더링, 섹션 표시
    - `e2e/search-filter.spec.ts` — 검색 + 필터 동작
    - `e2e/admin.spec.ts` — 로그인, CRUD 작업
    - `e2e/dark-mode.spec.ts` — 테마 전환, 가독성
    - `e2e/pwa.spec.ts` — manifest 응답, 아이콘
    - `e2e/responsive.spec.ts` — 375px 모바일 레이아웃

  **Must NOT do**:
  - 단위 테스트 작성 금지 (E2E만)
  - 복잡한 테스트 유틸리티 작성 금지 (단순하게)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`]
    - `playwright`: Playwright 테스트 작성 및 실행 전문

  **Parallelization**:
  - **Can Run In Parallel**: NO (대부분 기능 완료 후 실행)
  - **Parallel Group**: Wave 3 (after T12, T14, T16, T17)
  - **Blocks**: T20
  - **Blocked By**: T12 (상세), T14 (필터), T16 (어드민), T17 (다크모드)

  **References**:
  - `src/app/map/page.tsx` — 지도 페이지 테스트 대상 (마커 렌더링 로직)
  - `src/app/venues/[id]/page.tsx` — 상세 페이지 테스트 대상 (T12에서 생성됨)
  - `src/components/search/search-bar.tsx` — 검색 테스트 대상 (T13에서 생성됨)
  - `src/components/filter/filter-panel.tsx` — 필터 테스트 대상 (T14에서 생성됨)
  - `src/app/admin/login/page.tsx` — 어드민 테스트 대상 (T15에서 생성됨)
  - `supabase/migrations/20260302113127_seed_initial_venues.sql` — 테스트에 사용할 구체적 시드 데이터 값

  **WHY Each Reference Matters**:
  - 각 페이지/컴포넌트의 실제 CSS 셀렉터, 텍스트, URL 패턴을 테스트에 정확히 반영해야 함
  - 시드 데이터의 구체적 값 (이름, 주소, 가격)을 테스트 assertion에 사용

  **Acceptance Criteria**:
  - [ ] `bunx playwright test` → 전체 통과
  - [ ] 7개 테스트 파일 존재
  - [ ] 모바일 + 데스크톱 뷰포트 테스트 포함

  **QA Scenarios:**
  ```
  Scenario: Playwright 테스트 스위트 실행
    Tool: Bash
    Steps:
      1. `bunx playwright test --reporter=list` 실행
      2. 전체 테스트 통과 확인 (exit code 0)
      3. 테스트 수 확인: 7개 파일 이상
    Expected Result: 모든 E2E 테스트 통과
    Evidence: .sisyphus/evidence/task-19-e2e-results.txt

  Scenario: 테스트 실패 시 스크린샷 자동 캔처
    Tool: Bash
    Steps:
      1. `bunx playwright test --reporter=html` 실행
      2. `ls playwright-report/` → report 생성 확인
    Expected Result: HTML report 생성, 실패 시 스크린샷 포함
    Evidence: .sisyphus/evidence/task-19-e2e-report.txt
  ```

  **Commit**: YES
  - Message: `test(e2e): add Playwright E2E test suite`
  - Files: `playwright.config.ts`, `e2e/*.spec.ts`, `package.json`
  - Pre-commit: `bunx playwright test`

- [ ] 20. Vercel Seoul 배포 + 최종 QA

  **What to do**:
  - `vercel.json` 생성:
    - regions: ["icn1"] (Seoul)
    - framework: Next.js 자동 감지
  - Vercel 환경변수 설정 (CLI 또는 대시보드):
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `NEXT_PUBLIC_KAKAO_MAP_KEY`
    - `ADMIN_PASSWORD`
    - `SUPABASE_SERVICE_ROLE_KEY`
  - `vercel --prod` 실행으로 배포
  - 프로덕션 URL에서 전체 기능 검증:
    - 지도 로드 + 마커 표시
    - 상세 페이지 접속
    - 검색 + 필터
    - 다크 모드
    - PWA 설치
  - Lighthouse 성능 테스트 (Performance 90+ 목표)

  **Must NOT do**:
  - 커스텀 도메인 설정 (기본 Vercel 도메인 사용)
  - CI/CD 파이프라인 설정 (수동 배포)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]
    - `playwright`: Lighthouse 및 프로덕션 QA에 필요

  **Parallelization**:
  - **Can Run In Parallel**: NO (모든 구현 완료 후)
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: F1, F2, F3, F4
  - **Blocked By**: T11, T18, T19

  **References**:
  - `.env` — 모든 환경변수 목록 (Vercel에 동일하게 설정)
  - `.env.example` — 필수 환경변수 문서화
  - `package.json` — build 명령어 확인 (Vercel이 자동 감지)

  **Acceptance Criteria**:
  - [ ] Vercel 배포 성공 + 프로덕션 URL 접속 가능
  - [ ] 지도 + 마커 정상 표시
  - [ ] 상세 페이지 정상 렌더링
  - [ ] 검색 + 필터 동작
  - [ ] Lighthouse Performance 90+

  **QA Scenarios:**
  ```
  Scenario: 프로덕션 배포 검증
    Tool: Playwright
    Preconditions: Vercel 배포 완료, 프로덕션 URL 확보
    Steps:
      1. `page.goto('[PRODUCTION_URL]')`
      2. 랜딩 또는 지도 페이지 로드 확인
      3. 지도에서 마커 50개 이상 표시 확인
      4. 마커 클릭 → 상세 페이지 정상 렌더링
      5. 검색 테스트
      6. 다크 모드 토글
    Expected Result: 모든 기능 프로덕션에서 정상 동작
    Evidence: .sisyphus/evidence/task-20-production-qa.png

  Scenario: Lighthouse 성능 테스트
    Tool: Bash
    Steps:
      1. `bunx lighthouse [PRODUCTION_URL] --output=json --only-categories=performance --chrome-flags='--headless'`
      2. Performance 점수 확인 → 90 이상
    Expected Result: Lighthouse Performance 90+
    Failure Indicators: 90 미만 점수
    Evidence: .sisyphus/evidence/task-20-lighthouse.json

  Scenario: 모바일 반응형 검증
    Tool: Playwright
    Steps:
      1. viewport 375x812 설정
      2. `page.goto('[PRODUCTION_URL]/map')`
      3. 네비게이션 바 표시 확인
      4. 지도 전체 화면 표시 (수평 스크롤 없음)
      5. 상세 페이지 스크린샷
    Expected Result: 모바일 375px에서 깊짐 없는 레이아웃
    Evidence: .sisyphus/evidence/task-20-mobile.png
  ```

  **Commit**: YES
  - Message: `chore(deploy): configure Vercel Seoul deployment`
  - Files: `vercel.json`
  - Pre-commit: `bun run build`
---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  이 플랜을 처음부터 끝까지 읽는다. 각 "Must Have" 항목에 대해: 구현이 존재하는지 확인 (파일 읽기, curl 엔드포인트, 명령어 실행). 각 "Must NOT Have" 항목에 대해: 코드베이스에서 금지 패턴 검색 — 발견 시 file:line과 함께 reject. `.sisyphus/evidence/` 증거 파일 존재 확인. 산출물을 플랜과 비교.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  `bun run build` (tsc 포함) + eslint 실행. 모든 변경 파일 검토: `as any`/`@ts-ignore`, 빈 catch, prod 코드의 console.log, 주석 처리된 코드, 미사용 import. AI slop 확인: 과도한 주석, 과잉 추상화, 제네릭 이름 (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  클린 상태에서 시작. 모든 Task의 QA 시나리오를 순서대로 실행 — 정확한 단계 따르기, 증거 캡처. 크로스 태스크 통합 테스트 (기능 간 연동). 엣지 케이스: 빈 상태, 잘못된 입력, 빠른 반복 액션. `.sisyphus/evidence/final-qa/`에 저장.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  각 Task에 대해: "What to do" 읽기, 실제 diff 읽기 (git log/diff). 1:1 검증 — 스펙의 모든 것이 구현됨 (누락 없음), 스펙 이상의 것이 구현되지 않음 (scope creep 없음). "Must NOT do" 준수 확인. 크로스 태스크 오염 감지: Task N이 Task M의 파일을 수정한 경우. 미설명 변경 플래그.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `chore: initial commit — project scaffold, DB schema, seed, map view` — 전체 기존 코드
- **Wave 1 (T8)**: `feat(db): add TypeScript types generation and expand seed data to 50+ venues`
- **Wave 2 (T10)**: `feat(layout): rewrite root layout with ko locale, providers, navigation`
- **Wave 2 (T11)**: `feat(landing): add landing page with hero and map redirect`
- **Wave 2 (T12)**: `feat(venue): add venue detail page with pricing, specs, menu, peripherals`
- **Wave 2 (T13-14)**: `feat(search): add search component and 5-filter system`
- **Wave 3 (T15-16)**: `feat(admin): add password-protected admin CRUD panel`
- **Wave 3 (T17)**: `feat(theme): add dark mode with next-themes`
- **Wave 3 (T18)**: `feat(pwa): add PWA manifest and icons`
- **Wave 3 (T19)**: `test(e2e): add Playwright E2E test suite`
- **Wave 4 (T20)**: `chore(deploy): configure Vercel Seoul deployment`

---

## Success Criteria

### Verification Commands
```bash
bun run build                    # Expected: 0 errors, successful build
bunx playwright test             # Expected: all tests pass
curl -s https://bango.vercel.app # Expected: 200 OK, HTML response
```

### Final Checklist
- [ ] 지도에서 서울 핵심 구의 PC방 마커가 50개 이상 표시됨
- [ ] 마커 클릭 시 PC방 상세 페이지로 이동, 가격/사양/메뉴 표시
- [ ] 검색으로 PC방 이름/주소 조회 가능
- [ ] 5개 필터가 정상 작동 (가격대, 거리, 사양, 주변기기, 영업시간)
- [ ] 어드민 패널에서 PC방 추가/수정/삭제 가능
- [ ] 모바일(375px)에서 깨짐 없는 레이아웃
- [ ] 다크 모드에서 가독성 문제 없음
- [ ] PWA로 홈 화면에 설치 가능
- [ ] Lighthouse Performance 90+ (모바일)
- [ ] 30일 이상 업데이트 안 된 데이터에 경고 표시
- [ ] ❌ 로그인 UI 없음 / ❌ 리뷰 시스템 없음 / ❌ Realtime 없음 / ❌ 5개 초과 필터 없음
