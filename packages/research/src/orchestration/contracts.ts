import { z } from "zod";

export const creatorAcquisitionAdapterSchema = z.enum(["ego-browser", "redfox"]);
export type CreatorAcquisitionAdapter = z.infer<typeof creatorAcquisitionAdapterSchema>;

export type CreatorCrawlDiagnostic = {
  round: number;
  globalCountBefore: number;
  globalCountAfter: number;
  newGlobalIds: string[];
  heightBefore: number;
  heightAfter: number;
  heightDelta: number;
  scrollTopBefore: number;
  scrollTopAfter: number;
  scrollDelta: number;
  atBottom: boolean;
  waitElapsedMs: number;
  waitReason: string;
  action: "advance" | "bottom_observe" | "bounded_retrigger" | "stop";
};

export const researchJobStatusSchema = z.enum([
  "queued",
  "leased",
  "running",
  "needs_user",
  "backoff",
  "succeeded",
  "failed",
  "canceled"
]);

export const researchJobSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  nodeKey: z.enum(["creator.acquire", "creator.portfolio", "creator.enrich", "video.reconstruct", "creator.synthesize"]),
  status: researchJobStatusSchema,
  idempotencyKey: z.string(),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  availableAt: z.string(),
  leaseOwner: z.string().nullable(),
  leaseExpiresAt: z.string().nullable(),
  heartbeatAt: z.string().nullable(),
  payload: z.record(z.unknown()),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ResearchJob = z.infer<typeof researchJobSchema>;
export type ResearchJobStatus = z.infer<typeof researchJobStatusSchema>;

export const childWorkerLifecycleStatusSchema = z.enum(["started", "progress", "stale", "completed", "failed"]);
export const childWorkerLifecycleEventSchema = z.object({
  childRunId: z.string().uuid(),
  role: z.string().min(1),
  status: childWorkerLifecycleStatusSchema,
  startedAt: z.string(),
  lastProgressAt: z.string(),
  inputRevision: z.string().min(1),
  outputArtifactRevisions: z.record(z.string()).default({}),
  errorCode: z.string().nullable().default(null)
});
export type ChildWorkerLifecycleEvent = z.infer<typeof childWorkerLifecycleEventSchema>;
export type ChildWorkerLifecycleObserver<T extends ChildWorkerLifecycleEvent = ChildWorkerLifecycleEvent> = (event: T) => void;

export type CreatorAcquisitionPost = {
  externalId: string;
  url: string;
  title: string | null;
  visibleText: string | null;
  mediaType: "video" | "image" | "unknown";
  likesLabel: string | null;
  likes: number | null;
};

export type CreatorNavigationDiagnostic = {
  postExternalId: string | null;
  inputUrl: string | null;
  canonicalUrl: string | null;
  failureClass: "platform_challenge" | "login_expired" | "navigation_redirect" | "provider_network" | "user_control";
  challengeType: string | null;
  phase: string;
  fallbackAttempted: boolean;
};

export type CreatorDetailOutputPost = {
  externalId: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  publishedLabel: string | null;
  mediaType: "video" | "image" | "unknown";
  videoCandidateUrl: string | null;
  coverCandidateUrl: string | null;
  inspectedAt: string;
  warnings: string[];
};

export type CreatorAcquisitionResult =
  | {
      state: "ready";
      provider?: CreatorAcquisitionAdapter;
      finalUrl: string;
      creatorId: string | null;
      creatorName: string | null;
      taskSpaceId: number | null;
      stopReason: "explicit_end" | "quiescent_incomplete" | "budget_reached";
      posts: CreatorAcquisitionPost[];
      warnings: string[];
      diagnostics?: CreatorCrawlDiagnostic[];
      sourceRefs?: string[];
      publicProfile?: {
        bio: string | null;
        followers: number | null;
        likesAndCollections: number | null;
        displayedPostCount: number | null;
        identityAnchors: Array<{ kind: string; value: string; source: string }>;
      };
    }
  | {
      state: "needs_user";
      finalUrl: string;
      taskSpaceId: number;
      code: "login_required" | "captcha_required" | "user_took_control" | "detail_navigation_required";
      message: string;
      navigationDiagnostic?: CreatorNavigationDiagnostic;
    }
  | {
      state: "blocked";
      finalUrl: string | null;
      taskSpaceId: number | null;
      code: "identity_ambiguous" | "page_shape_unknown" | "browser_unavailable"
        | "provider_unavailable" | "provider_authentication_failed" | "provider_rate_limited" | "provider_response_invalid";
      message: string;
      retryable: boolean;
      navigationDiagnostic?: CreatorNavigationDiagnostic;
      partialPosts?: CreatorDetailOutputPost[];
      partialWarnings?: string[];
    };

export interface CreatorAcquisitionExecutor {
  acquire(input: {
    adapter: CreatorAcquisitionAdapter;
    runId: string;
    profileUrl: string;
    maxScrollRounds: number;
    taskSpaceId: number | null;
  }): Promise<CreatorAcquisitionResult>;
}

export type CreatorDetailInputPost = { externalId: string; url: string; title?: string | null; resolveMedia: boolean };

export type CreatorDetailResult =
  | {
      state: "ready";
      provider?: CreatorAcquisitionAdapter;
      taskSpaceId: number | null;
      posts: CreatorDetailOutputPost[];
      warnings: string[];
    }
  | Extract<CreatorAcquisitionResult, { state: "needs_user" | "blocked" }>;

export interface CreatorDetailExecutor {
  enrich(input: {
    adapter: CreatorAcquisitionAdapter;
    runId: string;
    profileUrl: string;
    creatorName?: string | null;
    posts: CreatorDetailInputPost[];
    taskSpaceId: number | null;
    closeWhenDone?: boolean;
  }): Promise<CreatorDetailResult>;
}

export interface CreatorBrowserExecutor extends CreatorAcquisitionExecutor, CreatorDetailExecutor {}
