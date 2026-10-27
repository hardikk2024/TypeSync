import { describe, it, expect } from "vitest";
import { extractVideoId, isValidYouTubeUrl } from "../utils/youtubeUrl";

describe("extractVideoId", () => {
  it("extracts from standard watch URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from short URL", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from Shorts URL", () => {
    expect(extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from embed URL", () => {
    expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("accepts bare video ID", () => {
    expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid URL", () => {
    expect(extractVideoId("https://google.com")).toBeNull();
    expect(extractVideoId("not-a-url")).toBeNull();
    expect(extractVideoId("")).toBeNull();
  });

  it("handles URL with extra query params", () => {
    expect(
      extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s"),
    ).toBe("dQw4w9WgXcQ");
  });
});

describe("isValidYouTubeUrl", () => {
  it("validates correct URLs", () => {
    expect(
      isValidYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe(true);
    expect(isValidYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(isValidYouTubeUrl("https://vimeo.com/12345")).toBe(false);
    expect(isValidYouTubeUrl("")).toBe(false);
  });
});
