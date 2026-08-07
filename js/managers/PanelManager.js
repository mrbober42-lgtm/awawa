/**
 * PanelManager - Manages panels (drawers), left bar, and system tray
 */

import { FrameManager } from './FrameManager.js';

export class PanelManager {
  constructor(storageManager, frameManager) {
    this.storage = storageManager;
    this.frame = frameManager;
    
    // Panel configurations
    this.panelConfigs = {
      notifications: {
        id: 'notifications',
        side: 'right',
        position: 0.15,
        size: 0.25,
        maxDepth: 380,
        title: 'Уведомления',
        icon: 'notifications',
        trigger: 'edge',
        contentClass: 'panel-notifications'
      },
      qs: {
        id: 'qs',
        side: 'right',
        position: 0.45,
        size: 0.25,
        maxDepth: 420,
        title: 'Быстрые настройки',
        icon: 'tune',
        trigger: 'edge',
        contentClass: 'panel-qs'
      },
      launcher: {
        id: 'launcher',
        side: 'bottom',
        position: 0.5,
        size: 0.6,
        maxDepth: 300,
        title: 'Все приложения',
        icon: 'apps',
        trigger: 'edge',
        contentClass: 'panel-launcher'
      },
      powerMenu: {
        id: 'powerMenu',
        side: 'right',
        position: 0.7,
        size: 0.15,
        maxDepth: 280,
        title: 'Питание',
        icon: 'power_settings_new',
        trigger: 'edge',
        contentClass: 'panel-power-menu'
      },
      volume: {
        id: 'volume',
        side: 'right',
        position: 0.85,
        size: 0.12,
        maxDepth: 240,
        title: 'Громкость',
        icon: 'volume_up',
        trigger: 'hover',
        contentClass: 'panel-volume'
      },
      modules: {
        id: 'modules',
        side: 'top',
        position: 0.5,
        size: 0.5,
        maxDepth: 250,
        title: 'Modules',
        icon: 'extension',
        trigger: 'edge',
        contentClass: 'panel-modules'
      }
    };
    
    // Tray icons
    this.trayIcons = new Map();
    this.appTrayIcons = new Map();
    
    // DOM elements
    this.container = null;
    this.leftBar = null;
    this.panels = new Map();
  }

  /**
   * Initialize panel manager
   */
  async init() {
    this.container = document.getElementById('panelContentContainer');
    this.leftBar = document.getElementById('leftBar');
    
    if (!this.container || !this.leftBar) {
      console.error('Panel container elements not found');
      return;
    }
    
    // Build left bar
    this._buildLeftBar();
    
    // Register panels with frame
    Object.values(this.panelConfigs).forEach(config => {
      this.frame.registerPanel(config);
      this._createPanelElement(config);
    });
    
    // Set up edge detection for hover panels
    this._setupEdgeDetection();
    
    // Load saved panel settings
    this._loadPanelSettings();
    
    console.log('PanelManager initialized');
  }

  /**
   * Build the left bar (Bar) UI
   */
  _buildLeftBar() {
    this.leftBar.innerHTML = '';
    
    // Top section - Desktop indicator & All apps
    const topSection = document.createElement('div');
    topSection.className = 'left-bar-section';
    topSection.innerHTML = `
      <div class="bar-icon" id="desktopIndicator" title="Рабочий стол">
        <span class="material-symbols-outlined">desktop_windows</span>
      </div>
      <div class="bar-icon" id="allAppsBtn" title="Все приложения">
        <span class="material-symbols-outlined">apps</span>
      </div>
    `;
    
    // Middle section - Running windows (populated dynamically)
    const middleSection = document.createElement('div');
    middleSection.className = 'left-bar-section middle';
    middleSection.id = 'runningWindows';
    
    // Bottom section
    const bottomSection = document.createElement('div');
    bottomSection.className = 'left-bar-section';
    bottomSection.innerHTML = `
      <div class="bar-divider"></div>
      <div id="systemTray"></div>
      <div class="bar-divider"></div>
      <div id="appTray"></div>
      <div class="bar-icon" id="minimizeAllBtn" title="Свернуть все">
        <span class="material-symbols-outlined">horizontal_rule</span>
      </div>
    `;
    
    this.leftBar.appendChild(topSection);
    this.leftBar.appendChild(middleSection);
    this.leftBar.appendChild(bottomSection);
    
    // Set up event listeners
    this._setupLeftBarListeners();
    
    // Add default system tray items
    this._addSystemTrayItems();
  }

