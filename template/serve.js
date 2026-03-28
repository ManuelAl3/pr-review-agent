#!/usr/bin/env node
/**
 * PR Review Preview — Local dev server
 * Zero dependencies. Uses only Node.js built-ins.
 *
 * Usage:  node .claude/pr-review/serve.js [port]
 * Default port: 3847
 *
 * Serves the HTML + JSON files and exposes a write API
 * so the browser can persist changes directly to disk.
 *
 * API:
 *   PUT /api/save/findings  — writes findings.json
 *   PUT /api/save/config    — writes config.json
 *   GET /api/health         — { ok: true, writable: true }
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PORT = parseInt(process.argv[2]) || 3847;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  cors(res);

  // CORS preflight
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ===== API Routes =====
  if (url.pathname === '/api/health') {
    return jsonResponse(res, 200, { ok: true, writable: true, dir: DIR });
  }

  if (url.pathname === '/api/save/findings' && req.method === 'PUT') {
    try {
      const body = await readBody(req);
      JSON.parse(body); // validate JSON
      fs.writeFileSync(path.join(DIR, 'findings.json'), body, 'utf-8');
      return jsonResponse(res, 200, { ok: true, file: 'findings.json' });
    } catch (e) {
      return jsonResponse(res, 400, { ok: false, error: e.message });
    }
  }

  if (url.pathname === '/api/save/config' && req.method === 'PUT') {
    try {
      const body = await readBody(req);
      JSON.parse(body); // validate JSON
      fs.writeFileSync(path.join(DIR, 'config.json'), body, 'utf-8');
      return jsonResponse(res, 200, { ok: true, file: 'config.json' });
    } catch (e) {
      return jsonResponse(res, 400, { ok: false, error: e.message });
    }
  }

  // ===== Static file serving =====
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(DIR, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`  \x1b[31m\x1b[1mPort ${PORT} is already in use.\x1b[0m`);
    console.error('');
    console.error('  Options:');
    console.error(`    1. Use a different port:  node serve.js ${PORT + 1}`);
    console.error(`    2. Kill the old process:  npx kill-port ${PORT}`);
    console.error('');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  \x1b[35m\x1b[1mPR Review Preview\x1b[0m');
  console.log('');
  console.log(`  \x1b[2mLocal:\x1b[0m   ${url}`);
  console.log(`  \x1b[2mDir:\x1b[0m     ${DIR}`);
  console.log(`  \x1b[2mAPI:\x1b[0m     PUT ${url}/api/save/findings`);
  console.log(`  \x1b[2m         PUT ${url}/api/save/config\x1b[0m`);
  console.log('');
  console.log('  \x1b[2mEdits in the browser save directly to disk.\x1b[0m');
  console.log('  \x1b[2mPress Ctrl+C to stop.\x1b[0m');
  console.log('');
});
