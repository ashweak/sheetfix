// Minimal static server that mounts docs/ at /sheetfix/ to mimic the GitHub Pages project path.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../docs/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.csv': 'text/csv; charset=utf-8', '.md': 'text/markdown' };

export function startServer(port = 0) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/sheetfix/')) {
      res.writeHead(302, { Location: '/sheetfix/' }).end();
      return;
    }
    let rel = normalize(decodeURIComponent(url.pathname.slice('/sheetfix/'.length)));
    if (rel.startsWith('..')) return res.writeHead(400).end();
    let file = join(root, rel);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await startServer(Number(process.env.PORT) || 8080);
  console.log(`SheetFix at http://127.0.0.1:${s.address().port}/sheetfix/`);
}
