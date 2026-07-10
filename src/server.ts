import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(HERE, "..", "dist");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

export function createApp(distDir: string = DIST_DIR): Hono {
  const app = new Hono();

  app.get("/*", async (c) => {
    let path = decodeURIComponent(new URL(c.req.url).pathname);
    if (path === "/" || path === "") path = "/article.html";

    const target = resolve(distDir, "." + normalize(path));
    if (target !== distDir && !target.startsWith(distDir + sep)) {
      return c.text("forbidden", 403);
    }

    try {
      const info = await stat(target);
      if (!info.isFile()) return c.text("not found", 404);
      const body = await readFile(target);
      const type = CONTENT_TYPES[extname(target)] ?? "application/octet-stream";
      return new Response(body, { headers: { "content-type": type } });
    } catch {
      return c.text("not found", 404);
    }
  });

  return app;
}

function toNodeListener(app: Hono) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const host = req.headers.host ?? "localhost";
    const url = `http://${host}${req.url ?? "/"}`;
    const request = new Request(url, { method: req.method ?? "GET" });
    const response = await app.fetch(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  };
}

function main(): void {
  const port = Number(process.env.PORT ?? "8080");
  const app = createApp();
  const server = createServer(toNodeListener(app));
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    process.stdout.write(`Eight Agents, One Ticket -- static preview server\n`);
    process.stdout.write(`serving ${DIST_DIR}\n`);
    process.stdout.write(`serving article at ${url}\n`);
    process.stdout.write(`press Ctrl+C to stop\n`);
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main();
}
