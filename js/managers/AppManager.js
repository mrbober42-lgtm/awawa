// AppManager.js - Управление приложениями (установка/удаление, запуск)
import { state } from '../core/state.js';
import { getAppDisplayName, getAppIcon, toggleDrawer } from '../core/utils.js';
import { focusOrCreate, createWindow } from './WindowManager.js';

const fs = window.fs;

/**
 * Отрисовать ящик приложений (app drawer)
 */
export function renderAppDrawer() {
  const cont = document.getElementById('drawer-apps-container');
  cont.innerHTML = '';
  [...state.installedApps.keys()].forEach(appId => {
    if (!state.installedApps.get(appId).hidden) {
      const btn = document.createElement('div');
      btn.className = 'desktop-icon';
      btn.style.position = 'static';
      btn.style.width = '100%';
      btn.innerHTML = `<span class="material-icons">${getAppIcon(appId)}</span><span>${getAppDisplayName(appId)}</span>`;
      btn.setAttribute('draggable', 'true');
      btn.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'app', id: appId }));
        e.dataTransfer.effectAllowed = 'copy';
        btn.style.opacity = '0.5';
      });
      btn.addEventListener('dragend', e => { btn.style.opacity = ''; });
      btn.addEventListener('click', () => { focusOrCreate(appId); toggleDrawer(false); });
      cont.appendChild(btn);
    }
  });
}

/**
 * Зарегистрировать типы приложений для Intent API
 */
export function registerAppTypes(app) {
  if (!app.intentFilters) return;
  app.intentFilters.forEach(type => {
    if (!state.typeRegistry.has(type)) state.typeRegistry.set(type, []);
    const arr = state.typeRegistry.get(type);
    if (!arr.includes(app.id)) arr.push(app.id);
  });
}

/**
 * Сохранить данные о типах и приложениях по умолчанию
 */
export function saveTypeData() {
  const tr = {}; 
  state.typeRegistry.forEach((v,k) => tr[k] = v);
  localStorage.setItem('typeRegistry', JSON.stringify(tr));
  
  const da = {}; 
  state.defaultApps.forEach((v,k) => da[k] = v);
  localStorage.setItem('defaultApps', JSON.stringify(da));
}

/**
 * Показать диалог выбора приложения
 */
export function showOpenWithDialog(type, intent, handlers, resolve) {
  state.openWithCallback = { type, intent, handlers, resolve };
  const overlay = document.getElementById('open-with-overlay');
  const grid = document.getElementById('open-with-grid');
  const title = document.getElementById('open-with-title');
  title.textContent = `Открыть ${intent?.label || type}`;
  grid.innerHTML = '';
  
  handlers.forEach(appId => {
    const app = state.installedApps.get(appId);
    if (!app) return;
    const div = document.createElement('div');
    div.className = 'open-with-app';
    div.innerHTML = `<span class="material-icons">${app.icon || 'apps'}</span><span>${app.name}</span>`;
    div.onclick = () => selectOpenWith(appId, false);
    grid.appendChild(div);
  });
  
  overlay.classList.add('active');
  
  document.getElementById('open-with-once').onclick = () => selectOpenWith(null, false);
  document.getElementById('open-with-always').onclick = () => {
    const first = handlers[0];
    if (first) { 
      state.defaultApps.set(type, first); 
      saveTypeData(); 
      selectOpenWith(first, true); 
    }
  };
}

/**
 * Выбрать приложение для открытия
 */
export function selectOpenWith(appId, isDefault) {
  document.getElementById('open-with-overlay').classList.remove('active');
  const cb = state.openWithCallback;
  if (!cb) return;
  const chosen = appId || cb.handlers[0];
  cb.resolve(chosen);
  state.openWithCallback = null;
}

/**
 * Инициализировать обработчики установки/удаления приложений
 */
export function initAppInstallHandlers(SystemAPI) {
  // Установка приложения
  document.getElementById('install-app-btn').onclick = function() { 
    document.getElementById('install-app-file').click(); 
  };
  
  document.getElementById('install-app-file').onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var code = ev.target.result;
        var mod = {};
        new Function('exports', code)(mod);
        if (mod.id && mod.name && (typeof mod.createWindow === 'function' || (mod.tiles && mod.tiles.length))) {
          state.installedApps.set(mod.id, mod);
          
          if (mod.tiles && mod.tiles.length) {
            window.registerAppTiles(mod.id, mod.tiles);
          }
          
          fs.addApp(mod.id, code);
          SystemAPI.getComponent('desktop')?.renderIcons(Array.from(state.installedApps.values()));
          renderAppDrawer();
          alert('Приложение "' + mod.name + '" установлено');
        } else { 
          alert('Ошибка: неверный формат приложения'); 
        }
      } catch (err) { 
        alert('Ошибка установки: ' + err.message); 
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Удаление приложения через drag'n'drop
  const uninstallZone = document.getElementById('uninstall-dropzone');
  uninstallZone.addEventListener('dragover', e => e.preventDefault());
  uninstallZone.addEventListener('drop', e => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const data = JSON.parse(raw);
    
    if (data.type === 'app') {
      const appId = data.id;
      const preinstalledApps = window.preinstalledApps || [];
      if (state.installedApps.has(appId) && !preinstalledApps.some(a => a.id === appId)) {
        state.installedApps.delete(appId);
        fs.removeApp(appId);
        window.unregisterAppTiles(appId);
        SystemAPI.getComponent('desktop')?.renderIcons(Array.from(state.installedApps.values()));
        renderAppDrawer();
      }
    } else if (data.type === 'widget') {
      const widgetEl = [...document.getElementById('desktop').children].find(c => c.dataset?.widgetId === data.id);
      if (widgetEl) widgetEl.remove();
    }
    
    uninstallZone.classList.remove('active');
  });
}

/**
 * Инициализировать диалог Open With
 */
export function initOpenWithDialog() {
  document.getElementById('open-with-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('open-with-overlay').classList.remove('active');
      const cb = state.openWithCallback;
      if (cb) { 
        cb.resolve(cb.handlers[0]); 
        state.openWithCallback = null; 
      }
    }
  });
}
