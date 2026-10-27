/**
 * YouTubeUrlParser – validates and extracts video IDs from YouTube URLs.
 * Supports: standard watch URLs, youtu.be short links, YouTube Shorts, and bare video IDs.
 */

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const PATTERNS: RegExp[] = [
  /[?&]v=([a-zA-Z0-9_-]{11})/, // ?v=... or &v=...
  /youtu\.be\/([a-zA-Z0-9_-]{11})/, // youtu.be/ID
  /\/shorts\/([a-zA-Z0-9_-]{11})/, // /shorts/ID
  /\/embed\/([a-zA-Z0-9_-]{11})/, // /embed/ID
  /\/v\/([a-zA-Z0-9_-]{11})/, // /v/ID
  /\/live\/([a-zA-Z0-9_-]{11})/, // /live/ID
];

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (VIDEO_ID_REGEX.test(trimmed)) return trimmed;

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(input: string): boolean {
  return extractVideoId(input) !== null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
