# tinyfish

A React + TypeScript + Tailwind CSS prototype for a price comparison platform.

## What it includes

- Search-first comparison layout with a prominent top search bar
- Analyst-style filter rail with low/high landed-price, price-per-unit, and delivery-window controls
- Extra filters for worth-it score, delivery option, free returns, return window, warranty, local stock, availability, origin country, and origin currency
- Default sorting from lowest to highest landed cost, plus highest price, best reviews, most sold, fastest delivery, and most worth it
- Rich listing cards that surface country of origin, worth-it score, delivery timing, currency, warranty, and availability
- Click-to-open detail modal for landed-cost breakdown, decision rationale, review quality, and commercial terms
- A refined landed-cost JSON schema with engine assumptions, GST-aware pricing context, and more thorough product metadata

## Run locally

```bash
npm install
npm run dev
```

## Environment

Use a local `.env.local` file for development:

```bash
TINYFISH_API_KEY=your-tinyfish-api-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-read-write-token
```

## Notes

- The UI is currently wired to the richer JSON catalog at `src/data/mockCatalog.json` through `src/data/mockResults.ts`.
- The catalog now includes landed-cost engine context, retail/travel source targets, origin metadata, delivery timing bands, price-per-unit signals, and worth-it scoring.
- The current mock queries are retail-focused, but the schema now leaves room for future extensions to travel and booking comparisons.
- Tinyfish search results are cached into the local JSON catalog during local development, and can also mirror into Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured.
- Broad family queries such as `iphone`, `ipad`, or `anker` can now return a wider mix of relevant variants instead of only one exact SKU.
