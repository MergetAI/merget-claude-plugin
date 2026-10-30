#!/usr/bin/env node
// Writes every manifest this repository ships from packaging/source.json, the
// one place the plugin's name, version, description and addresses live.
//
//   node packaging/build.mjs             write the manifests
//   node packaging/build.mjs --check     exit 1 when a manifest is out of date,
//                                        or a content rule below is broken
//     --base <ref>                       and also when a file a client reads
//                                        changed since <ref> without a bump
//   node packaging/build.mjs --validate  check the generated files against the
//                                        pinned schemas in packaging/schemas/
//
// Each client reads a different file, and each file's schema allows a
// different set of fields, so the generator emits for every file only what
// its reader accepts. No dependencies: CI and a contributor's shell run it
// with Node alone.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "packaging/source.json";
const source = JSON.parse(read(SOURCE));

// The schema each generated file must satisfy, pinned as a file so CI does
// not depend on the publisher's site. `id` is the schema's own `$id`, which
// --validate checks so a refreshed file cannot silently change identity.
const SCHEMAS = {
  agentPluginsPlugin: {
    file: "packaging/schemas/agent-plugins-plugin.schema.json",
    id: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  },
  agentPluginsMcp: {
    file: "packaging/schemas/agent-plugins-mcp.schema.json",
    id: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  },
  antigravityPlugin: {
    file: "packaging/schemas/antigravity-plugin.schema.json",
    id: "https://antigravity.google/schemas/v1/plugin.json",
  },
  mcpRegistryServer: {
    file: "packaging/schemas/mcp-registry-server.schema.json",
    id: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  },
};

// The fields Anthropic's plugin directory reads from .claude-plugin/plugin.json
// and Claude Code ignores at load. They go into that file alone: in a
// marketplace entry `claude plugin validate` flags them as unknown. Each is
// emitted only when source.listing sets it, so a URL whose page is not live
// yet stays out (RELEASING.md, Open items).
const LISTING_KEYS = ["icon", "documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"];

// Only the Claude Code manifest reader is lenient about extra keys (it strips
// them with a warning); the others are closed schemas, so each target lists
// its fields by hand rather than spreading the source object.
function targets() {
  const { name, version, description, author, homepage, repository, keywords } = source;
  const mcp = source.mcp;
  const licensed = source.license ? { license: source.license } : {};
  // Agent Plugins and Antigravity take author as {name, email, url}; we ship
  // exactly {name, url}.
  const closedAuthor = { name: author.name, url: author.url };
  const listing = Object.fromEntries(LISTING_KEYS.filter((k) => source.listing?.[k]).map((k) => [k, source.listing[k]]));
  const prompts = source.suggestedPrompts ? { suggestedPrompts: source.suggestedPrompts } : {};
  return [
    {
      path: ".claude-plugin/plugin.json",
      data: { name, displayName: source.displayName, version, description, author, homepage, ...licensed, ...listing },
    },
    {
      path: ".claude-plugin/marketplace.json",
      data: {
        name: source.marketplace.name,
        owner: author,
        metadata: { description: source.marketplace.description },
        plugins: [
          {
            name,
            source: "./",
            category: source.category,
            version,
            description,
            homepage,
            author,
            ...licensed,
          },
        ],
      },
    },
    {
      // Claude Code's own shape. The server sends tool titles itself, so the
      // old `_meta.ideToolTitles` block is gone.
      path: ".mcp.json",
      data: { mcpServers: { [mcp.name]: { type: "http", url: mcp.url } } },
      validateWith: [],
    },
    {
      path: "plugin.json",
      data: {
        $schema: SCHEMAS.agentPluginsPlugin.id,
        name,
        version,
        description,
        author: closedAuthor,
        homepage,
        repository,
        keywords,
        ...licensed,
      },
      // Antigravity reads the root manifest too, so it must satisfy both.
      validateWith: ["agentPluginsPlugin", "antigravityPlugin"],
    },
    {
      path: "mcp.json",
      data: {
        $schema: SCHEMAS.agentPluginsMcp.id,
        mcpServers: { [mcp.name]: { type: "streamable-http", url: mcp.url } },
      },
      validateWith: ["agentPluginsMcp"],
    },
    {
      path: ".antigravity-plugin/plugin.json",
      data: {
        $schema: SCHEMAS.antigravityPlugin.id,
        name,
        displayName: source.displayName,
        description,
        version,
        logo: source.logo,
        author: closedAuthor,
        homepage,
        repository,
        keywords,
        ...licensed,
        // Up to three prompts, shown as chips on the plugin's page. Not in
        // the Agent Plugins schema, so the root plugin.json does without.
        ...prompts,
      },
      validateWith: ["antigravityPlugin"],
    },
    {
      // The registry caps `description` at 100 characters: that is what the
      // short `summary` in source.json is for.
      path: "server.json",
      data: {
        $schema: SCHEMAS.mcpRegistryServer.id,
        name: source.registry.name,
        title: source.registry.title,
        description: source.summary,
        version,
        websiteUrl: homepage,
        repository: { url: repository, source: "github" },
        remotes: [{ type: "streamable-http", url: mcp.url }],
      },
      validateWith: ["mcpRegistryServer"],
    },
  ];
}

