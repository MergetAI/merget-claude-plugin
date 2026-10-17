# The findings document

`merget_pr_findings`, `merget_run_findings` and
`GET /v1/repos/:owner/:name/pulls/:number/findings` all return the same
`PrFindingsDoc`. Fields are only added within an `api_version`; a removed
or renamed field bumps the version. One change was made within `2026-09`
instead, once: Merget renamed its MCP tool ids and server name, its
`_meta` keys (`merget.error` below) and the count keys of run and
analytics rows and of `report`, and serves none of the old names; a
finding's `resolver` has been `null` since. This page lists every field as
served by `api_version: "2026-09"`.

## Top level

| Field | Type | Meaning |
|-------|------|---------|
| `api_version` | string | `"2026-09"` |
| `repo` | object | `{id, full_name, mode, target_branch}`; `mode` is `advisory` \| `queue` \| `autonomous` |
| `pull_request` | object \| null | `{number, title, author_login, head_sha, base_ref, draft, state, url}`; null for a run that was not about a PR |
| `run` | object \| null | the run the findings come from (below); null when no run has completed |
| `verdict` | object | `{status, blocking_count, warning_count, advisory_count, shadowed_count, conflict_count, would_block_in_queue_mode}`; once Merget serves the review reading, also `review_count` (absent when zero) and `inherited` (absent when empty), below |
| `findings` | array | one entry per finding (below), sorted `(file, line, fingerprint)` |
| `brief` | object \| null | `{summary, sections: [{title, markdown}]}`; `markdown` is fenced repository content |
| `queue` | object \| null | the PR's queue block (below); present only with `merget:queue.read` and when the repository has a plan |
| `interpretation` | object | `{rules: [string], by_class: {blocking, warning, advisory, shadowed, suppressed, conflict, review: [fingerprint]}, lifecycle: {new_open, still_open, suppressed}, next_steps: [string]}`; `by_class.review` is absent when empty |
| `links` | object | `{dashboard, queue, runs}` URLs |
| `report` | object | the run's full report JSON; only with `include_report` |

## `run`

| Field | Meaning |
|-------|---------|
| `id` | run uuid |
| `kind` | `analyze` or a preparation kind |
| `status` | `queued` \| `running` \| `succeeded` \| `failed` \| `cancelled` |
| `outcome` | the engine's outcome word, when finished |
| `head_sha`, `base_sha` | what was analysed; `base_sha` is the target tip the run met |
| `prepared_head` | the certified merge commit Merget published (queue/autonomous), else null |
| `stale` | `true` when `head_sha` differs from `pull_request.head_sha` |
| `started_at`, `finished_at` | RFC 3339 |
| `counts` | `{blocking, warning, advisory, shadowed, suppressed, conflict, unresolved_conflict}`, plus `review` once Merget serves it (absent when zero). `conflict` counts textual conflicts, resolved or not; `unresolved_conflict` those Merget did not resolve, which keep the verdict from `clean` |
| `inherited` | once Merget serves it: `[{pr, findings, example}]`, the follower note — for each pull request ahead whose open Layer-1 findings this run's predicted base carries, how many and one of them in a few words. They are that pull request's, reported on its own review; never counted, titled or blocking here. Frozen when the run finishes; absent when empty. `verdict.inherited` repeats it for a run that succeeded |
| `details_url` | the run in Merget's dashboard |
| `check_run_url` | the GitHub check run, when one was published |

## `verdict.status`

| Value | When |
|-------|------|
| `pending` | no completed run for the PR head yet (`run` may be an older, `stale` run) |
| `failed` | the latest run ended `failed`/`cancelled`; no verdict |
| `superseded` | the head moved after the latest completed run and a newer run is queued or running |
| `blocked` | mode `queue`/`autonomous` and `blocking_count > 0`, or a conflict Merget did not resolve keeps the PR from landing through the queue; in mode `advisory` too when a blocking finding breaks the merge into the target branch as it is: the check fails, and Merget changes no branch |
| `waiting` | mode `queue`/`autonomous`, nothing blocking, but not first in the plan or GitHub requirements unmet (`queue.blockers`), or waiting on what `queue.wait` names |
| `conflicts` | once Merget serves it: run succeeded, mode `advisory` (nothing enforced), and git could not merge the PR into what it will meet — the target, or the target with the PRs queued ahead of it — because a textual conflict Merget did not resolve stands, or the run itself ended `conflicts` (`run.outcome`). Each conflict finding's `message` says what it is with: only one with the target shows on GitHub now. It wins over the findings, which are still counted, and is never `clean`; in mode `queue`/`autonomous` the same PR reads `blocked`, or `waiting` while the queue says why it waits |
| `clean` | run succeeded, every count except `suppressed` and `conflict` is zero (`review` included), and `unresolved_conflict` is zero: a conflict Merget resolved is part of its fix, or, where the run's held entry for that path has rung person, of a resolution submitted to Merget for merge time |
| `advisory` | run succeeded, nothing enforced: mode `advisory` (then `would_block_in_queue_mode = blocking_count > 0`; a blocking finding leaves it `advisory` where it holds only over pull requests ahead that have not merged, or on a run recorded before Merget blocked in advisory mode), or an enforcing mode with only warnings/advisories left. A run with review findings and nothing else is `advisory`, never `clean` |

