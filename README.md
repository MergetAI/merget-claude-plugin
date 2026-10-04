# Merget

Connects Claude Code to Merget — the semantic merge queue — through the
remote MCP server at `https://sema.merget.ai/mcp`, and adds four skills:

- **merget-setup** — the first run: where your organization stands (`sema_status`), the page in Merget's dashboard where you connect GitHub, enabling a first repository and choosing its automation mode from what GitHub lets Merget do there.
- **merget-operate** — Merget the way its dashboard runs it, short of an organization owner's steps: repository settings, the merge queue (retry, hold, merge what's ready, land), runs, analytics, a repository's validation secrets and the docs.
- **merget-pr** — read and interpret a pull request's Merget findings, verdict, brief, queue position and enforcement state (`sema_pr_findings`, `sema_pr_runs`, `sema_run_findings`, `sema_queue_status`).
- **merget-graph** — typed queries over Merget's code property graphs of any commit: symbols, callers, callees, def-use, slices, graph diff, a finding's slice, a PR side's intent (`sema_graph_*`). Merget builds a commit's graph on first use, so the first call on a fresh commit may answer `graph_pending` and succeed on the retry.

> The tool ids and the CLI still carry `sema`, Merget's internal codename for
> the merge queue. They are the API's names today; renaming them is a
> versioned API change and will land with its own release.

## What agents can and cannot do

The agent acts as you, never as more: within the permissions you grant it
when you sign in, and with your own GitHub permission on each repository.
With every permission it can:

- read pull requests' findings, runs and briefs, their place in the queue, and the code graph of any commit Merget has built;
- read your organization: its repositories and their settings, members, setup state, runs, analytics and GitHub installations;
- change repositories: turn Merget on or off, choose the automation mode and target branch, change settings and manage a repository's validation secrets (with **Maintain** or **Admin** on the repository in GitHub);
- check GitHub installations again, after you accept a permission or change the App's repositories;
- drive the merge queue: retry, hold and release a pull request, merge what's ready, land, and merge anyway over failing CI (with **Write** on the repository). The skills have it ask you before anything merges.

It never acts as an organization owner, even when you are the owner: in
every organization its role is member. These stay with a person signed in
to Merget's dashboard:

- **The owner's steps**: connecting GitHub (installing Merget's GitHub App, connecting or releasing an installation), pausing and resuming merges, renaming the organization and its monthly LLM budget, adding and removing members, organization-wide validation secrets, and **Turn off strict**. No agent makes anyone an owner or is made one.
- **Deleting** an organization or an account.
- **Every control over what agents may do**: the organization's agent switch and permission cap, each repository's agent access, and each agent's own permissions.
- **The browser steps**: signing up, signing in and approving the agent, installing Merget's GitHub App.

## Set up with one prompt

You need a Merget account and organization first: sign up at
[sema.merget.ai](https://sema.merget.ai). Then paste this into Claude Code,
or another coding agent:

```text
Fetch and execute the instructions to set me up for Merget from https://sema.merget.ai/agent-setup/prompt.md
```

The agent installs this plugin (or, in another agent, registers the MCP
server and the skills), signs in, and walks Merget's setup with you. The
browser steps and the owner's steps are yours: signing in and approving the
agent, and connecting GitHub, which an owner of your organization does in
Merget's dashboard — the agent gives you the page.

## Install in Claude Code

```text
/plugin marketplace add MergetAI/merget-claude-plugin
/plugin install merget@merget-queue
/reload-plugins
```

Then sign in: run `/mcp`, select the Merget server (`plugin:merget:merget`)
and choose **Authenticate**, or ask Claude anything about Merget and let the
first call open the browser. Sign in to Merget with your second factor; on
the consent page, tick the permissions this agent gets, choose the
organization (one, or all of yours) and approve.

| Permission | Lets the agent |
|------------|----------------|
| `sema:findings.read` | read pull-request and run findings, merge briefs and repository summaries |
| `sema:graph.read` | use the graph tools on any commit Merget has built |
| `sema:queue.read` | read queue position, enforcement and branch relationships, and every repository's queue |
| `sema:org.read` | read repositories and their settings, members, runs, analytics, GitHub installations, setup state and the docs |
| `sema:repos.write` | change repository settings, including turning Merget on or off and the automation mode, manage a repository's validation secrets, and check GitHub installations again |
| `sema:queue.write` | hold, release, retry and merge pull requests in the merge queue, including merge anyway |
| `offline_access` | stay connected without signing in again |

No permission lets an agent take an owner's step. Change them later in
Merget under **Settings › Agents**, or by authorizing the agent again
(`/mcp` → the Merget server → **Clear authentication** → **Authenticate**).
Merget gates agents on its side too: an organization owner can switch agents
off, or cap the permissions agents may use there, and each repository lets
agents in at `off`, `findings` (read-only) or `findings_and_graph` (the
default, and what changes need) — Repositories › Configure › Advanced ›
Coding-agent access. No agent can change any of these.

## Connect from claude.ai, Claude Desktop, Claude Code, Cursor and VS Code

Every client uses the same server, `https://sema.merget.ai/mcp`
(Streamable HTTP), and signs in the same way: it opens the Merget sign-in
page in your browser, where you choose the permissions and the organization
it gets. No token or key is pasted anywhere.

The first time a client connects, Merget registers it, together with the
address your browser returns to after you approve: your own machine (a
loopback address) for Claude Code, Codex and OpenCode, a web address for
claude.ai and VS Code, and the app itself for Cursor. The sign-in page names
the client and where it returns; approve only a request you just started
yourself.

| Client | Returns to |
|--------|------------|
| Claude Code | a loopback address |
| Codex | a loopback address |
| OpenCode | a loopback address |
| claude.ai | `https://claude.ai/api/mcp/auth_callback` |
| Claude Desktop | claude.ai's address (its connectors are claude.ai's) |
| Cursor | its own app scheme (`cursor://…`) |
| VS Code | `https://vscode.dev/redirect` |

