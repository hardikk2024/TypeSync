import type { IncomingMessage, ServerResponse } from "node:http";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const LANGUAGE_CODE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

/**
 * Vercel's Vite runtime invokes a Node request/response handler from /api.
 * Vite's local middleware is not bundled with the static production build.
 */
export default async function transcriptApi(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Only GET requests are supported." });
    return;
  }

  const url = new URL(request.url || "/", "https://typesync.local");
  const videoId = url.searchParams.get("videoId");
  const language = url.searchParams.get("lang") || "en";

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    sendJson(response, 400, { error: "Enter a valid YouTube video ID." });
    return;
  }

  if (!LANGUAGE_CODE_PATTERN.test(language)) {
    sendJson(response, 400, { error: "Enter a valid caption language." });
    return;
  }

  let fetchVideoCaptions: typeof import("../src/server/transcriptHandler.ts").fetchVideoCaptions;
  try {
    ({ fetchVideoCaptions } =
      await import("../src/server/transcriptHandler.ts"));
  } catch (error) {
    console.error("Caption module failed to load", error);
    const missingModule =
      error instanceof Error && error.message.includes("youtube-transcript")
        ? "youtube-transcript"
        : error instanceof Error && error.message.includes("transcriptHandler")
          ? "transcriptHandler"
          : "other";
    const reason =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "UNKNOWN";
    sendJson(response, 500, {
      code: "CAPTION_MODULE_UNAVAILABLE",
      reason,
      missingModule,
      error:
        "Caption service could not start. Try again later or paste a transcript.",
    });
    return;
  }

  try {
    const result = await fetchVideoCaptions(videoId, language);
    sendJson(response, 200, result);
  } catch (error) {
    console.error("Caption lookup failed", error);
    sendJson(response, 404, {
      error:
        "No captions could be found for this video. Paste or upload a transcript to continue.",
    });
  }
}