  /**
   * Set up left bar event listeners
   */
  _setupLeftBarListeners() {
    // Desktop indicator
    const desktopIndicator = document.getElementById('desktopIndicator');
    if (desktopIndicator) {
      desktopIndicator.addEventListener('click', () => {
        // Show desktop / minimize all
        window.baklava?.window?.minimizeAll();
      });
    }
    
    // All apps button
    const allAppsBtn = document.getElementById('allAppsBtn');
    if (allAppsBtn) {
      allAppsBtn.addEventListener('click', () => {
        this.togglePanel('launcher');
      });
    }
    
    // Minimize all button
    const minimizeAllBtn = document.getElementById('minimizeAllBtn');
    if (minimizeAllBtn) {
      minimizeAllBtn.addEventListener('click', () => {
        window.baklava?.window?.minimizeAll();
      });
    }
  }

  /**
   * Add default system tray items
   */
  _addSystemTrayItems() {
    const systemTray = document.getElementById('systemTray');
    if (!systemTray) return;
    
    systemTray.innerHTML = `
      <div class="bar-tray-item" id="clockTray" title="Время">
        <span class="material-symbols-outlined">schedule</span>
      </div>
      <div class="bar-tray-item" id="batteryTray" title="Батарея">
        <span class="material-symbols-outlined">battery_full</span>
      </div>
      <div class="bar-tray-item" id="networkTray" title="Сеть">
        <span class="material-symbols-outlined">wifi</span>
      </div>
      <div class="bar-tray-item" id="soundTray" title="Звук">
        <span class="material-symbols-outlined">volume_up</span>
      </div>
    `;
    
    // Update clock
    this._updateClock();
    setInterval(() => this._updateClock(), 1000);
    
    // Set up tray item clicks
    const soundTray = document.getElementById('soundTray');
    if (soundTray) {
      soundTray.addEventListener('mouseenter', () => {
        this.openPanel('volume');
      });
      soundTray.addEventListener('mouseleave', () => {
        setTimeout(() => this.closePanel('volume'), 200);
      });
    }
  }

  /**
   * Update clock display
   */
  _updateClock() {
    const clockTray = document.getElementById('clockTray');
    if (clockTray) {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      clockTray.title = time;
    }
  }

  /**
   * Create panel DOM element
   */
  _createPanelElement(config) {
    const panel = document.createElement('div');
    panel.className = `edge-panel ${config.contentClass}`;
    panel.id = `panel-${config.id}`;
    panel.innerHTML = `
      <div class="edge-panel-content">
        <div class="panel-header">
          <span class="panel-title">${config.title}</span>
          <button class="md3-icon-btn panel-close-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="panel-body" id="panel-body-${config.id}">
          ${this._getPanelContent(config.id)}
        </div>
      </div>
    `;
    
    // Close button handler
    const closeBtn = panel.querySelector('.panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePanel(config.id));
    }
    
    this.container.appendChild(panel);
    this.panels.set(config.id, { config, element: panel });
  }

  /**
   * Get panel content HTML
   */
  _getPanelContent(panelId) {
    switch (panelId) {
      case 'notifications':
        return '<div id="notifications-list"></div>';
      
      case 'qs':
        return `
          <div class="qs-grid">
            <div class="qs-tile active" data-setting="wifi">
              <span class="material-symbols-outlined">wifi</span>
              <span>Wi-Fi</span>
            </div>
            <div class="qs-tile" data-setting="bluetooth">
              <span class="material-symbols-outlined">bluetooth</span>
              <span>Bluetooth</span>
            </div>
            <div class="qs-tile" data-setting="darkmode">
              <span class="material-symbols-outlined">dark_mode</span>
              <span>Тёмная тема</span>
            </div>
            <div class="qs-tile" data-setting="airplane">
              <span class="material-symbols-outlined">flight</span>
              <span>Авиарежим</span>
            </div>
          </div>
          <div class="md3-slider-container">
            <input type="range" class="md3-slider" id="brightnessSlider" min="0" max="100" value="80">
            <span style="font-size: 12px; margin-top: 8px;">Яркость</span>
          </div>
        `;
      
      case 'launcher':
        return `
          <div class="launcher-search">
            <input type="text" placeholder="Поиск приложений..." class="md3-search-input">
          </div>
          <div class="launcher-apps-grid" id="launcherAppsGrid"></div>
        `;
      
      case 'powerMenu':
        return `
          <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px;">
            <button class="md3-button" id="restartBtn">
              <span class="material-symbols-outlined">restart_alt</span> Перезагрузка
            </button>
            <button class="md3-button primary" id="shutdownBtn">
              <span class="material-symbols-outlined">power_settings_new</span> Выключение
            </button>
          </div>
        `;
      
      case 'volume':
        return `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-symbols-outlined">volume_up</span>
              <input type="range" class="md3-slider" id="volumeSlider" min="0" max="100" value="70">
            </div>
          </div>
        `;
      
      case 'modules':
        return '<div id="modules-content"></div>';
      
      default:
        return '';
    }
  }

  /**
   * Open a panel
   */
  openPanel(id) {
    const panelData = this.panels.get(id);
    if (!panelData) return;
    
    this.frame.openPanel(id);
    panelData.element.classList.add('active');
  }

