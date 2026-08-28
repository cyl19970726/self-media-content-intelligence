# Creator Video Concurrency Design

## Architecture

The creator worker is split into two scheduling lanes:

- one serial lane for acquisition, portfolio, detail enrichment, and creator synthesis;
- a bounded video lane with one to three slots, defaulting to three.

SQLite remains the durable queue and sole lease authority. A lane-specific claim query prevents a video slot from taking a serial job and prevents the serial slot from taking a video job.

## Scheduling

`CreatorResearchWorker` owns one serial promise and an array of video-slot promises. Each slot has a stable worker id so heartbeats and lease recovery remain attributable. A timer only fills empty slots; it never creates work above the configured limit.

`SELF_MEDIA_VIDEO_CONCURRENCY` configures the video slot count and is clamped to 1–3. The default is 3.

## Atomic aggregation

Each reconstruction operates only on its own post directory. At terminal application the service discards the run and batch snapshots captured at job start, reloads the latest registered run and batch revision, applies exactly one post outcome, writes the next immutable batch artifact, and advances the run pointer.

The terminal merge contains no asynchronous boundary. In the single service process this makes the latest-read / artifact-write / run-pointer-save sequence a critical section on the JavaScript event loop. SQLite's lease transaction remains responsible for preventing duplicate job ownership. A terminal job cannot be reclaimed; an outcome already reflected by a ready item is treated as idempotent.

Synthesis enqueue uses the content-addressed final batch ref in its unique idempotency key, so only the completion that observes zero pending items can create the downstream transition and duplicate enqueue attempts resolve to the same job.

## Projection

The run schema gains a backward-compatible `videoWork` projection:

- configured concurrency limit;
- active post ids;
- queued count;
- analyzed count;
- failed count.

The service updates this projection from the latest batch at video start and terminal merge. Existing runs receive a default empty projection. Dashboard views show aggregate video state and no longer imply that the singular legacy `worker` field represents the whole concurrent batch.

## Failure and recovery

- Expired video leases remain reclaimable through the existing queue query.
- Ready batch items are checked before execution and skipped rather than rerun.
- Quality warnings stay terminal research evidence under the single-pass policy.
- Only missing/corrupt/infrastructure outcomes remain failed or retryable.
- Service shutdown waits for the serial lane and every active video slot.

## Verification

Tests use delayed video promises completed in a different order from leasing. They assert a maximum of three active reconstructions, preservation of every result in the final batch, one synthesis transition, and compatibility at concurrency one.
