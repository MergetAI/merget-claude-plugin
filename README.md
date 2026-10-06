# Merget

Connects Claude Code to Merget — the semantic merge queue — through the
remote MCP server at `https://sema.merget.ai/mcp`, and adds four skills:

- **merget-setup** — the first run: where your organization stands (`merget_status`), the page in Merget's dashboard where you connect GitHub, enabling a first repository and choosing its automation mode from what GitHub lets Merget do there.
- **merget-operate** — Merget the way its dashboard runs it, short of an organization owner's steps: repository settings, the merge queue (retry, hold, merge what's ready, land), runs, analytics, a repository's validation secrets and the docs.
- **merget-pr** — read and interpret a pull request's Merget findings, verdict, brief, queue position and enforcement state (`merget_pr_findings`, `merget_pr_runs`, `merget_run_findings`, `merget_queue_status`).
- **merget-graph** — typed queries over Merget's code property graphs of any commit: symbols, callers, callees, def-use, slices, graph diff, a finding's slice, a PR side's intent (`merget_graph_*`). Merget builds a commit's graph on first use, so the first call on a fresh commit may answer `graph_pending` and succeed on the retry.

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
server and the skills), signs in, and walks Merget's setup with you; in
Claude Code it also offers to turn on the plugin's auto-update. The
browser steps and the owner's steps are yours: signing in and approving the
agent, and connecting GitHub, which an owner of your organization does in
Merget's dashboard — the agent gives you the page.

## Install in Claude Code

