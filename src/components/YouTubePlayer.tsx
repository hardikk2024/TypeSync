import { useYouTubePlayer } from "../hooks/useYouTubePlayer";

interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: string) => void;
  onError?: (code: number) => void;
  onTimeUpdate?: (time: number) => void;
  className?: string;
}

/**
 * YouTubePlayer renders the official YouTube IFrame player.
 * Playback controls are exposed through imperative methods via a ref,
 * but here we simply render the container div that the IFrame API targets.
 */
export default function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  onError,
  onTimeUpdate,
  className = "",
}: YouTubePlayerProps) {
  const { containerRef } = useYouTubePlayer({
    videoId,
    onReady,
    onStateChange,
    onError,
    onTimeUpdate,
  });

  return (
    <div
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ${className}`}
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
