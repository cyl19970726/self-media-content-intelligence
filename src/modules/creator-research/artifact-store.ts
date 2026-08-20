export interface CreatorArtifactStore {
  write(runId: string, filename: string, value: unknown): string;
  read(reference: string): unknown;
}
