# Queue actions: the plan, the offer, merge anyway

`sema_queue_action {repo, action, …}` does what the queue page's buttons do,
through the same route bodies, so an agent and a person meet the same checks
and the same refusals. Every action needs `sema:queue.write`, the
repository's agent access at `findings_and_graph`, and the user's GitHub
permission on the repository read live: `push` for every action but `pause`
and `resume`, which need an organization owner with `maintain` (403
`github_permission_required` or `owner_required` otherwise). No action is
idempotent: read the queue again before repeating one.

## Reading the plan first

`sema_queue_get {repo}` (view `plan`) answers the queue as its page reads it:

| Field | Meaning |
|-------|---------|
| `items[]` | the plan's entries in rank order: `number`, `title`, `head_sha`, `rank`, `analysis_state`, `preparation_state`, `merge_eligibility`, `blockers`, `findings`, `checks`, `reviews`, `predicted_base`, `landing`, … |
| `items[].landing` | present while something can land now: `{tier, batch_id?, position?, eta_secs?, bypassed_checks}`. `batch`: in the green batch the plan lands through. `sequence`: ready behind it, landing in a follow-up batch once that passes CI (about `eta_secs` later). `lane`: in the green passing lane. `held`: held back by a person. `position` is the 1-based place in the offer; `bypassed_checks` are failing checks the target does not require, never a gate. |
| `paused` | `{at, by, reason, stops_merges}` or null |
| `current_batch`, `inflight_batches`, `batches`, `passing_lane` | the batches in CI and the live passing lane |
| `land_authorization`, `lane_authorization` | the standing land request (or the last settled within 24 hours): `{id, by, at, state, scope, override, members, landed, remaining, void_reason, finished_at, expires_at}`, or null |
| `override_available` | the one red batch merge anyway could land now: `{batch_id, failed, convicted, verified, members}`, or null |
| `viewer_permission` | the user's GitHub permission on the repository |
| `generation`, `next_cursor` | page with `cursor` and `generation`; a newer plan answers 409 `stale_generation` — read again from the first page |

Other views: `events` (what the queue did, newest first; `number` for one
pull request's), `merged` (what landed), `relationships` (how the pull
requests relate; nodes and edges page separately).

## Actions

| `action` | Arguments | Modes | Answer | Refusals |
|----------|-----------|-------|--------|----------|
| `pause` | `reason` | autonomous | `{paused, in_flight}`; `in_flight` true: a land already running still finishes | 409 `pause_not_applicable` in advisory and queue mode, where a person or GitHub merges |
| `resume` | | any | `{paused: null, in_flight}` | |
| `retry` | `number` | any | `{requested: true, job_id}` — one pull request's analysis and preparation run again | 404 `entry_not_found` (not in the current plan), 409 `merge_in_flight` |
| `hold` | `number`, `reason` (kept as the note) | queue, autonomous | `{held: true, number, head_sha, replanning, behind}` — `behind`: entries prepared again because their base changes; `{held: false, already: true}` when the user's hold already stands | 409 `hold_not_applicable`, `merge_in_flight`, `pr_not_open`; 404 `entry_not_found` |
| `release` | `number` | queue, autonomous | `{released: true, number, replanning}` | 409 `not_held_by_user` (a hold Merget took — the author answers it with a push — or none); 404 `entry_not_found` |
| `skip_blocked` | | queue, autonomous | `{held, landable, left_alone, left_alone_detail, replanning}`; empty `held` with `replanning: false`: nothing needed moving | 409 `skip_not_applicable`, `no_plan`, `nothing_ready` |
| `land` | below | queue, autonomous | `{requested, authorization_id, members, lands_now, lands_later, recut, batch_id, job_id}` | below |
| `cancel_land` | `kind` | any | `{cancelled: true, in_flight}`; the request is voided as cancelled by the user | 404 `land_not_requested` (none active, finished, or already voided) |

A hold keeps a pull request out of every landing — including a standing land
request that covered it, which is voided — until someone releases it or its
author pushes. `skip_blocked` holds only what was observed unable to land and
releases each the first pass it can land again; it leaves alone what is
still being prepared and what a person holds.

## `land`

Confirm with the user first, every time, naming each pull request with its
head, and what lands now and what later.

**Queue mode: "Merge N pull requests".** Send `count` and `members`: the
first `count` entries of the offer, in merge order, each `{number, head_sha}`.
The offer is the plan's items whose `landing.tier` is `batch` or `sequence`,
ordered by `landing.position` — the green batch's members first, then the
ready pull requests behind it. It leaves one standing request that lands
through the batches:

- `count` equal to the green batch's size lands that batch;
- `count` beyond it lands the batch now (`lands_now`) and the rest in follow-up batches as each passes CI (`lands_later`), with no further request;
- `count` below it lands nothing now (`recut: true`): a batch of exactly `count` is cut, tested and landed.

The request is bound to what the user saw. A commit Merget did not publish
on a member, a re-preparation, a reorder, a mode or policy change, a hold, or
24 hours void it, and `land_authorization.void_reason` says which; a commit
Merget published itself, or one landed on the target by someone else, is
followed instead.

**Autonomous mode: "Land it now".** `batch_id`: a green batch GitHub refused
to merge when Merget tried, whole (`count` and `members`, when sent, must be
exactly its members). A batch Merget is still landing on its own needs
nothing.

**The passing lane.** `kind: "lane"` with the lane's `batch_id` (the live
lane when absent), whole.

**Merge anyway.** `override: true`, with `batch_id` or else the one red
batch on offer: lands a batch Merget certified although required CI **failed**
on its commit, by one push onto the target branch. It cannot be undone.
First show the user `override_available` — the checks that failed
(`failed`), the pull request the search blamed (`convicted`, may be null),
and what Merget verified of the members (`built`: built and tested by
Merget's own build or by the repository's CI on the pushed fix; `checked`:
references and interactions only, no build) — and suggest the dashboard's
**Merge anyway** dialog, where the failing checks are in front of them. Land
it yourself only on an explicit yes to that batch.

Refusals, all 409 unless noted:

| `code` | Means | Do |
|--------|-------|----|
| `land_not_applicable` | the mode takes no such request: advisory mode batches nothing, and in autonomous mode Merget lands a green batch or lane itself — "Land it now" is only for one GitHub refused to merge | read the plan again |
| `queue_paused` | an autonomous pause stops merges | ask whether to `resume` first |
| `batch_not_green`, `batch_not_current`, `batch_partly_landed` | the batch is not one a request may take now | read the plan again |
| `land_already_requested` | one request stands already | show it (`land_authorization`); `cancel_land` only if the user asks |
| `sequence_changed` | the offer moved; `offer` is the current one, `[{number, head_sha}]` | show the new offer and ask again — never resend on your own |
| `override_unavailable` | merge anyway cannot be made now; `why` says why (paused, no red batch, the App cannot push past the target's rules) | relay `why` |
| `invalid_count` (422) | `count` below 1, or `members` not listing exactly `count` entries (the `count` and `members` details say which) | re-read the offer and resend; if the offer changed, show it and ask again |

## `cancel_land`

Takes back the standing request (`kind: "lane"` for the passing lane's);
anyone with push may, not only the person who asked. A push already under
way still lands its current batch (`in_flight`); nothing beyond it does.
Confirm first: the user, or a colleague, may be waiting on that landing.
