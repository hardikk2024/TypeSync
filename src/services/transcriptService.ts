import type { Caption, Transcript } from "../types";

/**
 * TranscriptService provides a clean interface for obtaining transcripts.
 *
 * Strategy (in order):
 *  1. User-supplied transcript (paste/upload) — always available
 *  2. YouTube Data API captions (requires OAuth, not available in client-only builds)
 *  3. Third-party caption services — reserved for future server-side integration
 *
 * Honest limitation: YouTube does not expose public captions directly from the browser
 * without OAuth credentials. We do NOT fabricate captions or pretend auto-captions work
 * when they don't. Instead, we provide a clear fallback.
 */

// ─── Transcript Parser ────────────────────────────────────────────────────────

/**
 * Parses SRT format into Caption objects.
 *
 * SRT format:
 *   1
 *   00:00:01,000 --> 00:00:04,500
 *   Some caption text
 *
 *   2
 *   ...
 */
export function parseSRT(srtContent: string): Caption[] {
  const captions: Caption[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    // Line 0: index (optional)
    // Line 1: timestamp
    // Line 2+: text
    const timestampLine = lines.find((l) => l.includes("-->"));
    if (!timestampLine) continue;

    const [startStr, endStr] = timestampLine.split("-->").map((s) => s.trim());
    const startTime = parseSRTTime(startStr);
    const endTime = parseSRTTime(endStr);
    if (isNaN(startTime) || isNaN(endTime)) continue;

    const textLines = lines.filter(
      (l) => !l.includes("-->") && !/^\d+$/.test(l.trim()),
    );
    const text = textLines.join(" ").trim();
    if (!text) continue;

    const id = `caption-${captions.length}`;
    captions.push({ id, startTime, endTime, text });
  }

  return captions;
}

function parseSRTTime(timeStr: string): number {
  // HH:MM:SS,mmm or HH:MM:SS.mmm
  const normalized = timeStr.replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length !== 3) return NaN;
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parses WebVTT format into Caption objects.
 */
export function parseWebVTT(vttContent: string): Caption[] {
  const captions: Caption[] = [];
  const lines = vttContent.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  // skip WEBVTT header
  while (i < lines.length && !lines[i].includes("-->")) i++;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Check for cue identifier line (optional)
    let timestampLine = line;
    if (!line.includes("-->")) {
      // This is a cue identifier
      i++;
      if (i >= lines.length) break;
      timestampLine = lines[i].trim();
    }

    if (!timestampLine.includes("-->")) {
      i++;
      continue;
    }

    const [startStr, endAndSettings] = timestampLine.split("-->");
    const endStr = endAndSettings.trim().split(/\s+/)[0]; // handle leading space and cue settings
    const startTime = parseVTTTime(startStr.trim());
    const endTime = parseVTTTime(endStr.trim());
    if (isNaN(startTime) || isNaN(endTime)) {
      i++;
      continue;
    }

    i++;
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i].replace(/<[^>]*>/g, "")); // strip HTML tags
      i++;
    }

    const text = textLines.join(" ").trim();
    if (text) {
      captions.push({
        id: `caption-${captions.length}`,
        startTime,
        endTime,
        text,
      });
    }
  }

  return captions;
}

function parseVTTTime(timeStr: string): number {
  // HH:MM:SS.mmm or MM:SS.mmm
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    return (
      parseFloat(parts[0]) * 3600 +
      parseFloat(parts[1]) * 60 +
      parseFloat(parts[2])
    );
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return NaN;
}

/**
 * Parses a plain timestamped text format:
 *   [0:01] Hello world
 *   [0:05] This is the next line
 * or
 *   00:01 Hello world
 */
