export type ContentGateId = "CR-01" | "CR-02" | "CR-03" | "CR-04" | "CR-05" | "CR-06";
export type DirectingGateId = "DL-01" | "DL-02" | "DL-03" | "DL-04" | "DL-05" | "DL-06";
export type VisualGateId = "VE-01" | "VE-02" | "VE-03" | "VE-04" | "VE-05" | "VE-06" | "VE-07";

export type ThreeLensRuleEvaluation<RuleId extends string> = Readonly<{
  ruleId: RuleId;
  pass: boolean;
  note: string;
  evidenceRefs: readonly string[];
  failedReason: string | null;
}>;

export type LensEvaluation<RuleId extends string> = Readonly<{
  ready: boolean;
  rules: readonly ThreeLensRuleEvaluation<RuleId>[];
}>;

export type ThreeLensIndependentEvaluation = Readonly<{
  videoId: string;
  creatorId: string;
  evaluatorId: string;
  version: string;
  checkedAt: string;
  scope: "content-directing-and-visual";
  content: LensEvaluation<ContentGateId>;
  directing: LensEvaluation<DirectingGateId>;
  visual: LensEvaluation<VisualGateId>;
}>;

export function lensEvaluation<const RuleId extends string>(
  rules: readonly ThreeLensRuleEvaluation<RuleId>[],
): LensEvaluation<RuleId> {
  return { ready: rules.every((rule) => rule.pass), rules };
}
