# Changelog — the `merget` Claude Code plugin

The plugin's version is `.claude-plugin/plugin.json` `version`, mirrored in
the marketplace manifest (`.claude-plugin/marketplace.json`). Bump both
together. A plugin release never changes what the server answers, only what
the skills teach and which tools `.mcp.json` titles. To take a release back,
release the content before it again under a new, higher version (0.4.1 with
0.3.1's skills, say), so this list stays in order: Claude Code updates a
copy whenever the version differs from the one it has.

The API versions the shape of its documents, the findings document among
them (`api_version`, also sent as the `Merget-Api-Version` response header):
within a version fields are only added, and a removed or renamed field bumps
it. Merget's rename to its own name (see 0.4.0) is the one exception, made
once within `api_version` `2026-09`, and Merget serves these under their new
names or values only:

- the MCP tool ids, `sema_*` now `merget_*`, and the server's name
  (`serverInfo.name`), `sema` now `merget`;
- the `_meta` keys `sema.api_version`, `sema.scope` and `sema.error`, now
  `merget.api_version`, `merget.scope` and `merget.error`;
- the count keys of run and analytics rows and of a run's report,
  `sema_l1` … `git_clean_but_sema_flagged`, now `merget_l1` …
  `git_clean_but_merget_flagged`;
- a finding's `resolver`, now always `null`, and a graph edge's resolver,
  now `name` or `receiver`: the provenance tier alone.

The version header became `Merget-Api-Version` at the same time;
`Sema-Api-Version` comes beside it until a later Merget release drops it.

## 0.6.0 — 2026-10-16

Needs the Merget release that serves resolve for merge time and
`merget_pr_receipt`: the `resolve` action of `merget_queue_action`, the
offer on a hand-off that needs the user (`handoff.resolve`), where the
repository takes resolutions, the queue's `resolutions` and a batch
member's `person_resolution`, and the read tool `merget_pr_receipt`, with
billing in credits. The tools are twenty-eight, thirteen that read and
fifteen operating ones. Against an earlier Merget, `merget_pr_receipt` is
not among its tools, `merget_queue_action` refuses `resolve`
(`invalid_argument`: the action is not one it knows) and no hand-off
carries `resolve`, so the skills offer resolving on the branch alone, and
`merget_org_get` may answer the monthly LLM budget instead of credits;
the rest works as 0.5.0 teaches it. 0.5.0 still works against the new
release; it does not teach resolving for merge time or
`merget_pr_receipt`, and it names the monthly LLM budget, which the new
release no longer serves.

- `merget_queue_action` `resolve` (`number`, `base_commit`, `patch`,
  `reason`): a resolution of a pull request's handed-off conflicts, made on
  R0 — the pull request's head merged onto the queue's predicted base, with
  Merget's own resolutions where it has them and conflict markers in the
  rest, published at `refs/merget-queue/resolve/<number>`, on no branch —
  and handed to Merget instead of pushed to the branch. Merget checks it as
  it checks its own resolutions, keeps it beside the pull request and lands
  it with the pull request, never on the branch while the queue order
  stands. Resolving on the branch stays the first way; `resolve` is offered
  beside it. `withdraw_amendment` takes a resolution back as it takes a fix.
- The queue reference describes the offer a hand-off that needs the user
  (`needs_you` or `waiting_on`) carries in queue and autonomous mode with
  `batch.amendments` on (`handoff.resolve`: `eligible`, `base_commit`,
  `ref`, `queue_base`, `over`, `paths`, `merget_paths`, `prompt_url`,
  `previous`) and every reason one is not eligible (`not_enforced`,
  `fork_head`, `stacked`, `resolution_standing`, `not_qualifying`,
  `rule_first`, `too_many_files`, `preparing`, `unavailable`,
  `untrusted_base`, `nothing_to_resolve`); the patch's rules (a fix's
  limits, and no conflict marker left in a file the offer lists, checked at
  submission and again on the applied file); a resolution's statuses; how it
  shows — the plan's `resolutions`, a pull request's `queue.resolution`, a
  batch member's `member_commits[].person_resolution` with what it leaves
  out of either side (`left_out`); one resolution per pull request beside at
  most one fix; and every refusal, among them the three a fix never gets:
  `not_handed_off`, `stale_resolution_base` and `unresolved_conflict`. After
  `stale_resolution_base`, which keeps nothing, it carries the resolution
  over to the new R0: read the hand-off again (its files and prompt may
  differ), apply the earlier patch with `git apply --3way`, resolve what
  remains and submit again.
