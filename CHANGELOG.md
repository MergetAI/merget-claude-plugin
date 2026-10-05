# Changelog — the `merget` Claude Code plugin

The plugin's version is `.claude-plugin/plugin.json` `version`, mirrored in
the marketplace manifest (`.claude-plugin/marketplace.json`). Bump both
together. The MCP tool set and the findings document are versioned separately
by the API (`api_version`, the `Merget-Api-Version` response header): a plugin
release never changes what the server answers, only what the skills teach and
which tools `.mcp.json` titles.

## 0.3.0 — 2026-10-05

Needs the Merget release that serves its tools as `merget_*`; that release
no longer answers to the `sema_*` ids that 0.2.1 and earlier teach.

- Tool ids are `merget_*`, each in place of its `sema_*` id:
  `merget_pr_findings`, `merget_pr_runs`, `merget_run_findings`,
  `merget_queue_status`, `merget_graph_symbols`, `merget_graph_finding`,
  `merget_graph_slice`, `merget_graph_callers`, `merget_graph_callees`,
  `merget_graph_def_use`, `merget_graph_diff` and `merget_graph_intent`.
  `.mcp.json` titles them under the new ids, and the skills and their
  references teach them: through this plugin Claude Code names them
  `mcp__plugin_merget_merget__merget_<name>`, and `mcp__merget__merget_<name>`
  for a server added by hand as `merget`.
- Claude Code permission rules naming the old tools
  (`mcp__plugin_merget_merget__sema_pr_findings`,
  `mcp__merget__sema_graph_slice`, …) no longer match and must be approved
  again: approve each tool when Claude Code asks, and rewrite a `deny` or
  `ask` rule with the new name, since one naming an old tool applies to no
  tool. A rule naming only the server (`mcp__plugin_merget_merget`) still
  covers every tool. README, new: Upgrading to 0.3.0, with the same advice.
- The MCP server names itself `merget` (`serverInfo.name`, was `sema`); this
  plugin's server was already `merget`, so `/mcp` still lists
  `plugin:merget:merget`. The server's `_meta` keys are `merget.api_version`,
  `merget.scope` and `merget.error`, and the API's version header is
  `Merget-Api-Version` (`Sema-Api-Version` comes beside it for now).
- Permissions are `merget:*`: the skills' `insufficient_scope` advice, the
  findings schema and the README's consent-page table name
  `merget:findings.read`, `merget:graph.read` and `merget:queue.read` in
  place of `sema:*` (`offline_access` is unchanged), and the product id in
  Merget's tokens becomes `merget`, where it was `sema`. A connection
  approved under the old names keeps working: nothing needs signing in
  again.
- Provenance is the tier only: a finding's `provenance` is `precise` or
  `syntactic` (`git` for a conflict) and its `resolver` is `null`; a graph
  edge's `provenance.resolver` is `name` or `receiver`, where it was
  `sema-link:name` or `sema-link:receiver`. The skills read the class,
  never the resolver: a `precise` edge from the receiver pass is precise,
  and the class `receiver` is left for an edge no pass graded.
- No command-line fallbacks: the skills no longer offer `sema pr`,
  `sema graph`, `sema login`, `sema whoami`, `sema mcp config` or
  `sema token print`, and the README drops the CLI's section and the
  `SEMA_TOKEN` bearer recipe (with `SEMA_API_URL`); the CLI is Merget's
  internal tool. A client that cannot sign in through OAuth is pointed at
  hello@merget.ai, and the 0.2.0 upgrade steps no longer name the CLI.

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
