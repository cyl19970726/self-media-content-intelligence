# Creation and Publishing Workspace v1 Design

## Architecture

The feature is a separate bounded context:

```text
Creation Workspace -> PublishingService -> SQLite publication ledger
                                      -> PublicationWorker
                                      -> BrowserPublisher
                                           |- Xiaohongshu ego-browser adapter
                                           |- Douyin ego-browser adapter
                                           |- WeChat Channels ego-browser adapter
                                           |- Bilibili ego-browser adapter
                                           `- WeChat Official Account one-image draft adapter
```

Research artifacts may be referenced by `sourceRefs`, but creation records own their copy and publication lifecycle.

## Data ownership

- `content_packages`: mutable package metadata and source references.
- `content_variants`: revisioned platform copy and stable local media paths.
- `publication_runs`: frozen target revision, state, TaskSpace, preview, blocker, and receipt.
- `publication_jobs`: idempotent leased prepare/submit/cancel work.
- `publication_events`: append-only audit trail.

The JSON columns are validated with Zod at every repository boundary. Indexed scalar columns support claiming and list views. No cookie, access token, signed URL, or browser storage is persisted.

## State machine

```text
draft -> queued_prepare -> preparing -> preview_ready
preview_ready -> queued_submit -> submitting -> verifying -> published
preview_ready -> queued_submit -> submitting -> draft_saved (Official Account only)
preview_ready -> queued_cancel -> canceled

Any active state -> needs_user | failed
submitting/verifying -> submission_unknown
```

`submission_unknown` is terminal for automation because a blind retry can duplicate a post.

`draft_saved` is a distinct terminal state. It means an Official Account `appmsgid` was verified; it never means the article was published or mass-sent.

## Browser control

- Preparation creates an isolated TaskSpace and inherits the user's login state.
- The executor uploads stable local files, fills copy, reads the page back, captures the current URL/title, and hands the TaskSpace to the user.
- Submission is only built after an explicit HTTP approval containing the frozen variant revision. The executor then takes over that exact TaskSpace, marks the final publish control, clicks it once, and verifies success.
- User control, login challenges, and inactive TaskSpaces become durable `needs_user` states.
- All five platform adapters execute through Ego Browser. The new platforms use the same isolated TaskSpace and inherited login-state model.
- Official Account preparation opens the one-image editor, uploads exactly one image, clears the author field, sets a cover from the body, and checks G1/G2. After explicit approval it clicks only “保存为草稿”; G3 requires `appmsgid` before entering `draft_saved`.

## HTTP API

- `GET/POST /api/v1/content-packages`
- `GET /api/v1/content-packages/:id`
- `POST /api/v1/content-packages/:id/variants`
- `PUT /api/v1/content-variants/:id`
- `GET/POST /api/v1/publications`
- `GET /api/v1/publications/:id`
- `GET /api/v1/publications/:id/events`
- `POST /api/v1/publications/:id/prepare`
- `POST /api/v1/publications/:id/approve`
- `POST /api/v1/publications/:id/cancel`
- `POST /api/v1/publications/:id/resume`

## UI

`/creation` uses the existing Signal Room industrial language. A narrow package rail anchors an asymmetric editor; the platform variant editor and publication gate occupy the wider surface. Destructive or external actions are separated from normal editing and explain their current state.

## Verification

- Unit-test schemas, revision invalidation, approval guard, idempotency, ambiguous submission, and repository persistence.
- Run typecheck, lint, unit tests, and production build.
- Exercise `/creation`, create platform variants, and verify preparation controls in a real browser without making an external publication.
