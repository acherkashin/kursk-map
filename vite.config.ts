import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.GITHUB_ACTIONS ? "/kursk-map/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**"],
  },
});
