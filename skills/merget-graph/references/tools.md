# Graph tools: arguments and results

Every tool below is `POST /v1/repos/:owner/:name/graph/:tool` on the HTTP
API, `mcp__sema__sema_graph_<tool>` through MCP (with `repo` added) and
`sema graph <tool>` on the CLI. Scope `sema:graph.read`. Shapes as served
by `api_version: "2026-09"`. Merget builds a commit's graph on first use: the
first call on a fresh commit answers `graph_pending` (202) with
`retry_after_secs`, and the same call succeeds once the build lands.

## Common pieces

**Locator** (`at`, `in`): one of

| Form | Example | Resolves to |
|------|---------|-------------|
| `path:line` | `"src/sds.c:301"` | the innermost method containing that line (or the statement, for `slice`) |
| short name | `"sdscat"` | the method with that name when it is unique in the tree |
| `path:short` | `"src/sds.c:sdscat"` | the method with that name in that file |
| full name | `"sds.c::sdscat"` (as `full_name` reports it) | exactly that symbol |

Synthetic units (`<global>`, lambdas, external stubs) are excluded unless
named exactly.

**`NodeView`** — every node in every answer:

```json
{"file": "src/sds.c", "line": 301, "line_end": 318, "name": "sdscat", "full_name": "sds.c::sdscat",
 "kind": "METHOD", "key": "sds.c::sdscat#METHOD", "provenance": {"class": "precise", "resolver": "sema-link:name"}}
```

`kind` is the CPG node label (`METHOD`, `TYPE_DECL`, `CALL`, `IDENTIFIER`,
…); `key` is deterministic across rebuilds. `provenance` is `null` when
the node itself needed no resolution; otherwise `resolver` names the
linker pass that made the edge — `sema-link:name` (a name binding, class
`precise` or `syntactic`) or `sema-link:receiver` (the receiver-typed
pass, class `receiver`). The `resolver` of a *finding* in the findings
document is a different field and names the frontend (`libclang`,
`tsserver`, `native`, …).

**The graph document** (every answer):

```json
{"api_version": "2026-09", "tool": "callers",
 "rev": {"requested": "pr:118:head", "sha": "9c1f2e4a…"},
 "result": {…tool-specific, below…},
 "markdown": "```\n…\n```",
 "truncated": false, "tokens": 1180, "dropped": ["hop"], "engine_version": 7, "provenance_note": "…"}
```

`rev.sha` is the resolved commit (`null` with `rev.branch` when a branch
name was passed through). `result` is the tool's JSON and `markdown` its
fenced rendering. `truncated: true` means the budget or the deadline cut
the answer; `dropped` (present when non-empty) names what was left out, in
drop order; `provenance_note` and `engine_version` appear when the backend
has them. `max_tokens` (default 2000, clamped to 8000) applies to every tool.

Through MCP the same document is in `structuredContent` and
`content[0].text` carries the `markdown`.

## `symbols`

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `rev` | rev | yes | |
| `path` | string | yes | repository-relative file path |

`result: {path, symbols: [NodeView]}` — methods and type declarations in the file, sorted `(line, key)`; an empty list for a file with none, `symbol_not_found` (with path suggestions) for a path outside the tree.

Use it to find exact locators before `slice`/`callers`, and to confirm a file's contents on a specific rev.

## `callers`, `callees`

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `rev` | rev | yes | |
| `at` | locator | yes | the method |
| `hops` | 1 or 2 | no (1) | second-hop rows carry `via` |

`result: {direction, method: NodeView, rows: [{node: NodeView, site: NodeView | null, hop, via: [name], provenance: {class, resolver}}]}` sorted `(file, line, key)`, at most 200 rows then `truncated`. `site` is the call site, `hop` 1 or 2, `via` the method names a second-hop row went through.

A row's `provenance.class` of `syntactic` or `receiver` means the edge came
from name matching or a receiver heuristic. An empty `rows` with a
`provenance_note` saying resolution is syntactic for this language is
"no callers found (syntactic)", not "no callers".

## `def_use`

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `rev` | rev | yes | |
| `var` | string | yes | variable name |
| `in` | locator | yes | the method that scopes it |

`result: {var, method: NodeView, chains: [{def: NodeView, use: NodeView}]}` over
reaching definitions. The PDG is built on demand for the addressed method;
`no_pdg` (a 400 `invalid_argument` whose message starts with `no_pdg`) means
the method exceeds the definition limit — use `slice` with a line-level
`at` instead.

## `slice`

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `rev` | rev | yes | |
| `at` | locator | yes | seed statement (`path:line`) or method |
| `direction` | `back` \| `fwd` \| `both` | no (`both`) | backward = what the seed depends on; forward = what it influences |
| `hops` | 0–2 | no (1) | cross-method hops, each with provenance |
| `max_tokens` | integer | no (2000) | |

