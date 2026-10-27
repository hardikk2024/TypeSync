import { YoutubeTranscript } from "youtube-transcript";
import type { IncomingMessage, ServerResponse } from "node:http";

class CaptionLookupError extends Error {
  constructor(readonly diagnostics: string[]) {
    super("No captions could be found for this video.");
  }
}

type CaptionItem = {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
};

function isCaptionItem(value: unknown): value is CaptionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.text === "string" &&
    typeof item.offset === "number" &&
    Number.isFinite(item.offset) &&
    item.offset >= 0 &&
    typeof item.duration === "number" &&
    Number.isFinite(item.duration) &&
    item.duration > 0
  );
}

function parseProviderResult(value: unknown): {
  items: CaptionItem[];
  language: string;
} {
  if (!value || typeof value !== "object") {
    throw new Error("Transcript provider returned an invalid response.");
  }
  const result = value as Record<string, unknown>;
  if (!Array.isArray(result.content) || !result.content.every(isCaptionItem)) {
    throw new Error("Transcript provider did not return timestamped captions.");
  }
  return {
    items: result.content,
    language: typeof result.lang === "string" ? result.lang : "en",
  };
}

/** Fetches only existing captions so a request cannot trigger paid AI transcription. */
export async function fetchHostedCaptions(
  videoId: string,
  language: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<{ items: CaptionItem[]; language: string }> {
  const url = new URL("https://api.supadata.ai/v1/transcript");
  url.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
  url.searchParams.set("lang", language);
  url.searchParams.set("text", "false");
  url.searchParams.set("mode", "native");

  const headers = { "x-api-key": apiKey };
  const request = async (target: string): Promise<Response> =>
    fetcher(target, { headers, signal: AbortSignal.timeout(8000) });

  let response = await request(url.toString());
  if (response.status === 202) {
    const job = (await response.json()) as { jobId?: unknown };
    if (
      typeof job.jobId !== "string" ||
      !/^[A-Za-z0-9-]{1,100}$/.test(job.jobId)
    ) {
      throw new Error("Transcript provider returned an invalid job ID.");
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      response = await request(
        `https://api.supadata.ai/v1/transcript/${job.jobId}`,
      );
      if (!response.ok) break;
      const status = (await response.json()) as { status?: unknown };
      if (status.status === "completed") return parseProviderResult(status);
      if (status.status === "failed") {
        throw new Error("Transcript provider could not process this video.");
      }
    }
    throw new Error("Transcript provider is still processing this video.");
  }
  if (!response.ok) {
    throw new Error(`Transcript provider returned HTTP ${response.status}.`);
  }
  return parseProviderResult(await response.json());
}

export interface AutoCaptionResult {
  videoId: string;
  videoTitle: string;
  language?: string;
  captions: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;
  source: "auto";
}

export async function fetchVideoCaptions(
  videoId: string,
  requestedLang: string = "en",
): Promise<AutoCaptionResult> {
  const diagnostics: string[] = [];
  let title = "YouTube Video";
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (oembedRes.ok) {
      const oembed = (await oembedRes.json()) as { title?: string };
      title = oembed.title || title;
    }
  } catch {
    // Ignore oembed failure
  }

  let items: CaptionItem[] | null = null;
  let resolvedLang = requestedLang;

  const hostedApiKey = process.env.SUPADATA_API_KEY;
  if (hostedApiKey) {
    try {
      const hosted = await fetchHostedCaptions(
        videoId,
        requestedLang,
        hostedApiKey,
      );
      items = hosted.items;
      resolvedLang = hosted.language;
    } catch (error) {
      diagnostics.push(
        `hosted:${error instanceof Error ? error.message : "unknown"}`,
      );
      console.error("Hosted caption lookup failed", error);
    }
  }

  // 1. Try requested language with YoutubeTranscript
  if ((!items || items.length === 0) && requestedLang) {
    try {
      items = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: requestedLang,
      });
    } catch (error) {
      diagnostics.push(
        `requested:${error instanceof Error ? error.name : "unknown"}`,
      );
      // Ignore and fallback
    }
  }

  // 2. Try default language with YoutubeTranscript
  if (!items || items.length === 0) {
    try {
      items = await YoutubeTranscript.fetchTranscript(videoId);
      if (items && items[0]?.lang) {
        resolvedLang = items[0].lang;
      }
    } catch (error) {
      diagnostics.push(
        `default:${error instanceof Error ? error.name : "unknown"}`,
      );
      // Ignore and fallback
    }
  }

  // 3. Fallback: Parse from YouTube HTML captionTracks
  if (!items || items.length === 0) {
    try {
      const pageRes = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
      );
      diagnostics.push(`watch:${pageRes.status}`);
      const html = await pageRes.text();
      diagnostics.push(`watch-bytes:${html.length}`);
      diagnostics.push(
        `watch-player:${html.includes("ytInitialPlayerResponse")}`,
      );
      diagnostics.push(`watch-consent:${html.includes("consent.youtube.com")}`);
      diagnostics.push(
        `watch-bot:${html.includes("Sign in to confirm you’re not a bot") || html.includes("Sign in to confirm you're not a bot")}`,
      );
      const match = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
      if (!match) diagnostics.push("watch:no-tracks");
      if (match) {
        const tracks = JSON.parse(match[1]);
        const track =
          tracks.find(
            (t: { languageCode: string }) => t.languageCode === requestedLang,
          ) ||
          tracks.find((t: { languageCode: string }) =>
            t.languageCode?.startsWith("en"),
          ) ||
          tracks[0];
        if (track && track.baseUrl) {
          const trackRes = await fetch(track.baseUrl);
          diagnostics.push(`track:${trackRes.status}`);
          const xml = await trackRes.text();
          diagnostics.push(`track-bytes:${xml.length}`);
          resolvedLang = track.languageCode;
          const regex =
            /<text start="([\d\.]+)"(?: dur="([\d\.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
          let m: RegExpExecArray | null;
          items = [];
          while ((m = regex.exec(xml)) !== null) {
            const startSec = parseFloat(m[1]);
            const durSec = m[2] ? parseFloat(m[2]) : 4;
            items.push({
              text: m[3],
              offset: startSec * 1000,
              duration: durSec * 1000,
              lang: resolvedLang,
            });
          }
        }
      }
    } catch (err) {
      diagnostics.push(
        `fallback:${err instanceof Error ? err.name : "unknown"}`,
      );
      console.error("Fallback HTML captionTracks error:", err);
    }
  }

  if (!items || items.length === 0) {
    throw new CaptionLookupError(diagnostics);
  }

  const captions = items
    .map((item, index) => {
      const text = item.text
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/[\u266a\u266b\u266c\u2669\u266f♪♫#]+/g, "")
        .replace(/\[[^\]]*\]/g, "") // remove [Music], [Applause], etc.
        .replace(/\s+/g, " ")
        .trim();

      return {
        id: "c" + index,
        startTime: item.offset / 1000,
        endTime: (item.offset + item.duration) / 1000,
        text,
      };
    })
    .filter((c) => c.text.length > 0);

  if (captions.length === 0) {
    throw new Error("Captions were found but did not contain playable text.");
  }

  return {
    videoId,
    videoTitle: title,
    language: resolvedLang,
    captions,
    source: "auto",
  };
}

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
export function createTranscriptApi(lookup: typeof fetchVideoCaptions) {
  return async function transcriptApi(
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

    try {
      const result = await lookup(videoId, language);
      sendJson(response, 200, result);
    } catch (error) {
      console.error("Caption lookup failed", error);
      sendJson(response, 404, {
        error:
          "No captions could be found for this video. Paste or upload a transcript to continue.",
        ...(error instanceof CaptionLookupError && {
          diagnostics: error.diagnostics,
        }),
      });
    }
  };
}

export default createTranscriptApi(fetchVideoCaptions);
