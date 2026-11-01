// Read-only loopback viewer. The research process publishes atlas-data.json and angle-map.md;
// this server never runs research or writes to those files.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { renderAtlas, checkAngleMap, CSS } from "./atlas.mjs";

const client = `
const toggle = document.querySelector('#live-toggle');
const status = document.querySelector('#live-status');
let timer, controller, version;
async function refresh() {
  controller = new AbortController();
  const current = controller;
  try {
    const response = await fetch('/api/atlas', {
      cache: 'no-store', signal: current.signal,
      headers: version ? { 'If-None-Match': version } : {}
    });
    if (!response.ok && response.status !== 304) throw new Error('Snapshot not ready');
    if (response.status !== 304) {
      const html = await response.text();
      if (!toggle.checked) return;
      const next = new DOMParser().parseFromString(html, 'text/html');
      const content = next.querySelector('main');
      if (!content) throw new Error('Missing map');
      const x = scrollX, y = scrollY;
      const openDetails = [...document.querySelectorAll('#atlas-content details')].map(el => el.open);
      document.querySelector('#atlas-content').replaceChildren(content);
      document.querySelectorAll('#atlas-content details').forEach((el, i) => { if (i < openDetails.length) el.open = openDetails[i]; });
      document.title = next.title;
      scrollTo(x, y);
      version = response.headers.get('etag');
    }
    if (toggle.checked) status.textContent = 'Live · checked ' + new Date().toLocaleTimeString() + ' · published research checkpoints only';
  } catch (error) {
    if (!current.signal.aborted) status.textContent = 'Waiting for a valid map or connection — showing the last snapshot';
  } finally {
    if (toggle.checked && !current.signal.aborted) timer = setTimeout(refresh, 2000);
  }
}
function sync() {
  clearTimeout(timer);
  controller?.abort();
  if (toggle.checked) refresh();
  else status.textContent = 'Paused — showing the last snapshot';
}
toggle.addEventListener('change', sync);
// Browsers can restore a checked box on reload or back/forward navigation.
addEventListener('pageshow', () => { if (toggle.checked) sync(); });
addEventListener('pagehide', () => { clearTimeout(timer); controller?.abort(); });
`;

function snapshot(dir) {
  const data = JSON.parse(readFileSync(join(dir, "atlas-data.json"), "utf8"));
  const coverage = checkAngleMap(data.angles, readFileSync(join(dir, "angle-map.md"), "utf8"));
  if (coverage.missing.length || coverage.stale.length) throw new Error("Angle map coverage is incomplete");
  return renderAtlas(data);
}

const waiting = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
  + `<meta name="color-scheme" content="light dark"><title>Waiting for research</title><style>${CSS}</style></head><body><main>`
  + `<h1>Waiting for the first valid research checkpoint</h1><p class="lead">Turn on live updates to show the map as soon as the research publishes <code>atlas-data.json</code> with a matching <code>angle-map.md</code>.</p>`
  + `</main></body></html>\n`;

export function startAtlasServer({ dir, port = 0 }) {
  const server = createServer((req, res) => {
    const send = (code, body, type = "text/plain; charset=utf-8", headers = {}) => {
      res.writeHead(code, { "content-type": type, "cache-control": "no-store", ...headers });
      res.end(body);
    };
    if (req.method !== "GET") return send(405, "Read-only viewer");
    if (req.url !== "/" && req.url !== "/api/atlas") return send(404, "Not found");
    let html;
    try { html = snapshot(dir); } catch {
      if (req.url === "/api/atlas") return send(503, "Waiting for a valid atlas-data.json and matching angle-map.md");
      html = waiting;
    }
    if (req.url === "/api/atlas") {
      const etag = '"' + createHash("sha256").update(html).digest("hex") + '"';
      return req.headers["if-none-match"] === etag
        ? send(304, "", "text/html; charset=utf-8", { etag })
        : send(200, html, "text/html; charset=utf-8", { etag });
    }
    const controls = `<header style="position:sticky;top:0;z-index:2;padding:12px 18px;background:var(--card);border-bottom:1px solid var(--line)"><label><input type="checkbox" id="live-toggle" autocomplete="off"> Live map updates</label> <span id="live-status" role="status">Paused — enable to follow published research checkpoints</span></header>`;
    send(200, html.replace("<body><main>", `<body>${controls}<div id="atlas-content"><main>`)
      .replace("</main></body>", `</main></div><script>${client}</script></body>`), "text/html; charset=utf-8");
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}
