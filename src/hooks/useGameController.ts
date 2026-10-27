import { useReducer, useCallback, useRef, useEffect } from "react";
import type {
  GameState,
  GamePhase,
  Caption,
  GameSettings,
  GameResults,
} from "../types";
import {
  createInitialGameState,
  processKeypress,
  buildCaptionResult,
  buildResults,
} from "../engine/gameEngine";
import { getActiveCaptionIndex } from "../services/transcriptService";
import { normalizeText } from "../utils/scoring";

// ─── Actions ──────────────────────────────────────────────────────────────────

type GameAction =
  | { type: "START_GAME" }
  | { type: "PAUSE_SESSION" }
  | { type: "RESUME_SESSION" }
  | { type: "AUTO_PAUSE"; captionIndex: number }
  | { type: "AUTO_RESUME" }
  | { type: "KEYPRESS"; key: string; settings: GameSettings; target: string }
  | {
      type: "CAPTION_COMPLETE";
      captionIndex: number;
      autoPaused: boolean;
      caption: Caption;
    }
  | { type: "ADVANCE_CAPTION"; newIndex: number }
  | { type: "TIME_UPDATE"; currentTime: number; captions: Caption[] }
  | { type: "FINISH" }
  | { type: "RESET"; videoId: string }
  | { type: "SET_PHASE"; phase: GamePhase };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return {
        ...state,
        phase: "PLAYING",
        gameStartTime: state.gameStartTime ?? Date.now(),
      };

    case "PAUSE_SESSION":
      return {
        ...state,
        phase: "SESSION_PAUSED",
        pauseStartTime: Date.now(),
      };

    case "RESUME_SESSION":
      return {
        ...state,
        phase: "PLAYING",
        activeTypingMs: state.pauseStartTime
          ? state.activeTypingMs + (Date.now() - state.pauseStartTime)
          : state.activeTypingMs,
        pauseStartTime: null,
      };

    case "AUTO_PAUSE":
      return {
        ...state,
        phase: "PAUSED_FOR_TYPING",
        autoPauses: state.autoPauses + 1,
        pauseStartTime: Date.now(),
      };

    case "AUTO_RESUME":
      return {
        ...state,
        phase: "PLAYING",
        activeTypingMs: state.pauseStartTime
          ? state.activeTypingMs + (Date.now() - state.pauseStartTime)
          : state.activeTypingMs,
        pauseStartTime: null,
      };

    case "KEYPRESS": {
      const result = processKeypress(
        action.key,
        state.typedText,
        action.target,
        action.settings,
        state.correctChars,
        state.incorrectChars,
        state.totalKeystrokes,
        state.currentStreak,
        state.longestStreak,
      );
      return {
        ...state,
        typedText: result.nextTyped,
        correctChars: result.correctChars,
        incorrectChars: result.incorrectChars,
        totalKeystrokes: result.totalKeystrokes,
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
      };
    }

    case "CAPTION_COMPLETE": {
      const captionResult = buildCaptionResult(
        action.caption,
        state.correctChars,
        state.incorrectChars,
        state.gameStartTime ?? Date.now(),
        action.autoPaused,
      );
      return {
        ...state,
        phase: "CAPTION_COMPLETED",
        captionsCompleted: state.captionsCompleted + 1,
        sessionHistory: [...state.sessionHistory, captionResult],
      };
    }

    case "ADVANCE_CAPTION":
      return {
        ...state,
        phase: "PLAYING",
        currentCaptionIndex: action.newIndex,
        typedText: "",
      };

    case "TIME_UPDATE": {
      if (state.phase !== "PLAYING" && state.phase !== "WAITING_FOR_INPUT")
        return state;

      const idx = getActiveCaptionIndex(action.captions, action.currentTime);
      if (idx === -1) return state; // before or past all captions

      if (idx !== state.currentCaptionIndex) {
        return {
          ...state,
          currentCaptionIndex: idx,
          typedText: "",
        };
      }
      return state;
    }

    case "FINISH":
      return { ...state, phase: "SESSION_FINISHED" };

    case "RESET":
      return createInitialGameState(action.videoId);

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseGameControllerOptions {
  videoId: string;
  captions: Caption[];
  settings: GameSettings;
  onPauseVideo: () => void;
  onResumeVideo: () => void;
  onGetCurrentTime: () => number;
  videoTitle?: string;
}

