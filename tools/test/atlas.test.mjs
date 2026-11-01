import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateAtlas, checkAngleMap, renderAtlas, bestRound } from "../atlas.mjs";

const data = () => ({
  meta: { title: "Atlas", updated: "2026-10-31", goal: "Find a gap", gate: { novelty: 94, audience_impact: 94 } },
  areas: [{ id: "a", name: "Sensing" }, { id: "b", name: "Theory" }],
  angles: [
    { id: "x", area: "a", name: "Glass detection", map_name: "Glass detection", status: "closed",
      best: { source: "R1", kind: "judged", novelty: 70, audience_impact: 60 }, rounds: [1],
      why_closed: "Vendor app ships it", kill_sources: [{ title: "Vendor note", url: "https://example.com/n" }] },
    { id: "y", area: "a", name: "Echo <windows>", map_name: "Echo windows", status: "partial", leftover: "bench SNR" },
    { id: "z", area: "b", name: "Sun compass", map_name: "Sun compass", status: "open" },
  ],
  rounds: [
    { n: 1, title: "Glass", angle: "x", verdict: "REVISE", research_novelty: 72, idea_novelty: 70, novelty: 70, audience_impact: 60, one_line: "known" },
    { n: 2, title: "Echo", angle: "y", verdict: "REVISE", research_novelty: 84, idea_novelty: 81, novelty: 81, audience_impact: 88, one_line: "closer" },
    { n: 3, title: "Radar", angle: "y", verdict: "discarded", one_line: "own sim refuted it" },
  ],
  frontier: [{ angle: "z", why_promising: "attacks heading directly" }],
});

test("validateAtlas rejects references the page cannot draw", () => {
  assert.doesNotThrow(() => validateAtlas(data()));
  const dup = data(); dup.angles.push({ ...dup.angles[0] });
  assert.throws(() => validateAtlas(dup), /duplicate angle id: x/);
  const area = data(); area.angles[0].area = "nope";
  assert.throws(() => validateAtlas(area), /angle x: unknown area nope/);
  const status = data(); status.angles[0].status = "done";
  assert.throws(() => validateAtlas(status), /angle x: bad status done/);
  const front = data(); front.frontier[0].angle = "q";
  assert.throws(() => validateAtlas(front), /frontier: unknown angle q/);
  const round = data(); round.rounds[0].angle = "q";
  assert.throws(() => validateAtlas(round), /round 1: unknown angle q/);
  const min = data(); min.rounds[1].novelty = 84;
  assert.throws(() => validateAtlas(min), /round 2: novelty must be min\(research_novelty, idea_novelty\)/);
});

test("checkAngleMap finds memory rows missing from the atlas and atlas names missing from memory", () => {
  const md = [
    "| Area | Angle | Status |", "|---|---|---|",
    "| Sensing | **Glass detection** (ToF glint) | closed |",
    "| Sensing | Echo windows | partial |",
    "| Theory | Single-channel capacity | closed |",
  ].join("\n");
  const r = checkAngleMap(data().angles, md);
  assert.equal(r.rows.length, 3);
  assert.deepEqual(r.missing, ["Theory | Single-channel capacity"]);
  assert.deepEqual(r.stale, ["z"]);
});

test("coverage cannot silently ignore unnamed angles or let one row cover two candidates", () => {
  const angles = [
    { id: "short", map_name: "Echo" },
    { id: "long", map_name: "Echo windows" },
    { id: "unnamed" },
  ];
  const r = checkAngleMap(angles, "| Sensing | Echo windows | partial |");
  assert.deepEqual(r.stale, ["short", "unnamed"]);
  assert.deepEqual(r.missing, []);
  const duplicate = checkAngleMap([{ id: "a", map_name: "Echo" }, { id: "b", map_name: "Echo" }],
    "| Sensing | Echo | partial |");
  assert.deepEqual(duplicate.stale, ["a", "b"]);
  assert.deepEqual(duplicate.missing, ["Sensing | Echo"]);
});

test("bestRound picks the judged round with the highest combined score and ignores discards", () => {
  assert.equal(bestRound(data().rounds).n, 2);
  assert.equal(bestRound([{ n: 1, one_line: "x" }]), null);
});

test("renderAtlas shows explored vs unexplored territory, the gate and the best round", () => {
  const html = renderAtlas(data());
  assert.match(html, /class="tile t-open"/);
  assert.match(html, /gate 94/);
  assert.match(html, /Echo &lt;windows&gt;/);
  assert.doesNotMatch(html, /Echo <windows>/);
  assert.match(html, /href="https:\/\/example.com\/n"/);
  assert.match(html, /attacks heading directly/);
});

test("renderAtlas handles a loop with no judged round yet", () => {
  const d = data();
  d.rounds = [];
  d.angles.forEach((a) => { delete a.best; delete a.rounds; });
  const html = renderAtlas(d);
  assert.doesNotMatch(html, /class="chart"/);
});

test("an empty research memory renders without invalid geometry", () => {
  const d = data();
  d.areas = []; d.angles = []; d.rounds = []; d.frontier = [];
  assert.doesNotMatch(renderAtlas(d), /Infinity|NaN|viewBox="0 0 \d+ -/);
});

test("atlas source and receipt links cannot execute code from untrusted evidence", () => {
  const d = data();
  d.angles[0].kill_sources[0].url = "javascript:alert(1)";
  d.rounds[0].file = "data:text/html,<script>alert(1)</script>";
  assert.doesNotMatch(renderAtlas(d), /href="(?:javascript|data):/);
});

test("atlas gates and score history cannot turn malformed values into a chart or a pass", () => {
  for (const value of [0, 101, "<script>"]) {
    const d = data(); d.meta.gate.novelty = value;
    assert.throws(() => validateAtlas(d), /gate.novelty/);
  }
  const d = data(); d.rounds[0].n = "1<svg>";
  assert.throws(() => validateAtlas(d), /round number/);
  const blocked = data(); blocked.rounds[0].verdict = "BLOCKED";
  assert.throws(() => validateAtlas(blocked), /BLOCKED.*scores/);
});

test("the shipped example atlas is valid and fully matched to its angle map", () => {
  const ex = JSON.parse(readFileSync(new URL("../../examples/research-memory/atlas-data.json", import.meta.url), "utf8"));
  const md = readFileSync(new URL("../../examples/research-memory/angle-map.md", import.meta.url), "utf8");
  assert.doesNotThrow(() => validateAtlas(ex));
  const r = checkAngleMap(ex.angles, md);
  assert.deepEqual([r.missing, r.stale], [[], []]);
});
