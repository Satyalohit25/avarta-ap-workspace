import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "apps/web/e2e/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
    setupFiles: [path.resolve(__dirname, "apps/api/src/test/setup.ts")],
    fileParallelism: false,
  },
});
