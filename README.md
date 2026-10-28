# research-evaluator

An evidence-first research-proposal reviewer and a builder-led research → proposal → independent review → revision loop. Generalized from a project-specific research evaluator, it asks what prior work already solves, what contribution remains, and why that contribution matters to your audience.

This is a Markdown prompt/Agent Skills repository, not a research service or a promise to invent patentable ideas. Installing it does not start research. Your assistant supplies the research tools and follows your project’s safety and permission policies.

- [Canonical standalone evaluator](agents/research-evaluator.md)
- [Builder-loop skill](SKILL.md)
- [Example project brief](examples/project-brief.md)

## Install: choose one route

### Standalone agent

Clone into a new destination, then copy the self-contained agent file. These commands assume the destination repository does not already exist:

```sh
git clone https://github.com/ZacharySF/research-evaluator
cd research-evaluator
mkdir -p ~/.omp/agent/agents
cp -i agents/research-evaluator.md ~/.omp/agent/agents/research-evaluator.md
```

For Claude-style agent directories, use this alternative copy destination:

```sh
mkdir -p ~/.claude/agents
cp -i agents/research-evaluator.md ~/.claude/agents/research-evaluator.md
```

Keep existing files when prompted; inspect and reconcile them rather than overwriting. Agent discovery, reload, and native subagent support depend on the host. A directory convention alone does not guarantee support. Follow your host’s instructions, or explicitly ask the assistant to read the agent file as below.

### Full skill: keep the repository together

Clone directly into a new skill directory:

```sh
mkdir -p ~/.agents/skills
git clone https://github.com/ZacharySF/research-evaluator ~/.agents/skills/research-evaluator
```

Alternatively, from the repository cloned above, link the whole repository into an omp skill directory:

```sh
mkdir -p ~/.omp/agent/skills
test ! -e ~/.omp/agent/skills/research-evaluator && test ! -L ~/.omp/agent/skills/research-evaluator && ln -s "$PWD" ~/.omp/agent/skills/research-evaluator
```

Do not replace an existing destination. The skill loads `agents/research-evaluator.md` relative to `SKILL.md`, so copying only `SKILL.md` is insufficient. Automatic skill discovery/reload is host-dependent; explicit natural-language use works without a native skill command. No additional skills, package installs, runtime, or model-specific configuration are required.

### Plain Markdown / existing instructions

Ask your assistant to read `agents/research-evaluator.md`, or paste its instruction body (below the YAML frontmatter) into an existing instruction file. Retain your existing project safety policies and tool permissions. This route does not require agent or skill discovery; if the host cannot read local files, paste the text into the conversation instead.

## Use

Start with the [example brief](examples/project-brief.md), replacing its goal, audience, constraints, proposal, sources, and evaluation plan with your own. Give the assistant access to fresh primary sources, including relevant papers’ limitations and subsequent research. Supplied citations are leads, not a substitute for independent searching and reading.

### One independent review

> Read `agents/research-evaluator.md` and apply it to the following project brief and proposal. Perform one independent, read-only review using fresh primary sources. Do not implement changes or authorize publication. Return the prescribed JSON verdict with evidence and next action. [Paste brief.]

Use the installed file’s actual path if you are outside the repository. With a host-native agent, you can request that agent by name, subject to the host’s invocation conventions.

### Builder-led improvement loop

> Read `SKILL.md` and follow its research → proposal → independent evaluator → revision loop for this brief. Load the evaluator from `agents/research-evaluator.md` relative to that skill. Keep builder and reviewer responsibilities separate; use a separate reviewer context if available, otherwise disclose the independence limitation. Preserve source receipts and explain substantive changes between rounds. Respect my stated research limits. [Paste brief and limits.]

The builder researches and revises; the evaluator independently challenges overlap, residual contribution, feasibility, audience value, and constraints without building the proposal. A stalled candidate can pivot rather than merely rewording its claims. Stop when the configured criteria are satisfied, when evidence access is blocked, when a user-supplied limit is reached, or as `STAGNATED` when no materially new evidence, mechanism, or viable pivot remains. Preserve the last review and research receipts; stagnation is never a pass. There is no invented default round limit or promise that retries increase scores.

### Optional visual setup and report

If you have Node.js 18+ and allow the assistant to save review files in a folder, the skill can set up a review on a browser page instead of in chat. The page has a pass-score slider for novelty and one for audience impact, plus fields for constraints and limits. After each round it can render a visual report with scores against thresholds, trends, critique, prior art, and the next action. Nothing to install: the tools are in [`tools/`](tools/), with plain Node and no dependencies.

```sh
node tools/ui.mjs setup  --dir research/   # opens the setup page and prints its URL
node tools/ui.mjs wait   --dir research/   # waits for Save; writes research/review-setup.json
node tools/ui.mjs report --dir research/   # renders research/report.html from review-roundN.json files
```

## Understand the result

Scores are subjective judgments on a 1–100 scale, not probabilities or measured achievements. Defaults are novelty ≥ **94** and audience impact ≥ **94**; set different thresholds in your brief when appropriate. Novelty is the minimum of research novelty and idea novelty, so a strong presentation cannot hide a weak contribution.

- **PASS:** both configured thresholds, project constraints, and sufficient independent evidence are satisfied.
- **REVISE:** the proposal falls short or contradicts a constraint; the review identifies a concrete next action.
- **BLOCKED:** required evidence or research tools are unavailable. `scores` is `null`, not guessed provisional numbers.

The canonical prompt defines the complete JSON contract, including `audience_impact`, prior-art overlap, limitations, residual contribution, uncertainties, questions, and an acceptance check for the next action. A missing prototype alone does not block proposal review: assess the potential of the proposed mechanism, not only an existing implementation. Decisive unknown feasibility can still prevent PASS. Hypotheses and planned measurements must not be reported as observed results.

Neither PASS nor a high score guarantees novelty, patentability, publication, endorsement, or practical success. The reviewer does not approve publication; that decision remains with the user and any applicable review process.

## Development and validation

This repository ships Markdown instructions, not a compiled application, so there is no application typecheck target. [Behavioral evaluation scenarios](evals/README.md) cover missing research access, overlapping prior art, and constraint violations. Run them with an assistant and report actual evidence; a prompt containing the right words is not proof of behavior.

CI runs Markdown lint and the visual tools' unit tests, not live-model evaluations. Run the same checks locally with Node.js 24:

```sh
npx --yes markdownlint-cli2@0.24.0 '**/*.md'
node --test 'tools/test/*.test.mjs'
```

Node.js is only needed for these development checks and the optional visual tools, not for using the prompts.

## License

[MIT](LICENSE), copyright 2026 ZacharySF.
