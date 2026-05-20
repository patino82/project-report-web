import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Next.js Edge Runtime / Node.js API routes are tested here.
    // environment: "node" is the correct mode for Node.js API route handlers.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
