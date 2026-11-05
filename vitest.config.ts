import { defineConfig } from "vitest/config";

// The lib's own tests. server/ and client/ run theirs with their own config
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
