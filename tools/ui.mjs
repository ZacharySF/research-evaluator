#!/usr/bin/env node
// Optional visual companion for the research-evaluator skill: a browser setup page for the review
// thresholds and constraints, and a static report of saved reviews. Node.js 18+, no dependencies.
//   node tools/ui.mjs setup  --dir <loop-dir> [--goal "..."] [--audience "..."] [--no-open]
//   node tools/ui.mjs wait   --dir <loop-dir> [--timeout <seconds>]
//   node tools/ui.mjs report --dir <loop-dir> [--no-open]
// `setup` starts the page in the background and returns its URL at once; `wait` blocks until the
// user presses Save or Cancel (exit 0 saved, 2 cancelled/expired, 3 wait timeout).
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeSetup, renderReport, loadLoop, GATES, ZONES, BASE_CSS } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = ".review-setup-state.json";

const writeState = (dir, state) => writeFileSync(join(dir, STATE_FILE), JSON.stringify(state, null, 2) + "\n");
const readState = (dir) => {
  try { return JSON.parse(readFileSync(join(dir, STATE_FILE), "utf8")); } catch { return null; }
};

/** Serves the setup page until the user saves or cancels, or it sits idle too long. */
export function startSetupServer({ dir, port = 0, idleMinutes = 30, prefill = {} }) {
  dir = resolve(dir);
  mkdirSync(dir, { recursive: true });
  const setupPath = join(dir, "review-setup.json");
  let existing = null;
  if (existsSync(setupPath)) {
    try { existing = normalizeSetup(JSON.parse(readFileSync(setupPath, "utf8"))); } catch { existing = null; }
  }
  const page = readFileSync(join(HERE, "setup.html"), "utf8").replace("/*BASE_CSS*/", BASE_CSS);

  let finish;
  const done = new Promise((r) => (finish = r));
  let url = "";
  let idle;
  const end = (status, extra = {}) => {
    clearTimeout(idle);
    const result = { status, url, pid: process.pid, dir, ...extra, at: new Date().toISOString() };
    writeState(dir, result);
    server.close();
    server.closeAllConnections();
    finish(result);
  };
  const touch = () => {
    clearTimeout(idle);
    idle = setTimeout(() => end("expired"), idleMinutes * 60_000);
    idle.unref?.();
  };

  const send = (res, code, body, type = "application/json") => {
    res.writeHead(code, { "content-type": type, "cache-control": "no-store", connection: "close" });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
  };
  const readJson = (req) => new Promise((ok, fail) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > 1_000_000) { fail(new Error("request too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { fail(new Error("invalid JSON")); } });
    req.on("error", fail);
  });

  const server = createServer(async (req, res) => {
    touch();
    const path = new URL(req.url, "http://x").pathname;
    if (req.method === "GET" && path === "/") return send(res, 200, page, "text/html; charset=utf-8");
    if (req.method === "GET" && path === "/api/init") {
      return send(res, 200, { setup: existing, prefill, gates: GATES, zones: ZONES, dir });
    }
    if (req.method === "POST" && (path === "/api/save" || path === "/api/cancel")) {
      // JSON-only POSTs force a CORS preflight, so other websites cannot drive this page.
      if (!String(req.headers["content-type"]).startsWith("application/json")) return send(res, 415, { error: "JSON only" });
      let body;
      try { body = await readJson(req); } catch (err) { return send(res, 400, { error: err.message }); }
      if (path === "/api/cancel") {
        send(res, 200, { ok: true });
        return res.on("finish", () => end("cancelled"));
      }
      let setup;
      try { setup = normalizeSetup(body); } catch (err) { return send(res, 400, { error: err.message }); }
      writeFileSync(setupPath, JSON.stringify(setup, null, 2) + "\n");
      send(res, 200, { ok: true, setup: setupPath });
      return res.on("finish", () => end("saved", { setup: setupPath }));
    }
    send(res, 404, { error: "not found" });
  });

  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => {
      url = `http://127.0.0.1:${server.address().port}`;
      writeState(dir, { status: "open", url, pid: process.pid, dir, at: new Date().toISOString() });
      touch();
      ok({ url, server, done });
    });
  });
}

