/**
 * BaklavaCore - Main core class that initializes and coordinates all managers
 */

import { StorageManager } from './StorageManager.js';
import { ThemeManager } from './ThemeManager.js';
import { FrameManager } from '../managers/FrameManager.js';
import { PanelManager } from '../managers/PanelManager.js';
import { WindowManager } from '../managers/WindowManager.js';
import { AppManager } from '../managers/AppManager.js';
import { PermissionManager } from '../managers/PermissionManager.js';
import { NotificationManager } from '../managers/NotificationManager.js';
import { WidgetManager } from '../managers/WidgetManager.js';
import { ModalManager } from '../managers/ModalManager.js';
import { PopupManager } from '../managers/PopupManager.js';
import { ScreenManager } from '../managers/ScreenManager.js';

export class BaklavaCore {
  constructor() {
    this.initialized = false;
    
    // Core managers
    this.storage = new StorageManager();
    this.theme = new ThemeManager(this.storage);
    this.permissions = new PermissionManager(this.storage);
    
    // UI managers (initialized after core)
    this.frame = null;
    this.panel = null;
    this.window = null;
    this.app = null;
    this.notification = null;
    this.widget = null;
    this.modal = null;
    this.popup = null;
    this.screen = null;
    
    // API object exposed to applications
    this.api = null;
  }

  /**
   * Initialize the entire Baklava system
   */
  async init() {
    if (this.initialized) {
      console.warn('BaklavaCore already initialized');
      return;
    }

    try {
      // Initialize theme first
      this.theme.init();

      // Initialize frame manager (SVG frame)
      this.frame = new FrameManager(this.storage);
      await this.frame.init();

      // Initialize panel manager (drawers)
      this.panel = new PanelManager(this.storage, this.frame);
      await this.panel.init();

      // Initialize window manager
      this.window = new WindowManager(this.storage);
      await this.window.init();

      // Initialize modal manager
      this.modal = new ModalManager();

      // Initialize popup manager
      this.popup = new PopupManager(this.frame);

      // Initialize notification manager
      this.notification = new NotificationManager(this.storage, this.panel);

      // Initialize widget manager
      this.widget = new WidgetManager(this.storage, this.frame);

      // Initialize screen manager
      this.screen = new ScreenManager();

      // Initialize app manager (must be last as it depends on other managers)
      this.app = new AppManager(this.storage, this.window, this.notification, this.widget, this.modal, this.permissions);

      // Create API object for applications
      this.api = this._createAPI();

      // Set up global error handler
      this._setupErrorHandler();

      this.initialized = true;
      console.log('BaklavaCore initialized successfully');

    } catch (error) {
      console.error('Failed to initialize BaklavaCore:', error);
      throw error;
    }
  }

  /**
   * Create the BaklavaAPI object for applications
   */
  _createAPI() {
    const self = this;
    
    return {
      // Permission methods
      requestPermission(permission) {
        return self.permissions.requestPermission(null, permission);
      },

      // Notification methods
      notify(config) {
        return self.notification.show(config);
      },

      // Window methods
      window: {
        setTitle(title) {
          const activeWindow = self.window.getActiveWindow();
          if (activeWindow) {
            activeWindow.setTitle(title);
          }
        },
        setStatusTab(label, icon) {
          const activeWindow = self.window.getActiveWindow();
          if (activeWindow) {
            activeWindow.setStatusTab(label, icon);
          }
        },
        setTrayIcon(icon, label) {
          const activeWindow = self.window.getActiveWindow();
          if (activeWindow) {
            activeWindow.setTrayIcon(icon, label);
          }
        }
      },

      // Tray methods
      tray: {
        addIcon(config) {
          return self.panel.addTrayIcon(config);
        },
        removeIcon(id) {
          self.panel.removeTrayIcon(id);
        },
        updateIcon(id, config) {
          self.panel.updateTrayIcon(id, config);
        }
      },

      // Widget methods
      widgets: {
        register(widgetConfig) {
          return self.widget.registerWidget(widgetConfig);
        },
        showPicker() {
          self.widget.showPicker();
        }
      },

      // Screen methods
      screens: {
        push(screenConfig) {
          return self.screen.push(screenConfig);
        },
        pop() {
          return self.screen.pop();
        }
      },

      // Modal methods
      modal: {
        show(config) {
          return self.modal.show(config);
        }
      },

      // Storage methods (app-specific, namespaced by app ID)
      storage: {
        _appId: null,
        set(key, value) {
          if (!this._appId) {
            console.warn('Storage called without app ID');
            return;
          }
          const storageKey = `app_${this._appId}_${key}`;
          localStorage.setItem(storageKey, JSON.stringify(value));
        },
        get(key) {
          if (!this._appId) {
            console.warn('Storage called without app ID');
            return null;
          }
          const storageKey = `app_${this._appId}_${key}`;
          const stored = localStorage.getItem(storageKey);
          return stored ? JSON.parse(stored) : null;
        }
      }
    };
  }

  /**
   * Set up global error handler
   */
  _setupErrorHandler() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      // Could send to notification manager or log service
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }

  /**
   * Get a copy of state for debugging
   */
  getState() {
    return { ...this.storage.state };
  }

  /**
   * Reset Baklava to default state
   */
  reset() {
    this.storage.reset();
    location.reload();
  }
}

// Export singleton instance
export const baklava = new BaklavaCore();
