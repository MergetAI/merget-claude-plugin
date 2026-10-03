# Setup states and next steps

`sema_status` reads each organization's setup as one state and one next
step (`GET /v1/orgs/{slug}/setup`, the dashboard's onboarding checklist
computed on the server). The states follow the user's own journey —
installed, then joined, then synced, then configured, then working — so an
earlier, more fundamental gap is never hidden behind a later one. Act on
the state you are given, then read again.

## Per organization: `orgs[].setup`

| `state` | `next_step.action` | Means | Who acts |
|---------|--------------------|-------|----------|
| `no_installation` | `install_github_app` | no active GitHub App installation is connected to the organization | you: `sema_github_connect` (owner); the human opens the URL |
| `suspended_installation` | `none` | GitHub suspended the App on every installation | a GitHub admin unsuspends it on the installation's GitHub page (`next_step.url`); installing again does not lift a suspension |
| `github_unlinked` | `link_github` | installed, but the human has no GitHub account linked, so no private repository can be shown | the human links one at `next_step.url` |
| `no_visible_repos` | `none` | the linked GitHub account cannot read any repository the App is installed on | a GitHub admin adds repositories to the installation or grants the account access, or the human connects another installation; then `sema_installation_sync` |
| `access_unconfirmed` | `none` | Merget could not confirm the account's GitHub access yet (the check is running, or GitHub did not answer) | nobody: read again shortly |
| `no_enabled_repos` | `enable_repository` | repositories to see, none enabled | you: `sema_repo_update {repo, enabled: true}` on one the human holds maintain or admin on |
| `no_enabled_repos_locked` | `none` | none enabled, and the human holds neither maintain nor admin on any repository they see | someone with that access enables the first one |
| `no_open_prs` | `open_pull_request` | set up; no open pull request on an enabled repository | nobody: Merget analyses the next pull request opened against the target branch |
| `ready` | `none` | enabled repositories with open pull requests: Merget is working | done |

Beside the state:

- `counts`: `installations`, `active_installations`, `suspended_installations`, `visible_repos`, `enabled_repos`, `queueing_repos` (enabled in queue or autonomous mode), `open_prs`.
- `github`: the human's linked GitHub account (`user_id`, `login`, `source`), or null.
- `access`: `{checking, degraded}` — whether the repository lists may still be missing what the account can read.

Repository counts are about the human's GitHub account: Merget shows a
repository only to someone whose GitHub account can read it. An empty list
is a question of who is looking before it is a question of setup.

## Overall: the top-level `next_step`

`sema_status` also names the first thing to do overall, checked in this
order:

| `action` | When | Who acts |
|----------|------|----------|
| `create_organization` | the account belongs to no organization | the human signs in at `url`, creates one (or is added to one), then authorizes this agent again |
| `reauthorize` | this agent was approved for one organization the user no longer belongs to | the human authorizes this agent again, choosing an organization they belong to |
| `enable_agents` | an organization does not let agents in (`agent_access: false`) | the human (an owner) allows agents at `url`, Settings › Agents |
| `allow_agent_permissions` | the organization's owner does not let agents read it (`sema:org.read` outside `agent_scopes`) | an owner allows it at `url` |
| a setup `action` above, with `org` | the first organization whose setup is not `ready` | as above |
| `none` | every organization whose setup was read is ready | nothing |

A row may carry instead of `setup`:

- `setup_omitted`: agents may not read this organization's setup (its agent access is off, or its owner does not allow `sema:org.read`), or the user belongs to more than ten organizations and this one was past the tenth — call `sema_status` with `org` to read it;
- `setup_error` or `settings_error`: the read failed; the error body says why.

## The GitHub side

- The URL from `sema_github_connect` expires after 15 minutes; another call mints a new one. Nothing is asked of GitHub until the human opens it.
- After the install, GitHub sends the human's browser back to Merget, which connects the installation to the organization the URL was minted for. If `sema_status` still reads `no_installation` afterwards, ask what the human saw; the link may have expired or the install may not have finished.
- An admin of the GitHub account accepts new App permissions (Contents: write for queue and autonomous mode) on the installation's GitHub settings page. Merget learns of it from GitHub, or at once from `sema_installation_sync`.
- `sema_installation_sync` re-reads an installation from GitHub: its permissions, its repository list and their visibility. Without `installation` it syncs every installation of the organization (that also needs `sema:org.read`). An installation GitHub no longer has is removed from the organization and its queued work cancelled; its row then reads `ok: false` with the error `installation_removed`. Tell the human if it happens.
