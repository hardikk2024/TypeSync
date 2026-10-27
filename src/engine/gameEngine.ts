import type {
  GameState,
  GameResults,
  Caption,
  GameSettings,
  CaptionResult,
} from "../types";
import {
  calculateWpm,
  calculateAccuracy,
  calculateScore,
  getRating,
} from "../utils/scoring";
import { normalizeText } from "../utils/scoring";

// ─── Initial State ────────────────────────────────────────────────────────────

export function createInitialGameState(videoId: string): GameState {
  return {
    phase: "READY",
    videoId,
    currentCaptionIndex: 0,
    typedText: "",
    correctChars: 0,
    incorrectChars: 0,
    totalKeystrokes: 0,
    captionsCompleted: 0,
    autoPauses: 0,
    gameStartTime: null,
    activeTypingMs: 0,
    pauseStartTime: null,
    longestStreak: 0,
    currentStreak: 0,
    sessionHistory: [],
  };
}

// ─── Typing Engine ────────────────────────────────────────────────────────────

export interface TypingResult {
  nextTyped: string;
  correctChars: number;
  incorrectChars: number;
  totalKeystrokes: number;
  isComplete: boolean;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Processes a single keypress against the expected caption text.
 *
 * Rules (strict mode):
 * - Incorrect characters mark an error but do NOT advance the cursor.
 * - Backspace removes the last character.
 * - A caption is complete when typedText matches target in length and all chars correct.
 */
export function processKeypress(
  key: string,
  typedText: string,
  targetText: string,
  settings: GameSettings,
  correctChars: number,
  incorrectChars: number,
  totalKeystrokes: number,
  currentStreak: number,
  longestStreak: number,
): TypingResult {
  const target = normalizeText(targetText, settings);

  if (key === "Backspace") {
    const nextTyped = typedText.slice(0, -1);
    return {
      nextTyped,
      correctChars,
      incorrectChars,
      totalKeystrokes,
      isComplete: false,
      currentStreak,
      longestStreak,
    };
  }

  // Only process printable characters
  if (key.length !== 1) {
    return {
      nextTyped: typedText,
      correctChars,
      incorrectChars,
      totalKeystrokes,
      isComplete: false,
      currentStreak,
      longestStreak,
    };
  }

  const pos = typedText.length;
  if (pos >= target.length) {
    // Already at or past end
    return {
      nextTyped: typedText,
      correctChars,
      incorrectChars,
      totalKeystrokes,
      isComplete: isComplete(typedText, target),
      currentStreak,
      longestStreak,
    };
  }

  const expectedChar = target[pos];
  const typedChar = settings.caseSensitive ? key : key.toLowerCase();
  const isCorrect = typedChar === expectedChar;

  const nextTyped = typedText + typedChar;
  const nextCorrect = isCorrect ? correctChars + 1 : correctChars;
  const nextIncorrect = isCorrect ? incorrectChars : incorrectChars + 1;
  const nextKeystrokes = totalKeystrokes + 1;
  const nextStreak = isCorrect ? currentStreak + 1 : 0;
  const nextLongest = Math.max(longestStreak, nextStreak);

  // In strict mode: if incorrect, don't advance typedText
  const finalTyped = settings.strictMode && !isCorrect ? typedText : nextTyped;

  return {
    nextTyped: finalTyped,
    correctChars: nextCorrect,
    incorrectChars: nextIncorrect,
    totalKeystrokes: nextKeystrokes,
    isComplete: isComplete(finalTyped, target),
    currentStreak: nextStreak,
    longestStreak: nextLongest,
  };
}

function isComplete(typed: string, target: string): boolean {
  if (typed.length < target.length) return false;
  const normalTyped = typed.slice(0, target.length);
  return normalTyped === target;
}

/**
 * Determines whether all characters typed so far are correct up to the cursor.
 */
export function getCharacterStates(
  typedText: string,
  targetText: string,
  settings: GameSettings,
): ("correct" | "incorrect" | "current" | "untyped")[] {
  const target = normalizeText(targetText, settings);
  return target.split("").map((char, i) => {
    if (i > typedText.length) return "untyped";
    if (i === typedText.length) return "current";
    const typedChar = settings.caseSensitive
      ? typedText[i]
      : typedText[i]?.toLowerCase();
    const expectedChar = settings.caseSensitive ? char : char.toLowerCase();
    return typedChar === expectedChar ? "correct" : "incorrect";
  });
}

// ─── Caption Completion ───────────────────────────────────────────────────────

/**
 * Builds a CaptionResult after completing a caption.
 */
export function buildCaptionResult(
  caption: Caption,
  correctChars: number,
  incorrectChars: number,
  startTimeMs: number,
  autoPaused: boolean,
): CaptionResult {
  return {
    captionId: caption.id,
    text: caption.text,
    correctChars,
    incorrectChars,
    timeMs: Date.now() - startTimeMs,
    autoPaused,
  };
}

// ─── Results Builder ──────────────────────────────────────────────────────────

export function buildResults(
  state: GameState,
  captions: Caption[],
  videoTitle?: string,
): GameResults {
  const wpm = calculateWpm(state.correctChars, state.activeTypingMs);
  const accuracy = calculateAccuracy(state.correctChars, state.totalKeystrokes);
  const score = calculateScore(
    wpm,
    accuracy,
    state.autoPauses,
    state.captionsCompleted,
  );

  return {
    videoId: state.videoId,
    videoTitle,
    wpm,
    accuracy,
    correctChars: state.correctChars,
    incorrectChars: state.incorrectChars,
    totalKeystrokes: state.totalKeystrokes,
    captionsCompleted: state.captionsCompleted,
    totalCaptions: captions.length,
    autoPauses: state.autoPauses,
    activeTypingMs: state.activeTypingMs,
    longestStreak: state.longestStreak,
    score,
    rating: getRating(wpm, accuracy),
    completedAt: Date.now(),
  };
}
