# The `rev` grammar

Every graph call addresses a commit through `rev`. Merget resolves it on the
API before the graph service is asked, so the service only ever sees a
full SHA. Forms, in the order they are tried:

| Form | Resolves to | Notes |
|------|-------------|-------|
| `<sha>` (7–40 hex) | that commit | a short prefix must be unique in Merget's mirror of the repository |
| `pr:<n>:head` | `pull_requests.head_sha` of PR `n` — the PR as last pushed | the usual "this PR" rev |
| `pr:<n>:base` | `base_sha` of the latest run for PR `n` — the target tip that run analysed | not the branch tip *now*; pair it with `run.base_sha` from the findings document |
| `pr:<n>:merge` | `prepared_head` of the latest run — Merget's certified merge commit | only when a run prepared the PR (queue/autonomous modes); otherwise `rev_unresolved` |
| `branch:<name>` | the branch tip as the mirror last fetched it | may lag GitHub by a fetch |
| `<name>` | anything else is read as `branch:<name>` | `main` = `branch:main` |

Unresolvable forms are 400 `rev_unresolved` with `{"rev": "…"}`.

## Which form to use

| Question | `rev` (and `to`) |
|----------|------------------|
| what a PR does, callers on the PR, a slice of the PR's code | `pr:N:head` |
| what the PR's findings were computed against | `pr:N:base` (matches `run.base_sha`) |
| what the PR changed at symbol level | `diff`: `rev: pr:N:base`, `to: pr:N:head` |
| what moved under the PR since its last run | `diff`: `rev: pr:N:base`, `to: branch:<target>` |
| how the certified merge looks (queue/autonomous) | `pr:N:merge` |
| a specific commit from a stack trace or a bisect | the sha |
| the target branch as it is now | `branch:main` (or the repository's `target_branch`) |

## Pitfalls

- `pr:N:base` is the run's base, so two runs of the same PR can have different bases; the findings document says which (`run.base_sha`).
- A short sha that matches several commits is `rev_unresolved`; use more characters.
- A branch name cannot contain `:` (nor whitespace, `..`, `@{`, `\`, `*`, `?`, `[`, `~`, `^`; it cannot start with `-` or `/`, or end with `/`, `.` or `.lock`); such a string is `rev_unresolved`. The explicit `branch:` prefix is for a name that would otherwise be read as a sha (7–40 hex digits, e.g. a branch called `deadbeef`).
- A `rev` longer than 300 characters is refused.
- The first call on a commit Merget has not built yet answers `graph_pending` (202) with `retry_after_secs`; that is not a `rev` error.
- `finding` takes no `rev`: the run fixes the tree. `intent` takes only `pr:N:head` or `pr:N:base`.
