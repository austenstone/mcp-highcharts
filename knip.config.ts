import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "server.ts",
    "src/mcp-app.ts",
    "scripts/*.{mjs,ts}",
  ],
  project: ["**/*.{ts,mjs}"],
  ignoreDependencies: [
    // Imported dynamically via import() in main.ts
    "express",
    "@types/express",
    // Used by vitest browser config
    "@vitest/browser",
  ],
};

export default config;
