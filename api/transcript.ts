import { fetchVideoCaptions } from "../src/server/transcriptHandler";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const LANGUAGE_CODE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

/**
 * Vercel serves this route in production because Vite middleware only runs
 * inside the local development and preview servers.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return Response.json(
        { error: "Only GET requests are supported." },
        { status: 405, headers: { Allow: "GET" } },
      );
    }

    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    const language = url.searchParams.get("lang") || "en";

    if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
      return Response.json(
        { error: "Enter a valid YouTube video ID." },
        { status: 400 },
      );
    }

    if (!LANGUAGE_CODE_PATTERN.test(language)) {
      return Response.json(
        { error: "Enter a valid caption language." },
        { status: 400 },
      );
    }

    try {
      const result = await fetchVideoCaptions(videoId, language);
      return Response.json(result);
    } catch (error) {
      console.error("Caption lookup failed", error);
      return Response.json(
        {
          error:
            "No captions could be found for this video. Paste or upload a transcript to continue.",
        },
        { status: 404 },
      );
    }
  },
};
