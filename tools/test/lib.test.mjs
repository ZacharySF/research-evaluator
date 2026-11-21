import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRubric, renderReport, thresholdZone } from "../lib.mjs";

const valid = () => ({
  topic: "  Low-power gaze tracking  ",
  goal: "Find a publishable gap",
  audience: "Meta Reality Labs",
  judge_mode: "potential",
  sections: [
    { name: "Novelty", threshold: "94", requirements: "Distinct from closest prior art", scoring_guide: "" },
    { name: "Feasibility", threshold: 80.4, requirements: "Buildable with a phone" },
  ],
  hard_constraints: ["No new hardware", "  ", ""],
  notes: "",
});

test("normalizeRubric trims text, coerces thresholds, drops blank constraints, fills pass rule", () => {
  const r = normalizeRubric(valid());
  assert.equal(r.topic, "Low-power gaze tracking");
  assert.deepEqual(r.sections.map((s) => s.threshold), [94, 80]);
  assert.deepEqual(r.hard_constraints, ["No new hardware"]);
  assert.equal(r.pass_rule, "all sections >= threshold and no hard constraint violated");
  assert.equal(r.judge_mode, "potential");
});

test("normalizeRubric defaults judge_mode to potential and rejects unknown modes", () => {
  const r = valid();
  delete r.judge_mode;
  assert.equal(normalizeRubric(r).judge_mode, "potential");
  assert.throws(() => normalizeRubric({ ...valid(), judge_mode: "vibes" }), /judge_mode/);
});

test("normalizeRubric rejects a rubric the evaluator cannot score", () => {
  assert.throws(() => normalizeRubric({ ...valid(), topic: "   " }), /topic/);
  assert.throws(() => normalizeRubric({ ...valid(), sections: [] }), /section/);
  for (const threshold of [0, 101, "abc", null]) {
    const r = valid();
    r.sections[0].threshold = threshold;
    assert.throws(() => normalizeRubric(r), /threshold/, `threshold ${threshold}`);
  }
  const noReq = valid();
  noReq.sections[1].requirements = " ";
  assert.throws(() => normalizeRubric(noReq), /Feasibility.*pass/);
  const dup = valid();
  dup.sections[1].name = "novelty";
  assert.throws(() => normalizeRubric(dup), /duplicate/i);
});

test("thresholdZone names the strictness band at its boundaries", () => {
  assert.equal(thresholdZone(69).label, "Lenient");
  assert.equal(thresholdZone(70).label, "Solid");
  assert.equal(thresholdZone(85).label, "Strict");
  assert.equal(thresholdZone(94).label, "Elite");
});

const evalRound = (round, verdict, scores, extra = {}) => ({
  verdict,
  round,
  sections: scores.map(([name, score, threshold]) => ({
    name, score, threshold, passed: score >= threshold, why: `${name} why ${round}`, lacking: score >= threshold ? "" : `${name} lacking ${round}`,
  })),
  prior_art: [],
  fact_checks: [],
  grill: [],
  loopy_receipt: "",
  next_research_action: `next ${round}`,
  summary: `summary ${round}`,
  ...extra,
});

test("renderReport shows the latest round's verdict, scores and gaps, plus every round's history", () => {
  const rubric = normalizeRubric(valid());
  const html = renderReport(rubric, [
    { file: "evaluation-round1.json", data: evalRound(1, "REVISE", [["Novelty", 71, 94], ["Feasibility", 60, 80]]) },
    { file: "evaluation-round2.json", data: evalRound(2, "REVISE", [["Novelty", 88, 94], ["Feasibility", 83, 80]]) },
  ]);
  assert.match(html, /Round 2/);
  assert.match(html, /REVISE/);
  assert.match(html, /next 2/);
  assert.match(html, /Novelty lacking 2/);
  assert.doesNotMatch(html, /Novelty lacking 1/, "older rounds' gaps are superseded");
  assert.match(html, /71[\s\S]*88/, "history lists each round's score in order");
});

test("renderReport escapes evaluator text so a hostile string cannot run in the page", () => {
  const rubric = normalizeRubric(valid());
  const html = renderReport(rubric, [
    { file: "evaluation-round1.json", data: evalRound(1, "REVISE", [["Novelty", 50, 94], ["Feasibility", 50, 80]], { summary: "<script>alert(1)</script>" }) },
  ]);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert/);
});

test("custom rubric names and measured judging survive report generation", () => {
  const rubric = normalizeRubric({
    ...valid(), judge_mode: "measured",
    sections: [{ name: "Reproducibility", threshold: 89, requirements: "Independent measurement receipt" }],
  });
  assert.equal(rubric.judge_mode, "measured");
  assert.deepEqual(rubric.sections.map((s) => s.name), ["Reproducibility"]);
  const html = renderReport(rubric, [{
    file: "evaluation-round1.json",
    data: evalRound(1, "REVISE", [["Reproducibility", 85, 89]]),
  }]);
  assert.match(html, /Reproducibility/);
  assert.match(html, /85/);
  assert.doesNotMatch(html, /Novelty/);
});

test("blocked rubric reviews render null scores without manufacturing zero scores", () => {
  const rubric = normalizeRubric(valid());
  const html = renderReport(rubric, [{
    file: "evaluation-round1.json",
    data: evalRound(1, "BLOCKED", [["Novelty", null, 94], ["Feasibility", null, 80]]),
  }]);
  assert.match(html, /BLOCKED/);
  assert.doesNotMatch(html, /<b>0<\/b>/);
});

