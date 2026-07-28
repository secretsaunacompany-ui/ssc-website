/**
 * Zero-dependency static file server for a built `dist/` directory.
 *
 * Deliberately dependency-free: adding a server package to gate a stylesheet
 * migration would be more supply-chain surface than the job needs. Node's
 * http + fs already does everything required here.
 *
 * Serves Eleventy's pretty URLs: `/about/` -> `dist/about/index.html`.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.mp4': 'video/mp4',
};

function resolveFile(root, urlPath) {
  // Strip query/hash, decode, and refuse traversal.
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const joined = path.join(root, clean);
  const resolved = path.resolve(joined);
  if (!resolved.startsWith(path.resolve(root))) return null;

  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    const index = path.join(resolved, 'index.html');
    return fs.existsSync(index) ? index : null;
  }
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;

  // Extensionless request: try `/foo` -> `/foo/index.html` then `/foo.html`.
  const asDirIndex = path.join(resolved, 'index.html');
  if (fs.existsSync(asDirIndex)) return asDirIndex;
  const asHtml = `${resolved}.html`;
  if (fs.existsSync(asHtml)) return asHtml;

  return null;
}

/** Start a static server over `root`. Resolves to { url, close() }. */
export function startServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const file = resolveFile(root, req.url || '/');
      if (!file) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });

    server.on('error', reject);
    // Port 0 = let the OS pick a free port, so two runs never collide.
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
