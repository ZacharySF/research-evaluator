import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { parseJsonl, checkIdeas, parseFeed, gapCandidates, rankTriage } from "../pipeline.mjs";

const cli = fileURLToPath(new URL("../pipeline.mjs", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
const idea = (id, extra = {}) => ({ id, title: `Idea ${id}`, creative_step: `step ${id}`, mechanism: "m", ...extra });

function tempLoop(t) {
  const dir = mkdtempSync(join(tmpdir(), "pipeline-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "ideas"));
  return dir;
}

test("parseJsonl keeps valid rows and reports malformed lines by line number", () => {
  const { rows, errors } = parseJsonl('{"id":"A-01"}\n\nnot json\n{"id":"A-02"}\n');
  assert.deepEqual(rows.map((r) => r.id), ["A-01", "A-02"]);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 3);
});

test("checkIdeas flags missing required fields and duplicate ids", () => {
  const report = checkIdeas([idea("A-01"), { id: "A-02", title: "no step" }, idea("A-01")]);
  assert.equal(report.valid, 1);
  assert.deepEqual(report.invalid, [{ id: "A-02", missing: ["creative_step"] }]);
  assert.deepEqual(report.duplicates, ["A-01"]);
});

test("check exits non-zero when an idea file has schema errors", (t) => {
  const dir = tempLoop(t);
  const good = join(dir, "ideas", "good.jsonl");
  const bad = join(dir, "ideas", "bad.jsonl");
  writeFileSync(good, [idea("G-01"), idea("G-02")].map((o) => JSON.stringify(o)).join("\n") + "\n");
  writeFileSync(bad, JSON.stringify({ id: "B-01" }) + "\nnot json\n");
  assert.equal(run("check", good).status, 0);
  const res = run("check", bad);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /B-01/);
});

test("pool merges idea files, drops duplicates and self-rated low ideas, and writes triage batches", (t) => {
  const dir = tempLoop(t);
  writeFileSync(join(dir, "ideas", "lens-a.jsonl"),
    [idea("A-01"), idea("A-02", { self_novelty: "low" }), idea("A-03")].map((o) => JSON.stringify(o)).join("\n") + "\nbroken\n");
  writeFileSync(join(dir, "ideas", "lens-b.jsonl"),
    [idea("A-01", { title: "duplicate id" }), idea("B-01"), idea("B-02")].map((o) => JSON.stringify(o)).join("\n") + "\n");
  writeFileSync(join(dir, "ideas", "notes.md"), "not an idea file");

  const res = run("pool", "--dir", dir, "--batch", "2");
  assert.equal(res.status, 0, res.stderr);
  const summary = JSON.parse(res.stdout);
  assert.equal(summary.pooled, 4);
  assert.equal(summary.dropped_low, 1);
  assert.equal(summary.duplicates, 1);
  assert.equal(summary.malformed, 1);
  assert.equal(summary.batches, 2);
  const batches = readdirSync(join(dir, "triage")).filter((f) => f.startsWith("batch-")).sort();
  assert.deepEqual(batches, ["batch-01.json", "batch-02.json"]);
  const ids = batches.flatMap((f) => JSON.parse(readFileSync(join(dir, "triage", f), "utf8")).map((o) => o.id));
  assert.deepEqual(ids.sort(), ["A-01", "A-03", "B-01", "B-02"]);

  const keep = JSON.parse(run("pool", "--dir", dir, "--keep-low").stdout);
  assert.equal(keep.pooled, 5);
});

test("rankTriage puts clear before near, drops kills and orders by predicted novelty", () => {
  const ranked = rankTriage([
    { id: "K", verdict: "kill", novelty_pred: 99 },
    { id: "N1", verdict: "near", novelty_pred: 85 },
    { id: "C1", verdict: "clear", novelty_pred: 70 },
    { id: "N2", verdict: "near", novelty_pred: 90 },
  ]);
  assert.deepEqual(ranked.map((r) => r.id), ["C1", "N2", "N1"]);
});

test("survivors joins triage rows to ideas, keeps the latest row per idea, and writes a review table", (t) => {
  const dir = tempLoop(t);
  writeFileSync(join(dir, "ideas", "lens.jsonl"), [idea("A-01"), idea("A-02"), idea("A-03")].map((o) => JSON.stringify(o)).join("\n") + "\n");
  mkdirSync(join(dir, "triage"));
  writeFileSync(join(dir, "triage", "deep.jsonl"), [
    { id: "A-01", verdict: "clear", novelty_pred: 70, residual: "r1", closest: [{ title: "Close work", url: "https://example.org/1" }] },
    { id: "A-02", verdict: "kill", novelty_pred: 60, residual: "", closest: [] },
    { id: "A-03", verdict: "kill", novelty_pred: 50, residual: "", closest: [] },
    { id: "A-03", verdict: "near", novelty_pred: 80, residual: "r3", closest: [] },
  ].map((o) => JSON.stringify(o)).join("\n") + "\n");

  const res = run("survivors", "--dir", dir);
  assert.equal(res.status, 0, res.stderr);
  const summary = JSON.parse(res.stdout);
  assert.deepEqual(summary.counts, { clear: 1, near: 1, kill: 1 });
  assert.deepEqual(summary.survivors, ["A-01", "A-03"]);
  const table = readFileSync(join(dir, "triage", "survivors.md"), "utf8");
  assert.match(table, /A-01.*Idea A-01.*clear.*70.*Close work/);
  assert.match(table, /predictions only/i);
});

test("parseFeed reads RSS items and Atom entries", () => {
  const rss = `<rss><channel><item><title><![CDATA[Post &amp; one]]></title><link>https://e.org/1</link><pubDate>Thu, 19 Nov 2026</pubDate></item></channel></rss>`;
  const atom = `<feed><entry><title>Two</title><link rel='alternate' href='https://e.org/2'/><published>2026-11-18</published></entry></feed>`;
  assert.deepEqual(parseFeed(rss), [{ title: "Post & one", url: "https://e.org/1", date: "Thu, 19 Nov 2026" }]);
  assert.deepEqual(parseFeed(atom), [{ title: "Two", url: "https://e.org/2", date: "2026-11-18" }]);
});

test("gapCandidates keeps sentences that state limitations or future work", () => {
  const text = "We built a fast system. Future work will extend it to rural areas. " +
    "The model still struggles with rare events in cold climates. Thanks for reading.";
  assert.deepEqual(gapCandidates(text), [
    "Future work will extend it to rural areas.",
    "The model still struggles with rare events in cold climates.",
  ]);
});

test("gaps fetches feeds and posts and writes unverified candidate statements", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "pipeline-gaps-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const server = createServer((req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    if (req.url === "/feed") {
      res.end(`<rss><channel><item><title>Post</title><link>${base}/post</link><pubDate>Nov 2026</pubDate></item>` +
        `<item><title>Empty</title><link>${base}/empty</link></item></channel></rss>`);
    } else if (req.url === "/post") {
      res.end("<html><body><p>By A. Author.</p><p>An important limitation remains: the sensor saturates outdoors.</p></body></html>");
    } else {
      res.end("<html><body><p>Nothing to see here at all today.</p></body></html>");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  const out = join(dir, "gaps.jsonl");
  const feed = `http://127.0.0.1:${server.address().port}/feed`;
  const res = await new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, "gaps", "--out", out, feed]);
    let stdout = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.on("close", (status) => resolve({ status, stdout }));
  });
  assert.equal(res.status, 0);
  assert.equal(JSON.parse(res.stdout).candidates, 1);
  assert.ok(existsSync(out));
  const [row] = parseJsonl(readFileSync(out, "utf8")).rows;
  assert.equal(row.post_title, "Post");
  assert.equal(row.sentence, "An important limitation remains: the sensor saturates outdoors.");
  assert.equal(row.verified, false);
});
