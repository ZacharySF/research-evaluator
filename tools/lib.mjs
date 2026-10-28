// Pure helpers for ui.mjs: review-setup validation, strictness bands, and the static loop report.
// The report reads review JSON in the contract defined by agents/research-evaluator.md.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const GATES = [
  { key: "novelty", name: "Novelty", hint: "How much survives after the closest prior art. Always min(research novelty, idea novelty)." },
  { key: "audience_impact", name: "Audience impact", hint: "Would a successful result matter to the audience, with a credible path and decisive evaluation?" },
];

export const ZONES = [
  { min: 94, label: "Elite", color: "#c084fc", means: "Only exceptional work passes. Expect many rounds." },
  { min: 85, label: "Strict", color: "#fbbf24", means: "Strong work with no real gaps." },
  { min: 70, label: "Solid", color: "#34d399", means: "Good, credible work; minor gaps allowed." },
  { min: 1, label: "Lenient", color: "#60a5fa", means: "A rough sketch is enough. Good for early exploration." },
];

export function thresholdZone(threshold) {
  return ZONES.find((z) => threshold >= z.min) ?? ZONES[ZONES.length - 1];
}

const text = (v) => (typeof v === "string" ? v.trim() : "");

function threshold(name, v) {
  if (v === undefined) return 94;
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || Math.round(n) < 1 || Math.round(n) > 100) {
    throw new Error(`${name} threshold must be a number from 1 to 100`);
  }
  return Math.round(n);
}

/** Validates the setup page's answers into the durable review-setup shape. */
export function normalizeSetup(raw) {
  if (!raw || typeof raw !== "object") throw new Error("setup must be an object");
  const goal = text(raw.goal);
  if (!goal) throw new Error("goal is required: what should the research achieve?");
  const t = raw.thresholds && typeof raw.thresholds === "object" ? raw.thresholds : {};
  return {
    goal,
    audience: text(raw.audience),
    thresholds: { novelty: threshold("novelty", t.novelty), audience_impact: threshold("audience_impact", t.audience_impact) },
    constraints: (Array.isArray(raw.constraints) ? raw.constraints : []).map(text).filter(Boolean),
    limits: text(raw.limits),
  };
}

export function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Reads review-setup.json and review-roundN.json files (sorted by N) from a loop directory. */
export function loadLoop(dir) {
  const setupPath = join(dir, "review-setup.json");
  if (!existsSync(setupPath)) throw new Error(`no review-setup.json in ${dir}`);
  const setup = normalizeSetup(JSON.parse(readFileSync(setupPath, "utf8")));
  const rounds = readdirSync(dir)
    .map((file) => ({ file, n: Number(/^review-round(\d+)\.json$/.exec(file)?.[1]) }))
    .filter((r) => Number.isInteger(r.n))
    .sort((a, b) => a.n - b.n)
    .map(({ file }) => ({ file, data: JSON.parse(readFileSync(join(dir, file), "utf8")) }));
  return { setup, rounds };
}

// Shared look for the setup page and the report: dark by default, light when the OS asks.
export const BASE_CSS = `
:root{--bg:#0d0f17;--panel:#151826;--panel2:#1c2033;--line:#2a2f45;--fg:#e8eaf3;--muted:#9aa0b8;
--accent:#8b5cf6;--accent2:#22d3ee;--ok:#34d399;--warn:#fbbf24;--bad:#f87171;--radius:16px;color-scheme:dark}
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
const STATUS_COLOR = { met: "var(--ok)", violated: "var(--bad)", unknown: "var(--warn)" };
const OVERLAP_COLOR = { identical: "var(--bad)", major: "var(--warn)", partial: "var(--accent2)", adjacent: "var(--muted)" };

function sparkline(scores, threshold) {
  if (scores.length < 2) return "";
  const w = 140, h = 34, pad = 3;
  const x = (i) => pad + (i * (w - 2 * pad)) / (scores.length - 1);
  const y = (v) => h - pad - ((v - 1) * (h - 2 * pad)) / 99;
  const pts = scores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = scores[scores.length - 1];
  const c = last >= threshold ? "var(--ok)" : "var(--accent)";
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
<line x1="0" x2="${w}" y1="${y(threshold).toFixed(1)}" y2="${y(threshold).toFixed(1)}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/>
<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${x(scores.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3" fill="${c}"/></svg>`;
}

