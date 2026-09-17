import fs from "node:fs";
export { readReportSource, resolveReportSource, sourceDigest } from "../../packages/adapters/index.js";
import { readReportSource } from "../../packages/adapters/index.js";

export function sourceRevisionNote(files: string[]): string | null {
  const notes = [...new Set(files.filter(file => fs.existsSync(file)).map(file => readReportSource(file).revision).filter(Boolean))];
  return notes.length ? notes.join("；") : null;
}
