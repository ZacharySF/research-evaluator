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
