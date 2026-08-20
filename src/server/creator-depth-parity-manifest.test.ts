import { describe, expect, it } from "vitest";
import {
  assertCreatorDepthParity,
  buildAllCreatorDepthParityManifests,
  buildCreatorDepthParityManifest,
  evaluateCreatorDepthParityManifest,
  type CreatorDepthParityManifest
} from "./creator-depth-parity.js";

function withoutGate(manifest: CreatorDepthParityManifest): Omit<CreatorDepthParityManifest, "gate"> {
  const { gate, ...value } = manifest;
  void gate;
  return value;
}

describe("creator depth parity manifests", () => {
  it("binds the three source-of-truth research sets to their exact parity counts", () => {
    const manifests = buildAllCreatorDepthParityManifests();
    expect(manifests.map((manifest) => manifest.creatorId)).toEqual(["ai-red-witch", "zhang-zala", "human-director"]);
    expect(manifests.map((manifest) => manifest.counts)).toEqual([
      { corpus: 331, comparison: 318, canonicalDeep: 21, registeredDeep: 9 },
      { corpus: 62, comparison: 21, canonicalDeep: 12, registeredDeep: 9 },
      { corpus: 19, comparison: 19, canonicalDeep: 8, registeredDeep: 8 }
    ]);
    for (const manifest of manifests) {
      expect(manifest.contractVersion).toBe("creator-depth-parity/1.0.0");
      expect(manifest.sources.length).toBeGreaterThanOrEqual(2);
      expect(manifest.mappings.length).toBeGreaterThanOrEqual(7);
      for (const source of manifest.sources) {
        expect(source.exists, source.path).toBe(true);
        expect(source.sha256, source.path).toMatch(/^[a-f0-9]{64}$/);
        expect(source.recordCount, source.path).toBeTypeOf("number");
      }
      expect(manifest.gate.failures).toEqual([]);
      expect(manifest.gate.ready).toBe(true);
      expect(() => assertCreatorDepthParity(manifest)).not.toThrow();
    }
  });

  it("fails a count mismatch even when a caller mutates a previously-ready gate", () => {
    const manifest = buildCreatorDepthParityManifest("ai-red-witch");
    const partial = withoutGate(manifest);
    partial.counts = { ...partial.counts, registeredDeep: partial.counts.registeredDeep - 1 };
    const gate = evaluateCreatorDepthParityManifest(partial);
    expect(gate.ready).toBe(false);
    expect(gate.failures.map((failure) => failure.id)).toContain("count-mismatch:registeredDeep");
  });

  it("fails an omitted mapping unless an exception names its canonical pointer", () => {
    const manifest = buildCreatorDepthParityManifest("human-director");
    const partial = withoutGate(manifest);
    partial.mappings = partial.mappings.map((mapping, index) => index === 0 ? { ...mapping, status: "omitted" as const } : mapping);
    partial.exceptions = partial.exceptions.filter((exception) => !exception.mappingPointers.includes(partial.mappings[0]!.canonicalPointer));
    const gate = evaluateCreatorDepthParityManifest(partial);
    expect(gate.ready).toBe(false);
    expect(gate.failures.map((failure) => failure.id)).toContain("unexplained-omitted:/identity");
  });

  it("fails missing files and invented hashes", () => {
    const manifest = buildCreatorDepthParityManifest("ai-red-witch");
    const partial = withoutGate(manifest);
    partial.sources = partial.sources.map((source, index) => index === 0 ? { ...source, exists: false, sha256: null } : index === 1 ? { ...source, sha256: "invented" } : source);
    const gate = evaluateCreatorDepthParityManifest(partial);
    expect(gate.ready).toBe(false);
    expect(gate.failures.some((failure) => failure.id.startsWith("missing-source:"))).toBe(true);
    expect(gate.failures.some((failure) => failure.id.startsWith("invalid-sha256:"))).toBe(true);
  });

  it("fails a well-formed but fabricated SHA-256 and an unresolved mapping pointer", () => {
    const manifest = buildCreatorDepthParityManifest("zhang-zala");
    const partial = withoutGate(manifest);
    partial.sources = partial.sources.map((source, index) => index === 0 ? { ...source, sha256: "0".repeat(64) } : source);
    partial.mappings = partial.mappings.map((mapping, index) => index === 0 ? { ...mapping, sourcePointer: `${partial.sources[0]!.path}#/does-not-exist` } : mapping);
    const gate = evaluateCreatorDepthParityManifest(partial);
    expect(gate.ready).toBe(false);
    expect(gate.failures.some((failure) => failure.id.startsWith("sha256-mismatch:"))).toBe(true);
    expect(gate.failures.some((failure) => failure.id.startsWith("invalid-source-pointer:"))).toBe(true);
  });
});
