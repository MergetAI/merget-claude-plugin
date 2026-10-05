# Operating tools: arguments and answers

Each tool is `sema_<name>` on the `merget` MCP server
(`mcp__plugin_merget_merget__sema_<name>` in Claude Code through this
plugin). A success answers markdown for you in `content[0].text` and the
document itself in `structuredContent`; a long document's text is cut at
about 12,000 characters with a line pointing at `structuredContent`. A
refusal is a result with `isError: true` whose text is
`error <code> (HTTP <status>): <message>` plus one `key: value` line per
detail; the same body is in `_meta["sema.error"]`. Every call is recorded in
the organization's agent usage (Settings › Agents), a secret's value as
`[redacted]`.

Common arguments:

- `org` — an organization's slug. Optional when this agent was approved for one organization or the user belongs to exactly one; otherwise 400 `invalid_argument` with `orgs`.
- `repo` — `owner/name` as GitHub names it. Unknown, hidden from the user's GitHub account and another organization's repositories all answer 404 `repo_not_found`. A repository's agent access must be on: `findings` reads only, `findings_and_graph` also changes.
- `cursor` — the previous page's `next_cursor`. `limit` — the page size.
- `from`, `to` — RFC 3339, or `YYYY-MM-DD` (UTC midnight).

Deadlines: 20 s; 30 s for `sema_status`; a minute for the tools that read
GitHub live (`sema_repo_settings_get`, `sema_repo_update`,
`sema_queue_action`, `sema_installation_sync`). A write that answers
`timeout` may still have happened: read the state before repeating it.

| Tool | Read-only | Destructive | Idempotent |
|------|-----------|-------------|------------|
| `sema_status`, `sema_repos_list`, `sema_repo_settings_get`, `sema_queues_overview`, `sema_queue_get`, `sema_runs_list`, `sema_run_get`, `sema_analytics`, `sema_org_get`, `sema_docs` | yes | no | yes |
| `sema_repo_update`, `sema_installation_sync`, `sema_secrets` | no | yes | yes |
| `sema_queue_action` | no | yes | no |

`sema_status` is described in the `merget-setup` skill. No tool takes an
organization owner's step — connecting GitHub, pausing and resuming merges,
the organization's name, budget and members, organization-wide secrets,
turning strict protection off: an agent never acts as an owner (SKILL.md,
"Human-only").

## `sema_repos_list` — `sema:org.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `org` | slug | |
| `enabled` | boolean | only enabled (`true`) or disabled (`false`) repositories |
| `q` | string | part of the repository name |
| `installation` | integer | one GitHub App installation's repositories |

Answer: `{items, next_cursor, policy_schema}`; each item `{id, full_name, default_branch, private, enabled, mode, target_branch, queue_label, agent_access, policy, paused_at, paused_by, pause_reason, viewer_permission, …}`. `viewer_permission` is `{pull, triage, push, maintain, admin}` (booleans) or null. A repository whose agent access is `off` is not listed to an agent.

## `sema_repo_settings_get` — `sema:org.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `repo` | `owner/name` | **required** |

