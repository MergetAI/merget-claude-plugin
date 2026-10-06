# Changelog — the `merget` Claude Code plugin

The plugin's version is `.claude-plugin/plugin.json` `version`, mirrored in
the marketplace manifest (`.claude-plugin/marketplace.json`). Bump both
together. The MCP tool set and the findings document are versioned separately
by the API (`api_version`, the `Merget-Api-Version` response header): a plugin
release never changes what the server answers, only what the skills teach and
which tools `.mcp.json` titles.

## 0.4.0 — 2026-10-06

Needs the Merget release that serves its tools as `merget_*`; that release
no longer answers to the `sema_*` ids that 0.3.1 and earlier teach.

- Tool ids are `merget_*`, each in place of its `sema_*` id: the twelve
  that read pull requests and graphs, `merget_pr_findings`,
  `merget_pr_runs`, `merget_run_findings`, `merget_queue_status`,
  `merget_graph_symbols`, `merget_graph_finding`, `merget_graph_slice`,
  `merget_graph_callers`, `merget_graph_callees`, `merget_graph_def_use`,
  `merget_graph_diff` and `merget_graph_intent`, and the fourteen that set
  up and operate Merget, `merget_status`, `merget_repos_list`,
  `merget_repo_settings_get`, `merget_repo_update`,
  `merget_queues_overview`, `merget_queue_get`, `merget_queue_action`,
  `merget_runs_list`, `merget_run_get`, `merget_analytics`,
  `merget_org_get`, `merget_installation_sync`, `merget_secrets` and
  `merget_docs`. `.mcp.json` titles them under the new ids, and the four
  skills and their references teach them: through this plugin Claude Code
  names them `mcp__plugin_merget_merget__merget_<name>`, and
  `mcp__merget__merget_<name>` for a server added by hand as `merget`.
- Claude Code permission rules naming the old tools
  (`mcp__plugin_merget_merget__sema_pr_findings`,
  `mcp__plugin_merget_merget__sema_queue_action`,
  `mcp__merget__sema_graph_slice`, …) no longer match and must be approved
  again: approve each tool when Claude Code asks, and rewrite a `deny` or
  `ask` rule with the new name, since one naming an old tool applies to no
  tool. A rule naming only the server (`mcp__plugin_merget_merget`) still
  covers every tool. README, new: Upgrading to 0.4.0, with the same advice.
- The MCP server names itself `merget` (`serverInfo.name`, was `sema`); this
  plugin's server was already `merget`, so `/mcp` still lists
  `plugin:merget:merget`. The server's `_meta` keys are `merget.api_version`,
  `merget.scope` and `merget.error` (the references point a client that
  exposes `_meta` at `_meta["merget.error"]`), and the API's version header
  is `Merget-Api-Version` (`Sema-Api-Version` comes beside it for now).
- Permissions are `merget:*`: `merget:findings.read`, `merget:graph.read`,
  `merget:queue.read`, `merget:org.read`, `merget:repos.write` and
  `merget:queue.write`, each in place of its `sema:*` name
  (`offline_access` is unchanged), in the skills' refusal advice, the
  tools references, the findings schema and the README's permissions
  table and consent page. Merget's refusals, `merget_status` and
  `merget_org_get` name them so from this release; the tokens Merget's
  sign-in service issues may carry the `sema:*` names until shortly after
  it, and Merget accepts both meanwhile, so a connection approved under the
  old names keeps working and nothing needs signing in again. Merget's
  product id becomes `merget` (it was `sema`) on the same schedule.
- The setup tools reference gives a repository's default queue label as
  `merget:queue`, where it was `sema:queue`.
- Provenance is the tier only: a finding's `provenance` is `precise` or
  `syntactic` (`git` for a conflict) and its `resolver` is `null`; a graph
  edge's `provenance.resolver` is `name` or `receiver`, where it was
  `sema-link:name` or `sema-link:receiver`. The skills read the class,
  never the resolver: a `precise` edge from the receiver pass is precise,
  and the class `receiver` is left for an edge no pass graded.
