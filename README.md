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

### Default Operational Path

Lite Mode is the default practical ingestion path:

`raw collect -> parse -> canonical.json -> lite loader -> venues`

### Quick Start

Run the default Lite pipeline (dry-run):

```bash
# Pica source
bun run crawl:lite-run -- --source pica --seoul-only --limit 10

# GetO source
bun run crawl:lite-run -- --source geto --geto-max-details 20
```

Run a deterministic fixture-based dry-run without a live venue lookup:

```bash
bun run crawl:lite-load -- --input tests/fixtures/pcbang/lite-canonical.json --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json
```

For production inserts/updates, add `--apply`:

```bash
bun run crawl:lite-run -- --source pica --seoul-only --limit 10 --apply
```

### Documentation

See the full operations runbook: [docs/ops/pcbang-venue-ops.md](docs/ops/pcbang-venue-ops.md)

Topics covered:
- Lite Mode default workflow and flags
- Advanced/manual legacy load-policy workflow
- Artifact layout and output structure
- Troubleshooting common issues

### Individual Stage Commands

The Lite path still reuses the existing stage commands:

- `bun run crawl:raw-collect` — Stage 1: Raw HTTP collection
- `bun run crawl:pica-followup` — Stage 2: Pica follow-up detail collection
- `bun run crawl:parse-raw` — Stage 3: Parse raw captures to canonical format
- `bun run crawl:lite-load` — Stage 4 (default): Load `canonical.json` into `venues`

Advanced/manual legacy commands still exist, but are no longer the default workflow:

- `bun run crawl:classify-load-policy` — Legacy manual classification stage
- `bun run crawl:import-venues` — Legacy manual import stage

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
