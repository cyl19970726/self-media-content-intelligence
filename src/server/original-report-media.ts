import fs from "node:fs";
import path from "node:path";
import { artifactPath, evidenceResearchRoot } from "../../packages/adapters/index.js";

/** Project only existing files already exposed by the evidence server; keep original text intact. */
export function projectOriginalReportMedia(markdown: string, baseRef?: string | null): Record<string, string> {
  const projected: Record<string, string> = {};
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
    const original = match[1]!;
    let ref = original;
    const research = original.indexOf('/artifacts/creator-research/');
    const runtime = original.indexOf('/.runtime/runs/');
    if (research >= 0) ref = `/research/${original.slice(research + '/artifacts/creator-research/'.length)}`;
    else if (runtime >= 0) ref = `/artifacts/${original.slice(runtime + '/.runtime/runs/'.length)}`;
    else if (!original.startsWith('/') && baseRef) ref = `${baseRef}${original}`;
    if (ref.split(/[\\/]/).includes('..') || /[%?#]/.test(ref)) continue;
    try {
      const file = ref.startsWith('/research/') ? path.join(evidenceResearchRoot(), ref.slice('/research/'.length))
        : ref.startsWith('/artifacts/') ? artifactPath(ref) : null;
      if (file && fs.statSync(file).isFile()) projected[original] = ref;
    } catch { /* Unresolved original reference remains visible in the reader. */ }
  }
  return projected;
}
