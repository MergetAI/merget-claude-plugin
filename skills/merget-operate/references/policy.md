# Repository policy: keys, groups and the merge patch

`sema_repo_settings_get` answers `policy`, the **customer view** — every
setting the user may change, at its stored value; an absent key is at
Merget's default — and `policy_schema`, one row per key a patch may set:

```json
[{"key": "merge_method", "class": "customer", "group": "simple", "kind": "enum", "values": ["merge", "squash", "rebase"]},
 {"key": "batch.max_inflight", "class": "bounded", "group": "queue_behavior", "kind": "int", "min": 1, "max": 4},
 {"key": "batch.min_green_probability", "class": "customer", "group": "queue_behavior", "kind": "float", "exclusive_min": 0.0, "exclusive_max": 1.0},
 {"key": "validation", "class": "customer", "group": "build_and_test", "kind": "validation",
  "values": ["Off", "Auto"], "forms": {"Build": "string", "Test": "string", "Recipe": "object"}}]
```

- `class`: `customer` (checked for shape) or `bounded` (inclusive `min` and `max`, this deployment's own — read them, never assume them).
- `kind`: `bool`, `int`, `secs`, `float` (open interval), `string`, `enum` (`values`), `object` (a section, merged key by key), `strings` (a list, replaced whole), `rules` (a list of objects, replaced whole), `map` (replaced whole), `validation`.
- `group`: where the dashboard shows the key — `simple`, `generated_files`, `build_and_test`, `queue_behavior`, `ci_integration`, `branch_health`, `language`, `finding_and_merge`.

The schema is the authority. The tables below are the keys it serves today,
with what each one does; a key the schema does not list cannot be set.

## The merge patch

`sema_repo_update {repo, policy}` applies `policy` as a JSON merge patch
(RFC 7396) over the customer view, then checks the result as a whole:

| The patch | Happens |
|-----------|---------|
| leaves a key out | kept as stored |
| sets a key to `null` | removed: Merget's default applies, and follows Merget if that default changes |
| names a section — `batch`, `queue`, `queue.passing_lane`, `trunk`, `c`, `l2_blocking` | merged key by key |
| sets any other key (`generated`, `validation`, `batch.checks`, `batch.check_paths`, …) | replaced whole |
| names a Merget-managed or unknown key, at any depth | the whole patch refused: 400 `policy_key_not_customer` with `path` |
| sets a bounded key outside `min`..`max` | refused: 400 `policy_out_of_range` with `path`, `min`, `max` (a stored value above a lowered ceiling still saves unchanged) |
| has a wrong shape (a string where a list goes, a rule without `paths`, a recipe without a command) | refused: 400 `invalid_policy`, with `field` when one key is at fault |
| changes `merge_method` to one GitHub does not allow on the repository | refused: 400 `invalid_policy`, the message naming the GitHub setting to change (when GitHub cannot be asked, the save goes through) |

`resolution_scope` may also be sent as a top-level argument of
`sema_repo_update`, but not together with `policy`. Send only the keys you
change: a full customer view is a valid patch too, but it re-sends values
another person may be changing at the same moment.

Every change re-prepares the repository's queued pull requests and voids a
standing land request; a patch that changes nothing prepares nothing again.

## Keys

### Simple

| Key | Kind | Does |
|-----|------|------|
| `merge_method` | `merge` \| `squash` \| `rebase` | how Merget asks GitHub to merge when Merget merges (autonomous mode's head, a batch landed through the merge API); absent = Merget decides: a merge commit when the repository allows one and the target does not require linear history, else squash |

`enabled`, `mode` and `target_branch` are top-level arguments of
`sema_repo_update`, not policy keys.

### Generated files (`generated_files`)

| Key | Kind | Does |
|-----|------|------|
| `generated` | rules | files the build produces, never merged line by line; each rule `{paths, regenerate?, cwd?, strategy?, inputs?}` |
| `generated[].paths` | strings | globs relative to the repository root (`dist/**`); no leading `/` or `./`, no `..` |
| `generated[].regenerate` | string | the command that rebuilds them, run on the merged code that will land (no credentials; it installs its own dependencies) |
| `generated[].cwd` | string | where the command runs, relative to the root |
| `generated[].strategy` | `regenerate` \| `keep_target` \| `keep_source` \| `agent` \| `bounce` | absent: regenerate when there is a command, else keep the target's copy; `regenerate` needs a command; `bounce` hands the conflict to a person |
| `generated[].inputs` | strings | globs the output is built from: a merge that changes one runs the command even without a conflict |
| `generated_heuristics` | bool | also treat build output no rule declares (e.g. `linguist-generated`) as generated; default on |

### Build and test (`build_and_test`)

| Key | Kind | Does |
|-----|------|------|
| `validation` | `"Off"` \| `"Auto"` \| `{"Build": cmd}` \| `{"Test": cmd}` \| `{"Recipe": {…}}` | whether Merget runs the repository's own build and tests on a fix before pushing it. `Off` (default): the repository's CI verifies. `Auto`: Merget discovers the commands. A recipe: `{ecosystem, cwd, setup, build, test, env}` — `ecosystem` one of `rust`, `node`, `python`, `go`, `java`, `dotnet`, `make`; `setup` commands run first and are the only ones that receive validation secrets; at least one of `build` and `test`; `env` a map applied to every command (never credentials) |
| `validation_timeout_secs` | secs, bounded | each build, test or regenerate command's time limit |

### Queue behavior (`queue_behavior`)

| Key | Kind | Does |
|-----|------|------|
| `batch.enabled` | bool | land certified sequences as batches, one CI run for several pull requests (default on in queue and autonomous mode; advisory never batches) |
| `batch.max_size` | int, bounded | most pull requests per batch; absent = no limit |
| `batch.landing` | `auto` \| `fast_forward` \| `api` | how a passing batch lands in autonomous mode: one fast-forward push, or GitHub's merge API (keeps squash merges) |
| `batch.max_wait_secs` | secs, bounded | how long a batch waits for more pull requests to become ready |
| `batch.max_inflight` | int, bounded | batches in CI at once |
| `batch.min_green_probability` | float in (0, 1) | start a new batch before a change that makes the group likelier to fail |
| `queue.skip_after_secs` | secs, bounded | move a pull request that cannot land behind those that can after this long; absent = off |
| `queue.passing_lane.enabled` | bool | when the first pull request is not ready, test and merge independent ones behind it, ahead of it (default off) |
| `queue.passing_lane.max_members` | int, bounded | pull requests per lane |
| `queue.passing_lane.after_secs` | secs | how long the first must have been unable to land before a lane opens |

### CI integration (`ci_integration`)

| Key | Kind | Does |
|-----|------|------|
| `batch.checks` | strings | checks a batch commit must pass beyond those the target branch requires |
| `batch.check_paths` | map | check name → the globs it exercises, so a failed batch ranks its likely culprits: `{"verdict": ["src/**"]}` |
| `batch.ci_timeout_secs` | secs, bounded | how long a batch commit's checks may take before the batch counts as failed |
| `batch.cancel_ci` | bool | cancel the workflow runs of a batch that ends without landing (default on; needs the App's Actions: write) |

Batch commits and staged fixes are pushed to `merget/queue/**`: the
workflows behind required checks must run on pushes to those branches.

### Branch health (`branch_health`)

| Key | Kind | Does |
|-----|------|------|
| `trunk.verify` | bool | record which target commits are green and find the commit that broke a red one (default on in queue and autonomous mode) |
| `trunk.verified_ref` | string \| null | keep a branch at the newest green commit of the target, for deploys: a name under `merget/verified/` (the dashboard uses `merget/verified/<target>`); null = none. Needs `trunk.verify` |
| `trunk.reset_on_rewrite` | bool | after a force-push of the target, move that branch onto the new history |

### Language (`language`)

| Key | Kind | Does |
|-----|------|------|
| `c.parse` | `single-file` \| `repo-local` \| `system` | how much of C code's surroundings Merget reads: no headers, the repository's headers, or system headers too where available; absent = Merget's default |
| `c.include_dirs` | strings | extra header directories, relative to the root (at most 32) |
| `c.defines` | strings | macros as `NAME` or `NAME=value`, without `-D` (at most 64) |
| `c.std` | string | the dialect: `c89`, `c90`, `c99`, `c11`, `c17`, `c23`, `c2x` or the `gnu` forms of each |

### Finding and merge policies (`finding_and_merge`)

| Key | Kind | Does |
|-----|------|------|
| `layer2` | bool | Layer 2 interference analysis (default on) |
| `l2_blocking.mode` | `off` \| `calibrated` | whether a Layer 2 interaction Merget is confident in may block (default `calibrated`) |
| `resolution_scope` | `blocking` \| `all_findings` | also try to fix advisory findings — more model spend, and only while Merget's own build is on |
| `batch.ci_failure` | `isolate` \| `land_certified` | autonomous mode, when required CI fails on a batch Merget certified: find the failing pull request (default), or land it on Merget's verdict |
| `batch.land_certified_requires_build` | bool | with `land_certified`: only batches Merget built and tested itself (default on) |
| `max_widened_files` | int, bounded | files beyond the conflict a fix may edit when a build names them; `0` keeps fixes inside the conflicted files |

## Not settable: Merget-managed

These are Merget's, for every repository, and outside the customer view and
the schema. A patch that names any of them (or anything under them) is
refused as a whole with `policy_key_not_customer`: `wall_secs`,
`entry_wall_secs`, `budgets` and everything under it, `r1.*`, `r2.*`
(models, escalation, repair tooling, stall and time limits, liveness),
`slice_budget.*`, `max_tickets`, `sharding`, `whole_tree`, `context`,
`max_definers_per_name`, `graph_file_store`, `context_map`, `graph_tools`,
`preserve`, `repair_mode`, `remove_label_on_land`,
`l2_blocking.min_confidence`, `batch.bisect_probes`,
`batch.max_bisect_rounds`, `batch.max_bisect_commits`, `managed`. The two
customer values a row may still hold under `budgets` are set by their own
names: `validation_timeout_secs` and `max_widened_files`.

Tell the user these are Merget's to set; a repository that needs more than
the defaults give (a longer repair time, say) is a request to Merget
support, not a setting.

## Examples

Batching with at most four pull requests a batch, other batch keys untouched:

```json
{"repo": "acme/api", "policy": {"batch": {"enabled": true, "max_size": 4}}}
```

Back to Merget's merge method, and the passing lane on:

```json
{"repo": "acme/api", "policy": {"merge_method": null, "queue": {"passing_lane": {"enabled": true}}}}
```

Merget's own build with a recipe (replaces any stored `validation`):

```json
{"repo": "acme/web", "policy": {"validation": {"Recipe": {"ecosystem": "node", "cwd": ".", "setup": ["npm ci"], "build": "npm run build", "test": "npm test"}}}}
```

One more generated-files rule: read `policy.generated` first and send the
whole list, since the list is replaced:

```json
{"repo": "acme/web", "policy": {"generated": [
  {"paths": ["dist/**"], "strategy": "keep_target"},
  {"paths": ["docs/content/manifest.json"], "regenerate": "node scripts/docs-content.mjs", "inputs": ["docs/content/**"]}]}}
```
