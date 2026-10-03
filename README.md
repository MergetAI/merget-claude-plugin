# Merget

Connects Claude Code to Merget — the semantic merge queue — through the
remote MCP server at `https://sema.merget.ai/mcp`, and adds four skills:

- **merget-setup** — the first run: where your organization stands (`sema_status`), connecting GitHub (you open the install link it hands you), enabling a first repository and choosing its automation mode from what GitHub lets Merget do there.
- **merget-operate** — Merget the way its dashboard runs it: repository settings, the merge queue (retry, hold, merge what's ready, land), runs, analytics, the organization's name, members and LLM budget, validation secrets and the docs.
- **merget-pr** — read and interpret a pull request's Merget findings, verdict, brief, queue position and enforcement state (`sema_pr_findings`, `sema_pr_runs`, `sema_run_findings`, `sema_queue_status`).
- **merget-graph** — typed queries over Merget's code property graphs of any commit: symbols, callers, callees, def-use, slices, graph diff, a finding's slice, a PR side's intent (`sema_graph_*`). Merget builds a commit's graph on first use, so the first call on a fresh commit may answer `graph_pending` and succeed on the retry.

The agent acts as you: within the permissions you grant it when you sign
in, and with your own GitHub permission on each repository. The skills
have it ask you before anything merges. Deleting an organization or an
account, the owner role — no agent is made an owner or makes anyone one —
and every control over what agents may do stay yours alone.

> The tool ids and the CLI still carry `sema`, Merget's internal codename for
> the merge queue. They are the API's names today; renaming them is a
> versioned API change and will land with its own release.

## Set up with one prompt

You need a Merget account and organization first: sign up at
[sema.merget.ai](https://sema.merget.ai). Then paste this into Claude Code,
or another coding agent:

```text
Fetch and execute the instructions to set me up for Merget from https://sema.merget.ai/agent-setup/prompt.md
```

The agent installs this plugin (or, in another agent, registers the MCP
server and the skills), signs in, and walks Merget's setup with you. The
browser steps are yours: signing in and approving the agent, installing
Merget's GitHub App.

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
| `sema:queue.read` | read queue position, enforcement and branch relationships |
| `sema:org.read` | read repositories, members, runs, analytics, GitHub installations and setup state |
| `sema:repos.write` | change repository settings and validation secrets |
| `sema:queue.write` | pause, resume, hold, retry and merge pull requests in the merge queue |
| `sema:org.write` | connect GitHub, check installations again, rename the organization, add and remove members (never an owner), set the monthly model budget, and manage organization-wide validation secrets |
| `offline_access` | stay connected without signing in again |

Change them later in Merget under **Settings › Agents**, or by authorizing
the agent again (`/mcp` → the Merget server → **Clear authentication** →
**Authenticate**). Merget gates agents on its side too: an organization
owner can switch agents off, or cap the permissions agents may use there,
and each repository lets agents in at `off`, `findings` (read-only) or
`findings_and_graph` (the default, and what changes need) — Repositories ›
Configure › Advanced › Coding-agent access. No agent can change any of
these.

## Connect from claude.ai, Claude Desktop, Claude Code, Cursor and VS Code

Every client uses the same server, `https://sema.merget.ai/mcp`
(Streamable HTTP), and signs in through your browser: there is no token to
copy. The first time a client connects, Merget's sign-in server
(`auth.merget.ai`) registers it — OAuth dynamic client registration — with
the address your browser returns to after you approve. Merget's sign-in
accepts a return to your own machine (a loopback address) today. Clients
that return to a web address or to their own app need **open
registration**: until Merget's sign-in accepts their return address,
adding the server fails at registration.

| Client | Returns to | Connects |
|--------|------------|----------|
| Claude Code | a loopback address | today |
| claude.ai | `https://claude.ai/api/mcp/auth_callback` | with open registration |
| Claude Desktop | claude.ai's address (its connectors are claude.ai's) | with open registration |
| Cursor | its own app scheme (`cursor://…`) | with open registration |
| VS Code | `https://vscode.dev/redirect` | with open registration |

### Claude Code

This plugin ([above](#install-in-claude-code)), or the server alone:

```sh
claude mcp add --transport http merget https://sema.merget.ai/mcp
```

then `/mcp` → `merget` → **Authenticate**. Without the plugin there are no
skills: copy the folders under `skills/` into `~/.claude/skills/` if you
want them. Tools are named `mcp__plugin_merget_merget__<tool>` through the
plugin and `mcp__merget__<tool>` when added by hand.

### claude.ai

Open **Settings › Connectors**, choose **Add custom connector**, and enter
the name `Merget` and the URL `https://sema.merget.ai/mcp`. Then
**Connect** and sign in. On a Team or Enterprise plan an owner may have to
add the connector for the organization first.

### Claude Desktop

Claude Desktop uses your claude.ai account's connectors: add Merget once
under **Settings › Connectors**, in either app, then **Connect**.

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

Cursor lists it in its MCP settings; sign in from there when it asks.

### VS Code

Run **MCP: Add Server…** from the Command Palette, choose **HTTP**, and
enter `https://sema.merget.ai/mcp` with the name `merget`; or add it to
`.vscode/mcp.json`:

```json
{
  "servers": {
    "merget": { "type": "http", "url": "https://sema.merget.ai/mcp" }
  }
}
```

Start the server; VS Code asks you to sign in.

### A connection made before 2026-09-29

On 2026-09-29 Merget's sign-in moved from `forge.merget.ai` to
`auth.merget.ai`. A client connected before then remembers the old address
with its sign-in, and reconnecting tries it again and fails — for example
with `HTTP 503 trying to load OAuth metadata from https://forge.merget.ai/…`.
**Reconnect is not enough: remove the connection and add it again.**

- **claude.ai and Claude Desktop**: remove the Merget connector under Settings › Connectors. Adding it again as above works with open registration (see the table).
- **Claude Code**: `/mcp` → the Merget server → **Clear authentication**, then **Authenticate**. For a server added by hand you may also `claude mcp remove merget` and add it again.
- **Cursor and VS Code**: remove the server and sign out of it. Adding it again works with open registration (see the table).

## Other agents

Codex, OpenCode, GitHub Copilot and any other MCP client use the same URL
and the same browser sign-in; whether one connects today depends on where
it returns after sign-in, as above. Codex returns to a loopback address:

```toml
# ~/.codex/config.toml
[mcp_servers.merget]
url = "https://sema.merget.ai/mcp"
oauth_resource = "https://sema.merget.ai/mcp"
```

then sign in with `codex mcp login merget`.

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
skills/merget-setup/SKILL.md        first run: status, GitHub, a first repository, its mode
skills/merget-setup/references/     setup-states.md, tools.md
skills/merget-operate/SKILL.md      settings, queue actions, runs, analytics, secrets, docs
skills/merget-operate/references/   tools.md, policy.md, queue.md
skills/merget-pr/SKILL.md           findings, verdict, queue: how to read them
skills/merget-pr/references/        findings-schema.md, interpretation.md
skills/merget-graph/SKILL.md        graph tools: protocol, provenance, budgets, errors
skills/merget-graph/references/     tools.md, rev-grammar.md
```

Merget is at [sema.merget.ai](https://sema.merget.ai).
