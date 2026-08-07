// PanelManager.js - Управление панелями (QS, уведомления, app drawer, power menu)
import { state } from '../core/state.js';
import { renderTiles } from './TileManager.js';
import { renderNotifications } from './NotificationManager.js';
import { focusOrCreate, closeWindow } from './WindowManager.js';
import { renderAppDrawer as renderAppDrawerFn } from './AppManager.js';

const qsPanel = document.getElementById('qs-panel');
const notifPanel = document.getElementById('notif-panel');
const appDrawer = document.getElementById('app-drawer');
const appDrawerOverlay = document.getElementById('app-drawer-overlay');
const shadeOverlay = document.getElementById('shade-overlay');
const powerMenu = document.getElementById('power-menu');

/**
 * Анимация открытия панели
 */
export function animatePanelOpen(panel) {
  return new Promise(resolve => {
    if (panel.classList.contains('opening') || panel.classList.contains('closing')) return resolve();
    panel.classList.remove('closing');
    panel.classList.add('opening');
    panel.style.display = 'flex';
    panel.classList.add('active');
    setTimeout(() => {
      panel.classList.remove('opening');
      resolve();
    }, 400);
  });
}

/**
 * Анимация закрытия панели
 */
export function animatePanelClose(panel) {
  return new Promise(resolve => {
    if (panel.classList.contains('opening') || panel.classList.contains('closing')) return resolve();
    panel.classList.remove('opening');
    panel.classList.add('closing');
    panel.classList.remove('active');
    setTimeout(() => {
      panel.classList.remove('closing');
      panel.style.display = 'none';
      resolve();
    }, 400);
  });
}

/**
 * Мгновенно скрыть панель
 */
export function hidePanelInstantly(panel) {
  panel.classList.remove('opening', 'closing', 'active');
  panel.style.display = 'none';
}

/**
 * Открыть только QS
 */
export function openQSOnly() {
  // Мгновенно скрываем другую панель, если она видна
  if (notifPanel.style.display === 'block' || notifPanel.classList.contains('active')) {
    hidePanelInstantly(notifPanel);
  }
  // Сбрасываем редактор
  qsPanel.classList.remove('qs-edit-mode');
  renderTiles();
  // Если панель уже открыта – ничего не делаем
  if (qsPanel.style.display === 'block' || qsPanel.classList.contains('active')) return;
  // Запускаем открытие
  animatePanelOpen(qsPanel);
}

/**
 * Открыть только уведомления
 */
export function openNotifOnly() {
  if (qsPanel.style.display === 'block' || qsPanel.classList.contains('active')) {
    hidePanelInstantly(qsPanel);
  }
  renderNotifications();
  if (notifPanel.style.display === 'block' || notifPanel.classList.contains('active')) return;
  animatePanelOpen(notifPanel);
}

/**
 * Закрыть все шторки
 */
export function closeAllShade() {
  hidePanelInstantly(qsPanel);
  hidePanelInstantly(notifPanel);
  shadeOverlay.classList.remove('active');
  qsPanel.classList.remove('qs-edit-mode');
}

/**
 * Переключить app drawer
 */
export function toggleDrawer(show) {
  appDrawer.classList.toggle('active', show);
  appDrawerOverlay.classList.toggle('active', show);
}

/**
 * Инициализировать обработчики панелей
 */
export function initPanelHandlers() {
  let pressTimer;

  // QS и уведомления
  document.getElementById('qs-btn').onclick = () => openQSOnly();
  document.getElementById('notif-btn').onclick = () => openNotifOnly();
  shadeOverlay.onclick = () => closeAllShade();

  // Кнопки управления в QS
  document.getElementById('qs-brightness').oninput = e => {
    const v = e.target.value;
    localStorage.setItem('brightness', v);
    const overlay = document.getElementById('brightness-overlay');
    if (overlay) overlay.style.opacity = (100 - v) / 100 * 0.6;
  };

  // Power menu (долгое нажатие)
  document.getElementById('status-pill').addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => powerMenu.classList.add('active'), 800);
  });
  document.getElementById('status-pill').addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => powerMenu.classList.add('active'), 800);
  }, { passive: true });
  document.getElementById('status-pill').addEventListener('mouseup', () => clearTimeout(pressTimer));
  document.getElementById('status-pill').addEventListener('touchend', () => clearTimeout(pressTimer));

  // App drawer
  document.getElementById('app-drawer-btn').onclick = () => {
    renderAppDrawerFn();
    toggleDrawer(true);
  };
  document.getElementById('close-drawer').onclick = () => toggleDrawer(false);
  appDrawerOverlay.onclick = () => toggleDrawer(false);

  // Кнопка назад
  document.getElementById('back-button').onclick = () => {
    if (qsPanel.classList.contains('active') || notifPanel.classList.contains('active')) {
      closeAllShade();
    } else if (appDrawer.classList.contains('active')) {
      toggleDrawer(false);
    } else {
      const wins = [...state.windows.values()].filter(w => !w.minimized);
      if (wins.length) {
        closeWindow(wins[wins.length-1].id);
      }
    }
  };
}