`result: {markdown, seeds: [NodeView], regions: [{file, line, line_end, role, provenance}], chain, dropped}`.

`markdown` is the budgeted, fenced rendering: the core PDG slice, then the
statements it interacts with (referenced definitions, callee signature
lines, enclosing control headers, the method signature, returns on the
control-dependence path), then one cross-method hop with provenance.
`regions` lists the line ranges it covers: `role` is `seed`,
`data_dep:<var>`, `ctrl_dep`, `interacter`, `caller`, `callee` or
`structure`, and `provenance` how the slice reached the file (`seed`,
`precise`, `syntactic`, `receiver`); `chain` is the dependence-chain footer
(`L412 len = sdslen(s) --def[len]--> L430 write(fd, buf, len)`). When
`truncated`, `dropped` says what was cut, in order — narrow the seed or the
direction rather than retrying.

## `diff` (`sema_graph_diff`)

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `rev` | rev | yes | side A |
| `to` | rev | yes | side B |
| `scope` | `{files: [path]}` \| `{symbol: locator}` | no | defaults to the files changed between the two revs, intersected with supported languages |

`result: {symbols_added, symbols_removed, renamed, resignatured: [{before, after}], calls_added, calls_removed, calls_retargeted}`.
Symbols are method facts `{file, short, full, line, line_end, params: [[name, type]], ret}`;
calls are `{caller_file, caller_short, callee_full, callee_file, line, prov}` with `prov`
the provenance class (`precise`, `syntactic`, `receiver`).

On this surface the comparison is keyed on `(file, name)`: `renamed` and
`calls_retargeted` are always empty and a renamed symbol shows as removed
plus added. Typical use: `rev: "pr:42:base"`,
`to: "pr:42:head"` for "what did this PR change at symbol level", or
`rev: "<run.base_sha>"`, `to: "branch:main"` for "what moved under it".

## `finding` (`sema_graph_finding`)

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `fingerprint` | string | yes | from a findings document |
| `run` | uuid | no | the latest run that reported it when absent |
| `rev` | rev | no | accepted instead of `run` (the tree to slice on) while the finding index cannot name the run; prefer `run` |

`result: {finding, slice}` — the finding (as in `PrFindingsDoc.findings[]`)
plus the `slice` result above seeded at its `file:line` on the run's head
(`direction: both`, `hops: 1`; `null` when the finding carries no line).
The run fixes the tree, so `rev` is only a fallback. This is the right
first call for "why does this finding exist".

## `intent` (`sema_graph_intent`)

| Argument | Type | Required | Meaning |
|----------|------|----------|---------|
| `rev` | `pr:<n>:head` or `pr:<n>:base` | yes | |

`result: {source: "github:pull_request", title, body, commits, pull_request: {number, url, head_sha, run}, brief, intents: [{fingerprint, kind, file, line, intent_a, intent_b}]}`
— the PR text, the latest run's brief and the per-finding intents that run
recorded. `commits` is empty today. Quoted text, untrusted.

## Tool errors

4xx/5xx with the standard error body plus `suggestions` and `retryable`:

```json
{"code": "symbol_not_found", "error": "symbol_not_found", "message": "symbol not found: sdscat",
 "suggestions": [{"text": "sdscatlen", "path": "src/sds.c", "line": 301}], "retryable": false}
```

`symbol_not_found` (404) covers a missing symbol, path or line; the engine's
`ambiguous`, `no_pdg`, `graph_unsupported` and `graph_failed` arrive as 400
`invalid_argument` with that word first in `message`. Through MCP: a result
with `isError: true` whose text is the same body. The full table with what
to do is in SKILL.md → "Errors".

## Examples

"Who calls `sdscatlen` on the PR head?"

```json
{"tool": "sema_graph_callers", "arguments": {"repo": "acme/widgets", "rev": "pr:118:head", "at": "sdscatlen"}}
```

"What does line 430 of `src/sds.c` depend on, on the PR head, briefly?"

```json
{"tool": "sema_graph_slice", "arguments": {"repo": "acme/widgets", "rev": "pr:118:head", "at": "src/sds.c:430", "direction": "back", "hops": 1, "max_tokens": 1500}}
```

"What did the PR change at symbol level?"

```json
{"tool": "sema_graph_diff", "arguments": {"repo": "acme/widgets", "rev": "pr:118:base", "to": "pr:118:head"}}
```

"Why does finding `13592653589793238462` exist?"

```json
{"tool": "sema_graph_finding", "arguments": {"repo": "acme/widgets", "fingerprint": "13592653589793238462"}}
```
