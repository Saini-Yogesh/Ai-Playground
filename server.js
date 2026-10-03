import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const DEBATES_DIR = path.join(ROOT, "data", "debates");
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
};

async function handler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // GET /api/debates  →  list all debate JSON files as metadata array
  if (req.method === "GET" && pathname === "/api/debates") {
    try {
      const files = (await fs.readdir(DEBATES_DIR)).filter(f => f.endsWith(".json") && f !== ".gitkeep");
      const debates = (
        await Promise.all(
          files.map(async (file) => {
            try {
              const raw = await fs.readFile(path.join(DEBATES_DIR, file), "utf-8");
              const d = JSON.parse(raw);
              return {
                id: d.id,
                filename: path.basename(file, '.json'),
                topic: d.topic,
                status: d.status,
                turn: d.turn,
                maxTurns: d.maxTurns,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
              };
            } catch { return null; }
          })
        )
      )
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.writeHead(200, { "Content-Type": MIME[".json"], "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(debates));
      return;
    } catch (err) {
      res.writeHead(500, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // GET /api/debates/:id  →  return full debate JSON
  const debateMatch = pathname.match(/^\/api\/debates\/([^/]+)$/);
  if (req.method === "GET" && debateMatch) {
    const id = path.basename(debateMatch[1]);
    const filePath = path.join(DEBATES_DIR, `${id}.json`);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      res.writeHead(200, { "Content-Type": MIME[".json"], "Access-Control-Allow-Origin": "*" });
      res.end(raw);
      return;
    } catch {
      res.writeHead(404, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ error: `Debate '${id}' not found.` }));
      return;
    }
  }

  // GET /  →  serve index.html
  if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
    try {
      const html = await fs.readFile(path.join(ROOT, "index.html"), "utf-8");
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(html);
      return;
    } catch {
      res.writeHead(500);
      res.end("Failed to load index.html");
      return;
    }
  }

  res.writeHead(404);
  res.end("Not found");
}

const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(`\n🌐 Debate Viewer running at: http://localhost:${PORT}\n`);
});
