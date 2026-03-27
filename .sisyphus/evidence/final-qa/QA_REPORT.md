# 방고 (bango) MVP - Final QA Report

**Date:** 2026-03-27  
**Tester:** Sisyphus-Junior  
**Environment:** Local dev server (http://localhost:3000) + Playwright E2E suite

---

## EXECUTIVE SUMMARY

**VERDICT: REJECT - CRITICAL BLOCKER**

The application has **catastrophic backend failure**: Supabase instance does not exist (DNS NXDOMAIN). All features requiring data (map, search, venue detail, admin CRUD) are completely broken.

---

## 1. AUTOMATED E2E TESTS (Playwright)

**Command:** `bunx playwright test`

### Results
- **Passed:** 14/16 (87.5%)
- **Failed:** 2/16 (12.5%)

### Failures
1. **Admin CRUD (mobile)** - After saving venue, page stays at `/admin/venues/new` instead of redirecting to `/admin`
2. **Admin CRUD (desktop)** - Same navigation bug

**Root cause:** Form submission navigation logic broken. Expected redirect to `/admin` after save.

---

## 2. INFRASTRUCTURE ASSESSMENT

### Supabase Connectivity: **FAIL**

```bash
$ host fjbldwfoxshfterhlhns.supabase.co
Host fjbldwfoxshfterhlhns.supabase.co not found: 3(NXDOMAIN)

$ curl https://fjbldwfoxshfterhlhns.supabase.co/rest/v1/
000 (connection failure)
```

**Impact:** Application cannot function. All API calls fail with `ERR_NAME_NOT_RESOLVED`.

**Affected features:**
- Map venue loading
- Search
- Venue detail pages
- Admin CRUD operations

---

## 3. MANUAL QA SCENARIOS

### ✅ PASS: Static/Client-Only Features

| Test | Status | Notes |
|------|--------|-------|
| Landing page render | ✅ | Hero, CTA button visible |
| Landing → Map navigation | ✅ | CTA correctly routes to `/map` |
| Search page render | ✅ | Input, suggested keywords present |
| Admin login redirect | ✅ | `/admin` → `/admin/login` |
| Admin authentication | ✅ | Password auth works, redirects to dashboard |
| Dark mode toggle | ✅ | Theme switcher responds |
| Mobile viewport (375px) | ✅ | Bottom nav visible, no overflow |
| 404 handling | ✅ | `/venues/nonexistent-id` shows proper 404 |

### ❌ FAIL: Data-Dependent Features

| Test | Status | Error |
|------|--------|-------|
| Map venue markers | ❌ | "주변 PC방을 불러오는데 실패했습니다" (fetch failed) |
| Search with query | ❌ | `ERR_NAME_NOT_RESOLVED` on Supabase call |
| Venue detail page | ❌ | Cannot test - no venues loadable |
| Filters | ❌ | Filter UI renders, but 0 venues to filter |
| Admin CRUD | ❌ | Dashboard shows "등록된 PC방이 없습니다" (empty) |

---

## 4. INTEGRATION TESTS

All integration workflows **blocked** by backend failure:

1. **Landing → Map → Marker → Detail:** Map loads, but no markers appear (data fetch fails)
2. **Search → Detail → Compare:** Search fails with network error
3. **Filter → Count badge:** Filters render, but badge shows "0개 PC방" (no venues)

---

## 5. EDGE CASES

| Case | Expected | Actual | Status |
|------|----------|--------|--------|
| Empty search string | No results or validation | Not testable (backend down) | ⚠️ |
| Nonexistent venue name | Empty results | Not testable (backend down) | ⚠️ |
| Filter to 0 results | Badge updates | Already shows 0 (no data) | ⚠️ |
| Invalid venue ID (`/venues/nonexistent-id`) | 404 page | Shows 404 correctly | ✅ |

---

## 6. EVIDENCE

Screenshots saved to `.sisyphus/evidence/final-qa/`:

- `01-landing-page.png` - Hero section
- `02-map-page-no-data.png` - Map error state
- `04-search-page.png` - Search UI
- `06-admin-login.png` - Login form
- `06-admin-dashboard-empty.png` - Empty admin state
- `07-dark-mode.png` - Dark theme
- `08-mobile-375px.png` - Mobile viewport
- `edge-404.png` - 404 page

---

## 7. CRITICAL ISSUES

### 🔴 BLOCKER 1: Supabase Instance Does Not Exist
**Severity:** P0  
**Evidence:** DNS NXDOMAIN error for `fjbldwfoxshfterhlhns.supabase.co`  
**Impact:** Application is **completely non-functional** for all data operations  
**Required action:** Deploy valid Supabase project OR update `.env` with correct URL

### 🔴 BLOCKER 2: Admin Form Navigation Bug
**Severity:** P1  
**Evidence:** Playwright tests fail on line 34 of `e2e/admin.spec.ts`  
**Impact:** Cannot complete admin CRUD workflow  
**Location:** Form submission handler in `/admin/venues/new`  
**Expected:** Redirect to `/admin` after save  
**Actual:** Stays at `/admin/venues/new`

---

## 8. TEST SUMMARY

```
Scenarios     [4/8 pass] | 50%  (4 pass: static pages, 4 fail: data-dependent)
Integration   [0/3]      | 0%   (all blocked by backend)
Edge Cases    [1/4]      | 25%  (3 blocked, 1 pass: 404)
E2E Suite     [14/16]    | 87.5% (admin CRUD fails)

OVERALL VERDICT: REJECT
```

---

## 9. RECOMMENDATIONS

**Before re-test:**

1. **Fix Supabase connectivity**
   - Deploy new Supabase project OR
   - Update `.env` with valid `NEXT_PUBLIC_SUPABASE_URL` and keys
   - Verify DNS resolution and API access

2. **Fix admin navigation bug**
   - Check form submission handler in `/admin/venues/new`
   - Ensure redirect to `/admin` after successful save
   - Re-run `bunx playwright test` to verify fix

3. **Seed test data**
   - Add sample venues to database
   - Verify map markers appear
   - Test search and filters with real data

**Current state:** Application is a well-built UI shell with **no backend**, making it unusable for end users.

---

**Signed:** Sisyphus-Junior  
**Timestamp:** 2026-03-27T02:36:32Z
