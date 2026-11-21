#!/usr/bin/env node
// Idea-pipeline helpers for the research loop: gap harvesting, idea-pool hygiene, triage batching and
// survivor ranking. Language-model work (ideation, prior-art triage, red-teaming) is done by agents; these
// commands only make the pool and its receipts mechanical and checkable.
//   node pipeline.mjs check <ideas.jsonl>...
//   node pipeline.mjs pool --dir <loop-dir> [--batch 6] [--keep-low]
//   node pipeline.mjs survivors --dir <loop-dir>
//   node pipeline.mjs gaps --out <file.jsonl> [--max-posts 50] <feed-url>...
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_IDEA_FIELDS = ["id", "title", "creative_step"];

/** Parses JSON Lines; malformed lines are reported with their 1-based line number, never thrown. */
export function parseJsonl(text) {
  const rows = [];
  const errors = [];
  text.split("\n").forEach((line, i) => {
    const s = line.trim();
    if (!s) return;
    try { rows.push(JSON.parse(s)); } catch (err) { errors.push({ line: i + 1, error: err.message }); }
  });
  return { rows, errors };
}

const isBlank = (v) => v === undefined || v === null || (typeof v === "string" && !v.trim());

/** Checks required fields and duplicate ids across a list of idea objects. */
export function checkIdeas(rows) {
  const seen = new Set();
  const duplicates = [];
  const invalid = [];
  let valid = 0;
  for (const row of rows) {
    const missing = REQUIRED_IDEA_FIELDS.filter((f) => isBlank(row?.[f]));
    if (missing.length) { invalid.push({ id: row?.id ?? null, missing }); continue; }
    if (seen.has(row.id)) { duplicates.push(row.id); continue; }
    seen.add(row.id);
    valid++;
  }
  return { valid, invalid, duplicates };
}

const ideaFiles = (dir) => existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort().map((f) => join(dir, f))
  : [];

/** Merges every ideas/*.jsonl file into one deduplicated pool (first occurrence of an id wins). */
export function buildPool(files, { keepLow = false } = {}) {
  const pool = [];
  const seen = new Set();
  let duplicates = 0, droppedLow = 0, malformed = 0, invalid = 0;
  for (const file of files) {
    const { rows, errors } = parseJsonl(readFileSync(file, "utf8"));
    malformed += errors.length;
    for (const row of rows) {
      if (REQUIRED_IDEA_FIELDS.some((f) => isBlank(row?.[f]))) { invalid++; continue; }
      if (seen.has(row.id)) { duplicates++; continue; }
      seen.add(row.id);
      if (!keepLow && String(row.self_novelty).toLowerCase() === "low") { droppedLow++; continue; }
      pool.push(row);
    }
  }
  return { pool, duplicates, droppedLow, malformed, invalid };
}

const VERDICT_ORDER = { clear: 0, near: 1 };

/** Survivors only: clear before near, kills dropped, then highest predicted novelty first. */
export function rankTriage(rows) {
  return rows
    .filter((r) => r.verdict in VERDICT_ORDER)
    .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || (b.novelty_pred ?? 0) - (a.novelty_pred ?? 0));
}

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, "&")
  .trim();

