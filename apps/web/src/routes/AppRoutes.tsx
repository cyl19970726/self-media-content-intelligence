import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { WorkflowPostReader } from "../features/creator-research/WorkflowPostReader";
import { WorkflowCreatorReader } from "../features/creator-research/WorkflowCreatorReader";

const BenchmarkPage = lazy(() => import("../features/comparison/BenchmarkPage"));
const CreatorDossierPage = lazy(() => import("../features/creator-research/CreatorDossierPage"));
const CreatorsOverview = lazy(() => import("../features/creator-research/CreatorsPage"));
const VideoEvidencePage = lazy(() => import("../features/creator-research/VideoEvidencePage"));
const EvidenceInspector = lazy(() => import("../features/evidence/EvidenceInspectorPage"));
const KnowledgeWorkspace = lazy(() => import("../features/knowledge/KnowledgePage"));
const LearningLoopsPage = lazy(() => import("../features/learning-loop/LearningLoopsPage"));
const WorkspaceOverviewPage = lazy(() => import("../features/workspace-overview/WorkspaceOverviewPage"));
const LatestPostIndex = lazy(() => import("../features/single-post/LatestPostIndex"));
const WorkflowRunsPage = lazy(() => import("../features/workflow-runs/WorkflowRunsPage"));
const LegacyRunRetired = lazy(() => import("../features/single-post/LatestPostIndex")
  .then((module) => ({ default: module.LegacyRunRetired })));

function LegacyCreatorRunRedirect() {
  const { id = "" } = useParams();
  return <Navigate replace to={`/creators/${encodeURIComponent(id)}`}/>;
}

export function AppRoutes() {
  return <Suspense fallback={<div className="page-loader"><LoaderCircle className="spin"/><p>正在加载工作区</p></div>}><Routes>
    <Route path="/" element={<WorkspaceOverviewPage/>}/>
    <Route path="/analyze" element={<LatestPostIndex/>}/>
    <Route path="/creators" element={<CreatorsOverview/>}/>
    <Route path="/creators/:id" element={<CreatorDossierPage/>}/>
    <Route path="/creators/:id/videos/:videoId" element={<VideoEvidencePage/>}/>
    <Route path="/creator-runs/:id" element={<LegacyCreatorRunRedirect/>}/>
    <Route path="/workflow-runs" element={<WorkflowRunsPage PostReader={WorkflowPostReader} CreatorReader={WorkflowCreatorReader}/>}/>
    <Route path="/workflow-runs/:id" element={<WorkflowRunsPage PostReader={WorkflowPostReader} CreatorReader={WorkflowCreatorReader}/>}/>
    <Route path="/comparisons" element={<BenchmarkPage/>}/>
    <Route path="/comparisons/:comparisonId" element={<BenchmarkPage/>}/>
    <Route path="/learning-loop" element={<LearningLoopsPage/>}/>
    <Route path="/learning-loop/:runId" element={<LearningLoopsPage/>}/>
    <Route path="/knowledge" element={<KnowledgeWorkspace/>}/>
    <Route path="/knowledge/:conceptId" element={<KnowledgeWorkspace/>}/>
    <Route path="/evidence" element={<EvidenceInspector/>}/>
    <Route path="/benchmark" element={<Navigate replace to="/comparisons"/>}/>
    <Route path="/runs/:id" element={<LegacyRunRetired/>}/>
    <Route path="*" element={<WorkspaceOverviewPage/>}/>
  </Routes></Suspense>;
}