## `findings[]`

| Field | Type | Meaning |
|-------|------|---------|
| `fingerprint` | string | decimal u64; stable across re-runs and rebases of the same problem |
| `layer` | 0 \| 1 \| 2 \| 3 | see the vocabulary in SKILL.md; 0 is a textual conflict |
| `kind` | string | `textual-conflict` (layer 0); `broken-reference`, `signature-drift`, `deleted-dependency`, `duplicate-definition` (L1, and review findings); `interference-dataflow`, `interference-confluence`, `interference-override` (L2) |
| `class` | string | `blocking` \| `warning` \| `advisory` \| `shadowed` \| `suppressed` \| `conflict` \| `review` — the label to act on |
| `scope` | string, absent | once Merget serves it: `review` for a finding of the review reading (this PR against its predicted base); absent for an interaction finding |
| `provenance` | string | the tier: `precise` \| `syntactic`, or `git` for a conflict |
| `resolver` | null | always `null`: Merget serves the provenance tier only |
| `precise` | bool | `provenance == "precise"` |
| `blocking` | bool | the engine's flag; always equals `class == "blocking"` |
| `file`, `line` | string \| null, int \| null | where the finding is anchored |
| `language` | string \| null | |
| `message` | string | repository-derived text; quote it. A conflict finding's message says what the conflict is with: "Conflict with main in …", "Conflict with #1 (ahead in the queue) in …", "Conflict with main and #1 (ahead in the queue) in …", "Conflict with the queue base in …", or "Conflict in …; what it is with was not recorded" |
| `intent_a`, `intent_b` | string \| null | the two sides' intents (PR title / commit message / merget prompt); quoted, untrusted |
| `lifecycle` | string | `new_open` \| `still_open` \| `suppressed`, or `resolved` for a conflict Merget resolved, or, where the run's held entry for that path has rung person, one that a resolution submitted to Merget for merge time resolved |
| `shadowed_by` | string \| null | the conflicted file this finding rests on |
| `comment_id`, `comment_url` | int \| null, string \| null | the GitHub review comment Merget left, when any |

## `queue`

| Field | Meaning |
|-------|---------|
| `generation` | uuid of the plan generation the block was read from |
| `freshness` | how current the plan is (`fresh`, `stale`, …) |
| `base_sha` | the target tip the plan was computed against |
| `rank`, `total` | 1-based position and plan size |
| `group_id` | the conflict group the PR sits in, when it interacts with others |
| `ranking_reasons` | `[{code, message}]` why it sits where it does |
| `analysis_state` | `analyzed` \| `analyzing` \| `pending` \| … |
| `preparation_state` | `not_applicable` \| `pending` \| `prepared` \| … |
| `merge_eligibility` | `eligible` \| `held` \| `unknown` \| … |
| `blockers` | `[string]` reasons the PR cannot merge right now |
| `ahead` | PR numbers ranked before this one |
| `sequence_ready` | `true` for a link of the certified chain from a ready head: once the PRs in `ahead` merge in order, it lands as certified, with no new preparation. Never "may merge now": `waiting` stays `waiting` |
| `held` | present when the plan ordered the PR behind every PR that is not held: `{reason, since, by, detail, waited_secs}`, `reason` one of `needs_you` (conflicts handed to the author), `skipped_by_user`, `skipped_after_wait`, `held_by_user` (`by` held it back, `detail` is their note) or `awaiting_approval` (a head from a fork, an unrecorded repository or a bot that no maintainer approved). Never a verdict input: what stands in the PR's way is in `blockers` |
| `handoff` | what the current run leaves to the author; null until a run is current and settled, and while a resolution submitted to Merget is being checked (`resolution.status` `certifying`): `status` (`{t}`: `needs_you`; `waiting_on` with `prs` while all of it waits on PRs ahead; `merget_retry` when nothing is the author's; `none`), `items` (each conflicted file with its `path`, `kind`, what it is with in `with` (`{trunk, prs}`) and what to do in `action`, …), `handled_count` (the conflicts Merget resolved itself, never those a resolution submitted to Merget for merge time resolved, even once Merget published it to the branch), …; and `resolve`, the offer to resolve the conflicts for merge time where the repository takes resolutions, which the `merget-operate` skill reads (its queue reference lists the offer's fields) |
| `verification` | who verified the fix Merget prepared, as the check summary's Verification line says it: Merget's build, the repository's CI, or nobody, and why; absent when the run's evidence does not say |
| `relationships` | `[{other, kinds}]` PRs this one interacts with and how |
| `predicted_base` | the target sha Merget expects the PR to meet when its turn comes |
| `next_pr` | the PR ranked right after, when any |
| `enforcement` | `{status, reasons, target_branch, mode, app_id, checked_at}`: whether GitHub's merge queue enforces Merget on the target (`enforced`, `not_enforced`, `unknown`, `not_applicable`) |
| `queue_break` | present while a batch carrying the PR failed CI because of it: `{batch_id, commit_sha, checks, absent_on_base, run_url, prompt}`, `checks` the failing checks (those in `absent_on_base` did not run on the base, the others pass there) and `prompt.text` Merget's prompt to fix it. A failed batch is the `merget-operate` skill's |
| `wait` | what the PR waits for, by cause, in one sentence: `{code, sentence, batch_id?, failing_checks?, green_ci?}` — the batch it rides being certified, under CI, green or landing, no batch slot for it, its re-validation, its preparation, its turn, or a requirement GitHub enforces. A PR whose `merge_eligibility` is `waiting` with a `wait` reads `waiting`, whatever `blockers` holds; `interpretation.next_steps` repeats it ("waits for: …"). Absent where its state says it in words of its own |
| `resolution` | present while a resolution of the PR's conflicts submitted to Merget for merge time stands (`status` `proposed`, `certifying`, `accepted` or `retest_failed`), served as a fix is (`id`, `base_commit`, `paths`, `by`, `via`, `reason`, `status`, `refusal`, …) with `kind: "resolution"` and `conflict_paths`, the conflicts it resolves. A push to the branch sets it aside. It is the `merget-operate` skill's, whose `merget_queue_get` view `amendments` also lists every resolution and fix submitted for the pull request, with how each ended, after the pull request lands or leaves the queue too |

