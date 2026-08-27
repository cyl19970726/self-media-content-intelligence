import type {
  CreatorAcquisitionAdapter,
  CreatorAcquisitionResult,
  CreatorBrowserExecutor,
  CreatorDetailResult
} from "../../modules/orchestration/contracts.js";

export class CreatorProviderRouter implements CreatorBrowserExecutor {
  constructor(private readonly providers: Record<CreatorAcquisitionAdapter, CreatorBrowserExecutor>) {}

  acquire(input: Parameters<CreatorBrowserExecutor["acquire"]>[0]): Promise<CreatorAcquisitionResult> {
    return this.providers[input.adapter].acquire(input);
  }

  enrich(input: Parameters<CreatorBrowserExecutor["enrich"]>[0]): Promise<CreatorDetailResult> {
    return this.providers[input.adapter].enrich(input);
  }
}