export function parseTimestampedText(content: string): Caption[] {
  const captions: Caption[] = [];
  const lines = content.split("\n").filter((l) => l.trim());

  const patterns = [
    /^\[(\d+:\d+(?:\.\d+)?)\]\s*(.+)$/, // [MM:SS] or [MM:SS.ms]
    /^(\d+:\d+(?:\.\d+)?)\s+(.+)$/, // MM:SS text
    /^(\d+:\d+:\d+(?:\.\d+)?)\s+(.+)$/, // HH:MM:SS text
  ];

  const parsed: { time: number; text: string }[] = [];
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const time = parseVTTTime(match[1].replace("[", "").replace("]", ""));
        parsed.push({ time, text: match[2].trim() });
        break;
      }
    }
  }

  for (let i = 0; i < parsed.length; i++) {
    const next = parsed[i + 1];
    captions.push({
      id: `caption-${i}`,
      startTime: parsed[i].time,
      endTime: next ? next.time : parsed[i].time + 5,
      text: parsed[i].text,
    });
  }

  return captions;
}

/**
 * Parses plain text (no timestamps) into fixed-duration captions.
 * Each sentence or line becomes a caption with estimated timing.
 */
export function parsePlainText(
  content: string,
  secondsPerCaption = 5,
): Caption[] {
  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  return lines.map((text, i) => ({
    id: `caption-${i}`,
    startTime: i * secondsPerCaption,
    endTime: (i + 1) * secondsPerCaption,
    text,
  }));
}

/**
 * Auto-detects format and parses.
 */
export function parseTranscript(content: string, videoId: string): Transcript {
  const trimmed = content.trim();
  let captions: Caption[] = [];

  if (trimmed.startsWith("WEBVTT")) {
    captions = parseWebVTT(trimmed);
  } else if (/^\d+\s*\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->/.test(trimmed)) {
    captions = parseSRT(trimmed);
  } else if (/\[\d+:\d+\]|\d+:\d+\s+\w/.test(trimmed.split("\n")[0])) {
    captions = parseTimestampedText(trimmed);
  } else {
    captions = parsePlainText(trimmed);
  }

  return {
    videoId,
    captions,
    source: "manual",
  };
}

/**
 * Gets the active caption index for a given playback time.
 */
export function getActiveCaptionIndex(
  captions: Caption[],
  currentTime: number,
): number {
  for (let i = 0; i < captions.length; i++) {
    if (
      currentTime >= captions[i].startTime &&
      currentTime < captions[i].endTime
    ) {
      return i;
    }
  }
  // Check if we're between captions — return the upcoming one
  for (let i = 0; i < captions.length; i++) {
    if (currentTime < captions[i].startTime) {
      return i;
    }
  }
  return -1; // past all captions
}

/**
 * Sample transcript for demo/testing purposes.
 * This is a demonstration transcript for a hypothetical video.
 */
export const SAMPLE_TRANSCRIPT: Omit<Transcript, "videoId"> = {
  language: "en",
  source: "manual",
  captions: [
    {
      id: "c0",
      startTime: 0,
      endTime: 5,
      text: "Welcome to TypeSync the ultimate typing game",
    },
    {
      id: "c1",
      startTime: 5,
      endTime: 10,
      text: "Listen to the video and type what you hear",
    },
    {
      id: "c2",
      startTime: 10,
      endTime: 15,
      text: "The video pauses if you fall behind",
    },
    {
      id: "c3",
      startTime: 15,
      endTime: 20,
      text: "Complete each caption to keep the rhythm",
    },
    {
      id: "c4",
      startTime: 20,
      endTime: 25,
      text: "Your speed and accuracy are tracked live",
    },
    {
      id: "c5",
      startTime: 25,
      endTime: 30,
      text: "Reach the end to see your final score",
    },
  ],
};

/**
 * Fetches automatic transcripts from the backend endpoint powered by open-source YouTube transcript tools.
 */
export async function fetchAutoTranscript(
  videoId: string,
  lang: string = "en",
): Promise<{ transcript: Transcript; videoTitle: string }> {
  const res = await fetch(
    `/api/transcript?videoId=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`,
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Could not fetch captions for video ${videoId}`,
    );
  }
  const data = await res.json();
  return {
    transcript: {
      videoId: data.videoId,
      language: data.language,
      captions: data.captions,
      source: "auto",
    },
    videoTitle: data.videoTitle || "YouTube Video",
  };
}
