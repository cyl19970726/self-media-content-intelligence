/** Run the production Builder against a local video; original media remains outside version control. */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { postSourceFactsSchema, missingPostSourceFacts } from "../packages/contracts/index.js";
import { CodexVideoReconstructionExecutor, runArtifactDir, artifactRef, runFile, projectRoot } from "../packages/adapters/index.js";
const {values}=parseArgs({options:{video:{type:"string"},subtitles:{type:"string"},cover:{type:"string"},
  "source-url":{type:"string"},"post-id":{type:"string"},"source-facts":{type:"string"},"subtitle-origin":{type:"string",default:"machine_transcription"}}});
if(!values.video || !values["source-url"] || !values["post-id"] || !/^[a-zA-Z0-9_-]+$/.test(values["post-id"])) throw new Error("Required: --video FILE --source-url URL --post-id ID");
if(!["machine_transcription","provided_subtitles"].includes(values["subtitle-origin"]!)) throw new Error("Unsupported subtitle origin");
const runId=randomUUID(),postId=values["post-id"],sourceUrl=new URL(values["source-url"]);sourceUrl.search="";
const root=runArtifactDir(runId),out=path.join(root,"video-reconstructions",postId);fs.mkdirSync(out,{recursive:true});
const ref=(name:string)=>artifactRef(runId,name),videoPath=path.join(root,"source-video.mp4");
fs.copyFileSync(path.resolve(values.video),videoPath);
const facts=values["source-facts"] ? postSourceFactsSchema.parse(JSON.parse(fs.readFileSync(path.resolve(values["source-facts"]),"utf8"))) : {...missingPostSourceFacts,sourceUrl:sourceUrl.href};
if(facts.sourceUrl.split("?")[0]!==sourceUrl.href) throw new Error("Post facts and source URL must match");
const write=(name:string,value:unknown)=>fs.writeFileSync(path.join(root,name),JSON.stringify(value,null,2));
const coverName=values.cover ? "cover"+path.extname(values.cover) : null;
if(values.cover && coverName) fs.copyFileSync(path.resolve(values.cover),path.join(root,coverName));
write("source-detail.json",{posts:[{externalId:postId,title:facts.title,description:facts.caption,mediaType:facts.mediaType,
  imageCount:facts.imageCount,publishedLabel:facts.publishedLabel,inspectedAt:facts.capturedAt}]});
write("source-selection.json",{items:[{externalId:postId,title:facts.title,...facts.metrics}]});
write("source-media.json",{items:[{externalId:postId,coverState:coverName?"ready":"missing",coverArtifactRef:coverName?ref(coverName):null}]});
if(values.subtitles){
  const srt=path.join(out,"source-video.srt");fs.copyFileSync(path.resolve(values.subtitles),srt);
  await runFile(process.execPath,[path.join(projectRoot,".agents/skills/video-content-reconstruction/scripts/build-evidence-pack.mjs"),
    "--video",videoPath,"--subtitles",srt,"--subtitle-origin",values["subtitle-origin"]!,"--out",path.join(out,"evidence")],{timeout:10*60_000});
}
console.log(JSON.stringify({runId,postId,output:out}));
const outcome=await new CodexVideoReconstructionExecutor().reconstruct({runId,creatorRunId:runId,postExternalId:postId,sourceUrl:sourceUrl.href,
  sourceMediaArtifactRef:ref("source-video.mp4"),detailArtifactRef:ref("source-detail.json"),selectionArtifactRef:ref("source-selection.json"),
  mediaManifestArtifactRef:ref("source-media.json"),evidencePackArtifactRef:null,evaluationPolicy:"skip",contractVersion:"video-content-reconstruction@2"});
write("local-depth-outcome.json",outcome);console.log(JSON.stringify(outcome,null,2));
if(outcome.state!=="built_unevaluated") process.exitCode=1;
