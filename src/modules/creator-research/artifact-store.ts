export interface CreatorArtifactStore {
  write(runId: string, filename: string, value: unknown, dependencies?: string[]): string;
  read(reference: string): unknown;
}
