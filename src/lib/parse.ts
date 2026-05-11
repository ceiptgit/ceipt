// Parses Solana getTransaction (jsonParsed) result into a Receipt shape.

export type ReceiptKind =
  | "sol-transfer"
  | "spl-transfer"
  | "nft-mint"
  | "swap"
  | "vote"
  | "failed"
  | "unknown";

export type LineItem = {
  label: string;
  qty?: string;
  amount: string; // pre-formatted display string
  sub?: string; // small secondary line (e.g. mint addr, owner)
};

export type Receipt = {
  kind: ReceiptKind;
  storeName: string; // e.g. "SOLANA MAINNET"
  cashier: string; // program-name-ish
  signature: string;
  shortSig: string;
  slot: number | null;
  blockTime: number | null; // unix seconds
  feeSol: number;
  feePayer: string;
  status: "OK" | "FAILED";
  errorText?: string;
  items: LineItem[];
  totals: { label: string; amount: string }[];
  programs: string[]; // unique program ids invoked (parsed)
  computeUnits: number | null;
};

const LAMPORTS = 1_000_000_000;

const PROGRAM_NAMES: Record<string, string> = {
  "11111111111111111111111111111111": "System",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token",
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "Token-2022",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "AssociatedToken",
  ComputeBudget111111111111111111111111111111: "ComputeBudget",
  Vote111111111111111111111111111111111111111: "Vote",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: "Jupiter v4",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Whirlpools",
  cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ: "Candy v3",
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: "Token Metadata",
};

