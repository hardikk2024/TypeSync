import { useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HomeScreen from "./components/HomeScreen";
import GameScreen from "./components/GameScreen";
import ResultsScreen from "./components/ResultsScreen";
import type { Theme } from "./components/ThemeToggle";
import type { GameResults, Transcript, GameSettings } from "./types";
import { getSettings } from "./utils/storage";

type AppScreen = "home" | "game" | "results";
const THEME_STORAGE_KEY = "typesync_theme";

function getInitialTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [videoId, setVideoId] = useState("");
  const [videoTitle, setVideoTitle] = useState<string | undefined>();
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [results, setResults] = useState<GameResults | null>(null);
  const [settings, setSettings] = useState<GameSettings>(getSettings);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still works when browser storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => (current === "light" ? "dark" : "light"));

  const handleStartGame = (vid: string, trans: Transcript, title?: string) => {
    setVideoId(vid);
    setTranscript(trans);
    setVideoTitle(title);
    setScreen("game");
  };

  const handleGameFinish = (gameResults: GameResults) => {
    setResults(gameResults);
    setScreen("results");
  };

  const handlePlayAgain = () => {
    setScreen("game");
  };

  const handleGoHome = () => {
    setScreen("home");
    setVideoId("");
    setVideoTitle(undefined);
    setTranscript(null);
    setResults(null);
  };

  return (
    <div className="min-h-screen app-root">
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HomeScreen
              onStart={handleStartGame}
              settings={settings}
              onSettingsChange={setSettings}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </motion.div>
        )}
        {screen === "game" && videoId && transcript && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GameScreen
              videoId={videoId}
              videoTitle={videoTitle}
              transcript={transcript}
              settings={settings}
              onSettingsChange={setSettings}
              onFinish={handleGameFinish}
              onExit={handleGoHome}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </motion.div>
        )}
        {screen === "results" && results && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ResultsScreen
              results={results}
              onPlayAgain={handlePlayAgain}
              onGoHome={handleGoHome}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