Claude Code keeps a plugin up to date only when auto-update is on for the
marketplace it came from. Auto-update is off for every marketplace outside
Anthropic's own, and a marketplace cannot turn it on for its users: you
turn it on in your settings or in `/plugin`
([Claude Code docs](https://code.claude.com/docs/en/plugins/host-marketplace#turn-on-auto-update)).
The settings below install the plugin with auto-update on, in one step.

### Install with auto-update on

Add these entries to your user settings, `~/.claude/settings.json`
(Windows: `%USERPROFILE%\.claude\settings.json`). Merge them into what the
file already has: keep your other settings, and when it already has an
`extraKnownMarketplaces` or `enabledPlugins` object, add the entry inside
that object rather than writing the key a second time.

```json
{
  "extraKnownMarketplaces": {
    "merget-queue": {
      "source": { "source": "github", "repo": "MergetAI/merget-claude-plugin" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "merget@merget-queue": true
  }
}
```

Then start a new Claude Code session. Once it has started, Claude Code adds
the `merget-queue` marketplace and downloads the plugin in the background;
when it says `Plugins changed. Run /reload-plugins to activate.`, run
`/reload-plugins` or start another session. `/plugin` then lists
`merget-queue` under Marketplaces and `merget` under Installed. If you added
the marketplace before, the same entry turns auto-update on for it from the
next session.

### Install with commands

```text
/plugin marketplace add MergetAI/merget-claude-plugin
/plugin install merget@merget-queue
/reload-plugins
```

The second command opens the plugin's details: pick a scope, and the plugin
is active once the install summary says so. The third loads it into the
session you are in. When the summary says `Run /reload-plugins to activate`,
Claude Code reloads for you; if it warns that the reload would invalidate
the prompt cache instead, run `/reload-plugins --force` or start a new
session.

These commands leave auto-update off. To turn it on, run `/plugin`, open
**Marketplaces**, select `merget-queue` and choose **Enable auto-update**.
Or add `"autoUpdate": true` to the `merget-queue` entry under
`extraKnownMarketplaces` in `~/.claude/settings.json` (adding the marketplace
writes that entry; if yours has none, add the entry shown
[above](#install-with-auto-update-on)); it applies from the next session.

### For a team

To set Merget up for everyone who works in a repository, commit the same
entries to the repository's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "merget-queue": {
      "source": { "source": "github", "repo": "MergetAI/merget-claude-plugin" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "merget@merget-queue": true
  }
}
```

Claude Code applies a repository's marketplace entries only after each
teammate accepts the trust dialog for the folder; from then on the plugin is
enabled for them in that repository, with auto-update on. The plugin loads
from the marketplace's own copy, so they run no install command. A teammate
who doesn't want it sets `"merget@merget-queue": false` in
`.claude/settings.local.json`. Cloud sessions don't read these entries.

For every machine in an organization, an administrator sets the same
entries in managed settings
([Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org#require-a-marketplace-and-its-plugins)).

### Updating

With auto-update on, Claude Code checks `merget-queue` in the background
after a session starts and downloads a new version of the plugin when there
is one. The session you are in keeps the version it loaded and says
`Plugin updated: merget · Run /reload-plugins to apply`; the next session
loads the new version either way. Setting `DISABLE_AUTOUPDATER`,
`DISABLE_UPDATES` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` turns
auto-update off unless `FORCE_AUTOUPDATE_PLUGINS=1` is set too.

Without auto-update, run `claude plugin update merget@merget-queue` in a
terminal, or **Update now** on the plugin in `/plugin` → Installed, then
`/reload-plugins` in an open session.

### Upgrading to 0.4.0

Merget renamed its tools: every tool id now starts with `merget_`, so
Claude Code names this plugin's tools
`mcp__plugin_merget_merget__merget_<name>`, such as
`mcp__plugin_merget_merget__merget_pr_findings` or
`mcp__plugin_merget_merget__merget_queue_action`. A permission rule that
names one of the old tools no longer matches: approve the tool again when
Claude Code asks, and write a rule that denied or asked about an old tool
again with the new name — until you do, it applies to no tool. A rule that
names only the server, `mcp__plugin_merget_merget`, still covers every
tool. The [CHANGELOG](CHANGELOG.md) lists the new names.

### Upgrading from 0.2.0

0.2.0 had you add a server of your own, `merget`, whose header helper
fetched a token for it. Remove it before you sign in, along with any other
`merget` server you added yourself:

```
claude mcp remove merget
```

Without `-s` the command finds the server in whichever scope it is in; when
one is in more than one scope, it names the command for each. Then delete
the helper, `~/.merget/mcp-headers.sh` (Windows:
`%USERPROFILE%\.merget\mcp-headers.ps1`). Claude Code connects one server
per address, and a server you add yourself takes precedence over the
plugin's: while one points at `https://sema.merget.ai/mcp`, `/mcp` lists it
and not `plugin:merget:merget`.

Any other client you set up from 0.2.0 still sends a bearer token from your
environment: delete what sends it — the `bearer_token_env_var` line
(Codex), the `headers` entry (Cursor), or the same header in another
client — then sign in as its section under
[Connect from claude.ai, Claude Desktop, Claude Code, Cursor and VS Code](#connect-from-claudeai-claude-desktop-claude-code-cursor-and-vs-code)
describes.

## Sign in

Run `/mcp`, select the Merget server — `plugin:merget:merget` — and choose
**Authenticate**, or ask Claude anything about Merget and let the first call
open the browser. Claude Code opens Merget's sign-in service,
`https://auth.merget.ai`, in your browser: sign in with your Merget account
and its second factor; on the consent page, untick any
[permission](#permissions) this agent should not have, choose the
organization (one, or all of yours) and select **Approve** — or continue as
[you approved before](#when-you-approved-before). There is nothing else to
install and no token to copy; Claude Code keeps the tokens itself. If `/mcp`
lists a server named `merget` instead, one you added yourself is in the
way: remove it as [Upgrading from 0.2.0](#upgrading-from-020) describes.

You need a Merget account with a second factor set up, in an organization
that uses Merget; without such an organization the consent page has nothing
to approve.

### Permissions

| Permission | Lets the agent |
|------------|----------------|
| `merget:findings.read` | read pull-request and run findings, merge briefs and repository summaries |
| `merget:graph.read` | use the graph tools on any commit Merget has built |
| `merget:queue.read` | read queue position, enforcement and branch relationships, and every repository's queue |
| `merget:org.read` | read repositories and their settings, members, runs, analytics, GitHub installations, setup state and the docs |
| `merget:repos.write` | change repository settings, including turning Merget on or off and the automation mode, manage a repository's validation secrets, and check GitHub installations again |
| `merget:queue.write` | hold, release, retry and merge pull requests in the merge queue, including merge anyway |
| `offline_access` | stay connected without signing in again |

No permission lets an agent take an owner's step. Change them later in
Merget under **Settings › Agents**, or by authorizing the agent again
([Signing in again](#signing-in-again)). Merget gates agents on its side
too: an organization owner can switch agents off, or cap the permissions
agents may use there (Settings › Agents), and each repository lets agents
in at `off`, `findings` (read-only) or `findings_and_graph` (the default,
and what changes need) — Repositories › Configure › Advanced › Coding-agent
access. No agent can change any of these.

### What the consent page shows

- **Application** — the name the client registered under. A client with a
  published identity, which it publishes at a web address instead of
  registering, is named by that address's host, with the name it gives
  itself underneath as the host's claim: Merget checked the address, not
  the name. Claude Code signs in with claude.ai's, so the page reads
  `claude.ai` — "claude.ai calls it “Claude Code”". Because Claude Code
  receives the approval on your computer, a line under it adds that any
  app on this computer can ask in claude.ai's name: approve only if you
  just started this yourself.
- **Sends access to** — where the approval goes: an address on your own
  computer, marked *(this computer)*, for a client that receives it there,
  as Claude Code and Cursor's desktop app do (`localhost (this computer)`);
  a hosted client's web address, such as `claude.ai`; or an app's own
  address, such as `cursor://anysphere.cursor-mcp`, which Cursor uses when
  it cannot start its callback on your computer. A **Known client** badge
  marks a client Merget vouches for, such as a web address of Claude's
  (`claude.ai`, `claude.com`) or VS Code's (`vscode.dev`,
  `insiders.vscode.dev`). Any other address off your computer reads
  "Merget doesn't recognize this application" — expected for a client
  Merget doesn't list, but check that the address belongs to the client
  you are connecting.
- **Client ID** — the id the client was given (`dcr_…` for one that
  registered itself), or the address of a published identity: Claude
  Code's is `https://claude.ai/oauth/claude-code-client-metadata`. A Claude
  Code that registered before Merget accepted published identities keeps
  its `dcr_…` registration until you clear its authentication
  ([Signing in again](#signing-in-again)).
- **Merget deployment** — `https://sema.merget.ai/mcp`.
- **It will be allowed to** — one checkbox per permission the client asks
  for, all ticked: the scope's name, with a line about it beneath, such as
  "Change repository settings and validation secrets" for
  `merget:repos.write`. **Stay connected without signing in again** is the
  `offline_access` box, which is not a permission. Untick what this agent
  should not have; at least one permission must stay ticked.
- **Organization** — one of your organizations that uses Merget, or **All
  my organizations**.

Approve only a connection you started yourself. **Approve** grants the
client the permissions you left ticked, for the organization chosen;
**Deny** grants nothing.

A client that asks for no particular scope is offered every permission its
registration allows, plus `offline_access` for a client that can use a
refresh token, as Claude Code and most MCP clients can. With
`offline_access` the client stays signed in: an access token lasts an hour,
and the client renews it on its own (a refresh token lasts 30 days and is
replaced each time it is used). A client granted no `offline_access` signs
in again when the hour is up.

### When you approved before

Merget remembers approvals: it does not ask you twice about a client with a
published identity, such as Claude Code with claude.ai's. When you already
approved this request — the same permissions, sent to the same place — and
that approval still stands and was given or last used in the last 90 days,
the page names the application and the organization you approved, says
where access goes, and reads either

- **Continue as before?**, when your browser was already signed in to
  Merget: select **Continue as** and your name to approve it again; or
- **Continuing as before…**, when you have just signed in on that page: it
  approves by itself after a moment.

Continue only if you just started this yourself. **Stop and review** shows
the whole consent page instead, to choose another organization or select
**Deny**. You get the whole page anyway when you approved the client for
more than one organization, and always for a client that registered itself
(`dcr_…`), which has a new registration for each connection.

A page that continues as before has no checkboxes: the new sign-in gets the
permissions switched on for that approval now, so one you switched off
stays off.

### Signing in again

When the server shows as failed — as one signed in before Merget moved its
sign-in to `auth.merget.ai` does — or Merget's sign-in page reads
**This sign-in link isn't valid** and says the app isn't registered, run
`/mcp`, select the Merget server, choose **Clear authentication** and
authenticate again. (A `dcr_…` registration lapses after two and a half to
three months without use, and Claude Code sends the one it kept until you
clear it.) When `/mcp` does not offer **Clear authentication**, run
`claude mcp logout plugin:merget:merget` in a terminal first. Either way
Claude Code signs this connection out at Merget too and deletes what it
stored for Merget, its registration included, so it signs in afresh, with
claude.ai's published identity.

To switch a permission on or off, use its switch in Merget's dashboard
(Settings › Agents › **Authorized agents**): no new sign-in is needed. To
choose another organization or add a permission the agent did not ask for
when it signed in, first revoke the client there, then sign in again as
above, or select **Stop and review** on a page that continues as before.
Revoking it there is also how you cut a client off.

## Connect from claude.ai, Claude Desktop, Claude Code, Cursor and VS Code

Every client uses the same server, `https://sema.merget.ai/mcp`
(Streamable HTTP), and every client with OAuth support signs in the same
way: it opens the Merget sign-in page in your browser, where you choose the
permissions and the organization it gets; you never handle a token.
Merget's 401 names
`https://sema.merget.ai/.well-known/oauth-protected-resource/mcp`, which
points at `https://auth.merget.ai`; the client registers itself there
(RFC 7591) — or, when it has a published identity, presents that instead,
as Claude Code does — runs the PKCE flow and opens
[the consent page](#what-the-consent-page-shows).

### Claude Code

This plugin ([above](#install-in-claude-code)), or the server alone:

```sh
claude mcp add --transport http merget https://sema.merget.ai/mcp
```

The server is added for the current project; add `--scope user` to use it
in every project. A server added this way is listed in `/mcp` as `merget`;
select it and choose **Authenticate**. Use it instead of the plugin, not
alongside it: a server you add yourself at that address takes precedence
over the plugin's. Without the plugin there are no skills: copy the folders
under `skills/` into `~/.claude/skills/` if you want them. Tools are named
`mcp__plugin_merget_merget__<tool>` through the plugin and
`mcp__merget__<tool>` when added by hand.

### claude.ai and Claude Desktop

1. Open **Customize › Connectors** and select **Add custom connector**.
2. Name it **Merget** and enter `https://sema.merget.ai/mcp` as its URL.
3. Leave the OAuth client ID and secret empty: Merget has none to give you. If the dialog offers **Authentication** and **OAuth client** choices, choose **Sign in now** and **Register automatically**, not **Use Claude's published identity**. You can't change these settings after you add the connector.
4. Select **Add**, then **Connect**, then sign in and approve the request in the browser window that opens.

Claude Desktop uses your claude.ai account's connectors, so one connector
serves both; once connected, it is available in the Claude apps for iOS
and Android too. On a claude.ai Team or Enterprise plan, an owner of that
claude.ai organization adds it (Organization settings › Connectors) and
each member connects.

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

When Cursor asks you to sign in to the server, it opens your browser. To
check the connection, open **Customize** in Cursor's sidebar and make sure
the merget server is turned on; if it still needs you to sign in, start the
sign-in from there.

### VS Code

Add the server to `.vscode/mcp.json` in your workspace, or, for every
workspace, to the file **MCP: Open User Configuration** opens — or run
**MCP: Add Server** from the Command Palette and choose **HTTP**:

```json
{
  "servers": {
    "merget": { "type": "http", "url": "https://sema.merget.ai/mcp" }
  }
}
```

Start the server from the file or the **MCP: List Servers** command, and
allow VS Code to sign in when it asks: it registers itself on the first
connection and opens your browser.

### Codex, OpenCode and other clients

Codex adds the server and signs in with:

```sh
codex mcp add merget --url https://sema.merget.ai/mcp
codex mcp login merget
```

or put the server in `~/.codex/config.toml` yourself, then run
`codex mcp login merget`:

```toml
[mcp_servers.merget]
url = "https://sema.merget.ai/mcp"
```

OpenCode: in `opencode.json` in a project, or
`~/.config/opencode/opencode.json`; it signs in when the server first
answers 401, or run `opencode mcp auth merget`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "merget": { "type": "remote", "url": "https://sema.merget.ai/mcp" }
  }
}
```

In any other client, add a remote (HTTP) server with the address above,
connect, and approve the sign-in; then list the server's tools to confirm
the connection.

### Without OAuth

A client without OAuth sends a bearer token in the `Authorization` header
instead (`Authorization: Bearer <token>`). Get the token by signing in to
Merget in your browser with an OAuth client of your own, as the HTTP API
page of the docs in Merget's dashboard describes under Authentication. An
access token lasts an hour, and a token passed this way is never renewed:
when calls start failing with 401, get a new one. Keep it out of anything
you share. If no client of yours can sign in, write to hello@merget.ai.

### A connection that stopped working

If a Merget connection that used to work stops connecting, and
**Reconnect** (or signing in again) does not help, make the client forget
what it saved: remove the connection and add it again, or in Claude Code
clear its authentication. Reconnecting reuses the sign-in details the client
saved when you first added the server, and Merget's sign-in moved from
`forge.merget.ai` to `auth.merget.ai` on 2026-09-29, so a connection added
before then keeps asking the old address — for example with
`HTTP 503 trying to load OAuth metadata from https://forge.merget.ai/…`.
A client that registered itself (`dcr_…`) can also keep a registration that
lapsed after two and a half to three months without use: Merget's sign-in
page then says the app isn't registered.

- **claude.ai and Claude Desktop**: under **Customize › Connectors**, remove the Merget connector, then add it again as above. On a Team or Enterprise plan, an owner removes it under **Organization settings › Connectors**.
- **Claude Code**: `/mcp` → the Merget server → **Clear authentication**, then **Authenticate**, as [Signing in again](#signing-in-again) describes. For a server added by hand you may also `claude mcp remove merget` and add it again.
- **Cursor and VS Code**: delete the `merget` entry and save, then add it back and sign in. If Merget's sign-in page says VS Code isn't registered, also run **Authentication: Remove Dynamic Authentication Providers** from the Command Palette and select the one for Merget.

If connecting keeps failing, write to [hello@merget.ai](mailto:hello@merget.ai)
with the client and its version, the time you tried and the server URL you
entered.

To change what a connected agent may do you don't need to reconnect: switch
its permissions in Merget under **Settings › Agents**.

## Skills in other agents

The skills are plain markdown under `skills/`; copy them into the agent's
skill directory when it has one (Codex: `~/.agents/skills/`), or into
`.cursor/rules/` as rules.

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
