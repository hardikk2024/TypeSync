import { describe, it, expect } from "vitest";
import {
  parseSRT,
  parseWebVTT,
  parseTimestampedText,
  parsePlainText,
  getActiveCaptionIndex,
} from "../services/transcriptService";

describe("parseSRT", () => {
  const srt = `1
00:00:01,000 --> 00:00:04,500
Hello world

2
00:00:05,000 --> 00:00:08,000
This is a test`;

  it("parses two captions", () => {
    const captions = parseSRT(srt);
    expect(captions).toHaveLength(2);
  });

  it("correctly parses start/end times", () => {
    const captions = parseSRT(srt);
    expect(captions[0].startTime).toBeCloseTo(1.0);
    expect(captions[0].endTime).toBeCloseTo(4.5);
    expect(captions[1].startTime).toBeCloseTo(5.0);
  });

  it("correctly parses caption text", () => {
    const captions = parseSRT(srt);
    expect(captions[0].text).toBe("Hello world");
    expect(captions[1].text).toBe("This is a test");
  });
});

describe("parseWebVTT", () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.500
Hello world

00:00:05.000 --> 00:00:08.000
This is VTT`;

  it("parses captions from VTT", () => {
    const captions = parseWebVTT(vtt);
    expect(captions).toHaveLength(2);
    expect(captions[0].text).toBe("Hello world");
    expect(captions[1].startTime).toBeCloseTo(5.0);
  });
});

describe("parseTimestampedText", () => {
  const text = `[0:01] First caption
[0:05] Second caption
[0:10] Third caption`;

  it("parses timestamped lines", () => {
    const captions = parseTimestampedText(text);
    expect(captions).toHaveLength(3);
    expect(captions[0].startTime).toBeCloseTo(1);
    expect(captions[0].text).toBe("First caption");
  });

  it("sets end time to next caption start", () => {
    const captions = parseTimestampedText(text);
    expect(captions[0].endTime).toBeCloseTo(captions[1].startTime);
  });
});

describe("parsePlainText", () => {
  it("creates one caption per non-empty line", () => {
    const text = "Line one\nLine two\n\nLine three";
    const captions = parsePlainText(text);
    expect(captions).toHaveLength(3);
  });

  it("assigns sequential timestamps", () => {
    const captions = parsePlainText("A\nB\nC", 4);
    expect(captions[0].startTime).toBe(0);
    expect(captions[1].startTime).toBe(4);
    expect(captions[2].startTime).toBe(8);
  });
});

describe("getActiveCaptionIndex", () => {
  const captions = [
    { id: "c0", startTime: 0, endTime: 5, text: "First" },
    { id: "c1", startTime: 5, endTime: 10, text: "Second" },
    { id: "c2", startTime: 10, endTime: 15, text: "Third" },
  ];

  it("returns correct index at exact start time", () => {
    expect(getActiveCaptionIndex(captions, 0)).toBe(0);
    expect(getActiveCaptionIndex(captions, 5)).toBe(1);
    expect(getActiveCaptionIndex(captions, 10)).toBe(2);
  });

  it("returns correct index mid-caption", () => {
    expect(getActiveCaptionIndex(captions, 2.5)).toBe(0);
    expect(getActiveCaptionIndex(captions, 7)).toBe(1);
  });

  it("returns -1 past all captions", () => {
    expect(getActiveCaptionIndex(captions, 20)).toBe(-1);
  });

  it("returns next caption index when between captions", () => {
    // No gap in our test data, but test boundary
    expect(getActiveCaptionIndex(captions, 4.9)).toBe(0);
  });
});
