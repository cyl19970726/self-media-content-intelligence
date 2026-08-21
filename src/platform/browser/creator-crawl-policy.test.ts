import { describe, expect, it } from "vitest";
import { buildAcquisitionScript, buildDetailScript } from "./ego-browser-creator-executor.js";
import { advanceCreatorCrawl, createCreatorCrawlState, type CreatorCrawlObservation } from "./creator-crawl-policy.js";

const options = { maxRounds: 30, lateLoadWindowMs: 20_000, postRetriggerWindowMs: 5_000 };

function observation(input: Partial<CreatorCrawlObservation> = {}): CreatorCrawlObservation {
  return {
    ids: [], explicitEnd: false, scrollTop: 900, documentHeight: 1_000,
    viewportHeight: 100, observedAtMs: 0, ...input
  };
}

describe("creator crawl policy", () => {
  it("uses global unique IDs instead of virtual-list card reuse as growth", () => {
    const initial = createCreatorCrawlState({ globalIds: ["a", "b"] });
    const reused = advanceCreatorCrawl(initial, observation({ ids: ["b", "a"] }), options);
    expect(reused.diagnostic.newGlobalIds).toEqual([]);
    expect(reused.diagnostic.globalCountAfter).toBe(2);

    const next = advanceCreatorCrawl(reused.state, observation({ ids: ["b", "c"] }), options);
    expect(next.diagnostic.newGlobalIds).toEqual(["c"]);
    expect(next.diagnostic.globalCountAfter).toBe(3);
  });

  it("keeps observing three quick empty bottom rounds and accepts a 20s late load", () => {
    let state = createCreatorCrawlState({ globalIds: ["a"] });
    for (const observedAtMs of [0, 2_000, 4_000, 8_000, 19_000]) {
      const decision = advanceCreatorCrawl(state, observation({ ids: ["a"], observedAtMs }), options);
      expect(decision.action).toBe("bottom_observe");
      expect(decision.stopReason).toBeNull();
      state = decision.state;
    }
    const late = advanceCreatorCrawl(state, observation({ ids: ["a", "late"], observedAtMs: 20_000 }), options);
    expect(late.action).toBe("advance");
    expect(late.diagnostic.newGlobalIds).toEqual(["late"]);
  });

  it("does not treat height changes as growth and does treat a new ID at fixed height as growth", () => {
    const state = createCreatorCrawlState({ globalIds: ["a"], lastDocumentHeight: 1_000 });
    const heightOnly = advanceCreatorCrawl(state, observation({ ids: ["a"], documentHeight: 1_300, scrollTop: 1_200 }), options);
    expect(heightOnly.diagnostic.heightDelta).toBe(300);
    expect(heightOnly.diagnostic.newGlobalIds).toEqual([]);

    const fixedHeightNewId = advanceCreatorCrawl(heightOnly.state, observation({ ids: ["a", "b"], documentHeight: 1_300, scrollTop: 1_200, observedAtMs: 2_000 }), options);
    expect(fixedHeightNewId.diagnostic.heightDelta).toBe(0);
    expect(fixedHeightNewId.diagnostic.newGlobalIds).toEqual(["b"]);
    expect(fixedHeightNewId.action).toBe("advance");
  });

  it("runs one bounded retrigger, then stops as quiescent incomplete and can resume", () => {
    let state = createCreatorCrawlState({ globalIds: ["a"] });
    state = advanceCreatorCrawl(state, observation({ ids: ["a"], observedAtMs: 0 }), options).state;
    const retrigger = advanceCreatorCrawl(state, observation({ ids: ["a"], observedAtMs: 20_000 }), options);
    expect(retrigger.action).toBe("bounded_retrigger");
    const stop = advanceCreatorCrawl(retrigger.state, observation({ ids: ["a"], observedAtMs: 25_000 }), options);
    expect(stop.action).toBe("stop");
    expect(stop.stopReason).toBe("quiescent_incomplete");

    const resumed = createCreatorCrawlState({ globalIds: stop.state.globalIds, lastScrollTop: stop.state.lastScrollTop, lastDocumentHeight: stop.state.lastDocumentHeight });
    const afterResume = advanceCreatorCrawl(resumed, observation({ ids: ["a", "b"], observedAtMs: 30_000 }), options);
    expect(afterResume.diagnostic.newGlobalIds).toEqual(["b"]);
    expect(afterResume.stopReason).toBeNull();
  });

  it("distinguishes explicit end and budget stops", () => {
    const explicit = advanceCreatorCrawl(createCreatorCrawlState(), observation({ explicitEnd: true }), options);
    expect(explicit.stopReason).toBe("explicit_end");
    const budget = advanceCreatorCrawl(createCreatorCrawlState(), observation(), { ...options, maxRounds: 1 });
    expect(budget.stopReason).toBe("budget_reached");
  });
});

describe("ego-browser scripts", () => {
  it("persists a resume cursor and emits the required crawl diagnostics", () => {
    const script = buildAcquisitionScript({ runId: "run-1", profileUrl: "https://www.xiaohongshu.com/user/profile/a", maxScrollRounds: 30, taskSpaceId: null });
    expect(script).toContain("sessionStorage.getItem");
    expect(script).toContain("sessionStorage.setItem");
    for (const field of ["globalCountBefore", "globalCountAfter", "newGlobalIds", "heightDelta", "scrollDelta", "atBottom", "waitElapsedMs", "waitReason", "action"]) {
      expect(script).toContain(field);
    }
    expect(() => new Function(`return async function generatedAcquisition(){${script}}`)).not.toThrow();
  });

  it("uses a live profile-card route before a bare explore URL", () => {
    const canonical = "https://www.xiaohongshu.com/explore/post-1";
    const script = buildDetailScript({ runId: "run-1", profileUrl: "https://www.xiaohongshu.com/user/profile/a", posts: [{ externalId: "post-1", url: canonical, resolveMedia: false }], taskSpaceId: 2 });
    expect(script).toContain("isBareExploreUrl");
    expect(script).toContain("profile_live_card");
    expect(script).toContain("document.querySelectorAll('a[href]')");
    expect(script).toContain(canonical);
    expect(script).toContain("profile_fallback");
    expect(() => new Function(`return async function generatedDetail(){${script}}`)).not.toThrow();
  });

  it("keeps a non-bare canonical detail URL as the direct first attempt", () => {
    const canonical = "https://www.xiaohongshu.com/user/profile/a/post-1";
    const script = buildDetailScript({ runId: "run-1", profileUrl: "https://www.xiaohongshu.com/user/profile/a", posts: [{ externalId: "post-1", url: canonical, resolveMedia: false }], taskSpaceId: 2 });
    expect(script).toContain("{ href: request.url, cover: null, source: 'canonical' }");
    expect(script).toContain(canonical);
    expect(() => new Function(`return async function generatedDetail(){${script}}`)).not.toThrow();
  });

  it("stops immediately on login, captcha, 300031, and safety-limit pages", () => {
    const script = buildDetailScript({ runId: "run-1", profileUrl: "https://www.xiaohongshu.com/user/profile/a", posts: [{ externalId: "post-1", url: "https://www.xiaohongshu.com/explore/post-1", resolveMedia: false }], taskSpaceId: 2 });
    expect(script).toMatch(/300031/);
    expect(script).toMatch(/安全限制/);
    expect(script).toMatch(/当前笔记暂时无法浏览/);
    expect(script).toMatch(/立即停止且不会自动重试/);
    expect(script).toContain("if (handoff) break");
  });
});
