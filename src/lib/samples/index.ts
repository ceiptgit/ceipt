import jupiter from "./3em79MoxUhzwCZdx68fPDqmmtHivaYojnwyi8bKgw2Tp73Ts6Ck9uABr5uCsJGP9TZKMXH9awVoWyaxuRre355Fk.json";
import transfer from "./5B8z7WXqAeS6cvDhixrDfkphK1mvpRK5aiQFh3Yqtzi3xF8TfpiBNjCTUSKic1AWC4sSPwAJFrhirc2ibQqJj4rf.json";
import bonk from "./5mqpMGEP52Aa1C5qknEb38T2AZsGg2XxRwtijjnKVW6TkZV5kkViAQ1S7TtcnYwKdL3LFjnqbntvPGGxgEXnnTqk.json";

type RpcOk = { jsonrpc: string; id: number; result: unknown };

const CACHE: Record<string, unknown> = {
  "3em79MoxUhzwCZdx68fPDqmmtHivaYojnwyi8bKgw2Tp73Ts6Ck9uABr5uCsJGP9TZKMXH9awVoWyaxuRre355Fk":
    (jupiter as RpcOk).result,
  "5B8z7WXqAeS6cvDhixrDfkphK1mvpRK5aiQFh3Yqtzi3xF8TfpiBNjCTUSKic1AWC4sSPwAJFrhirc2ibQqJj4rf":
    (transfer as RpcOk).result,
  "5mqpMGEP52Aa1C5qknEb38T2AZsGg2XxRwtijjnKVW6TkZV5kkViAQ1S7TtcnYwKdL3LFjnqbntvPGGxgEXnnTqk":
    (bonk as RpcOk).result,
};

export function getSampleTx(sig: string): unknown | null {
  return CACHE[sig] ?? null;
}
