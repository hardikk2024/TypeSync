import type { GameState } from "../types";
import { calculateWpm, calculateAccuracy, formatTime } from "../utils/scoring";

interface StatsBarProps {
  state: GameState;
  showWpmLive: boolean;
}

export default function StatsBar({ state, showWpmLive }: StatsBarProps) {
  const wpm = showWpmLive
    ? calculateWpm(state.correctChars, state.activeTypingMs)
    : null;
  const accuracy = calculateAccuracy(state.correctChars, state.totalKeystrokes);
  const activeTime = formatTime(state.activeTypingMs);

  return (
    <div className="flex flex-wrap gap-3 justify-center md:justify-start stats-row">
      {showWpmLive && (
        <StatPill
          label="WPM"
          value={wpm?.toString() ?? "0"}
          color="text-accent"
        />
      )}
      <StatPill
        label="Accuracy"
        value={`${accuracy}%`}
        color={
          accuracy >= 90
            ? "text-cyan-400"
            : accuracy >= 75
              ? "text-yellow-400"
              : "text-red-400"
        }
      />
      <StatPill
        label="Captions"
        value={state.captionsCompleted.toString()}
        color="text-white"
      />
      <StatPill
        label="Pauses"
        value={state.autoPauses.toString()}
        color={state.autoPauses > 0 ? "text-yellow-400" : "text-gray-500"}
      />
      <StatPill label="Time" value={activeTime} color="text-gray-300" />
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}
