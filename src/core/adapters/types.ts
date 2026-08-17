import type { ContextSnapshot, ParsedSource, SourceSnapshot } from "../../shared/schema.js";

export interface CollectionResult {
  state: "ready" | "partial" | "blocked";
  source: SourceSnapshot | null;
  localVideoPath: string | null;
  message: string | null;
  rawPayload: unknown;
  context: ContextSnapshot;
}

export interface PlatformAdapter {
  collect(parsed: ParsedSource, runId: string): Promise<CollectionResult>;
}
