// WindowManager.js - Управление окнами
import { state } from '../core/state.js';
import { getAppDisplayName, animateMorph } from '../core/utils.js';

const windowsLayer = document.getElementById('windows-layer');
const desktop = document.getElementById('desktop');
const taskbar = document.getElementById('taskbar');
const statusBar = document.getElementById('status-bar');
const fullscreenPreview = document.getElementById('fullscreen-preview');

/**
 * Сделать окно перетаскиваемым (за заголовок)
 */
function makeWindowDraggable(win, handle) {
  let ox, oy, drag = false, raf;
  const startDrag = (e) => {
    if (e.button && e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('.window-drag-line')) return;
    e.preventDefault();
    drag = true;
    const r = win.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ox = clientX - r.left;
    oy = clientY - r.top;
    win.style.cursor = 'move';
    win.style.transition = 'none';
    win.classList.add('dragging');
    bringToFront(win);
  };
  const moveDrag = (e) => {
    if (!drag) return;
    e.preventDefault();
    raf = requestAnimationFrame(() => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      let x = clientX - ox;
      let y = clientY - oy;
      x = Math.max(0, Math.min(x, window.innerWidth - win.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - win.offsetHeight));
      win.style.left = x + 'px';
      win.style.top = y + 'px';
    });
  };
  const endDrag = () => {
    if (drag) {
      drag = false;
      win.style.cursor = '';
      win.style.transition = '';
      win.classList.remove('dragging');
    }
  };
  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDrag, {passive: false});
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchmove', moveDrag, {passive: false});
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
}

/**
 * Сделать фулскрин-окно перетаскиваемым (с превью)
 */
function makeFullscreenDraggable(win, dragLine, id) {
  let drag = false;
  let startY;
  const obj = state.windows.get(id);
  let previewDirection = null;
  let targetRect = null;
  let previewPlaceholderTab = null;
  let savedInlineStyles = null;

  const clearPreview = () => {
    if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
    fullscreenPreview.classList.remove('blur-active');
    fullscreenPreview.style.display = 'none';
    dragLine.classList.remove('preview-minimize');
    dragLine.classList.remove('active-gesture');
    dragLine.classList.remove('animating');
    previewDirection = null;
    targetRect = null;
    if (savedInlineStyles) {
      dragLine.style.width = savedInlineStyles.width;
      dragLine.style.height = savedInlineStyles.height;
      dragLine.style.background = savedInlineStyles.background;
      savedInlineStyles = null;
    }
  };

  const getStartRect = () => {
    if (obj.minimized) {
      const tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
      if (tab) { const rect = tab.getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; }
      return { left: 0, top: 0, width: 120, height: 56 };
    }
    return win.getBoundingClientRect();
  };

  const animatePreviewTo = (direction) => {
    if (previewDirection === direction) return;
    const desktopRect = desktop.getBoundingClientRect();
    const taskbarRect = taskbar.getBoundingClientRect();
    const startRect = getStartRect();
    let newTarget;
    let blurActive = false;
    if (direction === 'fullscreen') {
      newTarget = { left: desktopRect.left + 16, top: desktopRect.top + 16, width: desktopRect.width - 32, height: desktopRect.height - 32 };
      blurActive = true;
      dragLine.classList.add('active-gesture');
    } else if (direction === 'normal') {
      const left = obj.prevRect?.left ? parseFloat(obj.prevRect.left) : 100;
      const top = obj.prevRect?.top ? parseFloat(obj.prevRect.top) : 80;
      const width = obj.prevRect?.width ? parseFloat(obj.prevRect.width) : 400;
      const height = obj.prevRect?.height ? parseFloat(obj.prevRect.height) : 350;
      newTarget = { left, top, width, height };
      blurActive = true;
      dragLine.classList.add('active-gesture');
    } else if (direction === 'minimized') {
      if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
      const container = document.getElementById('minimized-windows');
      const app = state.installedApps.get(obj.appType);
      const icon = app ? app.icon : 'apps';
      const title = getAppDisplayName(obj.appType);
      const tempTab = document.createElement('div');
      tempTab.className = 'minimized-tab';
      tempTab.style.opacity = '0';
      tempTab.style.pointerEvents = 'none';
      tempTab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
      container.appendChild(tempTab);
      const tabRect = tempTab.getBoundingClientRect();
      tempTab.remove();
      previewPlaceholderTab = document.createElement('div');
      previewPlaceholderTab.className = 'minimized-tab preview-placeholder';
      previewPlaceholderTab.style.opacity = '0';
      previewPlaceholderTab.style.transition = 'opacity 0.2s';
      previewPlaceholderTab.style.pointerEvents = 'none';
      previewPlaceholderTab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
      container.appendChild(previewPlaceholderTab);
      previewPlaceholderTab.offsetHeight;
      previewPlaceholderTab.style.opacity = '0.6';
      newTarget = { left: tabRect.left, top: tabRect.top, width: tabRect.width, height: tabRect.height };
      blurActive = false;
      dragLine.classList.add('active-gesture');
    } else {
      newTarget = startRect;
      blurActive = false;
      dragLine.classList.remove('active-gesture');
    }
    fullscreenPreview.style.left = startRect.left + 'px';
    fullscreenPreview.style.top = startRect.top + 'px';
    fullscreenPreview.style.width = startRect.width + 'px';
    fullscreenPreview.style.height = startRect.height + 'px';
    fullscreenPreview.style.display = 'block';
    fullscreenPreview.offsetHeight;
    fullscreenPreview.style.left = newTarget.left + 'px';
    fullscreenPreview.style.top = newTarget.top + 'px';
    fullscreenPreview.style.width = newTarget.width + 'px';
    fullscreenPreview.style.height = newTarget.height + 'px';
    if (blurActive) fullscreenPreview.classList.add('blur-active'); else fullscreenPreview.classList.remove('blur-active');
    previewDirection = direction;
    targetRect = newTarget;
    dragLine.classList.toggle('preview-minimize', direction === 'minimized');
  };

  const onMouseMove = e => {
    if (!drag) return;
    e.preventDefault();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = clientY - startY;
    const threshold = 40;
    const strongThreshold = 100;
    let newDirection = null;
    if (obj.isFullscreen) {
      if (dy > strongThreshold) newDirection = 'minimized';
      else if (dy > threshold) newDirection = 'normal';
    } else if (obj.minimized) {
      if (dy < -strongThreshold) newDirection = 'fullscreen';
      else if (dy < -threshold) newDirection = 'normal';
    } else {
      if (dy < -threshold) newDirection = 'fullscreen';
      else if (dy > threshold) newDirection = 'minimized';
    }
    if (!newDirection && previewDirection !== null) animatePreviewTo(null);
    else if (newDirection) animatePreviewTo(newDirection);
  };

  const onMouseUp = e => {
    if (!drag) return;
    drag = false;
    win.style.transition = '';
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dy = clientY - startY;
    const threshold = 20;
    const strongThreshold = 80;
    let action = null;
    if (obj.isFullscreen) {
      if (dy > strongThreshold) action = 'minimize';
      else if (dy > threshold) action = 'exitFullscreen';
    } else if (obj.minimized) {
      if (dy < -strongThreshold) action = 'fullscreen';
      else if (dy < -threshold) action = 'restore';
    } else {
      if (dy < -threshold) action = 'fullscreen';
      else if (dy > threshold) action = 'minimize';
    }
    if (!action) {
      fullscreenPreview.style.opacity = '0';
      fullscreenPreview.classList.remove('blur-active');
      const onTransitionEnd = () => {
        fullscreenPreview.style.display = 'none';
        fullscreenPreview.style.opacity = '';
        fullscreenPreview.removeEventListener('transitionend', onTransitionEnd);
        if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
      };
      fullscreenPreview.addEventListener('transitionend', onTransitionEnd);
      setTimeout(() => {
        fullscreenPreview.style.display = 'none';
        fullscreenPreview.style.opacity = '';
        if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
      }, 300);
    } else {
      fullscreenPreview.style.display = 'none';
      fullscreenPreview.classList.remove('blur-active');
      if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
    }
    dragLine.classList.remove('preview-minimize');
    dragLine.classList.remove('active-gesture');
    dragLine.classList.remove('animating');
    if (savedInlineStyles) {
      dragLine.style.width = savedInlineStyles.width;
      dragLine.style.height = savedInlineStyles.height;
      dragLine.style.background = savedInlineStyles.background;
      savedInlineStyles = null;
    }
    previewDirection = null;
    targetRect = null;
    if (action) {
      if (action === 'fullscreen') enterFullscreen(id);
      else if (action === 'exitFullscreen') exitFullscreen(id);
      else if (action === 'minimize') minimizeWindow(id);
      else if (action === 'restore') restoreWindow(id);
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchend', onMouseUp);
  };

  const startDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    drag = true;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startY = clientY;
    win.style.transition = 'none';
    clearPreview();
    if (obj.isFullscreen) {
      savedInlineStyles = {
        width: dragLine.style.width,
        height: dragLine.style.height,
        background: dragLine.style.background
      };
      dragLine.style.width = '';
      dragLine.style.height = '';
      dragLine.style.background = '';
      dragLine.classList.add('animating');
    } else {
      savedInlineStyles = null;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onMouseMove, {passive: false});
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);
  };

  dragLine.addEventListener('mousedown', startDrag);
  dragLine.addEventListener('touchstart', startDrag, {passive: false});
}