/** Reads RSS <item> and Atom <entry> elements into {title, url, date}. */
export function parseFeed(xml) {
  const out = [];
  for (const m of xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const body = m[2];
    const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const link = body.match(/<link>([\s\S]*?)<\/link>/)
      ?? body.match(/<link[^>]*rel=['"]alternate['"][^>]*href=['"]([^'"]+)['"]/)
      ?? body.match(/<link[^>]*href=['"]([^'"]+)['"]/);
    const date = body.match(/<(pubDate|published|updated)>([\s\S]*?)<\/\1>/);
    if (title && link) out.push({ title: decode(title[1]), url: decode(link[1]), date: date ? decode(date[2]) : "" });
  }
  return out;
}

export function htmlToText(html) {
  return decode(html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const GAP_PATTERN = /future work|limitations?\b|remains? (an )?(open|unsolved|unclear|challenging)|open (problem|question|challenge)|not yet\b|we plan to|still (struggles?|lacks?|fails?|requires?)|further research|cannot yet|beyond the scope|left for future|is an important direction/i;

/** Sentences that state an open problem, limitation or planned work; candidates only, not verified gaps. */
export function gapCandidates(text, { max = 25 } = {}) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 500 && GAP_PATTERN.test(s))
    .slice(0, max);
}

function args(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    } else rest.push(argv[i]);
  }
  return { flags, rest };
}

function cmdCheck(files) {
  let failed = false;
  const reports = files.map((file) => {
    const { rows, errors } = parseJsonl(readFileSync(file, "utf8"));
    const report = checkIdeas(rows);
    if (errors.length || report.invalid.length || report.duplicates.length) failed = true;
    return { file, malformed: errors, ...report };
  });
  console.log(JSON.stringify(reports, null, 2));
  return failed ? 1 : 0;
}

function cmdPool(flags) {
  const dir = resolve(flags.dir);
  const size = Math.max(1, Number(flags.batch) || 6);
  const { pool, duplicates, droppedLow, malformed, invalid } = buildPool(ideaFiles(join(dir, "ideas")), { keepLow: Boolean(flags["keep-low"]) });
  const triage = join(dir, "triage");
  mkdirSync(triage, { recursive: true });
  let batches = 0;
  for (let i = 0; i < pool.length; i += size) {
    batches++;
    writeFileSync(join(triage, `batch-${String(batches).padStart(2, "0")}.json`), JSON.stringify(pool.slice(i, i + size), null, 1) + "\n");
  }
  console.log(JSON.stringify({ pooled: pool.length, dropped_low: droppedLow, duplicates, malformed, invalid, batches, triage_dir: triage }));
  return 0;
}

const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();

function cmdSurvivors(flags) {
  const dir = resolve(flags.dir);
  const ideas = new Map(buildPool(ideaFiles(join(dir, "ideas")), { keepLow: true }).pool.map((o) => [o.id, o]));
  const latest = new Map();
  for (const file of ideaFiles(join(dir, "triage"))) {
    for (const row of parseJsonl(readFileSync(file, "utf8")).rows) if (row?.id && row.verdict) latest.set(row.id, row);
  }
  const rows = [...latest.values()];
  const counts = { clear: 0, near: 0, kill: 0 };
  for (const r of rows) if (r.verdict in counts) counts[r.verdict]++;
  const ranked = rankTriage(rows);
  const lines = [
    "# Triage survivors",
    "",
    "Novelty values are triage predictions only, never judge scores. Kills are omitted.",
    "",
    "| Rank | Idea | Title | Verdict | Predicted novelty | Closest prior art | Residual |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...ranked.map((r, i) => {
      const c = r.closest?.[0];
      const closest = c ? `[${cell(c.title)}](${c.url})` : "";
      return `| ${i + 1} | ${cell(r.id)} | ${cell(ideas.get(r.id)?.title ?? r.title)} | ${r.verdict} | ${r.novelty_pred ?? ""} | ${closest} | ${cell(r.residual)} |`;
    }),
    "",
  ];
  writeFileSync(join(dir, "triage", "survivors.md"), lines.join("\n"));
  console.log(JSON.stringify({ counts, survivors: ranked.map((r) => r.id), table: join(dir, "triage", "survivors.md") }));
  return 0;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 research-evaluator" }, signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function cmdGaps(flags, feeds) {
  if (!flags.out || !feeds.length) { console.error("usage: pipeline.mjs gaps --out <file.jsonl> <feed-url>..."); return 2; }
  const maxPosts = Number(flags["max-posts"]) || 50;
  const rows = [];
  const failures = [];
  for (const feed of feeds) {
    let posts = [];
    try { posts = parseFeed(await fetchText(feed)).slice(0, maxPosts); } catch (err) { failures.push({ url: feed, error: err.message }); continue; }
    for (const post of posts) {
      try {
        for (const sentence of gapCandidates(htmlToText(await fetchText(post.url)))) {
          rows.push({ source_feed: feed, post_title: post.title, url: post.url, date: post.date, sentence, verified: false });
        }
      } catch (err) { failures.push({ url: post.url, error: err.message }); }
    }
  }
  writeFileSync(resolve(flags.out), rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
  console.log(JSON.stringify({ candidates: rows.length, posts_failed: failures.length, failures, out: resolve(flags.out) }));
  return 0;
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const { flags, rest: positional } = args(rest);
  if (cmd === "check" && positional.length) return cmdCheck(positional);
  if (cmd === "pool" && flags.dir) return cmdPool(flags);
  if (cmd === "survivors" && flags.dir) return cmdSurvivors(flags);
  if (cmd === "gaps") return cmdGaps(flags, positional);
  console.error("usage: pipeline.mjs check <file.jsonl>... | pool --dir <loop> [--batch N] [--keep-low] | survivors --dir <loop> | gaps --out <file> [--max-posts N] <feed-url>...");
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