- `merget-operate`, new: When conflicts need the user — read the hand-off
  and Merget's prompt with `merget_queue_status`, offer both ways with the
  branch first, resolve on R0 fetched by its ref, write the patch with the
  prompt's `git diff` line, confirm, `resolve`, and follow it to where it
  lands. The skill confirms with the user before `resolve`, which is
  recorded under their name, and its refusals table gains the three new
  codes. When a batch fails, a member that carries a resolution
  (`member_commits[].person_resolution`) is named before a push to its
  branch, which sets the resolution aside too.
- `merget-operate`'s description names resolving a pull request's
  conflicts for merge time. To stay within the 1,024 characters a skill's
  description may have, it no longer calls repository settings a JSON
  merge patch checked against `policy_schema`, which the skill still
  teaches.
- `merget-pr` reads a `blocked` or `waiting` pull request's queue block in
  queue and autonomous mode, and hands conflicts offered for merge time, or
  a resolution of them that stands, to `merget-operate`, as it hands a
  failed batch. Its vocabulary names the queue block's `handoff`, and the
  skill and its interpretation reference say that a push to the branch sets
  a standing resolution aside: the author hears that before being told to
  merge the target and push. The findings schema's `queue` table gains
  `handoff` and `resolution`, and `sequence_ready`, `held`, `verification`
  and `queue_break`, which Merget served already and the table left out.
- The policy reference says `batch.amendments` also governs resolutions
  submitted for merge time, and `merget_batch`'s reference that its
  `amendments` never list one. That release labels the setting **Accept
  fixes and conflict resolutions submitted to Merget** in the dashboard
  (it was **Accept fixes submitted to Merget**), and the queue reference
  names it so.
- README: `merget:queue.write` also submits resolutions of pull requests'
  conflicts for merge time, which Merget lands with the pull request; what
  agents can do, and `merget-operate`'s line, say the same. `merget-pr`'s
  line and what agents can do add what a pull request cost in credits
  (`merget_pr_receipt`), and the owner's steps name the plan and the
  spending cap where they named the monthly LLM budget.
- Plugin description: resolving a pull request's conflicts on the commit
  the queue lands for it, and that the agent asks before it submits a
  resolution. Also what a pull request cost in credits, and twenty-eight
  tools: thirteen that read and fifteen that set up and operate Merget.
- New tool `merget_pr_receipt` (`merget:findings.read`, read-only; `repo`,
  `number`): what a pull request cost in Merget credits — every run Merget
  made for it, in order, with its kind, cause, outcome and credits (a run
  Merget failed or abandoned is listed free), the totals and the periods
  they fall in, and `mode`, live billing or a preview that charges
  nothing. Credits are the only unit: no model or token detail is served.
  `merget-pr` teaches it in its tools table and safe set, its findings
  schema reference gives the answer's fields, `merget-setup`'s
  permissions table names credits under `merget:findings.read`, and
  `.mcp.json` titles it "Merget: credits of a pull request".
- That release bills in credits, and the skills say so. `merget_org_get`
  answers the plan and `billing` (used, included, cap, status,
  `paused_reason`) instead of the monthly LLM budget, and `merget_run_get`
  a run's credits (`receipt`) instead of its LLM usage. The plan and the
  spending cap are an owner's, under Settings › Billing, in
  `merget-operate`'s human-only list. An organization that used its
  monthly credits gets `merget_status`'s next step `credits_exhausted`
  (`merget-setup`), `billing_hold` on its row and on its queues, and 402
  `credits_exhausted` on `retry` and `skip_blocked` (`merget-operate`);
  landings continue. `merget-operate`'s description says credits and its
  billing where it said LLM spend and budget.
