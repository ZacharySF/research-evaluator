import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSetup, renderReport, thresholdZone } from "../lib.mjs";

const valid = () => ({
  goal: "  Find a publishable gaze-tracking gap  ",
  audience: "Wearables researchers",
  thresholds: { novelty: "94", audience_impact: 80.4 },
  constraints: ["No new hardware", "  ", ""],
  limits: "Up to 5 rounds",
});

test("normalizeSetup trims text, coerces thresholds and drops blank constraints", () => {
  const s = normalizeSetup(valid());
  assert.equal(s.goal, "Find a publishable gaze-tracking gap");
  assert.deepEqual(s.thresholds, { novelty: 94, audience_impact: 80 });
  assert.deepEqual(s.constraints, ["No new hardware"]);
  assert.equal(s.limits, "Up to 5 rounds");
});

test("normalizeSetup defaults each missing threshold to 94", () => {
  const raw = valid();
  delete raw.thresholds;
  assert.deepEqual(normalizeSetup(raw).thresholds, { novelty: 94, audience_impact: 94 });
});

test("normalizeSetup rejects a setup the evaluator cannot use", () => {
  assert.throws(() => normalizeSetup({ ...valid(), goal: " " }), /goal/);
  for (const bad of [0, 101, "abc", null]) {
    assert.throws(() => normalizeSetup({ ...valid(), thresholds: { novelty: bad, audience_impact: 94 } }), /novelty/, String(bad));
  }
});

test("thresholdZone names the strictness band at its boundaries", () => {
  assert.equal(thresholdZone(69).label, "Lenient");
  assert.equal(thresholdZone(70).label, "Solid");
  assert.equal(thresholdZone(85).label, "Strict");
  assert.equal(thresholdZone(94).label, "Elite");
});

const review = (round, verdict, scores, extra = {}) => ({
  verdict, round, audience: "Wearables researchers",
  thresholds: { novelty: 94, audience_impact: 80 },
  scores: scores && { research_novelty: scores[0], idea_novelty: scores[1], novelty: Math.min(scores[0], scores[1]), audience_impact: scores[2] },
  constraints: [{ constraint: "No new hardware", status: "met", evidence: "Uses existing IMU." }],
  prior_art: [], evidence_checked: [], uncertainties: [], critique: [`critique ${round}`], questions: [],
  next_action: { action: `action ${round}`, acceptance_check: `check ${round}` },
  summary: `summary ${round}`,
  ...extra,
});

test("renderReport shows the latest verdict, novelty as the minimum sub-score, next action and every round", () => {
  const html = renderReport(normalizeSetup(valid()), [
    { file: "review-round1.json", data: review(1, "REVISE", [70, 60, 75]) },
    { file: "review-round2.json", data: review(2, "REVISE", [88, 91, 83]) },
  ]);
  assert.match(html, /Round 2/);
  assert.match(html, /action 2/);
  assert.match(html, /check 2/);
  assert.match(html, /critique 2/);
  assert.doesNotMatch(html, /critique 1/, "older critique is superseded");
  assert.match(html, /<b>88<\/b>/, "novelty headline is min(research 88, idea 91)");
  assert.match(html, /60[\s\S]*88/, "history lists each round's novelty in order");
});

test("renderReport shows a BLOCKED round without inventing scores", () => {
  const html = renderReport(normalizeSetup(valid()), [{ file: "review-round1.json", data: review(1, "BLOCKED", null) }]);
  assert.match(html, /BLOCKED/);
  assert.match(html, /No scores/);
  assert.doesNotMatch(html, /<b>\d+<\/b>/);
});

test("renderReport escapes evaluator text", () => {
  const html = renderReport(normalizeSetup(valid()), [{ file: "review-round1.json", data: review(1, "REVISE", [50, 50, 50], { summary: "<script>alert(1)</script>" }) }]);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert/);
});

test("renderReport with no reviews says nothing is scored yet", () => {
  assert.match(renderReport(normalizeSetup(valid()), []), /No reviews yet/);
});
