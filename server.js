import http from 'node:http';
import { discover } from './discovery.js';
import { readFile } from 'node:fs/promises';
const files = { '/discovery.js': ['discovery.js', 'text/javascript'], '/discovery-model.js': ['discovery-model.js', 'text/javascript'], '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/model.js': ['model.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/jobs' && req.method === 'GET') {
    try {
      const data = await discover();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Job sources could not be reached. Please try again later or use the tailored search links.' }));
    }
    return;
  }
  const file = files[pathname];
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to load app'); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Next Step listening on port ${server.address().port}`));
