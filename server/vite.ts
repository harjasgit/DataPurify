// vite.ts (backend only)
import express, { type Express } from "express";
import { createServer } from "vite";  // ✅ FIXED: keep only for local dev
import { type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${time} [${source}] ${message}`);
}

// Development: attach Vite middleware (only runs locally)
export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === "production") return; // ✅ FIXED: disable vite in production

  const vite = await createServer({
    root: path.resolve(__dirname, "../../client"), // ✅ FIXED: corrected client path
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;

      // ✅ FIXED: removed hardcoded index.html read, inject dynamic script instead
      let template = `<!DOCTYPE html>
        <html>
          <head><title>Dev</title></head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx?v=${nanoid()}"></script>
          </body>
        </html>`;

      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

// Production: do nothing (APIs only)
export function serveStatic(_app: Express) {
  // ✅ FIXED: removed client/dist serving, since only server is deployed
}
