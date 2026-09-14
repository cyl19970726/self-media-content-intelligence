import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

const CreatorDossierPage = lazy(() => import("../features/creator-research/CreatorDossierPage"));
const CreatorsPage = lazy(() => import("../features/creator-research/CreatorsPage"));
const VideoEvidencePage = lazy(() => import("../features/creator-research/VideoEvidencePage"));
const EvidenceInspector = lazy(() => import("../features/evidence/EvidenceInspectorPage"));
const SinglePostHome = lazy(() => import("../features/single-post/SinglePostWorkspace")
  .then((module) => ({ default: module.SinglePostHome })));
const SinglePostDetail = lazy(() => import("../features/single-post/SinglePostWorkspace")
  .then((module) => ({ default: module.SinglePostDetail })));

function CreatorRunRedirect() {
  const { id = "" } = useParams();
  const location = useLocation();
  return <Navigate replace to={`/creators/${encodeURIComponent(id)}${location.search}${location.hash}`}/>;
}

export function AppRoutes() {
  return <Suspense fallback={<div className="page-loader"><LoaderCircle className="spin"/><p>正在打开研究工作台</p></div>}><Routes>
    <Route path="/" element={<Navigate replace to="/creators"/>}/>
    <Route path="/analyze" element={<SinglePostHome/>}/>
    <Route path="/creators" element={<CreatorsPage/>}/>
    <Route path="/creators/:id" element={<CreatorDossierPage/>}/>
    <Route path="/creators/:id/videos/:videoId" element={<VideoEvidencePage/>}/>
    <Route path="/creator-runs/:id" element={<CreatorRunRedirect/>}/>
    <Route path="/runs/:id" element={<SinglePostDetail/>}/>
    <Route path="/evidence" element={<EvidenceInspector/>}/>
    <Route path="*" element={<Navigate replace to="/creators"/>}/>
  </Routes></Suspense>;
}
