import { spawn } from "node:child_process";
import type {
  CreatorAcquisitionResult,
  CreatorBrowserExecutor,
  CreatorDetailResult
} from "../../../../research/index.js";
import { advanceCreatorCrawl } from "./creator-crawl-policy.js";

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

function normalizeNavigationDiagnostic(value: unknown) {
  if (!isRecord(value)) return undefined;
  const failureClasses = ["platform_challenge", "login_expired", "navigation_redirect", "user_control"];
  if ((value.postExternalId !== null && typeof value.postExternalId !== "string") ||
    (value.inputUrl !== null && typeof value.inputUrl !== "string") ||
    (value.canonicalUrl !== null && typeof value.canonicalUrl !== "string") ||
    !failureClasses.includes(String(value.failureClass)) ||
    (value.challengeType !== null && typeof value.challengeType !== "string") ||
    typeof value.phase !== "string" || typeof value.fallbackAttempted !== "boolean") return undefined;
  return value as NonNullable<Extract<CreatorAcquisitionResult, { state: "needs_user" }>["navigationDiagnostic"]>;
}

function isCrawlDiagnostic(value: unknown): value is NonNullable<Extract<CreatorAcquisitionResult, { state: "ready" }>["diagnostics"]>[number] {
  if (!isRecord(value)) return false;
  const numeric = ["round", "globalCountBefore", "globalCountAfter", "heightBefore", "heightAfter", "heightDelta",
    "scrollTopBefore", "scrollTopAfter", "scrollDelta", "waitElapsedMs"];
  return numeric.every((key) => typeof value[key] === "number") &&
    Array.isArray(value.newGlobalIds) && value.newGlobalIds.every((id) => typeof id === "string") &&
    typeof value.atBottom === "boolean" && typeof value.waitReason === "string" &&
    ["advance", "bottom_observe", "bounded_retrigger", "stop"].includes(String(value.action));
}

function normalizeResult(value: unknown): CreatorAcquisitionResult {
  if (!isRecord(value) || typeof value.state !== "string") throw new Error("采集结果结构无效");
  if (value.state === "needs_user") {
    if (typeof value.finalUrl !== "string" || typeof value.taskSpaceId !== "number" ||
      (value.code !== "login_required" && value.code !== "captcha_required" && value.code !== "user_took_control" &&
        value.code !== "detail_navigation_required") ||
      typeof value.message !== "string") throw new Error("用户接管结果结构无效");
    return { state: "needs_user", finalUrl: value.finalUrl, taskSpaceId: value.taskSpaceId,
      code: value.code, message: value.message, navigationDiagnostic: normalizeNavigationDiagnostic(value.navigationDiagnostic) };
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
      message: value.message, retryable: value.retryable,
      navigationDiagnostic: normalizeNavigationDiagnostic(value.navigationDiagnostic)
    };
  }
  if (value.state !== "ready" || typeof value.finalUrl !== "string" ||
    (value.creatorId !== null && typeof value.creatorId !== "string") ||
    (value.creatorName !== null && typeof value.creatorName !== "string") ||
    typeof value.taskSpaceId !== "number" ||
    !["explicit_end", "quiescent_incomplete", "budget_reached"].includes(String(value.stopReason)) ||
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
  const diagnostics = Array.isArray(value.diagnostics)
    ? value.diagnostics.filter(isCrawlDiagnostic)
    : [];
  return {
    state: "ready",
    provider: "ego-browser",
    finalUrl: value.finalUrl,
    creatorId: value.creatorId,
    creatorName: value.creatorName,
    taskSpaceId: value.taskSpaceId,
    stopReason: value.stopReason as "explicit_end" | "quiescent_incomplete" | "budget_reached",
    posts,
    warnings: value.warnings.filter((warning): warning is string => typeof warning === "string"),
    diagnostics
  };
}

