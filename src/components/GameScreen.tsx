import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transcript, GameSettings, GameResults } from "../types";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { useGameController } from "../hooks/useGameController";
import CaptionDisplay from "./CaptionDisplay";
import StatsBar from "./StatsBar";
import SettingsPanel from "./SettingsPanel";
import ThemeToggle, { type Theme } from "./ThemeToggle";
import { formatSeconds } from "../utils/scoring";
import { saveSession } from "../utils/storage";

interface GameScreenProps {
  videoId: string;
  videoTitle?: string;
  transcript: Transcript;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
  onFinish: (results: GameResults) => void;
  onExit: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const YT_ERROR_MESSAGES: Record<number, string> = {
  2: "Invalid video ID. The video could not be loaded.",
  5: "This video cannot be played in an embedded player.",
  100: "The video was not found. It may have been removed or made private.",
  101: "The video owner does not allow embedding.",
  150: "The video owner does not allow embedding.",
};

export default function GameScreen({
  videoId,
  videoTitle: initialVideoTitle,
  transcript,
  settings,
  onSettingsChange,
  onFinish,
  onExit,
  theme,
  onToggleTheme,
}: GameScreenProps) {
  const captions = transcript.captions;
  const [showSettings, setShowSettings] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [videoTitle] = useState<string | undefined>(initialVideoTitle);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Track whether video is "manually" paused by user (vs auto-paused for typing)
  const manuallyPausedRef = useRef(false);

  // ── YouTube Player ─────────────────────────────────────────────────────────
  const {
    containerRef: ytContainerRef,
    playerState: ytState,
    isReady: ytReady,
    play: ytPlay,
    pause: ytPause,
    getCurrentTime,
    getDuration,
  } = useYouTubePlayer({
    videoId,
    onReady: () => {
      setVideoDuration(getDuration());
    },
    onTimeUpdate: (t) => {
      setCurrentPlaybackTime(t);
      handleTimeUpdate(t);
    },
    onError: (code) => {
      setPlayerError(
        YT_ERROR_MESSAGES[code] ?? `YouTube player error (code ${code}).`,
      );
    },
  });

  // ── Game Controller ────────────────────────────────────────────────────────
  const {
    state,
    handleTimeUpdate,
    startGame,
    pauseSession,
    resumeSession,
    resetGame,
    getResults,
  } = useGameController({
    videoId,
    captions,
    settings,
    onPauseVideo: () => {
      ytPause();
    },
    onResumeVideo: () => {
      ytPlay();
    },
    onGetCurrentTime: getCurrentTime,
    videoTitle,
  });

  // Attempt autoplay when ready; user can also click the Start prompt
  useEffect(() => {
    if (ytReady && state.phase === "READY") {
      try {
        startGame();
        ytPlay();
      } catch {
        // Autoplay may be restricted by browser until user clicks
      }
    }
  }, [ytReady, state.phase, startGame, ytPlay]);

  // Detect session finish
  const finishedRef = useRef(false);
  useEffect(() => {
    if (state.phase === "SESSION_FINISHED" && !finishedRef.current) {
      finishedRef.current = true;
      const results = getResults();

      // Save to local history
      saveSession({
        id: Date.now().toString(),
        videoId,
        videoTitle,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        results,
      });

      onFinish(results);
    }
  }, [state.phase, getResults, videoId, videoTitle, onFinish]);

  // ── Controls ───────────────────────────────────────────────────────────────

  const handleTogglePause = useCallback(() => {
    if (state.phase === "PAUSED_FOR_TYPING") {
      // Auto-paused — user cannot manually resume during typing pause
      return;
    }
    if (state.phase === "SESSION_PAUSED") {
      manuallyPausedRef.current = false;
      resumeSession();
      ytPlay();
    } else if (state.phase === "PLAYING") {
      manuallyPausedRef.current = true;
      pauseSession();
      ytPause();
    }
  }, [state.phase, pauseSession, resumeSession, ytPlay, ytPause]);

  const handleRestart = useCallback(() => {
    finishedRef.current = false;
    resetGame();
    ytPlay();
    startGame();
  }, [resetGame, ytPlay, startGame]);

  const handleManualStart = useCallback(() => {
    startGame();
    ytPlay();
  }, [startGame, ytPlay]);

  // Keyboard shortcut for exit: Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showSettings) setShowSettings(false);
        else onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, showSettings]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const currentCaption = captions[state.currentCaptionIndex];
  const isPaused = state.phase === "PAUSED_FOR_TYPING";
  const isSessionPaused = state.phase === "SESSION_PAUSED";
  const progressPct =
    videoDuration > 0 ? (currentPlaybackTime / videoDuration) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col game-screen">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-navy-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold text-gradient truncate block">
              {videoTitle || "TypeSync"}
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              {transcript.source === "auto"
                ? "Synced captions"
                : "Custom transcript"}
              , {captions.length} captions
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {/* Phase badge */}
          <PhaseBadge phase={state.phase} />

          <button
            onClick={() => setShowSettings((s) => !s)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
            aria-label="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          <button
            onClick={onExit}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
            aria-label="Exit game"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 settings-backdrop"
          >
            <div
              className="card p-6 w-full max-w-md settings-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-settings-title"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="game-settings-title" className="text-lg font-semibold">
                  Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close settings"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <SettingsPanel settings={settings} onChange={onSettingsChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Player error */}
        {playerError && (
          <div className="card p-4 border-red-500/30 bg-red-500/10 text-red-400 flex items-start gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold mb-0.5">Video Playback Notice</p>
              <p className="text-sm">{playerError}</p>
              <button
                onClick={onExit}
                className="mt-2 text-sm underline hover:text-red-300"
              >
                Go back and try a different video
              </button>
            </div>
          </div>
        )}

        {/* YouTube Player */}
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl youtube-player-container border border-white/10">
          {/* Target container for YouTube iframe */}
          <div
            ref={ytContainerRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Loading overlay */}
          {!ytReady && !playerError && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-900/90 pointer-events-none z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-300">
                  Connecting to YouTube player...
                </p>
              </div>
            </div>
          )}

