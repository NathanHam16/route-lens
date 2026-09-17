const SETTINGS_KEY = 'route-lens-panel-settings';

export type PanelSettings = {
  showImportCount: boolean;
  showImporterCount: boolean;
  showLineCount: boolean;
  showGraphDepth: boolean;
  showSmellNotes: boolean;
  showNoDomTag: boolean;
  showFullPath: boolean;
  smellsOnly: boolean;
  sortSmellsFirst: boolean;
  hideShared: boolean;
};

export const DEFAULT_PANEL_SETTINGS: PanelSettings = {
  showImportCount: false,
  showImporterCount: false,
  showLineCount: false,
  showGraphDepth: false,
  showSmellNotes: false,
  showNoDomTag: false,
  showFullPath: false,
  smellsOnly: false,
  sortSmellsFirst: false,
  hideShared: true,
};

export type SettingsPreset = 'default' | 'audit' | 'navigate' | 'debug';

const PRESET_SETTINGS: Record<SettingsPreset, Partial<PanelSettings>> = {
  default: DEFAULT_PANEL_SETTINGS,
  audit: {
    showSmellNotes: true,
    smellsOnly: true,
    sortSmellsFirst: true,
    hideShared: true,
    showImportCount: false,
    showImporterCount: false,
    showLineCount: false,
    showGraphDepth: false,
    showNoDomTag: false,
    showFullPath: false,
  },
  navigate: {
    showImportCount: true,
    showImporterCount: true,
    showGraphDepth: true,
    showFullPath: true,
    smellsOnly: false,
    sortSmellsFirst: false,
    hideShared: true,
    showLineCount: false,
    showSmellNotes: false,
    showNoDomTag: false,
  },
  debug: {
    showImportCount: true,
    showImporterCount: true,
    showLineCount: true,
    showGraphDepth: true,
    showSmellNotes: true,
    showNoDomTag: true,
    showFullPath: true,
    smellsOnly: false,
    sortSmellsFirst: false,
    hideShared: false,
  },
};

function isPanelSettings(value: unknown): value is PanelSettings {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(DEFAULT_PANEL_SETTINGS) as (keyof PanelSettings)[];
  return keys.every((key) => typeof (value as PanelSettings)[key] === 'boolean');
}

export function loadPanelSettings(): PanelSettings {
  if (typeof window === 'undefined') return DEFAULT_PANEL_SETTINGS;
  try {
    const raw = sessionStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_PANEL_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!isPanelSettings(parsed)) return DEFAULT_PANEL_SETTINGS;
    return { ...DEFAULT_PANEL_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_PANEL_SETTINGS;
  }
}

export function savePanelSettings(settings: PanelSettings): void {
  try {
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function applySettingsPreset(preset: SettingsPreset): PanelSettings {
  return { ...DEFAULT_PANEL_SETTINGS, ...PRESET_SETTINGS[preset] };
}

export function patchPanelSettings(patch: Partial<PanelSettings>): PanelSettings {
  const next = { ...loadPanelSettings(), ...patch };
  savePanelSettings(next);
  return next;
}
