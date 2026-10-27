// ─── Caption & Transcript Types ────────────────────────────────────────────────

export interface WordTimestamp {
  word: string;
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface Caption {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  words?: WordTimestamp[];
}

export interface Transcript {
  videoId: string;
  language?: string;
  captions: Caption[];
  source: "auto" | "manual" | "uploaded";
}

// ─── Game State Machine ─────────────────────────────────────────────────────────

export type GamePhase =
  | "READY"
  | "PLAYING"
  | "WAITING_FOR_INPUT"
  | "PAUSED_FOR_TYPING"
  | "CAPTION_COMPLETED"
  | "SESSION_PAUSED"
  | "SESSION_FINISHED"
  | "ERROR";

export interface GameState {
  phase: GamePhase;
  videoId: string;
  currentCaptionIndex: number;
  typedText: string;
  correctChars: number;
  incorrectChars: number;
  totalKeystrokes: number;
  captionsCompleted: number;
  autoPauses: number;
  gameStartTime: number | null; // ms timestamp
  activeTypingMs: number; // ms of active typing (excluding auto-pauses)
  pauseStartTime: number | null; // when auto-pause started
  longestStreak: number;
  currentStreak: number;
  sessionHistory: CaptionResult[];
}

export interface CaptionResult {
  captionId: string;
  text: string;
  correctChars: number;
  incorrectChars: number;
  timeMs: number;
  autoPaused: boolean;
}

// ─── Score & Results ────────────────────────────────────────────────────────────

export interface GameResults {
  videoId: string;
  videoTitle?: string;
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalKeystrokes: number;
  captionsCompleted: number;
  totalCaptions: number;
  autoPauses: number;
  activeTypingMs: number;
  longestStreak: number;
  score: number;
  rating: "S" | "A" | "B" | "C" | "D";
  completedAt: number;
}

// ─── Settings ───────────────────────────────────────────────────────────────────

export interface GameSettings {
  caseSensitive: boolean;
  ignorePunctuation: boolean;
  strictMode: boolean; // must correct mistakes before advancing
  fontSize: "sm" | "md" | "lg" | "xl";
  showWpmLive: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  caseSensitive: false,
  ignorePunctuation: false,
  strictMode: true,
  fontSize: "lg",
  showWpmLive: true,
  reducedMotion: false,
};

// ─── Session History (localStorage) ─────────────────────────────────────────────

export interface SessionRecord {
  id: string;
  videoId: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  results: GameResults;
}
