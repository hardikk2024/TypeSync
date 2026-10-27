import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { Transcript, GameSettings, SessionRecord } from "../types";
import { extractVideoId, isValidYouTubeUrl } from "../utils/youtubeUrl";
import {
  parseTranscript,
  fetchAutoTranscript,
  SAMPLE_TRANSCRIPT,
} from "../services/transcriptService";
import { getSessions } from "../utils/storage";
import SettingsPanel from "./SettingsPanel";
import ThemeToggle, { type Theme } from "./ThemeToggle";

interface HomeScreenProps {
  onStart: (
    videoId: string,
    transcript: Transcript,
    videoTitle?: string,
  ) => void;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const DEMO_VIDEO_ID = "dQw4w9WgXcQ"; // Rick Astley – Never Gonna Give You Up

export default function HomeScreen({
  onStart,
  settings,
  onSettingsChange,
  theme,
  onToggleTheme,
}: HomeScreenProps) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [transcriptMode, setTranscriptMode] = useState<
    "auto" | "paste" | "upload" | "demo"
  >("auto");
  const [transcriptInput, setTranscriptInput] = useState("");
  const [transcriptError, setTranscriptError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Auto-caption states
  const [isFetchingAuto, setIsFetchingAuto] = useState(false);
  const [autoTranscript, setAutoTranscript] = useState<Transcript | null>(null);
  const [autoVideoTitle, setAutoVideoTitle] = useState("");
  const [autoError, setAutoError] = useState<string | null>(null);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessions: SessionRecord[] = getSessions();

  // Trigger auto-fetch whenever a valid YouTube URL is entered
  const loadAutoCaptions = useCallback(
    async (vid: string) => {
      if (vid === lastFetchedId) return;
      setIsFetchingAuto(true);
      setAutoError(null);
      setAutoTranscript(null);
      setAutoVideoTitle("");

      try {
        const result = await fetchAutoTranscript(vid, "en");
        setAutoTranscript(result.transcript);
        setAutoVideoTitle(result.videoTitle);
        setLastFetchedId(vid);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "No captions found on YouTube for this video.";
        setAutoError(msg);
        setLastFetchedId(vid);
      } finally {
        setIsFetchingAuto(false);
      }
    },
    [lastFetchedId],
  );

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setUrlError("");
    setAutoError(null);

    const vid = extractVideoId(val);
    if (vid) {
      loadAutoCaptions(vid);
    } else {
      setAutoTranscript(null);
      setAutoVideoTitle("");
      setLastFetchedId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTranscriptInput((ev.target?.result as string) ?? "");
      setTranscriptError("");
    };
    reader.readAsText(file);
  };

  const handleStart = async () => {
    setUrlError("");
    setTranscriptError("");

    let videoId: string | null = null;

    if (transcriptMode === "demo") {
      videoId = DEMO_VIDEO_ID;
      onStart(
        videoId,
        { ...SAMPLE_TRANSCRIPT, videoId },
        "Rick Astley - Never Gonna Give You Up",
      );
      return;
    }

    if (!url.trim()) {
      setUrlError("Please paste a YouTube video URL to get started.");
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setUrlError(
        "That doesn’t look like a valid YouTube URL. Supported formats: https://youtu.be/... or https://youtube.com/watch?v=...",
      );
      return;
    }

    videoId = extractVideoId(url)!;
    if (!videoId) {
      setUrlError("Could not extract a video ID from this URL.");
      return;
    }

    // ─── Mode: Auto ─────────────────────────────────────────────────────────
    if (transcriptMode === "auto") {
      if (autoTranscript && autoTranscript.videoId === videoId) {
        onStart(videoId, autoTranscript, autoVideoTitle);
        return;
      }

      // If still fetching or hasn't started yet, fetch now
      setIsFetchingAuto(true);
      setAutoError(null);
      try {
        const result = await fetchAutoTranscript(videoId, "en");
        setAutoTranscript(result.transcript);
        setAutoVideoTitle(result.videoTitle);
        onStart(videoId, result.transcript, result.videoTitle);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "No captions available on YouTube for this video.";
        setAutoError(msg);
        setTranscriptMode("paste");
        setTranscriptError(
          "YouTube does not provide captions for this video. Please paste the lyrics or subtitles below.",
        );
      } finally {
        setIsFetchingAuto(false);
      }
      return;
    }

    // ─── Mode: Paste or Upload ──────────────────────────────────────────────
    const input = transcriptInput.trim();
    if (!input) {
      setTranscriptError(
        "Add a transcript or switch to auto captions to search YouTube.",
      );
      return;
    }

    const transcript = parseTranscript(input, videoId);
    if (transcript.captions.length === 0) {
      setTranscriptError(
        "No captions could be parsed from the provided text. Please check format (SRT, WebVTT, timestamped [0:05], or plain lines).",
      );
      return;
    }

    onStart(
      videoId,
      transcript,
      autoVideoTitle || `YouTube Video (${videoId})`,
    );
  };

