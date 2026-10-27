/// <reference types="vitest" />
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { handleTranscriptApi } from "./src/server/transcriptHandler.ts";

function transcriptApiPlugin(): Plugin {
  return {
    name: "transcript-api-plugin",
    configureServer(server) {
      server.middlewares.use("/api/transcript", (req, res) => {
        handleTranscriptApi(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/transcript", (req, res) => {
        handleTranscriptApi(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), transcriptApiPlugin()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