- What a queued pull request waits for: the plan's `items[].wait` and
  `batch_summary` in the queue reference, and the findings document's
  `queue.wait` in `merget-pr`, which keeps a pull request `waiting`
  whatever `blockers` holds.
- `merget-pr`: a blocking finding that breaks the merge into the target
  branch as it is reads `blocked` in `advisory` mode too, and Merget's
  check fails, though Merget changes no branch there. Merget already
  served this, and the skill said only "would block in queue mode",
  which stays the sentence for an `advisory` verdict.
- The queue reference's `not_qualifying` reason also names an agent
  instruction file, a symbolic link and a submodule, and says that R0, on
  no branch, is meant to start no CI. `merget-pr` adds to
  `lifecycle: resolved` on a conflict that, where the run's held entry for
  that path has rung person, a resolution submitted to Merget for merge
  time resolved it.

## 0.5.0 — 2026-10-15

Needs the Merget release that serves `merget_batch`, the `batches` view of
`merget_queue_get`, and the `amend` and `withdraw_amendment` actions of
`merget_queue_action`: twenty-seven tools, fifteen of them operating ones.
Against an earlier Merget, `merget_batch` is not among its tools and the
view and the two actions are refused; the rest works as 0.4.0 teaches it.
0.4.0 still works against the new release; it does not teach the new tool,
view or actions.

- New tool `merget_batch` (`merget:queue.read`, read-only): one batch, by
  its id or `b-xxxxxxxx` name — its state, its members and the commit each
  entered at, CI on the batch commit, what broke with Merget's prompt for a
  coding agent (**Fix with your agent** in the dashboard), the batches that
  isolated the cause, and the fixes submitted to Merget for the batch or
  carried by its pull requests, each with its diff. `merget-operate` and its
  tools reference teach it, and `.mcp.json` titles it "Merget: one batch".
- `merget_queue_get` view `batches`: the repository's batches newest
  first, settled and live; `state` keeps one state, or `live`, and
  `failed: true` only the batches whose CI failed a required check; `limit`
  at most 50. The queue reference describes a batch's row as the plan, the
  view and `merget_batch` serve it — its `breakage` with the prompt,
  `amendments` and `amendable` — the plan's `amendments_enabled`, and an
  entry's `queue_break`.
- `merget_queue_action` `amend` and `withdraw_amendment`: a fix for a batch
  whose CI failed, handed to Merget instead of pushed to the pull request's
  branch. Merget tests the batch again with it and lands it with the pull
  request, never on the branch while the queue order stands. Pushing the
  branch stays the first way; `amend` is for a user who wants the branch
  left untouched. The queue reference gives the arguments, the patch's
  limits (text only, at most 1 MiB, nothing under `.github/` or the other
  paths Merget never writes), one fix per pull request
  (`amendment_exists`), that Merget takes one only where GitHub requires
  the Merget check (`amendment_unenforced`), the fix's states and every
  refusal.
