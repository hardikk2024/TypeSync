import { useMemo } from "react";
import type { GameSettings } from "../types";
import { getCharacterStates } from "../engine/gameEngine";

interface CaptionDisplayProps {
  caption: string;
  typedText: string;
  settings: GameSettings;
  isPaused: boolean;
}

const fontSizeClasses = {
  sm: "text-lg md:text-xl",
  md: "text-xl md:text-2xl",
  lg: "text-2xl md:text-3xl",
  xl: "text-3xl md:text-4xl",
};

export default function CaptionDisplay({
  caption,
  typedText,
  settings,
  isPaused,
}: CaptionDisplayProps) {
  const charStates = useMemo(
    () => getCharacterStates(typedText, caption, settings),
    [typedText, caption, settings],
  );

  const fontSize = fontSizeClasses[settings.fontSize];

  return (
    <div
      className={`relative card p-6 md:p-8 transition-all duration-300 caption-panel ${
        isPaused ? "ring-2 ring-yellow-500/50 shadow-yellow-500/10" : ""
      }`}
      aria-label="Caption to type"
      aria-live="polite"
    >
      {isPaused && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          Playback waiting. Keep typing.
        </div>
      )}

      <div
        className={`font-mono leading-relaxed tracking-wide select-none ${fontSize}`}
        role="text"
      >
        {charStates.map((state, i) => {
          const char = caption[i];
          // Handle spaces specially for visibility
          if (char === " " && state === "current") {
            return (
              <span
                key={i}
                className="inline-block w-3 border-b-2 border-accent animate-pulse mx-0.5"
              >
                &nbsp;
              </span>
            );
          }

          return (
            <span
              key={i}
              className={
                state === "correct"
                  ? "caption-char-correct"
                  : state === "incorrect"
                    ? "caption-char-incorrect"
                    : state === "current"
                      ? "caption-char-current"
                      : "caption-char-untyped"
              }
            >
              {char}
            </span>
          );
        })}
        {/* Cursor at end when all typed */}
        {typedText.length >= caption.length && (
          <span className="inline-block w-0.5 h-6 bg-accent animate-pulse ml-0.5 align-middle" />
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 bg-navy-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-100"
          style={{
            width: `${Math.min(100, (typedText.length / Math.max(caption.length, 1)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
