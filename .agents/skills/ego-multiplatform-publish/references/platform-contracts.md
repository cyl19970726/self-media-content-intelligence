# Platform form contracts

These contracts distinguish source content from the controls actually exposed by each creator platform. Optional commercial, campaign, product, and monetization fields stay unset unless the user supplies the required business context.

## Xiaohongshu

- Modes: image note or video note.
- Core fields: media, note title, note body, topics.
- Separate controls: location, visibility, schedule, download/copy permissions.
- Video may require a cover selection; image-note order is meaningful.
- Draft evidence: `暂存离开` succeeds and the title appears under the web creator draft box. Web drafts can be browser-local, so preserve the TaskSpace that owns them.

Do not merge topics into the body before interacting with the topic picker. Count the title with the platform's Chinese/ASCII unit rule.

## Douyin

- Core fields: video, work description, cover.
- Separate controls: topics, location, collection, collaborators, declaration/copyright, visibility, download permission, schedule.
- Reposted content requires its source when the form requests it.
- Draft evidence: the creator center exposes the unfinished work through its `上次未发布` / `继续编辑` entry; do not invent a draft-list URL.

The work description is not a Bilibili-style long title plus intro. Fill only controls that exist in the observed Douyin form.

## WeChat Channels

- Core fields: video, description, short title, cover.
- Separate controls: location, activity, extension link, original declaration, visibility/download and schedule where available.
- Short-title character validation is distinct from the description.
- Draft evidence: save, handle the leave-confirmation modal if shown, then verify the content under `内容管理 → 草稿箱`.

The upload input may be created only after the native file chooser opens. Use the chooser's backend node rather than inserting a synthetic file input.

## Bilibili

- Core fields: video, cover, title, copyright type (`自制` or `转载`), partition, tags, intro.
- Conditional field: repost source for `转载`.
- Separate controls: dynamic text, schedule, subtitle/language, interactive settings, and repost permission when available.
- Partition and at least one tag are required for a complete submission form.
- Draft evidence: click the observed `存草稿` control, then verify the title in `内容管理` / submission drafts. A successful upload alone is not a draft.

Never place dynamic text in the intro or treat the partition as a free-form topic when the live form exposes a picker.

## WeChat Official Account

- Core fields: title, author, rich-text body, cover, digest.
- Separate controls: original declaration, content source URL, comments, collection, and other account capabilities.
- One-image mode is an explicit variant: insert one designed image as the body and set a valid cover; it is not the default representation of all articles.
- Draft evidence gates: a valid cover is present, the author field matches the requested value or accepted fallback, and the save response/URL yields a non-empty `appmsgid`; then verify the item in the platform draft list.

Only use a real Official Account session. A Mini Program console at `mp.weixin.qq.com/wxamp` is not an Official Account publishing surface. Never click `发表` as part of draft creation.
