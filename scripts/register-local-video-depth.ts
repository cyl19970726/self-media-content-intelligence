/** Register an already validated local video in the normal repository/API, without starting acquisition. */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { creatorResearchRunSchema, postSourceFactsSchema } from "../packages/contracts/index.js";
import { buildCreatorPortfolio, creatorPortfolioAnalysisSchema, videoReconstructionBatchSchema } from "../packages/research/index.js";
import { SQLiteCreatorResearchRepository, runArtifactDir, artifactRef } from "../packages/adapters/index.js";
import { validateBuilderIntegrity } from "../packages/adapters/index.js";
const { values } = parseArgs({ options: { "run-id": {type:"string"}, "post-id":{type:"string"}, "creator-label":{type:"string"} } });
const runId = values["run-id"], postId = values["post-id"], creatorName = values["creator-label"];
if (!runId || !postId || !creatorName || !/^[a-zA-Z0-9_-]+$/.test(postId)) throw new Error("Required: --run-id UUID --post-id ID --creator-label NAME");
const directory = runArtifactDir(runId), root = path.join(directory,"video-reconstructions",postId);
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(root,name),"utf8"));
if (fs.existsSync(path.join(root,"development-qa.json")) && read("development-qa.json").state === "rejected") throw new Error("Development QA rejected this candidate");
const receipt = read("builder-validation.json");
if (receipt.passed !== true) throw new Error("Builder validation did not pass");
validateBuilderIntegrity(root, path.join(directory,"source-video.mp4"));
const facts = postSourceFactsSchema.parse(read("post-source-input.json").facts);
const timestamp = new Date().toISOString(), ref = (name:string) => artifactRef(runId,name);
const write = (name:string, value:unknown) => { fs.writeFileSync(path.join(directory,name),JSON.stringify(value,null,2)); return ref(name); };
const inventory = { schemaVersion:"1.1.0",runId,capturedAt:facts.capturedAt ?? timestamp,sourceUrl:facts.sourceUrl,finalUrl:facts.sourceUrl,
  creatorId:null,creatorName,stopReason:"budget_reached",posts:[{externalId:postId,url:facts.sourceUrl,title:facts.title,visibleText:facts.caption,
    mediaType:facts.mediaType,likesLabel:facts.metrics.likes?.toString() ?? null,likes:facts.metrics.likes,collections:facts.metrics.collections,comments:facts.metrics.comments}],
  warnings:["仅登记单帖本地来源；作者主页身份与作者样本未取得，sourceUrl 保留原帖入口。"] };
const inventoryRef=write("local-inventory.json",inventory);
const {corpus,selection}=buildCreatorPortfolio(inventory,inventoryRef,timestamp);
const corpusRef=write("local-corpus.json",corpus), selectionRef=write("local-selection.json",selection);
const portfolioRef=write("local-portfolio.json",creatorPortfolioAnalysisSchema.parse({schemaVersion:"1.0.0",runId,generatedAt:timestamp,
  corpusArtifactRef:corpusRef,selectionArtifactRef:selectionRef,metricCoverage:{known:corpus.denominator.likesKnown,missing:corpus.denominator.likesMissing,rate:corpus.denominator.likesCoverage},
  likes:corpus.likes,tierCounts:selection.tierCounts,anchors:selection.anchors,interpretationBoundary:"单帖登记，无独立作者基线。",unknowns:corpus.unknowns}));
const rootRef=`video-reconstructions/${postId}/`;
const batchRef=write("local-batch.json",videoReconstructionBatchSchema.parse({schemaVersion:"1.0.0",creatorRunId:runId,revision:1,generatedAt:timestamp,
  requestedPosts:1,builtPosts:1,verifiedPosts:0,readyPosts:0,pendingPosts:0,failedPosts:0,limitations:["Builder 已构建，未独立评估。"],items:[{
    postExternalId:postId,evidenceKind:"video",tier:"base",tierRank:1,state:"built_unevaluated",evaluationPolicy:"skip@builder-fast-path-v1",
    sourceMediaArtifactRef:ref("source-video.mp4"),reconstructionArtifactRef:ref(rootRef+"reconstruction.json"),articleArtifactRef:ref(rootRef+"article.md"),
    builderValidationArtifactRef:ref(rootRef+"builder-validation.json"),evaluationArtifactRef:null,gateReportArtifactRef:null,threeLensEvaluationArtifactRef:null,
    threeLensGateReportArtifactRef:null,failedGateIds:[],message:"真实本地视频深度回归",updatedAt:timestamp}]}));
const run=creatorResearchRunSchema.parse({schemaVersion:"1.2.0",id:runId,platform:"xiaohongshu",profileUrl:facts.sourceUrl,
  creatorId:null,creatorName,status:"reviewable",currentStage:"deep_capture",createdAt:timestamp,updatedAt:timestamp,dashboardPath:null,stages:[],
  source:{kind:"legacy_import",sourceRefs:[ref(rootRef+"post-source-input.json")],importedAt:timestamp},
  coverage:{discoveredPosts:1,enrichedPosts:1,comparisonPosts:0,reconstructedPosts:1},
  collectionPolicy:{readOnly:true,incremental:true,bypassChallenges:false,cacheTtlHours:24,budgets:{maxScrollRounds:1,maxDetailOpens:1,maxMediaDownloads:0}},
  blockers:[],nextAction:"本地单帖研究已构建；作者主页与表现基线未知。",lastSnapshotAt:facts.capturedAt,
  inventoryArtifactRef:inventoryRef,portfolioArtifactRef:portfolioRef,selectionArtifactRef:selectionRef,reconstructionBatchArtifactRef:batchRef});
const repository=new SQLiteCreatorResearchRepository();
repository.save(run);repository.close();
console.log(`/creators/${runId}/videos/${postId}?run=${runId}`);