- No command-line fallbacks: the skills and the README no longer describe
  Merget's internal command-line tool, its commands or its environment
  variables; for an agent, the MCP server is the way in. `merget-pr`'s safe
  set lists its four tools only, and the README drops the tool's section,
  its token recipe and the note that the tool ids still carried an
  internal codename. A client that cannot sign in through OAuth gets its
  token from an OAuth client of its own (README, Without OAuth), and the
  0.2.0 upgrade steps no longer name the tool.

## 0.3.1 — 2026-10-05

- README: install with auto-update on. Claude Code updates a plugin only
  when auto-update is on for its marketplace; it is off for every
  marketplace outside Anthropic's own, and a marketplace has no field to
  turn it on
  ([Claude Code docs](https://code.claude.com/docs/en/plugins/host-marketplace#turn-on-auto-update)).
  "Install in Claude Code" now leads with the `~/.claude/settings.json`
  entries — `merget-queue` under `extraKnownMarketplaces` with
  `"autoUpdate": true`, and `merget@merget-queue` under `enabledPlugins` —
  merged into the file's existing settings, which install the plugin at the
  next session start and keep it current. The `/plugin` commands follow as
  the alternative, with how to turn auto-update on afterwards (`/plugin` →
  Marketplaces → `merget-queue` → Enable auto-update, or the same entry).
  New "For a team": the same entries in a repository's
  `.claude/settings.json`, applied once each teammate trusts the folder, and
  managed settings for an organization. "Updating" says when a new version
  arrives with auto-update on, and how to update without it.
- Skill `merget-setup`, new last step: in Claude Code, offer to turn on
  auto-update for `merget-queue`, so new skills and fixes arrive without
  asking. Only on the human's yes, and only when it is not on already, the
  agent sets `"autoUpdate": true` on that `extraKnownMarketplaces` entry in
  `~/.claude/settings.json` (adding the entry when there is none), keeps
  every other setting and the entry's `source`, checks the file still
  parses, and says it takes effect from the next session.

## 0.3.0 — 2026-10-05

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
  sees those backticks. The agent says the name as plain text, its
  markdown characters escaped, never as a link or markup, and calls a name
  that reads like a URL, an address or instructions the organization's
  name. The `description` of the `create_organization`, `reauthorize`,
  `enable_agents` and `allow_agent_permissions` steps is written to the
  agent, so `merget-setup` has it tell the human what it says in its own
  words, naming the organization by `org_name`, and give `url`, instead of
  passing the description on as it stands.
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
  purely local: it may refresh a stored token at the sign-in service, and
  to name the token's organization it calls `GET /v1/me` on the configured
  API (`SEMA_API_URL`, else the API the last `sema login` stored, else the
  default) only when the token was issued for that same API and holds
  `sema:org.read` — among `sema login`'s default scopes from the `sema`
  release that names the organization. Otherwise it prints the slug and
  makes no `/v1/me` request; a token is never sent to a host it was not
  issued for.
- `.mcp.json`: IDE titles for the fourteen operating tools, `sema_status`
  to `sema_docs`.
- `sema_graph_intent` described as what it returns: the pull request's
  title, Merget's brief of its latest finished run and the intents recorded
  per finding, for a `pr:<n>:head` or `pr:<n>:base` rev (or a pull
  request's head sha); never its description, commit messages or prompts.
- `merget-pr` and `merget-graph`: a missing scope is turned on under
  Settings › Agents or by authorizing again, `agent_scope_disabled` is
  named, and merging, re-running and queue changes point at
  `merget-operate` instead of reading as unavailable.
- README: the one-line setup prompt; what agents can and cannot do, in
  place of 0.2.1's sentence that both skills only read; the six
  permissions, which the consent page now offers as one checkbox each, all
  ticked, for you to untick, and which you change later under
  Settings › Agents; the organization's permission cap and the repository
  access level that changes need; `/reload-plugins` among the install
  commands; `codex mcp add` for Codex; and removing and re-adding a
  connection that stopped working, in each client, such as one made before
  the 2026-09-29 sign-in move.
- Plugin description: twenty-six tools, no longer twelve read-only ones.
  The marketplace gains a description of its own (`metadata.description`),
  so `claude plugin validate --strict` passes.

## 0.2.1 — 2026-10-05

- README: Claude Code signs in through the browser. After installing, run
  `/mcp` and authenticate the Merget server: Claude Code opens Merget's
  sign-in service (`https://auth.merget.ai`) and its consent page. Removed
  the `cargo install` / `sema login --legacy` / header-helper setup and the
  note about browser sign-in to come.
- Upgrading from 0.2.0: remove the server that setup added, or any
  `merget` server added by hand (`claude mcp remove merget`, which finds
  its scope), and delete its helper (`~/.merget/mcp-headers.sh`, or
  `%USERPROFILE%\.merget\mcp-headers.ps1`). A server you add yourself at
  the plugin's address takes precedence over the plugin's, so
  `plugin:merget:merget` does not connect while it is there. For Codex,
  Cursor or any other client set up from 0.2.0 with the `SEMA_TOKEN`
  bearer, delete what sends it (Codex's `bearer_token_env_var` line,
  Cursor's `headers` entry) before signing in.
- README, new: what the consent page shows; that a client asking for no
  particular scope is offered every permission its registration allows,
  plus `offline_access` when it can use a refresh token, and so stays
  signed in; signing in again (`/mcp` → **Clear authentication**, after
  revoking the client to choose another organization or add a scope) and
  updating the plugin; claude.ai and Claude Desktop, Codex, Cursor,
  VS Code and OpenCode, each through its own OAuth sign-in, with a bearer
  token in `SEMA_TOKEN` for a client without one (`sema login` once, then
  `SEMA_TOKEN= sema token print`, which never prints back a token already
  exported). Codex reads skills from `~/.agents/skills/`, and the
  `sema graph` example takes `--at file:line`.
- Skills: this plugin's MCP server is `merget`, which `/mcp` lists as
  `plugin:merget:merget`, so its tools are
  `mcp__plugin_merget_merget__<name>`; `mcp__merget__<name>` is the form
  only for a server added by hand as `merget`. `merget-pr`, `merget-graph`
  and `references/tools.md` still said `mcp__sema__<name>` through a `sema`
  server, including in the sign-in-again advice for `insufficient_scope`.
- Skill `merget-pr`: the verdict `conflicts`, for when Merget serves it —
  a repository in `advisory` mode whose pull request git could not merge
  (a textual conflict Merget did not resolve, or a run that ended
  `conflicts`). It is never clean, and its findings are still counted
  beside it; the skill says so, with the sentence to use and the wording
  to avoid. A verdict status the skill does not list is never reported as
  clean.
- Skill `merget-pr`: a conflict is said by what it is with, which its
  finding's message names: with the target, git cannot merge the pull
  request as it stands; only with a pull request ahead in the queue,
  GitHub shows no conflict yet and there is nothing to do until that one
  merges. New classes in the vocabulary and in the classification order as
  the document applies it: `conflict` (layer 0, a file git could not merge;
  `lifecycle` `resolved` when Merget resolved it) and, once Merget serves
  the review reading, `review` — what the pull request alone breaks against
  its predicted base, classed by its own `blocking` flag ahead of the
  precise rule, which now reads "precise, whatever the layer" as the
  document's does. The schema gains `verdict.conflict_count`,
  `verdict.review_count`, `verdict.inherited` and `run.inherited` (breaks
  inherited from a pull request ahead: that one's, never counted here),
  the conflict and review counts and `findings[].scope`; the advisory
  sentence names review findings; finding kinds are the served ones
  (`broken-reference`, `interference-dataflow`, …).
- README: the consent page for a client with a published identity, which
  Claude Code signs in with — the page names the host that publishes it
  (`claude.ai`, which "calls it “Claude Code”"), adds that any app on this
  computer can ask in that host's name, and shows the identity's address
  as the Client ID (`https://claude.ai/oauth/claude-code-client-metadata`);
  a Claude Code that registered before keeps its `dcr_…` registration
  until its authentication is cleared. What the page shows when Merget
  remembers an approval given or last used in the last 90 days
  (**Continue as before?**, **Continuing as before…**, **Stop and
  review**). Clearing authentication also when Merget's sign-in page says
  the app isn't registered (a `dcr_…` registration lapses after two and a
  half to three months without use), and
  `claude mcp logout plugin:merget:merget` for when `/mcp` offers no
  **Clear authentication**; either way Claude Code signs the connection
  out at Merget too.

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
