# Synthetic fixture — calibration

Every prediction and score is invented. The separate-reviewer role illustrates how to compare pre-review predictions with independently researched scores; **no actual independent agents, checks, reports, or approval exist here**. Numbers are subjective proposal-potential judgments, not experimental gains or probabilities. Gates remain 94/94.

| Candidate v1 | Simulated builder pre-review novelty/impact | Simulated reviewer research/idea → novelty; impact | Outcome and prediction error | Changed next decision |
| --- | --- | --- | --- | --- |
| R1 Snapshot-delta | 96/96 | 76/72 → 72; 78 | REVISE; over by 24/18. | Close the repackaging after SIM-S1 overlap; stop polishing. |
| R2 Intent undo | 94/95 | 90/88 → 88; 89 | REVISE; over by 6/6. | Require an intent-boundary trace beyond SIM-S2. |
| R4 Capability windows | 92/94 | 89/86 → 86; 91 | REVISE; over by 6/3. | Specify reconciliation beyond SIM-S4 expiry leases. |
| R7 Repair contract | 95/95 | 95/92 → 92; 93 | REVISE; over by 3/2. | Derive the cascade bound; a high research subscore cannot override idea novelty. |
| R8 Partition policy | Not recorded | BLOCKED; scores null | No numeric error or estimate. | Restore authorized access to the fictional policy annex before judging. |

R5 (74/70 → 70; 82) and R6 (92/90 → 90; 87) have simulated review scores but no recorded pre-review prediction. Do not backfill one. R3 and R9 are builder discards with no review scores. The apparent shrinking errors across different candidates are not a controlled trend, proof of improvement, or promise of future PASS. Best combined score is R7's 92/93, which misses both gates.

For real use, preserve prediction timestamps and versions, review JSON, source sections/versions and coverage limitations. Record actual reviewer mode. If independent agents are unavailable, explicitly label sequential mode; compare it separately as non-independent feedback, never independent approval. A separate invocation without actual fresh source checking is insufficient. The [audit log](validator-audits.md) records why inherited source-quality assumptions need rechecking.
