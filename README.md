# Merget

Connects Claude Code to Merget — the semantic merge queue — through the
remote MCP server at `https://sema.merget.ai/mcp`, and adds two skills:

- **merget-pr** — read and interpret a pull request's Merget findings, verdict, brief, queue position and enforcement state (`merget_pr_findings`, `merget_pr_runs`, `merget_run_findings`, `merget_queue_status`).
- **merget-graph** — typed queries over Merget's code property graphs of any commit: symbols, callers, callees, def-use, slices, graph diff, a finding's slice, a PR side's intent (`merget_graph_*`). Merget builds a commit's graph on first use, so the first call on a fresh commit may answer `graph_pending` and succeed on the retry.

Both skills only read: they never change a pull request, a branch or a queue.

> The tool ids and the CLI still carry `sema`, Merget's internal codename for
> the merge queue. They are the API's names today; renaming them is a
> versioned API change and will land with its own release.

## Install in Claude Code

```
/plugin marketplace add MergetAI/merget-claude-plugin
/plugin install merget@merget-queue
```

The second command opens the plugin's details: pick a scope, and the plugin
is active once the install summary says so. When it says
`Run /reload-plugins to activate`, Claude Code reloads for you; if it warns
that the reload would invalidate the prompt cache instead, run
`/reload-plugins --force` or start a new session.

### Updating

Claude Code updates plugins from this marketplace only when you turn on
auto-update for it (`/plugin` → Marketplaces → `merget-queue`). Otherwise run
`claude plugin update merget@merget-queue`, or **Update now** on the plugin
in `/plugin` → Installed, then `/reload-plugins` in an open session.

### Upgrading from 0.2.0

0.2.0 had you add a server of your own, `merget`, whose header helper asks
the `sema` CLI for a token. Remove it before you sign in, along with any
other `merget` server you added yourself:

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

