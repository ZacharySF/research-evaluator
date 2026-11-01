import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startAtlasServer } from "../live-atlas.mjs";

const fixture = { meta: { title: "Live research", gate: { novelty: 94, audience_impact: 94 } }, areas: [{ id: "systems", name: "Systems" }], angles: [{ id: "logs", name: "Logs", map_name: "Logs", area: "systems", status: "open" }] };

test("live snapshots follow research changes, reject partial writes, and recover without serving unrelated files", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "live-atlas-test-"));
  const save = (data) => writeFileSync(join(dir, "atlas-data.json"), JSON.stringify(data));
  save(fixture);
  writeFileSync(join(dir, "angle-map.md"), "| Area | Angle |\n|---|---|\n| Systems | Logs |\n");
  writeFileSync(join(dir, "private.txt"), "not public");
  const { server, url } = await startAtlasServer({ dir });
  t.after(() => { server.closeAllConnections(); server.close(); rmSync(dir, { recursive: true, force: true }); });
  const initial = await fetch(url + "/api/atlas");
  assert.equal(initial.status, 200);
  const etag = initial.headers.get("etag");
  assert.match(await initial.text(), /t-open/);
  assert.equal((await fetch(url + "/api/atlas", { headers: { "if-none-match": etag } })).status, 304);
  save({ ...fixture, angles: [{ ...fixture.angles[0], status: "active", note: "Checking log compaction prior art" }] });
  const changed = await fetch(url + "/api/atlas", { headers: { "if-none-match": etag } });
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.get("etag"), etag);
  assert.match(await changed.text(), /Checking log compaction prior art/);
  writeFileSync(join(dir, "atlas-data.json"), "{");
  assert.equal((await fetch(url + "/api/atlas")).status, 503);
  save(fixture);
  writeFileSync(join(dir, "angle-map.md"), "| Systems | Missing angle |\n");
  assert.equal((await fetch(url + "/api/atlas")).status, 503);
  writeFileSync(join(dir, "angle-map.md"), "| Systems | Logs |\n");
  assert.equal((await fetch(url + "/api/atlas")).status, 200);
  assert.equal((await fetch(url + "/private.txt")).status, 404);
  assert.equal((await fetch(url + "/api/atlas", { method: "POST" })).status, 405);
});

test("the viewer can open before the first research checkpoint exists", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "live-atlas-empty-"));
  const { server, url } = await startAtlasServer({ dir });
  t.after(() => { server.closeAllConnections(); server.close(); rmSync(dir, { recursive: true, force: true }); });
  const page = await fetch(url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Waiting for the first valid research checkpoint/);
  assert.equal((await fetch(url + "/api/atlas")).status, 503);
});