  /**
   * Close a panel
   */
  closePanel(id) {
    const panelData = this.panels.get(id);
    if (!panelData) return;
    
    this.frame.closePanel(id);
    panelData.element.classList.remove('active');
  }

  /**
   * Toggle panel
   */
  togglePanel(id) {
    const panelData = this.panels.get(id);
    if (!panelData) return;
    
    this.frame.togglePanel(id);
    if (panelData.element.classList.contains('active')) {
      panelData.element.classList.remove('active');
    } else {
      panelData.element.classList.add('active');
    }
  }

  /**
   * Add tray icon
   */
  addTrayIcon(config) {
    const { id, icon, label, panelContent } = config;
    
    const appTray = document.getElementById('appTray');
    if (!appTray) return;
    
    const trayItem = document.createElement('div');
    trayItem.className = 'bar-tray-item';
    trayItem.id = `tray-${id}`;
    trayItem.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`;
    trayItem.title = label;
    
    if (panelContent) {
      trayItem.classList.add('has-popup');
      this.appTrayIcons.set(id, { config, element: trayItem });
    }
    
    appTray.appendChild(trayItem);
    return trayItem;
  }

  /**
   * Remove tray icon
   */
  removeTrayIcon(id) {
    const trayItem = document.getElementById(`tray-${id}`);
    if (trayItem) {
      trayItem.remove();
    }
    this.appTrayIcons.delete(id);
  }

  /**
   * Update tray icon
   */
  updateTrayIcon(id, config) {
    const trayItem = document.getElementById(`tray-${id}`);
    if (trayItem && config.icon) {
      const iconEl = trayItem.querySelector('.material-symbols-outlined');
      if (iconEl) {
        iconEl.textContent = config.icon;
      }
    }
    if (trayItem && config.label) {
      trayItem.title = config.label;
    }
  }

  /**
   * Set up edge detection for hover panels
   */
  _setupEdgeDetection() {
    let hoverTimeout;
    
    document.addEventListener('mousemove', (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Right edge detection
      if (w - x < 15 && x > 64) {
        // Find which panel to open based on Y position
        const relY = y / h;
        const rightPanels = ['notifications', 'qs', 'powerMenu', 'volume'];
        
        for (const panelId of rightPanels) {
          const config = this.panelConfigs[panelId];
          const panelTop = config.position - config.size / 2;
          const panelBottom = config.position + config.size / 2;
          
          if (relY >= panelTop && relY <= panelBottom) {
            const setting = this.storage.get(`panelSettings.${panelId}`, 'edge');
            if (setting === 'edge' || setting === 'hover') {
              this.openPanel(panelId);
            }
            break;
          }
        }
      }
      
      // Bottom edge detection for launcher
      if (h - y < 15 && x > 64) {
        const setting = this.storage.get('panelSettings.launcher', 'edge');
        if (setting === 'edge' || setting === 'hover') {
          this.openPanel('launcher');
        }
      }
      
      // Top edge detection for modules
      if (y < 15 && x > 64) {
        const setting = this.storage.get('panelSettings.modules', 'edge');
        if (setting === 'edge' || setting === 'hover') {
          this.openPanel('modules');
        }
      }
    });
  }

  /**
   * Load panel settings from storage
   */
  _loadPanelSettings() {
    const settings = this.storage.get('panelSettings', {});
    Object.entries(settings).forEach(([panelId, mode]) => {
      const panel = this.panels.get(panelId);
      if (panel) {
        panel.config.trigger = mode;
      }
    });
  }

  /**
   * Update panel settings
   */
  updatePanelSetting(panelId, mode) {
    this.storage.set(`panelSettings.${panelId}`, mode);
    const panel = this.panels.get(panelId);
    if (panel) {
      panel.config.trigger = mode;
    }
  }

  /**
   * Add running window to left bar
   */
  addRunningWindow(windowId, icon, title, isActive) {
    const runningWindows = document.getElementById('runningWindows');
    if (!runningWindows) return;
    
    const windowIcon = document.createElement('div');
    windowIcon.className = `bar-icon${isActive ? ' active' : ''}`;
    windowIcon.id = `win-${windowId}`;
    windowIcon.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      <span>${title}</span>
    `;
    
    windowIcon.addEventListener('click', () => {
      window.baklava?.window?.focusWindow(windowId);
    });
    
    runningWindows.appendChild(windowIcon);
  }

  /**
   * Update running window state
   */
  updateRunningWindow(windowId, isActive) {
    const windowIcon = document.getElementById(`win-${windowId}`);
    if (windowIcon) {
      windowIcon.classList.toggle('active', isActive);
    }
  }

  /**
   * Remove running window from left bar
   */
  removeRunningWindow(windowId) {
    const windowIcon = document.getElementById(`win-${windowId}`);
    if (windowIcon) {
      windowIcon.remove();
    }
  }
}
