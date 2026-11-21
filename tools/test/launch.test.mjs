import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../ui.mjs", import.meta.url));

test("setup opens without a project directory and saves a custom rubric only in its temporary session", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "re-launch-cwd-"));
  let session;
  try {
    session = JSON.parse(execFileSync(process.execPath, [cli, "setup", "--no-open"], { cwd, encoding: "utf8" }));
    assert.notEqual(session.dir, cwd);
    assert.deepEqual(readdirSync(cwd), [], "launch must not write into the project without permission");
    assert.equal((await (await fetch(session.url + "/api/init")).json()).dir, session.dir);
    const response = await fetch(session.url + "/api/save", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: "UI-first research", judge_mode: "measured", sections: [{ name: "Reproducibility", threshold: 88, requirements: "Public artifacts" }], hard_constraints: ["Public sources only"] }),
    });
    assert.equal(response.status, 200);
    const saved = await response.json();
    assert.equal(saved.rubric, join(session.dir, "rubric.json"));
    const result = JSON.parse(execFileSync(process.execPath, [cli, "wait", "--dir", session.dir], { encoding: "utf8", timeout: 10000 }));
    assert.equal(result.status, "saved");
    const rubric = JSON.parse(readFileSync(saved.rubric, "utf8"));
    assert.deepEqual(rubric.sections.map((s) => [s.name, s.threshold]), [["Reproducibility", 88]]);
    assert.equal(rubric.judge_mode, "measured");
    assert.deepEqual(rubric.hard_constraints, ["Public sources only"]);
    assert.deepEqual(readdirSync(cwd), []);
  } finally {
    if (session) {
      await fetch(session.url + "/api/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => {});
      rmSync(session.dir, { recursive: true, force: true });
    }
    rmSync(cwd, { recursive: true, force: true });
  }
});
