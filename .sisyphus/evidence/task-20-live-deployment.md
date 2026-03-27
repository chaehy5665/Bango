# Task 20 Live Deployment Proof

- Project: `chaehy5665s-projects/bango`
- Inspector: `https://vercel.com/chaehy5665s-projects/bango/GKw5bizEvmpLj4dxVnBEG1b26te1`
- Production deployment URL: `https://bango-mgu63o8so-chaehy5665s-projects.vercel.app`
- Production alias: `https://bango-tau.vercel.app`
- Deployment state: `READY`

## Deploy command outcome

- `npx vercel project add bango --scope chaehy5665s-projects` → success
- `npx vercel link --yes --project bango --scope chaehy5665s-projects` → success
- `npx vercel deploy --prod --yes --scope chaehy5665s-projects ... --logs` → success

## Observed production smoke test

- Home page content fetched successfully from `https://bango-tau.vercel.app`
- Home page rendered heading: `서울 PC방 가격비교`
- Search page returned results for query `강남`
- `/manifest.webmanifest` responded with `name: 방고 - 서울 PC방 가격비교`

## Notes

- Build logs showed a successful Next.js 16 production build on Vercel.
- The deployment was aliased to the stable production URL `https://bango-tau.vercel.app`.

## Follow-up operations

- Persistent Vercel production environment variables were configured for Supabase, admin auth, and Kakao Maps.
- A GitHub-owner-authored follow-up commit was prepared to trigger Git-based Vercel deployment on the Hobby team scope, which rejects non-member commit authors.
