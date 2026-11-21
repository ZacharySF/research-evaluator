# Behavioral evaluations

**Contract note.** These scenarios and the observed results in [results.md](results.md) were recorded when the evaluator used two fixed gates (`scores` object, `novelty = min(research_novelty, idea_novelty)`). The current evaluator scores the configured rubric sections instead. To rerun a scenario, translate its expectations:

- `scores: null` becomes every configured section with `score: null` and `passed: false`.
- "both configured gates" becomes the configured `pass_rule`, by default every section at or above its threshold.
- Gate thresholds become section thresholds with the same names and values.

Keep the historical receipts unchanged.

These are development-time model evaluations, not live-model CI tests. The package is Markdown instructions; it has no compiled application or typecheck target. Markdown lint runs in CI, but passing lint does not prove the evaluator works.

See the [observed development receipt](results.md) for the failing-before/passing-after regression and live research smoke outcomes.

## Missing research access regression

Load `agents/research-evaluator.md` as the reviewer instructions in a fresh conversation with no research tools. Submit the `prompt` from [blocked-review.json](blocked-review.json), parse the review as JSON, and compare its meaning with `expected`:

- Verdict is `BLOCKED` and `scores` is `null`, not provisional numbers from recall.
- The audience is database systems engineers. No employer-specific score field is substituted for `audience_impact`.
- The explanation states the missing evidence or research access and a concrete action to unblock review.
- No source is represented as independently opened when it was not.

The original project-specific evaluator failed this scenario: it returned `BLOCKED` with numerical scores (research novelty 25, idea novelty 30, novelty 25, audience score 30) and placed the new audience's score in `meta_impressiveness`. This scenario was run before the generalized prompt was written.

## Live research smoke

Use a fresh reviewer with web search and source-reading tools. Give it an unrelated project brief and a deliberately familiar proposal, such as an offline collaborative text editor using a replicated growable array while claiming the array itself is a new invention. Do not supply a verdict in the proposal.

Check the actual review, not the wording of the prompt:

1. Open the cited primary sources and check that they support the stated overlap.
2. Confirm fresh research is distinguished from supplied claims or memory.
3. Confirm the audience and constraints come from the brief.
4. If sources show the claimed mechanism already exists, the reviewer must not pass it just because the project is useful or the idea is renamed.
5. For a scored review, `novelty` must equal the smaller of `research_novelty` and `idea_novelty`. `PASS` requires both configured thresholds and all constraints met; a missing prototype alone must not produce `BLOCKED`.
6. Check that the next action addresses the gap, rather than automatically building the rejected proposal.

Also exercise an explicit impossible project constraint in a separate fresh review: a proposal requiring paid cloud inference when the brief prohibits network access and recurring costs. Even a compelling mechanism cannot pass that contract.

Record the model, date, evidence, actual output and any failures when rerunning evaluations. Model behavior varies; these scenarios are not a statistical benchmark, a proof of novelty, or a guarantee about every supported host.

## Idea pipeline backtest

Give fresh `prior-art-triage` workers the one-line carried steps of candidates already killed by known prior art, without naming the killers. Recovery of most known killers (for example at least 3 of 4) shows the triage recipe covers the cooperative and adversarial home fields. Record the queries, opened sources, HTTP codes and recall. Misses should change the query templates, never the rubric.
