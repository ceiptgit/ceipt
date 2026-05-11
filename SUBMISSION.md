# Submission copy

## Tagline
Print your onchain memories.

## Description (~150 words)

Ceipt turns any onchain Solana transaction into a thermal-printer receipt. Paste a signature; we fetch the tx via RPC, parse it into line items
— SOL deltas, token transfers, NFT mints, swap routes, fees, programs invoked —
and render it as a 58mm-wide warm-sepia receipt with monospace type, dotted
dividers, and a deterministic "barcode" derived from the signature itself.

Different tx types render distinctly: a Jupiter swap shows every leg of the
route; a Magic Eden mint highlights the SOL spend and the new token; a
validator vote gets its own little stub. Failed txs print red.

The receipt slides out of a black "printer slot" via CSS clip-path on render,
then you can download as PNG or print to actual paper. Receipts are
URL-shareable (`?sig=…`). No wallet, no database, no writes — anyone can
print anyone else's tx. That's the meme.

Built in a day for the Solana Frontier hackathon.

## Demo URL
https://ceipt.vercel.app

## Sample signatures used in demo video
- Jupiter swap: `3em79MoxUhzwCZdx68fPDqmmtHivaYojnwyi8bKgw2Tp73Ts6Ck9uABr5uCsJGP9TZKMXH9awVoWyaxuRre355Fk`
- Token transfer: `5B8z7WXqAeS6cvDhixrDfkphK1mvpRK5aiQFh3Yqtzi3xF8TfpiBNjCTUSKic1AWC4sSPwAJFrhirc2ibQqJj4rf`
- BONK / token mint era tx: `5mqpMGEP52Aa1C5qknEb38T2AZsGg2XxRwtijjnKVW6TkZV5kkViAQ1S7TtcnYwKdL3LFjnqbntvPGGxgEXnnTqk`

## Demo video script (60-90s)
1. Land on the page (5s) — show the empty printer slot.
2. Click "Jupiter Swap" sample (15s) — receipt slides down out of the slot,
   showing every swap leg as RECEIVE/SEND lines.
3. Click "Token Transfer" sample (10s) — different layout, different cashier.
4. Click "Bonk Mint" sample (10s) — different again.
5. Hit "Download PNG" (5s) — show the image saved.
6. Hit "Print to paper" (5s) — show browser print dialog (the meme).
7. Show the URL has `?sig=…` — you can DM your tx as a printable receipt.
