import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { carrierInspectionStatus, validateBuilderIntegrity } from "./video-builder-integrity.js";

const fixtureRoot = path.join(process.cwd(), ".agents", "skills", "video-content-reconstruction", "tests", "fixtures", "valid");

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "builder-integrity-"));
  const videoPath = path.join(root, "source-video.mp4");
  fs.writeFileSync(videoPath, "video");
  fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(root, "targeted-evidence"), { recursive: true });
  fs.copyFileSync(path.join(fixtureRoot, "evidence-pack.json"), path.join(root, "evidence/evidence-pack.json"));
  fs.copyFileSync(path.join(fixtureRoot, "targeted-evidence.json"), path.join(root, "targeted-evidence/targeted-evidence.json"));
  fs.copyFileSync(path.join(fixtureRoot, "probe.json"), path.join(root, "probe.json"));
  fs.copyFileSync(path.join(fixtureRoot, "reconstruction.json"), path.join(root, "reconstruction.json"));
  const evidencePath = path.join(root, "evidence/evidence-pack.json");
  fs.writeFileSync(path.join(root, "media-preparation.json"), JSON.stringify({
    sourceMedia: { fingerprint: sha256(videoPath) },
    transcript: { path: null, fingerprint: null },
    evidencePack: { path: evidencePath, fingerprint: sha256(evidencePath) }
  }));
  return { root, videoPath };
}

function upgradeFixtureToV2(root: string) {
  const file = path.join(root, "reconstruction.json");
  const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
  reconstruction.schemaVersion = "video-reconstruction-2.0";
  reconstruction.builderLenses = {
    contentRestoration: {
      summary: "视频展示从设置入口到结果状态的完整变化。",
      blocks: [{ id: "BLOCK-001", type: "before_after", title: "设置前后变化", body: "先打开设置，再看到结果。",
        timeRange: { start: 0, end: 10 }, evidenceRefs: ["CUE-001", "TARGET-0004"],
        beforeFrameRef: "TARGET-0001", afterFrameRef: "TARGET-0004" }],
      unknowns: ["隐藏设置没有展示"]
    },
    directingLogic: {
      viewerBefore: "不知道入口", viewerAfter: "知道如何得到结果", activatedQuestion: "入口在哪里？", promise: "展示最短路径",
      payoff: "结果状态出现", endingResolution: "用结果完成闭环",
      stages: [
        { label: "提出问题", timeRange: { start: 0, end: 5 }, viewerQuestion: "入口在哪里？", function: "建立操作目标", proof: "口播要求打开设置",
          cognitiveChange: "从未知变成知道入口", comprehensionLoad: "低", payoff: "路径明确", evidenceRefs: ["CUE-001"] },
        { label: "展示结果", timeRange: { start: 5, end: 10 }, viewerQuestion: "操作是否成功？", function: "用结果状态验证操作", proof: "结果帧可见",
          cognitiveChange: "从理解步骤变成确认结果", comprehensionLoad: "低", payoff: "看到结果", evidenceRefs: ["CUE-002", "TARGET-0004"] }
      ],
      informationDesign: [], proofDesign: [],
      loadAndPayoff: { compression: "一步一信息", repetition: "口播与界面互补", payoffDistance: "五秒内", comprehensionCosts: ["隐藏参数未知"] }, notes: []
    },
    visualEditing: {
      orientation: "landscape", composition: "界面录屏承担操作与结果证明", shotCount: 2, cutsPerMinute: 12, resultFirstAt: 5,
      shotMetricBasis: "证据包技术分段，仅用于观察变化密度，不等同真实剪辑点。",
      analyzedDuration: 10, carriers: [{ name: "UI", roles: ["操作路径", "结果证明"], timeRange: { start: 0, end: 10 } }],
      claims: [{ statement: "结果状态在操作后出现", function: "证明操作闭环", timeRange: { start: 5, end: 10 }, evidenceRefs: ["TARGET-0004"] }],
      shotSemantics: [{ timeRange: { start: 0, end: 10 }, role: "步骤到结果", carrier: "UI", meaningChange: "从设置入口切换到结果", evidenceRefs: ["TARGET-0001", "TARGET-0004"] }],
      uiProcedureStates: [],
      transitions: [{ timeRange: { start: 4.5, end: 5.5 }, from: "设置界面", to: "结果界面", mechanism: "界面状态切换", function: "把操作转成可见回报", evidenceRefs: ["TARGET-0002", "TARGET-0004"] }],
      rhythm: [{ timeRange: { start: 0, end: 10 }, pace: "稳定", density: "一步一状态", function: "降低操作理解成本", evidenceRefs: ["TARGET-0001", "TARGET-0004"] }],
      missingBridges: [{ timeRange: { start: 0, end: 10 }, statement: "隐藏设置没有展示", impact: "无法完整复现参数", evidenceRefs: ["TARGET-0001", "TARGET-0004"] }],
      audioRole: null, notes: ["非旁白音频无可读语义证据"]
    }
  };
  fs.writeFileSync(file, JSON.stringify(reconstruction));
}

