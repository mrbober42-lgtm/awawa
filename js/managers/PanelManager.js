// PanelManager.js - Управление панелями (QS, уведомления, app drawer, power menu)
import { state } from '../core/state.js';
import { renderTiles } from './TileManager.js';
import { renderNotifications } from './NotificationManager.js';
import { focusOrCreate, closeWindow } from './WindowManager.js';

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
    panel.style.display = 'block';
    shadeOverlay.classList.add('active');
    panel.style.opacity = '';
    panel.style.transform = '';
    panel.classList.add('opening');
    const onFinish = () => {
      panel.classList.remove('opening');
      panel.style.opacity = '1';
      panel.style.transform = 'perspective(800px) rotateY(0deg) translateX(0) translateY(0) scale(1)';
      panel.removeEventListener('animationend', onFinish);
      resolve();
    };
    panel.addEventListener('animationend', onFinish, { once: true });
  });
}

/**
 * Анимация закрытия панели
 */
export function animatePanelClose(panel) {
  return new Promise(resolve => {
    if (panel.classList.contains('opening') || panel.classList.contains('closing')) return resolve();
    panel.classList.add('closing');
    const onFinish = () => {
      panel.classList.remove('closing');
      panel.style.display = 'none';
      panel.style.opacity = '';
      panel.style.transform = '';
      if (qsPanel.style.display === 'none' && notifPanel.style.display === 'none') {
        shadeOverlay.classList.remove('active');
      }
      panel.removeEventListener('animationend', onFinish);
      resolve();
    };
    panel.addEventListener('animationend', onFinish, { once: true });
  });
}

/**
 * Мгновенно скрыть панель (если была в процессе анимации)
 */
export function hidePanelInstantly(panel) {
  panel.classList.remove('opening', 'closing');
  panel.style.display = 'none';
  panel.style.opacity = '';
  panel.style.transform = '';
}

export function openQSOnly() {
  // Мгновенно скрываем другую панель, если она видна
  if (notifPanel.style.display === 'block') {
    hidePanelInstantly(notifPanel);
  }
  // Сбрасываем редактор
  qsPanel.classList.remove('qs-edit-mode');
  renderTiles();
  // Если панель уже открыта – ничего не делаем
  if (qsPanel.style.display === 'block') return;
  // Запускаем открытие
  animatePanelOpen(qsPanel);
}

export function openNotifOnly() {
  if (qsPanel.style.display === 'block') {
    hidePanelInstantly(qsPanel);
  }
  renderNotifications();
  if (notifPanel.style.display === 'block') return;
  animatePanelOpen(notifPanel);
}

export function closeAllShade() {
  hidePanelInstantly(qsPanel);
  hidePanelInstantly(notifPanel);
  shadeOverlay.classList.remove('active');
  qsPanel.classList.remove('qs-edit-mode');
}

export function toggleDrawer(show) { 
  appDrawer.classList.toggle('active', show); 
  appDrawerOverlay.classList.toggle('active', show); 
}

/**
 * Инициализация обработчиков событий для панелей
 */
export function initPanelEventListeners(renderAppDrawerFn) {
  // Кнопки закрытия QS и уведомлений
  document.getElementById('close-qs').onclick = closeAllShade;
  document.getElementById('close-notif').onclick = closeAllShade;
  shadeOverlay.onclick = closeAllShade;
  
  // Кнопка настроек в QS
  document.getElementById('qs-settings-btn').onclick = () => { 
    closeAllShade(); 
    focusOrCreate('settings'); 
  };
  
  // Слайдер яркости
  document.getElementById('brightness-slider').oninput = e => {
    const brightnessOverlay = document.getElementById('brightness-overlay');
    brightnessOverlay.style.opacity = (100 - e.target.value)/100 * 0.6;
  };
  
  // Единая таблетка слева (индикатор уведомлений)
  const unifiedPill = document.getElementById('unified-pill');
  if (unifiedPill) {
    unifiedPill.addEventListener('click', (e) => {
      openNotifOnly();
    });
  }
  
  // Батарея (справа) открывает QS
  document.getElementById('status-pill').onclick = openQSOnly;
  
  // Долгое нажатие на батарею — меню питания
  let pressTimer;
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