const args = process.argv.slice(2);
const mode = args[0] ?? "write";
const baseAt = args.indexOf("--base");
const base = baseAt < 0 ? undefined : args[baseAt + 1];
if (baseAt >= 0 && (!base || mode !== "--check")) {
  console.error("--base <ref> goes with --check");
  process.exit(2);
}
const failures = [];
const fail = (file, line, message) => failures.push(`${file}:${line}: ${message}`);

// ---------------------------------------------------------------------------
// source.json rules the schemas cannot express

function checkSource() {
  if (!/^\d+\.\d+\.\d+$/.test(source.version)) fail(SOURCE, 1, `version "${source.version}" is not X.Y.Z`);
  if (source.summary.length > 100) fail(SOURCE, 1, `summary is ${source.summary.length} characters; the registry allows 100`);
  // Antigravity's docs recommend 120-160 characters; Devin's marketplace wants
  // one action-oriented sentence under about 200; nothing else caps it.
  const d = source.description.length;
  if (d < 120 || d > 160) fail(SOURCE, 1, `description is ${d} characters; keep it between 120 and 160`);
  for (const key of Object.keys(source.listing ?? {})) {
    if (!LISTING_KEYS.includes(key)) fail(SOURCE, 1, `listing key "${key}" is not one the plugin directory reads (${LISTING_KEYS.join(", ")})`);
  }
  if (failures.length) {
    for (const f of failures) console.error(f);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// --check

function checkGenerated() {
  for (const t of targets()) {
    const path = join(ROOT, t.path);
    if (!existsSync(path)) {
      fail(t.path, 1, "missing; run `node packaging/build.mjs`");
    } else if (read(t.path) !== render(t.data)) {
      fail(t.path, 1, "out of date with packaging/source.json; run `node packaging/build.mjs`");
    }
  }
}

function checkChangelog() {
  const lines = read("CHANGELOG.md").split("\n");
  const i = lines.findIndex((l) => l.startsWith("## "));
  if (i < 0) return fail("CHANGELOG.md", 1, "no version heading (## X.Y.Z — YYYY-MM-DD)");
  const m = /^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})$/.exec(lines[i]);
  if (!m) return fail("CHANGELOG.md", i + 1, `heading "${lines[i]}" is not "## X.Y.Z — YYYY-MM-DD"`);
  if (m[1] !== source.version) fail("CHANGELOG.md", i + 1, `top entry is ${m[1]} but packaging/source.json says ${source.version}`);
}

// What the Agent Skills specification allows in SKILL.md frontmatter.
const SKILL_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);

function checkSkills() {
  const skillsDir = join(ROOT, "skills");
  for (const folder of readdirSync(skillsDir)) {
    const dir = join(skillsDir, folder);
    if (!statSync(dir).isDirectory()) continue;
    const rel = `skills/${folder}/SKILL.md`;
    if (!existsSync(join(dir, "SKILL.md"))) {
      fail(rel, 1, "missing");
      continue;
    }
    const text = read(rel);
    const lines = text.split("\n");
    if (lines.length >= 500) fail(rel, 500, `${lines.length} lines; keep a skill under 500`);
    const fm = frontmatter(lines);
    if (!fm) {
      fail(rel, 1, "no YAML frontmatter");
    } else {
      for (const [key, { value, line }] of Object.entries(fm.fields)) {
        if (!SKILL_KEYS.has(key)) fail(rel, line, `frontmatter key "${key}" is not in the Agent Skills specification`);
        if (key === "name" && value !== folder) fail(rel, line, `name "${value}" must equal the folder name "${folder}"`);
        if (key === "name" && !/^[a-z0-9-]{1,64}$/.test(value)) fail(rel, line, `name "${value}" must match [a-z0-9-]{1,64}`);
        if (key === "description" && value.length > 1024) fail(rel, line, `description is ${value.length} characters; the limit is 1024`);
        if (key === "compatibility" && value.length > 500) fail(rel, line, `compatibility is ${value.length} characters; the limit is 500`);
      }
      if (!fm.fields.name) fail(rel, 1, "frontmatter has no name");
      if (!fm.fields.description) fail(rel, 1, "frontmatter has no description");
    }
    for (const file of walk(dir)) checkLinks(dir, file);
  }
}

