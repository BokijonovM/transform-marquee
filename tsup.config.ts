import { copyFile } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2020",
  external: ["react", "react-dom"],
  // The component uses hooks and browser APIs, so React Server Component
  // frameworks (Next.js App Router) must treat the bundle as a client module.
  banner: { js: '"use client";' },
  async onSuccess() {
    await copyFile("src/styles.css", "dist/styles.css");
  },
});
