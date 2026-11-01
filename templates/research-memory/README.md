# Durable research memory

Optional files for an explicitly authorized improvement loop, not permission to start one. Evaluate-once still returns exactly one evaluator JSON review. Copy these templates into a user-authorized loop directory, preserving any existing files; do not write into installed skills or global agent directories. Configure the goal, audience, constraints, permissions, limits, and gates from the review packet. Empty arrays are intentional: no research evidence is preloaded.

## Ownership and lifecycle

- Builder: owns candidate/version receipts and saved verbatim `review-roundN.json` reports; those reports remain immutable evidence.
- Research retrospective: maintains [playbook](playbook.md), [angle map](angle-map.md), [lessons](lessons.md), [calibration](calibration.md), and [atlas data](atlas-data.json) from actual receipts, including discards and blockers. Chooses a deliberately diverse next batch, not more variants of the last failure.
- Validator-auditor: owns [audit history](validator-audits.md); may change only an explicitly authorized local evaluator copy, never global prompts by default. It cannot change gates, past scores, or verdicts.
- Atlas renderer: owns generated `atlas.html`; do not hand-edit that output. Data and Markdown remain human-readable sources of truth and must be updated together.

Without independent agents, disclose sequential mode in memory and reports; never label it independent approval. Missing a prototype is not a review prerequisite. Audits and retrospectives do not start hidden research loops or loosen user limits.

## Atlas data schema

`atlas-data.json` is an atlas projection, **not** the evaluator's review JSON schema. The evaluator contract and existing report command are unchanged.

- `meta`: `title`, `updated`, `goal`, optional `standing`/`standard`, and `gate: { novelty, audience_impact }` (numeric 1–100, default 94/94; user-configurable). Optional `what_worked` and `glossary` pairs add context.
- `areas`: objects with stable unique `id`, `name`, optional `description`.
- `angles`: stable unique `id`, valid `area`, `name`, unique `map_name`, and `status` (`closed`, `partial`, `active`, `open`). Each `map_name` begins exactly one column-2 entry in angle-map.md; the header is `Angle` or `Angle to try`. Avoid overlapping name prefixes. Optional `short`, `rounds` numbers, `best`, `why_closed`, `leftover`, `note`, `kill_sources`, and `docs` explain provenance and residuals. `kill_sources` are `{ title, url? }`; use real links only. Record closure source and reopen condition in the map and `note`, with source quality and uncertainty.
- `rounds`: positive sequential integer `n`, valid `angle`, `title`, `verdict`, `one_line`; optional `file` links a real saved candidate/receipt. Every scored round includes all four integer 1–100 fields: `research_novelty`, `idea_novelty`, `novelty` (their minimum), and `audience_impact`. For BLOCKED use `scores: null` and omit all numeric score fields; preserve the verbatim blocked review separately. Discards are unscored builder outcomes, not evaluator verdicts. Never infer PASS from a high-score summary; the report must also warrant it.
- `best`: optional per-angle summary `{ source, kind?, novelty?, audience_impact?, label? }`; scored/discard summaries use `kind: "judged"` or `"discard"`. For a blocked summary use a descriptive `label` without numeric scores or a made-up kind. Keep summaries consistent with saved rounds.
- `frontier`: `{ angle, why_promising, kill_risk?, budget_first? }`; explain independent routes and what could refute each. `blockers`: `{ title, text, refs? }`. `risks`: `{ title, text, check? }`.
- `latest_batch`: optional `{ date, results: [{ angle, agent?, outcome, text }] }`. `lessons`: `{ id, pattern, evidence, check }`. `calibration`: `{ name, candidate, estimate, judge, outcome }`, with optional `calibration_notes` strings. Record pre-review predictions, actual mode, source quality, and independent-score comparison or its absence.
- `audits`: `{ date, rounds?, finding, edits? }`; recommendations without authorization must not be described as applied changes.

The renderer labels the scored round with the highest **sum** of novelty and audience impact as “best.” This is a display-only ordering, not an average, extra score, gate, or approval rule; both configured gates still apply independently. Rounds under changed rubrics, audiences, or constraints are not directly comparable. Record such caveats in `meta.standing` or `meta.standard` and in calibration rather than implying a fair longitudinal ranking.

All paths and report/source links resolve relative to the loop directory (and generated page), not the repository or shell directory. Do not invent file links for receipts that do not exist.

## Render or check explicitly

From the repository root, after copying into the authorized directory:

```sh
node tools/ui.mjs atlas --dir <loop-dir> --check --no-open
node tools/ui.mjs atlas --dir <loop-dir>
```

The first checks map/data coverage and renders without opening; the second opens the static atlas. The CLI reads local files and writes `atlas.html`; it does not fetch sources, perform research, watch files, run agents, or continuously update anything. Rerun explicitly after authorized edits. `--check` checks coverage/renderer consistency, not research truth or independent approval.
