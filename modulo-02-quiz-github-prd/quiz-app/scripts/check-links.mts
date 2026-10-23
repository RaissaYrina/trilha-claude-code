/**
 * Verifica se todo `docUrl` do banco de perguntas responde 200 sem redirect.
 * Um redirect conta como falha: indica que a doc mudou de endereço e que a URL
 * canônica no JSON precisa ser atualizada.
 *
 * Uso: pnpm check:links
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const LEVELS = ["beginner", "intermediate", "advanced"];
const CONCURRENCY = 4;
const TIMEOUT_MS = 15_000;

type Result = { url: string; ok: boolean; detail: string };

async function collectUrls(): Promise<Map<string, string[]>> {
  const dir = path.join(import.meta.dirname, "..", "content", "questions");
  const byUrl = new Map<string, string[]>();
  for (const level of LEVELS) {
    const raw = await readFile(path.join(dir, `${level}.json`), "utf8");
    const questions = JSON.parse(raw) as { id: string; docUrl: string }[];
    for (const { id, docUrl } of questions) {
      byUrl.set(docUrl, [...(byUrl.get(docUrl) ?? []), id]);
    }
  }
  return byUrl;
}

async function check(url: string): Promise<Result> {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.body?.cancel();
    if (res.status === 200) return { url, ok: true, detail: "200" };
    const location = res.headers.get("location");
    const detail = location ? `${res.status} → ${location}` : `${res.status}`;
    return { url, ok: false, detail };
  } catch (error) {
    return { url, ok: false, detail: String(error) };
  }
}

/** Roda `task` sobre os itens com no máximo `limit` chamadas simultâneas. */
async function mapLimited<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

const byUrl = await collectUrls();
const results = await mapLimited([...byUrl.keys()], CONCURRENCY, check);
const failures = results.filter((r) => !r.ok);

for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.detail.padEnd(4)} ${r.url}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} link(s) com problema:`);
  for (const r of failures) {
    console.error(
      `- ${r.url} (${r.detail}) em ${byUrl.get(r.url)!.join(", ")}`,
    );
  }
  process.exit(1);
}
console.log(`\n${results.length} links verificados, todos 200.`);
