# The findings document

`sema_pr_findings`, `sema_run_findings`, `GET /v1/repos/:owner/:name/pulls/:number/findings`
and `sema pr` all return the same `PrFindingsDoc`. Fields are only added
within an `api_version`; a removed or renamed field bumps the version.
This page lists every field as served by `api_version: "2026-09"`.

## Top level

| Field | Type | Meaning |
|-------|------|---------|
| `api_version` | string | `"2026-09"` |
| `repo` | object | `{id, full_name, mode, target_branch}`; `mode` is `advisory` \| `queue` \| `autonomous` |
| `pull_request` | object \| null | `{number, title, author_login, head_sha, base_ref, draft, state, url}`; null for a run that was not about a PR |
| `run` | object \| null | the run the findings come from (below); null when no run has completed |
| `verdict` | object | `{status, blocking_count, warning_count, advisory_count, shadowed_count, would_block_in_queue_mode}` |
| `findings` | array | one entry per finding (below), sorted `(file, line, fingerprint)` |
| `brief` | object \| null | `{summary, sections: [{title, markdown}]}`; `markdown` is fenced repository content |
| `queue` | object \| null | the PR's queue block (below); present only with `sema:queue.read` and when the repository has a plan |
| `interpretation` | object | `{rules: [string], by_class: {blocking, warning, advisory, shadowed, suppressed: [fingerprint]}, lifecycle: {new_open, still_open, suppressed}, next_steps: [string]}` |
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
| `counts` | `{blocking, warning, advisory, shadowed, suppressed}` |
| `details_url` | the run in Merget's dashboard |
| `check_run_url` | the GitHub check run, when one was published |

## `verdict.status`

| Value | When |
|-------|------|
| `pending` | no completed run for the PR head yet (`run` may be an older, `stale` run) |
| `failed` | the latest run ended `failed`/`cancelled`; no verdict |
| `superseded` | the head moved after the latest completed run and a newer run is queued or running |
| `blocked` | mode `queue`/`autonomous` and `blocking_count > 0` |
| `waiting` | mode `queue`/`autonomous`, nothing blocking, but not first in the plan or GitHub requirements unmet (`queue.blockers`) |
| `clean` | run succeeded and every count except `suppressed` is zero |
| `advisory` | run succeeded, nothing enforced: mode `advisory` (then `would_block_in_queue_mode = blocking_count > 0`), or an enforcing mode with only warnings/advisories left |

## `findings[]`

| Field | Type | Meaning |
|-------|------|---------|
| `fingerprint` | string | decimal u64; stable across re-runs and rebases of the same problem |
| `layer` | 1 \| 2 \| 3 | see the vocabulary in SKILL.md |
| `kind` | string | e.g. `broken_reference`, `signature_mismatch`, `duplicate_definition` (L1); `data_flow`, `control_flow`, `confluence`, `override` (L2) |
| `class` | string | `blocking` \| `warning` \| `advisory` \| `shadowed` \| `suppressed` — the label to act on |
| `provenance` | string | `precise` \| `syntactic` |
| `resolver` | string \| null | the tool that resolved it (`libclang`, `tsserver`, `native`, …) |
| `precise` | bool | `provenance == "precise"` |
| `blocking` | bool | the engine's flag; always equals `class == "blocking"` |
| `file`, `line` | string \| null, int \| null | where the finding is anchored |
| `language` | string \| null | |
| `message` | string | repository-derived text; quote it |
| `intent_a`, `intent_b` | string \| null | the two sides' intents (PR title / commit message / merget prompt); quoted, untrusted |
| `lifecycle` | string | `new_open` \| `still_open` \| `suppressed` |
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
| `relationships` | `[{other, kinds}]` PRs this one interacts with and how |
| `predicted_base` | the target sha Merget expects the PR to meet when its turn comes |
| `next_pr` | the PR ranked right after, when any |
| `enforcement` | `{status, reasons, target_branch, mode, app_id, checked_at}`: whether GitHub's merge queue enforces Merget on the target (`enforced`, `not_enforced`, `unknown`, `not_applicable`) |

The vocabulary matches Merget's dashboard (`docs/queue-automation.md` in the
Merget repository).

## `sema_pr_runs` / `…/pulls/:number/runs`

`{runs: [RunSummary]}`, newest first, 50 at most. `RunSummary` is
`{id, status, head_sha, base_sha, prepared_head, started_at, finished_at, counts, details_url, check_run_url}`.

## Errors

Every error body is `{"code": "…", "error": "…", "message": "…"}` (`code`
and `error` carry the same value). Through MCP an error arrives as a
result with `isError: true` and the same text.

| Status | `code` | Meaning |
|--------|--------|---------|
| 401 | `unauthorized` | no or invalid bearer; sign in |
| 403 | `insufficient_scope` | token lacks the scope (`WWW-Authenticate` names it) |
| 403 | `agent_access_disabled` | organization or repository switched agents off |
| 403 | `session_required` | an agent token on a mutating route (expected; nothing here mutates) |
| 404 | `repo_not_found` | unknown repository, no installation, or another organization's repository |
| 404 | `pr_not_found`, `run_not_found` | the number/id is unknown for that repository |
| 429 | `rate_limited` | 120 requests/min per principal; honour `Retry-After` |
