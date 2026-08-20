import { spawn } from "node:child_process";
import type {
  CreatorAcquisitionResult,
  CreatorBrowserExecutor,
  CreatorDetailResult
} from "../../modules/orchestration/contracts.js";

const resultMarker = "__SELF_MEDIA_CREATOR_RESULT__";

type ProcessResult = { stdout: string; stderr: string; exitCode: number | null };

function runEgoScript(binary: string, script: string, timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ["nodejs"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`ego-browser 超过 ${Math.round(timeoutMs / 1000)} 秒未返回`));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode });
    });
    child.stdin.end(script);
  });
}

function parseMarkedResult(output: string): unknown {
  const markerIndex = output.lastIndexOf(resultMarker);
  if (markerIndex < 0) throw new Error(`ego-browser 没有返回结构化采集结果：${output.trim().slice(-500)}`);
  const payload = output.slice(markerIndex + resultMarker.length).trim().split(/\r?\n/, 1)[0] ?? "";
  return JSON.parse(payload) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeResult(value: unknown): CreatorAcquisitionResult {
  if (!isRecord(value) || typeof value.state !== "string") throw new Error("采集结果结构无效");
  if (value.state === "needs_user") {
    if (typeof value.finalUrl !== "string" || typeof value.taskSpaceId !== "number" ||
      (value.code !== "login_required" && value.code !== "captcha_required" && value.code !== "user_took_control") ||
      typeof value.message !== "string") throw new Error("用户接管结果结构无效");
    return { state: "needs_user", finalUrl: value.finalUrl, taskSpaceId: value.taskSpaceId,
      code: value.code, message: value.message };
  }
  if (value.state === "blocked") {
    const allowed = ["identity_ambiguous", "page_shape_unknown", "browser_unavailable"];
    if ((value.finalUrl !== null && typeof value.finalUrl !== "string") ||
      (value.taskSpaceId !== null && typeof value.taskSpaceId !== "number") ||
      typeof value.code !== "string" || !allowed.includes(value.code) ||
      typeof value.message !== "string" || typeof value.retryable !== "boolean") {
      throw new Error("采集阻塞结果结构无效");
    }
    return {
      state: "blocked", finalUrl: value.finalUrl, taskSpaceId: value.taskSpaceId,
      code: value.code as "identity_ambiguous" | "page_shape_unknown" | "browser_unavailable",
      message: value.message, retryable: value.retryable
    };
  }
  if (value.state !== "ready" || typeof value.finalUrl !== "string" ||
    (value.creatorId !== null && typeof value.creatorId !== "string") ||
    (value.creatorName !== null && typeof value.creatorName !== "string") ||
    typeof value.taskSpaceId !== "number" ||
    !["explicit_end", "zero_growth", "budget_reached"].includes(String(value.stopReason)) ||
    !Array.isArray(value.posts) || !Array.isArray(value.warnings)) {
    throw new Error("采集完成结果结构无效");
  }
  const posts = value.posts.map((post) => {
    if (!isRecord(post) || typeof post.externalId !== "string" || typeof post.url !== "string" ||
      (post.title !== null && typeof post.title !== "string") ||
      (post.visibleText !== null && typeof post.visibleText !== "string") ||
      !["video", "image", "unknown"].includes(String(post.mediaType)) ||
      (post.likesLabel !== null && typeof post.likesLabel !== "string") ||
      (post.likes !== null && typeof post.likes !== "number")) {
      throw new Error("作品清单条目结构无效");
    }
    return {
      externalId: post.externalId,
      url: post.url,
      title: post.title,
      visibleText: post.visibleText,
      mediaType: post.mediaType as "video" | "image" | "unknown",
      likesLabel: post.likesLabel,
      likes: post.likes
    };
  });
  return {
    state: "ready",
    finalUrl: value.finalUrl,
    creatorId: value.creatorId,
    creatorName: value.creatorName,
    taskSpaceId: value.taskSpaceId,
    stopReason: value.stopReason as "explicit_end" | "zero_growth" | "budget_reached",
    posts,
    warnings: value.warnings.filter((warning): warning is string => typeof warning === "string")
  };
}

function acquisitionScript(input: {
  runId: string;
  profileUrl: string;
  maxScrollRounds: number;
  taskSpaceId: number | null;
}): string {
  const taskExpression = input.taskSpaceId === null
    ? `await useOrCreateTaskSpace(${JSON.stringify(`creator-research-${input.runId.slice(0, 8)}`)})`
    : `(await takeOverTaskSpace(${input.taskSpaceId}), { id: ${input.taskSpaceId} })`;
  return `
const task = ${taskExpression}
const sourceUrl = ${JSON.stringify(input.profileUrl)}
const maxRounds = ${Math.min(30, Math.max(1, input.maxScrollRounds))}
await openOrReuseTab(sourceUrl, { wait: true, timeout: 30 })
await wait(1.5)

const inspect = async () => await js(String.raw\`(() => {
  const text = (document.body?.innerText || '').replace(/\\u0000/g, '').trim()
  const href = location.href
  const titleCandidates = [
    document.querySelector('h1')?.textContent,
    document.querySelector('[class*=user-name]')?.textContent,
    document.querySelector('[class*=username]')?.textContent,
    document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    document.title
  ].map(value => value?.trim()).filter(Boolean)
  const posts = [...document.querySelectorAll('section[data-note-id]')].map(container => {
    const externalId = container.getAttribute('data-note-id')?.trim()
    if (!externalId) return null
    const cover = container.querySelector('a.cover')
    const visibleText = (container.innerText || '').trim().slice(0, 800)
    const lines = visibleText.split(/\\n+/).map(line => line.trim()).filter(Boolean)
    const explicitTitle = container?.querySelector('[class*="title"],h3,h4')?.textContent?.trim()
    const title = explicitTitle || lines.find(line => line !== '置顶' && line !== titleCandidates[0] && !/^(赞|收藏|评论|\\d+(?:\\.\\d+)?[万wW]?)$/.test(line)) || null
    const likesLabel = (container?.querySelector('[class*="like"],[class*="count"]')?.textContent || lines.at(-1) || '').trim() || null
    const parseCount = label => {
      if (!label) return null
      const match = label.replace(/,/g, '').match(/(\\d+(?:\\.\\d+)?)\\s*([万wW]?)/)
      if (!match) return null
      const base = Number(match[1])
      if (!Number.isFinite(base)) return null
      return Math.round(base * (match[2] ? 10000 : 1))
    }
    const mediaType = /视频|播放/.test(visibleText) || Boolean(container?.querySelector('video,[class*="play"]')) ? 'video' : cover?.querySelector('img') ? 'image' : 'unknown'
    const url = new URL('/explore/' + externalId, location.origin)
    return {
      externalId, url: url.toString(), title: title?.slice(0, 180) || null,
      visibleText: visibleText || null, mediaType, likesLabel, likes: parseCount(likesLabel)
    }
  }).filter(Boolean)
  return {
    href,
    textSample: text.slice(0, 5000),
    creatorName: titleCandidates[0] || null,
    posts,
    explicitEnd: /没有更多|到底了|暂时没有更多/.test(text)
  }
})()\`)

  let observation = await inspect()
const challenge = /请完成验证|安全验证|验证码|访问过于频繁|网络环境存在风险/
const login = /登录后查看更多|扫码登录|手机号登录/
if (challenge.test(observation.textSample) || login.test(observation.textSample)) {
  const code = challenge.test(observation.textSample) ? 'captcha_required' : 'login_required'
  await handOffTaskSpace(task.id)
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
    state: 'needs_user', finalUrl: observation.href, taskSpaceId: task.id, code,
    message: code === 'captcha_required' ? '小红书要求安全验证，任务已停下并把页面交给你。' : '小红书登录状态不可用，任务已停下并把页面交给你。'
  }))
} else {
  const collected = new Map()
  let zeroGrowth = 0
  let stopReason = 'budget_reached'
  for (let round = 0; round < maxRounds; round += 1) {
    const before = collected.size
    for (const post of observation.posts) collected.set(post.externalId, post)
    zeroGrowth = collected.size === before ? zeroGrowth + 1 : 0
    if (observation.explicitEnd) { stopReason = 'explicit_end'; break }
    if (zeroGrowth >= 3) { stopReason = 'zero_growth'; break }
    await js('(() => { const scroller = document.querySelector(".tab-content-item") || document.scrollingElement; scroller?.scrollBy({ top: 1000, behavior: "auto" }); return true })()')
    await wait(1.2)
    observation = await inspect()
  }
  const creatorMatch = observation.href.match(/\\/user\\/profile\\/([^/?#]+)/)
  if (!creatorMatch) {
    cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
      state: 'blocked', finalUrl: observation.href, taskSpaceId: task.id,
      code: 'identity_ambiguous', message: '最终页面不是可确认的小红书博主主页。', retryable: false
    }))
  } else {
    cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
      state: 'ready', finalUrl: observation.href, creatorId: creatorMatch[1],
      creatorName: observation.creatorName, taskSpaceId: task.id, stopReason,
      posts: [...collected.values()], warnings: collected.size === 0 ? ['主页未提取到可识别的公开作品链接。'] : []
    }))
  }
}
`;
}

function normalizeDetailResult(value: unknown): CreatorDetailResult {
  if (!isRecord(value) || typeof value.state !== "string") throw new Error("详情采集结果结构无效");
  if (value.state !== "ready") return normalizeResult(value) as CreatorDetailResult;
  if (typeof value.taskSpaceId !== "number" || !Array.isArray(value.posts) || !Array.isArray(value.warnings)) {
    throw new Error("详情采集完成结果结构无效");
  }
  const posts = value.posts.map((post) => {
    if (!isRecord(post) || typeof post.externalId !== "string" || typeof post.finalUrl !== "string" ||
      (post.title !== null && typeof post.title !== "string") ||
      (post.description !== null && typeof post.description !== "string") ||
      (post.publishedLabel !== null && typeof post.publishedLabel !== "string") ||
      !["video", "image", "unknown"].includes(String(post.mediaType)) ||
      (post.videoCandidateUrl !== null && typeof post.videoCandidateUrl !== "string") ||
      (post.coverCandidateUrl !== null && typeof post.coverCandidateUrl !== "string") ||
      typeof post.inspectedAt !== "string" || !Array.isArray(post.warnings)) {
      throw new Error("详情采集条目结构无效");
    }
    const transientUrl = (candidate: unknown, kind: "video" | "cover"): string | null => {
      if (candidate === null) return null;
      try {
        const parsed = new URL(String(candidate));
        if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("xhscdn.com")) return null;
        return parsed.toString();
      } catch {
        void kind;
        return null;
      }
    };
    return {
      externalId: post.externalId,
      finalUrl: post.finalUrl,
      title: post.title,
      description: post.description,
      publishedLabel: post.publishedLabel,
      mediaType: post.mediaType as "video" | "image" | "unknown",
      videoCandidateUrl: transientUrl(post.videoCandidateUrl, "video"),
      coverCandidateUrl: transientUrl(post.coverCandidateUrl, "cover"),
      inspectedAt: post.inspectedAt,
      warnings: post.warnings.filter((warning): warning is string => typeof warning === "string")
    };
  });
  return {
    state: "ready",
    taskSpaceId: value.taskSpaceId,
    posts,
    warnings: value.warnings.filter((warning): warning is string => typeof warning === "string")
  };
}