export function buildAcquisitionScript(input: {
  runId: string;
  profileUrl: string;
  maxScrollRounds: number;
  taskSpaceId: number | null;
}): string {
  const taskExpression = input.taskSpaceId === null
    ? `await useOrCreateTaskSpace(${JSON.stringify(`creator-research-${input.runId.slice(0, 8)}`)})`
    : `(await takeOverTaskSpace(${input.taskSpaceId}), { id: ${input.taskSpaceId} })`;
  const transitionSource = advanceCreatorCrawl.toString();
  return `
const task = ${taskExpression}
const sourceUrl = ${JSON.stringify(input.profileUrl)}
const maxRounds = ${Math.min(30, Math.max(1, input.maxScrollRounds))}
const transition = ${transitionSource}
const cacheKey = ${JSON.stringify(`self-media:creator-crawl:${input.runId}`)}
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
    explicitEnd: /没有更多|到底了|暂时没有更多/.test(text),
    scrollTop: Number((document.querySelector('.tab-content-item') || document.scrollingElement)?.scrollTop || 0),
    documentHeight: Number((document.querySelector('.tab-content-item') || document.scrollingElement)?.scrollHeight || 0),
    viewportHeight: Number((document.querySelector('.tab-content-item') || document.scrollingElement)?.clientHeight || innerHeight || 0),
    observedAtMs: Date.now()
  }
})()\`)

  let observation = await inspect()
const challenge = /请完成验证|安全验证|验证码|访问过于频繁|网络环境存在风险|300031|安全限制/
const login = /登录后查看更多|扫码登录|手机号登录/
if (challenge.test(observation.textSample) || login.test(observation.textSample)) {
  const code = challenge.test(observation.textSample) ? 'captcha_required' : 'login_required'
  await handOffTaskSpace(task.id)
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
    state: 'needs_user', finalUrl: observation.href, taskSpaceId: task.id, code,
    message: code === 'captcha_required' ? '小红书要求安全验证，任务已停下并把页面交给你。' : '小红书登录状态不可用，任务已停下并把页面交给你。'
  }))
} else {
  let cached = null
  try { cached = JSON.parse(await js('sessionStorage.getItem(' + JSON.stringify(cacheKey) + ')')) } catch {}
  const cachedPosts = Array.isArray(cached?.posts) ? cached.posts : []
  const collected = new Map(cachedPosts.filter(post => post?.externalId).map(post => [post.externalId, post]))
  let crawlState = {
    globalIds: [...collected.keys()], rounds: 0, quiescenceStartedAtMs: null, boundedRetriggerUsed: false,
    lastScrollTop: Number(cached?.cursor?.scrollTop || 0), lastDocumentHeight: Number(cached?.cursor?.documentHeight || 0)
  }
  const diagnostics = []
  let handoff = null
  let stopReason = 'budget_reached'
  while (crawlState.rounds < maxRounds) {
    for (const post of observation.posts) collected.set(post.externalId, post)
    const decision = transition(crawlState, {
      ids: observation.posts.map(post => post.externalId), explicitEnd: observation.explicitEnd,
      scrollTop: observation.scrollTop, documentHeight: observation.documentHeight,
      viewportHeight: observation.viewportHeight, observedAtMs: observation.observedAtMs
    }, { maxRounds, lateLoadWindowMs: 20000, postRetriggerWindowMs: 5000 })
    crawlState = decision.state
    diagnostics.push(decision.diagnostic)
    await js('sessionStorage.setItem(' + JSON.stringify(cacheKey) + ', ' + JSON.stringify(JSON.stringify({
      posts: [...collected.values()], cursor: { scrollTop: crawlState.lastScrollTop, documentHeight: crawlState.lastDocumentHeight }, savedAt: new Date().toISOString()
    })) + ')')
    if (decision.action === 'stop') { stopReason = decision.stopReason || 'budget_reached'; break }
    if (decision.action === 'advance') {
      await js('(() => { const scroller = document.querySelector(".tab-content-item") || document.scrollingElement; const step = Math.max(900, Number(scroller?.clientHeight || innerHeight || 900) * 0.85); scroller?.scrollBy({ top: step, behavior: "auto" }); return true })()')
      await wait(1.4)
    } else if (decision.action === 'bottom_observe') {
      await wait(2)
    } else if (decision.action === 'bounded_retrigger') {
      await js('(() => { const scroller = document.querySelector(".tab-content-item") || document.scrollingElement; if (!scroller) return false; scroller.scrollBy({ top: -360, behavior: "auto" }); requestAnimationFrame(() => scroller.scrollTo({ top: scroller.scrollHeight, behavior: "auto" })); return true })()')
      await wait(2.5)
    }
    observation = await inspect()
    if (challenge.test(observation.textSample) || login.test(observation.textSample)) {
      const code = challenge.test(observation.textSample) ? 'captcha_required' : 'login_required'
      handoff = { state: 'needs_user', finalUrl: observation.href, taskSpaceId: task.id, code,
        message: code === 'captcha_required' ? '采集遇到安全验证，已立即停止且不会自动重试。' : '采集登录状态失效，已立即停止且不会自动重试。' }
      break
    }
  }
  const creatorMatch = observation.href.match(/\\/user\\/profile\\/([^/?#]+)/)
  if (handoff) {
    await handOffTaskSpace(task.id)
    cliLog(${JSON.stringify(resultMarker)} + JSON.stringify(handoff))
  } else if (!creatorMatch) {
    cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
      state: 'blocked', finalUrl: observation.href, taskSpaceId: task.id,
      code: 'identity_ambiguous', message: '最终页面不是可确认的小红书博主主页。', retryable: false
    }))
  } else {
    cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
      state: 'ready', finalUrl: observation.href, creatorId: creatorMatch[1],
      creatorName: observation.creatorName, taskSpaceId: task.id, stopReason,
      posts: [...collected.values()], diagnostics,
      warnings: [
        ...(collected.size === 0 ? ['主页未提取到可识别的公开作品链接。'] : []),
        ...(stopReason === 'quiescent_incomplete' ? ['页面静默后停止，清单按 partial 处理；未宣称全量完成。'] : []),
        ...(cachedPosts.length > 0 ? ['已从同一 run 的浏览器会话断点恢复。'] : [])
      ]
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
    provider: "ego-browser",
    taskSpaceId: value.taskSpaceId,
    posts,
    warnings: value.warnings.filter((warning): warning is string => typeof warning === "string")
  };
}

export function buildDetailScript(input: { runId: string; profileUrl: string; creatorName?: string | null;
  posts: Array<{ externalId: string; url: string; title?: string | null; resolveMedia: boolean }>; taskSpaceId: number | null }): string {
  const taskExpression = input.taskSpaceId === null
    ? `await useOrCreateTaskSpace(${JSON.stringify(`creator-detail-${input.runId.slice(0, 8)}`)})`
    : `(await takeOverTaskSpace(${input.taskSpaceId}), { id: ${input.taskSpaceId} })`;
  return `
const task = ${taskExpression}
const requested = ${JSON.stringify(input.posts.slice(0, 21))}
const profileUrl = ${JSON.stringify(input.profileUrl)}
const expectedCreatorName = ${JSON.stringify(input.creatorName ?? null)}
const challenge = /请完成验证|安全验证|验证码|访问过于频繁|网络环境存在风险|300031|安全限制/
const login = /登录后查看更多|扫码登录|手机号登录/
const output = []
let handoff = null
let navigatedCount = 0
const securityStop = (observation, request = null, phase = 'page_check', fallbackAttempted = false) => {
  const security = challenge.test(observation.textSample) || /300031|安全限制|当前笔记暂时无法浏览/.test(observation.textSample + observation.pageTitle)
  if (!security && !login.test(observation.textSample)) return null
  const code = security ? 'captcha_required' : 'login_required'
  const challengeType = security
    ? ((observation.textSample + observation.pageTitle).match(/请完成验证|安全验证|验证码|访问过于频繁|网络环境存在风险|300031|安全限制|当前笔记暂时无法浏览/)?.[0] || 'platform_challenge')
    : ((observation.textSample.match(/登录后查看更多|扫码登录|手机号登录/)?.[0]) || 'login_required')
  return { state: 'needs_user', finalUrl: observation.href, taskSpaceId: task.id, code,
    message: security ? '详情采集在 canonical 与一次 fallback 后仍检测到明确安全验证，已停止。' : '详情采集在 canonical 与一次 fallback 后仍检测到明确登录失效，已停止。',
    navigationDiagnostic: {
      postExternalId: request?.externalId || null,
      inputUrl: request?.url || null,
      canonicalUrl: request ? 'https://www.xiaohongshu.com/explore/' + request.externalId : null,
      failureClass: security ? 'platform_challenge' : 'login_expired', challengeType, phase, fallbackAttempted
    } }
}
const locateFromCurrent = async request => await js(String.raw\`(() => {
  const externalId = ${JSON.stringify("CURRENT_ID")}
  const match = location.pathname.match(/\\/(?:explore|discovery\\/item)\\/([^/?#]+)/) || location.pathname.match(/\\/user\\/profile\\/[^/]+\\/([^/?#]+)/)
  return match?.[1] === externalId ? { href: location.href, cover: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null, source: 'current_detail' } : null
})()\`.replace(${JSON.stringify("CURRENT_ID")}, request.externalId))
const locateFromSearch = async request => {
  if (!request.title) return null
  await gotoAndWait('https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(request.title), { timeout: 30, settle: 1.5 })
  await wait(1.2)
  const status = await js(String.raw\`(() => ({ href: location.href, pageTitle: document.title, textSample: (document.body?.innerText || '').slice(0, 10000) }))()\`)
  const stop = securityStop(status, request, 'search_fallback', true)
  if (stop) { handoff = stop; return null }
  return await js(String.raw\`(() => {
    const externalId = ${JSON.stringify("SEARCH_ID")}
    const creatorName = ${JSON.stringify("SEARCH_CREATOR")}
    const candidates = [...document.querySelectorAll('a[href]')].filter(anchor => {
      try { return new URL(anchor.href, location.href).pathname.endsWith('/' + externalId) }
      catch { return false }
    })
    for (const anchor of candidates) {
      const container = anchor.closest('section,article,li,[class*="note"],[class*="card"]') || anchor.parentElement?.parentElement || anchor
      const text = (container?.innerText || '').trim()
      if (creatorName && !text.includes(creatorName)) continue
      const signed = candidates.find(candidate => candidate.href.includes('xsec_token=')) || anchor
      return { href: signed.href, cover: container?.querySelector('img')?.currentSrc || container?.querySelector('img')?.src || null, source: 'exact_title_search' }
    }
    return null
  })()\`.replace(${JSON.stringify("SEARCH_ID")}, request.externalId).replace(${JSON.stringify("SEARCH_CREATOR")}, expectedCreatorName || ''))
}
const locateFromProfile = async request => {
  await openOrReuseTab(profileUrl, { wait: true, timeout: 30 })
  await wait(1.5)
  const initial = await js(String.raw\`(() => ({ href: location.href, pageTitle: document.title, textSample: (document.body?.innerText || '').slice(0, 10000) }))()\`)
  const stop = securityStop(initial, request, 'profile_fallback_start', true)
  if (stop) { handoff = stop; return null }
  await js('(() => { const scroller = document.scrollingElement || document.documentElement; scroller?.scrollTo({ top: 0, behavior: "auto" }); return true })()')
  for (let round = 0; round < 60; round += 1) {
    const card = await js(String.raw\`(() => {
      const externalId = ${JSON.stringify("PLACEHOLDER")}
      const item = document.querySelector('section[data-note-id="' + externalId + '"]')
      const liveAnchors = [...document.querySelectorAll('a[href]')].filter(anchor => {
        try { return new URL(anchor.href, location.href).pathname.endsWith('/' + externalId) }
        catch { return false }
      })
      const liveAnchor = liveAnchors.find(anchor => anchor.href.includes('xsec_token=')) || liveAnchors[0]
      const container = item || liveAnchor?.closest('section') || liveAnchor?.parentElement?.parentElement
      return liveAnchor || item ? {
        href: liveAnchor?.href || item?.querySelector('a.cover')?.href || null,
        cover: container?.querySelector('img')?.currentSrc || container?.querySelector('img')?.src || null
      } : null
    })()\`.replace(${JSON.stringify("PLACEHOLDER")}, request.externalId))
    if (card?.href) return card
    await js('(() => { const scroller = document.scrollingElement || document.documentElement; if (!scroller) return false; if (' + String(round > 0 && round % 12 === 0) + ') scroller.scrollBy({ top: -360, behavior: "auto" }); scroller.scrollBy({ top: 1400, behavior: "auto" }); return true })()')
    await wait(round >= 12 ? 1.2 : 0.9)
    const status = await js(String.raw\`(() => ({ href: location.href, pageTitle: document.title, textSample: (document.body?.innerText || '').slice(0, 10000) }))()\`)
    const profileStop = securityStop(status, request, 'profile_fallback_scroll', true)
    if (profileStop) { handoff = profileStop; return null }
  }
  return null
}
for (let index = 0; index < requested.length; index += 1) {
  const request = requested[index]
  const requestedUrl = new URL(request.url)
  const isBareExploreUrl = /^\\/explore\\/[^/]+$/.test(requestedUrl.pathname) ||
    new RegExp('^/user/profile/[^/]+/' + request.externalId + '$').test(requestedUrl.pathname)
  let fallbackUsed = isBareExploreUrl
  let navigation = await locateFromCurrent(request) || (isBareExploreUrl
    ? await locateFromSearch(request) || await locateFromProfile(request)
    : { href: request.url, cover: null, source: 'canonical' })
  if (navigation && isBareExploreUrl && navigation.source !== 'exact_title_search') navigation = { ...navigation, source: 'profile_live_card' }
  if (handoff) break
  while (navigation) {
  try { await gotoAndWait(navigation.href, { timeout: 20, settle: 1.5 }) }
  catch {
    if (fallbackUsed) break
    const fallback = await locateFromSearch(request) || await locateFromProfile(request)
    if (handoff || !fallback) break
    navigation = { ...fallback, source: 'profile_fallback' }
    fallbackUsed = true
    continue
  }
  const navigationStatus = await js(String.raw\`(() => ({ href: location.href, pageTitle: document.title, textSample: (document.body?.innerText || '').slice(0, 10000) }))()\`)
  const navigationStop = securityStop(navigationStatus, request, 'detail_navigation', fallbackUsed)
  if (navigationStop) {
    if (!fallbackUsed) {
      const fallback = await locateFromSearch(request) || await locateFromProfile(request)
      if (!handoff && fallback) { navigation = { ...fallback, source: 'challenge_fallback' }; fallbackUsed = true; continue }
    }
    handoff = handoff || navigationStop
    break
  }
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
  const stop = securityStop(observation, request, 'detail_observation', fallbackUsed)
  if (stop) { handoff = stop; break }
  const finalUrl = new URL(observation.href)
  const finalMatch = finalUrl.pathname.match(/\\/(?:explore|discovery\\/item)\\/([^/?#]+)/) || finalUrl.pathname.match(/\\/user\\/profile\\/[^/]+\\/([^/?#]+)/)
  if (finalMatch?.[1] !== request.externalId || /页面不见了/.test(observation.pageTitle + observation.textSample)) {
    if (fallbackUsed) break
    const fallback = await locateFromSearch(request) || await locateFromProfile(request)
    if (handoff || !fallback) break
    navigation = { ...fallback, source: 'profile_fallback' }
    fallbackUsed = true
    continue
  }
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
      : 'video_candidate_not_requested', 'detail_navigation_' + navigation.source]
  })
  break
  }
  if (handoff) break
}
if (handoff) {
  await handOffTaskSpace(task.id)
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify(handoff))
} else if (requested.length > 0 && output.length === 0) {
  await openOrReuseTab(profileUrl, { wait: true, timeout: 30 })
  const failedRequest = requested.find(item => !output.some(done => done.externalId === item.externalId)) || requested[0]
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
    state: 'blocked', finalUrl: profileUrl, taskSpaceId: task.id, code: 'page_shape_unknown', retryable: true,
    message: 'canonical 页面与一次 live-card fallback 均未定位目标帖子；这是内部导航阻塞，不要求用户操作。',
    navigationDiagnostic: { postExternalId: failedRequest?.externalId || null, inputUrl: failedRequest?.url || null,
      canonicalUrl: failedRequest ? 'https://www.xiaohongshu.com/explore/' + failedRequest.externalId : null,
      failureClass: 'navigation_redirect', challengeType: null, phase: 'bounded_navigation_exhausted', fallbackAttempted: true }
  }))
} else {
  cliLog(${JSON.stringify(resultMarker)} + JSON.stringify({
    state: 'ready', taskSpaceId: task.id, posts: output,
    warnings: output.length < requested.length
      ? ['本批已保存 ' + output.length + '/' + requested.length + ' 条；未匹配项将进入下一恢复批次。'] : []
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
      processResult = await runEgoScript(this.binary, buildAcquisitionScript(input), this.timeoutMs);
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
    return result.state === "ready" ? { ...result, provider: "ego-browser" } : result;
  }

  async enrich(input: { runId: string; profileUrl: string; creatorName?: string | null;
    posts: Array<{ externalId: string; url: string; title?: string | null; resolveMedia: boolean }>;
    taskSpaceId: number | null; closeWhenDone?: boolean }): Promise<CreatorDetailResult> {
    let processResult: ProcessResult;
    try {
      processResult = await runEgoScript(this.binary, buildDetailScript(input), this.timeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ego-browser 无法启动";
      if (/ENOENT|not found|spawn/.test(message)) return {
        state: "blocked", finalUrl: null, taskSpaceId: input.taskSpaceId,
        code: "browser_unavailable", message: "后台找不到 ego-browser 可执行程序。", retryable: true
      };
      if (/超过\s*\d+\s*秒未返回/.test(message) && input.taskSpaceId !== null) {
        const target = input.posts[0]?.externalId ?? "当前目标帖子";
        return { state: "blocked", finalUrl: input.profileUrl, taskSpaceId: input.taskSpaceId,
          code: "page_shape_unknown", retryable: true,
          message: `详情读取超过单批时间预算；这是内部导航阻塞，将只自动恢复一次。`,
          navigationDiagnostic: { postExternalId: target, inputUrl: input.posts[0]?.url ?? null,
            canonicalUrl: input.posts[0] ? `https://www.xiaohongshu.com/explore/${input.posts[0].externalId}` : null,
            failureClass: "navigation_redirect", challengeType: null, phase: "detail_timeout", fallbackAttempted: true } };
      }
      throw error;
    }
    if (processResult.exitCode !== 0) {
      const combined = `${processResult.stderr}\n${processResult.stdout}`;
      if (/user is controlling|user-owned|inactive|not assigned/i.test(combined) && input.taskSpaceId !== null) {
        return { state: "needs_user", finalUrl: input.profileUrl, taskSpaceId: input.taskSpaceId,
          code: "user_took_control", message: "浏览会话当前处于交接状态；任务证据已保留，确认继续后会恢复同一详情批次。" };
      }
      throw new Error(processResult.stderr.trim() || `ego-browser 退出码 ${processResult.exitCode}`);
    }
    const normalized = normalizeDetailResult(parseMarkedResult(`${processResult.stdout}\n${processResult.stderr}`));
    const result: CreatorDetailResult = normalized.state === "ready"
      ? { ...normalized, provider: "ego-browser" }
      : normalized;
    if (result.state === "ready" && input.closeWhenDone !== false) {
      const closeScript = `const result = await completeTaskSpace(${result.taskSpaceId}, { keep: false })\ncliLog(JSON.stringify(result))\n`;
      const closed = await runEgoScript(this.binary, closeScript, 20_000);
      if (closed.exitCode !== 0) result.warnings.push("详情完成，但临时 TaskSpace 未能自动关闭。");
    } else if (result.state === "blocked" && result.taskSpaceId !== null) {
      await runEgoScript(this.binary, `await completeTaskSpace(${result.taskSpaceId}, { keep: false })\n`, 20_000);
    }
    return result;
  }
}
