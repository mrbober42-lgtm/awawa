/**
 * Вспомогательные функции
 */
import { GRID_SIZE } from './constants.js';

/**
 * Прилипание к сетке
 */
export function snapToGrid(v) {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

/**
 * Анимация изменения размеров, позиции и скругления элемента
 */
export function animateMorph(element, fromRect, toRect, options = {}) {
  const duration = options.duration || 0.4;
  const easing = options.easing || 'cubic-bezier(0.2, 0.9, 0.4, 1)';
  const onComplete = options.onComplete || (() => {});

  const prevOverflow = element.style.overflow;
  element.style.overflow = 'hidden';

  element.style.position = 'fixed';
  element.style.left = fromRect.left + 'px';
  element.style.top = fromRect.top + 'px';
  element.style.width = fromRect.width + 'px';
  element.style.height = fromRect.height + 'px';
  if (fromRect.borderRadius !== undefined) {
    element.style.borderRadius = fromRect.borderRadius;
  }
  element.style.transition = 'none';
  element.offsetHeight; // reflow

  element.style.transition = `all ${duration}s ${easing}`;
  element.style.left = toRect.left + 'px';
  element.style.top = toRect.top + 'px';
  element.style.width = toRect.width + 'px';
  element.style.height = toRect.height + 'px';
  if (toRect.borderRadius !== undefined) {
    element.style.borderRadius = toRect.borderRadius;
  }

  const onTransitionEnd = () => {
    element.removeEventListener('transitionend', onTransitionEnd);
    element.style.transition = '';
    element.style.overflow = prevOverflow;
    onComplete();
  };
  element.addEventListener('transitionend', onTransitionEnd);
  
  setTimeout(() => {
    if (element.style.transition !== '') onTransitionEnd();
  }, duration * 1000 + 100);
}

/**
 * Сделать элемент перетаскиваемым
 */
export function makeDraggable(el, container, snap = false) {
  let ox, oy, drag = false, raf;
  
  const startDrag = (e) => {
    if (e.button && e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('.widget-resize-handle') || e.target.closest('.tile-resize-lever')) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ox = clientX - r.left;
    oy = clientY - r.top;
    drag = true;
    el.style.cursor = 'grabbing';
    el.classList.add('dragging');
  };
  
  const moveDrag = (e) => {
    if (!drag) return;
    e.preventDefault();
    raf = requestAnimationFrame(() => {
      const cr = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      let x = clientX - ox - cr.left;
      let y = clientY - oy - cr.top;
      if (snap) { x = snapToGrid(x); y = snapToGrid(y); }
      x = Math.max(0, Math.min(x, cr.width - el.offsetWidth));
      y = Math.max(0, Math.min(y, cr.height - el.offsetHeight));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });
  };
  
  const endDrag = () => {
    drag = false;
    el.style.cursor = '';
    el.classList.remove('dragging');
  };
  
  el.addEventListener('mousedown', startDrag);
  el.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchmove', moveDrag, { passive: false });
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
}

/**
 * Сделать элемент изменяемым по размеру
 */
export function makeResizable(el, handle, snap) {
  let startX, startY, startWidth, startHeight, resizing = false;
  let rafId = null;
  
  const onMouseMove = (e) => {
    if (!resizing) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      let newWidth = startWidth + clientX - startX;
      let newHeight = startHeight + clientY - startY;
      if (snap) { newWidth = snapToGrid(newWidth); newHeight = snapToGrid(newHeight); }
      newWidth = Math.max(260, newWidth);
      newHeight = Math.max(180, newHeight);
      el.style.width = newWidth + 'px';
      el.style.height = newHeight + 'px';
    });
  };
  
  const onMouseUp = () => {
    if (resizing) {
      resizing = false;
      el.classList.remove('resizing');
      el.style.transition = '';
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
    }
    el.style.transition = '';
  };
  
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    el.classList.add('resizing');
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    startWidth = el.offsetWidth;
    startHeight = el.offsetHeight;
    el.style.transition = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);
  };
  
  handle.addEventListener('mousedown', startResize);
  handle.addEventListener('touchstart', startResize, { passive: false });
}

/**
 * Получить отображаемое имя приложения
 */
export function getAppDisplayName(appId) {
  const s = window.state || state;
  if (s && s.installedApps && s.installedApps.has(appId)) return s.installedApps.get(appId).name;
  const m = { settings: 'Настройки', calculator: 'Калькулятор', clock: 'Часы', downloads: 'Загрузки' };
  return m[appId] || appId;
}

/**
 * Получить иконку приложения
 */
export function getAppIcon(appId) {
  const s = window.state || state;
  if (!s || !s.installedApps || !s.installedApps.has(appId)) {
    const m = { settings: 'settings', calculator: 'calculate', clock: 'schedule', downloads: 'download' };
    return m[appId] || 'apps';
  }
  return s.installedApps.get(appId).icon || 'extension';
}
