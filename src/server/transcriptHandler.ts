import { fetchVideoCaptions } from "../../api/transcript.ts";
import type { IncomingMessage, ServerResponse } from "http";

export { fetchVideoCaptions };
export type { AutoCaptionResult } from "../../api/transcript.ts";

export function handleTranscriptApi(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(
    req.url || "",
    `http://${req.headers.host || "localhost"}`,
  );
  const videoId = url.searchParams.get("videoId");
  const lang = url.searchParams.get("lang") || "en";

  if (!videoId) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "videoId query parameter is required" }));
    return;
  }

  fetchVideoCaptions(videoId, lang)
    .then((data) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(data));
    })
    .catch((err) => {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(
        JSON.stringify({ error: err.message || "Failed to fetch transcript" }),
      );
    });
}
