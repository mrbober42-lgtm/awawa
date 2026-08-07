// main.js - Точка входа и инициализация системы

// Импорты ядра
import state from './core/state.js';
import { GRID_SIZE, isTouchDevice } from './core/constants.js';
import { snapToGrid, makeDraggable, getAppDisplayName, getAppIcon, toggleDrawer, closeAllShade, openQSOnly, openNotifOnly } from './core/utils.js';

// Импорты менеджеров
import SystemAPI from './managers/SystemAPI.js';
import { FileSystem } from './managers/FileSystem.js';
import PopupManager from './managers/PopupManager.js';
import ProgressAPI from './managers/ProgressAPI.js';
import { applyAccentColor, applyWallpaper } from './managers/ThemeManager.js';
import { 
  createWindow, closeWindow, bringToFront, minimizeWindow, restoreWindow, 
  enterFullscreen, exitFullscreen, focusOrCreate, addMinimizedTab, removeMinimizedTab,
  updateWindowCounter, updateTaskbarFullscreen
} from './managers/WindowManager.js';
import { 
  animatePanelOpen, animatePanelClose, hidePanelInstantly,
  initPanelHandlers
} from './managers/PanelManager.js';
import { 
  renderAppDrawer, registerAppTypes, saveTypeData, showOpenWithDialog, selectOpenWith,
  initAppInstallHandlers, initOpenWithDialog
} from './managers/AppManager.js';
import { renderNotifications, createNotificationCard, attachSwipeToDismiss, dismissNotification, updateNotifBadge } from './managers/NotificationManager.js';
import { renderTiles, renderTileEditor, handleDrop, getDropIndex, initTileHandlers } from './managers/TileManager.js';
import { registerWidget, createWidgetWindow, closeWidgetWindow, initWidgetHandlers } from './managers/WidgetManager.js';

// Импорты приложений
import downloadsApp from './app/downloads.js';
import accentApp from './app/accent.js';
import settingsApp from './app/settings.js';
import calculatorApp from './app/calculator.js';
import clockApp from './app/clock.js';

// Глобальные переменные
window.state = state;
window.GRID_SIZE = GRID_SIZE;
window.isTouchDevice = isTouchDevice;
window.ProgressAPI = ProgressAPI;
window.SystemAPI = SystemAPI;

// Инициализация файловой системы
const fs = new FileSystem();
window.fs = fs;

// Предустановленные приложения
const preinstalledApps = [downloadsApp, accentApp, settingsApp, calculatorApp, clockApp];

// Функции для работы с плитками приложений
window.registerAppTiles = function(appId, tiles) {
  tiles.forEach(tile => {
    tile.appId = appId;
    if (!state.tiles.some(t => t.id === tile.id)) {
      state.tiles.push(tile);
    }
  });
  window.availableTiles.push(...tiles.map(t => ({ ...t, appId })));
};

window.unregisterAppTiles = function(appId) {
  state.tiles = state.tiles.filter(t => t.appId !== appId);
  window.availableTiles = window.availableTiles.filter(t => t.appId !== appId);
};

/**
 * Загрузить установленные приложения из файловой системы
 */
