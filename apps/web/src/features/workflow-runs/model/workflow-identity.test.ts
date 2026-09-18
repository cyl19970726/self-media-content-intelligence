import { expect, it } from "vitest";
import { originalPostReportHref, workflowReaderLabel } from "./presentation";

it("names a post workflow for readers and retains an exact source-report route", () => {
  expect(workflowReaderLabel("post.analyze")).toBe("单帖研究");
  expect(workflowReaderLabel("creator.synthesize")).toBe("博主研究");
  expect(originalPostReportHref("creator/one", "run-id", "post?one"))
    .toBe("/creators/creator%2Fone/videos/post%3Fone?run=run-id");
});

it("does not invent a report link without bound creator and post identities", () => {
  expect(originalPostReportHref(null, "run-id", "post-one")).toBeNull();
  expect(originalPostReportHref("creator", "run-id", null)).toBeNull();
});