/**
 * Создать новое окно приложения
 */
export function createWindow(appType, customContent, intent, sourceRect = null) {
  const id = `${appType}-${Date.now()}`;
  const win = document.createElement('div');
  win.className = 'app-window';
  win.dataset.app = appType;
  win.dataset.id = id;

  const targetLeft = 100 + (state.windows.size % 5) * 30;
  const targetTop = 80 + (state.windows.size % 5) * 20;
  const targetWidth = 400;
  const targetHeight = 350;

  if (sourceRect) {
    const finalLeft = 100 + (state.windows.size % 5) * 30;
    const finalTop = 80 + (state.windows.size % 5) * 20;
    animateMorph(win,
        { left: sourceRect.left, top: sourceRect.top, width: sourceRect.width, height: sourceRect.height, borderRadius: '24px' },
        { left: finalLeft, top: finalTop, width: 400, height: 350, borderRadius: '24px' },
        { duration: 0.35, onComplete: () => { win.style.transition = ''; } }
    );
  } else {
    win.style.left = targetLeft + 'px';
    win.style.top = targetTop + 'px';
    win.style.width = targetWidth + 'px';
    win.style.height = targetHeight + 'px';
  }

  win.style.zIndex = ++state.nextZIndex;

  const dragLine = document.createElement('div');
  dragLine.className = 'window-drag-line';

  const header = document.createElement('div');
  header.className = 'window-header';
  header.innerHTML = `<span>${getAppDisplayName(appType)}</span>
    <div>
      <button class="minimize-btn"><span class="material-icons">minimize</span></button>
      <button class="close-btn"><span class="material-icons">close</span></button>
    </div>`;

  const content = document.createElement('div');
  content.className = 'window-content';

  if (customContent) {
    content.appendChild(customContent);
  } else {
    const app = state.installedApps.get(appType);
    if (app && typeof app.createWindow === 'function') {
      try {
        const appContent = app.createWindow(intent);
        if (appContent instanceof Node) content.appendChild(appContent);
        else content.innerHTML = '<p>Ошибка загрузки приложения</p>';
      } catch (e) {
        console.error('Ошибка создания окна приложения', appType, e);
        content.innerHTML = '<p>Ошибка при запуске приложения</p>';
      }
    } else {
      content.innerHTML = '<p>Приложение не найдено</p>';
    }
  }

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle material-icons';
  resizeHandle.textContent = 'open_in_full';

  win.append(dragLine, header, content, resizeHandle);
  windowsLayer.appendChild(win);

  state.windows.set(id, {
    element: win,
    appType,
    minimized: false,
    id,
    isFullscreen: false,
    prevRect: null
  });

  makeWindowDraggable(win, header);
  
  // Импортируем makeResizable из utils
  import('../core/utils.js').then(({ makeResizable }) => {
    makeResizable(win, resizeHandle);
  });

  win.querySelector('.close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow(id);
  });
  win.querySelector('.minimize-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeWindow(id);
  });

  win.addEventListener('mousedown', () => bringToFront(win));
  makeFullscreenDraggable(win, dragLine, id);

  if (sourceRect) {
    win.offsetHeight;
    win.style.transition = 'all 0.35s cubic-bezier(0.2, 0.9, 0.4, 1)';
    win.style.left = targetLeft + 'px';
    win.style.top = targetTop + 'px';
    win.style.width = targetWidth + 'px';
    win.style.height = targetHeight + 'px';

    const onTransitionEnd = () => {
      win.style.transition = '';
      win.removeEventListener('transitionend', onTransitionEnd);
    };
    win.addEventListener('transitionend', onTransitionEnd);
  }

  updateWindowCounter();
  updateTaskbarFullscreen();
  return id;
}

