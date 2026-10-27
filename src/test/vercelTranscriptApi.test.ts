// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import transcriptApi from "../../api/transcript";

const fetchVideoCaptionsMock = vi.hoisted(() => vi.fn());

vi.mock("../server/transcriptHandler", () => ({
  fetchVideoCaptions: fetchVideoCaptionsMock,
}));

const API_URL = "https://typesync.example/api/transcript";
const VIDEO_ID = "V9PVRfjEBTI";

describe("Vercel transcript endpoint", () => {
  beforeEach(() => {
    fetchVideoCaptionsMock.mockReset();
  });

  it("rejects invalid video IDs without calling YouTube", async () => {
    const response = await transcriptApi.fetch(
      new Request(`${API_URL}?videoId=invalid`),
    );

    expect(response.status).toBe(400);
    expect(fetchVideoCaptionsMock).not.toHaveBeenCalled();
  });

  it("returns the captions in the shape expected by the client", async () => {
    const transcript = {
      videoId: VIDEO_ID,
      videoTitle: "Sample video",
      language: "en",
      captions: [{ id: "c0", startTime: 0, endTime: 3, text: "Hello" }],
      source: "auto",
    };
    fetchVideoCaptionsMock.mockResolvedValue(transcript);

    const response = await transcriptApi.fetch(
      new Request(`${API_URL}?videoId=${VIDEO_ID}&lang=en`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(transcript);
    expect(fetchVideoCaptionsMock).toHaveBeenCalledWith(VIDEO_ID, "en");
  });

  it("explains when a video has no captions", async () => {
    fetchVideoCaptionsMock.mockRejectedValue(new Error("Provider failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await transcriptApi.fetch(
      new Request(`${API_URL}?videoId=${VIDEO_ID}`),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error:
        "No captions could be found for this video. Paste or upload a transcript to continue.",
    });
    vi.restoreAllMocks();
  });

  it("rejects unsupported methods", async () => {
    const response = await transcriptApi.fetch(
      new Request(`${API_URL}?videoId=${VIDEO_ID}`, { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
