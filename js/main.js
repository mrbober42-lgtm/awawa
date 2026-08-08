// main.js - Точка входа и инициализация системы

// Массив для сбора ошибок
const bootErrors = [];

/**
 * Динамическая загрузка модуля с обработкой ошибок
 */
async function loadModule(path, name) {
  try {
    const module = await import(path);
    return module;
  } catch (err) {
    bootErrors.push({ 
      module: name || path, 
      error: err.message, 
      stack: err.stack 
    });
    console.error(`Ошибка загрузки модуля ${name}:`, err);
    return null;
  }
}

/**
 * Показать окно с ошибками загрузки
 */
function showBootErrors() {
  if (bootErrors.length === 0) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'boot-error-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--surface);
    border-radius: 28px;
    padding: 24px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  `;
  
  let content = `<h2 style="color: var(--on-surface); margin-bottom: 16px;">⚠️ Ошибки загрузки</h2>`;
  content += `<p style="color: var(--on-surface-variant); margin-bottom: 16px;">При загрузке системы произошли следующие ошибки:</p>`;
  
  bootErrors.forEach((err, idx) => {
    content += `
      <div style="background: var(--error-container); color: var(--on-error-container); padding: 12px; border-radius: 12px; margin-bottom: 12px;">
        <strong>${idx + 1}. ${err.module}</strong><br>
        <small>${err.error}</small><br>
        ${err.stack ? `<pre style="font-size: 11px; margin-top: 8px; white-space: pre-wrap;">${err.stack}</pre>` : ''}
      </div>
    `;
  });
  
  content += `
    <button id="close-error-modal" style="
      margin-top: 16px;
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      background: var(--primary);
      color: var(--on-primary);
      font-weight: 500;
      cursor: pointer;
    ">Закрыть и продолжить работу</button>
  `;
  
  modal.innerHTML = content;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  document.getElementById('close-error-modal').onclick = () => {
    overlay.remove();
  };
}

/**
 * Основная функция инициализации
 */
async function init() {
  // Загружаем ядро
  const coreState = await loadModule('./core/state.js', 'state.js');
  const coreConstants = await loadModule('./core/constants.js', 'constants.js');
  const coreUtils = await loadModule('./core/utils.js', 'utils.js');
  
  if (!coreState || !coreConstants) {
    bootErrors.push({ module: 'critical', error: 'Критическая ошибка: не загружено ядро системы', stack: null });
    showBootErrors();
    return;
  }
  
  const { state } = coreState;
  const { GRID_SIZE, isTouchDevice, preinstalledApps } = coreConstants;
  const { snapToGrid, makeDraggable, getAppDisplayName, getAppIcon, toggleDrawer } = coreUtils || {};
  
  // Загружаем менеджеры
  const SystemAPIMod = await loadModule('./managers/SystemAPI.js', 'SystemAPI.js');
  const FileSystemMod = await loadModule('./managers/FileSystem.js', 'FileSystem.js');
  const PopupManagerMod = await loadModule('./managers/PopupManager.js', 'PopupManager.js');
  const ProgressAPIMod = await loadModule('./managers/ProgressAPI.js', 'ProgressAPI.js');
  const ThemeManagerMod = await loadModule('./managers/ThemeManager.js', 'ThemeManager.js');
  const WindowManagerMod = await loadModule('./managers/WindowManager.js', 'WindowManager.js');
  const PanelManagerMod = await loadModule('./managers/PanelManager.js', 'PanelManager.js');
  const AppManagerMod = await loadModule('./managers/AppManager.js', 'AppManager.js');
  const NotificationManagerMod = await loadModule('./managers/NotificationManager.js', 'NotificationManager.js');
  const TileManagerMod = await loadModule('./managers/TileManager.js', 'TileManager.js');
  const WidgetManagerMod = await loadModule('./managers/WidgetManager.js', 'WidgetManager.js');
  
  // Загружаем приложения
  const downloadsApp = await loadModule('./app/downloads.js', 'downloads.js');
  const accentApp = await loadModule('./app/accent.js', 'accent.js');
  const settingsApp = await loadModule('./app/settings.js', 'settings.js');
  const calculatorApp = await loadModule('./app/calculator.js', 'calculator.js');
  const clockApp = await loadModule('./app/clock.js', 'clock.js');
  
  // Показываем ошибки, если они есть
  showBootErrors();
  
  // Если критические модули не загрузились - останавливаемся
  if (!SystemAPIMod || !FileSystemMod) {
    console.error('Критическая ошибка: не загружены системные модули');
    return;
  }
  
  const SystemAPI = SystemAPIMod.default;
  const { FileSystem } = FileSystemMod;
  const PopupManager = PopupManagerMod?.default;
  const ProgressAPI = ProgressAPIMod?.default;
  const { applyAccentColor, applyWallpaper } = ThemeManagerMod || {};
  const { 
    createWindow, closeWindow, bringToFront, minimizeWindow, restoreWindow, 
    enterFullscreen, exitFullscreen, focusOrCreate, addMinimizedTab, removeMinimizedTab,
    updateWindowCounter, updateTaskbarFullscreen
  } = WindowManagerMod || {};
  const { 
    animatePanelOpen, animatePanelClose, hidePanelInstantly,
    initPanelHandlers, closeAllShade, openQSOnly, openNotifOnly
  } = PanelManagerMod || {};
  const { 
    renderAppDrawer, registerAppTypes, saveTypeData, showOpenWithDialog, selectOpenWith,
    initAppInstallHandlers, initOpenWithDialog
  } = AppManagerMod || {};
  const { renderNotifications, createNotificationCard, attachSwipeToDismiss, dismissNotification, updateNotifBadge } = NotificationManagerMod || {};
  const { renderTiles, renderTileEditor, handleDrop, getDropIndex, initTileHandlers } = TileManagerMod || {};
  const { registerWidget, createWidgetWindow, closeWidgetWindow, initWidgetHandlers } = WidgetManagerMod || {};
  
  // Глобальные переменные
  window.state = state;
  window.GRID_SIZE = GRID_SIZE;
  window.isTouchDevice = isTouchDevice;
  if (ProgressAPI) window.ProgressAPI = ProgressAPI;
  if (SystemAPI) window.SystemAPI = SystemAPI;
  
  // Инициализация файловой системы
  const fs = new FileSystem();
  window.fs = fs;
  
  // Предустановленные приложения
  const appsList = [
    downloadsApp?.default, 
    accentApp?.default, 
    settingsApp?.default, 
    calculatorApp?.default, 
    clockApp?.default
  ].filter(Boolean);
  
  /**
   * Загрузить установленные приложения из файловой системы
   */
  function loadInstalledApps() {
    // Сначала регистрируем предустановленные приложения
    appsList.forEach(app => {
      state.installedApps.set(app.id, app);
      if (app.tiles && coreState?.registerAppTiles) {
        coreState.registerAppTiles(app.id, app.tiles);
      }
    });
    
    // Затем загружаем пользовательские приложения
    for (let appId in fs.getApps()) {
      try {
        const m = {};
        new Function('exports', fs.getApps()[appId])(m);
        if (m.id) {
          state.installedApps.set(appId, m);
          if (m.tiles && coreState?.registerAppTiles) {
            coreState.registerAppTiles(appId, m.tiles);
          }
        }
      } catch (e) {
        console.error('Ошибка загрузки приложения', appId, e);
        bootErrors.push({ module: `app:${appId}`, error: e.message, stack: e.stack });
      }
    }
    
    // Регистрируем типы для Intent API
    appsList.forEach(app => {
      if (app.intentFilters && registerAppTypes) registerAppTypes(app);
    });
  }
  
  /**
   * Применить все пользовательские модули
   */
  function applyAllModules() {
    JSON.parse(localStorage.getItem('userModules')||'[]').filter(m=>m.enabled).forEach(applyModule);
  }
  
  function applyModule(module) {
    console.log('Применение модуля:', module.name);
  }
  
  /**
   * Убедиться, что файловая система инициализирована
   */
  function ensureFileSystem() {
    let fsData = JSON.parse(localStorage.getItem('fs')||'{}');
    if (!fsData['/data']) fsData['/data'] = {};
    if (!fsData['/data']['apps']) fsData['/data']['apps'] = {};
    localStorage.setItem('fs', JSON.stringify(fsData));
    return fsData;
  }
  
  /**
   * Последовательность загрузки системы
   */
  async function bootSequence() {
    const bar = document.getElementById('boot-progress-bar');
    const status = document.getElementById('boot-status');
    const boot = document.getElementById('boot-screen');
  
    const log = (msg, p) => {
      status.textContent = msg;
      bar.style.width = p + '%';
    };
  
    log('Загрузка...', 20);
    ensureFileSystem();
    
    log('Приложения', 60);
    loadInstalledApps();
    
    log('Модули', 75);
    applyAllModules();
    
    log('Рабочий стол', 85);
    if (renderAppDrawer) renderAppDrawer();
    if (renderTiles) renderTiles();
    if (renderNotifications) renderNotifications();
    if (SystemAPI?.getComponent) SystemAPI.getComponent('desktop')?.renderIcons(Array.from(state.installedApps.values()));
  
    applyWallpaper?.();
    log('Готово', 100);
  
    boot.style.opacity = '0';
    await new Promise(resolve => {
      const onTransitionEnd = () => {
        boot.removeEventListener('transitionend', onTransitionEnd);
        resolve();
      };
      boot.addEventListener('transitionend', onTransitionEnd, { once: true });
      setTimeout(resolve, 500);
    });
    boot.style.display = 'none';
  }
  
  /**
   * Инициализация батареи
   */
  async function initBattery() {
    try {
      const b = await navigator.getBattery();
      const upd = () => {
        const lvl = b.level*100;
        SystemAPI?.getComponent('statusBar')?.updateBattery(lvl);
      };
      upd();
      b.addEventListener('levelchange', upd);
      b.addEventListener('chargingchange', upd);
    } catch(e) {}
  }
  
  /**
   * Обновление часов
   */
  function updateClocks() {
    SystemAPI?.getComponent('statusBar')?.updateTime();
    const widgetTime = document.getElementById('widget-time');
    const widgetDate = document.getElementById('widget-date');
    if (widgetTime) widgetTime.textContent = new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
    if (widgetDate) widgetDate.textContent = new Date().toLocaleDateString('ru-RU', {day:'numeric', month:'long', weekday:'short'});
  }
  
  /**
   * Изменение обоев
   */
  function changeWallpaper() {
    state.wallpaper = state.wallpaper === 'grad1' ? 'grad2' : 'grad1';
    localStorage.setItem('wallpaper', state.wallpaper);
    applyWallpaper?.();
  }
  
  // ============================================
  // ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
  // ============================================
  
  initBattery();
  updateClocks();
  setInterval(updateClocks, 1000);
  
  bootSequence();
  
  window.addEventListener('resize', () => {
    const desktop = document.getElementById('desktop');
    const desktopRect = desktop.getBoundingClientRect();
    state.windows.forEach(obj => {
      if (obj.isFullscreen) {
        obj.element.style.left = desktopRect.left + 'px';
        obj.element.style.top = desktopRect.top + 'px';
        obj.element.style.width = desktopRect.width + 'px';
        obj.element.style.height = desktopRect.height + 'px';
      }
    });
  });
  
  const progressIndicator = document.getElementById('progress-indicator');
  if (progressIndicator) {
    progressIndicator.onclick = () => focusOrCreate?.('downloads');
  }
  
  initPanelHandlers?.();
  initTileHandlers?.();
  initWidgetHandlers?.();
  initAppInstallHandlers?.(SystemAPI);
  initOpenWithDialog?.();
  
  const desktop = document.getElementById('desktop');
  const contextMenu = document.getElementById('context-menu');
  
  desktop.addEventListener('contextmenu', e => {
    e.preventDefault();
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    
    let menuHTML = `<div class="context-item" id="ctx-settings"><span class="material-icons">settings</span> Настройки</div>`;
    
    if (state.widgets.size > 0) {
      state.widgets.forEach((def, id) => {
        menuHTML += `<div class="context-item widget-menu-item" data-widget-id="${id}"><span class="material-icons">widgets</span> Виджет: ${def.name}</div>`;
      });
    }
    
    contextMenu.innerHTML = menuHTML;
    
    const settingsBtn = document.getElementById('ctx-settings');
    if (settingsBtn) {
      settingsBtn.onclick = () => { 
        focusOrCreate?.('settings'); 
        contextMenu.style.display = 'none'; 
      };
    }
    
    document.querySelectorAll('.widget-menu-item').forEach(item => {
      item.onclick = () => {
        const widgetId = item.dataset.widgetId;
        createWidgetWindow?.(widgetId, e.clientX - 140, e.clientY - 100);
        contextMenu.style.display = 'none';
      };
    });
  });
  
  window.addEventListener('click', () => contextMenu.style.display = 'none');
  
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.onclick = () => {
      const qsPanel = document.getElementById('qs-panel');
      const notifPanel = document.getElementById('notif-panel');
      const appDrawer = document.getElementById('app-drawer');
      
      if (qsPanel?.classList.contains('active') || notifPanel?.classList.contains('active')) {
        closeAllShade?.();
      } else if (appDrawer?.classList.contains('active')) {
        toggleDrawer?.(false);
      } else {
        const wins = [...state.windows.values()].filter(w => !w.minimized);
        if (wins.length) closeWindow?.(wins[wins.length-1].id);
      }
    };
  }
  
  const wallpaperBtn = document.getElementById('change-wallpaper-btn');
  if (wallpaperBtn) {
    wallpaperBtn.onclick = changeWallpaper;
  }
  
  // Экспорт глобальных функций для отладки
  if (renderNotifications) window.renderNotifications = renderNotifications;
  if (renderTiles) window.renderTiles = renderTiles;
  if (closeAllShade) window.closeAllShade = closeAllShade;
  if (openQSOnly) window.openQSOnly = openQSOnly;
  if (openNotifOnly) window.openNotifOnly = openNotifOnly;
  if (createWidgetWindow) window.createWidgetWindow = createWidgetWindow;
  if (registerWidget) window.registerWidget = registerWidget;
  
  console.log('Baklava OS инициализирована успешно');
}

// Запуск инициализации
init().catch(err => {
  console.error('Критическая ошибка при инициализации:', err);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Ошибка загрузки</h1><p>${err.message}</p></div>`;
});