describe("Builder deterministic integrity gate", () => {
  it("treats checked_unreadable as closed without claiming semantic readability", () => {
    expect(carrierInspectionStatus({
      id: "CAR-AUDIO", available: true, inspected: true,
      inspectionStatus: "checked_unreadable", inspectionRationale: "Only technical stream presence is model-readable."
    })).toBe("checked_unreadable");
  });

  it("binds every transcript cue, unit relation, evidence reference, channel, and media revision", () => {
    const item = createFixture();
    try {
      expect(validateBuilderIntegrity(item.root, item.videoPath)).toMatchObject({
        transcriptCues: 2,
        accountableCues: 2,
        knowledgeUnits: 2,
        coreUnits: 2
      });
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("accepts a complete V2 Builder result with three evidence-bound lenses", () => {
    const item = createFixture();
    try {
      upgradeFixtureToV2(item.root);
      expect(validateBuilderIntegrity(item.root, item.videoPath)).toMatchObject({ builderLensEvidenceReferences: 16 });
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects V2 lens references that do not exist in the frozen revision", () => {
    const item = createFixture();
    try {
      upgradeFixtureToV2(item.root);
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.builderLenses.visualEditing.claims[0].evidenceRefs = ["TARGET-MISSING"];
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_BUILDER_LENS_DANGLING_REFERENCE:TARGET-MISSING");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects repeated directing stages that only rename the same function", () => {
    const item = createFixture();
    try {
      upgradeFixtureToV2(item.root);
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.builderLenses.directingLogic.stages[1].function = reconstruction.builderLenses.directingLogic.stages[0].function;
      reconstruction.builderLenses.directingLogic.stages[1].cognitiveChange = reconstruction.builderLenses.directingLogic.stages[0].cognitiveChange;
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath)).toThrow("BUILDER_INTEGRITY_DIRECTING_STAGE_REPETITION");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects a plausible reconstruction that silently changes one cue", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.transcript.cues[0].text = "被悄悄改写的字幕";
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath)).toThrow("BUILDER_INTEGRITY_CUE_DRIFT");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("requires OCR evidence to reference a recognized OCR line rather than its TARGET frame", () => {
    const item = createFixture();
    try {
      fs.writeFileSync(path.join(item.root, "targeted-evidence/ocr-evidence.json"), JSON.stringify({
        frames: [{ frameId: "TARGET-0001", time: 0.5, status: "processed", lines: [{ id: "OCR-00001" }] }]
      }));
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].evidence.push({ refType: "ocr", ref: "TARGET-0001", supports: "invalid alias" });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_DANGLING_REFERENCE:ocr:TARGET-0001");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("requires source evidence to use a registered derivedSources ID instead of a path", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].evidence.push({
        refType: "source", ref: "media-preparation.json#audio", supports: "technical stream presence"
      });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_DANGLING_REFERENCE:source:media-preparation.json#audio");

      reconstruction.derivedSources.push({ id: "SRC-MEDIA-PREP", path: "media-preparation.json" });
      reconstruction.knowledgeUnits[0].evidence.at(-1).ref = "SRC-MEDIA-PREP";
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath)).not.toThrow();
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects frame evidence outside its knowledge-unit time range", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].evidence.push({
        refType: "targeted_frame", ref: "TARGET-0004", supports: "outside the unit"
      });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_EVIDENCE_TIME_RANGE:KU-001:TARGET-0004");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("reports every out-of-range frame reference in one repairable failure", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].timeRange.end = 2;
      reconstruction.knowledgeUnits[0].evidence.push(
        { refType: "targeted_frame", ref: "TARGET-0003", supports: "outside the unit" },
        { refType: "targeted_frame", ref: "TARGET-0004", supports: "outside the unit" }
      );
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath)).toThrow(
        "BUILDER_INTEGRITY_EVIDENCE_TIME_RANGE:KU-001:TARGET-0003,KU-001:TARGET-0004"
      );
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects an inspection status that contradicts compatibility booleans", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.coverageMatrix.channels.push({
        id: "CAR-AUDIO", available: true, inspected: false,
        inspectionStatus: "checked_unreadable", inspectionRationale: "technical stream only"
      });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_CARRIER_STATUS:reconstruction:CAR-AUDIO");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("reports every invalid carrier in one repairable failure", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.coverageMatrix.channels.push(
        { id: "CAR-AUDIO", available: true, inspected: true, inspectionStatus: "checked_readable", inspectionRationale: null },
        { id: "CAR-UI", available: true, inspected: true, inspectionStatus: "checked_readable", inspectionRationale: "" }
      );
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_CARRIER_STATUS:reconstruction:CAR-AUDIO,reconstruction:CAR-UI");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects a probe carrier whose explicit inspection state lacks a rationale", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "probe.json");
      const probe = JSON.parse(fs.readFileSync(file, "utf8"));
      delete probe.informationCarriers[0].inspectionRationale;
      fs.writeFileSync(file, JSON.stringify(probe));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_CARRIER_STATUS:probe:CAR-SPEECH");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

});
