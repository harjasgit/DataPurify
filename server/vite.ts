// vite.ts (backend)
import express, { type Express } from "express";
import { createServer } from "vite";  // ✅ FIXED
import { type Server } from "http";
import fs from "fs";
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

// Dev only: Vite middleware
export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === "production") return; // skip in prod

  const vite = await createServer({   // ✅ FIXED
    root: path.resolve(__dirname, "../client"), // path to frontend
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const indexPath = path.resolve(__dirname, "../client/index.html");
      let template = await fs.promises.readFile(indexPath, "utf-8");

      // Cache-busting in dev
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`

      );

      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

// Production: Serve frontend build
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../client/dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find frontend build at: ${distPath}`);
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
