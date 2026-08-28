import type { CreatorArtifactStore } from "../../research/index.js";

export class MemoryCreatorArtifactStore implements CreatorArtifactStore {
  private readonly values = new Map<string, unknown>();

  write(runId: string, filename: string, value: unknown): string {
    const reference = `/artifacts/${runId}/${filename}`;
    this.values.set(reference, structuredClone(value));
    return reference;
  }

  read(reference: string): unknown {
    const value = this.values.get(reference);
    if (value === undefined) throw new Error(`missing artifact ${reference}`);
    return structuredClone(value);
  }

  archiveReconstructionEvaluations(): void { /* no filesystem in testkit */ }
  reconstructionProgress(): string { return "runner_start"; }
}
