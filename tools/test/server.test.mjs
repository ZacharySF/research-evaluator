import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startSetupServer } from "../ui.mjs";

const setup = { goal: "Gaze tracking", thresholds: { novelty: 94, audience_impact: 94 }, constraints: [] };
const post = (url, path, body) =>
  fetch(url + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("setup server refuses an unusable setup, then saves a valid one and reports saved", async () => {
  const dir = mkdtempSync(join(tmpdir(), "re-setup-"));
  const { url, done } = await startSetupServer({ dir, port: 0, idleMinutes: 1 });

  const bad = await post(url, "/api/save", { ...setup, goal: "" });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /goal/);
  assert.equal(existsSync(join(dir, "review-setup.json")), false);

  const plain = await fetch(url + "/api/save", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(setup) });
  assert.equal(plain.status, 415, "non-JSON posts are refused so other sites cannot drive the page");

  const ok = await post(url, "/api/save", { ...setup, thresholds: { novelty: "88", audience_impact: 90 } });
  assert.equal(ok.status, 200);
  assert.equal((await done).status, "saved");
  assert.equal(JSON.parse(readFileSync(join(dir, "review-setup.json"), "utf8")).thresholds.novelty, 88);
});

test("setup server prefills from an existing setup and records a cancel without touching it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "re-setup-"));
  writeFileSync(join(dir, "review-setup.json"), JSON.stringify({ ...setup, goal: "Existing goal" }));
  const { url, done } = await startSetupServer({ dir, port: 0, idleMinutes: 1 });

  assert.equal((await (await fetch(url + "/api/init")).json()).setup.goal, "Existing goal");
  assert.equal((await fetch(url + "/")).status, 200);

  await post(url, "/api/cancel", {});
  assert.equal((await done).status, "cancelled");
  assert.equal(JSON.parse(readFileSync(join(dir, "review-setup.json"), "utf8")).goal, "Existing goal");
});