const list = (title, items, row) => (items?.length ? `<section class="card"><h2>${title}</h2><ul class="list">${items.map(row).join("")}</ul></section>` : "");

/** Renders a self-contained HTML report of a review loop. */
export function renderReport(setup, rounds) {
  const e = escapeHtml;
  const latest = rounds.at(-1)?.data;
  const lastScored = [...rounds].reverse().find((r) => r.data.scores)?.data;
  const prevScored = [...rounds].reverse().filter((r) => r.data.scores)[1]?.data;
  const thresholds = latest?.thresholds ?? setup.thresholds;

  const gateCards = GATES.map((g) => {
    const t = thresholds[g.key] ?? setup.thresholds[g.key];
    const zone = thresholdZone(t);
    const score = latest?.scores?.[g.key];
    const before = latest?.scores ? prevScored?.scores?.[g.key] : undefined;
    const history = rounds.map((r) => r.data.scores?.[g.key]).filter((v) => typeof v === "number");
    const passed = typeof score === "number" && score >= t;
    const delta = typeof score === "number" && typeof before === "number" ? score - before : null;
    const sub = g.key === "novelty" && latest?.scores
      ? `<p class="muted sub">Research novelty ${e(latest.scores.research_novelty)} · idea novelty ${e(latest.scores.idea_novelty)} · the lower one counts</p>` : "";
    return `<article class="card sec ${passed ? "passed" : ""}">
  <header><div><h3>${g.name}</h3><span class="pill" style="color:${zone.color}">${zone.label} · pass at ${e(t)}</span></div>
  <div class="score">${typeof score === "number" ? `<b>${score}</b><span class="muted">/100</span>` : `<span class="muted">No scores</span>`}${delta == null ? "" : `<span class="delta ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}</span>`}</div></header>
  <div class="bar"><i style="width:${typeof score === "number" ? score : 0}%"></i><s style="left:${t}%" title="threshold ${t}"></s></div>
  ${sparkline(history, t)}${sub}
  <p class="muted">${e(g.hint)}</p>
</article>`;
  }).join("\n");

  const verdict = latest?.verdict;
  const na = latest?.next_action;
  const body = latest
    ? `${na ? `<section class="card next"><h2>Next step</h2><p>${e(na.action)}</p>${na.acceptance_check ? `<p class="muted"><span class="label">Done when</span>${e(na.acceptance_check)}</p>` : ""}${latest.summary ? `<p class="muted">${e(latest.summary)}</p>` : ""}</section>` : ""}
${!latest.scores && lastScored ? `<p class="muted">This round is blocked, so it has no scores. The cards show it; history keeps earlier scores.</p>` : ""}
<div class="grid secs">${gateCards}</div>
<div class="grid cols">
${list("Critique", latest.critique, (c) => `<li><span class="dot"></span><div>${e(c)}</div></li>`)}
${list("Constraints", latest.constraints, (c) => `<li><span class="pill" style="color:${STATUS_COLOR[c.status] ?? "var(--muted)"}">${e(c.status)}</span><div><b>${e(c.constraint)}</b><p class="muted">${e(c.evidence)}</p></div></li>`)}
${list("Closest prior art", latest.prior_art, (p) => `<li><span class="pill" style="color:${OVERLAP_COLOR[p.overlap] ?? "var(--muted)"}">${e(p.overlap)}</span><div><a href="${e(p.url)}" target="_blank" rel="noreferrer">${e(p.title)}</a><p class="muted">Solves: ${e(p.what_it_solves)}</p><p class="muted">Still new: ${e(p.residual_contribution)}</p></div></li>`)}
${list("Open questions", latest.questions, (q) => `<li><span class="pill" style="color:var(--accent)">?</span><div><b>${e(q.question)}</b><p class="muted">Recommended: ${e(q.recommendation)}</p></div></li>`)}
${list("Uncertainties", latest.uncertainties, (u) => `<li><span class="dot warn"></span><div>${e(u)}</div></li>`)}
</div>
<section class="card"><h2>Round history</h2><div class="scroll"><table><thead><tr><th>Round</th>${GATES.map((g) => `<th>${g.name} <span class="muted">≥${e(thresholds[g.key])}</span></th>`).join("")}<th>Verdict</th></tr></thead><tbody>${rounds.map((r) =>
        `<tr><td>${e(r.data.round ?? r.file)}</td>${GATES.map((g) => {
          const v = r.data.scores?.[g.key];
          const t = r.data.thresholds?.[g.key] ?? thresholds[g.key];
          return `<td class="${typeof v === "number" && v >= t ? "ok" : ""}">${v ?? "—"}</td>`;
        }).join("")}<td><span class="pill" style="color:${VERDICT_COLOR[r.data.verdict] ?? "var(--muted)"}">${e(r.data.verdict)}</span></td></tr>`).join("")}</tbody></table></div></section>`
    : `<section class="card empty"><h2>No reviews yet</h2><p class="muted">The setup is saved. Scores appear here after the first review.</p></section>
<div class="grid secs" style="margin-top:16px">${gateCards}</div>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(setup.goal)} · research review</title><style>${BASE_CSS}
.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;flex-wrap:wrap;margin-bottom:28px}
.verdict{text-align:right;margin-left:auto}.verdict .pill{font-size:15px;padding:6px 14px}
.stats{display:flex;gap:10px;margin-top:10px;justify-content:flex-end;flex-wrap:wrap}
.secs{grid-template-columns:repeat(auto-fit,minmax(320px,1fr));margin-bottom:16px}
.sec header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.sec h3{font-size:18px;margin-bottom:6px}.sec.passed{border-color:color-mix(in srgb,var(--ok) 45%,var(--line))}
.sec p{margin:6px 0 0}.sub{font-size:13px}
.score{display:flex;align-items:baseline;gap:4px;white-space:nowrap}.score b{font-size:34px;font-weight:750;letter-spacing:-.03em}
.delta{font-size:12px;font-weight:700;margin-left:6px}.delta.up{color:var(--ok)}.delta.down{color:var(--bad)}
.bar{position:relative;height:10px;border-radius:99px;background:var(--panel2);margin:14px 0 8px}
.bar i{position:absolute;inset:0 auto 0 0;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.sec.passed .bar i{background:linear-gradient(90deg,var(--ok),var(--accent2))}
.bar s{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--fg);border-radius:2px;opacity:.8}
.spark{color:var(--muted);display:block;margin:2px 0 4px}
.label{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:650;margin-bottom:2px}
.next{border-color:color-mix(in srgb,var(--accent) 50%,var(--line));background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 14%,var(--panel)),var(--panel));margin-bottom:16px}
.next h2{font-size:16px;margin-bottom:6px}
.cols{grid-template-columns:repeat(auto-fit,minmax(340px,1fr));margin-bottom:16px}
.card h2{font-size:17px;margin-bottom:12px}
.list{list-style:none;margin:0;padding:0;display:grid;gap:12px}.list li{display:flex;gap:12px;align-items:flex-start}.list p{margin:2px 0 0}
.dot{width:8px;height:8px;border-radius:50%;background:var(--accent);margin-top:8px;flex:none}.dot.warn{background:var(--warn)}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}th{font-size:12px;color:var(--muted);font-weight:600}
td.ok{color:var(--ok);font-weight:700}
.empty{text-align:center;padding:48px}
</style></head><body><main class="wrap">
<div class="hero"><div><div class="eyebrow">Research review loop</div><h1 class="title">${e(setup.goal)}</h1>
<p class="lede">${e([setup.audience && `Audience: ${setup.audience}`, setup.limits && `Limits: ${setup.limits}`].filter(Boolean).join(" · "))}</p></div>
${latest ? `<div class="verdict"><div class="eyebrow">Round ${e(latest.round ?? rounds.length)}</div><span class="pill" style="color:${VERDICT_COLOR[verdict] ?? "var(--muted)"}">${e(verdict)}</span>
<div class="stats"><span class="pill muted">${rounds.length} review${rounds.length === 1 ? "" : "s"}</span></div></div>` : ""}</div>
${body}
${setup.constraints.length && !latest ? `<section class="card" style="margin-top:16px"><h2>Constraints</h2><p class="muted">${setup.constraints.map(e).join(" · ")}</p></section>` : ""}
</main></body></html>`;
}
