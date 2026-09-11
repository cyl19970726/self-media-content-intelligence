import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { readReportSource, sourceDigest } from "./report-source-revision.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "report-revision-"));
const previous = process.env.SELF_MEDIA_REPORT_REVISIONS_DIR;
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  if (previous === undefined) delete process.env.SELF_MEDIA_REPORT_REVISIONS_DIR;
  else process.env.SELF_MEDIA_REPORT_REVISIONS_DIR = previous;
});
it("selects only hash-bound revisions, retains originals and rejects tampering", () => {
  process.env.SELF_MEDIA_REPORT_REVISIONS_DIR = root;
  const source = path.join(root, "source.json");
  fs.writeFileSync(source, "original");
  expect(readReportSource(source)).toEqual({ text: "original", revision: null });
  const directory = path.join(root, sourceDigest("original"));
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "revised-source"), "corrected");
  fs.writeFileSync(path.join(directory, "revision.json"), JSON.stringify({schemaVersion:"report-source-revision@1", originalSha256:sourceDigest("original"), revisedSha256:sourceDigest("corrected"), revisionId:"r1",reason:"独立核对原证据"}));
  expect(readReportSource(source)).toEqual({text:"corrected",revision:"r1：独立核对原证据"});
  expect(fs.readFileSync(source,"utf8")).toBe("original");
  fs.writeFileSync(path.join(directory,"revised-source"),"tampered");
  expect(() => readReportSource(source)).toThrow("校验失败");
  fs.writeFileSync(source,"new original");
  expect(readReportSource(source)).toEqual({text:"new original",revision:null});
});
