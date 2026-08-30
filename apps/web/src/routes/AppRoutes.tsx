import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

const BenchmarkPage = lazy(() => import("../features/comparison/BenchmarkPage"));
const CreationWorkspace = lazy(() => import("../features/creation/CreationWorkspacePage"));
const CreatorDossierPage = lazy(() => import("../features/creator-research/CreatorDossierPage"));
const CreatorsOverview = lazy(() => import("../features/creator-research/CreatorsPage"));
const VideoEvidencePage = lazy(() => import("../features/creator-research/VideoEvidencePage"));
const EvidenceInspector = lazy(() => import("../features/evidence/EvidenceInspectorPage"));
const KnowledgeWorkspace = lazy(() => import("../features/knowledge/KnowledgePage"));
const LearningLoopsPage = lazy(() => import("../features/learning-loop/LearningLoopsPage"));
const SinglePostHome = lazy(() => import("../features/single-post/SinglePostWorkspace")
  .then((module) => ({ default: module.SinglePostHome })));
const SinglePostDetail = lazy(() => import("../features/single-post/SinglePostWorkspace")
  .then((module) => ({ default: module.SinglePostDetail })));

function LegacyCreatorRunRedirect() {
  const { id = "" } = useParams();
  return <Navigate replace to={`/creators/${encodeURIComponent(id)}`}/>;
}

export function AppRoutes() {
  return <Suspense fallback={<div className="page-loader"><LoaderCircle className="spin"/><p>正在加载工作区</p></div>}><Routes>
    <Route path="/" element={<SinglePostHome/>}/>
    <Route path="/creators" element={<CreatorsOverview/>}/>
    <Route path="/creators/:id" element={<CreatorDossierPage/>}/>
    <Route path="/creators/:id/videos/:videoId" element={<VideoEvidencePage/>}/>
    <Route path="/creator-runs/:id" element={<LegacyCreatorRunRedirect/>}/>
    <Route path="/comparisons" element={<BenchmarkPage/>}/>
    <Route path="/comparisons/:comparisonId" element={<BenchmarkPage/>}/>
    <Route path="/learning-loop" element={<LearningLoopsPage/>}/>
    <Route path="/learning-loop/:runId" element={<LearningLoopsPage/>}/>
    <Route path="/knowledge" element={<KnowledgeWorkspace/>}/>
    <Route path="/knowledge/:conceptId" element={<KnowledgeWorkspace/>}/>
    <Route path="/evidence" element={<EvidenceInspector/>}/>
    <Route path="/creation" element={<CreationWorkspace/>}/>
    <Route path="/benchmark" element={<Navigate replace to="/comparisons"/>}/>
    <Route path="/runs/:id" element={<SinglePostDetail/>}/>
    <Route path="*" element={<SinglePostHome/>}/>
  </Routes></Suspense>;
}
