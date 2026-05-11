# Ceipt

**Print your onchain memories.**

Paste any Solana transaction signature → get a thermal-printer-style receipt
of the transaction. SOL transfers, SPL transfers, NFT mints, Jupiter swaps,
votes and failed txs each render distinctly. Download as PNG or print to paper
for the meme.

→ Live: https://ceipt.vercel.app

A Frontier hackathon submission.

## What it does

1. Paste a tx signature (or load `?sig=…`).
2. App fetches the tx via Solana RPC (`getTransaction`, jsonParsed).
3. Parses the tx into a normalized "Receipt" shape — kind, line items, totals,
   programs invoked, fee payer, signature.
4. Renders a 58mm-wide warm-sepia thermal receipt with dotted dividers,
   monospace body, fake barcode, and a print-feed entrance animation.
5. One-click PNG download or browser print.

No wallet, no DB, no auth, no writes. State is in `?sig=…` — receipts are
shareable URLs.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4
- JetBrains Mono via `next/font`
- `html-to-image` for PNG export
- Solana RPC (mainnet-beta or Helius via `HELIUS_API_KEY`)
- Deployed on Vercel free tier

## Run locally

```bash
npm install
# optional — falls back to api.mainnet-beta.solana.com:
echo "HELIUS_API_KEY=your_key_here" > .env.local
npm run dev
```

Open http://localhost:3000.

## Try these

- Jupiter swap — `3em79MoxUhzwCZdx68fPDqmmtHivaYojnwyi8bKgw2Tp73Ts6Ck9uABr5uCsJGP9TZKMXH9awVoWyaxuRre355Fk`
- Token transfer — `5B8z7WXqAeS6cvDhixrDfkphK1mvpRK5aiQFh3Yqtzi3xF8TfpiBNjCTUSKic1AWC4sSPwAJFrhirc2ibQqJj4rf`

## Project layout

```
src/
  app/
    page.tsx          # input + printer slot + receipt render + PNG export
    api/tx/route.ts   # Solana RPC proxy
    layout.tsx, globals.css
  components/
    Receipt.tsx       # the receipt component (header, items, barcode, totals)
  lib/
    parse.ts          # raw tx → Receipt shape; kind detection, deltas, formatting
```

## Hackathon notes

- Aesthetic-first: paper texture, warm sepia, JetBrains Mono, dotted dividers,
  barcode generated deterministically from the signature, torn paper edges.
- Print-feed entrance uses CSS `clip-path` — the receipt slides out of the
  black "printer slot" on render.
- Built by Nicola for Frontier, paired with Claude.
