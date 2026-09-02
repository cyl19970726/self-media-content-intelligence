import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Check, CircleStop, ExternalLink, FileImage, Film, FolderPlus,
  LoaderCircle, MonitorUp, Play, Plus, RefreshCw, Save, Send, ShieldCheck
} from "lucide-react";
import {
  approvePublication, cancelPublication, createContentPackage, createPlatformVariant,
  createPublication, getContentPackage, getPublicationEvents, listContentPackages,
  listPublications, preparePublication, resumePublication, updatePlatformVariant
} from "../../shared/api/client";
import type {
  ContentPackage, PlatformVariant, PublicationEvent, PublicationRun,
  PublishingPlatform, VariantInput
} from "../../shared/contracts/creation";
import { KnowledgeDecisionPanel } from "./KnowledgeDecisionPanel";
import { PracticeValidationHistory } from "./PracticeValidationHistory";
import { CreationLineagePanel } from "./CreationLineagePanel";

const platformLabels: Record<PublishingPlatform, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  wechat_channels: "微信视频号",
  wechat_official_account: "微信公众号",
  bilibili: "B站"
};
const activeStatuses: PublicationRun["status"][] = [
  "queued_prepare", "preparing", "queued_submit", "submitting", "verifying", "queued_cancel"
];
const statusLabels: Record<PublicationRun["status"], string> = {
  draft: "草稿", queued_prepare: "等待填写", preparing: "填写中", preview_ready: "等待确认",
  queued_submit: "等待提交", submitting: "提交中", verifying: "验证中", published: "已发布", draft_saved: "草稿已保存",
  queued_cancel: "正在取消", canceled: "已取消", needs_user: "需要接管",
  submission_unknown: "结果未知", superseded: "版本已失效", failed: "失败"
};

type VariantForm = {
  platform: PublishingPlatform;
  title: string;
  body: string;
  contentType: "image" | "video" | "article";
  mediaPaths: string;
  tags: string;
  visibility: "public" | "private";
  coverPath: string;
  location: string;
  allowDownload: boolean;
  declaration: "self_made" | "repost";
  sourceUrl: string;
  channelsActivity: string;
  channelsLinkUrl: string;
  original: boolean;
  biliCopyright: "original" | "repost";
  biliPartition: string;
  biliDynamicText: string;
  biliAllowRepost: boolean;
  oaAuthor: string;
  oaDigest: string;
  oaBodyMode: "rich_text" | "one_image";
  oaComments: "all" | "followers" | "off";
};

const emptyVariant: VariantForm = {
  platform: "xiaohongshu", title: "", body: "", contentType: "image",
  mediaPaths: "", tags: "", visibility: "public", coverPath: "", location: "", allowDownload: true,
  declaration: "self_made", sourceUrl: "", channelsActivity: "", channelsLinkUrl: "", original: true,
  biliCopyright: "original", biliPartition: "生活 / 日常", biliDynamicText: "", biliAllowRepost: false,
  oaAuthor: "", oaDigest: "", oaBodyMode: "rich_text", oaComments: "all"
};

