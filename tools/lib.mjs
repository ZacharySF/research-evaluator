// Pure helpers shared by ui.mjs and its tests: rubric validation, strictness bands,
// and the static loop report. No I/O beyond loadLoop.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const PASS_RULE = "all sections >= threshold and no hard constraint violated";

export const DEFAULT_SECTIONS = [
  {
    name: "Novelty",
    threshold: 94,
    hint: "How far it is from the closest prior art.",
    requirements: "Distinct from the closest prior art under any name. Score = min(research novelty, idea novelty).",
  },
  {
    name: "Impressiveness",
    threshold: 94,
    hint: "Would the audience care and be convinced?",
    requirements: "Important to the audience: real insight, a credible path to results, and a decisive evaluation.",
  },
  {
    name: "Feasibility",
    threshold: 80,
    hint: "Can it be built with what you have?",
    requirements: "Buildable with the stated resources and constraints; prerequisites named.",
  },
  {
    name: "Evidence quality",
    threshold: 80,
    hint: "Are the load-bearing claims backed?",
    requirements: "Every load-bearing claim is sourced or explicitly marked as a hypothesis.",
  },
];

export const ZONES = [
  { min: 94, label: "Elite", color: "#c084fc", means: "Only exceptional work passes. Expect many rounds." },
  { min: 85, label: "Strict", color: "#fbbf24", means: "Strong work with no real gaps." },
  { min: 70, label: "Solid", color: "#34d399", means: "Good, credible work; minor gaps allowed." },
  { min: 1, label: "Lenient", color: "#60a5fa", means: "Rough sketch is enough. Good for early exploration." },
];

export function thresholdZone(threshold) {
  return ZONES.find((z) => threshold >= z.min) ?? ZONES[ZONES.length - 1];
}

const text = (v) => (typeof v === "string" ? v.trim() : "");

export function normalizeRubric(raw) {
  if (!raw || typeof raw !== "object") throw new Error("rubric must be an object");
  const topic = text(raw.topic);
  if (!topic) throw new Error("topic is required: what should be researched?");
  const judge_mode = raw.judge_mode == null || raw.judge_mode === "" ? "potential" : raw.judge_mode;
  if (judge_mode !== "potential" && judge_mode !== "measured") {
    throw new Error(`judge_mode must be "potential" or "measured", got ${JSON.stringify(raw.judge_mode)}`);
  }
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  if (rawSections.length === 0) throw new Error("pick at least one section to score");
  const seen = new Set();
  const sections = rawSections.map((s, i) => {
    const name = text(s?.name);
    if (!name) throw new Error(`section ${i + 1} needs a name`);
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`duplicate section name: ${name}`);
    seen.add(key);
    const n = typeof s.threshold === "string" && s.threshold.trim() !== "" ? Number(s.threshold) : s.threshold;
    if (typeof n !== "number" || !Number.isFinite(n) || Math.round(n) < 1 || Math.round(n) > 100) {
      throw new Error(`${name}: threshold must be a number from 1 to 100`);
    }
    const requirements = text(s.requirements);
    if (!requirements) throw new Error(`${name}: say what it must do to pass`);
    return { name, threshold: Math.round(n), requirements, scoring_guide: text(s.scoring_guide) };
  });
  const hard_constraints = (Array.isArray(raw.hard_constraints) ? raw.hard_constraints : []).map(text).filter(Boolean);
  return {
    topic,
    goal: text(raw.goal),
    audience: text(raw.audience),
    judge_mode,
    sections,
    hard_constraints,
    pass_rule: text(raw.pass_rule) || PASS_RULE,
    notes: text(raw.notes),
  };
}