// A minimal reader for the flat frontmatter skills use: `key: value` at column
// zero, with indented lines belonging to the key above (metadata's map).
function frontmatter(lines) {
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end < 0) return null;
  const fields = {};
  let current = null;
  for (let i = 1; i < end; i++) {
    const m = /^([A-Za-z][A-Za-z0-9-]*):\s?(.*)$/.exec(lines[i]);
    if (m) {
      current = m[1];
      fields[current] = { value: unquote(m[2].trim()), line: i + 1 };
    } else if (current && /^\s+\S/.test(lines[i])) {
      // A folded or block scalar continues the value above; metadata's map
      // lands here too, which is fine since its contents are not checked.
      fields[current].value += " " + lines[i].trim();
    } else if (lines[i].trim() !== "") {
      fields[`line ${i + 1}`] = { value: lines[i], line: i + 1 };
    }
  }
  return { fields, end };
}

function unquote(v) {
  if (v.startsWith(">") || v.startsWith("|")) return "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

// Every relative link inside a skill must resolve, stay inside the skill's
// folder and go at most one directory down (references/<file>): clients that
// copy skills copy the folder, nothing beside it.
function checkLinks(skillDir, file) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const lines = read(rel).split("\n");
  const linkRe = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  lines.forEach((text, i) => {
    for (const m of text.matchAll(linkRe)) {
      const target = m[1].replace(/#.*$/, "");
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//")) continue;
      const abs = resolve(dirname(file), target);
      const inside = relative(skillDir, abs);
      if (inside.startsWith("..") || resolve(inside) === inside) {
        fail(rel, i + 1, `link "${m[1]}" leaves the skill folder`);
      } else if (inside.split(sep).length > 2) {
        fail(rel, i + 1, `link "${m[1]}" is more than one level deep`);
      } else if (!existsSync(abs)) {
        fail(rel, i + 1, `link "${m[1]}" does not resolve`);
      }
    }
  });
}

// User-facing text says Merget and names tools the way the server does. The
// client-specific prefixes belong in one place, clients.md, and sema survives
// only as the server's host and in the CHANGELOG's history.
function checkForbiddenStrings() {
  const clients = "skills/merget-setup/references/clients.md";
  const rules = [
    { re: /mcp__|\/mcp →/, exempt: [clients, "CHANGELOG.md"], what: "a client-specific tool prefix" },
    { re: /\bsema_\w+/, exempt: ["CHANGELOG.md"], what: "an old sema_ tool name" },
    { re: /\bsema\b/i, exempt: ["CHANGELOG.md"], what: "the word sema (user-facing copy says Merget)", strip: /sema\.merget\.ai/gi },
  ];
  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel === "packaging/build.mjs") continue; // defines the rules, so it names the words
    if (!/\.(md|json|mjs|js|yml|yaml|svg|txt|toml)$/.test(rel) && !rel.startsWith(".")) continue;
    const lines = read(rel).split("\n");
    for (const rule of rules) {
      if (rule.exempt.includes(rel)) continue;
      lines.forEach((text, i) => {
        const probe = rule.strip ? text.replace(rule.strip, "") : text;
        if (rule.re.test(probe)) fail(rel, i + 1, `${rule.what}: ${text.trim().slice(0, 80)}`);
      });
    }
  }
}

// Clients that pin the version (Claude Code, Codex, Copilot, Devin) fetch a
// new copy only when the version string changes, so a change to anything they
// read must come with a bump. No client reads these paths; a source.json
// change without a bump shows in the manifests it writes, which are read.
const UNSHIPPED = [".github/", ".gitignore", "packaging/", "CHANGELOG.md", "PR-BODY.md", "README.md", "RELEASING.md"];

// The files are those changed since the branch left `base`, including what is
// not committed yet; the version must differ from what `base` has now, not
// only from what it had back then, or the release would be a tag that exists.
function checkVersionBump(base) {
  let shipped, previous;
  try {
    const since = git("merge-base", base, "HEAD").trim();
    const changed = git("diff", "--name-only", since).split("\n").filter(Boolean);
    shipped = changed.filter((f) => !UNSHIPPED.some((p) => f === p || f.startsWith(p)));
    // Before 0.8.0 the version lived in the Claude Code manifest alone.
    const manifest = gitShow(base, SOURCE) ?? gitShow(base, ".claude-plugin/plugin.json");
    previous = manifest ? JSON.parse(manifest).version : undefined;
  } catch (e) {
    return fail(SOURCE, 1, `cannot compare with ${base}: ${(e.stderr || e.message).trim()}`);
  }
  if (shipped.length && previous === source.version) {
    fail(SOURCE, 1, `version is still ${source.version}, as on ${base}, but files clients read changed: ${shipped.join(", ")}`);
  }
}

