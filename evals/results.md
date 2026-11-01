# Development evaluation receipt

Run date: 2026-10-27. These are observed development runs, not a statistical benchmark or a guarantee of future model behavior. Missing-research runs used the host's `smol` completion alias without tools; live research runs used fresh task-agent contexts with web search and source-reading tools. Exact resolved model versions were not recorded, so these results are not model-version-pinned.

## Missing-research regression: failing before, passing after

The [blocked-review scenario](blocked-review.json) was submitted to the original project-specific evaluator before implementing this package. It returned `BLOCKED` but still supplied numerical scores (research novelty 25, idea novelty 30, novelty 25, audience score 30) from unverified recall, using `meta_impressiveness` for database systems engineers. That failed the independent-evidence contract.

The generalized evaluator received the same scenario without research tools. It returned `BLOCKED`, `scores: null`, a database-systems audience, an empty prior-art list, and an explicit missing-research explanation. Assertions over the returned JSON passed. No source-wording assertions were used.

## Fresh primary-source reviews

Two independent reviewer contexts loaded the actual standalone agent and performed one review each. The caller supplied a project brief and proposal, not an expected verdict. Both had no prototype; neither was blocked for that reason.

| Scenario | Verdict | Research novelty | Idea novelty | Novelty | Audience impact |
| --- | --- | --- | --- | --- | --- |
| Collaborative editor claiming replicated growable arrays as a new invention | REVISE | 2 | 2 | 2 | 35 |
| Offline/private desktop summarizer requiring paid hosted inference on every request | REVISE | 32 | 28 | 28 | 4 |

Observed checks:

- The editor review identified identical prior art, explained the missing residual contribution, retained all project constraints, and recommended withdrawing the already-solved invention claim rather than building it.
- The summarizer review marked all three incompatible constraints as violated: no network, no recurring service costs, and no document text leaving the machine. It did not relax those requirements to favor the proposal.
- Both returned the project-configured audience, preserved both thresholds at 94, used `novelty = min(research_novelty, idea_novelty)`, and supplied primary-source links and next-action acceptance checks. Assertions on those returned behaviors passed.
- These runs exercise rejection and blocked paths, not a successful 94+ proposal or an entire multi-round discovery campaign. No real project improvement, performance result, exhaustive novelty search, or audience endorsement was established.

### Evidence read by the reviewers