/**
 * Переместить окно на передний план
 */
export function bringToFront(win) {
  win.style.zIndex = ++state.nextZIndex;
}

/**
 * Закрыть окно
 */
export function closeWindow(id) {
  const obj = state.windows.get(id);
  if (!obj) return;
  obj.element.classList.add('closing');
  setTimeout(() => {
    if (obj.cleanup) obj.cleanup();
    obj.element.remove();
    state.windows.delete(id);
    if (obj.minimized) removeMinimizedTab(id);
    updateWindowCounter();
    updateTaskbarFullscreen();
  }, 200);
}

/**
 * Обновить состояние taskbar для фулскрина
 */
export function updateTaskbarFullscreen() {
  let hasFullscreen = false;
  for (let [id, obj] of state.windows) {
    if (obj.isFullscreen && !obj.minimized) {
      hasFullscreen = true;
      break;
    }
  }
  taskbar.classList.toggle('fullscreen-active', hasFullscreen);
}

/**
 * Свернуть окно
 */
export function minimizeWindow(id) {
  const obj = state.windows.get(id);
  if (!obj || obj.minimized) return;
  const container = document.getElementById('minimized-windows');
  const app = state.installedApps.get(obj.appType);
  const icon = app ? app.icon : 'apps';
  const title = getAppDisplayName(obj.appType);
  let tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
  if (!tab) {
    tab = document.createElement('div');
    tab.className = 'minimized-tab';
    tab.dataset.windowId = id;
    tab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
    tab.addEventListener('click', (e) => { e.stopPropagation(); restoreWindow(id); });
    container.appendChild(tab);
  }
  tab.style.opacity = '1';
  tab.style.pointerEvents = 'auto';
  const tabRect = tab.getBoundingClientRect();
  if (obj.isFullscreen) {
    obj.isFullscreen = false;
    const win = obj.element;
    win.classList.remove('fullscreen');
    if (obj.prevRect) {
      win.style.left = obj.prevRect.left;
      win.style.top = obj.prevRect.top;
      win.style.width = obj.prevRect.width;
      win.style.height = obj.prevRect.height;
    }
    const dragLine = win.querySelector('.window-drag-line');
    if (dragLine) { dragLine.style.position = ''; dragLine.style.top = ''; dragLine.style.left = ''; dragLine.style.transform = ''; dragLine.style.zIndex = ''; dragLine.style.height = ''; dragLine.style.width = ''; }
    statusBar.style.backgroundColor = '';
    statusBar.style.backdropFilter = '';
    statusBar.style.borderBottom = '';
  }
  obj.minimized = true;
  obj.prevRect = { left: obj.element.style.left, top: obj.element.style.top, width: obj.element.style.width, height: obj.element.style.height };
  const dragLine = obj.element.querySelector('.window-drag-line');
  if (dragLine) { dragLine.style.transition = 'all 0.2s'; dragLine.style.width = '40px'; dragLine.style.opacity = '0'; }
  obj.element.style.transition = 'left 0.25s cubic-bezier(0.2,0,0,1), top 0.25s cubic-bezier(0.2,0,0,1), width 0.25s cubic-bezier(0.2,0,0,1), height 0.25s cubic-bezier(0.2,0,0,1), opacity 0.2s';
  obj.element.style.left = tabRect.left + 'px';
  obj.element.style.top = tabRect.top + 'px';
  obj.element.style.width = tabRect.width + 'px';
  obj.element.style.height = tabRect.height + 'px';
  obj.element.style.opacity = '0';
  setTimeout(() => {
    obj.element.style.display = 'none';
    obj.element.style.transition = '';
    obj.element.style.opacity = '';
    if (dragLine) { dragLine.style.transition = ''; dragLine.style.width = ''; dragLine.style.opacity = ''; }
  }, 250);
  updateWindowCounter();
  updateTaskbarFullscreen();
}

/**
 * Добавить вкладку свернутого окна
 */
export function addMinimizedTab(windowObj) {
  const container = document.getElementById('minimized-windows');
  const app = state.installedApps.get(windowObj.appType);
  const icon = app ? app.icon : 'apps';
  const title = getAppDisplayName(windowObj.appType);
  const tab = document.createElement('div');
  tab.className = 'minimized-tab';
  tab.dataset.windowId = windowObj.id;
  tab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
  tab.addEventListener('click', (e) => { e.stopPropagation(); restoreWindow(windowObj.id); });
  container.appendChild(tab);
}

/**
 * Удалить вкладку свернутого окна
 */
export function removeMinimizedTab(windowId) {
  const tab = document.querySelector(`.minimized-tab[data-window-id="${windowId}"]`);
  if (tab) tab.remove();
}

