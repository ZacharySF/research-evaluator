# Synthetic fixture — offline collaboration memory

**Fictional teaching and screenshot fixture only.** Every angle, round, score, source, access failure, role, and audit is invented. This is not real research, real literature coverage, a real audience's priorities, measured software performance, independent approval, or a proposal to execute research. SIM-S1–SIM-S8 are intentionally no-link labels for simulated sources; no real sources or source URLs are asserted.

The scenario explores offline-first collaborative software for shared-workspace maintainers. Four areas hold 12 angles: four closed, three partial, two active, three open. Nine v1 rounds illustrate six scored REVISE outcomes, two unscored builder discards, and one BLOCKED with `scores: null`. Best combined score is R7 at 92 novelty / 93 audience impact against 94/94 gates. No round passes. Novelty always equals the lower of research and idea novelty.

The renderer selects “best” by the highest sum of novelty and audience impact among scored rounds. That is display-only, not an average or additional gate; both gates still apply independently. This fixture keeps its rubric, audience, and constraints fixed. Real rounds under changed rubrics, audiences, or constraints are not directly comparable; preserve the caveat in `meta.standing` or `meta.standard`, rather than treating a score-history line as a controlled improvement trend.

## Files and ownership

- [playbook.md](playbook.md): standing packet and deliberately diverse next batch; builder/retrospective maintain it.
- [angle-map.md](angle-map.md): durable explored/unexplored ledger, closures, leftovers, reopen conditions, and source-quality caveats. The retrospective keeps it synchronized with [atlas-data.json](atlas-data.json).
- [lessons.md](lessons.md): scoped patterns and the checks they change; retrospective-owned.
- [calibration.md](calibration.md): pre-review predictions versus fictional reviewer scores, with mode and comparability caveats; retrospective-owned. Simulated roles do not establish actual independence.
- [validator-audits.md](validator-audits.md): auditor-owned findings and recommendations. No definition edits are claimed. Real edits require permission for a project-local copy; never modify global prompts by default.
- `atlas.html`: generated renderer output, not hand-edited memory; generated separately and not a source of review authority.

The JSON's condensed rounds are **not** canonical evaluator reports; this fixture deliberately does not invent `review-roundN.json` receipts or link nonexistent candidate files. In real loops the builder saves actual reports verbatim and summaries point to those existing receipts. Reports remain immutable; audits may inform prospective review, not rewrite scores.

## Schema and copying

The complete reusable [schema and ownership guide](../../templates/research-memory/README.md) documents fields. `meta.gate` uses numeric 1–100 `novelty` and `audience_impact` (default 94 each); `meta` is metadata, not a score dimension. Areas/angles have unique stable IDs. Angle statuses are `closed`, `partial`, `active`, `open`; every `map_name` matches a column-2 `Angle` row, with no stale or missing entries. Scored rounds provide all four integer fields `research_novelty`, `idea_novelty`, `novelty`, `audience_impact`; unscored rounds provide no numeric scores. R8 additionally records `scores: null`. No PASS can be inferred from a summary without a warranted actual report, constraints, and fresh independent evidence.

Start real work by copying the [empty templates](../../templates/research-memory/) into an explicitly authorized loop directory without overwriting existing files, then configure the real packet. Do not copy this fictional content as evidence. Keep evaluate-once behavior unchanged; memory does not authorize hidden loops. Without independent agents explicitly disclose sequential mode, not independent approval. No prototype is required merely to qualify for proposal review.

All data/document/source paths in a loop resolve relative to that loop directory and its generated page. The links to templates above are repository documentation links, not atlas evidence. Simulated sources stay no-link labels; there are no fabricated external URLs.

## Render explicitly

From the repository root:

```sh
node tools/ui.mjs atlas --dir examples/research-memory --check --no-open
node tools/ui.mjs atlas --dir examples/research-memory
```

`--check` compares the map's angle rows with JSON and validates renderer consistency before writing `atlas.html`; it does not verify research truth. `--no-open` suppresses the browser. The command reads local data and generates a static self-contained page. It does not perform network access, source discovery, research, agent execution, file watching, or automatic refresh. Rerun explicitly after authorized edits. The existing `report` command and evaluator review schema are unchanged.