export function useGameController(options: UseGameControllerOptions) {
  const {
    videoId,
    captions,
    settings,
    onPauseVideo,
    onResumeVideo,
    videoTitle,
  } = options;

  const [state, dispatch] = useReducer(
    gameReducer,
    videoId,
    createInitialGameState,
  );

  // Refs for stable callback access inside event handlers
  const stateRef = useRef(state);
  stateRef.current = state;
  const captionsRef = useRef(captions);
  captionsRef.current = captions;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track whether auto-pause is in effect
  const autoPausedRef = useRef(false);

  // ─── Time Update Handler ───────────────────────────────────────────────────

  const handleTimeUpdate = useCallback((currentTime: number) => {
    const s = stateRef.current;
    const caps = captionsRef.current;

    if (s.phase !== "PLAYING" && s.phase !== "WAITING_FOR_INPUT") return;
    if (caps.length === 0) return;

    const currentCaption = caps[s.currentCaptionIndex];
    if (!currentCaption) return;

    // Check if current caption's window has expired and typing isn't done
    const target = normalizeText(currentCaption.text, settingsRef.current);
    if (
      currentTime >= currentCaption.endTime &&
      s.typedText.length < target.length
    ) {
      if (!autoPausedRef.current) {
        autoPausedRef.current = true;
        optionsRef.current.onPauseVideo();
        dispatch({ type: "AUTO_PAUSE", captionIndex: s.currentCaptionIndex });
      }
    }
  }, []);

  // ─── Keyboard Handler ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const caps = captionsRef.current;
      const currentSettings = settingsRef.current;

      // Only process keys during active phases
      if (
        s.phase !== "PLAYING" &&
        s.phase !== "PAUSED_FOR_TYPING" &&
        s.phase !== "WAITING_FOR_INPUT"
      )
        return;

      // Prevent browser shortcuts from interfering
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Tab" || e.key === "Enter" || e.key === "Escape") return;

      const currentCaption = caps[s.currentCaptionIndex];
      if (!currentCaption) return;

      e.preventDefault();

      dispatch({
        type: "KEYPRESS",
        key: e.key,
        settings: currentSettings,
        target: currentCaption.text,
      });

      // Check for completion — computed locally since reducer hasn't fired yet
      const target = normalizeText(currentCaption.text, currentSettings);

      // Compute what typedText will be after this keypress
      let newTyped: string;
      if (e.key === "Backspace") {
        newTyped = s.typedText.slice(0, -1);
      } else if (e.key.length === 1) {
        const ch = currentSettings.caseSensitive ? e.key : e.key.toLowerCase();
        // In strict mode, only advance if the character is correct
        const pos = s.typedText.length;
        if (
          currentSettings.strictMode &&
          pos < target.length &&
          ch !== target[pos]
        ) {
          newTyped = s.typedText; // strict: no advance on wrong char
        } else {
          newTyped = s.typedText + ch;
        }
      } else {
        newTyped = s.typedText;
      }

      // Caption is complete when typed equals target exactly
      if (
        newTyped.length >= target.length &&
        newTyped.slice(0, target.length) === target
      ) {
        const wasAutoPaused = autoPausedRef.current;
        autoPausedRef.current = false;

        dispatch({
          type: "CAPTION_COMPLETE",
          captionIndex: s.currentCaptionIndex,
          autoPaused: wasAutoPaused,
          caption: currentCaption,
        });

        if (wasAutoPaused) {
          optionsRef.current.onResumeVideo();
        }

        // Advance to next caption
        const nextIndex = s.currentCaptionIndex + 1;
        if (nextIndex >= caps.length) {
          dispatch({ type: "FINISH" });
        } else {
          setTimeout(() => {
            dispatch({ type: "ADVANCE_CAPTION", newIndex: nextIndex });
          }, 50);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Game Controls ─────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    dispatch({ type: "START_GAME" });
  }, []);

  const pauseSession = useCallback(() => {
    onPauseVideo();
    dispatch({ type: "PAUSE_SESSION" });
  }, [onPauseVideo]);

  const resumeSession = useCallback(() => {
    onResumeVideo();
    dispatch({ type: "RESUME_SESSION" });
  }, [onResumeVideo]);

  const resetGame = useCallback(() => {
    autoPausedRef.current = false;
    dispatch({ type: "RESET", videoId });
  }, [videoId]);

  const getResults = useCallback((): GameResults => {
    return buildResults(stateRef.current, captionsRef.current, videoTitle);
  }, [videoTitle]);

  return {
    state,
    handleTimeUpdate,
    startGame,
    pauseSession,
    resumeSession,
    resetGame,
    getResults,
  };
}
