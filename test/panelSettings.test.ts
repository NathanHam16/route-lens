import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detectActivePreset } from '../src/react/SettingsPanel.js';
import {
  DEFAULT_PANEL_SETTINGS,
  applySettingsPreset,
  loadPanelSettings,
  savePanelSettings,
} from '../src/react/panelSettings.js';

test('presets round-trip through applySettingsPreset', () => {
  for (const preset of ['default', 'audit', 'navigate', 'debug'] as const) {
    const applied = applySettingsPreset(preset);
    assert.equal(detectActivePreset(applied), preset);
  }
});

test('detectActivePreset returns null for custom mixes', () => {
  const custom = { ...applySettingsPreset('audit'), showLineCount: true };
  assert.equal(detectActivePreset(custom), null);
});

test('loadPanelSettings merges stored partials with defaults', () => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;
  const originalSession = globalThis.sessionStorage;

  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  });

  try {
    savePanelSettings({ ...DEFAULT_PANEL_SETTINGS, showLineCount: true });
    const loaded = loadPanelSettings();
    assert.equal(loaded.showLineCount, true);
    assert.equal(loaded.hideShared, DEFAULT_PANEL_SETTINGS.hideShared);
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: originalSession,
    });
  }
});
