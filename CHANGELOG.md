# Changelog — the `merget` Claude Code plugin

The plugin's version is `.claude-plugin/plugin.json` `version`, mirrored in
the marketplace manifest (`.claude-plugin/marketplace.json`). Bump both
together. The MCP tool set and the findings document are versioned separately
by the API (`api_version`, the `Sema-Api-Version` response header): a plugin
release never changes what the server answers, only what the skills teach and
which tools `.mcp.json` titles.

## 0.3.0 — 2026-10-03

Needs the Merget release that serves the fourteen operating tools and the
write permissions (`sema:org.read`, `sema:repos.write`, `sema:queue.write`);
the member list (`sema_org_get` with `include_members`) also needs the
release of Merget's account service that answers it to an agent. The twelve
read tools are unchanged.

- New skill `merget-setup`: the first run, from `sema_status` to a
  repository Merget works on — handing the human the dashboard page where
  they connect GitHub (the next step `sema_status` names), re-checking
  (`sema_status`, `sema_installation_sync`), enabling a first repository
  with `sema_repo_update`, and choosing its mode from the readiness verdict
  of `sema_repo_settings_get`. Permissions are chosen on the Merget sign-in
  page and changed under Settings › Agents; on `insufficient_scope`,
  `agent_scope_disabled`, `session_required` and the other refusals the
  agent asks the human and never retries. References: `setup-states.md`
  (every setup state and next step, and who acts), `tools.md`.
- New skill `merget-operate`: repository settings (`policy` as a JSON merge
  patch checked against `policy_schema`; Merget-managed engine limits are
  not settable), the queue's actions and their guards (confirm before a
  land, merge anyway or a cancel), runs, analytics, the organization's
  settings and members (read-only), installations (re-check), a
  repository's validation secrets (prefer the human pasting a value in the
  dashboard over passing it through the transcript) and the docs, and what
  stays human-only. References: `tools.md`, `policy.md`, `queue.md`.
- Agents never act as an organization owner: an agent's role is member in
  every organization, whoever its user is, and no permission changes that.
  The skills hand every owner step to the human, in Merget's dashboard —
  connecting GitHub, pausing and resuming merges, renaming the organization
  and its LLM budget, adding and removing members, organization-wide
  validation secrets and turning strict protection off — and no agent
  grants, receives or transfers the owner role. With deleting an
  organization or an account, every agent-access control and the browser
  steps, that is `merget-operate`'s human-only list, and `session_required`
  is the refusal that marks it.
  `agent_relay_unavailable` (503) and `agent_relay_refused` (502) concern
  the member list only: Merget could not ask its account service for it on
  the agent's behalf — Merget's fault, never a permission to ask the human
  for.