function openInBrowser(target) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [target]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", target]]
    : ["xdg-open", [target]];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.on("error", () => process.stderr.write(`could not open a browser; open ${target} yourself\n`));
    child.unref();
  } catch {
    process.stderr.write(`could not open a browser; open ${target} yourself\n`);
  }
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const key = a.slice(2);
    if (key.startsWith("no-")) { out[key.slice(3)] = false; continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const die = (msg, code = 1) => { process.stderr.write(msg + "\n"); process.exit(code); };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || args.help) die("usage: node ui.mjs setup|wait|report --dir <loop-dir> [options]", cmd ? 0 : 1);
  if (typeof args.dir !== "string") die("--dir <loop-dir> is required");
  const dir = resolve(args.dir);
  const prefill = Object.fromEntries(["goal", "audience"].filter((k) => typeof args[k] === "string").map((k) => [k, args[k]]));

  if (cmd === "serve") {
    const { url, done } = await startSetupServer({ dir, port: Number(args.port ?? 0), idleMinutes: Number(args["idle-minutes"] ?? 30), prefill });
    process.stdout.write(JSON.stringify({ ready: true, url }) + "\n");
    const result = await done;
    process.stdout.write(JSON.stringify(result) + "\n");
    return;
  }

  if (cmd === "setup") {
    mkdirSync(dir, { recursive: true });
    const prior = readState(dir);
    if (prior?.status === "open" && prior.pid) {
      try { process.kill(prior.pid, 0); process.stdout.write(JSON.stringify({ url: prior.url, dir, already: true }) + "\n"); return; } catch { /* stale */ }
    }
    const log = openSync(join(dir, ".review-setup.log"), "a");
    const childArgs = [fileURLToPath(import.meta.url), "serve", "--dir", dir];
    for (const k of ["port", "idle-minutes", "goal", "audience"]) if (typeof args[k] === "string") childArgs.push(`--${k}`, args[k]);
    writeState(dir, { status: "starting", dir, at: new Date().toISOString() });
    spawn(process.execPath, childArgs, { detached: true, stdio: ["ignore", log, log] }).unref();
    for (let i = 0; i < 50; i++) {
      const s = readState(dir);
      if (s?.status === "open") {
        if (args.open !== false) openInBrowser(s.url);
        process.stdout.write(JSON.stringify({ url: s.url, dir }) + "\n");
        return;
      }
      await sleep(100);
    }
    die(`setup page did not start; see ${join(dir, ".review-setup.log")}`);
  }

  if (cmd === "wait") {
    const deadline = args.timeout ? Date.now() + Number(args.timeout) * 1000 : Infinity;
    for (;;) {
      const s = readState(dir);
      if (s && s.status !== "open" && s.status !== "starting") {
        process.stdout.write(JSON.stringify(s) + "\n");
        process.exit(s.status === "saved" ? 0 : 2);
      }
      if (s?.status === "open" && s.pid) {
        try { process.kill(s.pid, 0); } catch { die(JSON.stringify({ status: "server-gone", dir }), 2); }
      }
      if (Date.now() > deadline) die(JSON.stringify({ status: "waiting", url: s?.url, dir }), 3);
      await sleep(500);
    }
  }

  if (cmd === "report") {
    let loop;
    try { loop = loadLoop(dir); } catch (err) { die(err.message); }
    const out = join(dir, "report.html");
    writeFileSync(out, renderReport(loop.setup, loop.rounds));
    if (args.open !== false) openInBrowser(pathToFileURL(out).href);
    process.stdout.write(JSON.stringify({ report: out, rounds: loop.rounds.length }) + "\n");
    return;
  }

  die(`unknown command: ${cmd}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => die(err.stack || String(err)));
}
