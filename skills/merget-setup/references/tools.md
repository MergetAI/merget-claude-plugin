# Setup tools: arguments and answers

Each tool below is `sema_<name>` on the `merget` MCP server
(`mcp__plugin_merget_merget__sema_<name>` in Claude Code through this
plugin). A success answers markdown for you in `content[0].text` and the
document itself in `structuredContent`. A refusal is a result with
`isError: true` whose text is `error <code> (HTTP <status>): <message>`
followed by one `key: value` line per detail; the same body is in
`_meta["sema.error"]`. The table of codes is in SKILL.md, "When a call is
refused".

`org` is an organization's slug (`^[A-Za-z0-9_.-]{1,100}$`). It may be left
out when this agent was approved for one organization or the user belongs to
exactly one; otherwise the call answers 400 `invalid_argument` with `orgs`
listing them. `repo` is a repository as GitHub names it, `owner/name`.

A call runs under a deadline: 20 s, 30 s for `sema_status`, a minute for the
tools that read GitHub live (`sema_repo_settings_get`, `sema_repo_update`,
`sema_installation_sync`). A write that answers `timeout` may still have
happened: read the state before repeating it.

## `sema_status` — `sema:org.read`, read-only

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `org` | slug | no | read this organization only (403 `not_a_member` when the user is not one) |

```json
{"identity": {"sub": "…", "handle": "octo", "agent": true, "client_id": "dcr_…", "consented_org": "acme"},
 "scopes": ["sema:org.read", "sema:org.write", "sema:repos.write", "offline_access"],
 "orgs": [{"slug": "acme", "role": "owner", "display_name": "Acme", "agent_access": true, "agent_scopes": null,
           "permissions": ["sema:org.read", "sema:org.write", "sema:repos.write"],
           "setup": {"state": "no_installation", "next_step": {"action": "install_github_app", "description": "…", "url": "https://sema.merget.ai/orgs/acme/settings/github"},
                     "counts": {…}, "github": {…}, "access": {…}}}],
 "next_step": {"action": "install_github_app", "description": "…", "url": "…", "org": "acme"}}
```

`consented_org` is the organization this agent was approved for (null: all
the user's). `permissions` is what this token may do in that organization:
its scopes within the owner's cap, empty when agents are off there. States
and actions: [setup-states.md](setup-states.md).

## `sema_github_connect` — `sema:org.write`, owner only

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `org` | slug | no | the organization the installation will join |

Answer: `{org, url, expires_at, next}`. `url` is the GitHub App install
URL for the human, valid 15 minutes; nothing changes until they open it,
and each call mints a new one.

## `sema_installation_sync` — `sema:org.write`

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `org` | slug | no | |
| `installation` | integer | no | one installation id; omit to sync every installation of the organization (that also needs `sema:org.read`) |

Answer: `{org, installations: [{installation_id, ok, installation?, repositories?, error?}]}`,
one row per installation: on success the installation (`account_login`,
`status`, …) and the repositories the human may see (`id`, `full_name`,
`enabled`, `mode`); on failure the error body. One that GitHub does not
answer within 50 s reads `timeout` while the others still answer. Marked
destructive: an installation GitHub no longer has is removed from the
organization (`installation_removed`).

## `sema_repos_list` — `sema:org.read`, read-only

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `org` | slug | no | |
| `enabled` | boolean | no | only enabled (`true`) or disabled (`false`) repositories |
| `q` | string | no | part of the repository name |
| `installation` | integer | no | one installation's repositories |

Answer: `{items, next_cursor, policy_schema}`. Each item is a repository:
`id`, `full_name`, `default_branch`, `private`, `enabled`, `mode`,
`target_branch` (null = the default branch), `queue_label`, `agent_access`
(`off` | `findings` | `findings_and_graph`), `policy` (the customer view),
`paused_at`, `paused_by`, `pause_reason`, `viewer_permission`.
`viewer_permission` is the human's GitHub permission on the repository,
`{pull, triage, push, maintain, admin}` as booleans, or null when Merget has
no current answer; every change re-checks it live. A repository whose agent
access is `off` is not listed to an agent.

## `sema_repo_settings_get` — `sema:org.read`, read-only

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `repo` | `owner/name` | yes | |

Answer: `{repo, policy, policy_schema, readiness}` — the repository document
as above, its customer policy and schema (the `merget-operate` skill), and:

| `readiness` field | Meaning |
|-------------------|---------|
| `modes` | `{advisory, queue, autonomous}`, each `{ready, needs, recommended}`. `needs` is what `sema_repo_update` would refuse that mode without (only ever `contents:write`); `recommended` is `[{permission, reason}]` (`administration:write`, `actions:write`), never a refusal. Advisory is always ready. |
| `installation` | `{id, account_login, account_type, status, repository_selection, permissions}`; `permissions` as last read from GitHub (`{}` until read) |
| `viewer_permission` | the human's GitHub permission on the repository, as above |
| `queue_enforcement` | `{status, reasons, …}`: `enforced` (GitHub makes manual merges follow Merget's order), `not_enforced`, `unknown` (not verified in the last ten minutes) or `not_applicable` (advisory mode) |
| `protection` | the target branch's required checks (`required_contexts`), required reviews (`required_reviews`), the strict up-to-date rule (`strict`, which caps batches at one pull request) and `required_linear_history`; null when unknown |
| `merge_methods` | `{merge_commit, squash, rebase, linear_history}` as GitHub allows them; `merge_methods_source` is `github` (read now) or `observation` (last seen) |
| `github_read` | `{ok, error, read_at}`: whether the live read worked. For an agent a reading is reused for up to a minute. |
| `checked_at` | when the document was composed |

## `sema_repo_update` — `sema:repos.write`

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `repo` | `owner/name` | yes | |
| `enabled` | boolean | no | turn Merget on or off for the repository |
| `mode` | `advisory` \| `queue` \| `autonomous` | no | queue and autonomous need the App's Contents: write (409 `permission_missing`) |
| `target_branch` | string \| null | no | the branch Merget queues into; null resets it to the default branch |
| `queue_label` | string (1–100) | no | the repository's queue label (default `sema:queue`) |
| `resolution_scope` | `blocking` \| `all_findings` | no | shortcut for `policy.resolution_scope`; not together with `policy` |
| `policy` | object | no | a JSON merge patch over the customer policy (the `merget-operate` skill) |

Needs maintain or admin on the repository in GitHub, checked live against
the human's account (403 `github_permission_required`), and the
repository's agent access at `findings_and_graph`. `agent_access` is not an
argument: an agent sending it is refused (403 `session_required`). Answers
the repository as stored now, with `policy_schema`.

Every change to a repository's settings prepares its queued pull requests
again and voids a standing land request; sending the values already stored
changes nothing.

## `sema_docs` — `sema:org.read`, read-only

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `page` | string | no | a page id: `quickstart`, `automation-modes`, `repositories`, `repository-settings`, `branch-protection`, `github-app`, `agents`, `team`, `troubleshooting`, …; omit for the list |

Answer: `{page, markdown}`, or `{pages}` without `page`. The same pages as
the dashboard's Docs; 404 `doc_not_found` lists the ids.
