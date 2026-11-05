import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The demo imports the package by its public name, aliased to the source,
// so it exercises exactly the API users get.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^transform-marquee\/styles\.css$/,
        replacement: fileURLToPath(new URL("../src/styles.css", import.meta.url)),
      },
      {
        find: /^transform-marquee$/,
        replacement: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
      },
    ],
  },
});
