import type { Receipt } from "@/lib/parse";

const KIND_LABEL: Record<Receipt["kind"], string> = {
  "sol-transfer": "SOL TRANSFER",
  "spl-transfer": "TOKEN TRANSFER",
  "nft-mint": "NFT MINT",
  swap: "SWAP",
  vote: "VALIDATOR VOTE",
  failed: "FAILED TX",
  unknown: "ONCHAIN ACTIVITY",
};

function fmtDate(unix: number | null): { date: string; time: string } {
  if (!unix) return { date: "—", time: "—" };
  const d = new Date(unix * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`,
  };
}

function shortAddr(s: string): string {
  if (!s) return "";
  if (s.length <= 16) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

// Fake "barcode" derived from signature: deterministic bar widths.
function Barcode({ signature }: { signature: string }) {
  // Use first 32 chars to seed bar widths. Bars alternate dark/light.
  const seed = signature.slice(0, 32);
  const bars: { w: number; dark: boolean }[] = [];
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    const w = (c % 4) + 1; // 1..4
    bars.push({ w, dark: i % 2 === 0 });
  }
  return (
    <div className="flex h-12 w-full items-end gap-[1px] mt-2">
      {bars.map((b, i) => (
        <div
          key={i}
          className={b.dark ? "bg-stone-900" : "bg-transparent"}
          style={{ width: `${b.w}px`, height: "100%" }}
        />
      ))}
    </div>
  );
}

function Divider({ char = "·" }: { char?: string }) {
  // Repeating dotted divider that scales with width
  return (
    <div
      aria-hidden
      className="my-1 select-none overflow-hidden whitespace-nowrap text-stone-700 text-[10px] leading-none tracking-[0.4em]"
    >
      {char.repeat(80)}
    </div>
  );
}

export function ReceiptView({
  receipt,
  className = "",
  id,
}: {
  receipt: Receipt;
  className?: string;
  id?: string;
}) {
  const { date, time } = fmtDate(receipt.blockTime);
  const kindLabel = KIND_LABEL[receipt.kind];

  return (
    <div
      id={id}
      className={`receipt-paper relative w-[360px] px-6 pt-6 pb-4 font-mono text-[12px] leading-tight text-stone-900 ${className}`}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-[18px] font-bold tracking-[0.2em]">SOLANA</div>
        <div className="text-[11px] tracking-[0.35em]">MAINNET BETA</div>
        <div className="mt-1 text-[8px] tracking-[0.5em] text-stone-500">CEIPT · v1</div>
        <div className="mt-3 text-[10px] tracking-widest text-stone-700">
          {receipt.storeName}
        </div>
        <div className="text-[10px] tracking-widest text-stone-700">
          NO. 1 · BLOCK {receipt.slot ?? "—"}
        </div>
      </div>

      <Divider />

      {/* Meta */}
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-stone-700">
        <span>{date}</span>
        <span>{time}</span>
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-stone-700">
        <span>CASHIER: {receipt.cashier}</span>
        <span
          className={
            receipt.status === "OK"
              ? "text-stone-700"
              : "text-red-700"
          }
        >
          {receipt.status}
        </span>
      </div>

      <Divider />

      {/* Kind banner */}
      <div className="text-center text-[13px] font-bold tracking-[0.25em] my-1">
        {kindLabel}
      </div>

      <Divider />

      {/* Items */}
      <div className="my-1 flex flex-col gap-2">
        {receipt.items.length === 0 && (
          <div className="text-center text-[10px] uppercase tracking-widest text-stone-600">
            no line items
          </div>
        )}
        {receipt.items.map((it, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {it.label}
              </span>
              <span className="text-[12px] tabular-nums">{it.amount}</span>
            </div>
            {it.sub && (
              <div className="text-[9px] uppercase tracking-widest text-stone-600">
                {it.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      <Divider />

      {/* Totals */}
      <div className="my-1 flex flex-col gap-1">
        {receipt.totals.map((t, i) => (
          <div key={i} className="flex justify-between text-[11px]">
            <span className="uppercase tracking-widest">{t.label}</span>
            <span className="tabular-nums">{t.amount}</span>
          </div>
        ))}
        {receipt.computeUnits != null && (
          <div className="flex justify-between text-[10px] text-stone-600">
            <span className="uppercase tracking-widest">CU CONSUMED</span>
            <span className="tabular-nums">
              {receipt.computeUnits.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <Divider />

      {/* Programs */}
      {receipt.programs.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-widest text-stone-700">
            programs invoked
          </div>
          <div className="mt-1 text-[10px] leading-snug">
            {receipt.programs.join(" · ")}
          </div>
          <Divider />
        </>
      )}

      {/* Fee payer */}
      <div className="text-[10px] uppercase tracking-widest text-stone-700">
        fee payer
      </div>
      <div className="text-[10px] break-all">{shortAddr(receipt.feePayer)}</div>

      <Divider />

      {/* Signature footer */}
      <div className="text-center text-[10px] uppercase tracking-[0.3em] text-stone-700">
        signature
      </div>
      <div className="mt-1 text-center text-[10px] break-all leading-snug">
        {receipt.signature}
      </div>

      <Barcode signature={receipt.signature} />
      <div className="mt-1 text-center text-[9px] tracking-[0.3em] text-stone-700">
        {receipt.shortSig}
      </div>

      <Divider char="·" />

      <div className="mt-2 text-center text-[11px] font-bold tracking-[0.2em]">
        THANK YOU FOR YOUR
      </div>
      <div className="text-center text-[11px] font-bold tracking-[0.2em]">
        TRANSACTION
      </div>
      <div className="mt-2 text-center text-[9px] tracking-[0.35em] text-stone-600">
        ★ PRINT YOUR ONCHAIN MEMORIES ★
      </div>

      {/* Torn bottom edge */}
      <div className="receipt-tear absolute -bottom-3 left-0 right-0 h-3" aria-hidden />
    </div>
  );
}