function programLabel(id: string): string {
  return PROGRAM_NAMES[id] ?? `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function fmtSol(lamports: number): string {
  const sol = lamports / LAMPORTS;
  if (sol === 0) return "0.000000000";
  const abs = Math.abs(sol);
  // 9 decimals, trim trailing zeros to at least 4
  const fixed = abs.toFixed(9);
  return (sol < 0 ? "-" : "") + fixed;
}

function fmtToken(amount: bigint | number, decimals: number): string {
  const big = typeof amount === "bigint" ? amount : BigInt(Math.trunc(amount));
  const neg = big < 0n;
  const a = neg ? -big : big;
  const s = a.toString().padStart(decimals + 1, "0");
  const intPart = s.slice(0, s.length - decimals) || "0";
  const fracPart = decimals > 0 ? "." + s.slice(-decimals).replace(/0+$/, "") : "";
  const trimmed = fracPart === "." ? "" : fracPart;
  return (neg ? "-" : "") + intPart + trimmed;
}

function shortAddr(s: string): string {
  if (!s) return "";
  if (s.length <= 12) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

type RawTx = {
  slot?: number;
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    fee?: number;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: TokBal[];
    postTokenBalances?: TokBal[];
    computeUnitsConsumed?: number;
    logMessages?: string[];
  };
  transaction?: {
    signatures?: string[];
    message?: {
      accountKeys?: { pubkey: string; signer?: boolean; writable?: boolean }[];
      instructions?: ParsedIx[];
    };
  };
};

type TokBal = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string; decimals: number; uiAmountString?: string };
};

type ParsedIx = {
  programId?: string;
  program?: string;
  parsed?:
    | { type?: string; info?: Record<string, unknown> }
    | string
    | null;
  accounts?: string[];
  data?: string;
};

export function parseTx(raw: RawTx, sig: string): Receipt {
  const meta = raw.meta ?? {};
  const msg = raw.transaction?.message ?? {};
  const accounts = msg.accountKeys ?? [];
  const ixs = (msg.instructions ?? []) as ParsedIx[];

  const status: "OK" | "FAILED" = meta.err ? "FAILED" : "OK";
  const errorText = meta.err
    ? typeof meta.err === "string"
      ? meta.err
      : JSON.stringify(meta.err)
    : undefined;

  const feePayer = accounts[0]?.pubkey ?? "";
  const feeSol = (meta.fee ?? 0) / LAMPORTS;

  // Programs invoked (top-level)
  const programIds = Array.from(
    new Set(
      ixs
        .map((i) => i.programId)
        .filter((p): p is string => typeof p === "string"),
    ),
  );
  const programs = programIds.map(programLabel);

  // Pick a "cashier" — most distinctive program (skip plumbing).
  const PLUMBING = new Set([
    "ComputeBudget111111111111111111111111111111",
    "11111111111111111111111111111111",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  ]);
  const cashierLabel = (() => {
    const prefer = programIds.find((p) => !PLUMBING.has(p));
    return prefer ? programLabel(prefer) : (programs[0] ?? "Unknown");
  })();

  // SOL deltas per account
  const pre = meta.preBalances ?? [];
  const post = meta.postBalances ?? [];
  const solDeltas: { addr: string; delta: number }[] = accounts.map((a, i) => ({
    addr: a.pubkey,
    delta: (post[i] ?? 0) - (pre[i] ?? 0),
  }));

  // Token deltas per (owner|mint)
  type TokDelta = {
    owner: string;
    mint: string;
    decimals: number;
    delta: bigint;
  };
  const tokMap = new Map<string, TokDelta>();
  function ingest(b: TokBal, sign: 1 | -1) {
    const key = `${b.owner ?? "?"}|${b.mint}`;
    const cur = tokMap.get(key) ?? {
      owner: b.owner ?? "?",
      mint: b.mint,
      decimals: b.uiTokenAmount.decimals,
      delta: 0n,
    };
    const amt = BigInt(b.uiTokenAmount.amount);
    cur.delta += sign === 1 ? amt : -amt;
    cur.decimals = b.uiTokenAmount.decimals;
    tokMap.set(key, cur);
  }
  (meta.postTokenBalances ?? []).forEach((b) => ingest(b, 1));
  (meta.preTokenBalances ?? []).forEach((b) => ingest(b, -1));
  const tokDeltas = [...tokMap.values()].filter((t) => t.delta !== 0n);

  // Detect kind
  let kind: ReceiptKind = "unknown";
  if (status === "FAILED") kind = "failed";
  else if (programIds.includes("Vote111111111111111111111111111111111111111"))
    kind = "vote";
  else if (
    programIds.some((p) =>
      ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"].includes(p),
    )
  )
    kind = "swap";
  else {
    const hasMintTo = ixs.some(
      (i) =>
        typeof i.parsed === "object" &&
        i.parsed?.type === "mintTo" &&
        i.parsed?.info,
    );
    if (hasMintTo && tokDeltas.some((t) => t.decimals === 0)) kind = "nft-mint";
    else if (tokDeltas.length > 0) kind = "spl-transfer";
    else if (
      ixs.some(
        (i) =>
          typeof i.parsed === "object" &&
          (i.parsed?.type === "transfer" || i.parsed?.type === "transferChecked") &&
          i.program === "system",
      )
    )
      kind = "sol-transfer";
  }

  // Build line items
  const items: LineItem[] = [];

  if (kind === "sol-transfer" || kind === "unknown") {
    // SOL movements net of fee — exclude fee payer's fee component
    for (const d of solDeltas) {
      if (d.delta === 0) continue;
      // For fee payer, the displayed "delta" includes fee. Subtract fee for display clarity.
      let amt = d.delta;
      if (d.addr === feePayer) amt += meta.fee ?? 0; // remove fee
      if (amt === 0) continue;
      items.push({
        label: amt > 0 ? "RECEIVE SOL" : "SEND SOL",
        amount: `${fmtSol(amt)} SOL`,
        sub: shortAddr(d.addr),
      });
    }
    // Promote unknown to sol-transfer if we found SOL items
    if (kind === "unknown" && items.length > 0) {
      kind = "sol-transfer";
    }
  }

  if (kind === "spl-transfer" || kind === "nft-mint" || kind === "swap") {
    for (const t of tokDeltas) {
      const amtStr = fmtToken(t.delta, t.decimals);
      const sign = t.delta > 0n ? "+" : "";
      items.push({
        label:
          kind === "nft-mint"
            ? t.delta > 0n
              ? "MINT NFT"
              : "BURN NFT"
            : t.delta > 0n
              ? "RECEIVE"
              : "SEND",
        amount: `${sign}${amtStr}`,
        sub: `${shortAddr(t.mint)} · ${shortAddr(t.owner)}`,
      });
    }
    // Also surface SOL spent (e.g. NFT mint cost) if non-trivial
    const payerDelta =
      solDeltas.find((d) => d.addr === feePayer)?.delta ?? 0;
    const nonFee = payerDelta + (meta.fee ?? 0);
    if (Math.abs(nonFee) > 1000) {
      items.push({
        label: nonFee > 0 ? "RECEIVE SOL" : "SPEND SOL",
        amount: `${fmtSol(nonFee)} SOL`,
        sub: shortAddr(feePayer),
      });
    }
  }

  if (kind === "vote") {
    items.push({
      label: "VOTE",
      amount: "1",
      sub: shortAddr(feePayer),
    });
  }

  if (kind === "failed") {
    items.push({
      label: "TX FAILED",
      amount: "—",
      sub: errorText?.slice(0, 60) ?? "unknown error",
    });
  }

  // Totals
  const totals: { label: string; amount: string }[] = [];
  totals.push({ label: "NETWORK FEE", amount: `${fmtSol(meta.fee ?? 0)} SOL` });
  if (kind !== "failed" && kind !== "vote") {
    const grossMoved = solDeltas
      .filter((d) => d.delta > 0)
      .reduce((s, d) => s + d.delta, 0);
    if (grossMoved > 0) {
      totals.push({ label: "SOL MOVED", amount: `${fmtSol(grossMoved)} SOL` });
    }
  }

  return {
    kind,
    storeName: "SOLANA MAINNET",
    cashier: cashierLabel,
    signature: sig,
    shortSig: `${sig.slice(0, 6)}…${sig.slice(-6)}`,
    slot: raw.slot ?? null,
    blockTime: raw.blockTime ?? null,
    feeSol,
    feePayer,
    status,
    errorText,
    items,
    totals,
    programs,
    computeUnits: meta.computeUnitsConsumed ?? null,
  };
}

export const SAMPLE_RECEIPT: Receipt = {
  kind: "spl-transfer",
  storeName: "SOLANA MAINNET",
  cashier: "Token",
  signature:
    "5B8z7WXqAeS6cvDhixrDfkphK1mvpRK5aiQFh3Yqtzi3xF8TfpiBNjCTUSKic1AWC4sSPwAJFrhirc2ibQqJj4rf",
  shortSig: "5B8z7W…qJj4rf",
  slot: 312_456_789,
  blockTime: Math.floor(Date.now() / 1000) - 600,
  feeSol: 0.000005,
  feePayer: "9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xKQzPpKbbXQwBh",
  status: "OK",
  items: [
    { label: "SEND", amount: "-100.000000", sub: "USDC · 9ZNT…QwBh" },
    { label: "RECEIVE", amount: "+100.000000", sub: "USDC · 4mYZ…Tn7K" },
  ],
  totals: [
    { label: "NETWORK FEE", amount: "0.000005000 SOL" },
    { label: "SOL MOVED", amount: "0.001234567 SOL" },
  ],
  programs: ["Token", "AssociatedToken"],
  computeUnits: 4_812,
};
