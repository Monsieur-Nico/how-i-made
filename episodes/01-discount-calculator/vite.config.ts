import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths, so the built page works from any folder or sub-path.
  base: "./",
  preview: { port: 4321, strictPort: true },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
