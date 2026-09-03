import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["apps/web/src/**/*.test.ts", "src/**/*.test.ts", "packages/**/*.test.ts", "scripts/**/*.test.mjs"],
    exclude: ["dist/**", "dist-server/**", "node_modules/**"]
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": process.env.SELF_MEDIA_API_URL ?? "http://127.0.0.1:4310",
      "/artifacts": process.env.SELF_MEDIA_API_URL ?? "http://127.0.0.1:4310",
      "/research": process.env.SELF_MEDIA_API_URL ?? "http://127.0.0.1:4310"
    }
  },
  build: {
    outDir: "dist"
  }
});
