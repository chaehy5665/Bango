## F1 findings (2026-03-03)
- Missing evidence files for Task 1 and Task 9: `.sisyphus/evidence/task-1-*`, `.sisyphus/evidence/task-9-*`.
- "50+ markers on map" not verified; existing mobile map evidence shows 7 venues with default 5km radius.
- `/map` clustering appears unimplemented (no clusterer usage in `src/components/map/kakao-map.tsx`).
- OG metadata present but `og:image` missing in `src/app/layout.tsx`.
- E2E suite runs but admin CRUD test is skipped without `ADMIN_PASSWORD` (`e2e/admin.spec.ts`).

## F4 scope-fidelity findings (2026-03-03)
- Task-level non-compliance detected in Task 8, 10, 12, 13, 16, 20 (missing requirements and/or unapproved cross-task overlap).
- Repeated unexplained commit pattern: `.sisyphus/plans/pcroom-mvp.md` modified during implementation commits (`5daead0`, `bd352fb`, `a13150f`, `3bafbc7`, `2c04b39`, `8ab3725`).
- Approved exception confirmed: Task 17 editing `src/app/admin/page.tsx` (Task 16 file) to complete placeholder content.
- Additional unapproved contamination: Task 8 touching Task 9 map files; Task 16 touching `playwright.config.ts` before Task 19.
