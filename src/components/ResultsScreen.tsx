import { motion } from "framer-motion";
import type { GameResults } from "../types";
import { formatTime } from "../utils/scoring";
import ThemeToggle, { type Theme } from "./ThemeToggle";

interface ResultsScreenProps {
  results: GameResults;
  onPlayAgain: () => void;
  onGoHome: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const RATING_CONFIG = {
  S: { color: "text-accent", bg: "bg-accent/10", label: "Outstanding" },
  A: { color: "text-accent", bg: "bg-accent/10", label: "Excellent" },
  B: { color: "text-accent", bg: "bg-accent/10", label: "Strong work" },
  C: { color: "text-accent", bg: "bg-accent/10", label: "Good progress" },
  D: { color: "text-accent", bg: "bg-accent/10", label: "Keep practicing" },
};

export default function ResultsScreen({
  results,
  onPlayAgain,
  onGoHome,
  theme,
  onToggleTheme,
}: ResultsScreenProps) {
  const ratingCfg = RATING_CONFIG[results.rating];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 results-screen">
      <div className="results-theme-control">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
        className="card p-8 w-full max-w-lg"
      >
        {/* Rating */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
            className={`inline-flex flex-col items-center justify-center w-28 h-28 rounded-full ${ratingCfg.bg} border border-white/10 mb-4 result-grade`}
          >
            <span className={`text-2xl font-bold ${ratingCfg.color}`}>
              {results.rating}
            </span>
          </motion.div>
          <h2 className="text-2xl font-bold text-white">{ratingCfg.label}</h2>
          <p className="text-gray-500 text-sm mt-1">Session Complete</p>
        </div>

        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <p className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-1">
            Final Score
          </p>
          <p className="text-5xl font-bold text-gradient">
            {results.score.toLocaleString()}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3 mb-8 result-stats"
        >
          <StatItem
            label="WPM"
            value={results.wpm.toString()}
            sub="words per minute"
            highlight
          />
          <StatItem
            label="Accuracy"
            value={`${results.accuracy}%`}
            sub="keystroke accuracy"
            highlight
          />
          <StatItem
            label="Correct"
            value={results.correctChars.toLocaleString()}
            sub="characters"
          />
          <StatItem
            label="Errors"
            value={results.incorrectChars.toLocaleString()}
            sub="characters"
          />
          <StatItem
            label="Captions"
            value={`${results.captionsCompleted}/${results.totalCaptions}`}
            sub="completed"
          />
          <StatItem
            label="Auto Pauses"
            value={results.autoPauses.toString()}
            sub="times paused"
          />
          <StatItem
            label="Typing Time"
            value={formatTime(results.activeTypingMs)}
            sub="active"
          />
          <StatItem
            label="Best Streak"
            value={results.longestStreak.toString()}
            sub="consecutive correct"
          />
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <button
            onClick={onPlayAgain}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Play Again
          </button>
          <button
            onClick={onGoHome}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            New Video
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatItem({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="glass rounded-xl p-3.5">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-bold font-mono ${highlight ? "text-gradient" : "text-white"}`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
    </div>
  );
}
