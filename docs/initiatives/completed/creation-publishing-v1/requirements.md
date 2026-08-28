# Creation and Publishing Workspace v1 Requirements

## Scope

Add a local-first Creation Workspace that turns an approved platform variant into a safely supervised Xiaohongshu, Douyin, WeChat Channels, Bilibili, or WeChat Official Account browser publication. Research remains read-only evidence and is never mutated by publishing.

## User stories

1. As an operator, I can create a reusable content package and independent variants for all five supported platforms.
2. As an operator, I can ask the system to fill the authenticated platform form without publishing it.
3. As an operator, I can inspect the live platform preview and explicitly approve the frozen revision.
4. As an operator, I can see durable status, blockers, attempts, browser handoffs, and the final receipt.
5. As an operator, I can cancel a prepared publication without an accidental submit.

## Acceptance criteria

1. When a package or variant is created, the system shall validate and persist it in SQLite with a stable UUID and revision.
2. When preparation is requested, the system shall enqueue an idempotent leased job rather than hold the HTTP request open.
3. While preparing, the platform executor shall reuse the user's authenticated ego-browser state in an isolated TaskSpace.
4. When the form is ready, the executor shall hand control to the user before any final publish action.
5. While a run is awaiting approval, when the variant changes, the system shall invalidate the previous approval and preview.
6. When the user approves, the system shall require the exact prepared revision before enqueueing submission.
7. When submission succeeds, the system shall persist the public URL or platform receipt when available.
8. When submission outcome is ambiguous, the system shall enter `submission_unknown` and shall not retry automatically.
9. When login, captcha, platform warning, or user control blocks automation, the system shall enter `needs_user` with a durable message and TaskSpace reference.
10. When the user cancels before submission, the system shall never click the publish control and shall attempt platform draft preservation where supported.
11. The UI shall expose package creation, platform variants, validation feedback, preparation, approval, cancellation, and event history.
12. Existing analysis and creator-research routes, records, and workers shall remain compatible.
13. When a WeChat Official Account variant is created, the system shall require exactly one image and treat it as a one-image article.
14. Before saving an Official Account draft, the executor shall verify the body image, cover image, and author length gates.
15. When the Official Account returns an `appmsgid`, the system shall enter `draft_saved` and shall never claim the article was published.
16. WeChat Channels and Bilibili v1 variants shall require exactly one video.

## Non-goals

- Unattended bulk publishing or account rotation.
- Credential or cookie storage outside ego-browser.
- Official Douyin OpenAPI integration.
- Automatic Official Account mass-send or final publication.
- Post-publication metrics collection.
- Claiming publication success without verifiable platform evidence.
