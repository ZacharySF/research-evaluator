// Research atlas: one self-contained HTML page showing what the loop has explored, what killed each
// angle, what is still open, and how scores moved against the gate. Rendered from atlas-data.json,
// which the research-retro agent keeps in step with angle-map.md. Inline CSS and SVG, no network.
import { escapeHtml as e, PASS_RULE } from "./lib.mjs";

export const STATUSES = ["closed", "partial", "active", "open"];
const LABEL = { closed: "Closed", partial: "Partial", active: "Active", open: "Open" };
const HELP = {
  closed: "killed; reopen only if the stated reason no longer holds",
  partial: "leftovers exist, below the bar",
  active: "being searched now",
  open: "not yet searched: the unexplored edge",
};
const arr = (v) => (Array.isArray(v) ? v : []);
const scoredRound = (r) => arr(r.sections).length > 0 && r.sections.every((s) => Number.isInteger(s.score));
const judged = (rounds) => arr(rounds).filter(scoredRound);
const sectionOf = (r, name) => arr(r?.sections).find((s) => s.name.toLowerCase() === name.toLowerCase());

export function roundProgress(round, sections) {
  const scores = sections.map((s) => sectionOf(round, s.name));
  const complete = scores.length > 0 && scores.every((s) => Number.isInteger(s?.score)) && arr(round?.sections).length === sections.length;
  const comparable = complete && scores.every((s, i) => s.threshold === sections[i].threshold);
  return {
    passing: scores.filter((s, i) => Number.isInteger(s?.score) && s.score >= sections[i].threshold).length,
    total: sections.length, complete, comparable,
    totalScore: comparable ? scores.reduce((sum, s) => sum + s.score, 0) : null,
  };
}

function validateSections(sections, where) {
  const names = new Set();
  for (const s of sections) {
    if (typeof s.name !== "string" || !s.name.trim()) throw new Error(`${where}: section name is required`);
    const key = s.name.toLowerCase();
    if (names.has(key)) throw new Error(`${where}: duplicate section ${s.name}`);
    names.add(key);
    if (!Number.isInteger(s.threshold) || s.threshold < 1 || s.threshold > 100) throw new Error(`${where}: invalid threshold for ${s.name}`);
  }
}

/** Throws on data the page cannot draw consistently. */
export function validateAtlas(data) {
  if (!Array.isArray(data?.meta?.sections) || !data.meta.sections.length) throw new Error("meta.sections must contain the configured rubric sections");
  validateSections(data.meta.sections, "meta");
  for (const key of ["areas", "angles"]) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  const ids = new Set();
  for (const a of arr(data.angles)) {
    if (ids.has(a.id)) throw new Error(`duplicate angle id: ${a.id}`);
    ids.add(a.id);
  }
  const areas = new Set(arr(data.areas).map((a) => a.id));
  for (const a of arr(data.angles)) {
    if (!areas.has(a.area)) throw new Error(`angle ${a.id}: unknown area ${a.area}`);
    if (!STATUSES.includes(a.status)) throw new Error(`angle ${a.id}: bad status ${a.status}`);
  }
  for (const f of arr(data.frontier)) if (!ids.has(f.angle)) throw new Error(`frontier: unknown angle ${f.angle}`);
  const roundNumbers = new Set();
  for (const r of arr(data.rounds)) {
    if (!Number.isInteger(r.n) || r.n < 1 || roundNumbers.has(r.n)) throw new Error(`invalid or duplicate round number: ${r.n}`);
    roundNumbers.add(r.n);
    const sections = arr(r.sections);
    validateSections(sections, `round ${r.n}`);
    const hasScores = sections.some((s) => s.score != null);
    if (r.verdict === "BLOCKED" && hasScores) throw new Error(`round ${r.n}: BLOCKED must not have scores`);
    if (hasScores) {
      for (const s of sections) {
        if (!Number.isInteger(s.score) || s.score < 1 || s.score > 100) throw new Error(`round ${r.n}: invalid score for ${s.name}`);
        if (typeof s.passed === "boolean" && s.passed !== (s.score >= s.threshold)) throw new Error(`round ${r.n}: section ${s.name} passed flag disagrees with score`);
      }
    }
    if (!ids.has(r.angle)) throw new Error(`round ${r.n}: unknown angle ${r.angle}`);
    const passRule = r.pass_rule ?? data.meta.pass_rule ?? PASS_RULE;
    if (r.verdict === "PASS" && passRule === PASS_RULE && (!scoredRound(r) || !sections.every((s) => s.score >= s.threshold))) {
      throw new Error(`round ${r.n}: PASS requires every section to meet its threshold`);
    }
  }
}