Answer: `{repo, policy, policy_schema, readiness}`. `policy` is the customer view; `policy_schema` → [policy.md](policy.md); `readiness` (each mode's `{ready, needs, recommended}`, the App's permissions, the target branch's protection, the merge methods GitHub allows, `github_read`) → the `merget-setup` skill's tools reference.

## `sema_repo_update` — `sema:repos.write`

| Argument | Type | Meaning |
|----------|------|---------|
| `repo` | `owner/name` | **required** |
| `enabled` | boolean | Merget on or off for the repository |
| `mode` | `advisory` \| `queue` \| `autonomous` | queue and autonomous need the App's Contents: write (409 `permission_missing`) |
| `target_branch` | string \| null | the branch Merget queues into; null = the default branch |
| `queue_label` | string (1–100) | the repository's queue label |
| `resolution_scope` | `blocking` \| `all_findings` | shortcut for `policy.resolution_scope`; not together with `policy` |
| `policy` | object | a JSON merge patch over the customer view → [policy.md](policy.md) |

Needs maintain or admin on the repository in GitHub (live). Answers the repository document as stored now, with `policy_schema`. An agent sending `agent_access` is refused (403 `session_required`).

## `sema_queues_overview` — `sema:queue.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `org` | slug | |
| `mode` | `advisory` \| `queue` \| `autonomous` | |
| `q` | string | part of the repository name |
| `attention` | boolean | only queues with entries that need attention |
| `in_progress` | boolean | only queues merging right now |
| `include_empty` | boolean | also queues with no open pull request |
| `installation` | integer | |
| `limit` | 1–100 (50) | |
| `cursor` | string | |

Answer: `{items, next_cursor, totals}`; each item has `full_name`, `mode`, `open_pr_count`, `next_pr`, `queue_readiness`, `current_activity`, `attention_count`, `paused`, `freshness`.

## `sema_queue_get` — `sema:queue.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `repo` | `owner/name` | **required** |
| `view` | `plan` \| `relationships` \| `events` \| `merged` | default `plan` |
| `number` | integer | `events`: one pull request's; `relationships`: put this pull request first (not with `group`) |
| `generation` | uuid | the plan generation a page is pinned to |
| `limit` | 1–500 (50) | at most 100 for `plan`, `events`, `merged`; 500 for the nodes of `relationships` |
| `cursor` | string | the next page (the nodes, for `relationships`) |
| `edges_limit`, `edges_cursor` | integer (500), string | `relationships`: the edges' own paging — keep both cursors and send both, until `truncated` clears |
| `group` | string | `relationships`: one landing group (not with `number`) |
| `include` | `code` | `relationships`: each node's symbols and each edge's evidence (much larger pages) |

The plan view → [queue.md](queue.md). A newer plan answers 409 `stale_generation`: start again from the first page.

## `sema_queue_action` — `sema:queue.write`

| Argument | Type | Meaning |
|----------|------|---------|
| `repo` | `owner/name` | **required** |
| `action` | `retry` \| `hold` \| `release` \| `skip_blocked` \| `land` \| `cancel_land` | **required**; there is no `pause` or `resume` (an owner's, in the dashboard) |
| `number` | integer | the pull request (`retry`, `hold`, `release`) |
| `reason` | string (≤ 500) | the note kept on a `hold` |
| `batch_id` | uuid | `land`: the batch (or lane) to land |
| `count` | integer ≥ 1 | `land` in queue mode: how many pull requests of the offer |
| `members` | `[{number, head_sha}]` | `land` in queue mode: the first `count` entries of the offer, in merge order |
| `override` | boolean | `land`: merge anyway over failing CI — irreversible |
| `kind` | `sequence` \| `lane` | `land` / `cancel_land`: the passing lane's request instead of the sequence's |

Every action, its answer and its refusals → [queue.md](queue.md).

## `sema_runs_list` — `sema:org.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `org` | slug | |
| `repo` | `owner/name` | one repository's runs |
| `pr` | integer | one pull request's runs |
| `status` | `queued` \| `running` \| `done` \| `failed` \| `cancelled` | |
| `kind` | `analyze` \| `prepare` \| `plan` \| `land` \| `batch` | |
| `outcome` | string | the engine's outcome word |
| `cohort` | `agent` \| `mixed` \| `bot` \| `none` \| `unclassified` | who wrote the pull request's changes; set, it hides runs with no pull request |
| `from`, `to` | time | |
| `limit` | 1–200 (50) | |
| `cursor` | string | |

Answer: `{items, next_cursor}`, newest first; each item has `id`, `full_name`, `pr_number`, `pr_title`, `kind`, `trigger`, `head_sha`, `status`, `outcome`, `conclusion`, `started_at`, `finished_at`, `error`, ….

## `sema_run_get` — `sema:org.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `org` | slug | |
| `run` | uuid | **required** |
| `include_report` | boolean | also the run's full report JSON |

Answer: `{run, full_name, pr_number, findings, block_reason, …}` — status, outcome, the pull request, findings, LLM usage, the resolvers' tool calls, why it was blocked, the CI wait and the conflicts. `run.policy_snapshot` is the customer policy the run used (Merget-managed values are never shown).

## `sema_analytics` — `sema:org.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `org` | slug | |
| `report` | `rollups` \| `queue` \| `outcomes` \| `flow` \| `activity` \| `waiting` | **required** |
| `repo` | `owner/name` | narrow every report to one repository |
| `from`, `to` | time | the window |
| `all_time` | boolean | the whole history instead of a window |
| `bucket` | `hour` \| `day` \| `week` \| `month` | |
| `cohort` | `agent` \| `mixed` \| `bot` \| `none` \| `unclassified` | splits `queue`, `outcomes` and `flow` |
| `limit` | 1–100 (20) | `activity` |
| `cursor` | string | `activity` |

| `report` | What it is |
|----------|------------|
| `rollups` | runs, outcomes and cost over the window, per repository |
| `queue` | where queued work waits |
| `outcomes` | what Merget caught before it landed |
| `flow` | throughput, time to merge, sizes |
| `activity` | recent runs, paged |
| `waiting` | open pull requests whose latest run is blocked |

Rates come with their denominators, and `observed_from` says where the data starts.

## `sema_org_get` — `sema:org.read`

| Argument | Type | Meaning |
|----------|------|---------|
| `org` | slug | |
| `include_members` | boolean | also the members, as Merget's account service lists them |

Answer: `{org: {display_name, agent_access, agent_scopes, llm_budget_usd, llm_spend_month_usd, llm_budget_month, llm_budget_exhausted, …}, members? | members_error?}`. `agent_scopes` null = every permission. `members` is `{org, seats, members: [{user, username, display_name, role, added_at}]}`, each member's own role in the organization; `members_error` (the account service's refusal, `{code, message}`; `agent_relay_unavailable` or `agent_relay_refused` when Merget could not ask it for this agent) replaces it when that service could not answer, and the settings still come back. Nothing here is changed by a tool: the name, the LLM budget and the members are an owner's, in the dashboard, and the agent switch and cap are the user's.

## `sema_installation_sync` — `sema:repos.write`

`org`, `installation` (one id; omit for every installation, which also needs `sema:org.read`). Answer: `{org, installations: [{installation_id, ok, installation?, repositories?, error?}]}` — the `merget-setup` skill's tools reference.

## `sema_secrets` — `sema:repos.write`

| Argument | Type | Meaning |
|----------|------|---------|
| `action` | `list` \| `set` \| `delete` | **required** |
| `repo` | `owner/name` | **required**: the repository whose secrets these are (maintain on it) |
| `name` | string | `set`, `delete`: an upper-case letter, then up to 63 upper-case letters, digits or underscores (`NPM_TOKEN`); some names are reserved (`PATH`, `HOME`) |
| `value` | string | `set`: one line, at most 8 KB; sent exactly as given and never echoed back |

Answer: `list` → `{items: [{name, scope, created_by, updated_at, …}]}`, the repository's own secrets (`scope: "repo"`) and the organization-wide ones it receives (`scope: "org"`), never a value; `set` → the stored secret's name and when; `delete` → `{deleted, name, scope}`. `set` and `delete` change the repository's own secrets only: the organization-wide ones are an owner's, in the dashboard (Settings › GitHub › Organization secrets), and no tool changes them. A repository's secret overrides an organization one of the same name. The setup step of the repository's validation recipe receives them as environment variables; the build and test commands, Merget's conflict resolution and pull requests from forks never do.

## `sema_docs` — `sema:org.read`

`page` (`^[a-z0-9-]{1,100}$`; omit for the list). Answer: `{page, markdown}` or `{pages}`; 404 `doc_not_found` lists the ids.
