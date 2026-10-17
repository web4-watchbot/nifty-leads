import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // The web app has no unit tests yet (Phase 0/1A logic lives in packages/*).
    passWithNoTests: true,
  },
});
