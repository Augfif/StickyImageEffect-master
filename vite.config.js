import { defineConfig } from "vite";
import { resolve } from "node:path";

// Three entry points, one dev server:
//   index.html  the cinematic opener that the root url lands on
//   main.html   the photo slideshow
//   ai.html     the AI activity, reached from the opener's second door
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        main: resolve(__dirname, "main.html"),
        ai: resolve(__dirname, "ai.html")
      }
    }
  }
});
