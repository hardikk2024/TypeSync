import type { GameSettings } from "../types";

/**
 * Normalizes a caption text according to the current settings.
 * Used by the typing engine to compare typed text vs expected text.
 */
export function normalizeText(text: string, settings: GameSettings): string {
  let result = text;
  if (!settings.caseSensitive) {
    result = result.toLowerCase();
  }
  if (settings.ignorePunctuation) {
    result = result
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return result;
}

/**
 * Calculates WPM using the standard formula:
 *   WPM = (correctChars / 5) / (activeTypingMinutes)
 */
export function calculateWpm(
  correctChars: number,
  activeTypingMs: number,
): number {
  if (activeTypingMs <= 0) return 0;
  const minutes = activeTypingMs / 60_000;
  return Math.round(correctChars / 5 / minutes);
}

/**
 * Calculates typing accuracy as a percentage.
 * Backspace keystrokes are NOT counted in totalKeystrokes for accuracy.
 */
export function calculateAccuracy(
  correctChars: number,
  totalKeystrokes: number,
): number {
  if (totalKeystrokes === 0) return 100;
  return Math.round((correctChars / totalKeystrokes) * 100);
}

/**
 * Calculates a composite score for the session.
 */
export function calculateScore(
  wpm: number,
  accuracy: number,
  autoPauses: number,
  captionsCompleted: number,
): number {
  const baseScore = wpm * (accuracy / 100) * 10;
  const pausePenalty = autoPauses * 5;
  const completionBonus = captionsCompleted * 2;
  return Math.max(0, Math.round(baseScore - pausePenalty + completionBonus));
}

/**
 * Returns a rating based on WPM and accuracy.
 */
export function getRating(
  wpm: number,
  accuracy: number,
): "S" | "A" | "B" | "C" | "D" {
  if (wpm >= 80 && accuracy >= 97) return "S";
  if (wpm >= 60 && accuracy >= 93) return "A";
  if (wpm >= 40 && accuracy >= 88) return "B";
  if (wpm >= 25 && accuracy >= 80) return "C";
  return "D";
}

/**
 * Formats milliseconds as mm:ss.
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Formats seconds as mm:ss.
 */
export function formatSeconds(s: number): string {
  const minutes = Math.floor(s / 60);
  const seconds = Math.floor(s % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
