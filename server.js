import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/model.js': ['model.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
const server = http.createServer(async (req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to load app'); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Next Step listening on port ${server.address().port}`));