function git(...argv) {
  return execFileSync("git", argv, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function gitShow(ref, path) {
  try {
    return git("show", `${ref}:${path}`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// --validate: a validator for the subset of JSON Schema these schemas use.

function validateGenerated() {
  const loaded = {};
  for (const [key, s] of Object.entries(SCHEMAS)) {
    if (!existsSync(join(ROOT, s.file))) {
      fail(s.file, 1, `missing; fetch it from ${s.id}`);
      continue;
    }
    loaded[key] = JSON.parse(read(s.file));
    if (loaded[key].$id !== s.id) fail(s.file, 1, `$id is ${loaded[key].$id}, expected ${s.id}`);
  }
  for (const t of targets()) {
    for (const key of t.validateWith ?? []) {
      if (!loaded[key]) continue;
      const path = join(ROOT, t.path);
      if (!existsSync(path)) {
        fail(t.path, 1, "missing; run `node packaging/build.mjs`");
        continue;
      }
      const errors = [];
      validate(JSON.parse(readFileSync(path, "utf8")), loaded[key], loaded[key], "$", errors);
      for (const e of errors) fail(t.path, 1, `[${SCHEMAS[key].file}] ${e}`);
    }
  }
}

function validate(value, schema, root, at, errors) {
  if (schema === true) return;
  if (schema === false) return void errors.push(`${at}: not allowed`);
  if (schema.$ref) return validate(value, deref(schema.$ref, root), root, at, errors);

  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    errors.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${at}: must be one of ${JSON.stringify(schema.enum)}`);
  }
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => isType(value, t))) {
      errors.push(`${at}: expected ${types.join(" or ")}, got ${isType(value, "array") ? "array" : value === null ? "null" : typeof value}`);
      return;
    }
  }
  if (schema.not) {
    const sub = [];
    validate(value, schema.not, root, at, sub);
    if (!sub.length) errors.push(`${at}: must not match ${JSON.stringify(schema.not)}`);
  }
  for (const combinator of ["oneOf", "anyOf"]) {
    if (!schema[combinator]) continue;
    const passing = schema[combinator].filter((s) => {
      const sub = [];
      validate(value, s, root, at, sub);
      return sub.length === 0;
    }).length;
    if (passing === 0 || (combinator === "oneOf" && passing > 1)) {
      errors.push(`${at}: matches ${passing} of the ${schema[combinator].length} ${combinator} branches`);
    }
  }
  if (schema.allOf) for (const s of schema.allOf) validate(value, s, root, at, errors);

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${at}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${at}: "${value}" does not match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => validate(v, schema.items, root, `${at}[${i}]`, errors));
  }
  if (isType(value, "object")) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${at}: missing required "${key}"`);
    }
    for (const [key, v] of Object.entries(value)) {
      if (schema.propertyNames) validate(key, schema.propertyNames, root, `${at}.${key} (name)`, errors);
      if (schema.properties && key in schema.properties) {
        validate(v, schema.properties[key], root, `${at}.${key}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}: property "${key}" is not allowed`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        validate(v, schema.additionalProperties, root, `${at}.${key}`, errors);
      }
    }
  }
}

function deref(ref, root) {
  if (!ref.startsWith("#/")) throw new Error(`only local $ref is supported, got ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((o, k) => o[k.replace(/~1/g, "/").replace(/~0/g, "~")], root);
}

function isType(value, type) {
  switch (type) {
    case "object": return value !== null && typeof value === "object" && !Array.isArray(value);
    case "array": return Array.isArray(value);
    case "null": return value === null;
    case "integer": return Number.isInteger(value);
    case "number": return typeof value === "number";
    default: return typeof value === type;
  }
}

// ---------------------------------------------------------------------------
// helpers

// A Windows checkout may carry CRLF endings; the rules are about content.
function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

// Sorted keys and a trailing newline keep diffs small and the files diffable
// by hand whatever order the targets list fields in.
function render(data) {
  return JSON.stringify(sortKeys(data), null, 2) + "\n";
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  }
  return value;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

// ---------------------------------------------------------------------------

function main() {
  checkSource();
  if (mode === "write") {
    for (const t of targets()) {
      mkdirSync(join(ROOT, dirname(t.path)), { recursive: true });
      writeFileSync(join(ROOT, t.path), render(t.data));
      console.log(`wrote ${t.path}`);
    }
  } else if (mode === "--check") {
    checkGenerated();
    checkChangelog();
    checkSkills();
    checkForbiddenStrings();
    if (base) checkVersionBump(base);
  } else if (mode === "--validate") {
    validateGenerated();
  } else {
    console.error(`unknown mode ${mode}; use no argument, --check [--base <ref>] or --validate`);
    process.exit(2);
  }

  if (failures.length) {
    for (const f of failures) console.error(f);
    console.error(`${failures.length} problem${failures.length === 1 ? "" : "s"}`);
    process.exit(1);
  }
  if (mode !== "write") console.log(`${mode} passed`);
}

main();
