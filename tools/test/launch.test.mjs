import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../ui.mjs", import.meta.url));

test("setup opens without a project directory and saves only in its temporary session", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "re-launch-cwd-"));
  let session;
  try {
    session = JSON.parse(execFileSync(process.execPath, [cli, "setup", "--no-open"], { cwd, encoding: "utf8" }));
    assert.notEqual(session.dir, cwd);
    assert.deepEqual(readdirSync(cwd), [], "launch must not write into the project without permission");
    const initial = await (await fetch(session.url + "/api/init")).json();
    assert.equal(initial.dir, session.dir);
    const response = await fetch(session.url + "/api/save", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "UI-first research", audience: "Systems researchers", thresholds: { novelty: 91, audience_impact: 87 }, constraints: ["Public sources only"] }),
    });
    assert.equal(response.status, 200);
    const saved = await response.json();
    assert.equal(saved.setup, join(session.dir, "review-setup.json"));
    const result = JSON.parse(execFileSync(process.execPath, [cli, "wait", "--dir", session.dir], { encoding: "utf8", timeout: 10000 }));
    assert.equal(result.status, "saved");
    const setup = JSON.parse(readFileSync(saved.setup, "utf8"));
    assert.equal(setup.goal, "UI-first research");
    assert.deepEqual(setup.thresholds, { novelty: 91, audience_impact: 87 });
    assert.deepEqual(setup.constraints, ["Public sources only"]);
    assert.deepEqual(readdirSync(cwd), []);
  } finally {
    if (session) {
      await fetch(session.url + "/api/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => {});
      rmSync(session.dir, { recursive: true, force: true });
    }
    rmSync(cwd, { recursive: true, force: true });
  }
});
