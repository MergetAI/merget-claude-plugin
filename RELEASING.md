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

## Submissions

What each directory asks for, read from the vendors' own pages on 2026-10-30
and checked a second time against them. Re-read a vendor's page on the day
of the submission: two of the four changed in the month before this was
written. Nothing here is submitted by CI; every step below is a person's.

### Before any submission

- **The repository name.** Every manifest, README line and install command
  says `MergetAI/merget-plugin`. Cursor pins the reviewed commit and builds
  its logo URLs from the repository name and that commit; Anthropic's portal
  fixes the repository and folder when the submission is created and never
  lets them change. Rename first, then land the release on the default
  branch, then submit.
- **A LICENSE.** Cursor lists only open-source plugins and its Publisher
  Terms (§3.3) allow permissive licences only (MIT, BSD, Apache-2.0; no GPL,
  LGPL or AGPL). Anthropic's directory refuses a plugin with neither a
  `LICENSE` file nor `license` in `plugin.json` (`LICENSE_MISSING`).
  Antigravity recommends `license`; Devin does not ask.
- **Privacy policy and terms pages that load.** Cursor's Publisher Terms
  (§4.2) make the publisher warrant that both are visible to everyone who
  installs through the marketplace. Anthropic's Software Directory Policy
  requires a privacy policy for software that connects to a remote service,
  the connector submission asks for its URL, and the directory reads
  `privacyPolicyUrl` from `.claude-plugin/plugin.json`. Devin's and
  Antigravity's intakes do not ask, though accepted Devin submissions listed
  both. Today `merget.ai/legal/*` redirects to the home page (see Open
  items).
- **The logo.** `assets/logo.svg` is a 128×128 square with the mark
  centred, 12 px of padding at the sides and 19 px above and below, which
  is what Antigravity requires
  (≥ 128×128, 1:1, legible on light and dark) and what Devin's maintainers
  ask for on review. `assets/logo.png` is a 1024×1024 transparent PNG of the
  mark's flat variant for the readers whose icon handling of SVG is not
  documented (Anthropic's `icon`, Cursor's cards). It was rendered once from
  the `#pyramid-flat` group in the SVG with Pillow at 4× and downsampled;
  render it again the same way whenever the mark changes.
- **The server as the clients see it.** `POST https://sema.merget.ai/mcp`
  without a token answers 401 with `WWW-Authenticate: Bearer
  resource_metadata="https://sema.merget.ai/.well-known/oauth-protected-resource/mcp"`;
  that document names `https://auth.merget.ai`, whose metadata advertises
  dynamic client registration, PKCE `S256`, `token_endpoint_auth_methods_supported`
  `["none"]` and client ID metadata documents. Every directory below expects
  exactly that: a bare `url`, OAuth handled by the client. Before each
  submission, sign in once from that client and confirm its redirect URI was
  accepted at registration: Cursor uses
  `https://www.cursor.com/agents/mcp/oauth/callback` (web and Cursor Agents)
  and `http://localhost:8787/callback` (desktop); Devin's cloud uses
  `https://api.devin.ai/mcp/oauth/callback`; Antigravity documents
  `https://antigravity.google/oauth-callback` only for hand-entered
  credentials, so its registration redirect is learned from the sign-in.

### Anthropic's directory (claude.ai/directory)

The directory is the catalog on claude.ai; one listing reaches claude.ai,
Cowork and Claude Code, where it loads as `merget@synced` and syncs once per
start (Claude Code 2.1.273+). It is self-serve at
<https://claude.ai/directory/manage> for anyone on a paid plan (Pro, Max,
Ultra, or an Owner on Team and Enterprise). The first organization to submit
a repository and folder holds that listing; the repository may be private
while validating but must be public before publishing; an organization may
create ten submissions a day. `claude-plugins-official` takes no submissions
through the portal and is a separate ask to an Anthropic partner contact,
and the `claude-code-hint` CLI prompt exists only for plugins listed there.

1. `claude plugin validate . --profile directory` locally (Claude Code
   2.1.314 has the flag; CI runs it as an advisory step). Today it refuses on
   `LICENSE_MISSING` and warns on `PRIVACY_URL_MISSING`; both go with the
   items above. The portal adds what the CLI cannot: a taken name, file
   limits, symlinks, launchers and the safety scan. The README is the
   listing's long description and must be at least 40 words outside code
   blocks.
2. **Submit new → Plugin bundle**: repository `MergetAI/merget-plugin`, plugin
   path empty, tracked branch or tag empty (the default branch) or a release
   tag the release workflow creates. **Validate**, fix every *Blocks*
   finding, validate again (a result applies to one commit).