/**
 * Восстановить свернутое окно
 */
export function restoreWindow(id) {
  const obj = state.windows.get(id);
  if (!obj || !obj.minimized) return;
  const tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
  if (!tab) return;
  const tabRect = tab.getBoundingClientRect();
  obj.minimized = false;
  obj.element.style.display = 'flex';
  obj.element.style.transition = 'none';
  obj.element.style.width = tabRect.width + 'px';
  obj.element.style.height = tabRect.height + 'px';
  obj.element.style.left = tabRect.left + 'px';
  obj.element.style.top = tabRect.top + 'px';
  obj.element.style.opacity = '0';
  obj.element.style.zIndex = ++state.nextZIndex;
  const dragLine = obj.element.querySelector('.window-drag-line');
  if (dragLine) { dragLine.style.width = '40px'; dragLine.style.opacity = '0'; }
  requestAnimationFrame(() => {
    obj.element.style.transition = 'left 0.25s cubic-bezier(0.2,0,0,1), top 0.25s cubic-bezier(0.2,0,0,1), width 0.25s cubic-bezier(0.2,0,0,1), height 0.25s cubic-bezier(0.2,0,0,1), opacity 0.2s';
    obj.element.style.width = obj.prevRect?.width || '400px';
    obj.element.style.height = obj.prevRect?.height || '350px';
    obj.element.style.left = obj.prevRect?.left || '100px';
    obj.element.style.top = obj.prevRect?.top || '80px';
    obj.element.style.opacity = '1';
    if (dragLine) { dragLine.style.transition = 'width 0.25s, opacity 0.25s'; dragLine.style.width = '80px'; dragLine.style.opacity = ''; }
  });
  setTimeout(() => { obj.element.style.transition = ''; if (dragLine) dragLine.style.transition = ''; }, 250);
  removeMinimizedTab(id);
  updateWindowCounter();
  updateTaskbarFullscreen();
}

/**
 * Войти в полноэкранный режим
 */
export function enterFullscreen(id) {
  const obj = state.windows.get(id);
  if (!obj || obj.isFullscreen) return;
  const win = obj.element;
  const desktopRect = desktop.getBoundingClientRect();
  const statusBarEl = document.getElementById('status-bar');
  const statusBarHeight = statusBarEl.offsetHeight;

  obj.prevRect = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
  obj.isFullscreen = true;
  win.classList.add('fullscreen');

  win.style.transform = 'none';
  win.style.willChange = 'auto';

  win.style.left = desktopRect.left + 'px';
  win.style.top = desktopRect.top + 'px';
  win.style.width = desktopRect.width + 'px';
  win.style.height = desktopRect.height + 'px';

  const dragLine = win.querySelector('.window-drag-line');
  if (dragLine) {
    const lineRect = dragLine.getBoundingClientRect();
    dragLine.style.transition = 'none';
    dragLine.style.position = 'fixed';
    dragLine.style.left = lineRect.left + 'px';
    dragLine.style.top = lineRect.top + 'px';
    dragLine.style.width = lineRect.width + 'px';
    dragLine.style.height = lineRect.height + 'px';
    dragLine.style.transform = 'none';
    dragLine.style.zIndex = '9999';
    dragLine.style.pointerEvents = 'auto';
    dragLine.style.visibility = 'visible';
    dragLine.style.background = 'var(--md-sys-color-outline-variant)';
    dragLine.offsetHeight;
    dragLine.classList.add('animating');
    const statusBarRect = statusBarEl.getBoundingClientRect();
    dragLine.style.left = (statusBarRect.left + statusBarRect.width / 2) + 'px';
    dragLine.style.top = (statusBarRect.top + statusBarRect.height / 2) + 'px';
    dragLine.style.transform = 'translate(-50%, -50%)';
    dragLine.style.width = '80px';
    dragLine.style.height = '4px';
    dragLine.style.opacity = '1';
    const onTransitionEnd = () => {
      dragLine.classList.remove('animating');
      dragLine.removeEventListener('transitionend', onTransitionEnd);
    };
    dragLine.addEventListener('transitionend', onTransitionEnd);
  }

  updateTaskbarFullscreen();
}

/**
 * Выйти из полноэкранного режима
 */
export function exitFullscreen(id) {
  const obj = state.windows.get(id);
  if (!obj || !obj.isFullscreen) return;
  const win = obj.element;
  obj.isFullscreen = false;
  win.classList.remove('fullscreen');
  if (obj.prevRect) {
    win.style.left = obj.prevRect.left;
    win.style.top = obj.prevRect.top;
    win.style.width = obj.prevRect.width;
    win.style.height = obj.prevRect.height;
  } else {
    win.style.left = '100px';
    win.style.top = '80px';
    win.style.width = '400px';
    win.style.height = '350px';
  }

  const dragLine = win.querySelector('.window-drag-line');
  if (dragLine) {
    dragLine.style.transition = 'opacity 0.3s';
    dragLine.style.opacity = '0';
    const onTransitionEnd = () => {
      dragLine.style.position = '';
      dragLine.style.top = '';
      dragLine.style.left = '';
      dragLine.style.transform = '';
      dragLine.style.zIndex = '';
      dragLine.style.pointerEvents = '';
      dragLine.style.width = '';
      dragLine.style.height = '';
      dragLine.style.background = '';
      dragLine.style.visibility = '';
      dragLine.style.opacity = '';
      dragLine.style.transition = '';
      dragLine.classList.remove('animating');
      dragLine.removeEventListener('transitionend', onTransitionEnd);
    };
    dragLine.addEventListener('transitionend', onTransitionEnd);
  }

  updateTaskbarFullscreen();
}

/**
 * Сфокусировать или создать окно
 */
