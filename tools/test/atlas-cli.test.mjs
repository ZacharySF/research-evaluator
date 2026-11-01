import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const cli = fileURLToPath(new URL("../ui.mjs", import.meta.url));
const fixture = {
  meta: { title: "CLI fixture", gate: { novelty: 94, audience_impact: 88 } },
  areas: [{ id: "storage", name: "Storage" }],
  angles: [{ id: "logs", name: "Logs", map_name: "Logs", area: "storage", status: "open" }],
  rounds: [], frontier: [],
};
const map = "| Area | Angle | Status |\n|---|---|---|\n| Storage | Logs | open |\n";

function inLoop(t) {
  const dir = mkdtempSync(join(tmpdir(), "atlas-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, "atlas-data.json"), JSON.stringify(fixture));
  writeFileSync(join(dir, "angle-map.md"), map);
  return dir;
}
function run(dir, ...args) {
  return spawnSync(process.execPath, [cli, "atlas", "--dir", dir, "--no-open", ...args], { encoding: "utf8" });
}

test("atlas --check writes a self-contained report only when all memory rows match", (t) => {
  const dir = inLoop(t);
  const r = run(dir, "--check");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).atlas, join(dir, "atlas.html"));
  assert.match(readFileSync(join(dir, "atlas.html"), "utf8"), /CLI fixture/);
});

test("atlas --check refuses missing or ambiguous coverage without replacing the last report", (t) => {
  const dir = inLoop(t);
  writeFileSync(join(dir, "atlas.html"), "previous report");
  writeFileSync(join(dir, "angle-map.md"), map + "| Storage | New question | open |\n");
  const r = run(dir, "--check");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /New question/);
  assert.equal(readFileSync(join(dir, "atlas.html"), "utf8"), "previous report");
});

test("atlas --check reports an absent angle map instead of silently declaring coverage", (t) => {
  const dir = inLoop(t);
  rmSync(join(dir, "angle-map.md"));
  const r = run(dir, "--check");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /angle-map\.md/);
  assert.equal(existsSync(join(dir, "atlas.html")), false);
});
