import type { SessionRecord, GameSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const SESSIONS_KEY = "typesync_sessions";
const SETTINGS_KEY = "typesync_settings";

// ─── Session History ──────────────────────────────────────────────────────────

export function getSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveSession(session: SessionRecord): void {
  try {
    const sessions = getSessions();
    const updated = [session, ...sessions].slice(0, 20); // keep last 20
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  } catch {
    // storage may be full or unavailable — ignore silently
  }
}

export function clearSessions(): void {
  localStorage.removeItem(SESSIONS_KEY);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as GameSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