export function focusOrCreate(app, intent) {
  for (let [id, obj] of state.windows) {
    if (obj.appType === app && !obj.minimized) { bringToFront(obj.element); return; }
  }
  for (let [id, obj] of state.windows) {
    if (obj.appType === app && obj.minimized) { restoreWindow(id); return; }
  }
  if (state.installedApps.has(app)) {
    createWindow(app, null, intent);
  } else {
    console.warn('Приложение не найдено:', app);
  }
}

/**
 * Обновить счетчик окон
 */
export function updateWindowCounter() {
  const openWindows = Array.from(state.windows.values()).filter(obj => !obj.minimized);
  document.getElementById('window-count-text').textContent = openWindows.length;
}
const statusBar = document.getElementById('status-bar');
const fullscreenPreview = document.getElementById('fullscreen-preview');

/**
 * Создать новое окно приложения
 */
export function createWindow(appType, customContent, intent, sourceRect = null) {
  const id = `${appType}-${Date.now()}`;
  const win = document.createElement('div');
  win.className = 'app-window';
  win.dataset.app = appType;
  win.dataset.id = id;

  // Целевые размеры и позиция
  const targetLeft = 100 + (state.windows.size % 5) * 30;
  const targetTop = 80 + (state.windows.size % 5) * 20;
  const targetWidth = 400;
  const targetHeight = 350;

  // Начальные размеры и позиция (если передан sourceRect)
  if (sourceRect) {
    const finalLeft = 100 + (state.windows.size % 5) * 30;
    const finalTop = 80 + (state.windows.size % 5) * 20;
    animateMorph(win,
        { left: sourceRect.left, top: sourceRect.top, width: sourceRect.width, height: sourceRect.height, borderRadius: '24px' },
        { left: finalLeft, top: finalTop, width: 400, height: 350, borderRadius: '24px' },
        { duration: 0.35, onComplete: () => { win.style.transition = ''; } }
    );
  } else {
    win.style.left = targetLeft + 'px';
    win.style.top = targetTop + 'px';
    win.style.width = targetWidth + 'px';
    win.style.height = targetHeight + 'px';
  }

  win.style.zIndex = ++state.nextZIndex;

  const dragLine = document.createElement('div');
  dragLine.className = 'window-drag-line';

  const header = document.createElement('div');
  header.className = 'window-header';
  header.innerHTML = `<span>${getAppDisplayName(appType)}</span>
    <div>
      <button class="minimize-btn"><span class="material-icons">minimize</span></button>
      <button class="close-btn"><span class="material-icons">close</span></button>
    </div>`;

  const content = document.createElement('div');
  content.className = 'window-content';

  if (customContent) {
    content.appendChild(customContent);
  } else {
    const app = state.installedApps.get(appType);
    if (app && typeof app.createWindow === 'function') {
      try {
        const appContent = app.createWindow(intent);
        if (appContent instanceof Node) content.appendChild(appContent);
        else content.innerHTML = '<p>Ошибка загрузки приложения</p>';
      } catch (e) {
        console.error('Ошибка создания окна приложения', appType, e);
        content.innerHTML = '<p>Ошибка при запуске приложения</p>';
      }
    } else {
      content.innerHTML = '<p>Приложение не найдено</p>';
    }
  }

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle material-icons';
  resizeHandle.textContent = 'open_in_full';

  win.append(dragLine, header, content, resizeHandle);
  windowsLayer.appendChild(win);

  state.windows.set(id, {
    element: win,
    appType,
    minimized: false,
    id,
    isFullscreen: false,
    prevRect: null
  });

  makeWindowDraggable(win, header);
  makeResizable(win, resizeHandle);

  win.querySelector('.close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow(id);
  });
  win.querySelector('.minimize-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeWindow(id);
  });

  win.addEventListener('mousedown', () => bringToFront(win));
  makeFullscreenDraggable(win, dragLine, id);

  // Анимация раскрытия из sourceRect
  if (sourceRect) {
    // Принудительный reflow
    win.offsetHeight;
    // Запускаем анимацию к целевым размерам и позиции
    win.style.transition = 'all 0.35s cubic-bezier(0.2, 0.9, 0.4, 1)';
    win.style.left = targetLeft + 'px';
    win.style.top = targetTop + 'px';
    win.style.width = targetWidth + 'px';
    win.style.height = targetHeight + 'px';

    // Убираем transition после завершения анимации
    const onTransitionEnd = () => {
      win.style.transition = '';
      win.removeEventListener('transitionend', onTransitionEnd);
    };
    win.addEventListener('transitionend', onTransitionEnd);
  }

  updateWindowCounter();
  updateTaskbarFullscreen();
  return id;
}

export function bringToFront(win) { 
  win.style.zIndex = ++state.nextZIndex; 
}

export function closeWindow(id) {
  const obj = state.windows.get(id);
  if (!obj) return;
  obj.element.classList.add('closing');
  setTimeout(() => {
    if (obj.cleanup) obj.cleanup();
    obj.element.remove();
    state.windows.delete(id);
    if (obj.minimized) removeMinimizedTab(id);
    updateWindowCounter();
    updateTaskbarFullscreen();
  }, 200);
}

export function updateTaskbarFullscreen() {
  let hasFullscreen = false;
  for (let [id, obj] of state.windows) {
    if (obj.isFullscreen && !obj.minimized) {
      hasFullscreen = true;
      break;
    }
  }
  taskbar.classList.toggle('fullscreen-active', hasFullscreen);
}