3. **Listing details** come from `plugin.json` and the README. **Data
   handling** asks what personal data the plugin handles, where it goes, how
   long it is kept and whether under-18s may use it. **Compliance** wants a
   contact address and four acknowledgements. **Review and submit** keeps
   the GitHub push webhook (repository admin needed to install it) and the
   auto-publish toggle.
4. After the scan passes, select **Publish**. Under the default setting an
   Anthropic reviewer publishes each version, so every release means a
   return to the portal until Anthropic grants auto-publish; the last
   published version keeps serving meanwhile. *Approved* is not installable;
   *Published* is. Review time is not fixed. Contact: directory@anthropic.com
   (plugins), mcp-review@anthropic.com (connectors).
5. Also submit the **MCP connector** for `https://sema.merget.ai/mcp` and pair
   it with the plugin listing (same organization, same URL) so a person who
   has both sees one set of tools. The connector form wants a documentation
   URL, the privacy URL, a support contact, an icon, a reviewer test account
   with a Merget organization that has runs, three example prompts, and
   every tool with a `title` and `readOnlyHint` or `destructiveHint`.

Two copies of the plugin on one machine: a plugin installed from
`merget-queue` outranks the synced copy, which Claude Code reports as not
loaded; a server added in Claude Code outranks a claude.ai connector at the
same URL. What Claude Code does with two same-named skills from two plugins
is not documented, so the docs keep recommending one route per person:
`merget@merget-queue` for Claude Code, the directory for claude.ai and Cowork.

### Cursor Marketplace

