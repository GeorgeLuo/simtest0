import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const HOST = "127.0.0.1";
const PORT = 3001;
const SIM_STREAM_URL = "http://127.0.0.1:3000/simulation/stream";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "Invalid request" });
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host ?? HOST}`);

  if (req.method === "GET" && pathname === "/stream") {
    proxySimulationStream(req, res).catch((error) => {
      sendSseError(res, error);
    });
    return;
  }

  if (req.method === "GET") {
    await serveStaticAsset(pathname, res);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}).listen(PORT, HOST, () => {
  console.log(`Visualizer listening at http://${HOST}:${PORT}`);
});

async function serveStaticAsset(urlPath, res) {
  const relativePath = urlPath === "/" ? "/index.html" : urlPath;
  const absolutePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  try {
    const content = await readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
    });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function proxySimulationStream(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`: visualizer connected ${new Date().toISOString()}

`);

  const controller = new AbortController();
  const close = () => {
    controller.abort();
    res.end();
  };

  req.on("close", close);
  req.on("error", close);

  try {
    const upstream = await fetch(SIM_STREAM_URL, {
      headers: { Accept: "text/event-stream" },
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      throw new Error(`Simulation stream responded with ${upstream.status}`);
    }

    const readable = Readable.fromWeb(upstream.body);
    readable.on("data", (chunk) => res.write(chunk));
    readable.on("error", (error) => {
      sendSseError(res, error);
      close();
    });
    readable.on("end", () => close());
  } catch (error) {
    sendSseError(res, error);
    close();
  }
}

function sendJson(res, status, body) {
  if (res.headersSent) {
    return;
  }

  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendSseError(res, error) {
  const message = error instanceof Error ? error.message : String(error);
  res.write(`event: error
data: ${JSON.stringify({ message })}

`);
}