- `merget-operate`, new: When a batch fails — find the failed batch (view
  `batches` with `failed: true`, or the plan's batches), read it with
  `merget_batch`, follow its prompt (reproduce on the commit it names, fix,
  verify), then push the branch or, if the user wants it untouched, `amend`
  with the prompt's base commit and diff; `withdraw_amendment` takes a fix
  back. The skill confirms with the user before `amend`, which is recorded
  under their name, and before `withdraw_amendment`, as before
  `cancel_land`: the fix may be a colleague's.
- `dismiss` and `undismiss`, which Merget already serves, are documented
  for the first time: `dismiss` (`number`, `fingerprint`, `reason`) says a
  finding is wrong, so it stops blocking from the next run on, in every
  mode, and stays dismissed across pushes while it keeps its fingerprint;
  `undismiss` undoes it. `merget-operate` confirms with the user first,
  since the dismissal is recorded under their name, and dismisses only a
  finding shown false, never to get past a real break.
- `merget-pr` hands a batch whose CI failed, its fix and dismissing a
  finding to `merget-operate`, with the queue work it already handed over;
  it said dismissing a finding happens on GitHub.
- `merget-operate`'s description names `merget_batch`, a failed batch and
  dismissing a finding. To stay within the 1,024 characters a skill's
  description may have, it no longer names `merget_repo_update` and
  `merget_secrets`, which the skill still teaches.
- README: `merget:queue.write` also dismisses findings and submits fixes
  for failed batches, which Merget lands with the pull request; what agents
  can do, and `merget-operate`'s line, say the same.
- Plugin description: twenty-seven tools, fifteen that set up and operate
  Merget, and what the new ones do.
- The policy reference lists `batch.amendments` (Queue behavior, bool, on
  unless false): whether Merget accepts fixes submitted to it for the
  repository's failed batches.
- `land`'s `commit_sha` and `tree_sha`, which earlier releases left out,
  are documented: Merget refuses a land without `commit_sha` in autonomous
  mode ("Land it now"), with `override` and with `kind: "lane"`
  (`invalid_body`).

## 0.4.0 — 2026-10-06

Needs the Merget release that renamed its tools to `merget_*`: its
`tools/list` names them, its `initialize` answer names the server `merget`
(`serverInfo.name`), and its MCP responses carry `Merget-Api-Version`. Its
`api_version` is still `2026-09`: the rename is the one exception to what a
version promises (see above). It no longer answers to the `sema_*` ids that
0.3.1 and earlier teach: a call to one is refused with `unknown_tool`, which
names the new id.

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
  `ask` rule with the new name (`mcp__plugin_merget_merget__merget_<name>`,
  or `mcp__merget__merget_<name>` for a server added by hand), since one
  naming an old tool applies to no tool. A rule naming only the server
  (`mcp__plugin_merget_merget`, or `mcp__merget`) still covers every tool.
  Claude Code names the tools from the list the server sends, so the old
  rules stop matching once Merget serves the new names, whichever version
  of the plugin runs. README, new: Merget's new tool names, with the same
  advice.
- The same holds for a choice another client keeps per tool: a tool
  switched off in claude.ai, Claude Desktop, Cursor or VS Code, or a list
  of the server's tools in Codex's `config.toml`, names a `sema_*` id and
  applies to no tool once Merget serves the new names; it has to be made
  again under them. README, Merget's new tool names, says so, and that
  switching an agent's `merget:repos.write` and `merget:queue.write` off in
  Merget keeps it from changing repositories or the merge queue whatever
  its client calls the tools.
- Copies of the skills outside the plugin, in `~/.claude/skills/` or in
  another agent, do not update with it and keep teaching the `sema_*` ids.
  README, Skills in other agents, new: the `skills` tool that Merget's
  setup prompt installs them with (`npx -y skills add …`) updates them too
  (`npx -y skills update -g` with the four skills' names), and a copy made
  by hand has to be made again; Merget's new tool names points there.
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
  `merget_org_get` name them so from that Merget release; the tokens Merget's
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
  `merget-graph` describes `syntactic` without Merget's internals, as name
  matching that could not prove a unique binding.
- `merget-pr`'s references point at Merget's docs — the `findings` page for
  the provenance tiers, the `states` page for the queue's states
  (`merget_docs`, or the dashboard's Docs) — where they named documents
  that only Merget's own repository holds.
- No command-line fallbacks: the skills and the README no longer describe
  Merget's internal command-line tool, its commands or its environment
  variables; for an agent, the MCP server is the way in. `merget-pr`'s safe
  set lists its four tools only, and the README drops the tool's section,
  its token recipe and the note that the tool ids still carried an
  internal codename. A client that cannot sign in through OAuth gets its
  token from an OAuth client of its own (README, Without OAuth), and the
  0.2.0 upgrade steps no longer name the tool.
- README, claude.ai and Claude Desktop: choose **Use Claude's published
  identity**, as Merget's docs and setup prompt advise: the connector
  doesn't register with Merget, so it doesn't lapse, and Merget can reuse
  an approval. **Register automatically** works too, for when Merget can't
  check Claude's published details. The README said to choose
  **Register automatically**, not the published identity.

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
