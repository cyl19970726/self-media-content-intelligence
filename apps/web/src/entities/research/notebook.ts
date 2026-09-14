export type ResearchNote = { id: string; kind: "question" | "insight" | "idea"; text: string; sourceUrl: string; createdAt: string };
export const noteKinds = { question: "待研究的问题", insight: "我的判断", idea: "创作线索" } as const;
export function parseNotes(raw: string | null): ResearchNote[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every((note) => note && typeof note === "object" &&
    typeof note.id === "string" && typeof note.text === "string" && typeof note.sourceUrl === "string" &&
    typeof note.createdAt === "string" && Object.hasOwn(noteKinds, note.kind))) throw new Error("笔记格式无法读取，原记录已保留，请勿覆盖。");
  return value as ResearchNote[];
}
export function discussionContext(title: string, sourceUrl: string, notes: ResearchNote[]) {
  return [`我正在研究：${title}`, `研究来源：${sourceUrl}`, "", "以下是我的研究记录，不是已经验证的分析结论：", ...notes.flatMap((note) => [
    `\n[${noteKinds[note.kind]}] ${note.text}`, `对应位置：${note.sourceUrl}`
  ]), "", "请结合来源与我讨论，区分已知事实、待验证判断和创作假设；指出还需要查看的证据。"].join("\n");
}
