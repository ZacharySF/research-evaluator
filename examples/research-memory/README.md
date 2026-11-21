# Synthetic fixture — offline collaboration memory

**Fictional teaching fixture only.** Every angle, round, score, source, access failure, role, and audit is invented. This is not real research, literature coverage, measured performance, audience endorsement, independent approval, or permission to run research. SIM-S1–SIM-S8 are intentionally no-link fictional labels, not actual sources.

Four areas contain 12 angles: four closed, three partial, two active, three open. Nine v1 rounds illustrate six scored REVISE outcomes, two unscored builder discards, and one BLOCKED with all configured section scores null and `passed: false`. The illustrative potential-mode rubric has **Novelty 94, Impressiveness 94, Feasibility 80, Evidence quality 80**. No round passes.

R7 scores **96 / 95 / 62 / 85** in that order: the first two sections pass, but **Feasibility fails**. Its total of 338 is the highest among these comparable synthetic rounds, for display only. Neither a total nor two high scores can override another section or a hard constraint. Actual sections are arbitrary and must come from the project's saved rubric, not this example.

This fixture keeps sections, thresholds, audience, mode, and constraints fixed. Totals across changed configurations are not controlled comparisons; label that caveat rather than presenting a score-history line as evidence of improvement. Potential judgments are not measured success.

## Files and ownership

- [playbook.md](playbook.md): standing rubric/context, permissions, and diverse next batch; retrospective-owned.
- [angle-map.md](angle-map.md): durable angle ledger, closure evidence, leftovers, and reopen conditions; synchronized with [atlas-data.json](atlas-data.json).
- [lessons.md](lessons.md): scoped patterns and changed checks; retrospective-owned.
- [calibration.md](calibration.md): invented pre-review predictions versus simulated scores for every section, with independence/comparability caveats.
- [validator-audits.md](validator-audits.md): simulated findings/recommendations only. Real edits require explicit permission for a project-local definition, never a global prompt.
- `atlas.html`: generated separately by the parent renderer; not hand-edited memory or review authority.

Condensed atlas rounds are **not canonical evaluator reports**. This fixture invents no `evaluation-roundN.json`, `rubric.json`, candidate files, or receipt links. Real projects preserve their existing saved rubric and verbatim native custom reports; an audit can invalidate reliance or trigger a new review, not silently rewrite history. No actual independent contexts or fresh source checks occurred here.

## Dynamic schema

See the complete [template schema guide](../../templates/research-memory/README.md). `meta.sections` holds arbitrary `{ name, threshold }` rows and `meta.judge_mode` is `potential` or `measured`; there is no `meta.gate`. Each scored round supplies every configured `{ name, score, threshold, passed? }` section, optionally including `why` and `lacking`. BLOCKED/discards are unscored, never filled with numeric placeholders. Angle `best` uses `{ kind, source, label }` with textual all-section summaries or explicitly unscored outcomes, not scalar novelty/impact fields.

Areas and angles retain stable unique IDs. Every exact unique `map_name` matches column 2 of the map, with no stale/missing rows. Statuses are `closed`, `partial`, `active`, `open`. Open means unsearched, not a proven gap. A high summary cannot establish PASS without a warranted actual report, every configured section, all hard constraints, and mode-appropriate evidence.

Start real work with the [empty templates](../../templates/research-memory/) copied into an authorized loop directory without overwriting research; configure from actual `rubric.json`. Do not copy fictional content as evidence or replace measured mode with potential. Evaluate-once remains one review. Use full packaged role instructions in fresh generic contexts; do not substitute similarly named Determine-specific global agents. Disclose sequential mode if independence is unavailable.

Paths in actual loop data resolve relative to that loop directory and generated page. Repository guide links above are documentation, not atlas evidence. Fictional source labels remain no-link; no fabricated external URL is supplied.

## Render explicitly

From the repository root:

```sh
node tools/ui.mjs atlas --dir examples/research-memory --check --no-open
node tools/ui.mjs atlas --dir examples/research-memory
```

`--check` validates map/data consistency before writing and refuses missing/stale map rows without replacing existing HTML; it does not verify truth. `--no-open` suppresses the browser. Rendering reads selected local data and generates static HTML; it does no network access, research, source discovery, agents, directory scans, watching, or automatic refresh. Rerun after authorized edits. The custom `report` command still reads native `evaluation-roundN.json` reports.

Original repository screenshots document the historical GitHub two-gate base, **not this updated local custom-rubric UI**. Rendering this fictional atlas is not evidence of real research or a live-model review.
