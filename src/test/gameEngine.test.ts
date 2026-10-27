import { describe, it, expect } from "vitest";
import { processKeypress, getCharacterStates } from "../engine/gameEngine";
import type { GameSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const settings: GameSettings = {
  ...DEFAULT_SETTINGS,
  caseSensitive: false,
  strictMode: true,
};

describe("processKeypress", () => {
  it("advances on correct character", () => {
    const result = processKeypress("h", "", "hello", settings, 0, 0, 0, 0, 0);
    expect(result.nextTyped).toBe("h");
    expect(result.correctChars).toBe(1);
    expect(result.incorrectChars).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  it("does not advance in strict mode on incorrect character", () => {
    const result = processKeypress("x", "", "hello", settings, 0, 0, 0, 0, 0);
    expect(result.nextTyped).toBe(""); // strict: no advance
    expect(result.incorrectChars).toBe(1);
  });

  it("marks complete when all characters typed correctly", () => {
    const result = processKeypress(
      "o",
      "hell",
      "hello",
      settings,
      4,
      0,
      4,
      4,
      4,
    );
    expect(result.isComplete).toBe(true);
    expect(result.nextTyped).toBe("hello");
  });

  it("backspace removes last character", () => {
    const result = processKeypress(
      "Backspace",
      "hel",
      "hello",
      settings,
      3,
      0,
      3,
      3,
      3,
    );
    expect(result.nextTyped).toBe("he");
    expect(result.correctChars).toBe(3); // correctChars not decremented
  });

  it("ignores non-printable keys", () => {
    const result = processKeypress(
      "Shift",
      "he",
      "hello",
      settings,
      2,
      0,
      2,
      2,
      2,
    );
    expect(result.nextTyped).toBe("he");
  });

  it("is case insensitive when caseSensitive=false", () => {
    const result = processKeypress("H", "", "hello", settings, 0, 0, 0, 0, 0);
    expect(result.nextTyped).toBe("h");
    expect(result.correctChars).toBe(1);
  });

  it("increments streak on correct and resets on incorrect", () => {
    const r1 = processKeypress("h", "", "hello", settings, 0, 0, 0, 0, 0);
    expect(r1.currentStreak).toBe(1);

    const r2 = processKeypress(
      "x",
      "h",
      "hello",
      { ...settings, strictMode: false },
      1,
      0,
      1,
      1,
      1,
    );
    expect(r2.currentStreak).toBe(0);
  });
});

describe("getCharacterStates", () => {
  const cap = "hello";

  it("marks all characters as untyped when nothing typed", () => {
    const states = getCharacterStates("", cap, settings);
    expect(states[0]).toBe("current");
    expect(states[1]).toBe("untyped");
  });

  it("marks correct characters", () => {
    const states = getCharacterStates("hel", cap, settings);
    expect(states[0]).toBe("correct");
    expect(states[1]).toBe("correct");
    expect(states[2]).toBe("correct");
    expect(states[3]).toBe("current");
    expect(states[4]).toBe("untyped");
  });

  it("marks incorrect characters", () => {
    const states = getCharacterStates("hxl", cap, {
      ...settings,
      strictMode: false,
    });
    expect(states[1]).toBe("incorrect");
  });
});
