import { spawn } from "node:child_process";
import type {
  BrowserCancelResult, BrowserPrepareResult, BrowserPublicationInput, BrowserPublisher,
  BrowserSubmitResult, PlatformVariant, PublicationPreview, PublicationReceipt, PublishingPlatform
} from "../../../../creation/index.js";

const marker = "__SELF_MEDIA_PUBLICATION__";

type ProcessResult = { stdout: string; stderr: string; exitCode: number };

function runEgoScript(binary: string, script: string, timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ["nodejs"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "", settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`ego-browser 超过 ${Math.round(timeoutMs / 1000)} 秒未返回`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", (error) => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
    child.stdin.end(script);
  });
}

function parseMarked<T>(output: string): T {
  const index = output.lastIndexOf(marker);
  if (index < 0) throw new Error(`ego-browser 没有返回结构化发布结果：${output.trim().slice(-500)}`);
  const line = output.slice(index + marker.length).split(/\r?\n/, 1)[0];
  return JSON.parse(line ?? "null") as T;
}

function publishingUrl(platform: PublishingPlatform): string {
  const urls: Record<PublishingPlatform, string> = {
    xiaohongshu: "https://creator.xiaohongshu.com/publish/publish",
    douyin: "https://creator.douyin.com/creator-micro/content/upload",
    wechat_channels: "https://channels.weixin.qq.com/platform/post/create",
    wechat_official_account: "https://mp.weixin.qq.com/",
    bilibili: "https://member.bilibili.com/platform/upload/video/frame"
  };
  return urls[platform];
}

function challengeExpression(): string {
  return String.raw`(() => {
    const text = (document.body?.innerText || '').slice(0, 12000)
    const url = location.href
    if (/登录|扫码登录|验证码登录|手机号登录|选择公众平台账号登录/.test(text)
      && /login|passport|creator|channels\.weixin|mp\.weixin/.test(url)) return { code: 'login_required', message: '平台登录状态不可用，请在浏览器中完成登录。' }
    if (/验证码|安全验证|拖动滑块|访问频繁|操作频繁|账号异常/.test(text)) return { code: 'platform_challenge', message: '平台要求安全验证或限制了当前操作，请人工处理。' }
    return null
  })()`;
}

function taskExpression(input: BrowserPublicationInput): string {
  return input.taskSpaceId === null
    ? `await useOrCreateTaskSpace(${JSON.stringify(`publish-${input.variant.platform}-${input.runId.slice(0, 8)}`)})`
    : `(await takeOverTaskSpace(${input.taskSpaceId}), { id: ${input.taskSpaceId} })`;
}

function composedBody(variant: PlatformVariant): string {
  const tagLine = variant.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
  return [variant.body.trim(), tagLine].filter(Boolean).join("\n\n");
}