export function enterFullscreen(id) {
  const obj = state.windows.get(id);
  if (!obj || obj.isFullscreen) return;
  const win = obj.element;
  const desktopRect = desktop.getBoundingClientRect();
  const statusBar = document.getElementById('status-bar');
  const statusBarHeight = statusBar.offsetHeight;

  obj.prevRect = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
  obj.isFullscreen = true;
  win.classList.add('fullscreen');

  win.style.transform = 'none';
  win.style.willChange = 'auto';

  win.style.left = desktopRect.left + 'px';
  win.style.top = desktopRect.top + 'px';
  win.style.width = desktopRect.width + 'px';
  win.style.height = desktopRect.height + 'px';

  const dragLine = win.querySelector('.window-drag-line');
  if (dragLine) {
    const lineRect = dragLine.getBoundingClientRect();

    // Мгновенно фиксируем позицию линии в том месте, где она была (opacity: 0 – не видна)
    dragLine.style.transition = 'none';
    dragLine.style.position = 'fixed';
    dragLine.style.left = lineRect.left + 'px';
    dragLine.style.top = lineRect.top + 'px';
    dragLine.style.width = lineRect.width + 'px';
    dragLine.style.height = lineRect.height + 'px';
    dragLine.style.transform = 'none';
    dragLine.style.zIndex = '9999';
    dragLine.style.pointerEvents = 'auto';
    dragLine.style.visibility = 'visible';
    dragLine.style.background = 'var(--md-sys-color-outline-variant)';

    // Принудительный reflow, чтобы браузер «увидел» начальное состояние
    dragLine.offsetHeight;

    // Добавляем анимирующий класс (transition: all 0.3s …)
    dragLine.classList.add('animating');

    // Конечные стили – линия перемещается и одновременно плавно проявляется
    const statusBarRect = statusBar.getBoundingClientRect();
    dragLine.style.left = (statusBarRect.left + statusBarRect.width / 2) + 'px';
    dragLine.style.top = (statusBarRect.top + statusBarRect.height / 2) + 'px';
    dragLine.style.transform = 'translate(-50%, -50%)';
    dragLine.style.width = '80px';
    dragLine.style.height = '4px';
    dragLine.style.opacity = '1';

    const onTransitionEnd = () => {
      dragLine.classList.remove('animating');
      dragLine.removeEventListener('transitionend', onTransitionEnd);
    };
    dragLine.addEventListener('transitionend', onTransitionEnd);
  }

  updateTaskbarFullscreen();
}

export function exitFullscreen(id) {
  const obj = state.windows.get(id);
  if (!obj || !obj.isFullscreen) return;
  const win = obj.element;
  obj.isFullscreen = false;
  win.classList.remove('fullscreen');
  if (obj.prevRect) {
    win.style.left = obj.prevRect.left;
    win.style.top = obj.prevRect.top;
    win.style.width = obj.prevRect.width;
    win.style.height = obj.prevRect.height;
  } else {
    win.style.left = '100px';
    win.style.top = '80px';
    win.style.width = '400px';
    win.style.height = '350px';
  }

  const dragLine = win.querySelector('.window-drag-line');
  if (dragLine) {
    // Плавно скрываем линию перед сбросом инлайн-стилей
    dragLine.style.transition = 'opacity 0.3s';
    dragLine.style.opacity = '0';
    const onTransitionEnd = () => {
      dragLine.style.position = '';
      dragLine.style.top = '';
      dragLine.style.left = '';
      dragLine.style.transform = '';
      dragLine.style.zIndex = '';
      dragLine.style.pointerEvents = '';
      dragLine.style.width = '';
      dragLine.style.height = '';
      dragLine.style.background = '';
      dragLine.style.visibility = '';
      dragLine.style.opacity = '';
      dragLine.style.transition = '';
      dragLine.classList.remove('animating');
      dragLine.removeEventListener('transitionend', onTransitionEnd);
    };
    dragLine.addEventListener('transitionend', onTransitionEnd);
  }

  updateTaskbarFullscreen();
}

export function minimizeWindow(id) {
  const obj = state.windows.get(id);
  if (!obj || obj.minimized) return;
  const container = document.getElementById('minimized-windows');
  const app = state.installedApps.get(obj.appType);
  const icon = app ? app.icon : 'apps';
  const title = getAppDisplayName(obj.appType);
  let tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
  if (!tab) {
    tab = document.createElement('div');
    tab.className = 'minimized-tab';
    tab.dataset.windowId = id;
    tab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
    tab.addEventListener('click', (e) => { e.stopPropagation(); restoreWindow(id); });
    container.appendChild(tab);
  }
  tab.style.opacity = '1';
  tab.style.pointerEvents = 'auto';
  const tabRect = tab.getBoundingClientRect();
  if (obj.isFullscreen) {
    obj.isFullscreen = false;
    const win = obj.element;
    win.classList.remove('fullscreen');
    if (obj.prevRect) {
      win.style.left = obj.prevRect.left;
      win.style.top = obj.prevRect.top;
      win.style.width = obj.prevRect.width;
      win.style.height = obj.prevRect.height;
    }
    const dragLine = win.querySelector('.window-drag-line');
    if (dragLine) { dragLine.style.position = ''; dragLine.style.top = ''; dragLine.style.left = ''; dragLine.style.transform = ''; dragLine.style.zIndex = ''; dragLine.style.height = ''; dragLine.style.width = ''; }
    statusBar.style.backgroundColor = '';
    statusBar.style.backdropFilter = '';
    statusBar.style.borderBottom = '';
  }
  obj.minimized = true;
  obj.prevRect = { left: obj.element.style.left, top: obj.element.style.top, width: obj.element.style.width, height: obj.element.style.height };
  const dragLine = obj.element.querySelector('.window-drag-line');
  if (dragLine) { dragLine.style.transition = 'all 0.2s'; dragLine.style.width = '40px'; dragLine.style.opacity = '0'; }
  obj.element.style.transition = 'left 0.25s cubic-bezier(0.2,0,0,1), top 0.25s cubic-bezier(0.2,0,0,1), width 0.25s cubic-bezier(0.2,0,0,1), height 0.25s cubic-bezier(0.2,0,0,1), opacity 0.2s';
  obj.element.style.left = tabRect.left + 'px';
  obj.element.style.top = tabRect.top + 'px';
  obj.element.style.width = tabRect.width + 'px';
  obj.element.style.height = tabRect.height + 'px';
  obj.element.style.opacity = '0';
  setTimeout(() => {
    obj.element.style.display = 'none';
    obj.element.style.transition = '';
    obj.element.style.opacity = '';
    if (dragLine) { dragLine.style.transition = ''; dragLine.style.width = ''; dragLine.style.opacity = ''; }
  }, 250);
  updateWindowCounter();
  updateTaskbarFullscreen();
}