function detailScript(input: { runId: string; profileUrl: string; posts: Array<{ externalId: string; url: string; resolveMedia: boolean }>; taskSpaceId: number | null }): string {
  const taskExpression = input.taskSpaceId === null
    ? `await useOrCreateTaskSpace(${JSON.stringify(`creator-detail-${input.runId.slice(0, 8)}`)})`
    : `await useOrCreateTaskSpace(${input.taskSpaceId})`;
  return `
const task = ${taskExpression}
const requested = ${JSON.stringify(input.posts.slice(0, 21))}
const profileUrl = ${JSON.stringify(input.profileUrl)}
const challenge = /请完成验证|安全验证|验证码|访问过于频繁|网络环境存在风险/
const login = /登录后查看更多|扫码登录|手机号登录/
const output = []
let handoff = null
let navigatedCount = 0
await openOrReuseTab(profileUrl, { wait: true, timeout: 30 })
await js('(() => { const scroller = document.querySelector(".tab-content-item") || document.scrollingElement; scroller?.scrollTo({ top: 0, behavior: "auto" }); return true })()')
await wait(2)
const profileLinks = new Map()
const profileObservedIds = new Set()
let profileZeroGrowth = 0
let profilePreviousCount = 0
for (let round = 0; round < 30; round += 1) {
  const loadedCards = await js(String.raw\`(() => [...document.querySelectorAll('section[data-note-id]')].map(item => {
    const link = item.querySelector('a.cover')
    const image = link?.querySelector('img')
    return { id: item.getAttribute('data-note-id'), href: link?.href || null, cover: image?.currentSrc || image?.src || null }
  }))()\`)
  for (const card of loadedCards) {
    if (card.id) profileObservedIds.add(card.id)
    if (card.id && card.href && requested.some(item => item.externalId === card.id)) profileLinks.set(card.id, { href: card.href, cover: card.cover })
  }
  if (requested.every(item => profileLinks.has(item.externalId))) break
  profileZeroGrowth = profileObservedIds.size === profilePreviousCount ? profileZeroGrowth + 1 : 0
  if (profileZeroGrowth >= 3) break
  profilePreviousCount = profileObservedIds.size
  await js('(() => { const scroller = document.querySelector(".tab-content-item") || document.scrollingElement; scroller?.scrollBy({ top: 1000, behavior: "auto" }); return true })()')
  await wait(1)
}
for (let index = 0; index < requested.length; index += 1) {
  const request = requested[index]
  const navigation = profileLinks.get(request.externalId)
  if (!navigation) continue
  await gotoAndWait(navigation.href, { timeout: 20, settle: 1.5 })
  if (request.resolveMedia) {
    for (let mediaAttempt = 0; mediaAttempt < 20; mediaAttempt += 1) {
      const mediaReady = await js(String.raw\`(() => performance.getEntriesByType('resource').some(entry => {
        try { const url = new URL(entry.name); return url.hostname.startsWith('sns-video-') && url.hostname.endsWith('xhscdn.com') && url.pathname.includes('.mp4') }
        catch { return false }
      }))()\`)
      if (mediaReady) break
      await wait(1)
    }
  } else await wait(0.8)
  const observation = await js(String.raw\`(() => {
    const text = (document.body?.innerText || '').replace(/\\u0000/g, '').trim()
    const textLines = text.split(/\\n+/).map(line => line.trim()).filter(Boolean)
    const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || null
    const description = document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || null
    const datePattern = /^(?:编辑于\\s*)?(?:20\\d{2}-\\d{1,2}-\\d{1,2}|\\d{1,2}-\\d{1,2}|\\d+\\s*(?:天|小时|分钟)前)(?:\\s+.*)?$/
    const published = [...document.querySelectorAll('[class*="date"],[class*="time"]')].map(node => node.textContent?.trim()).find(value => value && datePattern.test(value)) || textLines.find(line => datePattern.test(line)) || null
    const resourceVideos = performance.getEntriesByType('resource').filter(entry => {
      try { const url = new URL(entry.name); return url.hostname.startsWith('sns-video-') && url.hostname.endsWith('xhscdn.com') && url.pathname.includes('.mp4') }
      catch { return false }
    }).sort((a, b) => (b.decodedBodySize || b.transferSize || 0) - (a.decodedBodySize || a.transferSize || 0))
    const mediaType = document.querySelector('video') || resourceVideos.length > 0 ? 'video' : document.querySelectorAll('img').length > 1 ? 'image' : 'unknown'
    const coverCandidateUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
    const normalizedHtml = (document.documentElement?.innerHTML || '').replaceAll('\\\\u002F', '/').replaceAll('\\\\/', '/').replaceAll('&amp;', '&')
    const videoStops = ['"', "'", '<', '>', ' ', '\\n', '\\r', '\\t', '\\\\']
    let htmlVideoCandidate = null
    let videoSearchAt = 0
    while (videoSearchAt < normalizedHtml.length) {
      const videoStart = normalizedHtml.indexOf('https://sns-video-', videoSearchAt)
      if (videoStart < 0) break
      const videoTail = normalizedHtml.slice(videoStart)
      const videoEnd = videoStops.reduce((end, marker) => { const found = videoTail.indexOf(marker); return found >= 0 ? Math.min(end, found) : end }, videoTail.length)
      const candidate = videoTail.slice(0, videoEnd)
      if (candidate.includes('.mp4')) { htmlVideoCandidate = candidate; break }
      videoSearchAt = videoStart + 18
    }
    const videoCandidateUrl = resourceVideos[0]?.name || htmlVideoCandidate
    return { href: location.href, pageTitle: document.title, textSample: text.slice(0, 10000), metaTitle, description, published, mediaType, videoCandidateUrl, coverCandidateUrl }
  })()\`)
  if (challenge.test(observation.textSample) || login.test(observation.textSample)) {
    const code = challenge.test(observation.textSample) ? 'captcha_required' : 'login_required'
    handoff = { state: 'needs_user', finalUrl: observation.href, taskSpaceId: task.id, code,
      message: code === 'captcha_required' ? '详情采集遇到安全验证，已停下并交给你。' : '详情采集需要重新登录，已停下并交给你。' }
    break
  }
  const finalUrl = new URL(observation.href)
  const finalMatch = finalUrl.pathname.match(/\\/(?:explore|discovery\\/item)\\/([^/?#]+)/) || finalUrl.pathname.match(/\\/user\\/profile\\/[^/]+\\/([^/?#]+)/)
  if (finalMatch?.[1] !== request.externalId || /页面不见了|暂时无法浏览/.test(observation.pageTitle + observation.textSample)) continue
  navigatedCount += 1
  const sanitizedUrl = new URL(observation.href)
  sanitizedUrl.search = ''
  sanitizedUrl.hash = ''
  const trustedCover = [observation.coverCandidateUrl, navigation.cover].find(candidate => {
    try { const url = new URL(candidate); return url.protocol === 'https:' && url.hostname.endsWith('xhscdn.com') }
    catch { return false }
  }) || null
  output.push({
    externalId: request.externalId,
    finalUrl: sanitizedUrl.toString(),
    title: observation.metaTitle?.replace(/\\s*-\\s*小红书.*$/, '') || null,
    description: observation.description && !/来小红书.*做朋友/.test(observation.description) ? observation.description.slice(0, 4000) : null,
    publishedLabel: observation.published,
    mediaType: observation.mediaType,
    videoCandidateUrl: observation.videoCandidateUrl,
    coverCandidateUrl: trustedCover,
    inspectedAt: new Date().toISOString(),
    warnings: [request.resolveMedia
      ? (observation.videoCandidateUrl ? 'video_candidate_present' : 'video_candidate_missing_after_bounded_wait')
      : 'video_candidate_not_requested']
  })
}
if (handoff) {
  await handOffTaskSpace(task.id)
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify(handoff))
} else if (requested.length > 0 && output.length / requested.length < 0.8) {
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
    state: 'blocked', finalUrl: null, taskSpaceId: task.id, code: 'page_shape_unknown',
    message: '少于 80% 的选择集详情能确认作品身份；未发布伪详情。目标链接 ' + profileLinks.size + '/' + requested.length + '，身份匹配 ' + navigatedCount + '/' + requested.length + '。', retryable: true
  }))
} else {
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
    state: 'ready', taskSpaceId: task.id, posts: output,
    warnings: output.length < requested.length ? ['详情采集未覆盖全部请求。'] : []
  }))
}
`;
}

