import { describe, it, expect } from "vitest";
import {
  calculateWpm,
  calculateAccuracy,
  calculateScore,
  getRating,
  formatTime,
  formatSeconds,
} from "../utils/scoring";

describe("calculateWpm", () => {
  it("returns 0 for zero active time", () => {
    expect(calculateWpm(100, 0)).toBe(0);
  });

  it("calculates WPM correctly", () => {
    // 100 correct chars / 5 = 20 words, in 1 minute (60000 ms)
    expect(calculateWpm(100, 60_000)).toBe(20);
  });

  it("rounds to nearest integer", () => {
    // 101 chars / 5 = 20.2 words in 1 min → rounds to 20
    expect(calculateWpm(101, 60_000)).toBe(20);
  });
});

describe("calculateAccuracy", () => {
  it("returns 100 when no keystrokes", () => {
    expect(calculateAccuracy(0, 0)).toBe(100);
  });

  it("calculates correctly", () => {
    expect(calculateAccuracy(90, 100)).toBe(90);
    expect(calculateAccuracy(50, 100)).toBe(50);
  });
});

describe("calculateScore", () => {
  it("returns 0 or more", () => {
    expect(calculateScore(0, 0, 100, 0)).toBeGreaterThanOrEqual(0);
  });

  it("gives higher score for better performance", () => {
    const good = calculateScore(80, 98, 0, 10);
    const bad = calculateScore(20, 50, 10, 2);
    expect(good).toBeGreaterThan(bad);
  });
});

describe("getRating", () => {
  it("gives S for excellent performance", () => {
    expect(getRating(90, 98)).toBe("S");
  });

  it("gives A for very good performance", () => {
    expect(getRating(65, 94)).toBe("A");
  });

  it("gives D for poor performance", () => {
    expect(getRating(10, 60)).toBe("D");
  });
});

describe("formatTime", () => {
  it("formats ms to mm:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(60_000)).toBe("1:00");
    expect(formatTime(90_000)).toBe("1:30");
    expect(formatTime(3_600_000)).toBe("60:00");
  });
});

describe("formatSeconds", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatSeconds(0)).toBe("0:00");
    expect(formatSeconds(65)).toBe("1:05");
    expect(formatSeconds(3600)).toBe("60:00");
  });
});
