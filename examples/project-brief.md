# Example project brief: explaining changed public-data summaries

This is an illustrative, hypothetical proposal, not an established novel contribution or a report of measured results. Replace it with your project and have the reviewer independently investigate the claims.

## Goal

Help readers understand why a summary statistic changed between two releases of a public dataset, distinguishing revisions to existing records from newly added or removed records.

## Audience

Journalists and community researchers comparing recurring public-data releases. Evaluate impact in terms of interpretable, checkable explanations and reduced risk of misleading comparisons—not appeal to a particular company or hardware platform.

## Constraints

- Use only public or explicitly authorized data; do not infer personal identities.
- Preserve links to source releases and make explanation steps auditable.
- Identify schema changes and incomparable definitions rather than silently treating them as equivalent.
- Do not claim causal explanations for real-world changes from dataset differences alone.
- Review proposal potential now; no prototype or performance results are available.

## Current proposal, suspected gap, and mechanism

The candidate system would match records across releases using documented identifiers, partition additions/removals/revisions, and decompose a selected aggregate’s numerical change across those partitions. It would attach record-level receipts and warn when changed definitions prevent a valid comparison.

The suspected gap is whether existing data-diff, provenance, and explanation tools already offer this combination in a usable form for non-specialist readers. That gap is **unverified**. The reviewer should distinguish a genuinely new mechanism from an integration or interface improvement, and identify what contribution survives comparison with existing work.

## Sources and research leads

No independent literature review has yet been completed. Starting leads, not evidence of novelty:

- W3C PROV overview: <https://www.w3.org/TR/prov-overview/>
- The chosen data publisher’s release documentation, revision policy, and two specific releases (supply these before assessing dataset-specific feasibility).
- Primary papers and maintained tools on data differencing, provenance, aggregate explanations, and schema evolution, found independently by the reviewer. Read limitations and subsequent work, not only abstracts or search snippets.

Record source titles, URLs, access context, exact overlaps, limitations, and the residual contribution. If decisive evidence cannot be accessed, report the missing evidence instead of inventing it.

## Evaluation plan

These are planned checks, not achieved results:

1. Compare the proposed mechanism against the closest primary sources and tools. Determine whether record matching, aggregate decomposition, receipts, or the combination contributes anything beyond known methods.
2. For a later implementation study, select authorized release pairs with documented revisions. Check that the decomposition reconciles to the aggregate change and that definition changes trigger explicit warnings.
3. Compare explanations with a simple release-to-release difference baseline. Plan a reader study of interpretation accuracy before making usability claims.
4. Identify assumptions that could defeat feasibility, including unstable identifiers, absent revision history, and changed measurement definitions. State which can be assessed from documentation and which remain research questions.

Do not demand completed versions of these future studies merely to review proposal potential. Do not assume their outcomes; unresolved decisive feasibility can prevent PASS.

## Review configuration and limits

- Novelty threshold: 94/100, with novelty = min(research_novelty, idea_novelty).
- Audience-impact threshold: 94/100.
- Scores are subjective and adjustable, not guarantees of novelty or success.
- First request: one independent, read-only review with the canonical JSON output.
- If I subsequently request the builder loop, preserve evidence and revision history, respect any supplied research limits, and stop as STAGNATED rather than claiming PASS when no materially new evidence, mechanism, or viable pivot remains.
- Do not implement, publish, or treat this brief as permission to access nonpublic data.
