'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3006);

const staticPages = new Set([
  'index.html',
  'embed.html',
  'xqvwmk521g.html',
  'vis-character.html',
]);
const indexFile = path.join(__dirname, 'index.html');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

// Perchance generator names are the full slug as listed (e.g.
// "https---perchance-org-player-metal"). Both perchance.org/<slug> and
// null.perchance.org/<slug> resolve to the same generator — do NOT strip the
// "https---perchance-org-" prefix, or the URL 404s.
function cleanSlug(slug) {
  return String(slug || '').trim();
}

function embedPage(filename) {
  const slug = cleanSlug(filename);
  const safe = escapeHtml(slug);
  const source = `https://null.perchance.org/${safe}`;
  const title = `VISTAMATIONS · ${safe}`;
  const editor = `https://perchance.org/${safe}#edit`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b1115"><title>${title}</title>
<style>:root{color-scheme:dark;font:14px/1.5 "Segoe UI",Arial,sans-serif;background:#0b1115;color:#edf2ec;--lime:#c9ff63;--gold:#f4b84a}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0}.page{height:100%;display:flex;flex-direction:column;overflow:hidden;background:#0b1115}.bar{min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.55rem 1rem;background:linear-gradient(110deg,#162127,#11191e 68%,#1e2820);border-bottom:1px solid #40504b}.brand{color:var(--lime);font-size:.68rem;font-weight:800;letter-spacing:.16em}.name{margin-left:.7rem;color:#edf2ec;font-size:.95rem;letter-spacing:0;overflow-wrap:anywhere}.links{display:flex;align-items:center;gap:.8rem;white-space:nowrap}.links a{font-size:.78rem;font-weight:700;text-decoration:none}.links a:hover{text-decoration:underline}.back{color:var(--gold)}.edit{color:var(--lime)}iframe{display:block;flex:1;width:100%;min-height:0;border:0;background:#10171b}.fail{display:none;flex:1;align-items:center;justify-content:center;padding:2rem;color:#a5b4b0;text-align:center}.fail.show{display:flex}.fail a{color:var(--lime)}@media(max-width:520px){.bar{min-height:44px;padding:.45rem .65rem;font-size:.78rem}.name{display:block;margin:.1rem 0 0}}</style>
</head>
<body><div class="page"><header class="bar"><div><span class="brand">VISTAMATIONS</span><span class="name">${safe}</span></div><div class="links"><a class="edit" href="${editor}" target="_blank" rel="noopener noreferrer">Edit ↗</a><a class="back" href="/">← Portfolio</a></div></header>
<iframe id="frame" src="${source}" title="${safe} Perchance generator" referrerpolicy="no-referrer" allow="clipboard-read; clipboard-write; fullscreen" allowfullscreen></iframe>
<div class="fail" id="fail"><div><p>The generator did not load. It may be private, renamed, or deleted.</p><p><a href="${source}" target="_blank" rel="noopener noreferrer">Open ${safe} directly on Perchance ↗</a></p></div></div>
</div>
<script>
// Surface a clear message if the embed never loads (private/renamed generator),
// instead of leaving a blank pane. Cross-origin means we can only detect a timeout.
(function () {
  var frame = document.getElementById('frame');
  var fail = document.getElementById('fail');
  var done = false;
  function loaded() { done = true; }
  frame.addEventListener('load', loaded);
  frame.addEventListener('error', function () { if (!done) fail.classList.add('show'); });
  setTimeout(function () { if (!done) fail.classList.add('show'); }, 12000);
})();
</script>
</body></html>`;
}

function sendHtml(response, content, method) {
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
  });
  response.end(method === 'HEAD' ? undefined : content);
}

const server = http.createServer((request, response) => {
  const urlPath = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;

  if (urlPath === '/healthz') {
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('ok');
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end();
    return;
  }

  if (urlPath === '/' || urlPath === '/index.html') {
    fs.readFile(indexFile, (error, content) => {
      if (error) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Unable to read the portfolio page.');
        return;
      }
      sendHtml(response, content, request.method);
    });
    return;
  }

  const match = /^\/embed\/([a-z0-9-]{1,100})$/.exec(urlPath);
  if (match) {
    sendHtml(response, embedPage(match[1]), request.method);
    return;
  }

  const staticMatch = /^\/([a-z0-9-]+\.html)$/.exec(urlPath);
  if (staticMatch && staticPages.has(staticMatch[1])) {
    const filePath = path.join(__dirname, staticMatch[1]);
    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Unable to read the requested page.');
        return;
      }
      sendHtml(response, content, request.method);
    });
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

server.listen(port, host, () =>
  console.log(`VISTAMATIONS Perchance portfolio available on port ${port}`)
);