### Claude Code

This plugin ([above](#install-in-claude-code)), or the server alone:

```sh
claude mcp add --transport http merget https://sema.merget.ai/mcp
```

A server added this way is listed in `/mcp` as `merget`; select it and
choose **Authenticate**. Without the plugin there are no skills: copy the
folders under `skills/` into `~/.claude/skills/` if you want them. Tools are
named `mcp__plugin_merget_merget__<tool>` through the plugin and
`mcp__merget__<tool>` when added by hand.

### claude.ai and Claude Desktop

1. Open **Settings › Connectors** and add a custom connector.
2. Name it **Merget** and enter `https://sema.merget.ai/mcp` as its URL.
3. Select **Connect**, then sign in and approve the request in the browser window that opens.

Claude Desktop uses your claude.ai account's connectors, so one connector
serves both. On a claude.ai Team or Enterprise plan, an owner of that
claude.ai organization may have to add the connector first.

### Cursor

Add the server to `~/.cursor/mcp.json` (every project) or
`.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "merget": { "url": "https://sema.merget.ai/mcp" }
  }
}
```

Open Cursor's MCP settings and select the sign-in button beside **merget**.

### VS Code

Add the server to `.vscode/mcp.json` in your workspace, or run **MCP: Add
Server** from the Command Palette and choose **HTTP**:

```json
{
  "servers": {
    "merget": { "type": "http", "url": "https://sema.merget.ai/mcp" }
  }
}
```

Start the server from the file or the **MCP: List Servers** command, and
allow VS Code to sign in when it asks.

### Codex, OpenCode and other clients

Codex adds the server and signs in with:

```sh
codex mcp add merget --url https://sema.merget.ai/mcp
codex mcp login merget
```

OpenCode: under `"mcp"` in `~/.config/opencode/opencode.jsonc` add
`"merget": {"type": "remote", "url": "https://sema.merget.ai/mcp", "enabled": true, "oauth": {}}`,
then run `opencode mcp auth merget`.

In any other client, add a remote (HTTP) server with the address above,
connect, and approve the sign-in; then list the server's tools to confirm
the connection.

> A client registers itself with Merget the first time it connects. If a
> client reports that it could not register, or fails before the Merget
> sign-in page opens, tell us at [hello@merget.ai](mailto:hello@merget.ai)
> which client and version it is, and connect from Claude Code, Codex or
> OpenCode meanwhile.

### A connection that stopped working

If a Merget connection that used to work stops connecting, and
**Reconnect** (or signing in again) does not help, make the client forget
what it saved: remove the connection and add it again, or in Claude Code
clear its authentication. Reconnecting reuses the sign-in details the client
saved when you first added the server, and Merget's sign-in moved from
`forge.merget.ai` to `auth.merget.ai` on 2026-09-29, so a connection added
before then keeps asking the old address — for example with
`HTTP 503 trying to load OAuth metadata from https://forge.merget.ai/…`.

- **claude.ai and Claude Desktop**: under **Settings › Connectors**, remove the Merget connector, then add it again as above.
- **Claude Code**: `/mcp` → the Merget server → **Clear authentication**, then **Authenticate**. For a server added by hand you may also `claude mcp remove merget` and add it again.
- **Cursor and VS Code**: delete the `merget` entry and save, then add it back and sign in.

To change what a connected agent may do you don't need to reconnect: switch
its permissions in Merget under **Settings › Agents**.

## Skills in other agents

The skills are plain markdown under `skills/`; copy them into the agent's
skill directory when it has one (`~/.codex/skills/`), or into
`.cursor/rules/` as rules.

Merget's command-line tool, `sema`, is available on request; for agents,
the MCP server is the way in.

## Layout

```
.claude-plugin/marketplace.json     the marketplace this repository publishes
.claude-plugin/plugin.json          plugin manifest
.mcp.json                           the MCP connection (type http, URL, tool titles)
CHANGELOG.md                        what each plugin version changed
skills/merget-setup/SKILL.md        first run: status, the GitHub hand-off, a first repository, its mode
skills/merget-setup/references/     setup-states.md, tools.md
skills/merget-operate/SKILL.md      settings, queue actions, runs, analytics, secrets, docs; what stays human-only
skills/merget-operate/references/   tools.md, policy.md, queue.md
skills/merget-pr/SKILL.md           findings, verdict, queue: how to read them
skills/merget-pr/references/        findings-schema.md, interpretation.md
skills/merget-graph/SKILL.md        graph tools: protocol, provenance, budgets, errors
skills/merget-graph/references/     tools.md, rev-grammar.md
```

Merget is at [sema.merget.ai](https://sema.merget.ai).
