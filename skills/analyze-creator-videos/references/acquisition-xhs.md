# Xiaohongshu acquisition

Use `$ego-browser` for Xiaohongshu. Prefer the user's authenticated `hhh-01` session. Do not introduce Chrome or Google-browser scraping as a fallback.

## Collection sequence

1. Initialize `collection-inventory.json` with `scripts/init-collection.mjs`.
2. Create or reuse one ego-browser task space for the creator-analysis goal.
3. Open the creator profile and verify creator identity before collecting posts.
4. Save a sanitized `profile-observation.json`; ingest it with `scripts/ingest-profile-observation.mjs`.
5. Capture one bounded profile-grid observation per scroll round. Save it as `crawl-round-<N>.json` and ingest with `scripts/ingest-crawl-round.mjs`.
6. Continue until the inventory reports three zero-growth rounds, an explicit end marker, or a declared limit. A timeout is not convergence.
7. Open individual posts only after the lightweight inventory is frozen. Save and ingest one `detail-observation.json` per post.
8. Select high/median/average/low deep samples before downloading media.
9. Reconcile existing local media, download only missing selected files, and run `scripts/verify-media.mjs` before reconstruction.
10. Build and validate `collection-status.json`.

## Browser round contract

Run browser operations as ego-browser heredocs; do not save browser-control JavaScript as a file. Reuse the same TaskSpace ID across rounds. A round must emit only sanitized fields—never cookies, request headers, local profiles, or signed media URLs.

Use this browser-side extraction shape:

```js
const task = await useOrCreateTaskSpace('collect creator <stable-name>')
await openOrReuseTab('<creator-profile-url>', { wait: true, timeout: 30 })

const round = await js(String.raw`(() => {
  const clean = value => typeof value === 'string' ? value.trim() : null
  const noteId = href => (href || '').match(/\/(?:explore|discovery\/item)\/([a-f0-9]{24})/i)?.[1] || null
  const anchors = [...document.querySelectorAll('a[href*="/explore/"],a[href*="/discovery/item/"]')]
  const items = []
  const seen = new Set()
  for (const anchor of anchors) {
    const id = noteId(anchor.href)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const card = anchor.closest('section,article,li,[class*="note"],[class*="card"]') || anchor
    const text = clean(card.innerText) || ''
    const titleNode = card.querySelector('[class*="title"],h1,h2,h3')
    const image = card.querySelector('img')
    items.push({
      id,
      sourceUrl: anchor.href.split('?')[0],
      title: clean(titleNode?.textContent) || clean(image?.alt),
      mediaType: /视频|播放/.test(text) ? 'video' : 'unknown',
      likes: clean(card.querySelector('[class*="like"],[class*="count"]')?.textContent),
      publishedLabel: null,
      cover: clean(image?.src)
    })
  }
  const body = document.body?.innerText || ''
  return {
    items,
    needsUser: items.length === 0 && /登录|验证码|安全验证/.test(body),
    explicitEnd: /没有更多|到底了/.test(body),
    url: location.href,
    scrollY,
    pageHeight: document.documentElement.scrollHeight
  }
})()`)

cliLog(JSON.stringify({
  schemaVersion: '1.0',
  round: <round-number>,
  capturedAt: new Date().toISOString(),
  strategy: 'visible_dom',
  artifactRef: '<sanitized-snapshot-ref-or-null>',
  scroll: { y: round.scrollY, pageHeight: round.pageHeight },
  page: { url: round.url, explicitEnd: round.explicitEnd, needsUser: round.needsUser, error: null },
  items: round.items
}, null, 2))
```

After ingesting the round, scroll by one bounded viewport, wait for the page to settle, and repeat. If the round reports `needsUser`, hand off the TaskSpace and stop. If it reports no items without login evidence, save the round as a retryable extraction failure rather than declaring the profile empty.

Treat DOM media-type detection as a candidate, not proof. Resolve `video` versus `image` on the detail page. Prefer visible text plus sanitized structured-state evidence when both exist.

## Control and safety

- Reuse the same task space across rounds.
- Use a conservative research cadence: no concurrent detail-page loads, no rapid refresh loops, and no full-corpus deep opening when the comparison/deep set is enough.
- Prefer a natural read sequence (open one note, allow it to render, inspect the requested evidence, then return or continue). Insert bounded pauses between notes and keep each batch small.
- Treat rate-limit messages, login challenges, CAPTCHA, empty shells, or unusual redirects as stop signals. Never spoof fingerprints, rotate identities, bypass challenges, or retry aggressively.
- Keep the acquisition proportional: profile-grid metrics for the full corpus; detail pages and comments for the comparison/deep set; media only for selected videos.
- If login, CAPTCHA, or manual intervention is required, hand control to the user and stop until they explicitly return control.
- If the user takes control unexpectedly, do not retry or seize control.
- Never read cookies, passwords, local browser profiles, or session stores.
- Never expose authenticated or signed URLs in public output.
- Mark unavailable fields `null` with a reason; do not coerce them to zero.

## Coverage record

Write `collection-status.json` with creator identity confirmation, start/end timestamps, visible and collected counts, video/non-video count, duplicates, failed detail pages, stopping condition, incomplete fields, and whether media download was limited to the deep set.
