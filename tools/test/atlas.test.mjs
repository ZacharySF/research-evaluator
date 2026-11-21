import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateAtlas, checkAngleMap, renderAtlas, bestRound, roundProgress } from "../atlas.mjs";

const sections = [
  { name: "Novelty", threshold: 94 },
  { name: "Impressiveness", threshold: 94 },
  { name: "Accessibility", threshold: 80 },
];
const scores = (values) => sections.map((s, i) => ({ ...s, score: values[i] }));
const data = () => ({
  meta: { title: "Custom rubric atlas", updated: "fixture", goal: "Find a gap", sections, judge_mode: "potential" },
  areas: [{ id: "a", name: "Sensing" }, { id: "b", name: "Theory" }],
  angles: [
    { id: "x", area: "a", name: "Glass detection", map_name: "Glass detection", status: "closed",
      best: { source: "R1", kind: "judged", label: "R1: 1/3 sections" }, rounds: [1],
      why_closed: "Vendor app ships it", kill_sources: [{ title: "Vendor note", url: "https://example.com/n" }] },
    { id: "y", area: "a", name: "Echo <windows>", map_name: "Echo windows", status: "partial", leftover: "bench SNR" },
    { id: "z", area: "b", name: "Sun compass", map_name: "Sun compass", status: "open" },
  ],
  rounds: [
    { n: 1, title: "Glass", angle: "x", verdict: "REVISE", sections: scores([80, 76, 90]), one_line: "known" },
    { n: 2, title: "Echo", angle: "y", verdict: "REVISE", sections: scores([96, 95, 70]), one_line: "custom section fails" },
    { n: 3, title: "Radar", angle: "y", verdict: "discarded", one_line: "own bound refuted it" },
  ],
  frontier: [{ angle: "z", why_promising: "attacks heading directly" }],
});

test("an arbitrary custom section can prevent acceptance despite two high novelty/impact scores", () => {
  const d = data();
  const p = roundProgress(d.rounds[1], d.meta.sections);
  assert.equal(p.passing, 2);
  assert.equal(p.total, 3);
  assert.equal(p.complete, true);
  const wrong = data(); wrong.rounds[1].verdict = "PASS";
  assert.throws(() => validateAtlas(wrong), /PASS.*section/);
});

test("atlas preserves an explicitly supplied pass rule instead of interpreting arbitrary language", () => {
  const d = data();
  d.meta.pass_rule = "At least two sections pass and every hard constraint is met";
  d.meta.hard_constraints = ["No global clock", "No paid service"];
  d.rounds[1].verdict = "PASS";
  const html = renderAtlas(d);
  assert.match(html, /At least two sections pass and every hard constraint is met/);
  assert.match(html, /No global clock/);
});

test("atlas supports rubrics without any novelty or impact section", () => {
  const d = data();
  d.meta.sections = [{ name: "Correctness", threshold: 92 }, { name: "Clarity", threshold: 85 }];
  d.rounds = [{ n: 1, title: "Local certificates", angle: "x", verdict: "REVISE", sections: [
    { name: "Correctness", threshold: 92, score: 90 }, { name: "Clarity", threshold: 85, score: 95 },
  ] }];
  const p = roundProgress(d.rounds[0], d.meta.sections);
  assert.equal(p.passing, 1);
  assert.equal(p.total, 2);
  const html = renderAtlas(d);
  assert.match(html, /Correctness/);
  assert.match(html, /Clarity/);
  assert.doesNotMatch(html, /audience impact/);
});

test("validateAtlas rejects inconsistent references, criteria, and scored history", () => {
  const dup = data(); dup.angles.push({ ...dup.angles[0] });
  assert.throws(() => validateAtlas(dup), /duplicate angle id: x/);
  const area = data(); area.angles[0].area = "nope";
  assert.throws(() => validateAtlas(area), /angle x: unknown area nope/);
  const status = data(); status.angles[0].status = "done";
  assert.throws(() => validateAtlas(status), /angle x: bad status done/);
  const front = data(); front.frontier[0].angle = "q";
  assert.throws(() => validateAtlas(front), /frontier: unknown angle q/);
  const duplicateSection = data(); duplicateSection.meta.sections = [{ name: "Rigor", threshold: 80 }, { name: "rigor", threshold: 85 }];
  assert.throws(() => validateAtlas(duplicateSection), /duplicate section/);
  const invalidGate = data(); invalidGate.meta.sections = [{ name: "Rigor", threshold: 101 }];
  assert.throws(() => validateAtlas(invalidGate), /threshold/);
  const blocked = data(); blocked.rounds[0].verdict = "BLOCKED";
  assert.throws(() => validateAtlas(blocked), /BLOCKED.*scores/);
  const badScore = data(); badScore.rounds[0].sections[0].score = 101;
  assert.throws(() => validateAtlas(badScore), /score/);
});

test("blocked and discarded rounds stay unscored without losing configured sections", () => {
  const d = data();
  d.rounds[1].verdict = "BLOCKED";
  d.rounds[1].sections = scores([null, null, null]);
  const p = roundProgress(d.rounds[1], d.meta.sections);
  assert.equal(p.passing, 0);
  assert.equal(p.complete, false);
  assert.equal(bestRound(d.rounds, d.meta.sections).n, 1);
  const html = renderAtlas(d);
  assert.match(html, /BLOCKED/);
  assert.match(html, /Accessibility/);
});

test("changed criteria cannot silently compete in the current best-round ranking", () => {
  const d = data();
  d.rounds[0].sections = [{ name: "Other", threshold: 50, score: 100 }];
  assert.equal(bestRound(d.rounds, d.meta.sections).n, 2);
});

test("coverage cannot ignore unnamed angles or let one row cover two candidates", () => {
  const angles = [{ id: "short", map_name: "Echo" }, { id: "long", map_name: "Echo windows" }, { id: "unnamed" }];
  const r = checkAngleMap(angles, "| Sensing | Echo windows | partial |");
  assert.deepEqual(r.stale, ["short", "unnamed"]);
  assert.deepEqual(r.missing, []);
  const duplicate = checkAngleMap([{ id: "a", map_name: "Echo" }, { id: "b", map_name: "Echo" }], "| Sensing | Echo | partial |");
  assert.deepEqual(duplicate.stale, ["a", "b"]);
  assert.deepEqual(duplicate.missing, ["Sensing | Echo"]);
});

test("atlas escapes evidence and refuses executable links", () => {
  const d = data();
  d.angles[0].kill_sources[0].url = "javascript:alert(1)";
  d.rounds[0].file = "data:text/html,<script>alert(1)</script>";
  const html = renderAtlas(d);
  assert.match(html, /Echo &lt;windows&gt;/);
  assert.doesNotMatch(html, /Echo <windows>|href="(?:javascript|data):/);
});

test("an empty research memory has no invalid chart geometry", () => {
  const d = data(); d.areas = []; d.angles = []; d.rounds = []; d.frontier = [];
  assert.doesNotMatch(renderAtlas(d), /Infinity|NaN|viewBox="0 0 \d+ -/);
});

test("the custom-rubric example represents every Markdown angle", () => {
  const ex = JSON.parse(readFileSync(new URL("../../examples/research-memory/atlas-data.json", import.meta.url), "utf8"));
  const md = readFileSync(new URL("../../examples/research-memory/angle-map.md", import.meta.url), "utf8");
  validateAtlas(ex);
  const r = checkAngleMap(ex.angles, md);
  assert.deepEqual([r.missing, r.stale], [[], []]);
});
