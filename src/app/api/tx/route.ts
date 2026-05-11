import { NextRequest } from "next/server";
import { getSampleTx } from "@/lib/samples";

export const runtime = "nodejs";

function endpoints(): string[] {
  const list: string[] = [];
  if (process.env.HELIUS_API_KEY) {
    list.push(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`);
  }
  list.push("https://solana-rpc.publicnode.com");
  list.push("https://api.mainnet-beta.solana.com");
  return list;
}

async function tryRpc(url: string, body: object): Promise<{ ok: true; result: unknown } | { ok: false; status: number; msg: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, msg: await res.text().catch(() => "") };
    }
    const json = await res.json();
    if (json.error) {
      const code = typeof json.error?.code === "number" ? json.error.code : 0;
      return { ok: false, status: code === 429 ? 429 : 400, msg: JSON.stringify(json.error) };
    }
    return { ok: true, result: json.result };
  } catch (err) {
    return { ok: false, status: 599, msg: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(req: NextRequest) {
  const sig = req.nextUrl.searchParams.get("sig")?.trim();
  if (!sig) {
    return Response.json({ error: "missing sig" }, { status: 400 });
  }

  const cached = getSampleTx(sig);
  if (cached) {
    return Response.json({ tx: cached, source: "cache" });
  }

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [
      sig,
      {
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      },
    ],
  };

  const errors: string[] = [];
  for (const url of endpoints()) {
    const r = await tryRpc(url, body);
    if (r.ok) {
      if (r.result == null) {
        errors.push(`${url}: tx not found`);
        continue;
      }
      return Response.json({ tx: r.result });
    }
    errors.push(`${url}: ${r.status} ${r.msg.slice(0, 120)}`);
  }

  const isRateLimit = errors.some((e) => e.includes(" 429"));
  return Response.json(
    {
      error: isRateLimit
        ? "All RPC endpoints rate-limited. Try a sample tx or wait a moment."
        : "All RPC endpoints failed.",
      details: errors,
    },
    { status: 502 },
  );
}
