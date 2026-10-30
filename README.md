# Merget

Merget is a semantic merge queue for GitHub. For every pull request it builds
code property graphs of the trees a merge involves, finds what the branches
break when they meet (references that stop resolving, interactions between
what each side changed, textual conflicts), writes a brief and orders the
merges; when a repository lets it, it prepares each pull request against the
code it will land on and merges it. It runs as a GitHub App and a service at
[sema.merget.ai](https://sema.merget.ai).

This repository is Merget's plugin for coding agents: one package that
connects an agent to Merget's MCP server, `https://sema.merget.ai/mcp`, and
ships four skills.

- **merget-setup** — the first run: where your organization stands, the page
  where you connect GitHub, a first repository and its automation mode.
- **merget-operate** — Merget as its dashboard runs it, short of an owner's
  steps: settings, the merge queue, failed batches, conflicts, runs, secrets.
- **merget-pr** — a pull request's findings, verdict, brief, queue position,
  enforcement state and credits.
- **merget-graph** — typed queries over any commit's code property graph:
  symbols, callers, callees, def-use chains, slices, graph diffs.

The server carries what an agent must know (tool descriptions, prompts,
instructions); the skills add depth. The agent acts as you, within the
permissions you grant when you sign in, never as an organization owner: the
owner's steps and the browser steps stay with a person in Merget's dashboard.

## Set up with one prompt

You need a Merget account and an organization first: sign up at
[sema.merget.ai](https://sema.merget.ai). Then paste this into your agent:

```text
Fetch and execute the instructions to set me up for Merget from https://sema.merget.ai/agent-setup/prompt.md
```

The agent installs this plugin (or, in an agent without plugins, registers
the server and the skills), signs in and walks Merget's setup with you. An
agent without a shell hands you the commands instead. Signing in, approving
the agent and connecting GitHub (an owner's step) stay yours, in the browser.

## Install

Plugin id `merget@merget-queue`, from the marketplace in this repository;
server `https://sema.merget.ai/mcp`. Pick one route per client. A plugin
ships the server and the skills together, so an agent that installed it needs
neither a hand-added server nor `npx skills`; a plugin and a hand-added server
at the same address give the agent every tool twice (or, in Claude Code, the
hand-added one shadows the plugin's), so keep one.

| Client | Install |
|--------|---------|
| Claude Code | `/plugin marketplace add MergetAI/merget-plugin`, then `/plugin install merget@merget-queue`, then `/reload-plugins` |
| Codex (CLI, ChatGPT desktop app) | `codex plugin marketplace add MergetAI/merget-plugin`, then `codex plugin add merget@merget-queue` |
| GitHub Copilot CLI | `copilot plugin marketplace add MergetAI/merget-plugin`, then `copilot plugin install merget@merget-queue` |
| VS Code (Copilot) | setting `"chat.plugins.marketplaces": ["MergetAI/merget-plugin"]`, then `/plugin install merget@merget-queue` |
| Cursor | the [one-click link](#cursor) or `~/.cursor/mcp.json`, plus `npx -y skills add MergetAI/merget-plugin -a cursor -g -y` |
| Devin, Devin Desktop | `devin plugins install MergetAI/merget-plugin` |
| Kiro | Powers panel › **Add Custom Power** › **Import power from GitHub** › `https://github.com/MergetAI/merget-plugin` |
| Google Antigravity | `agy plugin install https://github.com/MergetAI/merget-plugin` |
| Gemini CLI | `gemini mcp add -s user --transport http merget https://sema.merget.ai/mcp`, plus `npx -y skills add MergetAI/merget-plugin -a gemini-cli -g -y` |
| Replit Agent | the [one-click link](#replit-agent), plus `npx -y skills add MergetAI/merget-plugin -a replit -y` |
| claude.ai, Claude Desktop, ChatGPT | add the server as a [connector](#claudeai-claude-desktop-and-chatgpt) |
| Everything else | `npx -y add-mcp https://sema.merget.ai/mcp -n merget -a <agent> -g -y`, plus `npx -y skills add MergetAI/merget-plugin -a <agent> -g -y` |

### Claude Code

```text
/plugin marketplace add MergetAI/merget-plugin
/plugin install merget@merget-queue
/reload-plugins
```

Or put the marketplace and the plugin in `~/.claude/settings.json`, with
auto-update on, and start a new session:

```json
{
  "extraKnownMarketplaces": {
    "merget-queue": {
      "source": { "source": "github", "repo": "MergetAI/merget-plugin" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "merget@merget-queue": true }
}
```

To sign in, run `/mcp`, select `plugin:merget:merget` and choose
**Authenticate**; **Clear authentication** there lets you sign in again.
Claude Code prefixes the plugin's tools with its own plugin and server name,
as the merget-setup skill's `references/clients.md` spells out. Do not also
`claude mcp add` the same address: a server you add yourself takes precedence
over the plugin's, and `/mcp` lists it instead.

### Codex

The ChatGPT desktop app reads this repository's `.claude-plugin/marketplace.json`
as a legacy-compatible marketplace; the Codex CLI commands below were verified
with codex-cli 0.166.0 on 2026-10-30.

```sh
codex plugin marketplace add MergetAI/merget-plugin
codex plugin add merget@merget-queue
```

Or open `/plugins` in the Codex CLI, or the **Plugins** tab in the ChatGPT
desktop app, and install `merget` from the `merget-queue` tab. Start a new
session afterwards. The IDE extension has no plugins. Server only:
`codex mcp add merget --url https://sema.merget.ai/mcp`, then
`codex mcp login merget`; Codex reads skills from `~/.agents/skills`
(`npx -y skills add MergetAI/merget-plugin -a codex -g -y`).

### GitHub Copilot

Copilot CLI:

```sh
copilot plugin marketplace add MergetAI/merget-plugin
copilot plugin install merget@merget-queue
```

Server only: `copilot mcp add --transport http merget https://sema.merget.ai/mcp`.

VS Code: add `"chat.plugins.marketplaces": ["MergetAI/merget-plugin"]` to
your settings, then `/plugin install merget@merget-queue` in chat, or install
it from **Chat: Open Customizations** › **Browse**. Server only, with this
link or this command:

```text
vscode:mcp/install?%7B%22name%22%3A%22merget%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fsema.merget.ai%2Fmcp%22%7D
```

```sh
code --add-mcp '{"name":"merget","type":"http","url":"https://sema.merget.ai/mcp"}'
```

Copilot's cloud coding agent takes servers as JSON under the repository's
**Settings › Copilot › MCP servers**, with headers from a `COPILOT_MCP_*`
secret and no browser sign-in: see [Headless and cloud runners](#headless-and-cloud-runners).

### Cursor

One click, with the server's config base64-encoded:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=merget&config=eyJ1cmwiOiJodHRwczovL3NlbWEubWVyZ2V0LmFpL21jcCJ9
```

Or add it to `~/.cursor/mcp.json` (every project) or `.cursor/mcp.json`:

```json
{ "mcpServers": { "merget": { "url": "https://sema.merget.ai/mcp" } } }
```

Skills: `npx -y skills add MergetAI/merget-plugin -a cursor -g -y`. Cursor
installs Agent Plugins from a marketplace in **Customize**; a team admin adds
this repository under **Dashboard › Plugins & MCPs › Add Marketplace › Import
from Repo**. In the CLI, `agent mcp login merget` signs in. Cloud Agents use
the team's servers from that page and keep their own sign-ins, from the
server's **Cloud** row in Customize.

### Devin

```sh
devin plugins install MergetAI/merget-plugin
```

Devin reads `.claude-plugin/plugin.json`; the plugin loads in cloud sessions,
the CLI and Devin Desktop. Server only: **Customize › MCPs › Add MCP › Add
custom MCP**, transport HTTP, the server URL, authentication **OAuth**,
**Save**, then **Connect**; in the CLI, `devin mcp add merget https://sema.merget.ai/mcp`,
then `devin mcp login merget`. Skills alone:
`npx -y skills add MergetAI/merget-plugin -a devin -g -y`.

### Kiro

As a Power, which reads the root `plugin.json`, `mcp.json` and `skills/`:
Powers panel, **Add Custom Power**, **Import power from GitHub**, enter
`https://github.com/MergetAI/merget-plugin`, **Install**. Server only, in one
click:

```text
https://kiro.dev/launch/mcp/add?name=merget&config=%7B%22url%22%3A%22https%3A%2F%2Fsema.merget.ai%2Fmcp%22%7D
```

or in `.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json`
(user), with the same `mcpServers` JSON as Cursor's. Skills:
`npx -y skills add MergetAI/merget-plugin -a kiro-cli -g -y`. Kiro Web adds
custom servers by URL and headers only: see
[Headless and cloud runners](#headless-and-cloud-runners).

### Google Antigravity and Gemini CLI

```sh
agy plugin install https://github.com/MergetAI/merget-plugin
```

Server only: the MCP Store, or `~/.gemini/config/mcp_config.json` with
`{ "mcpServers": { "merget": { "serverUrl": "https://sema.merget.ai/mcp" } } }`,
then **Authenticate** next to the server under **Customizations**. Gemini
CLI: `gemini mcp add -s user --transport http merget https://sema.merget.ai/mcp`
(or `"httpUrl"` in `~/.gemini/settings.json`; without `-s user` it writes the
project's `.gemini/settings.json`), `/mcp auth merget` to sign in, and
`npx -y skills add MergetAI/merget-plugin -a gemini-cli -g -y`.

### Replit Agent

One click:

```text
https://replit.com/integrations?mcp=eyJkaXNwbGF5TmFtZSI6Ik1lcmdldCIsImJhc2VVcmwiOiJodHRwczovL3NlbWEubWVyZ2V0LmFpL21jcCJ9
```

Replit installs skills per project, into `/.agents/skills`, so run
`npx -y skills add MergetAI/merget-plugin -a replit -y` in each project, with
no `-g`.

### claude.ai, Claude Desktop and ChatGPT

In claude.ai or Claude Desktop: **Customize › Connectors**, **+ Add**, **Add
custom connector**; name it Merget, enter `https://sema.merget.ai/mcp`, keep
**Use Claude's published identity**, **Add**, then **Connect**. One connector
serves both apps. In the ChatGPT desktop app: **Settings › MCP servers**,
**Add server**, **Streamable HTTP**, name `merget`, the URL, **Save**,
**Restart**, then **Authenticate**; it shares `~/.codex/config.toml` with
Codex CLI, so `codex mcp logout merget` then **Authenticate** signs in
again. ChatGPT on the web reaches remote MCP tools through plugins only; a
general listing comes through OpenAI's directory later.

### Everything else

- Amp: `amp mcp add merget https://sema.merget.ai/mcp`.
- Warp: **Settings › Agents › MCP servers**, or `~/.warp/.mcp.json`.
- OpenCode: in `opencode.json`, `"mcp": { "merget": { "type": "remote", "url": "https://sema.merget.ai/mcp", "enabled": true } }`, then `opencode mcp auth merget`.
- Cline, Zed, JetBrains Junie, Goose, Factory Droid and the rest:
  `npx -y add-mcp https://sema.merget.ai/mcp -n merget -a <agent> -g -y`
  (`add-mcp list-agents` names them), then
  `npx -y skills add MergetAI/merget-plugin -a <agent> -g -y`; or the JSON
  `{"mcpServers":{"merget":{"type":"http","url":"https://sema.merget.ai/mcp"}}}`
  where the client keeps its servers.

A `-g` install writes under your home directory, which a sandboxed agent may
have to ask you to approve.

### Headless and cloud runners

A runner that cannot open a browser cannot sign in through OAuth: Copilot's
cloud coding agent (its servers take headers from `COPILOT_MCP_*` secrets;
OAuth is unsupported), Amp Orbs (no browser OAuth there; a remote definition
on ampcode.com, `amp mcp remote --personal add Merget https://sema.merget.ai/mcp`,
signs in there instead), Warp's Oz cloud agents with a server given by URL (a
managed MCP installation, authorized once under **Integrations** in the Oz
web app, works), Kiro Web's custom servers (URL and headers; OAuth is
documented only for Powers), CI. For those Merget will issue agent keys,
coming soon.

## Sign in

Every client signs in the same way: it opens Merget's sign-in service in your
browser, you sign in with your Merget account and its second factor, untick
any permission this agent should not have, choose the organization and select
**Approve**. There is no token to copy. The **Connect coding agents** page of
the docs in [Merget's dashboard](https://sema.merget.ai) explains the
permissions, the consent page, approving again, and what to do when the page
says **Merget doesn't recognize this application** or a client reports
`invalid_redirect_uri`. Change an agent's permissions later under
**Settings › Agents**, without a new sign-in.

## Updating

- Claude Code: `claude plugin update merget@merget-queue`, or turn auto-update
  on for `merget-queue` under `/plugin` › **Marketplaces**.
- Codex: `codex plugin marketplace upgrade merget-queue`. Copilot CLI:
  `copilot plugin update merget`, or `"autoUpdate": true` on the
  `extraKnownMarketplaces.merget-queue` entry in `~/.copilot/settings.json`.
  VS Code: `/plugin update merget`. Devin: `devin plugins update merget`.
  Kiro: the power's **Check for updates**.
- Skills installed with `npx skills` do not update by themselves:
  `npx -y skills update -g merget-setup merget-operate merget-pr merget-graph`.

The [CHANGELOG](CHANGELOG.md) says what each version changed.

## Development

`packaging/source.json` is the single source of the plugin's name, version,
description and addresses; `node packaging/build.mjs` writes every manifest
from it: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and
`.mcp.json` for Claude Code and the clients that read its format; `plugin.json`
and `mcp.json` for Agent Plugins 1.0 (Codex, Cursor, VS Code, Copilot, Kiro);
`.antigravity-plugin/plugin.json` for Antigravity; `server.json` for the MCP
Registry. The skills live under `skills/<name>/`.

`node packaging/build.mjs --check` fails when a manifest is out of date, the
CHANGELOG heading disagrees with the version, a skill breaks the Agent Skills
rules, or user-facing copy names a client-specific tool prefix; with
`--base <ref>`, also when a file a client reads changed since `<ref>` without
a version bump. `node packaging/build.mjs --validate` checks the generated
files against the schemas pinned in `packaging/schemas/`.
[RELEASING.md](RELEASING.md) says how a version is cut.
