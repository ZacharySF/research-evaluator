# Durable research memory

Optional memory for an explicitly authorized improvement loop, not permission to start one. Evaluate-once still returns one evaluator review. Copy into an authorized project directory without overwriting existing research, `rubric.json`, or `evaluation-roundN.json`; never write memory into installed skill/global agent directories. Empty research arrays are intentional: no evidence is preloaded.

## Ownership and lifecycle

- User: owns the actual `rubric.json`, every section/threshold, requirements, scoring guides, hard constraints, mode, and acceptance rule.
- Builder: preserves candidate/version receipts and verbatim `evaluation-roundN.json` custom reports. Reports remain immutable evidence.
- Retrospective: maintains [playbook](playbook.md), [angle map](angle-map.md), [lessons](lessons.md), [calibration](calibration.md), and [atlas data](atlas-data.json) from receipts, including discards and blockers. Chooses diverse next questions rather than renamed failures.
- Auditor: owns [audit history](validator-audits.md); edits only an explicitly authorized project-local evaluator definition. No global instruction changes, historical score rewrites, or relaxed criteria.
- Renderer: generates `atlas.html`. Do not hand-edit it; JSON and Markdown must stay synchronized.

Use the complete packaged role definitions in fresh generic contexts, not similarly named global Determine-specific agents. Without independent agents disclose sequential mode, never independent approval. Potential mode need not have a prototype; measured mode requires rubric-specified measurements. Neither memory nor feedback authorizes hidden loops or loosened user limits.

## Saved rubric and review contracts

The saved rubric is `{ topic, goal, audience, judge_mode: "potential" | "measured", sections: [{ name, threshold, requirements, scoring_guide }], hard_constraints, pass_rule, notes }`. It is authoritative: configure the atlas from this file, never overwrite it with template defaults.

The native custom evaluator report remains `{ verdict, round, sections: [{ name, score, threshold, passed, why, lacking }], prior_art: [{ title, url, overlap, what_remains_new }], fact_checks: [{ claim, status, evidence }], grill: [{ question, recommendation }], loopy_receipt, next_research_action, summary }`. Each configured section is present. `BLOCKED` sections use `score: null` and `passed: false`, never invented numeric placeholders. Save these reports as `evaluation-roundN.json`, not a parallel report format.

## Atlas projection schema

`atlas-data.json` is a projection, **not** a replacement evaluator report or rubric.

- `meta`: `title`, `updated`, `goal`, `standing`, `standard`, `sections: [{ name, threshold }]`, `judge_mode` (`potential` or `measured`), `pass_rule`, and `hard_constraints`. Copy the current rubric's exact pass rule and every hard constraint; the last two fields may be omitted only for empty/default metadata. Names are unique; thresholds are numbers from 1–100. The empty template illustrates Novelty 94, Impressiveness 94, Feasibility 80, Evidence quality 80. Copy the actual configured sections and mode instead of imposing those defaults. Optional `what_worked` and `glossary` pairs add context. There is no `meta.gate` or hidden acceptance pair.
- `areas`: unique stable `{ id, name, description? }` objects. Empty is valid.
- `angles`: unique stable `id`, valid `area`, `name`, unique `map_name`, and `status` (`closed`, `partial`, `active`, `open`). Each `map_name` matches exactly one column-2 entry in `angle-map.md`, headed `Angle` or `Angle to try`; keep names exact and avoid overlapping prefixes. Optional `short`, `rounds` numbers, `best`, `why_closed`, `leftover`, `note`, `kill_sources`, and `docs` explain provenance. `kill_sources` are `{ title, url? }`; use real links only. Record source quality, closure evidence, and reopening condition. Empty is valid.
- `rounds`: `{ n, angle, title, file?, verdict, one_line, sections, pass_rule? }`, with positive sequential `n`, a valid angle ID, and optional `file` linking an actual receipt. Every scored round includes **every section configured for that historical round** as `{ name, score, threshold, passed?, why?, lacking? }`, with numeric 1–100 scores and original thresholds. Preserve historical section sets/thresholds if the current rubric changes; only rounds matching current names and thresholds participate in display-only best ranking. Preserve a different historical `pass_rule` when applicable. No scalar novelty/impact fields. Empty rounds are valid.
- For a `BLOCKED` or builder-discard round, `sections` may be absent/empty or contain every configured section with `score: null` and `passed: false`; never mix guessed numbers into unscored outcomes. Preserve the full native blocked review separately. Discard is an unscored builder outcome, not a reviewer verdict.
- Angle `best`: optional `{ kind, source, label }`, where `source` names the real/simulated round or explicitly identified estimate, `kind` distinguishes `judged`, `discard`, or `blocked`, and `label` is **text** describing all scored sections or the unscored outcome. A scout estimate must be explicitly labeled an estimate, not a judged score. Do not add scalar novelty/impact scores here.
- `frontier`: `{ angle, why_promising, kill_risk?, budget_first? }`. `blockers`: `{ title, text, refs? }`. `risks`: `{ title, text, check? }`.
- `latest_batch`: optional `{ date, results: [{ angle, agent?, outcome, text }] }`. `lessons`: `{ id, pattern, evidence, check }`. `calibration`: `{ name, candidate, estimate, judge, outcome }`, plus optional `calibration_notes` strings. Label predictions and actual review mode; never backfill predictions or replace missing review scores.
- `audits`: `{ date, rounds?, finding, edits? }`; recommendations without authorization are not applied edits.

Acceptance requires the configured pass rule and all hard constraints, with mode-appropriate evidence. The default requires all section thresholds; an explicit custom rule is displayed rather than silently replaced or interpreted by the atlas. No display total creates PASS. A high-score summary without the warranted original review is not approval.

“Best” is the highest **total across comparable scored sections**, for display only. It is not another score/gate or a compensating acceptance rule. Different section sets, rubrics, thresholds, audiences, modes, or constraints make totals unsuitable as controlled comparisons; retain caveats in `meta.standing`/`standard` and calibration. Preserve original receipts if the user changes criteria rather than silently converting old history. Potential scores are not measured success.

All file/source links resolve relative to the loop directory and generated page, not the repository or shell. Do not invent links to nonexistent reports. Fictional source labels stay no-link and explicitly fictional.

## Render explicitly

From the repository root:

```sh
node tools/ui.mjs atlas --dir <loop-dir> --check --no-open
node tools/ui.mjs atlas --dir <loop-dir>
```

`--check` validates data/map consistency before writing and refuses missing or stale angle rows, leaving previous HTML untouched. It does not verify truth or independent approval. The command reads explicitly selected local files and writes static HTML; it performs no research, network access, agents, runtime directory scans, watching, or automatic updates. Rerun after authorized changes. Empty areas, angles, and rounds render a fresh atlas without invented activity.
