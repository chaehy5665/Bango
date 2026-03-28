This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## PC Bang Venue Data Operations

This project includes a venue data collection and import pipeline for PC Bang (internet cafe) venues in South Korea.

### Quick Start

Run the full pipeline (dry-run):

```bash
# GetO source
bun run crawl:run -- --source geto

# Pica source (with limit for testing)
bun run crawl:run -- --source pica --seoul-only --limit 10
```

For production imports (writes to database), add `--apply`:

```bash
bun run crawl:run -- --source geto --apply
```

### Documentation

See the full operations runbook: [docs/ops/pcbang-venue-ops.md](docs/ops/pcbang-venue-ops.md)

Topics covered:
- Prerequisites and environment setup
- Command reference and flags
- Usage examples for GetO and Pica sources
- Artifact layout and output structure
- Troubleshooting common issues

### Individual Stage Commands

The orchestrator wraps five stages. You can also run them individually:

- `bun run crawl:raw-collect` — Stage 1: Raw HTTP collection
- `bun run crawl:pica-followup` — Stage 2: Pica follow-up detail collection
- `bun run crawl:parse-raw` — Stage 3: Parse raw captures to canonical format
- `bun run crawl:classify-load-policy` — Stage 4: Classify venues for insertability
- `bun run crawl:import-venues` — Stage 5: Import venues to database

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