function buildWechatChannelsPrepareScript(input: BrowserPublicationInput): string {
  const videoPath = input.variant.media[0]?.localPath ?? "";
  const body = composedBody(input.variant);
  return `
const task = ${taskExpression(input)}
const result = (value) => cliLog(${JSON.stringify(marker)} + JSON.stringify(value))
try {
  await openOrReuseTab('https://channels.weixin.qq.com/platform', { wait: true, timeout: 35 })
  await wait(3)
  const challenge = await js(${JSON.stringify(challengeExpression())})
  if (challenge) {
    result({ state: 'needs_user', taskSpaceId: task.id, code: challenge.code, message: challenge.message })
    await handOffTaskSpace(task.id)
  } else {
    let tree = await snapshotText()
    const publishMatch = tree.match(/button \\[ref=(\\d+)[^\\n]*\\]\\n\\s+text "发表视频"/)
    if (!publishMatch) throw new Error('视频号首页没有找到“发表视频”入口。')
    await click('@' + publishMatch[1], { label: 'open channels video form' })
    for (let attempt = 0; attempt < 30; attempt += 1) {
      tree = await snapshotText()
      if (tree.includes('上传时长8小时内')) break
      await wait(1)
    }
    if (!tree.includes('上传时长8小时内')) throw new Error('视频号发表表单初始化超时。')
    await cdp('Page.setInterceptFileChooserDialog', { enabled: true })
    const uploadMatch = tree.match(/button \\[ref=(\\d+)[^\\n]*\\][\\s\\S]{0,260}?text "上传时长8小时内/)
    if (!uploadMatch) throw new Error('视频号视频上传入口未识别。')
    await click('@' + uploadMatch[1], { label: 'open channels file chooser' })
    await wait(0.5)
    const chooser = (await drainEvents()).find((event) => event.method === 'Page.fileChooserOpened')
    const backendNodeId = chooser?.params?.backendNodeId
    if (!backendNodeId) throw new Error('视频号没有返回文件选择控件。')
    await cdp('DOM.setFileInputFiles', { backendNodeId, files: [${JSON.stringify(videoPath)}] })
    for (let attempt = 0; attempt < 60; attempt += 1) {
      tree = await snapshotText()
      if (tree.includes('保存草稿') && tree.includes('短标题')) break
      await wait(1)
    }
    if (!tree.includes('保存草稿')) throw new Error('视频号视频上传或处理超时。')
    const titleMatch = tree.match(/textbox \\[ref=(\\d+)[^\\n]*填写短标题/)
    const bodyMatch = tree.match(/container \\[ref=(\\d+)[^\\n]*\\]\\n\\s+text "添加描述"/)
    if (!titleMatch || !bodyMatch) throw new Error('视频号短标题或视频描述控件未识别。')
    await fillInput('@' + titleMatch[1], ${JSON.stringify(input.variant.title)})
    await click('@' + bodyMatch[1], { label: 'fill channels description' })
    await typeText(${JSON.stringify(body)})
    await wait(1)
    tree = await snapshotText()
    if (tree.includes('标题包含特殊字符')) throw new Error('视频号短标题包含平台不支持的字符，请修改后重试。')
    const info = await pageInfo()
    await captureScreenshot()
    result({ state: 'preview_ready', taskSpaceId: task.id, preview: {
      url: info.url, pageTitle: info.title || '视频号助手', preparedTitle: ${JSON.stringify(input.variant.title)},
      preparedBody: ${JSON.stringify(body)}, mediaCount: 1, capturedAt: new Date().toISOString()
    } })
    await handOffTaskSpace(task.id)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: /user is controlling|inactive|not assigned/i.test(message) ? 'user_control' : 'channels_form_error', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

function buildWechatOfficialAccountPrepareScript(input: BrowserPublicationInput): string {
  const imagePath = input.variant.media[0]?.localPath ?? "";
  return `
const task = ${taskExpression(input)}
const result = (value) => cliLog(${JSON.stringify(marker)} + JSON.stringify(value))
const titleValue = ${JSON.stringify(input.variant.title)}
const imagePath = ${JSON.stringify(imagePath)}
try {
  await openOrReuseTab(${JSON.stringify(publishingUrl("wechat_official_account"))}, { wait: true, timeout: 35 })
  await wait(3)
  const challenge = await js(${JSON.stringify(challengeExpression())})
  if (challenge) {
    result({ state: 'needs_user', taskSpaceId: task.id, code: challenge.code, message: challenge.message })
    await handOffTaskSpace(task.id)
  } else {
    const token = await js(String.raw\`(() => {
      const values = [location.href, ...[...document.querySelectorAll('a[href]')].map((anchor) => anchor.href)]
      return values.map((value) => value.match(/[?&]token=(\\d+)/)?.[1]).find(Boolean) || null
    })()\`)
    if (!token) throw new Error('公众号后台已打开，但没有找到登录 token，请重新扫码登录。')
    const editorUrl = 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=0&token=' + token + '&lang=zh_CN'
    await gotoAndWait(editorUrl, { timeout: 35, settle: 2 })
    let editorReady = false
    for (let attempt = 0; attempt < 30; attempt += 1) {
      editorReady = await js("Boolean(document.querySelector('#title'))")
      if (editorReady) break
      await wait(0.5)
    }
    if (!editorReady) throw new Error('公众号一张图编辑器未能加载。')
    const initialized = await js(String.raw\`(() => {
      const title = document.querySelector('#title')
      const titleSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      if (!title || !titleSetter) return false
      titleSetter.call(title, \${JSON.stringify(input.variant.title)})
      title.dispatchEvent(new Event('input', { bubbles: true }))
      title.dispatchEvent(new Event('change', { bubbles: true }))
      title.dispatchEvent(new Event('blur', { bubbles: true }))
      const author = document.querySelector('#author')
      if (author) {
        const authorSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
          || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        if (authorSetter) authorSetter.call(author, '')
        else author.value = ''
        author.dispatchEvent(new Event('input', { bubbles: true }))
        author.dispatchEvent(new Event('change', { bubbles: true }))
      }
      const inputs = [...document.querySelectorAll('input[type="file"]')]
      const upload = inputs.find((element) => /image\\/(png|jpeg|jpg)|image\\/\\*/.test(element.accept || ''))
        || inputs.find((element) => (element.accept || '').includes('image'))
      if (!upload) return false
      upload.setAttribute('data-self-media-wechat-image', 'true')
      return true
    })()\`)
    if (!initialized) throw new Error('公众号标题、作者或正文图片控件未识别。')
    const root = await cdp('DOM.getDocument', { depth: -1, pierce: true })
    const node = await cdp('DOM.querySelector', { nodeId: root.root.nodeId, selector: '[data-self-media-wechat-image="true"]' })
    if (!node.nodeId) throw new Error('公众号正文图片上传控件不可用。')
    await cdp('DOM.setFileInputFiles', { nodeId: node.nodeId, files: [imagePath] })
    let imageReady = false
    for (let attempt = 0; attempt < 80; attempt += 1) {
      imageReady = await js("Boolean(document.querySelector('.ProseMirror img[src*=mmbiz]'))")
      if (imageReady) break
      await wait(0.5)
    }
    if (!imageReady) throw new Error('公众号正文图片上传超时，未进入草稿准备阶段。')
    let coverReady = false
    for (let attempt = 0; attempt < 3 && !coverReady; attempt += 1) {
      coverReady = await js("Boolean((document.querySelector('.js_appmsg_thumb_new')?.style.backgroundImage || '').includes('mmbiz'))")
      if (coverReady) break
      const coverTrigger = await js(String.raw\`(() => {
        const visible = (element) => element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
        const target = [...document.querySelectorAll('*')].find((element) => visible(element) && (element.textContent || '').trim() === '拖拽或选择封面')
        if (!target) return false
        target.setAttribute('data-self-media-cover-trigger', 'true')
        return true
      })()\`)
      if (!coverTrigger) break
      await hover('[data-self-media-cover-trigger="true"]', { label: 'open cover choices' })
      await wait(0.7)
      const fromContent = await js(String.raw\`(() => {
        const target = document.querySelector('.js_cover_null_pop .js_selectCoverFromContent')
        if (!target) return false
        target.setAttribute('data-self-media-cover-from-content', 'true')
        return true
      })()\`)
      if (!fromContent) break
      await click('[data-self-media-cover-from-content="true"]', { label: 'choose cover from content' })
      await wait(1)
      const firstImage = await js(String.raw\`(() => {
        const target = [...document.querySelectorAll('.appmsg_content_img_item')].find((element) => element.getBoundingClientRect().width > 0)
        if (!target) return false
        target.setAttribute('data-self-media-cover-image', 'true')
        return true
      })()\`)
      if (!firstImage) break
      await click('[data-self-media-cover-image="true"]', { label: 'select first cover image' })
      await wait(0.7)
      const nextReady = await js(String.raw\`(() => {
        const target = [...document.querySelectorAll('button')].filter((button) => button.getBoundingClientRect().width > 0)
          .find((button) => (button.textContent || '').trim() === '下一步' && !button.disabled)
        if (!target) return false
        target.setAttribute('data-self-media-cover-next', 'true')
        return true
      })()\`)
      if (!nextReady) break
      await click('[data-self-media-cover-next="true"]', { label: 'continue cover crop' })
      for (let cropWait = 0; cropWait < 30; cropWait += 1) {
        const cropReady = await js(String.raw\`[...document.querySelectorAll('.weui-desktop-dialog__wrp img')]
          .some((image) => image.getBoundingClientRect().width > 0 && image.naturalWidth > 50)\`)
        if (cropReady) break
        await wait(0.5)
      }
      const confirmReady = await js(String.raw\`(() => {
        const targets = [...document.querySelectorAll('button')].filter((button) => button.getBoundingClientRect().width > 0 && (button.textContent || '').trim() === '确认')
        const target = targets.at(-1)
        if (!target) return false
        target.setAttribute('data-self-media-cover-confirm', 'true')
        return true
      })()\`)
      if (confirmReady) await click('[data-self-media-cover-confirm="true"]', { label: 'confirm article cover' })
      for (let coverWait = 0; coverWait < 12; coverWait += 1) {
        coverReady = await js("Boolean((document.querySelector('.js_appmsg_thumb_new')?.style.backgroundImage || '').includes('mmbiz'))")
        if (coverReady) break
        await wait(0.5)
      }
    }
    if (!coverReady) throw new Error('公众号封面验收 G1 未通过，已停止且未保存草稿。')
    const proof = await js(String.raw\`(() => ({
      title: document.querySelector('#title')?.value || '',
      author: document.querySelector('#author')?.value || '',
      imageCount: document.querySelectorAll('.ProseMirror img[src*=mmbiz]').length,
      cover: document.querySelector('.js_appmsg_thumb_new')?.style.backgroundImage || ''
    }))()\`)
    if ([...proof.author].length > 8) throw new Error('公众号作者验收 G2 未通过：作者超过 8 个字。')
    const info = await pageInfo()
    await captureScreenshot()
    result({ state: 'preview_ready', taskSpaceId: task.id, preview: {
      url: info.url || editorUrl, pageTitle: info.title || '微信公众号一张图编辑器', preparedTitle: proof.title || titleValue,
      preparedBody: '一张图文章 · 封面已设置 · 作者字段已清空', mediaCount: proof.imageCount, capturedAt: new Date().toISOString()
    } })
    await handOffTaskSpace(task.id)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: /user is controlling|inactive|not assigned/i.test(message) ? 'user_control' : 'wechat_draft_gate_failed', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

export function buildPrepareScript(input: BrowserPublicationInput): string {
  if (input.variant.platform === "wechat_official_account") return buildWechatOfficialAccountPrepareScript(input);
  if (input.variant.platform === "wechat_channels") return buildWechatChannelsPrepareScript(input);
  const variant = input.variant;
  const body = composedBody(variant);
  const files = variant.media.map((item) => item.localPath);
  const tabLabels = variant.contentType === "video"
    ? ["上传视频", "发布视频", "视频", "视频投稿"]
    : ["上传图文", "发布图文", "图文"];
  return `
const task = ${taskExpression(input)}
const platform = ${JSON.stringify(variant.platform)}
const publishUrl = ${JSON.stringify(publishingUrl(variant.platform))}
const files = ${JSON.stringify(files)}
const tabLabels = ${JSON.stringify(tabLabels)}
const titleValue = ${JSON.stringify(variant.title)}
const bodyValue = ${JSON.stringify(body)}
const result = (value) => cliLog(${JSON.stringify(marker)} + JSON.stringify(value))
try {
  await openOrReuseTab(publishUrl, { wait: true, timeout: 35 })
  await wait(3)
  const challenge = await js(${JSON.stringify(challengeExpression())})
  if (challenge) {
    result({ state: 'needs_user', taskSpaceId: task.id, code: challenge.code, message: challenge.message })
    await handOffTaskSpace(task.id)
  } else {
    const markedTab = await js(String.raw\`(() => {
      const labels = \${JSON.stringify(tabLabels)}
      const candidates = [...document.querySelectorAll('button,[role="tab"],[role="button"],div')]
      const target = candidates.find((element) => {
        const text = (element.textContent || '').trim()
        const rect = element.getBoundingClientRect()
        return labels.includes(text) && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0
      })
      if (!target) return false
      target.setAttribute('data-self-media-platform-tab', 'true')
      return true
    })()\`)
    if (markedTab) { await click('[data-self-media-platform-tab="true"]', { label: 'select content type' }); await wait(2) }
    const fileInput = await js(String.raw\`(() => {
      const inputs = [...document.querySelectorAll('input[type="file"]')]
      const tokens = \${JSON.stringify(variant.contentType === "video" ? ["video", ".mp4"] : ["image", ".png", ".jpg", ".jpeg", ".webp"])}
      const target = inputs.find((input) => tokens.some((token) => (input.getAttribute('accept') || '').toLowerCase().includes(token))) || inputs[0]
      if (!target) return null
      target.setAttribute('data-self-media-upload', 'true')
      return '[data-self-media-upload="true"]'
    })()\`)
    if (!fileInput) throw new Error('没有找到平台素材上传控件，页面结构可能已经变化。')
    const root = await cdp('DOM.getDocument', { depth: -1, pierce: true })
    const node = await cdp('DOM.querySelector', { nodeId: root.root.nodeId, selector: fileInput })
    if (!node.nodeId) throw new Error('素材上传控件不可用。')
    await cdp('DOM.setFileInputFiles', { nodeId: node.nodeId, files })
    await wait(${variant.contentType === "video" ? 8 : 4})
    const filled = await js(String.raw\`(() => {
      const setInput = (element, value) => {
        if (!element) return false
        const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        if (setter) setter.call(element, value); else element.value = value
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
        element.blur()
        return true
      }
      const visible = (element) => {
        if (!element) return false
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0
      }
      const inputs = [...document.querySelectorAll('input,textarea')].filter(visible)
      const title = inputs.find((element) => /标题|作品名称|填写标题/.test(element.placeholder || element.getAttribute('aria-label') || '')) || inputs.find((element) => element.tagName === 'INPUT' && element.type === 'text')
      const body = inputs.find((element) => element !== title && /正文|描述|简介|作品描述|添加描述/.test(element.placeholder || element.getAttribute('aria-label') || '')) || inputs.find((element) => element.tagName === 'TEXTAREA' && element !== title)
      const titleDone = setInput(title, \${JSON.stringify(variant.title)})
      let bodyDone = setInput(body, \${JSON.stringify(body)})
      if (!bodyDone) {
        const editors = [...document.querySelectorAll('[contenteditable="true"]')].filter(visible)
        const editor = editors.find((element) => !element.closest('[data-self-media-platform-tab]')) || editors[0]
        if (editor) {
          editor.focus(); editor.textContent = \${JSON.stringify(body)}
          editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: \${JSON.stringify(body)} }))
          editor.blur(); bodyDone = true
        }
      }
      return { titleDone, bodyDone, titleReadback: title?.value || '', bodyReadback: body?.value || document.querySelector('[contenteditable="true"]')?.textContent || '' }
    })()\`)
    if (!filled.titleDone || !filled.bodyDone) throw new Error('标题或正文控件未识别，已停止在发布页，未点击发布。')
    const visibilityApplied = await js(String.raw\`(() => {
      const desired = \${JSON.stringify(variant.visibility)}
      const labels = desired === 'private' ? ['仅自己可见', '仅我可见', '私密'] : ['公开可见', '公开']
      const visible = (element) => element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
      const selects = [...document.querySelectorAll('select')].filter(visible)
      for (const select of selects) {
        const option = [...select.options].find((item) => labels.some((label) => (item.textContent || '').trim() === label))
        if (!option) continue
        select.value = option.value
        select.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
      const candidates = [...document.querySelectorAll('label,button,[role="radio"],[role="option"],span')].filter(visible)
      const target = candidates.find((element) => labels.includes((element.textContent || '').trim()))
      if (!target) return false
      target.setAttribute('data-self-media-visibility', 'true')
      return true
    })()\`)
    if (visibilityApplied && await js("Boolean(document.querySelector('[data-self-media-visibility]'))")) {
      await click('[data-self-media-visibility="true"]', { label: 'set publication visibility' })
      await wait(1)
    } else if (${JSON.stringify(variant.visibility)} === 'private') {
      throw new Error('无法确认平台的私密可见性控件，已停止在发布页，未点击发布。')
    }
    const info = await pageInfo()
    await captureScreenshot()
    result({ state: 'preview_ready', taskSpaceId: task.id, preview: {
      url: info.url || publishUrl, pageTitle: info.title || '', preparedTitle: filled.titleReadback || titleValue,
      preparedBody: filled.bodyReadback || bodyValue, mediaCount: files.length, capturedAt: new Date().toISOString()
    } })
    await handOffTaskSpace(task.id)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: /user is controlling|inactive|not assigned/i.test(message) ? 'user_control' : 'page_shape_unknown', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

function buildWechatOfficialAccountSubmitScript(input: BrowserPublicationInput & { taskSpaceId: number }): string {
  return `
const task = (await takeOverTaskSpace(${input.taskSpaceId}), { id: ${input.taskSpaceId} })
const result = (value) => cliLog(${JSON.stringify(marker)} + JSON.stringify(value))
try {
  await ensureRealTab()
  const gates = await js(String.raw\`(() => ({
    coverReady: (document.querySelector('.js_appmsg_thumb_new')?.style.backgroundImage || '').includes('mmbiz'),
    author: document.querySelector('#author')?.value || '',
    title: document.querySelector('#title')?.value || '',
    imageReady: Boolean(document.querySelector('.ProseMirror img[src*=mmbiz]'))
  }))()\`)
  if (!gates.coverReady || !gates.imageReady) throw new Error('公众号草稿 G1 未通过：正文图片或封面缺失，未点击保存。')
  if ([...gates.author].length > 8) throw new Error('公众号草稿 G2 未通过：作者超过 8 个字，未点击保存。')
  const marked = await js(String.raw\`(() => {
    const visible = (element) => element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
    const target = [...document.querySelectorAll('button,[role="button"]')]
      .find((element) => visible(element) && !element.disabled && (element.textContent || '').trim() === '保存为草稿')
    if (!target) return false
    target.setAttribute('data-self-media-final-save-draft', 'true')
    return true
  })()\`)
  if (!marked) {
    result({ state: 'needs_user', taskSpaceId: task.id, code: 'save_draft_control_missing', message: '没有找到公众号“保存为草稿”按钮，请检查页面提示。' })
    await handOffTaskSpace(task.id)
  } else {
    await click('[data-self-media-final-save-draft="true"]', { label: 'save official account draft' })
    let verification = null
    for (let attempt = 0; attempt < 25; attempt += 1) {
      verification = await js(String.raw\`(() => {
        const toast = [...document.querySelectorAll('.weui-desktop-toast__content,[class*=toast]')]
          .find((element) => element.getBoundingClientRect().width > 0)?.textContent?.trim().slice(0, 120) || ''
        const match = location.href.match(/[?&]appmsgid=([\\w-]+)/)
        const saved = Boolean(match) || (!location.href.includes('isNew=1') && location.href.includes('appmsg_edit'))
        return { saved, appmsgid: match?.[1] || null, url: location.href, toast }
      })()\`)
      if (verification.saved || /不能|失败|为空|图片不能为空/.test(verification.toast)) break
      await wait(1)
    }
    await captureScreenshot()
    if (verification?.saved) {
      result({ state: 'draft_saved', taskSpaceId: task.id, receipt: {
        externalId: verification.appmsgid, externalUrl: verification.url, platformState: 'draft_saved', verifiedAt: new Date().toISOString()
      } })
    } else if (verification && /不能|失败|为空|图片不能为空/.test(verification.toast)) {
      result({ state: 'needs_user', taskSpaceId: task.id, code: 'wechat_draft_rejected', message: '公众号拒绝保存草稿：' + verification.toast })
      await handOffTaskSpace(task.id)
    } else {
      result({ state: 'submission_unknown', taskSpaceId: task.id, code: 'wechat_draft_not_verifiable',
        message: '已点击保存为草稿，但 URL 未返回 appmsgid。系统不会重试，请在当前页面人工核对。' })
      await handOffTaskSpace(task.id)
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'submission_unknown', taskSpaceId: task.id,
    code: /user is controlling|inactive|not assigned/i.test(message) ? 'user_control' : 'wechat_draft_error', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

export function buildSubmitScript(input: BrowserPublicationInput & { taskSpaceId: number }): string {
  if (input.variant.platform === "wechat_official_account") return buildWechatOfficialAccountSubmitScript(input);
  const finalLabels: Record<PublishingPlatform, string[]> = {
    xiaohongshu: ["发布", "立即发布", "确认发布"],
    douyin: ["发布", "立即发布", "确认发布"],
    wechat_channels: ["发表", "立即发表", "确认发表", "发布"],
    wechat_official_account: ["保存为草稿"],
    bilibili: ["投稿", "立即投稿", "确认投稿", "发布"]
  };
  return `
const task = (await takeOverTaskSpace(${input.taskSpaceId}), { id: ${input.taskSpaceId} })
const platform = ${JSON.stringify(input.variant.platform)}
const finalLabels = ${JSON.stringify(finalLabels[input.variant.platform])}
const result = (value) => cliLog(${JSON.stringify(marker)} + JSON.stringify(value))
try {
  await ensureRealTab()
  const challenge = await js(${JSON.stringify(challengeExpression())})
  if (challenge) {
    result({ state: 'needs_user', taskSpaceId: task.id, code: challenge.code, message: challenge.message })
    await handOffTaskSpace(task.id)
  } else {
    const marked = await js(String.raw\`(() => {
      const candidates = [...document.querySelectorAll('button,[role="button"]')].filter((element) => {
        const text = (element.textContent || '').replace(/\\s+/g, '').trim()
        const disabled = element.disabled || element.getAttribute('aria-disabled') === 'true'
        const visible = element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
        return visible && !disabled && finalLabels.includes(text)
      })
      const target = candidates.at(-1)
      if (!target) return false
      target.setAttribute('data-self-media-final-submit', 'true')
      return true
    })()\`)
    if (!marked) {
      result({ state: 'needs_user', taskSpaceId: task.id, code: 'publish_control_missing', message: '没有找到可用的最终发布按钮，请检查平台校验提示。' })
      await handOffTaskSpace(task.id)
    } else {
      await click('[data-self-media-final-submit="true"]', { label: 'confirm final publish' })
      await wait(7)
      const verification = await js(String.raw\`(() => {
        const platformName = \${JSON.stringify(platform)}
        const text = (document.body?.innerText || '').slice(0, 16000)
        const links = [...document.querySelectorAll('a[href]')].map((a) => a.href)
        const externalUrl = links.find((href) => {
          if (platformName === 'xiaohongshu') return /xiaohongshu\\.com\\/(explore|discovery)\\//.test(href)
          if (platformName === 'douyin') return /douyin\\.com\\/(video|note)\\//.test(href)
          if (platformName === 'bilibili') return /bilibili\\.com\\/video\\/BV/.test(href)
          if (platformName === 'wechat_channels') return /weixin\\.qq\\.com\\/sph\\//.test(href)
          return false
        }) || null
        const success = /发布成功|发表成功|投稿成功|提交成功|审核中|已提交审核|稿件审核中|作品已发布|发布完成/.test(text)
          || /content\\/(manage|publish)/.test(location.pathname) && !document.querySelector('[data-self-media-final-submit="true"]')
        return { success, externalUrl, text: text.slice(0, 1000), url: location.href }
      })()\`)
      if (verification.success) {
        const externalId = verification.externalUrl?.match(/\\/(?:explore|discovery|video|note|sph)\\/([^?]+)/)?.[1] || null
        result({ state: 'published', taskSpaceId: task.id, receipt: {
          externalId, externalUrl: verification.externalUrl, platformState: /审核/.test(verification.text) ? 'reviewing' : 'submitted', verifiedAt: new Date().toISOString()
        } })
      } else {
        result({ state: 'submission_unknown', taskSpaceId: task.id, code: 'result_not_verifiable',
          message: '已经点击发布，但平台没有返回可验证结果。任务不会自动重试，请在当前页面或账号主页确认。' })
        await handOffTaskSpace(task.id)
      }
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'submission_unknown', taskSpaceId: task.id,
    code: /user is controlling|inactive|not assigned/i.test(message) ? 'user_control' : 'submit_error',
    message: /user is controlling|inactive|not assigned/i.test(message) ? message : '提交过程中出现异常，无法判断是否已发布。系统不会自动重试。' })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

function draftScriptPreamble(input: BrowserPublicationInput): string {
  return `
const task = (await takeOverTaskSpace(${input.taskSpaceId}), { id: ${input.taskSpaceId} })
const result = (value) => cliLog(${JSON.stringify(marker)} + JSON.stringify(value))
const findRef = (tree, labels) => {
  const lines = tree.split('\\n')
  for (let index = 0; index < lines.length; index += 1) {
    if (!labels.some((label) => lines[index].includes('text "' + label + '"'))) continue
    for (let parent = index - 1; parent >= Math.max(0, index - 4); parent -= 1) {
      const match = lines[parent].match(/ref=(\\d+)/)
      if (match) return match[1]
    }
  }
  return null
}
`;
}

function buildXiaohongshuDraftScript(input: BrowserPublicationInput): string {
  return `${draftScriptPreamble(input)}
try {
  await ensureRealTab()
  let tree = await snapshotText()
  const ref = findRef(tree, ['暂存离开'])
  if (!ref) throw new Error('小红书没有找到“暂存离开”。')
  await click('@' + ref, { label: 'save xhs browser draft' })
  await wait(5)
  tree = await snapshotText()
  const saved = tree.includes('保存成功') && tree.includes('草稿箱(') && tree.includes(${JSON.stringify(input.variant.title)})
  if (!saved) throw new Error('小红书没有返回可核验的草稿箱记录。')
  result({ state: 'canceled', taskSpaceId: task.id, draftSaved: true })
  await handOffTaskSpace(task.id)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: 'xhs_draft_error', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

function buildDouyinDraftScript(input: BrowserPublicationInput): string {
  return `${draftScriptPreamble(input)}
try {
  await ensureRealTab()
  await scrollBy(900)
  await wait(0.5)
  let tree = await snapshotText()
  const ref = findRef(tree, ['暂存离开'])
  if (!ref) throw new Error('抖音没有找到“暂存离开”。')
  await click('@' + ref, { label: 'save douyin unfinished work' })
  await wait(8)
  tree = await snapshotText()
  const saved = tree.includes('上次未发布') || tree.includes('是否继续编辑') || tree.includes('继续编辑')
  if (!saved) throw new Error('抖音没有返回“上次未发布的作品”证据。')
  result({ state: 'canceled', taskSpaceId: task.id, draftSaved: true })
  await handOffTaskSpace(task.id)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: 'douyin_draft_error', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

function buildWechatChannelsDraftScript(input: BrowserPublicationInput): string {
  return `${draftScriptPreamble(input)}
try {
  await ensureRealTab()
  let tree = await snapshotText()
  const saveRef = findRef(tree, ['保存草稿'])
  if (!saveRef) throw new Error('视频号没有找到“保存草稿”。')
  await click('@' + saveRef, { label: 'save channels draft' })
  await wait(3)
  tree = await snapshotText()
  const managerRef = findRef(tree, ['内容管理'])
  if (!managerRef) throw new Error('视频号没有找到内容管理入口。')
  await click('@' + managerRef, { label: 'open channels content manager' })
  await wait(1)
  tree = await snapshotText()
  const draftBoxRef = findRef(tree, ['草稿箱'])
  if (!draftBoxRef) throw new Error('视频号没有找到草稿箱入口。')
  await click('@' + draftBoxRef, { label: 'open channels draft box' })
  await wait(1)
  tree = await snapshotText()
  if (tree.includes('将此次编辑保留?')) {
    const confirmRef = findRef(tree, ['保存'])
    if (!confirmRef) throw new Error('视频号没有找到离开页面时的保存确认。')
    await click('@' + confirmRef, { label: 'confirm channels draft preservation' })
    await wait(6)
    tree = await snapshotText()
  }
  const saved = /草稿箱 \\(\\d+\\)/.test(tree) && tree.includes(${JSON.stringify(input.variant.body.trim())})
  if (!saved) throw new Error('视频号草稿箱没有出现当前草稿。')
  result({ state: 'canceled', taskSpaceId: task.id, draftSaved: true })
  await handOffTaskSpace(task.id)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: 'channels_draft_error', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

function buildBilibiliDraftScript(input: BrowserPublicationInput): string {
  return `${draftScriptPreamble(input)}
try {
  await ensureRealTab()
  let tree = await snapshotText()
  const ref = findRef(tree, ['存草稿', '保存草稿', '暂存'])
  if (!ref) throw new Error('B站没有找到草稿保存按钮。')
  await click('@' + ref, { label: 'save bilibili submission draft' })
  await wait(6)
  tree = await snapshotText()
  const saved = /草稿|保存成功|稿件管理/.test(tree)
  if (!saved) throw new Error('B站没有返回可核验的稿件草稿状态。')
  result({ state: 'canceled', taskSpaceId: task.id, draftSaved: true })
  await handOffTaskSpace(task.id)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: 'bilibili_draft_error', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

function buildOfficialAccountCancelScript(input: BrowserPublicationInput): string {
  return `${draftScriptPreamble(input)}
try {
  await ensureRealTab()
  const gates = await js(String.raw\`(() => ({
    cover: (document.querySelector('.js_appmsg_thumb_new')?.style.backgroundImage || '').includes('mmbiz'),
    image: Boolean(document.querySelector('.ProseMirror img[src*=mmbiz]')),
    author: document.querySelector('#author')?.value || ''
  }))()\`)
  if (!gates.cover || !gates.image || [...gates.author].length > 8) throw new Error('公众号 G1/G2 草稿闸未通过。')
  const tree = await snapshotText()
  const ref = findRef(tree, ['保存为草稿'])
  if (!ref) throw new Error('公众号没有找到“保存为草稿”。')
  await click('@' + ref, { label: 'save official account draft' })
  let saved = false
  for (let attempt = 0; attempt < 25; attempt += 1) {
    saved = await js("/[?&]appmsgid=/.test(location.href) || (!location.href.includes('isNew=1') && location.href.includes('appmsg_edit'))")
    if (saved) break
    await wait(1)
  }
  if (!saved) throw new Error('公众号 G3 未通过：URL 没有返回 appmsgid。')
  result({ state: 'canceled', taskSpaceId: task.id, draftSaved: true })
  await handOffTaskSpace(task.id)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  result({ state: /user is controlling|inactive|not assigned/i.test(message) ? 'needs_user' : 'failed', taskSpaceId: task.id,
    code: 'official_account_draft_error', message })
  try { await handOffTaskSpace(task.id) } catch {}
}
`;
}

export function buildCancelScript(input: BrowserPublicationInput): string {
  if (input.taskSpaceId === null) return `${marker}`;
  if (input.variant.platform === "xiaohongshu") return buildXiaohongshuDraftScript(input);
  if (input.variant.platform === "douyin") return buildDouyinDraftScript(input);
  if (input.variant.platform === "wechat_channels") return buildWechatChannelsDraftScript(input);
  if (input.variant.platform === "bilibili") return buildBilibiliDraftScript(input);
  return buildOfficialAccountCancelScript(input);
}

export class EgoBrowserPublisher implements BrowserPublisher {
  constructor(
    private readonly platform: PublishingPlatform,
    private readonly binary = process.env.SELF_MEDIA_EGO_BROWSER_BIN ?? "ego-browser"
  ) {}

  async prepare(input: BrowserPublicationInput): Promise<BrowserPrepareResult> {
    if (input.variant.platform !== this.platform) throw new Error("发布适配器与平台版本不匹配");
    try {
      const processResult = await runEgoScript(this.binary, buildPrepareScript(input), input.variant.contentType === "video" ? 240_000 : 150_000);
      if (processResult.exitCode !== 0) return this.prepareFailure(processResult, input.taskSpaceId);
      return parseMarked<BrowserPrepareResult>(processResult.stdout);
    } catch (error) {
      return this.prepareException(error, input.taskSpaceId);
    }
  }

  async submit(input: BrowserPublicationInput & { taskSpaceId: number }): Promise<BrowserSubmitResult> {
    if (input.variant.platform !== this.platform) throw new Error("发布适配器与平台版本不匹配");
    try {
      const processResult = await runEgoScript(this.binary, buildSubmitScript(input), 120_000);
      if (processResult.exitCode !== 0) return this.submitFailure(processResult, input.taskSpaceId);
      const result = parseMarked<BrowserSubmitResult>(processResult.stdout);
      if (result.state === "published" || result.state === "draft_saved") await this.closeTaskSpace(result.taskSpaceId);
      return result;
    } catch {
      return this.submitException(input.taskSpaceId);
    }
  }

  async cancel(input: BrowserPublicationInput): Promise<BrowserCancelResult> {
    if (input.taskSpaceId === null) return { state: "canceled", taskSpaceId: null, draftSaved: false };
    try {
      const processResult = await runEgoScript(this.binary, buildCancelScript(input), 60_000);
      if (processResult.exitCode !== 0) {
        const failure = this.prepareFailure(processResult, input.taskSpaceId);
        return failure.state === "needs_user" ? failure : {
          state: "failed", taskSpaceId: failure.taskSpaceId, code: failure.code, message: failure.message
        };
      }
      const result = parseMarked<BrowserCancelResult>(processResult.stdout);
      if (result.state === "canceled" && result.taskSpaceId && !result.draftSaved) await this.closeTaskSpace(result.taskSpaceId);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { state: "failed", taskSpaceId: input.taskSpaceId, code: "cancel_error", message };
    }
  }

  private async closeTaskSpace(taskSpaceId: number): Promise<void> {
    await runEgoScript(this.binary, `const value = await completeTaskSpace(${taskSpaceId}, { keep: false })\ncliLog(JSON.stringify(value))\n`, 30_000);
  }

  private prepareFailure(result: ProcessResult, taskSpaceId: number | null):
    | { state: "needs_user"; taskSpaceId: number | null; code: string; message: string }
    | { state: "failed"; taskSpaceId: number | null; code: string; message: string } {
    const message = result.stderr.trim() || result.stdout.trim() || `ego-browser 退出码 ${result.exitCode}`;
    if (/user is controlling|user-owned|inactive|not assigned/i.test(message)) {
      return { state: "needs_user", taskSpaceId, code: "user_control", message: "浏览器当前由用户控制。完成检查后点击恢复。" };
    }
    return { state: "failed", taskSpaceId, code: "browser_process_error", message };
  }

  private submitFailure(result: ProcessResult, taskSpaceId: number): BrowserSubmitResult {
    const message = result.stderr.trim() || result.stdout.trim() || `ego-browser 退出码 ${result.exitCode}`;
    if (/user is controlling|user-owned|inactive|not assigned/i.test(message)) {
      return { state: "needs_user", taskSpaceId, code: "user_control", message: "浏览器当前由用户控制。完成检查后点击恢复。" };
    }
    return { state: "submission_unknown", taskSpaceId, code: "browser_process_error", message: "提交进程异常，无法确认平台结果，禁止自动重试。" };
  }

  private prepareException(error: unknown, taskSpaceId: number | null): BrowserPrepareResult {
    const message = error instanceof Error ? error.message : String(error);
    return { state: "failed", taskSpaceId, code: "browser_exception", message };
  }

  private submitException(taskSpaceId: number): BrowserSubmitResult {
    return { state: "submission_unknown", taskSpaceId, code: "browser_exception", message: "提交阶段浏览器异常，无法判断是否已发布，禁止自动重试。" };
  }
}

export function createEgoBrowserPublishers(): Record<PublishingPlatform, BrowserPublisher> {
  return {
    xiaohongshu: new EgoBrowserPublisher("xiaohongshu"),
    douyin: new EgoBrowserPublisher("douyin"),
    wechat_channels: new EgoBrowserPublisher("wechat_channels"),
    wechat_official_account: new EgoBrowserPublisher("wechat_official_account"),
    bilibili: new EgoBrowserPublisher("bilibili")
  };
}

export type EgoBrowserPreview = PublicationPreview;
export type EgoBrowserReceipt = PublicationReceipt;