export function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Reads rubric.json and evaluation-roundN.json files (sorted by N) from a loop directory. */
export function loadLoop(dir) {
  const rubricPath = join(dir, "rubric.json");
  if (!existsSync(rubricPath)) throw new Error(`no rubric.json in ${dir}`);
  const rubric = normalizeRubric(JSON.parse(readFileSync(rubricPath, "utf8")));
  const rounds = readdirSync(dir)
    .map((file) => ({ file, n: Number(/^evaluation-round(\d+)\.json$/.exec(file)?.[1]) }))
    .filter((r) => Number.isInteger(r.n))
    .sort((a, b) => a.n - b.n)
    .map(({ file }) => ({ file, data: JSON.parse(readFileSync(join(dir, file), "utf8")) }));
  return { rubric, rounds };
}

// Shared look for the setup page and the report: dark by default, light when the OS asks.
export const BASE_CSS = `
:root{--bg:#0d0f17;--panel:#151826;--panel2:#1c2033;--line:#2a2f45;--fg:#e8eaf3;--muted:#9aa0b8;
--accent:#8b5cf6;--accent2:#22d3ee;--ok:#34d399;--warn:#fbbf24;--bad:#f87171;--radius:16px;
color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#f6f7fb;--panel:#fff;--panel2:#f1f2f8;--line:#e2e4ee;
--fg:#171a2b;--muted:#5d6380;color-scheme:light}}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 10% -10%,color-mix(in srgb,var(--accent) 18%,transparent),transparent),
radial-gradient(900px 500px at 110% 0%,color-mix(in srgb,var(--accent2) 12%,transparent),transparent),var(--bg);
color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Inter,sans-serif;min-height:100vh}
a{color:var(--accent2)}
h1,h2,h3{line-height:1.2;margin:0}
.wrap{max-width:1120px;margin:0 auto;padding:40px 24px 80px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600}
.title{font-size:34px;font-weight:750;letter-spacing:-.02em;margin:6px 0 8px;
background:linear-gradient(90deg,var(--fg),color-mix(in srgb,var(--accent) 70%,var(--fg)));-webkit-background-clip:text;background-clip:text;color:transparent}
.lede{color:var(--muted);max-width:68ch;margin:0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:22px;
box-shadow:0 1px 0 color-mix(in srgb,#fff 4%,transparent) inset,0 10px 30px -18px #0008}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:650;
border:1px solid color-mix(in srgb,currentColor 35%,transparent);background:color-mix(in srgb,currentColor 12%,transparent)}
.muted{color:var(--muted)}
.grid{display:grid;gap:16px}
`;

const VERDICT_COLOR = { PASS: "var(--ok)", REVISE: "var(--warn)", BLOCKED: "var(--bad)" };
const STATUS_COLOR = { verified: "var(--ok)", wrong: "var(--bad)", unsupported: "var(--warn)", hypothesis: "var(--accent2)" };
const OVERLAP_COLOR = { identical: "var(--bad)", major: "var(--warn)", partial: "var(--accent2)", adjacent: "var(--muted)" };