  const handleTryDemo = () => {
    setTranscriptMode("demo");
    setUrl("https://www.youtube.com/watch?v=" + DEMO_VIDEO_ID);
  };

  const currentVideoId = extractVideoId(url);

  // Auto-fetch if initial URL is present
  useEffect(() => {
    if (
      currentVideoId &&
      !autoTranscript &&
      !isFetchingAuto &&
      lastFetchedId !== currentVideoId
    ) {
      loadAutoCaptions(currentVideoId);
    }
  }, [
    currentVideoId,
    autoTranscript,
    isFetchingAuto,
    lastFetchedId,
    loadAutoCaptions,
  ]);

  useEffect(() => {
    if (!showSettings) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showSettings]);

  return (
    <div className="min-h-screen flex flex-col home-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-navy-900/60 backdrop-blur-md site-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-bold">T</span>
          </div>
          <span className="text-xl font-bold text-gradient">TypeSync</span>
        </div>
        <div className="header-controls">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
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
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 settings-backdrop">
          <div
            className="card p-6 w-full max-w-md settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-settings-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="home-settings-title" className="text-lg font-semibold">
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
        </div>
      )}

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl mx-auto w-full home-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 home-hero"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-4">
            <span>THE VIDEO TYPING GAME</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight tracking-tight">
            <span className="text-gradient">Hear it. Type it.</span>
            <br />
            <span className="text-white">Keep the rhythm.</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-lg mx-auto">
            Paste any YouTube video link. Captions are fetched and synced
            automatically. Type along with the video. If you fall behind,
            playback waits until you catch up.
          </p>
        </motion.div>

        {/* Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="card p-6 w-full space-y-5 shadow-2xl border border-white/10 setup-card"
        >
          {/* YouTube URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube Video URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="Paste your YouTube video link (e.g. https://youtu.be/24u3NoPvgMw)"
                className={`w-full bg-navy-900 border rounded-xl px-4 py-3.5 text-white placeholder-gray-500
                           focus:outline-none focus:ring-2 transition-all text-sm
                           ${
                             urlError
                               ? "border-red-500/50 focus:ring-red-500/30"
                               : "border-white/10 focus:ring-accent/40 focus:border-accent/50"
                           }`}
              />
              {isFetchingAuto && (
                <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 text-accent text-xs font-medium">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Fetching…</span>
                </div>
              )}
            </div>

            {urlError && (
              <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {urlError}
              </p>
            )}
          </div>

          {/* Transcript Source Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Captions / Lyrics Source
              </label>
              {transcriptMode === "auto" && autoTranscript && (
                <span className="text-xs text-cyan-400 font-medium">
                  ✓ {autoTranscript.captions.length} captions ready
                </span>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              {(["auto", "paste", "upload", "demo"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setTranscriptMode(mode);
                    setTranscriptError("");
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all
                    ${
                      transcriptMode === mode
                        ? "bg-accent text-white shadow-md shadow-accent/20"
                        : "bg-navy-700/60 text-gray-400 hover:text-white hover:bg-navy-600"
                    }`}
                >
                  {mode === "auto"
                    ? "Auto captions"
                    : mode === "paste"
                      ? "Paste text"
                      : mode === "upload"
                        ? "Upload file"
                        : "Try demo"}
                </button>
              ))}
            </div>

            {/* TAB: Auto Captions */}
            {transcriptMode === "auto" && (
              <div className="space-y-3">
                {currentVideoId ? (
                  <div className="bg-navy-900/80 border border-white/10 rounded-xl p-4 transition-all">
                    {isFetchingAuto ? (
                      <div className="flex items-center gap-3 py-4 justify-center text-gray-300">
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">
                          Searching open-source transcript providers for YouTube
                          captions…
                        </span>
                      </div>
                    ) : autoTranscript ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={`https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`}
                            alt="Thumbnail"
                            className="w-20 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white truncate">
                              {autoVideoTitle || `Video ${currentVideoId}`}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full font-medium">
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {autoTranscript.captions.length} synced captions
                              </span>
                              {autoTranscript.language && (
                                <span className="text-xs text-gray-400 uppercase">
                                  ({autoTranscript.language})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lyric Preview snippet */}
                        <div className="bg-navy-800/80 rounded-lg p-2.5 text-xs text-gray-300 font-mono border border-white/5 space-y-1">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-sans mb-1">
                            Transcript Preview
                          </p>
                          {autoTranscript.captions.slice(0, 3).map((cap, i) => (
                            <p key={cap.id} className="truncate text-gray-300">
                              <span className="text-accent mr-2">{i + 1}.</span>
                              {cap.text}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : autoError ? (
                      <div className="text-sm text-yellow-400/90 bg-yellow-400/10 border border-yellow-400/20 p-3.5 rounded-lg space-y-2">
                        <p className="font-semibold flex items-center gap-1.5">
                          Auto captions unavailable
                        </p>
                        <p className="text-xs text-gray-300">{autoError}</p>
                        <button
                          type="button"
                          onClick={() => setTranscriptMode("paste")}
                          className="text-xs font-semibold text-accent hover:underline inline-block mt-1"
                        >
                          Paste a transcript instead
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">
                        Enter a YouTube URL above to fetch synced lyrics
                        automatically.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-xs text-gray-300">
                    <p className="font-semibold text-accent mb-1 flex items-center gap-1.5">
                      Automatic caption search
                    </p>
                    <p>
                      Paste any YouTube link above (songs, interviews,
                      speeches). TypeSync automatically extracts the official
                      captions & timestamps so you can start typing immediately!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Paste */}
            {transcriptMode === "paste" && (
              <textarea
                value={transcriptInput}
                onChange={(e) => {
                  setTranscriptInput(e.target.value);
                  setTranscriptError("");
                }}
                placeholder={`Paste your lyrics or transcript here. Supported formats:\n\n• SRT subtitles\n• WebVTT captions\n• Timestamped text: [0:05] Hello world\n• Plain text (one line per caption)`}
                rows={7}
                className={`w-full bg-navy-900 border rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm
                           font-mono resize-none focus:outline-none focus:ring-2 transition-colors
                           ${
                             transcriptError
                               ? "border-red-500/50 focus:ring-red-500/30"
                               : "border-white/10 focus:ring-accent/40 focus:border-accent/50"
                           }`}
              />
            )}

            {/* TAB: Upload */}
            {transcriptMode === "upload" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-accent/40 rounded-xl p-8
                           text-center cursor-pointer transition-colors group bg-navy-900/40"
              >
                <svg
                  className="w-10 h-10 mx-auto mb-3 text-gray-500 group-hover:text-accent transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-gray-300 group-hover:text-white transition-colors text-sm font-medium">
                  {transcriptInput
                    ? "File loaded. Click to replace"
                    : "Click to upload .srt, .vtt, or .txt file"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".srt,.vtt,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* TAB: Demo */}
            {transcriptMode === "demo" && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-sm text-gray-300">
                <p className="font-medium text-accent mb-1">Sample session</p>
                <p className="text-xs text-gray-400">
                  A short preloaded video and transcript, ready to play.
                </p>
              </div>
            )}

            {transcriptError && (
              <p className="mt-2 text-sm text-red-400 flex items-start gap-1.5">
                <svg
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {transcriptError}
              </p>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={isFetchingAuto}
            className="btn-primary w-full text-base md:text-lg py-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isFetchingAuto ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Loading captions...</span>
              </>
            ) : transcriptMode === "demo" ? (
              "Play demo"
            ) : (
              "Start typing"
            )}
          </button>

          {transcriptMode !== "demo" && (
            <button
              type="button"
              onClick={handleTryDemo}
              className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-1 text-center"
            >
              Try a sample session with preloaded captions
            </button>
          )}
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 grid grid-cols-3 gap-3 w-full feature-grid"
        >
          {[
            { icon: "01", title: "Watch", desc: "Play a YouTube video" },
            { icon: "02", title: "Type", desc: "Follow each caption" },
            { icon: "03", title: "Improve", desc: "Track speed and accuracy" },
          ].map((item) => (
            <div
              key={item.title}
              className="glass rounded-xl p-3.5 text-center"
            >
              <div className="text-2xl mb-1.5">{item.icon}</div>
              <div className="text-xs font-semibold text-white mb-0.5">
                {item.title}
              </div>
              <div className="text-[11px] text-gray-400">{item.desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 w-full history-list"
          >
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              Recent Sessions
            </h3>
            <div className="space-y-2">
              {sessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="glass rounded-xl p-3 flex items-center gap-3"
                >
                  <img
                    src={`https://img.youtube.com/vi/${session.videoId}/default.jpg`}
                    alt=""
                    className="w-12 h-9 object-cover rounded-lg bg-navy-700 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate font-medium">
                      {session.videoTitle ?? `Video ${session.videoId}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {session.results.wpm} WPM, {session.results.accuracy}%
                      accuracy, grade {session.results.rating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