export function addMinimizedTab(windowObj) {
  const container = document.getElementById('minimized-windows');
  const app = state.installedApps.get(windowObj.appType);
  const icon = app ? app.icon : 'apps';
  const title = getAppDisplayName(windowObj.appType);
  const tab = document.createElement('div');
  tab.className = 'minimized-tab';
  tab.dataset.windowId = windowObj.id;
  tab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
  tab.addEventListener('click', (e) => { e.stopPropagation(); restoreWindow(windowObj.id); });
  container.appendChild(tab);
}

export function removeMinimizedTab(windowId) {
  const tab = document.querySelector(`.minimized-tab[data-window-id="${windowId}"]`);
  if (tab) tab.remove();
}

export function restoreWindow(id) {
  const obj = state.windows.get(id);
  if (!obj || !obj.minimized) return;
  const tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
  if (!tab) return;
  const tabRect = tab.getBoundingClientRect();
  obj.minimized = false;
  obj.element.style.display = 'flex';
  obj.element.style.transition = 'none';
  obj.element.style.width = tabRect.width + 'px';
  obj.element.style.height = tabRect.height + 'px';
  obj.element.style.left = tabRect.left + 'px';
  obj.element.style.top = tabRect.top + 'px';
  obj.element.style.opacity = '0';
  obj.element.style.zIndex = ++state.nextZIndex;
  const dragLine = obj.element.querySelector('.window-drag-line');
  if (dragLine) { dragLine.style.width = '40px'; dragLine.style.opacity = '0'; }
  requestAnimationFrame(() => {
    obj.element.style.transition = 'left 0.25s cubic-bezier(0.2,0,0,1), top 0.25s cubic-bezier(0.2,0,0,1), width 0.25s cubic-bezier(0.2,0,0,1), height 0.25s cubic-bezier(0.2,0,0,1), opacity 0.2s';
    obj.element.style.width = obj.prevRect?.width || '400px';
    obj.element.style.height = obj.prevRect?.height || '350px';
    obj.element.style.left = obj.prevRect?.left || '100px';
    obj.element.style.top = obj.prevRect?.top || '80px';
    obj.element.style.opacity = '1';
    if (dragLine) { dragLine.style.transition = 'width 0.25s, opacity 0.25s'; dragLine.style.width = '80px'; dragLine.style.opacity = ''; }
  });
  setTimeout(() => { obj.element.style.transition = ''; if (dragLine) dragLine.style.transition = ''; }, 250);
  removeMinimizedTab(id);
  updateWindowCounter();
  updateTaskbarFullscreen();
}

export function focusOrCreate(app, intent) {
  for (let [id, obj] of state.windows) {
    if (obj.appType === app && !obj.minimized) { bringToFront(obj.element); return; }
  }
  for (let [id, obj] of state.windows) {
    if (obj.appType === app && obj.minimized) { restoreWindow(id); return; }
  }
  if (state.installedApps.has(app)) {
    createWindow(app, null, intent);
  } else {
    console.warn('Приложение не найдено:', app);
  }
}

export function updateWindowCounter() {
  const openWindows = Array.from(state.windows.values()).filter(obj => !obj.minimized);
  document.getElementById('window-count-text').textContent = openWindows.length;
}

/**
 * Сделать линию перетаскивания фуллскрина draggable
 */
