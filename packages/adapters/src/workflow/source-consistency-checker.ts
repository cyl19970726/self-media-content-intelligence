import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { AgentRunRequest } from "../../../workflow/index.js";
import { sourceConsistencyCheckV2Schema, type PostWorkflowStartInput, type SourceConsistencyReceipt } from "../../../research/index.js";
import { artifactPath, artifactRef } from "../core/artifacts.js";
import { projectRoot, runArtifactDir, runtimeDir } from "../core/config.js";
import { runFile } from "../core/process.js";
import { freezePostSourceInput } from "../platform/video/video-post-source-input.js";
import { attachVerifiedSkillSnapshots, codexInstalledVersions, defaultCodexSdkFactory, invokeCodexSdk, type CodexSdkFactory, type InvokeCodexSdkRequest, type InvokeCodexSdkResult } from "./codex-sdk-runner.js";
import type { PinnedResearchInput } from "./research-inputs.js";
const methodPath = path.join(projectRoot, ".agents/skills/video-content-reconstruction/references/source-consistency.md");
const sha = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
const fileSha = (f: string) => sha(fs.readFileSync(f));
const stable = (v: unknown): string => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(stable).join(",")}]` : `{${Object.keys(v as object).sort().map(k => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
const outputSchema = { type: "object", additionalProperties: false, required: ["schemaVersion", "verdict", "summary", "comparisons"], properties: {
        schemaVersion: { type: "string", const: "post-source-consistency@2" }, verdict: { type: "string", enum: ["consistent", "conflict", "uncertain"] }, summary: { type: "string" },
        comparisons: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["postClaim", "bearing", "relation", "evidenceRefs", "reason"], properties: {
                    postClaim: { type: "string" }, bearing: { type: "string", enum: ["identity", "claim_detail"] }, relation: { type: "string", enum: ["supports", "contradicts", "insufficient"] }, evidenceRefs: { type: "array", minItems: 1, items: { type: "string" } }, reason: { type: "string" }
                } } }
    } };
type Dependencies = {
    sdkFactory?: CodexSdkFactory;
    invoke?: (factory: CodexSdkFactory, request: InvokeCodexSdkRequest) => Promise<InvokeCodexSdkResult>;
};
type Evidence = {
    ref: string;
    sha256: string;
    timeSeconds?: number;
    label?: string;
};
async function duration(file: string) { try {
    const r = await runFile("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { timeout: 60000 });
    const n = Number(r.stdout.trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}
catch {
    return null;
} }
async function frame(video: string, target: string, time: number) { fs.mkdirSync(path.dirname(target), { recursive: true }); const args = ["-hide_banner", "-loglevel", "error", "-y", "-ss", time.toFixed(3), "-i", video, "-frames:v", "1"]; args.push("-q:v", "2", target); try {
    await runFile("ffmpeg", args, { timeout: 60000 });
}
catch {
    return false;
} return fs.existsSync(target) && fs.statSync(target).size > 0; }
async function sheet(items: Evidence[], output: string, target: string) {
    if (!items.length)
        return false;
    const script = `from PIL import Image,ImageDraw\nimport sys\nout=sys.argv[1]; rows=[]\nfor i in range(2,len(sys.argv),3):\n im=Image.open(sys.argv[i]).convert("RGB"); im.thumbnail((360,610)); canvas=Image.new("RGB",(360,640),"black"); canvas.paste(im,((360-im.width)//2,30)); ImageDraw.Draw(canvas).text((8,6),sys.argv[i+1]+"  "+sys.argv[i+2]+"s",fill="white",stroke_width=2,stroke_fill="black"); rows.append(canvas)\nwhile len(rows)<6: rows.append(rows[-1].copy())\nsheet=Image.new("RGB",(1080,1280),"black")\nfor j,im in enumerate(rows[:6]): sheet.paste(im,((j%3)*360,(j//3)*640))\nsheet.save(out,quality=88)`;
    try {
        await runFile("python3", ["-c", script, target, ...items.flatMap(item => [path.join(output, item.ref), item.label ?? item.ref, String(item.timeSeconds ?? 0)])], { timeout: 60000 });
    }
    catch {
        return false;
    }
    return fs.existsSync(target) && fs.statSync(target).size > 0;
}
export async function runSourceConsistencyCheck(request: AgentRunRequest<unknown>, pinned: PinnedResearchInput, dependencies: Dependencies = {}): Promise<SourceConsistencyReceipt> {
    const source = pinned.source as PostWorkflowStartInput;
    const video = artifactPath(source.sourceMediaArtifactRef);
    const relativeRoot = `workflow-source-checks/${request.runId}/${request.attemptId}/${source.postExternalId}`;
    const output = path.join(runArtifactDir(source.creatorRunId), relativeRoot);
    const privateRoot = path.join(runtimeDir(), "source-check-traces", request.runId, request.stepRunId, request.attemptId);
    fs.mkdirSync(path.join(output, "frames"), { recursive: true });
    fs.mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
    freezePostSourceInput(source, output);
    const sourceMediaSha256 = fileSha(video);
    const seconds = await duration(video);
    const evidence: Evidence[] = [{ ref: "post-source-input.json", sha256: fileSha(path.join(output, "post-source-input.json")) }];
    const sampleTimes: number[] = [];
    if (seconds !== null)
        for (const [i, ratio] of [0.05, 0.3, 0.55, 0.8].entries()) {
            const time = Math.min(seconds - 0.01, Math.max(0, seconds * ratio));
            const ref = `frames/sample-${i + 1}.jpg`;
            if (await frame(video, path.join(output, ref), time)) {
                sampleTimes.push(time);
                evidence.push({ ref, sha256: fileSha(path.join(output, ref)), timeSeconds: time });
            }
        }
    const methodSha256 = fileSha(methodPath);
    if (evidence.length === 1) {
        const inputSha256 = sha(stable({ sourceMediaSha256: sourceMediaSha256, evidence }));
        const artifact = sourceConsistencyCheckV2Schema.parse({ schemaVersion: "post-source-consistency@2", inputSha256, verdict: "uncertain", summary: "源视频未能生成可读抽帧，无法确认来源一致性。", comparisons: [{ postClaim: "原帖标题与正文", bearing: "identity", relation: "insufficient", evidenceRefs: [artifactRef(source.creatorRunId, `${relativeRoot}/post-source-input.json`)], reason: "缺少可直接核对的视频帧。" }], provenance: { model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256, threadId: null } });
        fs.writeFileSync(path.join(privateRoot, "result.json"), `${JSON.stringify({ state: "not_invoked", reason: "no_frames", usage: null, artifact }, null, 2)}\n`, { mode: 0o600 });
        fs.writeFileSync(path.join(output, "source-consistency-check.json"), `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
        return { artifact };
    }
    const runRound = async (round: 1 | 2, items: Evidence[], images: string[]) => {
        const trace = path.join(privateRoot, `round-${round}`);
        fs.mkdirSync(trace, { recursive: true, mode: 0o700 });
        const base = { schemaVersion: "post-source-consistency-input@2", round, postExternalId: source.postExternalId, sourceMediaSha256: sourceMediaSha256, evidence: items };
        const inputSha256 = sha(stable(base));
        const input = { ...base, inputSha256 };
        const name = `source-consistency-input-round-${round}.json`;
        fs.writeFileSync(path.join(output, name), `${JSON.stringify(input, null, 2)}\n`, { mode: 0o600 });
        const instruction = round === 1 ? `Read ${name} and post-source-input.json. Inspect every supplied image. Classify identity separately from claim detail.` : `Read ${name} and post-source-input.json. Independently judge source identity from the newly sampled timestamped context. Detail disagreement alone is not source identity conflict.`;
        const prompt = attachVerifiedSkillSnapshots(`${instruction} Return only required semantic JSON; the Host binds the immutable input revision.`, [methodPath]);
        fs.writeFileSync(path.join(trace, "input.json"), `${JSON.stringify(input, null, 2)}\n`, { mode: 0o600 });
        fs.writeFileSync(path.join(trace, "prompt.txt"), prompt.prompt, { mode: 0o600 });
        const result = await (dependencies.invoke ?? invokeCodexSdk)(dependencies.sdkFactory ?? defaultCodexSdkFactory, { prompt: prompt.prompt, outputDir: output, role: "post-source-checker", model: "gpt-5.6-luna", reasoningEffort: "medium", outputSchema, signal: request.signal, imagePaths: images.map(ref => path.join(output, ref)), timeoutMs: 180000, observer: event => fs.appendFileSync(path.join(trace, "sdk-events.jsonl"), `${JSON.stringify(event)}\n`, { mode: 0o600 }) });
        await request.emit("agent.usage", { childRunId: result.threadId ?? `source-check:${request.attemptId}:round-${round}`, model: "gpt-5.6-luna", reasoningEffort: "medium", ...codexInstalledVersions(), usage: result.usage });
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(result.finalResponse) as Record<string, unknown>;
        }
        catch {
            throw new Error("SOURCE_CONSISTENCY_OUTPUT_NOT_JSON");
        }
        const check = sourceConsistencyCheckV2Schema.parse({ ...parsed, inputSha256, provenance: { model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256, threadId: result.threadId } });
        if (fileSha(video) !== sourceMediaSha256 || items.some(e => fileSha(path.join(output, e.ref)) !== e.sha256))
            throw new Error("SOURCE_CONSISTENCY_INPUT_MUTATED");
        const allowed = new Set(items.map(e => e.ref));
        if (check.comparisons.some(c => c.evidenceRefs.some(ref => !allowed.has(ref))))
            throw new Error("SOURCE_CONSISTENCY_EVIDENCE_REF_INVALID");
        if (check.verdict !== "uncertain" && !check.comparisons.flatMap(c => c.evidenceRefs).some(ref => /^(frames|context|contact-sheets)\//.test(ref)))
            throw new Error("SOURCE_CONSISTENCY_IMAGE_INSPECTION_MISSING");
        fs.writeFileSync(path.join(trace, "runtime.json"), `${JSON.stringify({ ...codexInstalledVersions(), threadId: result.threadId, skillLoad: prompt.receipt, submittedImages: images.map(ref => ({ ref, sha256: fileSha(path.join(output, ref)) })) }, null, 2)}\n`, { mode: 0o600 });
        fs.writeFileSync(path.join(trace, "result.json"), `${JSON.stringify({ threadId: result.threadId, usage: result.usage, artifact: check }, null, 2)}\n`, { mode: 0o600 });
        return check;
    };
    const first = await runRound(1, evidence, evidence.filter(e => e.ref.startsWith("frames/")).map(e => e.ref));
    let final = first;
    const needsContext = first.verdict !== "consistent" || first.comparisons.some(c => c.bearing === "claim_detail" && c.relation === "contradicts");
    if (needsContext && seconds !== null) {
        fs.mkdirSync(path.join(output, "context"), { recursive: true });
        fs.mkdirSync(path.join(output, "contact-sheets"), { recursive: true });
        const opening = Array.from({ length: 7 }, (_, i) => Math.min(seconds - 0.01, i * 2));
        const nearby = sampleTimes.map(t => Math.min(seconds - 0.01, Math.max(0, t + (t + 2 < seconds ? 2 : -2))));
        const times = [...new Set([...opening, ...nearby].filter(n => n >= 0).map(n => n.toFixed(2)))].slice(0, 12).map(Number);
        const contexts: Evidence[] = [];
        for (const [i, time] of times.entries()) {
            const label = `CTX-${String(i + 1).padStart(2, "0")}`;
            const ref = `context/${label.toLowerCase()}.jpg`;
            if (await frame(video, path.join(output, ref), time))
                contexts.push({ ref, sha256: fileSha(path.join(output, ref)), timeSeconds: time, label });
        }
        const sheets: Evidence[] = [];
        for (let i = 0; i < contexts.length; i += 6) {
            const ref = `contact-sheets/sheet-${Math.floor(i / 6) + 1}.jpg`;
            if (await sheet(contexts.slice(i, i + 6), output, path.join(output, ref)))
                sheets.push({ ref, sha256: fileSha(path.join(output, ref)) });
        }
        if (sheets.length)
            final = await runRound(2, [evidence[0]!, ...contexts, ...sheets], sheets.map(e => e.ref));
        else
            final = sourceConsistencyCheckV2Schema.parse({ schemaVersion: "post-source-consistency@2", inputSha256: first.inputSha256, verdict: "uncertain", summary: "补充上下文证据生成失败，无法确认来源一致性。", comparisons: [{ postClaim: "原帖标题与正文", bearing: "identity", relation: "insufficient", evidenceRefs: ["post-source-input.json"], reason: "需要补充上下文，但未能生成可供核对的联系表。" }], provenance: first.provenance });
    }
    const publicCheck = { ...final, comparisons: final.comparisons.map(c => ({ ...c, evidenceRefs: c.evidenceRefs.map(ref => artifactRef(source.creatorRunId, `${relativeRoot}/${ref}`)) })) };
    fs.writeFileSync(path.join(output, "source-consistency-check.json"), `${JSON.stringify(publicCheck, null, 2)}\n`, { mode: 0o600 });
    return { artifact: sourceConsistencyCheckV2Schema.parse(publicCheck) };
}