export class EgoBrowserCreatorExecutor implements CreatorBrowserExecutor {
  constructor(
    private readonly binary = process.env.SELF_MEDIA_EGO_BROWSER_BIN ?? "ego-browser",
    private readonly timeoutMs = 120_000
  ) {}

  async acquire(input: {
    runId: string;
    profileUrl: string;
    maxScrollRounds: number;
    taskSpaceId: number | null;
  }): Promise<CreatorAcquisitionResult> {
    let processResult: ProcessResult;
    try {
      processResult = await runEgoScript(this.binary, acquisitionScript(input), this.timeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ego-browser 无法启动";
      if (/ENOENT|not found|spawn/.test(message)) {
        return { state: "blocked", finalUrl: null, taskSpaceId: input.taskSpaceId,
          code: "browser_unavailable", message: "后台找不到 ego-browser 可执行程序。", retryable: true };
      }
      if (/user is controlling|user-owned|inactive|not assigned/i.test(message)) {
        return { state: "needs_user", finalUrl: input.profileUrl, taskSpaceId: input.taskSpaceId ?? 1,
          code: "user_took_control", message: "浏览器当前由你控制；完成操作后请在 Dashboard 点击继续。" };
      }
      throw error;
    }
    if (processResult.exitCode !== 0) {
      const combined = `${processResult.stderr}\n${processResult.stdout}`;
      if (/user is controlling|user-owned|inactive|not assigned/i.test(combined) && input.taskSpaceId !== null) {
        return { state: "needs_user", finalUrl: input.profileUrl, taskSpaceId: input.taskSpaceId,
          code: "user_took_control", message: "浏览器当前由你控制；完成操作后请在 Dashboard 点击继续。" };
      }
      throw new Error(processResult.stderr.trim() || `ego-browser 退出码 ${processResult.exitCode}`);
    }
    const result = normalizeResult(parseMarkedResult(`${processResult.stdout}\n${processResult.stderr}`));
    return result;
  }

  async enrich(input: { runId: string; profileUrl: string; posts: Array<{ externalId: string; url: string; resolveMedia: boolean }>; taskSpaceId: number | null }): Promise<CreatorDetailResult> {
    let processResult: ProcessResult;
    try {
      processResult = await runEgoScript(this.binary, detailScript(input), this.timeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ego-browser 无法启动";
      if (/ENOENT|not found|spawn/.test(message)) return {
        state: "blocked", finalUrl: null, taskSpaceId: input.taskSpaceId,
        code: "browser_unavailable", message: "后台找不到 ego-browser 可执行程序。", retryable: true
      };
      throw error;
    }
    if (processResult.exitCode !== 0) throw new Error(processResult.stderr.trim() || `ego-browser 退出码 ${processResult.exitCode}`);
    const result = normalizeDetailResult(parseMarkedResult(`${processResult.stdout}\n${processResult.stderr}`));
    if (result.state === "ready") {
      const closeScript = `const result = await completeTaskSpace(${result.taskSpaceId}, { keep: false })\ncliLog(JSON.stringify(result))\n`;
      const closed = await runEgoScript(this.binary, closeScript, 20_000);
      if (closed.exitCode !== 0) result.warnings.push("详情完成，但临时 TaskSpace 未能自动关闭。");
    } else if (result.state === "blocked" && result.taskSpaceId !== null) {
      await runEgoScript(this.binary, `await completeTaskSpace(${result.taskSpaceId}, { keep: false })\n`, 20_000);
    }
    return result;
  }
}
