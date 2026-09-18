'use client';

import type { PanelSettings, SettingsPreset } from './panelSettings';
import { applySettingsPreset } from './panelSettings';

const MINI_CHECKBOX =
  'm-0 h-[0.85em] w-[0.85em] shrink-0 appearance-auto accent-sky-500';

function SettingToggle({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-1 py-0.5 ${
        disabled ? 'cursor-not-allowed text-zinc-600' : 'cursor-pointer text-zinc-400 hover:text-zinc-200'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={MINI_CHECKBOX}
      />
      <span>{label}</span>
    </label>
  );
}

function PresetChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
        active
          ? 'bg-sky-900/60 text-sky-200 ring-1 ring-sky-500/40'
          : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  );
}

export type SettingsPanelProps = {
  open: boolean;
  onToggleOpen: () => void;
  settings: PanelSettings;
  activePreset: SettingsPreset | null;
  onPreset: (preset: SettingsPreset) => void;
  onChange: (patch: Partial<PanelSettings>) => void;
  inspectMode: boolean;
  onInspectChange: (value: boolean) => void;
  /** Focus mode shows full downstream tree; filter toggles are ignored. */
  filterLocked?: boolean;
};

export function SettingsPanel({
  open,
  onToggleOpen,
  settings,
  activePreset,
  onPreset,
  onChange,
  inspectMode,
  onInspectChange,
  filterLocked = false,
}: SettingsPanelProps) {
  return (
    <div className="shrink-0 border-t border-white/10 bg-zinc-950/80">
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between px-1.5 py-1 text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1">
          <span className="text-[10px]">{open ? '▾' : '▸'}</span>
          <span>settings</span>
        </span>
        <span className="text-[10px] text-zinc-600">presets · tree · filter</span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-white/5 px-1.5 pb-1.5 pt-1">
          <div className="flex flex-wrap gap-1">
            {(['default', 'audit', 'navigate', 'debug'] as SettingsPreset[]).map((preset) => (
              <PresetChip
                key={preset}
                label={preset}
                active={activePreset === preset}
                onClick={() => onPreset(preset)}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wide text-zinc-600">tree</p>
              <SettingToggle
                checked={settings.showImportCount}
                label="import count →"
                onChange={(value) => onChange({ showImportCount: value })}
              />
              <SettingToggle
                checked={settings.showImporterCount}
                label="importer count ←"
                onChange={(value) => onChange({ showImporterCount: value })}
              />
              <SettingToggle
                checked={settings.showLineCount}
                label="lines of code"
                onChange={(value) => onChange({ showLineCount: value })}
              />
              <SettingToggle
                checked={settings.showGraphDepth}
                label="graph depth"
                onChange={(value) => onChange({ showGraphDepth: value })}
              />
              <SettingToggle
                checked={settings.showFullPath}
                label="full path"
                onChange={(value) => onChange({ showFullPath: value })}
              />
              <SettingToggle
                checked={settings.showSmellNotes}
                label="smell notes"
                onChange={(value) => onChange({ showSmellNotes: value })}
              />
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wide text-zinc-600">filter</p>
              {filterLocked ? (
                <SettingToggle
                  checked={settings.focusTransitive}
                  label="transitive downstream"
                  onChange={(value) => onChange({ focusTransitive: value })}
                />
              ) : null}
              <SettingToggle
                checked={settings.smellsOnly}
                label="smells only"
                disabled={filterLocked}
                onChange={(value) => onChange({ smellsOnly: value })}
              />
              <SettingToggle
                checked={settings.sortSmellsFirst}
                label="sort smells first"
                onChange={(value) => onChange({ sortSmellsFirst: value })}
              />
              <SettingToggle
                checked={settings.hideShared}
                label="hide lib / logic"
                disabled={filterLocked}
                onChange={(value) => onChange({ hideShared: value })}
              />
              <SettingToggle
                checked={settings.showNoDomTag}
                label="no DOM tag"
                onChange={(value) => onChange({ showNoDomTag: value })}
              />
              <p className="pt-1 text-[10px] uppercase tracking-wide text-zinc-600">page</p>
              <SettingToggle
                checked={inspectMode}
                label="inspect mode (also header · I)"
                onChange={onInspectChange}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function detectActivePreset(settings: PanelSettings): SettingsPreset | null {
  for (const preset of ['audit', 'navigate', 'debug', 'default'] as SettingsPreset[]) {
    const expected = applySettingsPreset(preset);
    const matches = (Object.keys(expected) as (keyof PanelSettings)[]).every(
      (key) => settings[key] === expected[key],
    );
    if (matches) return preset;
  }
  return null;
}