Any other client you set up from 0.2.0 still sends the `SEMA_TOKEN` bearer:
delete what sends it — the `bearer_token_env_var` line (Codex), the
`headers` entry (Cursor), or the same header in another client — then sign
in as [Other agents](#other-agents) describes.

## Sign in

Run `/mcp`, select the Merget server — `plugin:merget:merget` — and
authenticate. Claude Code opens Merget's sign-in service,
`https://auth.merget.ai`, in your browser: sign in with your Merget account
and its second factor, check the consent page and select **Approve**, or
continue as [you approved before](#when-you-approved-before). There is
nothing else to install and no token to copy; Claude Code keeps the tokens
itself. If `/mcp` lists a server named `merget` instead, one you added
yourself is in the way: remove it as
[Upgrading from 0.2.0](#upgrading-from-020) describes.

You need a Merget account with a second factor set up, in an organization
that uses Merget; without such an organization the consent page has nothing
to approve.

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
  marks a client Merget vouches for: its own CLI, or a web address of
  Claude's (`claude.ai`, `claude.com`) or VS Code's (`vscode.dev`,
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
- **It will be allowed to** — one line per scope on offer. For the read
  scopes and `offline_access`, the lines are:

| Scope | What the page says |
|---|---|
| `merget:findings.read` | Read pull-request and run findings, merge briefs and repository summaries |
| `merget:graph.read` | Read graph tools over any commit Merget has built |
| `merget:queue.read` | Read queue position, enforcement and branch relationships |
| `offline_access` | Stay connected without signing in again |

- **Organization** — one of your organizations that uses Merget, or **All
  my organizations**.

Approve only a connection you started yourself. **Approve** grants the
client the access the page describes, for the organization chosen;
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
published identity, such as Claude Code with claude.ai's, or about Merget's
CLI. When you already approved this request — the same permissions, sent
to the same place — and that approval still stands and was given or last
used in the last 90 days, the page names the application and the
organization you approved, says where access goes, and reads either

- **Continue as before?**, when your browser was already signed in to
  Merget: select **Continue as** and your name to approve it again; or
- **Continuing as before…**, when you have just signed in on that page: it
  approves by itself after a moment.

Continue only if you just started this yourself. **Stop and review** shows
the whole consent page instead, to choose another organization or select
**Deny**. You get the whole page anyway when you approved the client for
more than one organization, and always for a client that registered itself
(`dcr_…`), which has a new registration for each connection.

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
claude.ai's published identity. To choose another organization or pick up
a scope, first revoke the client in Merget's dashboard (Settings → Agents →
**Authorized agents**), then do the same, or select **Stop and review** on
a page that continues as before. Revoking it there is also how you cut a
client off.

Access is gated on the Merget side too: an organization owner can switch
agents off (dashboard → Settings → Agents) and each repository can allow
`off`, `findings` or `findings_and_graph` (Repositories → agent access).

## Other agents

Any MCP client with OAuth support connects the same way: add the remote
(Streamable HTTP) server `https://sema.merget.ai/mcp` and connect. Merget's
401 names `https://sema.merget.ai/.well-known/oauth-protected-resource/mcp`,
which points at `https://auth.merget.ai`; the client registers itself there
(RFC 7591) — or, when it has a published identity, presents that instead,
as Claude Code does — runs the PKCE flow and opens the consent page above.

**Claude Code without the plugin** —
`claude mcp add --transport http --scope user merget https://sema.merget.ai/mcp`,
then `/mcp`. Use it instead of the plugin, not alongside it: a server you
add yourself at that address takes precedence over the plugin's.

**Claude on the web and Claude Desktop** — Customize → Connectors →
**Add** → **Add custom connector**: name it Merget, enter
`https://sema.merget.ai/mcp`, choose **Register automatically** under
**OAuth client**, then connect it and sign in. On a Team or Enterprise plan
an owner adds it (Organization settings → Connectors) and each member
connects. Once connected, it is available in the Claude apps for iOS and
Android too. A connector added before Merget's sign-in moved to
`auth.merget.ai` has to be removed and added again: **Reconnect** keeps
using the old address.

**Codex** — in `~/.codex/config.toml`, then run `codex mcp login merget`:

```toml
[mcp_servers.merget]
url = "https://sema.merget.ai/mcp"
```

**Cursor** — in `~/.cursor/mcp.json`, or `.cursor/mcp.json` in a project:

```json
{
  "mcpServers": {
    "merget": { "url": "https://sema.merget.ai/mcp" }
  }
}
```

**VS Code** — in `.vscode/mcp.json`, or the file **MCP: Open User
Configuration** opens; VS Code registers itself on the first connection and
opens the browser:

```json
{
  "servers": {
    "merget": { "type": "http", "url": "https://sema.merget.ai/mcp" }
  }
}
```

**OpenCode** — in `opencode.json` in a project, or
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

**Without OAuth**, a client sends a bearer token in the `Authorization`
header instead; most can read it from the environment (Codex:
`bearer_token_env_var = "SEMA_TOKEN"`; Cursor:
`"Authorization": "Bearer ${env:SEMA_TOKEN}"` under `headers`). Merget's CLI
([on request](#the-cli-on-its-own)) gets one: sign it in once with
`sema login`, then, before starting the client, run

```
export SEMA_TOKEN="$(SEMA_TOKEN= sema token print)"
```

`SEMA_TOKEN=` keeps the CLI from printing back a token already exported; it
prints its own, renewed when close to expiring. That token expires within
the hour (`sema whoami` shows when) and the client never renews it: when
calls start failing with 401, run the line again and restart the client.
Keep the token out of anything you share.

The skills are plain markdown under `skills/`; copy them into the agent's
skill directory when it supports one (Codex: `~/.agents/skills/`), or into
`.cursor/rules/` as rules.

## The CLI on its own

`sema`, Merget's CLI, is available on request from hello@merget.ai.

```
sema login                  # sign in through the browser, once
sema pr owner/repo#N        # the findings document; exit 2 when findings block
sema graph callers --repo owner/name --rev pr:N:head --at src/x.rs:42
sema whoami                 # subject, client, scopes, org, expiry
```

`sema graph` exits `3` while a commit's graph is still being built. In CI set
`SEMA_TOKEN` (and `SEMA_API_URL` for a deployment other than
`https://sema.merget.ai`); it is used verbatim and never refreshed.

## Layout

```
.claude-plugin/marketplace.json     the marketplace this repository publishes
.claude-plugin/plugin.json          plugin manifest
.mcp.json                           the MCP connection (type http, URL, tool titles)
CHANGELOG.md                        what each plugin version changed
skills/merget-pr/SKILL.md           findings, verdict, queue: how to read them
skills/merget-pr/references/        findings-schema.md, interpretation.md
skills/merget-graph/SKILL.md        graph tools: protocol, provenance, budgets, errors
skills/merget-graph/references/     tools.md, rev-grammar.md
```

Merget is at [sema.merget.ai](https://sema.merget.ai).
