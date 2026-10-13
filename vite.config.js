import { defineConfig } from "vite";
import { resolve } from "node:path";

// Two entry points, one dev server:
//   index.html  the cinematic opener that the root url lands on
//   main.html   the photo slideshow
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        main: resolve(__dirname, "main.html")
      }
    }
  }
});
