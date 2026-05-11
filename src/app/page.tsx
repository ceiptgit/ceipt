"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ReceiptView } from "@/components/Receipt";
import { parseTx, SAMPLE_RECEIPT, type Receipt } from "@/lib/parse";

const SAMPLES: { label: string; sig: string }[] = [
  {
    label: "JUPITER SWAP",
    sig: "3em79MoxUhzwCZdx68fPDqmmtHivaYojnwyi8bKgw2Tp73Ts6Ck9uABr5uCsJGP9TZKMXH9awVoWyaxuRre355Fk",
  },
  {
    label: "TOKEN TRANSFER",
    sig: "5B8z7WXqAeS6cvDhixrDfkphK1mvpRK5aiQFh3Yqtzi3xF8TfpiBNjCTUSKic1AWC4sSPwAJFrhirc2ibQqJj4rf",
  },
  {
    label: "BONK MINT",
    sig: "5mqpMGEP52Aa1C5qknEb38T2AZsGg2XxRwtijjnKVW6TkZV5kkViAQ1S7TtcnYwKdL3LFjnqbntvPGGxgEXnnTqk",
  },
];

export default function Home() {
  const [sig, setSig] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const print = useCallback(
    async (rawSig: string) => {
      const s = rawSig.trim();
      if (!s) return;
      setError(null);
      setReceipt(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/tx?sig=${encodeURIComponent(s)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(
            typeof json.error === "string"
              ? json.error
              : JSON.stringify(json.error),
          );
        } else {
          const r = parseTx(json.tx, s);
          setReceipt(r);
          setFeedKey((k) => k + 1);
          // Update URL without reload
          const url = new URL(window.location.href);
          url.searchParams.set("sig", s);
          window.history.replaceState({}, "", url.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Read ?sig=… on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("sig");
    if (initial) {
      setSig(initial);
      print(initial);
    }
  }, [print]);

  async function downloadPng() {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const node = receiptRef.current;
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        backgroundColor: "#f5efe1",
        cacheBust: true,
        filter: (n) => {
          if (!(n instanceof HTMLElement)) return true;
          // Drop the bottom torn edge from PNG export — looks weird without backdrop
          return !n.classList?.contains?.("receipt-tear");
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const sigForName = receipt?.signature?.slice(0, 10) ?? "receipt";
      a.download = `solana-receipt-${sigForName}.png`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    print(sig);
  }

  const displayed = receipt ?? (loading ? null : null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-6 pb-24 pt-12">
      <header className="mb-10 text-center">
        <div className="text-[10px] uppercase tracking-[0.5em] text-stone-400">
          A Frontier hackathon entry
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-[0.18em]">
          CEIPT
        </h1>
        <p className="mt-2 text-sm tracking-widest text-stone-400">
          PRINT YOUR ONCHAIN MEMORIES.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mb-8 flex flex-col gap-3">
        <label className="text-[10px] uppercase tracking-[0.4em] text-stone-400">
          Paste a Solana transaction signature
        </label>
        <div className="flex gap-2">
          <input
            value={sig}
            onChange={(e) => setSig(e.target.value)}
            placeholder="5B8z7WXq…qJj4rf"
            className="input flex-1"
            spellCheck={false}
          />
          <button type="submit" disabled={loading} className="btn">
            {loading ? "Printing…" : "Print"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
          <span>samples:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.sig}
              type="button"
              className="btn-ghost btn"
              onClick={() => {
                setSig(s.sig);
                print(s.sig);
              }}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className="btn-ghost btn"
            onClick={() => {
              setReceipt(SAMPLE_RECEIPT);
              setFeedKey((k) => k + 1);
            }}
          >
            Demo (no fetch)
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 whitespace-pre-wrap border border-red-900 bg-red-950/40 p-3 text-[11px] text-red-200">
          {error}
        </div>
      )}

      {/* Printer slot + receipt */}
      <div className="flex flex-col items-center">
        <div className="printer-slot" />
        <div className="relative mt-[-2px] overflow-hidden">
          {receipt && (
            <div key={feedKey} className="receipt-feed">
              <div ref={receiptRef}>
                <ReceiptView receipt={receipt} id="receipt-export" />
              </div>
            </div>
          )}
          {!receipt && (
            <div className="w-[360px] py-16 text-center text-[10px] uppercase tracking-[0.4em] text-stone-500">
              {loading
                ? "warming up the printer…"
                : "paste a signature above to print"}
            </div>
          )}
        </div>

        {receipt && (
          <div className="mt-8 flex gap-2">
            <button
              type="button"
              onClick={downloadPng}
              disabled={downloading}
              className="btn"
            >
              {downloading ? "Saving…" : "Download PNG"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-ghost"
            >
              Print to paper
            </button>
            <button
              type="button"
              onClick={() => setFeedKey((k) => k + 1)}
              className="btn btn-ghost"
            >
              Re-print
            </button>
          </div>
        )}
      </div>

      <footer className="mt-20 text-center text-[10px] uppercase tracking-[0.4em] text-stone-600">
        Reads only · No wallet · solana mainnet
      </footer>
    </main>
  );
}
