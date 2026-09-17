import type { CrossPostResearch, ResearchStatement } from "./core";

export type WorkflowCreatorReaderData = {
  creatorName: string | null;
  audience: ResearchStatement[];
  corpus: { postCount: number; likesKnown: number; coverageRate: number };
  portfolio: Array<{
    id: string;
    title: string;
    sourceHref: string;
    evidenceHref: string | null;
    deepSample: boolean;
    likes: number | null;
    collections: number | null;
    comments: number | null;
    shares: number | null;
    publishedLabel: string | null;
  }>;
  crossPostResearch: CrossPostResearch | null;
};

export type WorkflowArtifactReader =
  | { kind: "post"; data: import("./core").VideoResearch }
  | { kind: "creator"; data: WorkflowCreatorReaderData };