function loadInstalledApps() {
  // Сначала регистрируем предустановленные приложения
  preinstalledApps.forEach(app => {
    state.installedApps.set(app.id, app);
    if (app.tiles) {
      window.registerAppTiles(app.id, app.tiles);
    }
  });
  
  // Затем загружаем пользовательские приложения
  for (let appId in fs.getApps()) {
    try {
      const m = {};
      new Function('exports', fs.getApps()[appId])(m);
      if (m.id) {
        state.installedApps.set(appId, m);
        if (m.tiles) {
          window.registerAppTiles(appId, m.tiles);
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки приложения', appId, e);
    }
  }
  
  // Регистрируем типы для Intent API
  preinstalledApps.forEach(app => {
    if (app.intentFilters) registerAppTypes(app);
  });
}

/**
 * Применить все пользовательские модули
 */
function applyAllModules() {
  // Заглушка для будущих модулей расширения
  JSON.parse(localStorage.getItem('userModules')||'[]').filter(m=>m.enabled).forEach(applyModule);
}

function applyModule(module) {
  // Заглушка для применения модуля
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

  // Все шаги выполняются мгновенно
  log('Загрузка...', 20);
  ensureFileSystem();
  
  log('Приложения', 60);
  loadInstalledApps();
  
  log('Модули', 75);
  applyAllModules();
  
  log('Рабочий стол', 85);
  renderAppDrawer();
  renderTiles();
  renderNotifications();
  SystemAPI.getComponent('desktop')?.renderIcons(Array.from(state.installedApps.values()));

  // Применяем обои после загрузки провайдеров
  applyWallpaper();
  log('Готово', 100);

  // Плавное исчезновение экрана загрузки
  boot.style.opacity = '0';
  // Ждём окончания transition (0.4s) или fallback через 500 мс
  await new Promise(resolve => {
    const onTransitionEnd = () => {
      boot.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };
    boot.addEventListener('transitionend', onTransitionEnd, { once: true });
    // На случай, если transition по какой-то причине не сработал
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
      SystemAPI.getComponent('statusBar')?.updateBattery(lvl);
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
  SystemAPI.getComponent('statusBar')?.updateTime();
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
  applyWallpaper();
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================

// Инициализация батареи и часов
initBattery();
updateClocks();
setInterval(updateClocks, 1000);

// Запуск последовательности загрузки
bootSequence();

// Обработчик изменения размера окна
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

// Клик по индикатору прогресса открывает Загрузки
const progressIndicator = document.getElementById('progress-indicator');
if (progressIndicator) {
  progressIndicator.onclick = () => focusOrCreate('downloads');
}

// Инициализация обработчиков панелей
initPanelHandlers();

// Инициализация обработчиков плиток
initTileHandlers();

// Инициализация обработчиков виджетов
initWidgetHandlers();

// Инициализация установки/удаления приложений
initAppInstallHandlers(SystemAPI);

// Инициализация диалога Open With
initOpenWithDialog();

// Контекстное меню на рабочем столе
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
  
  document.getElementById('ctx-settings').onclick = () => { 
    focusOrCreate('settings'); 
    contextMenu.style.display = 'none'; 
  };
  
  document.querySelectorAll('.widget-menu-item').forEach(item => {
    item.onclick = () => {
      const widgetId = item.dataset.widgetId;
      createWidgetWindow(widgetId, e.clientX - 140, e.clientY - 100);
      contextMenu.style.display = 'none';
    };
  });
});

window.addEventListener('click', () => contextMenu.style.display = 'none');

// Кнопка назад
document.getElementById('back-button').onclick = () => {
  const qsPanel = document.getElementById('qs-panel');
  const notifPanel = document.getElementById('notif-panel');
  const appDrawer = document.getElementById('app-drawer');
  
  if (qsPanel.classList.contains('active') || notifPanel.classList.contains('active')) {
    closeAllShade();
  } else if (appDrawer.classList.contains('active')) {
    toggleDrawer(false);
  } else {
    const wins = [...state.windows.values()].filter(w => !w.minimized);
    if (wins.length) closeWindow(wins[wins.length-1].id);
  }
};

// Кнопка смены обоев (если есть)
const wallpaperBtn = document.getElementById('change-wallpaper-btn');
if (wallpaperBtn) {
  wallpaperBtn.onclick = changeWallpaper;
}

// Экспорт глобальных функций для отладки
window.renderNotifications = renderNotifications;
window.renderTiles = renderTiles;
window.closeAllShade = closeAllShade;
window.openQSOnly = openQSOnly;
window.openNotifOnly = openNotifOnly;
window.createWidgetWindow = createWidgetWindow;
window.registerWidget = registerWidget;

console.log('Baklava OS инициализирована успешно');