function makeFullscreenDraggable(win, dragLine, id) {
  let drag = false;
  let startY;
  const obj = state.windows.get(id);
  let previewDirection = null;
  let targetRect = null;
  let previewPlaceholderTab = null;

  // Сохраняем инлайн-стили, которые были установлены при входе в фулскрин
  let savedInlineStyles = null;

  const clearPreview = () => {
    if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
    fullscreenPreview.classList.remove('blur-active');
    fullscreenPreview.style.display = 'none';
    dragLine.classList.remove('preview-minimize');
    dragLine.classList.remove('active-gesture');
    dragLine.classList.remove('animating');
    previewDirection = null;
    targetRect = null;

    // Восстанавливаем инлайн-стили линии, если они были сохранены
    if (savedInlineStyles) {
      dragLine.style.width = savedInlineStyles.width;
      dragLine.style.height = savedInlineStyles.height;
      dragLine.style.background = savedInlineStyles.background;
      savedInlineStyles = null;
    }
  };

  const getStartRect = () => {
    if (obj.minimized) {
      const tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
      if (tab) { const rect = tab.getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; }
      return { left: 0, top: 0, width: 120, height: 56 };
    }
    return win.getBoundingClientRect();
  };

  const animatePreviewTo = (direction) => {
    if (previewDirection === direction) return;
    const desktopRect = desktop.getBoundingClientRect();
    const taskbarRect = taskbar.getBoundingClientRect();
    const startRect = getStartRect();
    let newTarget;
    let blurActive = false;
    if (direction === 'fullscreen') {
      newTarget = { left: desktopRect.left + 16, top: desktopRect.top + 16, width: desktopRect.width - 32, height: desktopRect.height - 32 };
      blurActive = true;
      dragLine.classList.add('active-gesture');
    } else if (direction === 'normal') {
      const left = obj.prevRect?.left ? parseFloat(obj.prevRect.left) : 100;
      const top = obj.prevRect?.top ? parseFloat(obj.prevRect.top) : 80;
      const width = obj.prevRect?.width ? parseFloat(obj.prevRect.width) : 400;
      const height = obj.prevRect?.height ? parseFloat(obj.prevRect.height) : 350;
      newTarget = { left, top, width, height };
      blurActive = true;
      dragLine.classList.add('active-gesture');
    } else if (direction === 'minimized') {
      if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
      const container = document.getElementById('minimized-windows');
      const app = state.installedApps.get(obj.appType);
      const icon = app ? app.icon : 'apps';
      const title = getAppDisplayName(obj.appType);
      const tempTab = document.createElement('div');
      tempTab.className = 'minimized-tab';
      tempTab.style.opacity = '0';
      tempTab.style.pointerEvents = 'none';
      tempTab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
      container.appendChild(tempTab);
      const tabRect = tempTab.getBoundingClientRect();
      tempTab.remove();
      previewPlaceholderTab = document.createElement('div');
      previewPlaceholderTab.className = 'minimized-tab preview-placeholder';
      previewPlaceholderTab.style.opacity = '0';
      previewPlaceholderTab.style.transition = 'opacity 0.2s';
      previewPlaceholderTab.style.pointerEvents = 'none';
      previewPlaceholderTab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
      container.appendChild(previewPlaceholderTab);
      previewPlaceholderTab.offsetHeight;
      previewPlaceholderTab.style.opacity = '0.6';
      newTarget = { left: tabRect.left, top: tabRect.top, width: tabRect.width, height: tabRect.height };
      blurActive = false;
      dragLine.classList.add('active-gesture');
    } else {
      newTarget = startRect;
      blurActive = false;
      dragLine.classList.remove('active-gesture');
    }
    fullscreenPreview.style.left = startRect.left + 'px';
    fullscreenPreview.style.top = startRect.top + 'px';
    fullscreenPreview.style.width = startRect.width + 'px';
    fullscreenPreview.style.height = startRect.height + 'px';
    fullscreenPreview.style.display = 'block';
    fullscreenPreview.offsetHeight;
    fullscreenPreview.style.left = newTarget.left + 'px';
    fullscreenPreview.style.top = newTarget.top + 'px';
    fullscreenPreview.style.width = newTarget.width + 'px';
    fullscreenPreview.style.height = newTarget.height + 'px';
    if (blurActive) fullscreenPreview.classList.add('blur-active'); else fullscreenPreview.classList.remove('blur-active');
    previewDirection = direction;
    targetRect = newTarget;
    dragLine.classList.toggle('preview-minimize', direction === 'minimized');
  };

  const onMouseMove = e => {
    if (!drag) return;
    e.preventDefault();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = clientY - startY;
    const threshold = 40;
    const strongThreshold = 100;
    let newDirection = null;
    if (obj.isFullscreen) {
      if (dy > strongThreshold) newDirection = 'minimized';
      else if (dy > threshold) newDirection = 'normal';
    } else if (obj.minimized) {
      if (dy < -strongThreshold) newDirection = 'fullscreen';
      else if (dy < -threshold) newDirection = 'normal';
    } else {
      if (dy < -threshold) newDirection = 'fullscreen';
      else if (dy > threshold) newDirection = 'minimized';
    }
    if (!newDirection && previewDirection !== null) animatePreviewTo(null);
    else if (newDirection) animatePreviewTo(newDirection);
  };

  const onMouseUp = e => {
    if (!drag) return;
    drag = false;
    win.style.transition = '';
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dy = clientY - startY;
    const threshold = 20;
    const strongThreshold = 80;
    let action = null;
    if (obj.isFullscreen) {
      if (dy > strongThreshold) action = 'minimize';
      else if (dy > threshold) action = 'exitFullscreen';
    } else if (obj.minimized) {
      if (dy < -strongThreshold) action = 'fullscreen';
      else if (dy < -threshold) action = 'restore';
    } else {
      if (dy < -threshold) action = 'fullscreen';
      else if (dy > threshold) action = 'minimize';
    }
    if (!action) {
      fullscreenPreview.style.opacity = '0';
      fullscreenPreview.classList.remove('blur-active');
      const onTransitionEnd = () => {
        fullscreenPreview.style.display = 'none';
        fullscreenPreview.style.opacity = '';
        fullscreenPreview.removeEventListener('transitionend', onTransitionEnd);
        if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
      };
      fullscreenPreview.addEventListener('transitionend', onTransitionEnd);
      setTimeout(() => {
        fullscreenPreview.style.display = 'none';
        fullscreenPreview.style.opacity = '';
        fullscreenPreview.removeEventListener('transitionend', onTransitionEnd);
        if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
      }, 300);
    } else {
      fullscreenPreview.style.display = 'none';
      fullscreenPreview.classList.remove('blur-active');
      if (previewPlaceholderTab) { previewPlaceholderTab.remove(); previewPlaceholderTab = null; }
    }
    // Убираем все временные классы и восстанавливаем инлайн-стили, если жест отменён
    dragLine.classList.remove('preview-minimize');
    dragLine.classList.remove('active-gesture');
    dragLine.classList.remove('animating');
    if (savedInlineStyles) {
      dragLine.style.width = savedInlineStyles.width;
      dragLine.style.height = savedInlineStyles.height;
      dragLine.style.background = savedInlineStyles.background;
      savedInlineStyles = null;
    }
    previewDirection = null;
    targetRect = null;
    if (action) {
      if (action === 'fullscreen') enterFullscreen(id);
      else if (action === 'exitFullscreen') exitFullscreen(id);
      else if (action === 'minimize') minimizeWindow(id);
      else if (action === 'restore') restoreWindow(id);
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchend', onMouseUp);
  };

  const startDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    drag = true;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startY = clientY;
    win.style.transition = 'none';
    clearPreview();

    // Если окно в полноэкранном режиме, убираем инлайн-стили, мешающие классам менять форму линии
    if (obj.isFullscreen) {
      savedInlineStyles = {
        width: dragLine.style.width,
        height: dragLine.style.height,
        background: dragLine.style.background
      };
      dragLine.style.width = '';
      dragLine.style.height = '';
      dragLine.style.background = '';
      dragLine.classList.add('animating');  // включаем плавность
    } else {
      savedInlineStyles = null;
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onMouseMove, {passive: false});
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);
  };

  dragLine.addEventListener('mousedown', startDrag);
  dragLine.addEventListener('touchstart', startDrag, {passive: false});
}
