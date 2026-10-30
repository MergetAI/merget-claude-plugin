#!/usr/bin/env node
// The install smoke test: after `claude plugin marketplace add ./` and
// `claude plugin install merget@merget-queue` in a clean HOME, the copy Claude
// Code installed must carry the four skills and exactly one MCP server named
// merget. A plugin and a hand-added server at the same URL would give an agent
// every tool twice, so the count is the point, not just the presence.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PLUGIN_ID = "merget@merget-queue";
const SKILLS = ["merget-setup", "merget-operate", "merget-pr", "merget-graph"];
const SERVER = "merget";

const problems = [];
const expect = (ok, message) => ok || problems.push(message);

// Through the shell so a Windows `claude.cmd` shim works too; the command is a constant.
const listed = JSON.parse(execSync("claude plugin list --json", { encoding: "utf8" }));
const plugin = listed.find((p) => p.id === PLUGIN_ID);
if (!plugin) {
  console.error(`${PLUGIN_ID} is not installed; claude plugin list --json returned ${JSON.stringify(listed.map((p) => p.id))}`);
  process.exit(1);
}
console.log(`${PLUGIN_ID} ${plugin.version} at ${plugin.installPath}`);

expect(plugin.enabled === true, "plugin is installed but not enabled");
expect(existsSync(plugin.installPath), `installPath does not exist: ${plugin.installPath}`);

for (const skill of SKILLS) {
  const file = join(plugin.installPath, "skills", skill, "SKILL.md");
  expect(existsSync(file), `missing skill: skills/${skill}/SKILL.md`);
}

const mcpFile = join(plugin.installPath, ".mcp.json");
if (!existsSync(mcpFile)) {
  problems.push("installed copy has no .mcp.json");
} else {
  const servers = JSON.parse(readFileSync(mcpFile, "utf8")).mcpServers ?? {};
  const names = Object.keys(servers);
  expect(names.length === 1 && names[0] === SERVER, `.mcp.json servers are ${JSON.stringify(names)}; expected exactly ["${SERVER}"]`);
  expect(servers[SERVER]?.type === "http", `.mcp.json ${SERVER}.type is ${servers[SERVER]?.type}; expected "http"`);
  expect(!("_meta" in (servers[SERVER] ?? {})), `.mcp.json ${SERVER} still carries _meta`);
}

// What Claude Code itself resolved for the plugin, not just the file on disk.
const resolved = Object.keys(plugin.mcpServers ?? {});
expect(resolved.length === 1 && resolved[0] === SERVER, `Claude Code resolved servers ${JSON.stringify(resolved)}; expected exactly ["${SERVER}"]`);

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(`ok: ${SKILLS.length} skills, one "${SERVER}" server`);
