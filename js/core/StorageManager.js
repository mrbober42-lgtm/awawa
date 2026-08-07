/**
 * StorageManager - Handles localStorage operations for Baklava
 * Manages state persistence for icons, widgets, permissions, settings, theme, etc.
 */

export class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'baklava_state';
    this.defaultState = {
      desktopIcons: [],
      widgets: [],
      permissions: {},
      panelSettings: {
        notifications: 'edge', // 'off', 'hover', 'edge'
        qs: 'edge',
        launcher: 'edge',
        powerMenu: 'edge',
        volume: 'hover',
        modules: 'edge'
      },
      theme: 'dark',
      accentColor: '#D0BCFF',
      wallpaper: null,
      frameCornerRadius: 24,
      installedApps: []
    };
    this.state = this.load();
  }

  /**
   * Load state from localStorage or return default
   */
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultState, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load Baklava state:', e);
    }
    return { ...this.defaultState };
  }

  /**
   * Save current state to localStorage
   */
  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save Baklava state:', e);
    }
  }

  /**
   * Get a value by key path (e.g., 'panelSettings.notifications')
   */
  get(keyPath, defaultValue = null) {
    const keys = keyPath.split('.');
    let value = this.state;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    return value;
  }

  /**
   * Set a value by key path
   */
  set(keyPath, value) {
    const keys = keyPath.split('.');
    let obj = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in obj) || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      obj = obj[key];
    }
    obj[keys[keys.length - 1]] = value;
    this.save();
  }

  /**
   * Reset state to defaults
   */
  reset() {
    this.state = { ...this.defaultState };
    this.save();
  }

  /**
   * Clear all stored data
   */
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.state = { ...this.defaultState };
  }
}
