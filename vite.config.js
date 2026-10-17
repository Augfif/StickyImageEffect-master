import { defineConfig } from "vite";
import { resolve } from "node:path";

// Four entry points, one dev server:
//   index.html     the cinematic opener that the root url lands on
//   main.html      the photo slideshow
//   ai.html        the AI activity: the eight-pattern grid
//   ai-style.html  the styled-look generator, reached from a grid tile
//
// /api is proxied to the ai-drawing backend so the browser only ever sees one
// origin. A deployed build has no proxy: either serve both behind the same
// origin, or let the backend answer CORS.
const apiProxy = {
  "/api": {
    target: "http://127.0.0.1:8000",
    changeOrigin: true
  }
};

export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        main: resolve(__dirname, "main.html"),
        ai: resolve(__dirname, "ai.html"),
        aiStyle: resolve(__dirname, "ai-style.html")
      }
    }
  }
});
