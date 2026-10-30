# The `merget` server in each coding agent

Merget's MCP server is `https://sema.merget.ai/mcp`, named `merget` wherever a client asks for a name. Merget's plugin — repository `MergetAI/merget-plugin`, marketplace `merget-queue`, plugin id `merget@merget-queue` — ships that server and the four skills (`merget-setup`, `merget-operate`, `merget-pr`, `merget-graph`) in one install for the agents that take plugins; the others take the server by hand and the skills through the `skills` CLI. Every step below was checked against the vendor's documentation; where a vendor documents no step, this page says so rather than guessing.

The tools carry the names Merget's MCP server gives them (`merget_status`, …); a client may show them under a prefix of its own, named per client below. Signing in is the human's: the first tool call (or the client's sign-in button) opens Merget's sign-in in the browser, where they choose the permissions this agent gets and the organization. Merget's server registers OAuth clients dynamically, so no client id or secret is ever typed. An agent without a shell hands the commands below to the human.

## Claude Code

- **Install**: `/plugin marketplace add MergetAI/merget-plugin`, then `/plugin install merget@merget-queue` (opens the plugin's details; the human chooses a scope), then `/reload-plugins`. From a shell: `claude plugin marketplace add MergetAI/merget-plugin` and `claude plugin install merget@merget-queue`; the plugin loads at the next session or on `/reload-plugins`.
- **Listed as** `plugin:merget:merget` in `/mcp`; tools are `mcp__plugin_merget_merget__<name>`. A server added by hand — `claude mcp add --transport http merget https://sema.merget.ai/mcp` — is listed as `merget` with tools `mcp__merget__<name>`. Both at once: Claude Code connects once, to the hand-added server (a user-scope server ranks above a plugin's, matched by URL), and `/mcp` lists that one; keep one of the two.
- **Sign in**: `/mcp` → the server → **Authenticate**. **Sign in again**: `/mcp` → the server → **Clear authentication**, then **Authenticate** (**Re-authenticate** on the server does both in one step). From a shell, for a hand-added server: `claude mcp login merget`, `claude mcp logout merget`. `claude -p` runs have no `/mcp`: sign in from an interactive session first.
- **Reload**: `/reload-plugins`; the next session loads the new files anyway.
- **Update**: `claude plugin update merget@merget-queue`, or `/plugin` → **Installed** → merget → **Update now**. Auto-update is off for every third-party marketplace, `merget-queue` included, until someone turns it on: `/plugin` → **Marketplaces** → `merget-queue` → **Enable auto-update** (**Disable auto-update** turns it off again); it takes effect from the next session.
- **Offering auto-update as the agent** (the `merget-setup` flow's last step): read `~/.claude/settings.json` (Windows `%USERPROFILE%\.claude\settings.json`; under `CLAUDE_CONFIG_DIR` when that is set). When `extraKnownMarketplaces.merget-queue.autoUpdate` is already `true`, or the human says it is on, skip. Otherwise ask once, in one sentence, whether to turn on auto-update for Merget's plugin, so new skills and fixes arrive without them having to ask. **Never change the file without a clear yes.** On a yes:
  - set `"autoUpdate": true` on the `extraKnownMarketplaces.merget-queue` entry and leave its `source` exactly as it is (a changed source makes the marketplace be fetched again); with no such entry, add `"merget-queue": {"source": {"source": "github", "repo": "MergetAI/merget-plugin"}, "autoUpdate": true}` inside `extraKnownMarketplaces`, creating that object if the file has none;
  - merge, never replace: keep every other key and entry, write valid JSON, and read the file back to check that it parses. If the file does not parse to begin with, change nothing and tell the human.
  - On a no, leave the file alone; the **Marketplaces** tab turns it on later.

## Codex

Codex CLI and Codex in the ChatGPT desktop app take plugins; the IDE extension does not (server by hand there). The ChatGPT desktop app reads this repository's `.claude-plugin/marketplace.json` as a legacy-compatible marketplace; the Codex CLI commands below were verified with codex-cli 0.166.0 on 2026-10-30.

- **Install**: `codex plugin marketplace add MergetAI/merget-plugin`, then `codex plugin add merget@merget-queue` — or `/plugins` in Codex CLI, the marketplace's tab, install. Start a new session before using the skills or tools.
- **Server by hand**: `codex mcp add merget --url https://sema.merget.ai/mcp` writes `[mcp_servers.merget]` with `url = "https://sema.merget.ai/mcp"` to `~/.codex/config.toml`; then `codex mcp login merget`.
- **Sign in**: `codex mcp login merget` (or the browser prompt on first use). **Sign in again / clear**: `codex mcp logout merget`, then `codex mcp login merget`. Codex documents no tool prefix.
- **Reload**: a new session; in the desktop app, save the server and select **Restart**.
- **Update**: `codex plugin marketplace upgrade merget-queue` refreshes the marketplace; Codex documents no auto-update for plugins.
- **Skills only**: Codex reads `~/.agents/skills` (`npx -y skills add MergetAI/merget-plugin -a codex -g -y`).

## GitHub Copilot CLI

- **Install**: `copilot plugin marketplace add MergetAI/merget-plugin` (Copilot CLI reads `.claude-plugin/marketplace.json`), then `copilot plugin install merget@merget-queue`. In a session: `/plugin marketplace add MergetAI/merget-plugin`, then `/plugin install merget@merget-queue`.
- **Server by hand**: `copilot mcp add --transport http merget https://sema.merget.ai/mcp` writes `~/.copilot/mcp-config.json`; or `/mcp add` in a session.
- **Sign in**, and **sign in again**: `/mcp auth merget` opens the browser prompt. Copilot CLI documents no step that clears a sign-in, and no tool prefix.
- **Reload**: `/mcp reload`.
- **Update**: `copilot plugin update merget` (`--all` for every plugin) or `/plugin update merget@merget-queue`; `/plugin` flags a newer version with an **Update** action. Auto-update: on for the built-in `awesome-copilot` marketplace; a marketplace you added opts in with `"autoUpdate": true` on its `extraKnownMarketplaces.merget-queue` entry in Copilot CLI's user settings (`~/.copilot/settings.json`, or `settings.json` under `$COPILOT_HOME`; interactive and `-p` sessions only, skipped in CI). Offering it as the agent: the Claude Code procedure above, on that file — set `"autoUpdate": true` on the existing `extraKnownMarketplaces.merget-queue` entry, leave its `source` as it is, merge, never replace, and only on a clear yes; with no such entry, skip.

## Visual Studio Code (Copilot)

- **Install**: setting `"chat.plugins.marketplaces": ["MergetAI/merget-plugin"]`, then `/plugin install merget@merget-queue` in chat (or **Chat: Install Plugin from Source**). The plugin's server appears in the MCP server list and its skills under **Configure Skills**.
- **Server by hand**: `code --add-mcp '{"name":"merget","type":"http","url":"https://sema.merget.ai/mcp"}'`, the link `vscode:mcp/install?%7B%22name%22%3A%22merget%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fsema.merget.ai%2Fmcp%22%7D` (that JSON, URL-encoded), or `.vscode/mcp.json`: `{"servers": {"merget": {"type": "http", "url": "https://sema.merget.ai/mcp"}}}`.
- **Sign in**: accept the sign-in request when the server starts. VS Code's MCP docs give no step for signing out of a server or signing in again, and no tool prefix.
- **Restart**: **MCP: List Servers** → merget → **Restart Server** (or the server's **…** menu under **MCP Servers** in the Agent Customizations editor).
- **Update**: `/plugin update merget`, **Chat: Update Plugins**, or **Plugins** → **Check for and Apply Updates**; plugins update by themselves while `extensions.autoUpdate` is on.

## Cursor

Cursor takes Agent Plugins (root `plugin.json`) from its marketplace and, for Teams, from a repository imported under **Dashboard → Plugins & MCPs → Add Marketplace**; it documents no command that installs a plugin from a git repository for one user, so the route is the server plus the skills.

- **Server**: the link `cursor://anysphere.cursor-deeplink/mcp/install?name=merget&config=eyJ1cmwiOiJodHRwczovL3NlbWEubWVyZ2V0LmFpL21jcCJ9` (base64 of `{"url":"https://sema.merget.ai/mcp"}`), or `~/.cursor/mcp.json` (`.cursor/mcp.json` for one project): `{"mcpServers": {"merget": {"url": "https://sema.merget.ai/mcp"}}}`.
- **Skills**: `npx -y skills add MergetAI/merget-plugin -a cursor -g -y` (into `~/.cursor/skills/`).
- **Sign in**: Cursor runs the OAuth flow when the server connects; Cursor CLI: `agent mcp login merget` (`agent mcp list` shows the servers). **Sign in again**: Cursor renews the token with the refresh token; when none was issued, it asks again when the token expires. Cloud Agents sign out on the server's **Cloud** row under **Customize**; Cursor documents no other sign-out.
- **Restart**: edit the file and restart Cursor, or toggle the server off and on under **Customize**. No tool prefix is documented.
- **Cloud Agents**: the server is added from the MCP dropdown at cursor.com/agents; OAuth is per user.
- **Update**: `npx skills check`, then `npx skills update`.

## Devin

- **Install**: `devin plugins install MergetAI/merget-plugin` (`-y` skips the prompt; Devin reads `.claude-plugin/plugin.json` when a plugin has no `.devin-plugin/`), or in the web app **Customize › Plugins › Add plugin › From repository**, `MergetAI/merget-plugin`. The skills appear as `/<plugin>:<skill>`; no tool prefix is documented.
- **Server by hand**: web app **Customize › MCPs › Add MCP › Add custom MCP**, transport **HTTP**, Server URL `https://sema.merget.ai/mcp`, Authentication method **OAuth**, **Save**, then **Connect**. CLI: `devin mcp add merget https://sema.merget.ai/mcp`, then `devin mcp login merget`.
- **Sign in**: **Connect** (web; cloud sessions use that connection), `devin mcp login merget` (CLI). **Sign in again / clear**: `devin mcp logout merget`, then `devin mcp login merget`.
- **Reload**: installs and manifest changes apply to the next session.
- **Update**: `devin plugins update merget` (without a name, every plugin; starting a session fetches too); cloud sessions fetch at start. Skills only: `npx -y skills add MergetAI/merget-plugin -a devin -g -y` (into `~/.config/devin/skills`; without `-g`, the project's `.devin/skills`).

## Kiro

- **Install as a Power**: Powers panel → **Add Custom Power** → **Import power from GitHub** → `https://github.com/MergetAI/merget-plugin` → **Install** (the repository's root `plugin.json` and `mcp.json`).
- **Server by hand**: `~/.kiro/settings/mcp.json` (`.kiro/settings/mcp.json` for one workspace): `{"mcpServers": {"merget": {"url": "https://sema.merget.ai/mcp"}}}`; saving the file reconnects the servers. One click: `https://kiro.dev/launch/mcp/add?name=merget&config=%7B%22url%22%3A%22https%3A%2F%2Fsema.merget.ai%2Fmcp%22%7D` (that JSON, URL-encoded; Kiro shows what it will write before writing it). No tool prefix is documented.
- **Sign in**: Kiro opens the browser when it connects. **Sign in again**: **Re-authenticate** in the IDE's MCP panel when the token expires; Kiro CLI `/mcp auth` forces it and `/mcp logout` clears the stored credentials.
- **Update**: Powers panel → the power → **Check for updates** → **Install updates**.
- **Skills only**: `npx -y skills add MergetAI/merget-plugin -a kiro-cli -g -y` (the `skills` CLI's id for Kiro is `kiro-cli`; into `~/.kiro/skills/`).

## Google Antigravity and Gemini CLI

- **Install**: `agy plugin install https://github.com/MergetAI/merget-plugin` (root `plugin.json`). Antigravity namespaces a plugin's MCP tools as `<plugin-name>_<server-name>`, so `merget_merget`. A plugin that signs in with OAuth installs enabled and prompts in the browser when its server connects.
- **Server by hand**: `~/.gemini/config/mcp_config.json`: `{"mcpServers": {"merget": {"serverUrl": "https://sema.merget.ai/mcp"}}}`, or Settings → **Customizations** → **Add MCP** (the MCP Store).
- **Sign in**, and **again**: Agent settings → **Customizations** → **Authenticate** next to the server → sign in in the browser → paste the code → **Submit**. **Reload**: the refresh button in Customizations; Antigravity CLI `/mcp` reloads the configurations.
- **Update**: no command is documented; plugins installed in the Antigravity app update by themselves and show in the CLI's Installed tab.
- **Gemini CLI**: `gemini mcp add -s user --transport http merget https://sema.merget.ai/mcp` (writes `~/.gemini/settings.json`; without `-s user` the project's `.gemini/settings.json`), or `npx -y add-mcp https://sema.merget.ai/mcp -n merget -a gemini-cli -g -y`; by hand, `{"mcpServers": {"merget": {"httpUrl": "https://sema.merget.ai/mcp"}}}`. Sign in, and again when the token expires: `/mcp auth merget`. Tools are `mcp_merget_<name>`. Skills: `npx -y skills add MergetAI/merget-plugin -a gemini-cli -g -y`.

## Skills-only installs (the `skills` CLI)

- `npx -y skills add MergetAI/merget-plugin -a <agent> -g -y` installs the four skills for the user; without `-g`, into the project. Agent ids: `claude-code`, `codex`, `cursor`, `kiro-cli`, `gemini-cli`, `antigravity`, `github-copilot`, `devin`, `windsurf`, `opencode`, `amp`, `replit`. `-g` writes outside the project, which a sandboxed agent may need the human to approve. Skills are symlinked to one canonical copy; `--copy` copies them.
- **Update**: `npx skills check` (exit 1 when an update exists), then `npx -y skills update -g merget-setup merget-operate merget-pr merget-graph` (without `-g`, the project's copies).
- **Replit** reads installed skills from the project's `/.agents/skills` only (`npx -y skills add MergetAI/merget-plugin -a replit -y`, no `-g`). Its server: **Integrations** → **MCP Servers** → **+ Add MCP server**, Display name `Merget`, MCP Server URL `https://sema.merget.ai/mcp`, **Test & save** (which runs the OAuth flow), or the link `https://replit.com/integrations?mcp=eyJkaXNwbGF5TmFtZSI6Ik1lcmdldCIsImJhc2VVcmwiOiJodHRwczovL3NlbWEubWVyZ2V0LmFpL21jcCJ9`.
- The plugin installs above already ship the skills: never add them a second time there.

## Any other client

- **Server**: `npx -y add-mcp https://sema.merget.ai/mcp -n merget -a <agent> -g -y` (ids include `claude-code`, `codex`, `cursor`, `vscode`, `github-copilot-cli`, `kiro-cli`, `gemini-cli`, `antigravity`, `windsurf`, `cline`, `zed`, `junie`, `goose`, `factory-droid`, `opencode`; `-n merget` names the server, which add-mcp otherwise infers from the URL), or the portable JSON most clients read: `{"mcpServers": {"merget": {"type": "http", "url": "https://sema.merget.ai/mcp"}}}`. **Skills**: the `skills` CLI above, or copy the repository's `skills/` into the client's skills directory.
- **Sign in**: from the client's MCP settings — connect, authenticate or log in on the `merget` server, then sign in in the browser. **Sign in again**: log out of, disconnect or clear the server there, then connect again.
- **Amp**: `amp mcp add merget https://sema.merget.ai/mcp`; Amp opens the sign-in page in the browser when the server starts; `amp mcp oauth logout merget` clears it. **Warp**: **Settings → Agents → MCP servers → + Add** (a URL server), or `~/.warp/.mcp.json` with the portable JSON above; a server without credentials opens the browser flow, and the MCP Servers pane revokes them. **OpenCode**: in `opencode.json`, `"mcp": {"merget": {"type": "remote", "url": "https://sema.merget.ai/mcp", "enabled": true}}`, then `opencode mcp auth merget`; `opencode mcp logout merget` clears the stored credentials.
- **claude.ai and Claude Desktop** (chat, no skills): **Customize › Connectors** → **+ Add** → **Add custom connector**, name `Merget`, remote MCP server URL `https://sema.merget.ai/mcp`, **Continue**, keep **Use Claude's published identity (Recommended)**, **Add**; **Remove** on the connector clears it.
- **ChatGPT desktop app** (Codex host): **Settings › MCP servers** → **Add server** → **Streamable HTTP**, name `merget`, the URL, **Save**, **Restart**, then **Authenticate**; it shares `~/.codex/config.toml` with Codex CLI, so `codex mcp logout merget` then **Authenticate** signs in again. ChatGPT on the web reaches remote MCP tools through plugins only.

## Dead ends

- **Every tool twice, or one server shadowing the other**: a plugin and a hand-added server at the same URL give duplicate tools in most clients; Claude Code connects to the hand-added one only. Keep one — the plugin where the agent takes plugins — and remove the other.
- **Skills twice**: the plugin clients (Claude Code, Codex, Copilot, VS Code, Devin, Kiro, Antigravity) ship the skills; `npx skills add` there duplicates them.
- **No shell**: an agent that cannot run commands hands them to the human, with the file paths above as the fallback.
- **`-g` refused**: the `skills` and `add-mcp` CLIs write outside the project with `-g`; a sandboxed agent asks the human to approve, or installs into the project without `-g`.
- **Replit**: skills install per project only; `-g` has no place there.
- **`invalid_redirect_uri`, or "doesn't recognize this application"**, on sign-in: the client's redirect is not one Merget knows. Send the human to Merget's docs page for coding agents (`merget_docs` without `page` lists the pages; https://sema.merget.ai leads there too); never work around it with a client id or secret.
- **Headless and cloud runners** (Copilot's cloud coding agent, Amp Orbs, Warp Oz with a server given by URL, Kiro Web's custom servers, CI) cannot open Merget's sign-in: an agent key is coming; until then say so and do not invent a key format or header.
