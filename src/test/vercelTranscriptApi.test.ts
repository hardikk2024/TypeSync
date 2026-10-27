// @vitest-environment node
import type { IncomingMessage, ServerResponse } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTranscriptApi,
  fetchHostedCaptions,
  type AutoCaptionResult,
} from "../../api/transcript";

const fetchVideoCaptionsMock =
  vi.fn<(videoId: string, language?: string) => Promise<AutoCaptionResult>>();
const transcriptApi = createTranscriptApi(fetchVideoCaptionsMock);

const VIDEO_ID = "V9PVRfjEBTI";

function request(url: string, method = "GET"): IncomingMessage {
  return { url, method } as IncomingMessage;
}

function response(): ServerResponse {
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn(),
  } as unknown as ServerResponse;
}

describe("Vercel transcript endpoint", () => {
  beforeEach(() => {
    fetchVideoCaptionsMock.mockReset();
  });

  it("rejects invalid video IDs without calling YouTube", async () => {
    const reply = response();
    await transcriptApi(request("/api/transcript?videoId=invalid"), reply);

    expect(reply.statusCode).toBe(400);
    expect(fetchVideoCaptionsMock).not.toHaveBeenCalled();
  });

  it("returns captions in the shape expected by the client", async () => {
    const transcript: AutoCaptionResult = {
      videoId: VIDEO_ID,
      videoTitle: "Sample video",
      language: "en",
      captions: [{ id: "c0", startTime: 0, endTime: 3, text: "Hello" }],
      source: "auto",
    };
    fetchVideoCaptionsMock.mockResolvedValue(transcript);
    const reply = response();

    await transcriptApi(
      request(`/api/transcript?videoId=${VIDEO_ID}&lang=en`),
      reply,
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json; charset=utf-8",
    );
    expect(reply.end).toHaveBeenCalledWith(JSON.stringify(transcript));
    expect(fetchVideoCaptionsMock).toHaveBeenCalledWith(VIDEO_ID, "en");
  });

  it("explains when a video has no captions", async () => {
    fetchVideoCaptionsMock.mockRejectedValue(new Error("Provider failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reply = response();

    await transcriptApi(request(`/api/transcript?videoId=${VIDEO_ID}`), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.end).toHaveBeenCalledWith(
      JSON.stringify({
        error:
          "No captions could be found for this video. Paste or upload a transcript to continue.",
      }),
    );
    vi.restoreAllMocks();
  });

  it("rejects unsupported methods", async () => {
    const reply = response();
    await transcriptApi(
      request(`/api/transcript?videoId=${VIDEO_ID}`, "POST"),
      reply,
    );

    expect(reply.statusCode).toBe(405);
    expect(reply.setHeader).toHaveBeenCalledWith("Allow", "GET");
  });
});

describe("hosted transcript provider", () => {
  it("requests existing timestamped captions with the key in a server header", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            { text: "Hello", offset: 1000, duration: 2000, lang: "en" },
          ],
          lang: "en",
        }),
        { status: 200 },
      ),
    );

    const result = await fetchHostedCaptions(
      VIDEO_ID,
      "en",
      "test-key",
      fetcher,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].offset).toBe(1000);
    const [url, options] = fetcher.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("mode")).toBe("native");
    expect(new URL(String(url)).searchParams.get("text")).toBe("false");
    expect(options?.headers).toEqual({ "x-api-key": "test-key" });
    expect(String(url)).not.toContain("test-key");
  });

  it("polls an asynchronous transcript job", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobId: "job-123" }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "completed",
            content: [{ text: "Ready", offset: 0, duration: 1000 }],
            lang: "en",
          }),
          { status: 200 },
        ),
      );
    vi.useFakeTimers();
    try {
      const pending = fetchHostedCaptions(VIDEO_ID, "en", "test-key", fetcher);
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(1000);
      expect((await pending).items[0].text).toBe("Ready");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects untimed responses instead of showing fabricated captions", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ content: "plain text" })),
      );
    await expect(
      fetchHostedCaptions(VIDEO_ID, "en", "test-key", fetcher),
    ).rejects.toThrow("timestamped captions");
  });
});