          {/* Click to start prompt if ready but paused at beginning (solves browser autoplay restriction) */}
          {ytReady &&
            !playerError &&
            (state.phase === "READY" ||
              (ytState !== "playing" && currentPlaybackTime === 0)) && (
              <div
                onClick={handleManualStart}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    handleManualStart();
                }}
                role="button"
                tabIndex={0}
                aria-label="Play video and start typing"
                className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs cursor-pointer z-20 group transition-all"
              >
                <div className="flex flex-col items-center gap-3 bg-navy-900/90 border border-white/15 px-8 py-5 rounded-2xl shadow-2xl group-hover:scale-105 transition-transform">
                  <div className="w-16 h-16 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center text-white text-2xl shadow-xl shadow-accent/40 pl-1">
                    ▶
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-base">
                      Play video and start typing
                    </p>
                    <p className="text-gray-400 text-xs">
                      Captions will follow the video
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Auto-pause overlay */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none z-30"
              >
                <div className="text-center p-4 rounded-xl bg-navy-900/80 border border-yellow-500/30">
                  <div className="text-4xl mb-2">Ⅱ</div>
                  <p className="text-white font-semibold text-lg">
                    Playback is waiting
                  </p>
                  <p className="text-yellow-400 text-sm mt-1">
                    Finish this caption to resume
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video progress */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono w-10 text-right">
            {formatSeconds(currentPlaybackTime)}
          </span>
          <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono w-10">
            {formatSeconds(videoDuration)}
          </span>
        </div>

        {/* Caption Display */}
        <AnimatePresence mode="wait">
          {currentCaption ? (
            <motion.div
              key={currentCaption.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <CaptionDisplay
                caption={currentCaption.text}
                typedText={state.typedText}
                settings={settings}
                isPaused={isPaused}
              />
            </motion.div>
          ) : (
            <div className="card p-6 text-center text-gray-500">
              {state.phase === "SESSION_FINISHED"
                ? "Session complete."
                : state.phase === "READY"
                  ? "Ready to start!"
                  : "Waiting for next caption..."}
            </div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <StatsBar state={state} showWpmLive={settings.showWpmLive} />

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Play/Pause toggle (only for manual pause, not auto-pause) */}
          {state.phase !== "PAUSED_FOR_TYPING" && (
            <button
              onClick={handleTogglePause}
              disabled={!ytReady}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40"
              aria-label={isSessionPaused ? "Resume" : "Pause"}
            >
              {isSessionPaused ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Resume
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Pause
                </>
              )}
            </button>
          )}

          <button
            onClick={handleRestart}
            className="btn-secondary flex items-center gap-2"
            aria-label="Restart"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Restart
          </button>

          {/* Caption navigation hint */}
          <span className="text-xs text-gray-500 ml-auto">
            Press{" "}
            <kbd className="bg-navy-700 px-1.5 py-0.5 rounded text-gray-400 border border-white/10">
              Esc
            </kbd>{" "}
            to exit
          </span>
        </div>

        {/* Caption list preview */}
        <CaptionListPreview
          captions={captions}
          currentIndex={state.currentCaptionIndex}
          completedCount={state.captionsCompleted}
        />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    READY: { label: "Ready", cls: "bg-gray-500/20 text-gray-400" },
    PLAYING: { label: "Playing", cls: "bg-green-500/20 text-green-400" },
    WAITING_FOR_INPUT: {
      label: "Waiting",
      cls: "bg-blue-500/20 text-blue-400",
    },
    PAUSED_FOR_TYPING: {
      label: "Type to resume",
      cls: "bg-yellow-500/20 text-yellow-400",
    },
    CAPTION_COMPLETED: { label: "Done", cls: "bg-cyan-500/20 text-cyan-400" },
    SESSION_PAUSED: {
      label: "Paused",
      cls: "bg-purple-500/20 text-purple-400",
    },
    SESSION_FINISHED: {
      label: "Finished",
      cls: "bg-green-500/20 text-green-400",
    },
    ERROR: { label: "Error", cls: "bg-red-500/20 text-red-400" },
  };
  const cfg = configs[phase] ?? {
    label: phase,
    cls: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function CaptionListPreview({
  captions,
  currentIndex,
  completedCount,
}: {
  captions: { id: string; text: string }[];
  currentIndex: number;
  completedCount: number;
}) {
  const nearby = captions.slice(
    Math.max(0, currentIndex - 1),
    Math.min(captions.length, currentIndex + 4),
  );

  return (
    <div className="card p-4 space-y-2 caption-list">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
        Upcoming captions ({completedCount}/{captions.length})
      </p>
      {nearby.map((cap, idx) => {
        const globalIdx = Math.max(0, currentIndex - 1) + idx;
        const isDone = globalIdx < currentIndex;
        const isCurrent = globalIdx === currentIndex;
        return (
          <p
            key={cap.id}
            className={`text-sm font-mono truncate transition-colors ${
              isCurrent
                ? "text-white font-semibold"
                : isDone
                  ? "text-gray-600 line-through"
                  : "text-gray-500"
            }`}
          >
            {isCurrent && <span className="text-accent mr-2">›</span>}
            {cap.text}
          </p>
        );
      })}
    </div>
  );
}