- An organization is named to the human by its display name (`display_name`
  from `sema_status` or `sema_org_get`), and by its slug only when it has
  none; the slug (`u-7d9b0c3e` in the examples) is only the `org` argument
  and the URL segment, and choosing among several organizations is asked by
  name, adding the slug to those whose names match ignoring case. On a
  successful result the name is taken from `structuredContent`
  (`display_name`, `consented_org_name`, `next_step.org_name`,
  `sema_installation_sync`'s `org_name`); a refusal has none, so there it
  is the decoded JSON of the `org_name` or `organizations` detail line,
  which prints text, list and object details as JSON in a code span. It is
  never taken from the `` `Name` (`slug`) `` label Merget's headings and
  messages write, the name in a code span of its own, and the human never
  sees those backticks.
  `consented_org_name`, `next_step.org_name`, `org_name` on
  `agent_scope_disabled`, on the organization's `agent_access_disabled` and
  on `sema_installation_sync`'s answer, and `organizations` on the
  multi-organization `invalid_argument` need the Merget release that serves
  them, as do the code-spanned names and details; `display_name` itself is
  served today.
- Refusals: every tools reference describes an MCP refusal's text as it
  is, `error <code> (HTTP <status>): <message>` plus one `key: value` line
  per detail, and has the agent read the values from those lines — a bare
  number, boolean or null, or JSON in a code span that it decodes. A
  refusal carries no `structuredContent`, and `_meta["sema.error"]`, the
  same body as plain JSON, reaches the model only in a client that exposes
  it (Claude Code passes only the text). The `merget-graph` and `merget-pr`
  references said the text was the body itself.
- `merget-pr`: `sema whoami` stays in the safe set, which now says it is not
  purely local: to name the token's organization it sends the token to
  `GET /v1/me` on the Merget API that token was issued for, and to no other,
  when the token holds `sema:org.read` — among `sema login`'s default
  scopes from the `sema` release that names the organization.
- `.mcp.json`: IDE titles for the fourteen operating tools, `sema_status`
  to `sema_docs`.
- Tool ids: the skills still named the tools after the MCP server's name
  before 0.2.0, `sema`. Through this plugin Claude Code names them
  `mcp__plugin_merget_merget__<name>`, and `mcp__merget__<name>` when the
  server is added by hand as `merget`.
- `sema_graph_intent` described as what it returns: the pull request's
  title, Merget's brief of its latest finished run and the intents recorded
  per finding, for a `pr:<n>:head` or `pr:<n>:base` rev (or a pull
  request's head sha); never its description, commit messages or prompts.
- `merget-pr` and `merget-graph`: a missing scope is turned on under
  Settings › Agents or by authorizing again, `agent_scope_disabled` is
  named, and merging, re-running and queue changes point at
  `merget-operate` instead of reading as unavailable.
- README: browser sign-in replaces the `sema login --legacy` header helper
  and the `cargo install` of the CLI; the one-line setup prompt; what
  agents can and cannot do; the six permissions; connecting from claude.ai,
  Claude Desktop, Claude Code, Cursor, VS Code, Codex and OpenCode, each of
  which registers itself on its first connection; and removing and
  re-adding a connection that stopped working, such as one made before the
  2026-09-29 sign-in move.
- Plugin description: twenty-six tools, no longer twelve read-only ones.
  The marketplace gains a description of its own (`metadata.description`),
  so `claude plugin validate --strict` passes.

## 0.2.0 — 2026-09-10

- Renamed to **Merget**, the product's name; `sema` was an internal codename.
  The plugin is `merget`, the marketplace is `merget-queue` (the name
  `merget` is taken by the Merget VCS plugin marketplace), and the skills are
  `merget-pr` and `merget-graph`. Tool ids (`sema_pr_findings`,
  `sema_graph_*`), the `sema` CLI and the `SEMA_TOKEN` environment variable
  keep their names until the API renames them in a versioned release.
- Moved to this standalone repository, so installing the plugin no longer
  clones the product repository.
- README: sign-in through the `sema` CLI with a header helper that refreshes
  the token, Codex and Cursor configuration, and what changes when browser
  sign-in ships.

## 0.1.0 — 2026-09-09

First release, as the `sema` plugin inside the product repository.

- `.mcp.json`: the remote MCP connection to `https://sema.merget.ai/mcp`
  (`type: http`) with IDE titles for the twelve tools.
- Skill `merget-pr`: reads and interprets a pull request's findings document
  (`sema_pr_findings`, `sema_pr_runs`, `sema_run_findings`,
  `sema_queue_status`) — the classification rules (only precise Layer-1
  findings block; Layer 2 is always advisory; advisory mode "would block in
  queue mode"; shadowed findings wait for the merge conflict), the verdict
  sentences, the lifecycle across runs, and the stop-and-ask list.
  References: `findings-schema.md` (every field of the document, the runs
  list, the queue block, the error table), `interpretation.md`.
- Skill `merget-graph`: the closed graph tool set (`sema_graph_symbols`,
  `sema_graph_callers`, `sema_graph_callees`, `sema_graph_def_use`,
  `sema_graph_slice`, `sema_graph_diff`, `sema_graph_finding`,
  `sema_graph_intent`) with the anchor → slice → widen protocol, provenance
  caveats, budgets (`max_tokens` 2000 default, clamped to 8000; `truncated`
  means narrow, not retry) and the error table. References: `tools.md`
  (arguments, result shapes, examples), `rev-grammar.md` (`<sha>`,
  `pr:<n>:head|base|merge`, `branch:<name>`).
