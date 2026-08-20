import { describe, expect, it } from "vitest";
import { loadBenchmark, loadCreatorConsole, loadVideoEvidence } from "./console.js";

describe("loadCreatorConsole", () => {
  it("builds the red-witch console with the full loop", () => {
    const consoleData = loadCreatorConsole("ai-red-witch");
    expect(consoleData).not.toBeNull();
    expect(consoleData?.meta.id).toBe("ai-red-witch");
    expect(consoleData?.baseline).not.toBeNull();
    expect(consoleData?.baselineHealth?.status).toBe("partial");
    expect(consoleData?.baselineHealth?.reason).toContain("21 条分层样本");
    expect(consoleData?.baseline?.distribution.length).toBe(6);
    expect(consoleData?.baseline?.averageNote).toContain("断层");
    expect(consoleData?.tiers.map((tier) => tier.id)).toEqual(["high", "base", "low"]);
    expect(consoleData?.tiers.flatMap((tier) => tier.videos).length).toBe(21);
    expect(consoleData?.contentMap.slotName).toBe("增长引擎");
    expect(consoleData?.contentMap.items.length).toBe(3);
    expect(consoleData?.rhythm).not.toBeNull();
    expect(consoleData?.launch).toBeNull();
    expect(consoleData?.launchLink).toBeNull();
  });

  it("builds the human-director console with honest gaps", () => {
    const consoleData = loadCreatorConsole("human-director");
    expect(consoleData).not.toBeNull();
    expect(consoleData?.baseline?.postCount).toBe(19);
    expect(consoleData?.baselineHealth?.status).toBe("full");
    expect(consoleData?.tiers.map((tier) => tier.id)).toEqual(["high", "base", "low"]);
    expect(consoleData?.rhythm).toBeNull();
    expect(consoleData?.rhythmHealth?.status).toBe("missing");
    expect(consoleData?.rhythmHealth?.reason).toContain("发布时间");
    expect(consoleData?.launch).toBeNull();
    expect(consoleData?.launchLink).toBeNull();
  });

  it("returns null for unknown creator", () => {
    expect(loadCreatorConsole("nope")).toBeNull();
  });
});

describe("loadBenchmark", () => {
  it("computes collection-to-like across three ips", () => {
    const benchmark = loadBenchmark();
    expect(benchmark.ips.map((ip) => ip.id)).toEqual(["ai-red-witch", "zhang-zala", "human-director"]);
    for (const ip of benchmark.ips) {
      expect(ip.sampleSize).toBeGreaterThan(0);
      expect(ip.aggregateCollectionToLike).toBeGreaterThan(0);
    }
    expect(benchmark.findings.some((finding) => finding.kind === "track")).toBe(true);
  });
});

describe("loadVideoEvidence", () => {
  it("loads red-witch video evidence from report.json", () => {
    const evidence = loadVideoEvidence("ai-red-witch", "6801c0750000000007037156");
    expect(evidence).not.toBeNull();
    expect(evidence?.title).toContain("deepseek");
    expect(evidence?.engagement?.likes).toBe(63000);
    expect(evidence?.frames.length).toBeGreaterThan(0);
    expect(evidence?.knowledgeUnits.length).toBeGreaterThan(0);
    expect(evidence?.cues.length).toBeGreaterThan(0);
    expect(evidence?.cues[0]?.start).toBe(0);
  });

  it("loads human-director transcript-level evidence", () => {
    const evidence = loadVideoEvidence("human-director", "6a2fcd940000000007021a9f");
    expect(evidence).not.toBeNull();
    expect(evidence?.title).toContain("起号");
    expect(evidence?.frames).toEqual([]);
    expect(evidence?.cues.length).toBeGreaterThan(0);
  });

  it("returns null for unknown video", () => {
    expect(loadVideoEvidence("ai-red-witch", "unknown")).toBeNull();
  });
});
