export interface CreatorArtifactStore {
  write(runId: string, filename: string, value: unknown, dependencies?: string[]): string;
  read(reference: string): unknown;
  archiveReconstructionEvaluations(runId: string, postExternalId: string, revision: number, archiveId: string): void;
  reconstructionProgress(runId: string, postExternalId: string): string;
}
