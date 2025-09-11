import "dotenv/config"; // Load environment variables first
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import cors from "cors";

const startServer = async () => {
  const app = express();

  // -------------------- CORS --------------------
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type"],
    })
  );

  // -------------------- Body parsers --------------------
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // -------------------- Logging middleware --------------------
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined;

    const originalResJson = res.json.bind(res);
    res.json = function (bodyJson: any) {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
        log(logLine);
      }
    });

    next();
  });

  // -------------------- Register routes --------------------
  const server = await registerRoutes(app);

  // -------------------- Global error handler --------------------
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("API Error:", err);
    if (!res.headersSent) {
      res.status(status).json({
        message,
        details: err?.stack || err,
      });
    }
  });

  // -------------------- Dev vs Prod setup --------------------
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // -------------------- Unhandled rejections --------------------
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
  });

  // -------------------- Start server --------------------
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`Server running at http://localhost:${port}`);
  });
};

// Start the async server function
startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
