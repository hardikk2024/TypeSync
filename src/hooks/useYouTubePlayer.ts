import { useEffect, useRef, useCallback, useState } from "react";

// Extend the Window interface to include YT
declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export type YTPlayerState =
  "unstarted" | "ended" | "playing" | "paused" | "buffering" | "cued";

interface UseYouTubePlayerOptions {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: YTPlayerState) => void;
  onError?: (code: number) => void;
  onTimeUpdate?: (time: number) => void;
}

const YT_STATE_MAP: Record<number, YTPlayerState> = {
  [-1]: "unstarted",
  [0]: "ended",
  [1]: "playing",
  [2]: "paused",
  [3]: "buffering",
  [5]: "cued",
};

/**
 * useYouTubePlayer – wraps the official YouTube IFrame Player API.
 * Uses a persistent container element and robust initialization polling.
 */
export function useYouTubePlayer(options: UseYouTubePlayerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [playerState, setPlayerState] = useState<YTPlayerState>("unstarted");
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const startTimePolling = useCallback(() => {
    if (timeUpdateIntervalRef.current) return;
    timeUpdateIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        const t = player.getCurrentTime();
        optionsRef.current.onTimeUpdate?.(t);
      } catch {
        // Player may be unmounting or transitioning
      }
    }, 100);
  }, []);

  const stopTimePolling = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !window.YT?.Player) return;

    // Destroy existing player if any
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }

    // Create an inner target element so React DOM reconciliation is never broken
    const targetId = `yt-player-${Math.random().toString(36).substring(2, 9)}`;
    containerRef.current.innerHTML = `<div id="${targetId}" style="width: 100%; height: 100%; position: absolute; inset: 0;"></div>`;

    try {
      playerRef.current = new window.YT.Player(targetId, {
        videoId: optionsRef.current.videoId,
        width: "100%",
        height: "100%",
        host: "https://www.youtube.com",
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: YT.PlayerEvent) => {
            setIsReady(true);
            try {
              setDuration(event.target.getDuration());
            } catch {
              // ignore
            }
            optionsRef.current.onReady?.();
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            const state = YT_STATE_MAP[event.data] ?? "unstarted";
            setPlayerState(state);
            if (state === "playing") {
              startTimePolling();
            } else {
              stopTimePolling();
              try {
                const t = event.target.getCurrentTime();
                optionsRef.current.onTimeUpdate?.(t);
              } catch {
                // ignore
              }
            }
            optionsRef.current.onStateChange?.(state);
          },
          onError: (event: YT.OnErrorEvent) => {
            console.error("YouTube Player Error code:", event.data);
            optionsRef.current.onError?.(event.data);
          },
        },
      });
    } catch (e) {
      console.error("Failed to instantiate YT.Player:", e);
    }
  }, [startTimePolling, stopTimePolling]);

  // Initialize and poll until API is ready
  useEffect(() => {
    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkAndInit = () => {
      if (!mounted) return false;
      if (window.YT && window.YT.Player) {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        initPlayer();
        return true;
      }
      return false;
    };

    if (!checkAndInit()) {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        checkAndInit();
      };

      // Ensure iframe API script is attached
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const first = document.getElementsByTagName("script")[0];
        if (first?.parentNode) {
          first.parentNode.insertBefore(tag, first);
        } else {
          document.head.appendChild(tag);
        }
      }

      // Fallback poll
      pollInterval = setInterval(() => {
        checkAndInit();
      }, 150);

      setTimeout(() => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }, 10000);
    }

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      stopTimePolling();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      setIsReady(false);
    };
  }, [options.videoId, initPlayer, stopTimePolling]);

  // Player control methods
  const play = useCallback(() => {
    try {
      playerRef.current?.playVideo();
    } catch {
      // ignore
    }
  }, []);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo();
    } catch {
      // ignore
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    try {
      playerRef.current?.seekTo(seconds, true);
    } catch {
      // ignore
    }
  }, []);

  const getCurrentTime = useCallback((): number => {
    try {
      return playerRef.current?.getCurrentTime() ?? 0;
    } catch {
      return 0;
    }
  }, []);

  const getDuration = useCallback((): number => {
    try {
      return playerRef.current?.getDuration() ?? duration;
    } catch {
      return duration;
    }
  }, [duration]);

  return {
    containerRef,
    playerState,
    isReady,
    duration,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
  };
}