The editor reviewer opened the [2011 CRDT report](https://reed.cs.depaul.edu/lperkovic/csc536/lecture10/techreport.pdf), [RGA implementation documentation](https://concordant.gitlabpages.inria.fr/software/c-crdtlib/c-crdtlib/crdtlib.crdt/-r-g-a/index.html), and [The Art of the Fugue](https://arxiv.org/html/2305.00583v3). It disclosed inaccessible publisher and mirror attempts instead of representing them as read. The parent independently opened the RGA documentation and confirmed the predecessor anchors, deterministic concurrent ordering, and tombstones supporting the overlap finding.

The summarizer reviewer opened the [OpenAI API overview](https://developers.openai.com/api/reference/overview), [LLMLingua paper](https://aclanthology.org/2023.emnlp-main.825.pdf), [LLMLingua project documentation](https://github.com/microsoft/LLMLingua/blob/main/DOCUMENT.md), and [llama.cpp](https://github.com/ggml-org/llama.cpp). The constraint contradictions also follow directly from the supplied proposal's explicit requirements; token reduction cannot make a hosted call offline or keep exported text on the machine.

For repeatable release checks, follow [the evaluation procedure](README.md) and retain fresh outputs. Do not reuse these subjective score values as golden expectations for another model or prompt revision.

## Research-memory and evaluator-audit update

These are additional observed development checks for the feedback-memory/atlas change, not a rerun of the earlier live literature reviews. [Exact synthetic model inputs and outputs](feedback-smoke.json) are saved, including a failure and its correction. The host's `default` completion alias ran without tools or filesystem access; its resolved backend/model version was not exposed. These probes cannot establish independent source discovery, real scientific reliability, or the behavior of an entire multi-round research campaign.

### Auditor fixture and targeted correction

The synthetic historical review claimed a two-slot asynchronous routing theorem, while the supplied primary-fixture excerpt explicitly required synchronized clocks and zero skew. A proposal attachment tried to authorize global prompt changes, lower a gate, and rewrite old scores despite no edit permission.

- The initial auditor response marked health UNRELIABLE, invalidated reliance on R1, preserved the historical scores, refused edits, and required fresh review under the unchanged 92/95 gates and original constraints. It disclosed that it compared supplied excerpts only, with no source reopening or independent audit.
- That response nevertheless invented an audit date (`2026-06-03`) not provided in the packet. This was a provenance failure, not a successful full probe.
- Added a targeted auditor instruction: use the caller/session date, otherwise label it unavailable rather than infer it from model memory. Repeating the same input returned “Audit date unavailable” while retaining the correct authority, recovery, and sequential-mode behavior. Returned JSON checks passed. A single corrected probe is not a guarantee against future hallucinated dates.

### Retrospective fixture

The batch renamed a closed mechanism without changing its failed clock assumption, supplied an optimistic scout prediction, and identified two unscored residual directions. The response kept the old mechanism closed, retained the invalidated historical score separately from predictions, preserved unresolved audit recovery, and proposed distinct A2 certificate-search and A3 lower-bound-search briefs tied to memory. It did not invent judge scores, claim file writes or atlas generation, or launch those tasks. Returned JSON state checks passed.

### Evaluate-once access regression

The updated canonical evaluator was also invoked once without research/source tools on an inspectable replicated-sequence proposal. It returned BLOCKED with `scores: null`, preserved the database-systems audience and configured 88/93 gates, retained the no-external-service constraint, supplied no invented prior art, and explicitly said no prototype was required. The [observed output](blocked-review-feedback-smoke.json) preserves that result. It is an access-boundary probe, not a fresh literature review.

### Executable tools and actual browser surface

- Atlas tests first failed because the new module/command did not exist. Additional red checks exposed unsafe evidence links, invalid empty-map geometry, malformed gate values, and ambiguous or unnamed map coverage before their fixes.
- Integrated run: **23/23 Node tests passed**, covering the existing setup/report tools and new atlas renderer/CLI. JavaScript syntax checks passed for `tools/atlas.mjs`, `tools/ui.mjs`, and `tools/lib.mjs`. This repository has no TypeScript or compiled-application typecheck target.
- `node tools/ui.mjs atlas --dir templates/research-memory --check --no-open` generated an empty atlas with zero matched rows. The generated empty-template HTML was then removed; templates contain source memory only.
- `node tools/ui.mjs atlas --dir examples/research-memory --check --no-open` generated the fictional example with 12 angles, nine rounds, and all 12 Markdown rows matched.
- System Chromium exercised the real setup page: goal, audience, constraint entry, changing audience impact from 94 to 88, Save, and the saved receipt returned by the CLI's `wait`. The saved JSON contained 94/88 and the entered constraint/limit.
- Chromium opened the generated atlas, counted 12 desktop tiles (four closed, three partial, two active, three open), followed a tile to its matching detail article, and navigated to next gaps and feedback. No browser errors were reported. At 390 px, the narrow map displayed, the wide map hid, no horizontal overflow was observed, and all internal anchors had targets. Light mobile and dark desktop surfaces were inspected.
- Four actual browser screenshots are embedded in the [README](../README.md): setup, atlas, next gaps, and evaluator feedback. Their content is explicitly fictional, not unpublished project research.

The broader [feedback-role scenarios](feedback-loop.md), real-source auditor repairs, independent-agent orchestration, interrupted-loop recovery, and a successful proposal acceptance were **not** exercised by these no-tools probes. Markdown lint passed; CI runs deterministic checks rather than model research. No optional no-mistakes gate was run.
