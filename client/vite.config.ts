import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // client/src
      "@shared": path.resolve(__dirname, "../shared"), // shared folder (outside client)
      "@assets": path.resolve(__dirname, "src/assets"),
    },
  },
  root: "./", // client folder is the root now
  build: {
     outDir: "dist",  // build output goes to dist/public
    emptyOutDir: true,
  },
  server: {
    proxy: { 
      "/api": {
        target: "http://localhost:5000", // backend port
        changeOrigin: true,
      },
    },
  },
});
