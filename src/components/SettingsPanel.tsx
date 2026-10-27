import type { GameSettings } from "../types";
import { saveSettings } from "../utils/storage";

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
            checked ? "bg-accent" : "bg-navy-600"
          }`}
        />
        <div
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      <div>
        <span className="text-sm font-medium text-white">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

export default function SettingsPanel({
  settings,
  onChange,
}: SettingsPanelProps) {
  const update = (patch: Partial<GameSettings>) => {
    const updated = { ...settings, ...patch };
    onChange(updated);
    saveSettings(updated);
  };

  return (
    <div className="space-y-5">
      <Toggle
        label="Case Sensitive"
        description="Requires you to match upper/lowercase exactly"
        checked={settings.caseSensitive}
        onChange={(v) => update({ caseSensitive: v })}
      />
      <Toggle
        label="Ignore Punctuation"
        description="Skip punctuation characters when matching"
        checked={settings.ignorePunctuation}
        onChange={(v) => update({ ignorePunctuation: v })}
      />
      <Toggle
        label="Strict Mode"
        description="Incorrect characters must be corrected before advancing"
        checked={settings.strictMode}
        onChange={(v) => update({ strictMode: v })}
      />
      <Toggle
        label="Show Live WPM"
        description="Display words per minute in real time"
        checked={settings.showWpmLive}
        onChange={(v) => update({ showWpmLive: v })}
      />
      <Toggle
        label="Reduced Motion"
        description="Minimize animations for accessibility"
        checked={settings.reducedMotion}
        onChange={(v) => update({ reducedMotion: v })}
      />

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Font Size
        </label>
        <div className="flex gap-2">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <button
              key={size}
              onClick={() => update({ fontSize: size })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors uppercase
                ${
                  settings.fontSize === size
                    ? "bg-accent text-white"
                    : "bg-navy-700 text-gray-400 hover:text-white"
                }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
