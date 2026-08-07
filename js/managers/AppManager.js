/**
 * AppManager - Manages applications, their lifecycle, and API exposure
 */

export class AppManager {
  constructor(storageManager, windowManager, notificationManager, widgetManager, modalManager, permissionManager) {
    this.storage = storageManager;
    this.window = windowManager;
    this.notification = notificationManager;
    this.widget = widgetManager;
    this.modal = modalManager;
    this.permissions = permissionManager;
    
    this.installedApps = new Map();
    this.runningApps = new Map();
    this.appIdCounter = 0;
  }

  async init() {
    // Load installed apps from storage
    this._loadInstalledApps();
    
    // Register built-in apps
    this._registerBuiltinApps();
    
    console.log('AppManager initialized');
  }

  _loadInstalledApps() {
    const installed = this.storage.get('installedApps', []);
    installed.forEach(app => {
      this.installedApps.set(app.id, app);
    });
  }

  _registerBuiltinApps() {
    // Built-in Settings app
    this.registerApp({
      id: 'settings',
      name: 'Настройки',
      icon: 'settings',
      launch: () => this._launchSettings()
    });

    // Built-in Calculator app
    this.registerApp({
      id: 'calculator',
      name: 'Калькулятор',
      icon: 'calculate',
      launch: () => this._launchCalculator()
    });

    // Built-in Clock app
    this.registerApp({
      id: 'clock',
      name: 'Часы',
      icon: 'schedule',
      launch: () => this._launchClock()
    });

    // Built-in Downloads app
    this.registerApp({
      id: 'downloads',
      name: 'Загрузки',
      icon: 'download',
      launch: () => this._launchDownloads()
    });

    // Built-in Accent Colors app
    this.registerApp({
      id: 'accents',
      name: 'Акценты',
      icon: 'palette',
      launch: () => this._launchAccents()
    });
  }

  /**
   * Register an application
   */
  registerApp(config) {
    const app = {
      id: config.id,
      name: config.name,
      icon: config.icon || 'apps',
      version: config.version || '1.0.0',
      launch: config.launch,
      permissions: config.permissions || [],
      content: config.content || null
    };

    this.installedApps.set(app.id, app);
    this._saveInstalledApps();
    return app;
  }

  /**
   * Uninstall an application
   */
  uninstallApp(appId) {
    if (this.installedApps.has(appId)) {
      this.installedApps.delete(appId);
      this.permissions.resetAppPermissions(appId);
      this._saveInstalledApps();
      return true;
    }
    return false;
  }

  /**
   * Launch an application
   */
  async launchApp(appId) {
    const app = this.installedApps.get(appId);
    if (!app) {
      console.warn('App not found:', appId);
      return null;
    }

    // Check/request permissions
    if (app.permissions && app.permissions.length > 0) {
      for (const perm of app.permissions) {
        await this.permissions.requestPermission(appId, perm);
      }
    }

    // Create window
    const winData = this.window.createWindow({
      title: app.name,
      icon: app.icon,
      width: 400,
      height: 350,
      content: typeof app.content === 'function' 
        ? app.content(this._createAppAPI(appId))
        : '<div style="padding: 16px;">Приложение запущено</div>'
    });

    // Track running app
    this.runningApps.set(winData.id, {
      appId,
      windowId: winData.id,
      api: this._createAppAPI(appId)
    });

    // Add to left bar
    this._addRunningAppToBar(winData.id, app.icon, app.name);

    // Call app's launch callback if exists
    if (typeof app.launch === 'function') {
      app.launch(this._createAppAPI(appId));
    }

    return winData;
  }

  /**
   * Create isolated API object for an app
   */
  _createAppAPI(appId) {
    const self = this;
    const runningApp = this.runningApps.values().next().value;
    
    const api = {
      appId,
      
      // Permission methods
      requestPermission(permission) {
        return self.permissions.requestPermission(appId, permission);
      },

      // Notification methods
      notify(config) {
        config.app = config.app || appId;
        return self.notification.show(config);
      },

      // Window methods
      window: {
        setTitle(title) {
          const win = self.window.windows.get(runningApp?.windowId);
          if (win) {
            const titleEl = win.element.querySelector('.title-text');
            if (titleEl) titleEl.textContent = title;
          }
        },
        setStatusTab(label, icon) {
          const win = self.window.windows.get(runningApp?.windowId);
          if (win) {
            const tabEl = win.element.querySelector('.status-tab');
            if (tabEl) {
              tabEl.classList.remove('hidden');
              tabEl.innerHTML = `
                ${icon ? `<span class="material-symbols-outlined">${icon}</span>` : ''}
                <span>${label}</span>
              `;
            }
          }
        },
        setTrayIcon(icon, label) {
          // Could add to system tray
          self.panel?.addTrayIcon({ id: `${appId}_tray`, icon, label });
        }
      },

      // Tray methods
      tray: {
        addIcon(config) {
          config.id = `${appId}_${config.id}`;
          return self.panel?.addTrayIcon(config);
        },
        removeIcon(id) {
          self.panel?.removeTrayIcon(`${appId}_${id}`);
        },
        updateIcon(id, config) {
          self.panel?.updateTrayIcon(`${appId}_${id}`, config);
        }
      },

      // Widget methods
      widgets: {
        register(widgetConfig) {
          widgetConfig.id = `${appId}_${widgetConfig.id}`;
          return self.widget.registerWidget(widgetConfig);
        },
        showPicker() {
          self.widget.showPicker();
        }
      },

      // Screen methods
      screens: {
        push(screenConfig) {
          return self.screen?.push(screenConfig);
        },
        pop() {
          return self.screen?.pop();
        }
      },

      // Modal methods
      modal: {
        show(config) {
          return self.modal.show(config);
        }
      },

      // Storage methods (namespaced by app ID)
      storage: {
        set(key, value) {
          const storageKey = `app_${appId}_${key}`;
          localStorage.setItem(storageKey, JSON.stringify(value));
        },
        get(key) {
          const storageKey = `app_${appId}_${key}`;
          const stored = localStorage.getItem(storageKey);
          return stored ? JSON.parse(stored) : null;
        }
      }
    };

    return api;
  }

  _addRunningAppToBar(windowId, icon, title) {
    if (this.panel) {
      this.panel.addRunningWindow(windowId, icon, title, true);
    }
  }

  _saveInstalledApps() {
    const apps = Array.from(this.installedApps.values());
    this.storage.set('installedApps', apps);
  }

  // Built-in app implementations
  _launchSettings(api) {
    // Settings app content would go here
    console.log('Settings app launched');
  }

  _launchCalculator(api) {
    console.log('Calculator app launched');
  }

  _launchClock(api) {
    console.log('Clock app launched');
  }

  _launchDownloads(api) {
    console.log('Downloads app launched');
  }

  _launchAccents(api) {
    console.log('Accents app launched');
  }

  /**
   * Get installed apps list
   */
  getInstalledApps() {
    return Array.from(this.installedApps.values());
  }

  /**
   * Get running apps list
   */
  getRunningApps() {
    return Array.from(this.runningApps.values());
  }

  /**
   * Close an app
   */
  closeApp(windowId) {
    const runningApp = this.runningApps.get(windowId);
    if (runningApp) {
      this.runningApps.delete(windowId);
      if (this.panel) {
        this.panel.removeRunningWindow(windowId);
      }
    }
  }
}
