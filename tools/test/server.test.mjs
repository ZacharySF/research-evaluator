import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startSetupServer } from "../ui.mjs";

const rubric = {
  topic: "Gaze tracking",
  sections: [{ name: "Novelty", threshold: 94, requirements: "Distinct from prior art" }],
  hard_constraints: [],
};

const post = (url, path, body) =>
  fetch(url + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("setup server refuses an unscorable rubric, then saves a valid one and reports saved", async () => {
  const dir = mkdtempSync(join(tmpdir(), "re-setup-"));
  const { url, done } = await startSetupServer({ dir, port: 0, idleMinutes: 1 });

  const bad = await post(url, "/api/save", { ...rubric, topic: "" });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /topic/);
  assert.equal(existsSync(join(dir, "rubric.json")), false);

  const ok = await post(url, "/api/save", { ...rubric, sections: [{ ...rubric.sections[0], threshold: "88" }] });
  assert.equal(ok.status, 200);
  const result = await done;
  assert.equal(result.status, "saved");
  assert.equal(JSON.parse(readFileSync(join(dir, "rubric.json"), "utf8")).sections[0].threshold, 88);
  assert.equal(JSON.parse(readFileSync(join(dir, ".rubric-setup.json"), "utf8")).status, "saved");
});

test("setup server prefills the page from an existing rubric and records a cancel", async () => {
  const dir = mkdtempSync(join(tmpdir(), "re-setup-"));
  writeFileSync(join(dir, "rubric.json"), JSON.stringify({ ...rubric, topic: "Existing topic" }));
  const { url, done } = await startSetupServer({ dir, port: 0, idleMinutes: 1 });

  const init = await (await fetch(url + "/api/init")).json();
  assert.equal(init.rubric.topic, "Existing topic");
  assert.equal((await fetch(url + "/")).status, 200);

  await post(url, "/api/cancel", {});
  assert.equal((await done).status, "cancelled");
  assert.equal(JSON.parse(readFileSync(join(dir, "rubric.json"), "utf8")).topic, "Existing topic", "cancel keeps the old rubric");
});
