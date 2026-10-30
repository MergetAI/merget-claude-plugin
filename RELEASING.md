# Releasing Merget's plugin

The version lives in one place, `packaging/source.json`, and
`packaging/build.mjs` writes it into every manifest. A release is that bump
landing on `main`; CI tags it and publishes it.

## Cut a version

1. Set `version` in `packaging/source.json`. Nothing else carries a version
   by hand.
2. Run `node packaging/build.mjs`. It rewrites `.claude-plugin/plugin.json`,
   `.claude-plugin/marketplace.json`, `.mcp.json`, `plugin.json`, `mcp.json`,
   `.antigravity-plugin/plugin.json` and `server.json`.
3. Add the entry at the top of `CHANGELOG.md`, headed `## X.Y.Z — YYYY-MM-DD`
   (an em dash; `--check` reads the heading).
4. Run what CI runs:

   ```sh
   node packaging/build.mjs --check --base origin/main
   node packaging/build.mjs --validate
   for s in skills/*/; do npx -y skills-ref@0.1.5 validate "$s"; done
   claude plugin validate --strict .
   ```

   `--check` also rejects a client-specific tool prefix outside
   `skills/merget-setup/references/clients.md`, and the server's old product
   name (as a tool prefix or as a word) anywhere but its host name and the
   CHANGELOG: user-facing copy says Merget. `--base <ref>` adds the release
   rule: when a file a client reads changed since `<ref>` — anything outside
   `.github/`, `packaging/`, `README.md`, `RELEASING.md`, `CHANGELOG.md` and
   `PR-BODY.md` — the version must differ from the one on `<ref>`. Clients
   that pin the version (Claude Code, Codex, Copilot, Devin) fetch a new copy
   only when the version string changes, so a change to a skill without a
   bump reaches nobody. CI also runs ajv over the schema pairs `--validate`
   checks; see "Refreshing the pinned schemas".
5. Open a pull request. `.github/workflows/validate.yml` runs the same
   commands (with `--base` set to the pull request's base) and installs the
   plugin from the checkout into a clean home in Claude Code, Copilot CLI
   and Codex CLI.
6. Merge. `.github/workflows/release.yml` runs when `packaging/source.json`
   changes on `main`; when the version there has no `vX.Y.Z` tag yet, it
   tags it and creates a GitHub release whose notes are the CHANGELOG
   section and whose asset is a zip of the plugin (without `.git`, `.github`
   and `packaging/schemas`).
7. For the MCP Registry, run **Publish to the MCP Registry** under Actions
   (`registry-publish.yml`, manual). It publishes `server.json` as
   `ai.merget/merget`.

## Manual checks

CI cannot open a browser or run every client. Before announcing a release:

- `agy plugin validate --strict .` where Antigravity's CLI is installed. It
  decides whether `logo` in `.antigravity-plugin/plugin.json` resolves from
  the plugin root (what we emit) or from the manifest's folder, and whether
  the root `plugin.json` and `mcp.json` sit well beside it.
- Sign in through the browser from each client, with the commands the README
  gives: Claude Code, Codex, Copilot CLI, VS Code, Cursor, Devin, Kiro,
  Antigravity, Gemini CLI, Amp, Warp, OpenCode, Replit, claude.ai or Claude
  Desktop, and the ChatGPT desktop app. Record the client version and the
  date.
- Open the four one-click links (Cursor, Kiro, Replit, VS Code).
- Bump a copy's version and watch one plugin client update it.
- On the consent page, check the **Known client** badge still names the
  trusted hosts.

## One-time setup for the MCP Registry

The namespace `ai.merget/merget` is proven by DNS. Follow the DNS section of
<https://modelcontextprotocol.io/registry/authentication>: generate an
Ed25519 key, publish the TXT record it describes on `merget.ai`, and store
the private key's hex (the value `mcp-publisher login dns --private-key`
takes) as the repository secret `MCP_PUBLISHER_TOKEN`. The workflow then runs
`mcp-publisher login dns --domain merget.ai` and `mcp-publisher publish`.

## Refreshing the pinned schemas

`packaging/schemas/` holds the schemas `--validate` checks against. Refresh
one with `curl`, then run `--validate`: it fails when a file's `$id` no longer
matches the URL pinned in `build.mjs`.

`--validate` is the generator's own validator, written for the subset of JSON
Schema these four schemas use: `type`, `enum`, `const`, `required`,
`properties`, `additionalProperties`, `propertyNames`, `items`, the length and
count bounds, `pattern`, local `$ref`, `allOf`, `anyOf`, `oneOf` and `not`.
It ignores `format`, `patternProperties`, `if`/`then`, `dependentRequired`
and `unevaluatedProperties`, so a refreshed schema that reaches for one of
those would validate silently. That is why CI's "with ajv" step runs the
reference implementation over the same pairs (the `validateWith` lists in
`build.mjs`); after refreshing a schema, run that step's commands too. The
registry schema is draft-07 and carries an `example` keyword ajv's strict mode
rejects, hence `--strict=false` for that one pair.

| File | Source |
|------|--------|
| `agent-plugins-plugin.schema.json` | <https://agent-plugins.org/schemas/1.0.0/plugin.schema.json> |
| `agent-plugins-mcp.schema.json` | <https://agent-plugins.org/schemas/1.0.0/mcp.schema.json> |
| `antigravity-plugin.schema.json` | <https://antigravity.google/schemas/v1/plugin.json> |
| `mcp-registry-server.schema.json` | <https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json> |

## Open items

- **LICENSE.** None chosen yet. Once it is: add the `LICENSE` file, set
  `"license": "<SPDX id>"` in `packaging/source.json` (`build.mjs` then
  emits it into every manifest that takes a license), and add `license:` to
  each skill's frontmatter.
- **Directory listing fields.** `claude plugin validate --profile directory`
  (what Anthropic's directory runs) also wants a `privacyPolicyUrl` for a
  plugin that connects to a remote server. Add it to `source.json` and emit
  it from `build.mjs` into `.claude-plugin/plugin.json` once the URL is
  live. The URLs the directories ask for, checked 2026-10-30:
  - Privacy policy `https://merget.ai/legal/privacy-statement` and terms
    `https://merget.ai/legal/terms-of-service`: written (MergetAI/merget-web,
    `src/legal/`, routed under `/legal/<slug>`) but not served yet — today
    `merget.ai` redirects every `/legal/*` path to its home page, because
    the old site still answers there. Submit only once they load.
  - Support `https://sema.merget.ai/docs/help` (the docs' "Help and
    support" page) and security `https://sema.merget.ai/docs/security`,
    both live.
- **PNG logo.** Only `assets/logo.svg` ships. Every reader here accepts SVG,
  and rasterizing without a dependency is not worth a build step; add
  `assets/logo.png` when a directory asks for one.
- **Registry description.** `server.json` takes the 100-character `summary`
  from `source.json`, not the description, because the registry's schema caps
  it there.
