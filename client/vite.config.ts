import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // ✅ Load env variables (important for Vercel)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"), // client/src
        "@shared": path.resolve(__dirname, "../shared"), // shared folder (outside client)
        "@assets": path.resolve(__dirname, "src/assets"),
      },
    },
    root: "./", 
    build: {
      outDir: "dist",   // ✅ final build for Vercel
      emptyOutDir: true,
    },
    server: {
      proxy: { 
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5000", // ✅ use env in prod
          changeOrigin: true,
        },
      },
    },
    define: {
      "process.env": env, // ✅ makes VITE_API_URL available in frontend
    },
      headers: {
      "Permissions-Policy": "unload=()"
    }
  };
});