function sparkline(scores, threshold) {
  if (scores.length < 2) return "";
  const w = 120, h = 34, pad = 3;
  const x = (i) => pad + (i * (w - 2 * pad)) / (scores.length - 1);
  const y = (v) => h - pad - ((v - 1) * (h - 2 * pad)) / 99;
  const pts = scores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = scores[scores.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
<line x1="0" x2="${w}" y1="${y(threshold).toFixed(1)}" y2="${y(threshold).toFixed(1)}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/>
<polyline points="${pts}" fill="none" stroke="${last >= threshold ? "var(--ok)" : "var(--accent)"}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${x(scores.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3" fill="${last >= threshold ? "var(--ok)" : "var(--accent)"}"/></svg>`;
}

/** Renders a self-contained HTML report of a research loop. */
export function renderReport(rubric, rounds) {
  const e = escapeHtml;
  const latest = rounds.at(-1)?.data;
  const prev = rounds.at(-2)?.data;
  const scoreOf = (data, name) => data?.sections?.find((s) => s.name.toLowerCase() === name.toLowerCase());

  const sectionCards = rubric.sections.map((sec) => {
    const cur = scoreOf(latest, sec.name);
    const before = scoreOf(prev, sec.name);
    const history = rounds.map((r) => scoreOf(r.data, sec.name)?.score).filter((v) => typeof v === "number");
    const score = cur?.score;
    const passed = typeof score === "number" && score >= sec.threshold;
    const delta = typeof score === "number" && typeof before?.score === "number" ? score - before.score : null;
    const zone = thresholdZone(sec.threshold);
    return `<article class="card sec ${passed ? "passed" : ""}">
  <header><div><h3>${e(sec.name)}</h3><span class="pill" style="color:${zone.color}">${zone.label} · pass at ${sec.threshold}</span></div>
  <div class="score"><b>${score ?? "—"}</b><span class="muted">/100</span>${delta == null ? "" : `<span class="delta ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}</span>`}</div></header>
  <div class="bar"><i style="width:${score ?? 0}%"></i><s style="left:${sec.threshold}%" title="threshold ${sec.threshold}"></s></div>
  ${sparkline(history, sec.threshold)}
  ${cur?.why ? `<p><span class="label">Why</span>${e(cur.why)}</p>` : ""}
  ${!passed && cur?.lacking ? `<p class="lacking"><span class="label">Still lacking</span>${e(cur.lacking)}</p>` : ""}
  <details><summary>What it must do to pass</summary><p class="muted">${e(sec.requirements)}</p></details>
</article>`;
  }).join("\n");

  const passing = latest ? rubric.sections.filter((s) => (scoreOf(latest, s.name)?.score ?? 0) >= s.threshold).length : 0;
  const verdict = latest?.verdict;

  const factChecks = latest?.fact_checks?.length
    ? `<section class="card"><h2>Fact checks</h2><ul class="list">${latest.fact_checks.map((f) =>
        `<li><span class="pill" style="color:${STATUS_COLOR[f.status] ?? "var(--muted)"}">${e(f.status)}</span><div><b>${e(f.claim)}</b><p class="muted">${e(f.evidence)}</p></div></li>`).join("")}</ul></section>`
    : "";
  const priorArt = latest?.prior_art?.length
    ? `<section class="card"><h2>Closest prior art</h2><ul class="list">${latest.prior_art.map((p) =>
        `<li><span class="pill" style="color:${OVERLAP_COLOR[p.overlap] ?? "var(--muted)"}">${e(p.overlap)}</span><div><a href="${e(p.url)}" target="_blank" rel="noreferrer">${e(p.title)}</a><p class="muted">Still new: ${e(p.what_remains_new)}</p></div></li>`).join("")}</ul></section>`
    : "";
  const grill = latest?.grill?.length
    ? `<section class="card"><h2>Open questions</h2><ul class="list">${latest.grill.map((g) =>
        `<li><span class="pill" style="color:var(--accent)">?</span><div><b>${e(g.question)}</b><p class="muted">Recommended: ${e(g.recommendation)}</p></div></li>`).join("")}</ul></section>`
    : "";
  const historyTable = rounds.length
    ? `<section class="card"><h2>Round history</h2><div class="scroll"><table><thead><tr><th>Round</th>${rubric.sections.map((s) => `<th>${e(s.name)} <span class="muted">≥${s.threshold}</span></th>`).join("")}<th>Verdict</th></tr></thead><tbody>${rounds.map((r) =>
        `<tr><td>${e(r.data.round ?? r.file)}</td>${rubric.sections.map((s) => {
          const v = scoreOf(r.data, s.name)?.score;
          return `<td class="${typeof v === "number" && v >= s.threshold ? "ok" : ""}">${v ?? "—"}</td>`;
        }).join("")}<td><span class="pill" style="color:${VERDICT_COLOR[r.data.verdict] ?? "var(--muted)"}">${e(r.data.verdict)}</span></td></tr>`).join("")}</tbody></table></div></section>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(rubric.topic)} · research loop</title><style>${BASE_CSS}
.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;flex-wrap:wrap;margin-bottom:28px}
.verdict{text-align:right;margin-left:auto}.verdict .pill{font-size:15px;padding:6px 14px}
.stats{display:flex;gap:10px;margin-top:10px;justify-content:flex-end;flex-wrap:wrap}
.secs{grid-template-columns:repeat(auto-fill,minmax(320px,1fr));margin-bottom:16px}
.sec header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.sec h3{font-size:18px;margin-bottom:6px}.sec.passed{border-color:color-mix(in srgb,var(--ok) 45%,var(--line))}
.score{display:flex;align-items:baseline;gap:4px;white-space:nowrap}.score b{font-size:34px;font-weight:750;letter-spacing:-.03em}
.delta{font-size:12px;font-weight:700;margin-left:6px}.delta.up{color:var(--ok)}.delta.down{color:var(--bad)}
.bar{position:relative;height:10px;border-radius:99px;background:var(--panel2);margin:14px 0 8px;overflow:visible}
.bar i{position:absolute;inset:0 auto 0 0;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.sec.passed .bar i{background:linear-gradient(90deg,var(--ok),var(--accent2))}
.bar s{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--fg);border-radius:2px;opacity:.8}
.spark{color:var(--muted);display:block;margin:2px 0 4px}
.label{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:650;margin-bottom:2px}
.lacking{border-left:3px solid var(--warn);padding-left:12px}
details summary{cursor:pointer;color:var(--muted);font-size:13px}
.next{border-color:color-mix(in srgb,var(--accent) 50%,var(--line));background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 14%,var(--panel)),var(--panel));margin-bottom:16px}
.next h2{font-size:16px;margin-bottom:6px}
.cols{grid-template-columns:repeat(auto-fit,minmax(340px,1fr));margin-bottom:16px}
.card h2{font-size:17px;margin-bottom:12px}
.list{list-style:none;margin:0;padding:0;display:grid;gap:12px}.list li{display:flex;gap:12px;align-items:flex-start}.list p{margin:2px 0 0}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}th{font-size:12px;color:var(--muted);font-weight:600}
td.ok{color:var(--ok);font-weight:700}
.empty{text-align:center;padding:48px}
</style></head><body><main class="wrap">
<div class="hero"><div><div class="eyebrow">Research evaluator loop</div><h1 class="title">${e(rubric.topic)}</h1>
<p class="lede">${e([rubric.goal, rubric.audience && `Audience: ${rubric.audience}`].filter(Boolean).join(" · "))}</p></div>
<div class="verdict">${latest ? `<div class="eyebrow">Round ${e(latest.round ?? rounds.length)}</div><span class="pill" style="color:${VERDICT_COLOR[verdict] ?? "var(--muted)"}">${e(verdict)}</span>
<div class="stats"><span class="pill muted">${passing} / ${rubric.sections.length} sections passing</span><span class="pill muted">${rubric.judge_mode === "measured" ? "Needs measured results" : "Judging potential"}</span></div>` : ""}</div></div>
${latest ? `${latest.next_research_action ? `<section class="card next"><h2>Next research step</h2><p>${e(latest.next_research_action)}</p>${latest.summary ? `<p class="muted">${e(latest.summary)}</p>` : ""}</section>` : ""}
<div class="grid secs">${sectionCards}</div>
<div class="grid cols">${factChecks}${priorArt}${grill}</div>
${historyTable}` : `<section class="card empty"><h2>No rounds scored yet</h2><p class="muted">The rubric is set. Scores appear here after the first evaluation round.</p></section>
<div class="grid secs" style="margin-top:16px">${sectionCards}</div>`}
${rubric.hard_constraints.length ? `<section class="card" style="margin-top:16px"><h2>Hard constraints</h2><p class="muted">${rubric.hard_constraints.map(e).join(" · ")}</p></section>` : ""}
</main></body></html>`;
}