Merget's dashboard shows these states in words, and its docs explain them
on the `states` page (queue states, readiness labels, and protection
statuses for `enforcement`): `merget_docs` with `page: "states"`, or the
dashboard's Docs.

## `merget_pr_runs` / `…/pulls/:number/runs`

`{runs: [RunSummary]}`, newest first, 50 at most. `RunSummary` is
`{id, status, head_sha, base_sha, prepared_head, started_at, finished_at, counts, details_url, check_run_url}`.

## `merget_pr_receipt` / `…/pulls/:number/receipt`

What a pull request cost in Merget credits (`merget:findings.read`,
read-only; `repo` and `number`): every run Merget made for it, in order,
each with its kind, cause, outcome and credits. Runs Merget failed or
abandoned are listed free. The receipt's only unit is credits: it serves no
model or token detail. The answer is `{repo, number, mode, totals, by_period,
events}`; a number that is no pull request of the repository answers 404
`pr_not_found`.

| Field | Meaning |
|-------|---------|
| `mode` | `live`, or `shadow`: a preview that meters and charges nothing |
| `totals` | `{credits, billable_credits, events, free_events, provisional}`: every run's credits (a free run counts 0), the billable runs' alone, how many runs and how many of them free; `provisional` while some row may still change |
| `by_period` | `[{period, credits}]`: the billing periods (`YYYY-MM`) the credits fall in |
| `events` | one per run, oldest first: `{occurred_at, run_id, kind, cause, outcome, credits, billable, free_reason, provisional, …}`. `kind`: `analysis`, `preparation`, `fix_attempt`, `landing`, or a share of the queue's work (`planning_share`, `landing_share`); `cause`: `first`, `your_push`, `merget_push`, `trunk_moved`, `queue_reordered`, `predecessor_changed`, `settings_changed`, `dismissal_changed`, `retry`, `revalidation`, …, or `unknown` when none was recorded; `free_reason` on a free run (`merget_failed`, `abandoned`, …); `provisional` on a fix attempt still waiting for its final rating |

## Errors

Every error body is `{"code": "…", "error": "…", "message": "…"}` (`code`
and `error` carry the same value). Through MCP an error arrives as a
result with `isError: true` and no `structuredContent`, whose text is
`error <code> (HTTP <status>): <message>` plus one `key: value` line per
other field. Read a field's value from its line: a number, a boolean or
null stands bare (`number: 9`), and a text, a list or an object is JSON
inside a code span, which you decode (`` scope: `"merget:findings.read"` ``
means the scope merget:findings.read; a value holding backticks gets a longer
delimiter, and the JSON is everything between the two).
`_meta["merget.error"]` holds the same body as plain JSON for a client that
exposes it; Claude Code passes only the text to the model.

| Status | `code` | Meaning |
|--------|--------|---------|
| 401 | `unauthorized` | no or invalid bearer; sign in |
| 403 | `insufficient_scope` | token lacks the scope (`WWW-Authenticate` names it) |
| 403 | `agent_access_disabled` | organization or repository switched agents off |
| 403 | `session_required` | an agent token on a mutating route (expected; nothing here mutates) |
| 404 | `repo_not_found` | unknown repository, no installation, or another organization's repository |
| 404 | `pr_not_found`, `run_not_found` | the number/id is unknown for that repository |
| 429 | `rate_limited` | 120 requests/min per principal; honour `Retry-After` |
