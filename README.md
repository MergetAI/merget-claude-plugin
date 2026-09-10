# Merget

Connects Claude Code to Merget — the semantic merge queue — through the
remote MCP server at `https://sema.merget.ai/mcp`, and adds two skills:

- **merget-pr** — read and interpret a pull request's Merget findings, verdict, brief, queue position and enforcement state (`sema_pr_findings`, `sema_pr_runs`, `sema_run_findings`, `sema_queue_status`).
- **merget-graph** — typed queries over Merget's code property graphs of any commit: symbols, callers, callees, def-use, slices, graph diff, a finding's slice, a PR side's intent (`sema_graph_*`). Merget builds a commit's graph on first use, so the first call on a fresh commit may answer `graph_pending` and succeed on the retry.

Everything is read-only. Merget never changes a pull request, a branch or a
queue on an agent's behalf.

> The tool ids and the CLI still carry `sema`, Merget's internal codename for
> the merge queue. They are the API's names today; renaming them is a
> versioned API change and will land with its own release.

## Install in Claude Code

```
/plugin marketplace add MergetAI/merget-claude-plugin
/plugin install merget@merget-queue
```

Then authenticate. Merget's sign-in currently issues tokens to the `merget`
CLI rather than to MCP clients directly, so the plugin's server is configured
to ask the CLI for a bearer each time it connects:

```
cargo install --git https://github.com/MergetAI/sema --locked sema-cli   # installs `sema`
sema login --legacy
```

and add the server with a helper that prints the header (the CLI refreshes
the token before printing it, so the connection never goes stale):

```bash
# ~/.merget/mcp-headers.sh — chmod +x
printf '{"Authorization":"Bearer %s"}' "$(sema token print)"
```
```
claude mcp add-json merget '{"type":"http","url":"https://sema.merget.ai/mcp","headersHelper":"~/.merget/mcp-headers.sh"}' -s user
```

On Windows, save the helper as PowerShell instead:

```powershell
# %USERPROFILE%\.merget\mcp-headers.ps1
@{ Authorization = "Bearer " + (sema token print).Trim() } | ConvertTo-Json -Compress
```

When browser sign-in ships, the plugin's own server signs in on the first
401 — Claude Code reads
`https://sema.merget.ai/.well-known/oauth-protected-resource/mcp`, registers
itself (RFC 7591), runs the PKCE flow with
`resource=https://sema.merget.ai/mcp` and shows the consent page (client,
scopes, organization) — and the helper above can be deleted.

Access is gated on the Merget side too: an organization owner can switch
agents off (dashboard → Settings → Agents) and each repository can allow
`off`, `findings` or `findings_and_graph` (Repositories → agent access).

## Other agents

Codex, Cursor, OpenCode and any other MCP client use the same URL through
their MCP settings, with the same bearer until browser sign-in ships:

```toml
# Codex — ~/.codex/config.toml
[mcp_servers.merget]
url = "https://sema.merget.ai/mcp"
bearer_token_env_var = "SEMA_TOKEN"
```

```json
// Cursor — ~/.cursor/mcp.json
{
  "mcpServers": {
    "merget": {
      "url": "https://sema.merget.ai/mcp",
      "headers": { "Authorization": "Bearer ${env:SEMA_TOKEN}" }
    }
  }
}
```

Export `SEMA_TOKEN=$(sema token print)` before starting them; that token
lives an hour, so restart the client when it expires (or use the header
helper above, which refreshes).

The skills are plain markdown under `skills/`; copy them into the agent's
skill directory when it supports one (`~/.codex/skills/`), or into
`.cursor/rules/` as rules.

## The CLI on its own

```
sema pr owner/repo#N        # the findings document; exit 2 when findings block
sema graph callers --repo owner/name --rev pr:N:head --file src/x.rs --line 42
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
