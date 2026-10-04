# Changelog — the `merget` Claude Code plugin

The plugin's version is `.claude-plugin/plugin.json` `version`, mirrored in
the marketplace manifest (`.claude-plugin/marketplace.json`). Bump both
together. The MCP tool set and the findings document are versioned separately
by the API (`api_version`, the `Sema-Api-Version` response header): a plugin
release never changes what the server answers, only what the skills teach and
which tools `.mcp.json` titles.

## 0.2.1 — 2026-10-02

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
  Claude Code uses once Merget accepts them — the page names the host that
  publishes it (`claude.ai`, which "calls it “Claude Code”"), adds that any
  app on this computer can ask in that host's name, and shows the
  identity's address as the Client ID
  (`https://claude.ai/oauth/claude-code-client-metadata`); a Claude Code
  that registered before keeps its `dcr_…` registration until its
  authentication is cleared. What the page shows once Merget remembers
  approvals (**Continue as before?**, **Continuing as before…**, **Stop and
  review**), and `claude mcp logout plugin:merget:merget` for when `/mcp`
  offers no **Clear authentication**; either way Claude Code signs the
  connection out at Merget too.

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