function toVariantInput(form: VariantForm): VariantInput {
  const forcedVideo = ["douyin", "wechat_channels", "bilibili"].includes(form.platform);
  const contentType = form.platform === "wechat_official_account" ? "article" : forcedVideo ? "video" : form.contentType;
  const platformOptions = {
    xiaohongshu: form.platform === "xiaohongshu" ? {
      location: form.location || null, allowDownload: form.allowDownload, allowCopy: true
    } : undefined,
    douyin: form.platform === "douyin" ? {
      coverPath: form.coverPath || null, declaration: form.declaration, sourceUrl: form.sourceUrl || null,
      location: form.location || null, allowDownload: form.allowDownload
    } : undefined,
    wechat_channels: form.platform === "wechat_channels" ? {
      coverPath: form.coverPath || null, location: form.location || null, activity: form.channelsActivity || null,
      linkUrl: form.channelsLinkUrl || null, original: form.original, allowDownload: form.allowDownload
    } : undefined,
    bilibili: form.platform === "bilibili" ? {
      coverPath: form.coverPath || null, copyright: form.biliCopyright, sourceUrl: form.sourceUrl || null,
      partition: form.biliPartition, dynamicText: form.biliDynamicText, allowRepost: form.biliAllowRepost
    } : undefined,
    wechat_official_account: form.platform === "wechat_official_account" ? {
      author: form.oaAuthor, digest: form.oaDigest, coverPath: form.coverPath || null,
      bodyMode: form.oaBodyMode, original: form.original, comments: form.oaComments,
      contentSourceUrl: form.sourceUrl || null
    } : undefined
  };
  return {
    platform: form.platform,
    title: form.title,
    body: form.body,
    contentType,
    media: form.mediaPaths.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).map((localPath) => ({
      kind: contentType === "video" ? "video" as const : "image" as const,
      localPath, mimeType: null
    })),
    tags: form.tags.split(/[，,\s]+/).map((value) => value.replace(/^#/, "").trim()).filter(Boolean),
    visibility: form.visibility,
    scheduledAt: null,
    platformOptions
  };
}

function fromVariant(value: PlatformVariant): VariantForm {
  const options = value.platformOptions[value.platform];
  const douyin = value.platformOptions.douyin;
  const channels = value.platformOptions.wechat_channels;
  const bili = value.platformOptions.bilibili;
  const oa = value.platformOptions.wechat_official_account;
  return {
    platform: value.platform, title: value.title, body: value.body, contentType: value.contentType,
    mediaPaths: value.media.map((item) => item.localPath).join("\n"), tags: value.tags.join(" "), visibility: value.visibility,
    coverPath: options && "coverPath" in options ? options.coverPath ?? "" : "",
    location: options && "location" in options ? options.location ?? "" : "",
    allowDownload: options && "allowDownload" in options ? options.allowDownload : true,
    declaration: douyin?.declaration ?? "self_made",
    sourceUrl: options && "sourceUrl" in options ? options.sourceUrl ?? "" : options && "contentSourceUrl" in options ? options.contentSourceUrl ?? "" : "",
    channelsActivity: channels?.activity ?? "",
    channelsLinkUrl: channels?.linkUrl ?? "",
    original: options && "original" in options ? options.original : true,
    biliCopyright: bili?.copyright ?? "original",
    biliPartition: bili?.partition ?? "生活 / 日常",
    biliDynamicText: bili?.dynamicText ?? "",
    biliAllowRepost: bili?.allowRepost ?? false,
    oaAuthor: oa?.author ?? "",
    oaDigest: oa?.digest ?? "",
    oaBodyMode: oa?.bodyMode ?? "rich_text",
    oaComments: oa?.comments ?? "all"
  };
}

function PublicationStatus({ run }: { run: PublicationRun }) {
  return <span className={`publication-status publication-status--${run.status}`}><i />{statusLabels[run.status]}</span>;
}

export default function CreationWorkspace() {
  const [packages, setPackages] = useState<ContentPackage[]>([]);
  const [variants, setVariants] = useState<PlatformVariant[]>([]);
  const [publications, setPublications] = useState<PublicationRun[]>([]);
  const [events, setEvents] = useState<PublicationEvent[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariant);
  const [newPackage, setNewPackage] = useState({ name: "", brief: "", sourceRefs: "" });
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    const [nextPackages, nextPublications] = await Promise.all([listContentPackages(), listPublications()]);
    setPackages(nextPackages);
    setPublications(nextPublications);
    setSelectedPackageId((current) => current ?? nextPackages[0]?.id ?? null);
    setSelectedRunId((current) => current ?? nextPublications[0]?.id ?? null);
  }, []);

  useEffect(() => { void loadLists().catch((cause) => setError(cause instanceof Error ? cause.message : "加载创作台失败")); }, [loadLists]);
  useEffect(() => {
    if (!selectedPackageId) { setVariants([]); return; }
    void getContentPackage(selectedPackageId).then((value) => {
      setVariants(value.variants);
      setSelectedVariantId((current) => value.variants.some((item) => item.id === current) ? current : value.variants[0]?.id ?? null);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "内容包读取失败"));
  }, [selectedPackageId]);
  useEffect(() => {
    const selected = variants.find((item) => item.id === selectedVariantId);
    setVariantForm(selected ? fromVariant(selected) : emptyVariant);
  }, [selectedVariantId, variants]);
  useEffect(() => {
    if (!selectedRunId) { setEvents([]); return; }
    void getPublicationEvents(selectedRunId).then(setEvents).catch(() => setEvents([]));
    setConfirmed(false);
  }, [selectedRunId]);
  useEffect(() => {
    if (!publications.some((item) => activeStatuses.includes(item.status))) return;
    const timer = window.setInterval(() => void loadLists(), 1_500);
    return () => window.clearInterval(timer);
  }, [loadLists, publications]);
  useEffect(() => {
    if (!selectedRunId) return;
    const current = publications.find((item) => item.id === selectedRunId);
    if (!current || !activeStatuses.includes(current.status)) return;
    const timer = window.setInterval(() => void getPublicationEvents(selectedRunId).then(setEvents), 1_500);
    return () => window.clearInterval(timer);
  }, [publications, selectedRunId]);

  const selectedVariant = variants.find((item) => item.id === selectedVariantId) ?? null;
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? null;
  const selectedRun = publications.find((item) => item.id === selectedRunId) ?? null;
  const packageRuns = useMemo(() => {
    const ids = new Set(variants.map((item) => item.id));
    return publications.filter((item) => ids.has(item.variantId));
  }, [publications, variants]);

  const act = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await operation(); await loadLists(); if (selectedRunId) setEvents(await getPublicationEvents(selectedRunId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败"); }
    finally { setBusy(false); }
  };

  const submitPackage = async (event: FormEvent) => {
    event.preventDefault();
    await act(async () => {
      const created = await createContentPackage({ name: newPackage.name, brief: newPackage.brief,
        sourceRefs: newPackage.sourceRefs.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) });
      setSelectedPackageId(created.id); setShowPackageForm(false); setNewPackage({ name: "", brief: "", sourceRefs: "" });
    });
  };

  const saveVariant = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPackageId) return;
    await act(async () => {
      const saved = selectedVariant
        ? await updatePlatformVariant(selectedVariant.id, toVariantInput(variantForm))
        : await createPlatformVariant(selectedPackageId, toVariantInput(variantForm));
      const detail = await getContentPackage(selectedPackageId);
      setVariants(detail.variants); setSelectedVariantId(saved.id);
    });
  };

  const createRunForVariant = () => selectedVariant && act(async () => {
    const run = await createPublication(selectedVariant.id);
    setSelectedRunId(run.id);
  });

  return <main className="creation-workspace">
    <aside className="creation-rail">
      <header><div><span>CONTENT PACKAGES</span><strong>{String(packages.length).padStart(2, "0")}</strong></div>
        <button onClick={() => setShowPackageForm((value) => !value)} aria-label="新建内容包"><FolderPlus size={17}/></button></header>
      {showPackageForm && <form className="package-create" onSubmit={(event) => void submitPackage(event)}>
        <input value={newPackage.name} onChange={(event) => setNewPackage({ ...newPackage, name: event.target.value })} placeholder="内容包名称" required/>
        <textarea value={newPackage.brief} onChange={(event) => setNewPackage({ ...newPackage, brief: event.target.value })} placeholder="核心意图 / 创作简报" rows={3}/>
        <textarea value={newPackage.sourceRefs} onChange={(event) => setNewPackage({ ...newPackage, sourceRefs: event.target.value })} placeholder="研究来源引用，每行一条" rows={2}/>
        <button className="primary-button" disabled={busy}><Plus size={14}/> 创建</button>
      </form>}
      <div className="package-list">{packages.map((item, index) => <button key={item.id}
        className={selectedPackageId === item.id ? "active" : ""} onClick={() => setSelectedPackageId(item.id)}>
        <span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><small>{item.brief || "尚未填写简报"}</small>
      </button>)}</div>
      {packages.length === 0 && <p className="creation-empty">先创建一个内容包，再为不同平台制作版本。</p>}
    </aside>

    <section className="creation-editor">
      <header className="creation-heading"><div><span>CREATION WORKSPACE / LOCAL</span><h1>从内容版本到发布回执</h1></div>
        <p>系统只会自动填好发布页。最终提交必须由你检查真实页面后，对冻结版本再次确认。</p></header>
      {error && <div className="creation-alert"><AlertTriangle size={18}/><span>{error}</span><button onClick={() => setError(null)}>关闭</button></div>}
      {!selectedPackageId ? <div className="creation-zero"><MonitorUp size={30}/><h2>创建第一个内容包</h2><p>内容包承载共同意图，平台标题、正文和素材分别保存在版本中。当前可以独立创建；如果要形成可追踪闭环，请先确认 Knowledge 中存在可引用的真实 revision。</p><div><Link to="/knowledge">检查 Knowledge</Link><button onClick={() => setShowPackageForm(true)}>开始创建内容包</button></div></div> : <>
        {selectedPackage && <KnowledgeDecisionPanel key={`${selectedPackage.id}:${variants.map((item) => item.contentPackageSnapshotId).join(":")}`}
          contentPackage={selectedPackage}/>}
        <div className="variant-tabs">
          {variants.map((item) => <button key={item.id} className={selectedVariantId === item.id ? "active" : ""} onClick={() => setSelectedVariantId(item.id)}>
            {item.contentType === "video" ? <Film size={14}/> : <FileImage size={14}/>} {platformLabels[item.platform]} · r{item.revision}
          </button>)}
          <button onClick={() => { setSelectedVariantId(null); setVariantForm(emptyVariant); }}><Plus size={14}/> 新平台版本</button>
        </div>
        <form className="variant-form" onSubmit={(event) => void saveVariant(event)}>
          <div className="variant-main">
            <label>发布平台<select value={variantForm.platform} disabled={Boolean(selectedVariant)} onChange={(event) => {
              const platform = event.target.value as PublishingPlatform;
              const contentType = platform === "wechat_official_account" ? "article"
                : ["douyin", "wechat_channels", "bilibili"].includes(platform) ? "video" : variantForm.contentType === "article" ? "image" : variantForm.contentType;
              setVariantForm({ ...variantForm, platform, contentType });
            }}><option value="xiaohongshu">小红书</option><option value="douyin">抖音</option><option value="wechat_channels">微信视频号</option><option value="bilibili">B站</option><option value="wechat_official_account">微信公众号</option></select></label>
            <label>标题<input value={variantForm.title} onChange={(event) => setVariantForm({ ...variantForm, title: event.target.value })} required
              placeholder={variantForm.platform === "xiaohongshu" ? "小红书标题，最多 20 单位" : variantForm.platform === "wechat_official_account" ? "公众号标题，最多 64 字" : `${platformLabels[variantForm.platform]}作品标题`}/></label>
            <label>{variantForm.platform === "wechat_official_account" ? "公众号正文" : variantForm.platform === "bilibili" ? "视频简介" : "作品描述"}<textarea value={variantForm.body} onChange={(event) => setVariantForm({ ...variantForm, body: event.target.value })} rows={10}
              placeholder={variantForm.platform === "wechat_official_account" && variantForm.oaBodyMode === "one_image" ? "一张图模式下，此处仅记录替代文字/运营说明。" : variantForm.platform === "bilibili" ? "填写 B 站简介，不要把动态文案混在这里。" : "填写平台作品描述；话题标签单独配置。"}/></label>
          </div>
          <aside className="variant-settings">
            <span>PLATFORM CONTRACT</span>
            {variantForm.platform === "xiaohongshu" && <label>内容形态<select value={variantForm.contentType} onChange={(event) => setVariantForm({ ...variantForm, contentType: event.target.value as "image" | "video" })}><option value="image">图文</option><option value="video">视频</option></select></label>}
            {variantForm.platform !== "xiaohongshu" && <div className="platform-contract-note">
              {variantForm.platform === "wechat_official_account" ? "公众号图文 · 正文编辑器 · 封面/摘要/留言 · 仅保存草稿"
                : variantForm.platform === "bilibili" ? "视频投稿 · 类型/分区/标签/简介/动态分别填写"
                : variantForm.platform === "wechat_channels" ? "视频作品 · 描述/短标题/封面/扩展链接分别填写"
                : "视频作品 · 描述/封面/声明/权限分别填写"}
            </div>}
            <label>本地素材绝对路径<textarea value={variantForm.mediaPaths} onChange={(event) => setVariantForm({ ...variantForm, mediaPaths: event.target.value })} rows={6} required placeholder={variantForm.contentType === "image" ? "/Users/me/image-01.jpg\n/Users/me/image-02.jpg" : "/Users/me/video.mp4"}/></label>
            {["douyin", "wechat_channels", "bilibili", "wechat_official_account"].includes(variantForm.platform) && <label>封面图片绝对路径（可选）<input value={variantForm.coverPath} onChange={(event) => setVariantForm({ ...variantForm, coverPath: event.target.value })} placeholder="留空则使用平台自动封面"/></label>}
            {variantForm.platform === "xiaohongshu" && <>
              <label>地点（可选）<input value={variantForm.location} onChange={(event) => setVariantForm({ ...variantForm, location: event.target.value })}/></label>
              <label className="check-row"><input type="checkbox" checked={variantForm.allowDownload} onChange={(event) => setVariantForm({ ...variantForm, allowDownload: event.target.checked })}/> 允许下载</label>
            </>}
            {variantForm.platform === "douyin" && <>
              <label>作品声明<select value={variantForm.declaration} onChange={(event) => setVariantForm({ ...variantForm, declaration: event.target.value as "self_made" | "repost" })}><option value="self_made">原创/自制</option><option value="repost">转载</option></select></label>
              {variantForm.declaration === "repost" && <label>转载来源 URL<input type="url" value={variantForm.sourceUrl} onChange={(event) => setVariantForm({ ...variantForm, sourceUrl: event.target.value })} required/></label>}
              <label>地点（可选）<input value={variantForm.location} onChange={(event) => setVariantForm({ ...variantForm, location: event.target.value })}/></label>
              <label className="check-row"><input type="checkbox" checked={variantForm.allowDownload} onChange={(event) => setVariantForm({ ...variantForm, allowDownload: event.target.checked })}/> 允许下载</label>
            </>}
            {variantForm.platform === "wechat_channels" && <>
              <label>地点（可选）<input value={variantForm.location} onChange={(event) => setVariantForm({ ...variantForm, location: event.target.value })}/></label>
              <label>活动（可选）<input value={variantForm.channelsActivity} onChange={(event) => setVariantForm({ ...variantForm, channelsActivity: event.target.value })}/></label>
              <label>扩展链接（可选）<input type="url" value={variantForm.channelsLinkUrl} onChange={(event) => setVariantForm({ ...variantForm, channelsLinkUrl: event.target.value })}/></label>
              <label className="check-row"><input type="checkbox" checked={variantForm.original} onChange={(event) => setVariantForm({ ...variantForm, original: event.target.checked })}/> 原创声明</label>
              <label className="check-row"><input type="checkbox" checked={variantForm.allowDownload} onChange={(event) => setVariantForm({ ...variantForm, allowDownload: event.target.checked })}/> 允许下载</label>
            </>}
            {variantForm.platform === "bilibili" && <>
              <label>投稿类型<select value={variantForm.biliCopyright} onChange={(event) => setVariantForm({ ...variantForm, biliCopyright: event.target.value as "original" | "repost" })}><option value="original">自制</option><option value="repost">转载</option></select></label>
              {variantForm.biliCopyright === "repost" && <label>转载来源 URL<input type="url" value={variantForm.sourceUrl} onChange={(event) => setVariantForm({ ...variantForm, sourceUrl: event.target.value })} required/></label>}
              <label>投稿分区<input value={variantForm.biliPartition} onChange={(event) => setVariantForm({ ...variantForm, biliPartition: event.target.value })} placeholder="例如：生活 / 日常" required/></label>
              <label>动态文案<textarea value={variantForm.biliDynamicText} onChange={(event) => setVariantForm({ ...variantForm, biliDynamicText: event.target.value })} rows={3} maxLength={233}/></label>
              <label className="check-row"><input type="checkbox" checked={variantForm.biliAllowRepost} onChange={(event) => setVariantForm({ ...variantForm, biliAllowRepost: event.target.checked })}/> 允许转载</label>
            </>}
            {variantForm.platform === "wechat_official_account" && <>
              <label>正文模式<select value={variantForm.oaBodyMode} onChange={(event) => setVariantForm({ ...variantForm, oaBodyMode: event.target.value as "rich_text" | "one_image" })}><option value="rich_text">富文本图文</option><option value="one_image">一张图文章</option></select></label>
              <label>作者<input value={variantForm.oaAuthor} onChange={(event) => setVariantForm({ ...variantForm, oaAuthor: event.target.value })} maxLength={16}/></label>
              <label>摘要<textarea value={variantForm.oaDigest} onChange={(event) => setVariantForm({ ...variantForm, oaDigest: event.target.value })} rows={3} maxLength={120}/></label>
              <label>原文链接（可选）<input type="url" value={variantForm.sourceUrl} onChange={(event) => setVariantForm({ ...variantForm, sourceUrl: event.target.value })}/></label>
              <label className="check-row"><input type="checkbox" checked={variantForm.original} onChange={(event) => setVariantForm({ ...variantForm, original: event.target.checked })}/> 原创声明</label>
              <label>留言权限<select value={variantForm.oaComments} onChange={(event) => setVariantForm({ ...variantForm, oaComments: event.target.value as "all" | "followers" | "off" })}><option value="all">所有人可留言</option><option value="followers">仅关注后可留言</option><option value="off">关闭留言</option></select></label>
            </>}
            {variantForm.platform !== "wechat_official_account" && <label>话题标签<input value={variantForm.tags} onChange={(event) => setVariantForm({ ...variantForm, tags: event.target.value })} placeholder="AI 创作 工作流"/></label>}
            {variantForm.platform !== "wechat_official_account" && <label>可见范围<select value={variantForm.visibility} onChange={(event) => setVariantForm({ ...variantForm, visibility: event.target.value as "public" | "private" })}><option value="public">公开</option><option value="private">仅自己可见</option></select></label>}
            <button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15}/> : <Save size={15}/>} {selectedVariant ? "保存为新 revision" : "创建平台版本"}</button>
            {selectedVariant && <button type="button" className="secondary-button" disabled={busy} onClick={() => void createRunForVariant()}><Send size={15}/> 创建发布任务</button>}
          </aside>
        </form>
      </>}
    </section>

    <aside className="publication-gate">
      <header><div><span>PUBLICATION GATE</span><strong>{String(packageRuns.length).padStart(2, "0")}</strong></div><button onClick={() => void loadLists()} aria-label="刷新"><RefreshCw size={15}/></button></header>
      <div className="publication-list">{packageRuns.map((run) => <button key={run.id} className={selectedRunId === run.id ? "active" : ""} onClick={() => setSelectedRunId(run.id)}>
        <div><b>{platformLabels[run.platform]}</b><PublicationStatus run={run}/></div><strong>{run.variant.title}</strong><small>r{run.variantRevision} · {run.currentStage}</small>
      </button>)}</div>
      {!selectedRun ? <div className="gate-empty"><ShieldCheck size={24}/><p>选择平台版本并创建发布任务。</p></div> : <section className="gate-detail">
        <div className="gate-title"><PublicationStatus run={selectedRun}/><code>{selectedRun.id.slice(0, 8)}</code></div>
        <h2>{selectedRun.variant.title}</h2><p>{selectedRun.currentStage}</p>
        {selectedRun.blockerMessage && <div className="gate-blocker"><AlertTriangle size={16}/>{selectedRun.blockerMessage}</div>}
        {selectedRun.preview && <div className="preview-proof"><span>LIVE PREVIEW</span><dl><div><dt>页面</dt><dd>{selectedRun.preview.pageTitle || "平台发布页"}</dd></div><div><dt>素材</dt><dd>{selectedRun.preview.mediaCount} 个</dd></div><div><dt>TaskSpace</dt><dd>#{selectedRun.browserTaskSpaceId}</dd></div></dl>
          <a href={selectedRun.preview.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> 查看当前页面地址</a></div>}
        {selectedRun.receipt && <div className="receipt-proof"><Check size={18}/><div><strong>{selectedRun.receipt.platformState}</strong><small>{selectedRun.receipt.externalId ?? "平台未返回公开 ID"}</small>{selectedRun.receipt.externalUrl && <a href={selectedRun.receipt.externalUrl} target="_blank" rel="noreferrer">打开已发布内容</a>}</div></div>}
        <CreationLineagePanel key={`lineage:${selectedRun.id}:${selectedRun.updatedAt}`} run={selectedRun}/>
        <PracticeValidationHistory key={selectedRun.id} run={selectedRun}/>
        <div className="gate-actions">
          {(["draft", "failed"] as PublicationRun["status"][]).includes(selectedRun.status) && <button className="primary-button" disabled={busy} onClick={() => void act(() => preparePublication(selectedRun.id))}><Play size={15}/> 填写平台发布页</button>}
          {selectedRun.status === "needs_user" && <button className="primary-button" disabled={busy} onClick={() => void act(() => resumePublication(selectedRun.id))}><RefreshCw size={15}/> 我已处理，恢复</button>}
          {selectedRun.status === "preview_ready" && <>
            <label className="final-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>我已在 Ego Browser 检查标题、正文、素材、账号和平台提示，同意{selectedRun.platform === "wechat_official_account" ? "保存公众号草稿" : "发布"} r{selectedRun.variantRevision}。</span></label>
            <button className="danger-button" disabled={busy || !confirmed} onClick={() => void act(() => approvePublication(selectedRun.id, selectedRun.variantRevision))}><Send size={15}/> {selectedRun.platform === "wechat_official_account" ? "确认并保存草稿" : "确认并发布一次"}</button>
          </>}
          {!["published", "draft_saved", "canceled", "submission_unknown", "superseded", "submitting", "queued_submit", "verifying"].includes(selectedRun.status) && <button className="secondary-button" disabled={busy} onClick={() => void act(() => cancelPublication(selectedRun.id))}><CircleStop size={15}/> 取消 / 保存草稿</button>}
        </div>
        <div className="publication-events"><span>EVENT LEDGER</span>{events.slice().reverse().map((event) => <div key={event.sequence}><code>{String(event.sequence).padStart(3, "0")}</code><p>{event.message}</p><time>{new Date(event.createdAt).toLocaleTimeString("zh-CN", { hour12: false })}</time></div>)}</div>
      </section>}
    </aside>
  </main>;
}