A manual review of a public Git repository, submitted at
<https://cursor.com/marketplace/publish> by the Cursor account that will own
the listing (there is no company publisher yet; staff ask for "company
submission on behalf of Merget AI" and a contact address in the description).
No status page and no SLA; the team answers by email, and
marketplace-publishing@cursor.com is the escalation. Plugins are pinned to
the reviewed commit, so every later release needs an email asking for a
re-index. Read <https://cursor.com/marketplace-publisher-terms> (2026-05-06)
first: open source only, no fees, a support obligation, security incidents
reported to legal@cursor.com, removal at Anysphere's discretion.

Cursor loads the root `plugin.json` as an Agent Plugin already (it needs the
`$schema` line, which `build.mjs` emits). The marketplace card, though, reads
`displayName`, `logo`, `category` and `tags` from `.cursor-plugin/plugin.json`
(a closed schema; only `name` is required), which the Agent Plugins manifest
cannot carry, and Cursor documents no precedence when both manifests exist.
Decision at submission time: add a `.cursor-plugin/plugin.json` target to
`build.mjs` (name, displayName, description, version, author, homepage,
repository, license, keywords, `category` such as `developer-tools`, `logo`,
and `"mcpServers": "./.mcp.json"` as Zapier's listed plugin does), then test
by copying (never symlinking) the repository to
`~/.cursor/plugins/local/merget`: four skills, one server named
`plugin-merget-merget`, the logo on the card, a completed sign-in. Only that
test shows which manifest Cursor reads when both are present.

Optional and separate: cursor.directory (a community queue staff recommend
for most plugins; its listings appear only there) and xAI's cross-listing
form at <https://x.ai/bot/marketplace/submit-a-plugin>, which can list into
Cursor and wants a 1:1 logo with a background plate.

### Devin marketplace (CognitionAI/devin-marketplace)

A pull request to the repository, following its
`.agents/skills/adding-a-plugin/SKILL.md`. Opening the PR accepts Cognition's
CLA (a perpetual copyright and patent licence on the contribution), so
someone with authority for Merget AI opens it. The fork's CI run waits for a
maintainer's approval; merges by the maintainers took 0–21 days in October
2026, with ninety-odd PRs open. How a merged entry reaches the **Browse
marketplace** list in Devin is not documented; ask on the PR.

Use the authored route, `plugins/merget/`, the only one that gives the card a
display name, short description and logo (the alternative pins our
repository by commit and shows what `.claude-plugin/plugin.json` carries).
`scripts/validate.py` accepts exactly these keys, and `name` must equal the
folder; `author`, `version`, `license` and `$schema` are refused there:

```json
{
  "name": "merget",
  "displayName": "Merget",
  "description": "Operate Merget's semantic merge queue for GitHub and read what it found on a pull request before you merge",
  "shortDescription": "Semantic merge queue for GitHub",
  "homepage": "https://sema.merget.ai",
  "repository": "https://github.com/MergetAI/merget-plugin",
  "logo": "logo.svg",
  "keywords": ["Development Tools"],
  "mcpServers": { "merget": { "url": "https://sema.merget.ai/mcp" } }
}
```

The description is one action-oriented sentence of 60–130 characters with no
full stop and without the words "integration" or "MCP server";
`shortDescription` is at most 40 characters. An optional `setup` object
(`notice`, `steps`) right after `shortDescription` may say that a Merget
organization connected to GitHub is needed. Copy `assets/logo.svg` to
`plugins/merget/logo.svg` and the four skill folders to
`plugins/merget/skills/`; put no `.mcp.json`, `mcp.json`, `plugin.json` or
`.claude-plugin/` under `plugins/merget/`. Add `"./plugins/merget"` to
`optionalPlugins` in the root `.devin-plugin/plugin.json`, run
`python3 scripts/validate.py --fix` then `python3 scripts/validate.py --fetch`.
Before opening the PR, install from the checkout (`devin plugins install
--local ./plugins/merget`, or **Customize → Plugins → Add plugin** in Devin)
and have a session call `merget_status` after signing in; the PR body names
that call, the transport and auth model ("Streamable HTTP, OAuth 2.0 with
dynamic client registration"), the skills, the docs, privacy, terms and
support links, and "Submitted by Merget (maintainer of the server)".

Independently of the marketplace, `devin plugins install MergetAI/merget-plugin`
works today: Devin falls back to `.claude-plugin/plugin.json` and reads the
root `.mcp.json`.

### Antigravity Marketplace

Third parties enter only through the partner interest form
<https://forms.gle/2EX5RFYPoJe1UgxR9>: eight required short answers (the
submitter's email; company name; company website domain; primary contact
name and email; a public support address or helpdesk URL; a plugin
description; a documentation URL). Google says it verifies the organization
and sends automated status updates; no timeline or criteria are published,
and one partner reports being asked for a demo video afterwards.

Before the form, the docs want `agy plugin validate --strict .` to exit with
no errors and no warnings, a complete `.antigravity-plugin/plugin.json`
(`name`, `displayName`, `description` of 120–160 characters, `version`
raised every release, `logo`, `suggestedPrompts`, `author` as `{name, url}`),
a README and the bundled logo. `build.mjs` emits all of that. Two things only
a real run settles, so run it on Linux in a scratch home
(`curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir <dir>`,
then `agy plugin validate --strict --json .`, `agy plugin install ./` and
`agy plugin list --json`, expecting four skills and one server):

- which file the CLI reads the server from. The docs say
  `<plugin-root>/mcp.json`; three partner repositories (Cloudflare,
  Dynatrace, ContextStream) report that agy 1.4.7–1.4.11 read only
  `mcp_config.json` (`{"mcpServers": {"merget": {"serverUrl": "…"}}}`) and
  warn that `mcp.json` is ignored. If the run agrees with them, add
  `mcp_config.json` as a `build.mjs` target.
- whether `--strict` still warns about `.mcp.json` and `mcp.json` sitting in a
  multi-client repository (Cloudflare's run says it does). If so, submit with
  those warnings recorded in the form's description.

### OpenAI's directory and the MCP Registry

The MCP Registry is `registry-publish.yml` after the one-time DNS setup
above. OpenAI's directory takes the release zip `release.yml` attaches and
needs the server to answer `/.well-known/openai-apps-challenge` with a
configured value; it does not need a UserInfo endpoint. Its submission notes
ask for `extensions["com.openai"].auth` in the Agent Plugins `mcp.json`,
which the pinned 1.0.0 schema refuses (`additionalProperties: false` on a
server entry): decide at submission time whether to add it and drop that
schema pair from `--validate`.

## Open items

- **LICENSE.** None chosen yet, and it gates two submissions: Cursor lists
  permissive open-source plugins only, and Anthropic's directory refuses a
  plugin without one. Once chosen: add the `LICENSE` file, set
  `"license": "<SPDX id>"` in `packaging/source.json` (`build.mjs` then
  emits it into every manifest that takes a license), add `license:` to
  each skill's frontmatter, and make CI's directory-profile step blocking.
- **Directory listing fields.** `.claude-plugin/plugin.json` now carries
  `displayName`, `icon` and `supportUrl` (`https://sema.merget.ai/docs/help`).
  Still to add to `listing` in `source.json` once their pages load:
  `privacyPolicyUrl` (`https://merget.ai/legal/privacy-statement`) and
  `termsOfServiceUrl` (`https://merget.ai/legal/terms-of-service`), written
  in MergetAI/merget-web (`src/legal/`) but not served, since `merget.ai`
  still redirects every `/legal/*` path to its home page; and
  `documentationUrl`, the docs' "Install in your coding agent" page, once it
  is live. Security is `https://sema.merget.ai/docs/security`, live.
- **`.cursor-plugin/plugin.json`** and **`mcp_config.json`**: two more
  generated files, each added only when its directory's test asks for it
  (see Submissions).
- **Registry description.** `server.json` takes the 100-character `summary`
  from `source.json`, not the description, because the registry's schema caps
  it there.