const norm = (t) => t.replace(/[*`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Compares angle-map.md table rows (column 2) with atlas angles' map_name prefixes. */
export function checkAngleMap(angles, markdown) {
  const rows = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.length < 2 || /^[-: ]*$/.test(cells[1]) || /^angle( to try)?$/i.test(cells[1])) continue;
    rows.push([cells[0], cells[1]]);
  }
  const names = arr(angles).filter((a) => a.map_name).map((a) => [norm(a.map_name), a.id]);
  const matched = new Set();
  const missing = [];
  for (const [area, cell] of rows) {
    const candidates = names.filter(([n]) => norm(cell).startsWith(n));
    const longest = Math.max(...candidates.map(([n]) => n.length));
    const hits = candidates.filter(([n]) => n.length === longest);
    if (hits.length === 1) matched.add(hits[0][1]);
    else missing.push(`${area} | ${cell.replace(/[*`]/g, "").slice(0, 90)}`);
  }
  return { rows, missing, stale: arr(angles).map((a) => a.id).filter((id) => !matched.has(id)) };
}

export function bestRound(rounds, sections) {
  const comparable = arr(rounds).filter((r) => roundProgress(r, sections).comparable);
  return comparable.length ? comparable.reduce((best, r) =>
    roundProgress(r, sections).totalScore > roundProgress(best, sections).totalScore ? r : best) : null;
}

function wrap(text, width) {
  const lines = [];
  let cur = "";
  for (const w of String(text).split(/\s+/)) {
    if (cur && cur.length + 1 + w.length > width) { lines.push(cur); cur = w; } else cur = `${cur} ${w}`.trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function bestLabel(a) {
  const b = a.best;
  if (!b) return a.status === "active" ? "being searched" : a.status === "open" ? "unexplored" : "no score";
  if (b.label) return b.label;
  if (b.kind === "discard") return `${b.source} discard`;
  return b.source || "";
}

const defs = (p) => `<defs><pattern id="${p}-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`
  + `<rect width="8" height="8" class="h-bg"/><line x1="0" y1="0" x2="0" y2="8" class="h-line"/></pattern>`
  + `<marker id="${p}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`
  + `<path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker></defs>`;

/** One region per area, one tile per angle; open tiles sort last as the region's unexplored edge. */
function territoryMap(data, ncols, prefix, perRow) {
  if (!data.areas.length) return "";
  const colW = 488, gap = 24, pad = 10, tileGap = 8, tileH = 66, headH = 40;
  const tileW = (colW - 2 * pad - (perRow - 1) * tileGap) / perRow;
  const chars = Math.floor((tileW - 14) / 7.9);
  const colY = new Array(ncols).fill(0);
  const parts = [];
  for (const area of data.areas) {
    const tiles = data.angles.filter((a) => a.area === area.id).sort((x, y) => STATUSES.indexOf(x.status) - STATUSES.indexOf(y.status));
    const nrows = Math.max(1, Math.ceil(tiles.length / perRow));
    const h = headH + nrows * (tileH + tileGap) - tileGap + pad;
    const c = colY.indexOf(Math.min(...colY));
    const x0 = c * (colW + gap), y0 = colY[c];
    colY[c] += h + gap;
    const summary = STATUSES.map((s) => [s, tiles.filter((t) => t.status === s).length]).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`).join(" · ");
    parts.push(`<g class="region"><rect x="${x0}" y="${y0}" width="${colW}" height="${h}" rx="14" class="region-bg"/>`
      + `<text x="${x0 + 14}" y="${y0 + 25}" class="region-title">${e(area.name)}</text>`
      + `<text x="${x0 + colW - 14}" y="${y0 + 25}" text-anchor="end" class="region-sum">${e(summary)}</text>`);
    tiles.forEach((a, i) => {
      const tx = x0 + pad + (i % perRow) * (tileW + tileGap), ty = y0 + headH + Math.floor(i / perRow) * (tileH + tileGap);
      let lines = wrap(a.short || a.name, chars);
      if (lines.length > 2) lines = [lines[0], lines[1].slice(0, chars - 1).trimEnd() + "…"];
      const label = bestLabel(a);
      parts.push(`<a href="#angle-${e(a.id)}"><g class="tile t-${a.status}"><title>${e(`${a.name} — ${LABEL[a.status]}; best: ${label}`)}</title>`
        + `<rect x="${tx.toFixed(1)}" y="${ty}" width="${tileW.toFixed(1)}" height="${tileH}" rx="8" class="tile-bg"${a.status === "open" ? ` fill="url(#${prefix}-hatch)"` : ""}/>`
        + lines.map((l, j) => `<text x="${(tx + 9).toFixed(1)}" y="${ty + 19 + j * 15}" class="tile-name">${e(l)}</text>`).join("")
        + `<text x="${(tx + 9).toFixed(1)}" y="${ty + tileH - 9}" class="tile-score">${e(label.length > 26 ? label.slice(0, 25) + "…" : label)}</text></g></a>`);
    });
    parts.push("</g>");
  }
  const width = ncols * colW + (ncols - 1) * gap;
  return `<svg class="map map-${ncols}" viewBox="0 0 ${width} ${Math.max(...colY) - gap}" role="img" `
    + `aria-label="Territory map: one region per research area, one tile per angle, colored by status">${defs(prefix)}${parts.join("")}</svg>`;
}

function scoreChart(rounds, sections) {
  const W = 1000, H = 360, L = 56, R = 20, T = 26, B = 70;
  const nMax = Math.max(...rounds.map((r) => r.n));
  const values = judged(rounds).flatMap((r) => r.sections.map((s) => s.score));
  const lo = Math.max(0, Math.floor(Math.min(...values, ...sections.map((s) => s.threshold)) / 10) * 10 - 10);
  const step = (W - L - R) / nMax;
  const X = (n) => L + (n - 0.5) * step;
  const Y = (v) => T + ((100 - v) * (H - T - B)) / (100 - lo);
  const p = [`<div class="legend">${sections.map((s, i) => `<span style="color:var(--c${i % 6 + 1})">● ${e(s.name)} ≥${s.threshold}</span>`).join("")}</div>`,
    `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Configured section scores against their thresholds; unscored rounds marked on the axis">`];
  for (let v = lo; v <= 100; v += 10) {
    p.push(`<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="grid"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="small">${v}</text>`);
  }
  for (const g of new Set(sections.map((s) => s.threshold))) {
    p.push(`<line x1="${L}" x2="${W - R}" y1="${Y(g).toFixed(1)}" y2="${Y(g).toFixed(1)}" class="gate"/>`
      + `<text x="${W - R - 4}" y="${(Y(g) - 6).toFixed(1)}" text-anchor="end" class="gate-label">threshold ${g}</text>`);
  }
  sections.forEach((section, i) => {
    const points = rounds.filter((r) => Number.isInteger(sectionOf(r, section.name)?.score));
    const color = `var(--c${i % 6 + 1})`;
    p.push(`<polyline points="${points.map((r) => `${X(r.n).toFixed(1)},${Y(sectionOf(r, section.name).score).toFixed(1)}`).join(" ")}" class="line" style="stroke:${color}"/>`);
    for (const r of points) {
      const s = sectionOf(r, section.name);
      p.push(`<circle cx="${X(r.n).toFixed(1)}" cy="${Y(s.score).toFixed(1)}" r="4.5" style="fill:${color}">`
        + `<title>R${r.n} ${e(section.name)}: ${s.score}/${s.threshold}</title></circle>`);
    }
  });
  const ay = H - B;
  p.push(`<line x1="${L}" x2="${W - R}" y1="${ay}" y2="${ay}" class="axis"/>`);
  for (const r of rounds) {
    const x = X(r.n);
    if (rounds.length <= 40 || r.n % 5 === 0) p.push(`<text x="${x.toFixed(1)}" y="${ay + 18}" text-anchor="middle" class="small">${r.n}</text>`);
    if (!scoredRound(r)) p.push(`<g class="discard"><title>R${r.n} ${e(r.verdict || "not scored")}: ${e(r.one_line)}</title><path d="M${(x - 6).toFixed(1)},${ay + 26} l12,12 M${(x + 6).toFixed(1)},${ay + 26} l-12,12"/></g>`);
  }
  p.push(`<text x="${L}" y="${ay + 60}" class="small">round →   ✕ not scored (discarded or blocked). Threshold lines are the current rubric; changed criteria are not directly comparable.</text></svg>`);
  return p.join("");
}

function loopFlow() {
  const boxes = [
    [20, 110, 160, 74, "Memory files", ["playbook, angle map,", "lessons, calibration"]],
    [230, 110, 140, 74, "Scouts", ["2-4 diverse angles"]],
    [420, 110, 160, 74, "Builder", ["kill-search first,", "then propose"]],
    [640, 110, 140, 74, "Evaluator", ["scores the", "proposal"]],
    [820, 20, 150, 74, "Validator-auditor", ["checks and improves", "the evaluator"]],
    [820, 200, 150, 74, "Research-retro", ["updates memory,", "plans next batch"]],
  ];
  const p = [`<svg class="flow" viewBox="0 0 980 330" role="img" aria-label="Memory feeds scouts, then the builder, then the evaluator; the validator-auditor improves the evaluator and the research-retro updates memory">`, defs("flow")];
  for (const [x, y, w, h, t, sub] of boxes) {
    p.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="fbox"/><text x="${x + w / 2}" y="${y + 25}" text-anchor="middle" class="ftitle">${t}</text>`
      + sub.map((l, i) => `<text x="${x + w / 2}" y="${y + 45 + i * 15}" text-anchor="middle" class="small">${l}</text>`).join(""));
  }
  const arrow = (d, label, lx, ly) => p.push(`<path d="${d}" class="farrow" marker-end="url(#flow-arrow)"/>`
    + (label ? `<text x="${lx}" y="${ly}" text-anchor="middle" class="small">${label}</text>` : ""));
  arrow("M180,147 L228,147");
  arrow("M370,147 L418,147");
  arrow("M580,147 L638,147", "survives", 609, 138);
  arrow("M780,135 C800,120 800,60 818,57");
  arrow("M895,94 L895,198", "audit", 936, 150);
  arrow("M780,160 C800,175 800,230 818,237");
  arrow("M500,184 C520,245 720,252 818,248", "killed: short discard", 640, 272);
  arrow("M895,274 C895,325 100,325 100,186", "updates memory", 480, 322);
  arrow("M895,20 C895,2 100,2 100,108", "logs audit", 480, 24);
  p.push("</svg>");
  return p.join("");
}

export const CSS = `
:root{--bg:#f7f8fa;--card:#fff;--fg:#1d2330;--muted:#5b6475;--line:#d9dee7;--accent:#2457c5;
--closed-bg:#e4e7ee;--closed-st:#7d879a;--partial-bg:#fdecc4;--partial-st:#b7791f;--active-bg:#d3e4ff;--active-st:#2b6cb0;
--open-bg:#e5f6ec;--open-st:#2f855a;--open-line:#a7dcbb;--region:#eef1f6;--gate:#c53030;
--c1:#2457c5;--c2:#a56810;--c3:#2f855a;--c4:#8b46b1;--c5:#bb3877;--c6:#087e8b}
@media (prefers-color-scheme:dark){:root{--bg:#12151b;--card:#1a1f27;--fg:#e6e9ef;--muted:#9aa3b5;--line:#2f3644;--accent:#7aa7ff;
--closed-bg:#2a303c;--closed-st:#77819a;--partial-bg:#4a3a12;--partial-st:#e0a43a;--active-bg:#18365f;--active-st:#63a4ff;
--open-bg:#123020;--open-st:#4fd18b;--open-line:#1f5a3a;--region:#1d232d;--gate:#ff6b6b;
--c1:#7aa7ff;--c2:#f0b44c;--c3:#4fd18b;--c4:#c19aff;--c5:#f49ac2;--c6:#62d1dc}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 18px 64px}h1{font-size:1.7rem;margin:.2em 0}
h2{font-size:1.3rem;margin:2.2em 0 .5em;padding-top:.4em;border-top:1px solid var(--line)}h3{font-size:1.1rem;margin:1.6em 0 .4em}
a{color:var(--accent)}p,li,td,th,dd{overflow-wrap:anywhere}.muted{color:var(--muted)}.small-p{font-size:.9rem}
.lead{font-size:1.12rem;background:var(--card);border:1px solid var(--line);border-left:5px solid var(--accent);border-radius:10px;padding:14px 18px}
.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.kpi{flex:1 1 120px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.kpi b{display:block;font-size:1.5rem}.kpi span{color:var(--muted);font-size:.85rem}
svg{display:block;width:100%;height:auto}.map-1{display:none}@media (max-width:760px){.map-2{display:none}.map-1{display:block}}
.region-bg{fill:var(--region);stroke:var(--line)}.region-title{font:600 16px system-ui,sans-serif;fill:var(--fg)}.region-sum{font:12px system-ui,sans-serif;fill:var(--muted)}
.tile-bg{stroke-width:1.5}.tile-name{font:600 12.5px system-ui,sans-serif;fill:var(--fg)}.tile-score{font:11.5px system-ui,sans-serif;fill:var(--muted)}
.t-closed .tile-bg{fill:var(--closed-bg);stroke:var(--closed-st)}.t-partial .tile-bg{fill:var(--partial-bg);stroke:var(--partial-st)}
.t-active .tile-bg{fill:var(--active-bg);stroke:var(--active-st);stroke-width:3}.t-open .tile-bg{stroke:var(--open-st);stroke-dasharray:5 4;stroke-width:2}
.h-bg{fill:var(--open-bg)}.h-line{stroke:var(--open-line);stroke-width:3}a:hover .tile-bg{stroke-width:3}
.legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin:8px 0;font-size:.88rem}
.sw{display:inline-block;width:16px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:5px;border:1.5px solid}
.sw.closed,.pill.closed{background:var(--closed-bg);border-color:var(--closed-st)}.sw.partial,.pill.partial{background:var(--partial-bg);border-color:var(--partial-st)}
.sw.active,.pill.active{background:var(--active-bg);border-color:var(--active-st)}
.sw.open{background:repeating-linear-gradient(45deg,var(--open-bg) 0 4px,var(--open-line) 4px 6px);border:2px dashed var(--open-st)}
.grid{stroke:var(--line)}.axis{stroke:var(--muted)}.gate{stroke:var(--gate);stroke-width:2;stroke-dasharray:8 5}
.gate-label{font:600 13px system-ui,sans-serif;fill:var(--gate)}.small{font:12px system-ui,sans-serif;fill:var(--muted)}
.line{fill:none;stroke-width:2.2}.discard path{stroke:var(--gate);stroke-width:2.5}
.fbox{fill:var(--card);stroke:var(--accent);stroke-width:1.5}.ftitle{font:600 14px system-ui,sans-serif;fill:var(--fg)}
.farrow{fill:none;stroke:var(--muted);stroke-width:1.6}.arrowhead{fill:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}.cards.wide{grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card h4{margin:.1em 0 .4em}.card p{margin:.35em 0;font-size:.92rem}
.card.open{border:2px dashed var(--open-st)}.card.active{border:2px solid var(--active-st)}.card.warn{border-left:5px solid var(--gate)}
.pill{display:inline-block;font-size:.75rem;font-weight:600;padding:1px 8px;border-radius:999px;border:1.5px solid;margin-right:6px}
.pill.open{background:var(--open-bg);border-color:var(--open-st);border-style:dashed}.pill.budget{border-color:var(--muted);color:var(--muted)}
.angle{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin:10px 0}
.angle h4{margin:0 0 6px}.angle dl{margin:0;display:grid;grid-template-columns:8.5em 1fr;gap:4px 12px;font-size:.92rem}
.angle dt{color:var(--muted)}.angle dd{margin:0}.angle ul{margin:0;padding-left:1.1em}
table{width:100%;border-collapse:collapse;font-size:.88rem;background:var(--card)}th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.table-scroll{overflow-x:auto}
th{background:var(--region)}nav.toc{font-size:.9rem;display:flex;flex-wrap:wrap;gap:4px 14px}details summary{cursor:pointer;color:var(--accent)}
dl.gloss{display:grid;grid-template-columns:8em 1fr;gap:4px 12px}dl.gloss dt{font-weight:600}dl.gloss dd{margin:0}
@media (max-width:600px){.angle dl{grid-template-columns:1fr}}
`;

const pill = (s) => `<span class="pill ${s}">${LABEL[s]}</span>`;
function safeHref(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, "https://atlas.invalid/");
    return ["http:", "https:"].includes(url.protocol) ? value : null;
  } catch { return null; }
}
const linkOrText = (k) => (safeHref(k.url) ? `<a href="${e(k.url)}">${e(k.title)}</a>` : `${e(k.title)} <span class="muted">(no safe link recorded)</span>`);

export function renderAtlas(data) {
  validateAtlas(data);
  const { meta } = data;
  const angles = arr(data.angles), rounds = [...arr(data.rounds)].sort((a, b) => a.n - b.n), sections = meta.sections;
  const byId = Object.fromEntries(angles.map((a) => [a.id, a]));
  const areaName = Object.fromEntries(arr(data.areas).map((a) => [a.id, a.name]));
  const count = Object.fromEntries(STATUSES.map((s) => [s, angles.filter((a) => a.status === s).length]));
  const best = bestRound(rounds, sections);
  const scored = judged(rounds);
  const progress = best ? roundProgress(best, sections) : null;
  const h = [`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta name="color-scheme" content="light dark"><title>${e(meta.title)}</title><style>${CSS}</style></head><body><main>`];
  h.push(`<h1>${e(meta.title)}</h1><p class="muted small-p">Updated ${e(meta.updated)}. Generated from <code>atlas-data.json</code> by <code>tools/ui.mjs atlas</code>.</p>`);
  const standing = best
    ? `Highest comparable total is round ${best.n}; <b>${progress.passing}/${progress.total} sections meet their thresholds</b>. The total is display-only, never an acceptance gate.`
    : `No scored round matches the current rubric yet; all <b>${sections.length} configured sections</b> remain visible.`;
  h.push(`<p class="lead"><b>Where research stands:</b> ${standing} Of ${angles.length} angles, <b>${count.closed} closed</b>, ${count.partial} partial, `
    + `${count.active} active and <b>${count.open} open</b>. Acceptance also depends on constraints, the configured pass rule, and audit recovery.</p>`);
  h.push(`<div class="kpis"><div class="kpi"><b>${scored.length}</b><span>scored rounds</span></div><div class="kpi"><b>${rounds.length - scored.length}</b><span>rounds not scored</span></div>`
    + STATUSES.map((s) => `<div class="kpi"><b>${count[s]}</b><span>${s} angles</span></div>`).join("") + `</div>`);
  h.push(`<div class="cards">${sections.map((s) => {
    const score = best ? sectionOf(best, s.name)?.score : null;
    return `<div class="card"><h4>${e(s.name)}</h4><p><b>${score ?? "—"}</b> / ${s.threshold} required${best ? ` · R${best.n}` : ""}</p></div>`;
  }).join("")}</div><p class="muted small-p">Judging mode: ${meta.judge_mode === "measured" ? "measured results" : "conditional potential"}. Historical verdicts are not current approval.</p>`);
  h.push(`<p>${e(meta.goal)}${meta.standing ? " " + e(meta.standing) : ""}</p>`);
  if (meta.standard) h.push(`<p class="muted small-p"><b>Standard:</b> ${e(meta.standard)}</p>`);
  h.push(`<p class="muted small-p"><b>Pass rule:</b> ${e(meta.pass_rule || PASS_RULE)}. Custom rules are recorded, not reinterpreted by this view.</p>`);
  if (arr(meta.hard_constraints).length) h.push(`<h3>Hard constraints</h3><ul>${meta.hard_constraints.map((c) => `<li>${e(c)}</li>`).join("")}</ul>`);
  h.push(`<nav class="toc"><a href="#map">The map</a>${scored.length ? `<a href="#scores">Score history</a>` : ""}<a href="#next">Next gaps</a><a href="#areas">Angles by area</a>`
    + `${arr(data.lessons).length ? `<a href="#lessons">Lessons</a>` : ""}${arr(data.calibration).length ? `<a href="#calibration">Calibration</a>` : ""}<a href="#loop">How the loop works</a></nav>`);

  h.push(`<h2 id="map">The map</h2><p>Each region is a research area; each tile is one angle the loop has tried or could try. Click a tile for details. All configured section thresholds apply; unsearched directions are not proven research gaps.</p>`
    + `<div class="legend">${STATUSES.map((s) => `<span><i class="sw ${s}"></i>${LABEL[s]}: ${HELP[s]}</span>`).join("")}</div>`
    + territoryMap(data, 2, "mapw", 3) + territoryMap(data, 1, "mapn", 2));

  if (scored.length) {
    h.push(`<h2 id="scores">Score history</h2><p>Every configured rubric section against its threshold. Unscored rounds stay unscored; changed rubrics or constraints make rounds noncomparable.</p>`
      + scoreChart(rounds, sections));
  }
  if (rounds.length) {
    const historyNames = [...new Set([...sections.map((s) => s.name), ...rounds.flatMap((r) => arr(r.sections).map((s) => s.name))])];
    h.push(`<details${scored.length ? "" : " open"}><summary>All rounds as a table</summary><div class="table-scroll"><table><tr><th>R</th><th>Proposal</th>${historyNames.map((name) => `<th>${e(name)}</th>`).join("")}<th>Verdict</th><th>In one line</th></tr>`
      + rounds.map((r) => `<tr><td>${r.n}</td><td>${safeHref(r.file) ? `<a href="${e(r.file)}">${e(r.title)}</a>` : e(r.title)}</td>`
        + historyNames.map((name) => { const s = sectionOf(r, name); return `<td>${Number.isInteger(s?.score) ? `${s.score} / ${s.threshold}` : "—"}</td>`; }).join("")
        + `<td>${e(r.verdict || "")}</td><td>${e(r.one_line)}</td></tr>`).join("")
      + `</table></div></details>`);
  }

  h.push(`<h2 id="next">Next gaps</h2><p>Untried or promising angles, why each might work and what could kill it. "Budget first" means an observability or signal budget must pass before any literature search.</p><div class="cards">`);
  for (const f of arr(data.frontier)) {
    const a = byId[f.angle];
    h.push(`<div class="card ${a.status}"><h4>${e(a.name)}</h4><p>${pill(a.status)}${f.budget_first ? `<span class="pill budget">budget first</span>` : ""}<span class="muted">${e(areaName[a.area])}</span></p>`
      + `<p><b>Why promising:</b> ${e(f.why_promising)}</p>${f.kill_risk ? `<p><b>Kill risk:</b> ${e(f.kill_risk)}</p>` : ""}</div>`);
  }
  h.push(`</div>`);
  if (arr(data.blockers).length) {
    h.push(`<h3>Blockers</h3><div class="cards wide">${data.blockers.map((b) => `<div class="card warn"><h4>${e(b.title)}</h4><p>${e(b.text)}</p>`
      + `${arr(b.refs).length ? `<p class="muted">${b.refs.map((x) => `<code>${e(x)}</code>`).join(", ")}</p>` : ""}</div>`).join("")}</div>`);
  }
  if (arr(data.risks).length) {
    h.push(`<h3>Risks found while scouting</h3><div class="cards wide">${data.risks.map((r) => `<div class="card warn"><h4>${e(r.title)}</h4><p>${e(r.text)}</p>`
      + `${r.check ? `<p><b>Check:</b> ${e(r.check)}</p>` : ""}</div>`).join("")}</div>`);
  }
  if (data.latest_batch) {
    h.push(`<h3>Latest batch (${e(data.latest_batch.date)})</h3><ul>${arr(data.latest_batch.results).map((r) => `<li><a href="#angle-${e(r.angle)}">${e(byId[r.angle]?.short || byId[r.angle]?.name || r.angle)}</a>`
      + `${r.agent ? ` — <code>${e(r.agent)}</code>` : ""}: <b>${e(r.outcome)}</b>. ${e(r.text)}</li>`).join("")}</ul>`);
  }

  h.push(`<h2 id="areas">Angles by area</h2>`);
  for (const area of data.areas) {
    h.push(`<h3>${e(area.name)}</h3>${area.description ? `<p class="muted small-p">${e(area.description)}</p>` : ""}`);
    for (const a of angles.filter((x) => x.area === area.id).sort((x, y) => STATUSES.indexOf(x.status) - STATUSES.indexOf(y.status))) {
      const rows = [["Best result", e(bestLabel(a))]];
      if (arr(a.rounds).length) rows.push(["Rounds", a.rounds.map((n) => `R${n}`).join(", ")]);
      if (a.why_closed) rows.push([a.status === "closed" ? "Why closed" : "What limits it", e(a.why_closed)]);
      if (a.note) rows.push(["Note", e(a.note)]);
      if (arr(a.kill_sources).length) rows.push(["Kill sources", `<ul>${a.kill_sources.map((k) => `<li>${linkOrText(k)}</li>`).join("")}</ul>`]);
      if (a.leftover) rows.push(["Leftover", e(a.leftover)]);
      if (arr(a.docs).length) rows.push(["Documents", a.docs.map((d) => `<code>${e(d)}</code>`).join(", ")]);
      h.push(`<article class="angle" id="angle-${e(a.id)}"><h4>${pill(a.status)}${e(a.name)}</h4><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></article>`);
    }
  }

  if (arr(data.lessons).length) {
    h.push(`<h2 id="lessons">Lessons</h2><p>Patterns that killed candidates, and the check that avoids each.</p><table><tr><th>#</th><th>Pattern</th><th>Evidence</th><th>Check before proposing</th></tr>`
      + data.lessons.map((l) => `<tr><td>${e(l.id)}</td><td>${e(l.pattern)}</td><td>${e(l.evidence)}</td><td>${e(l.check)}</td></tr>`).join("") + `</table>`);
    if (meta.what_worked) h.push(`<p><b>What has worked:</b> ${e(meta.what_worked)}</p>`);
  }
  if (arr(data.calibration).length) {
    h.push(`<h2 id="calibration">Calibration</h2><p>Own estimates (novelty / impact) against what the evaluator or the kill-search found.</p>`
      + (arr(data.calibration_notes).length ? `<ul>${data.calibration_notes.map((n) => `<li>${e(n)}</li>`).join("")}</ul>` : "")
      + `<table><tr><th>Who</th><th>Candidate</th><th>Own estimate</th><th>Evaluator</th><th>Outcome</th></tr>`
      + data.calibration.map((c) => `<tr><td>${e(c.name)}</td><td>${e(c.candidate)}</td><td>${e(c.estimate || "—")}</td><td>${e(c.judge || "—")}</td><td>${e(c.outcome)}</td></tr>`).join("") + `</table>`);
  }

  h.push(`<h2 id="loop">How the loop works</h2><p>Each session must leave the next one better: memory files carry what was learned, the retrospective keeps them current, and the auditor keeps the evaluator honest.</p>${loopFlow()}`);
  if (arr(data.audits).length) {
    h.push(`<h3>Evaluator audits</h3><ul>${data.audits.map((a) => `<li><b>${e(a.date)}${a.rounds ? ` (rounds ${arr(a.rounds).join(", ")})` : ""}:</b> ${e(a.finding)}${a.edits ? ` <i>Edits:</i> ${e(a.edits)}` : ""}</li>`).join("")}</ul>`);
  }
  if (arr(meta.glossary).length) {
    h.push(`<h3>Glossary</h3><dl class="gloss">${meta.glossary.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join("")}</dl>`);
  }
  h.push(`</main></body></html>\n`);
  return h.join("");
}
