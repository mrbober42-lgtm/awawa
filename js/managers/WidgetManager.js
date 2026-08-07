// WidgetManager.js - Виджеты (регистрация, создание окон)
import { state } from '../core/state.js';

/**
 * Зарегистрировать виджет
 */
export function registerWidget(widgetDef) {
  if (!widgetDef || !widgetDef.id) return;
  state.widgets.set(widgetDef.id, widgetDef);
}

/**
 * Создать окно виджета
 */
export function createWidgetWindow(widgetId, x, y) {
  const def = state.widgets.get(widgetId);
  if (!def) return;
  
  const id = `widget-${widgetId}-${Date.now()}`;
  const win = document.createElement('div');
  win.className = 'widget-window';
  win.dataset.widgetId = widgetId;
  win.dataset.id = id;
  win.style.left = (x || 100) + 'px';
  win.style.top = (y || 100) + 'px';
  win.style.zIndex = ++state.nextZIndex;
  
  const content = document.createElement('div');
  content.className = 'widget-content';
  
  if (typeof def.content === 'function') {
    const html = def.content();
    if (typeof html === 'string') {
      content.innerHTML = html;
    } else if (html instanceof Node) {
      content.appendChild(html);
    }
  }
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'widget-close-btn material-icons';
  closeBtn.textContent = 'close';
  closeBtn.addEventListener('click', () => closeWidgetWindow(id));
  
  win.append(closeBtn, content);
  document.getElementById('desktop').appendChild(win);
  
  state.windows.set(id, {
    element: win,
    appType: 'widget',
    minimized: false,
    id,
    isFullscreen: false,
    prevRect: null,
    cleanup: def.cleanup ? () => def.cleanup(content) : null
  });
  
  // Сделать виджет перетаскиваемым
  let drag = false, ox, oy;
  win.addEventListener('mousedown', (e) => {
    if (e.target === closeBtn) return;
    drag = true;
    const rect = win.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    win.style.transition = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!drag) return;
    win.style.left = (e.clientX - ox) + 'px';
    win.style.top = (e.clientY - oy) + 'px';
  });
  window.addEventListener('mouseup', () => { drag = false; });
  
  return id;
}

/**
 * Закрыть окно виджета
 */
export function closeWidgetWindow(id) {
  const obj = state.windows.get(id);
  if (!obj) return;
  if (obj.cleanup) obj.cleanup();
  obj.element.remove();
  state.windows.delete(id);
}

/**
 * Инициализировать встроенные виджеты
 */
export function initBuiltInWidgets() {
  // Аналоговые часы
  registerWidget({ 
    id: 'analog', 
    name: 'Аналоговые часы', 
    content: () => {
      const container = document.createElement('div');
      container.style.cssText = 'text-align:center;';
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      container.appendChild(canvas);
      
      const draw = () => {
        const ctx = canvas.getContext('2d');
        const now = new Date();
        const sec = now.getSeconds();
        const min = now.getMinutes();
        const hr = now.getHours();
        
        ctx.clearRect(0, 0, 150, 150);
        ctx.save();
        ctx.translate(75, 75);
        
        // Циферблат
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Часовая стрелка
        ctx.save();
        ctx.rotate((hr % 12) * Math.PI / 6 + min * Math.PI / 360);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -40);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
        
        // Минутная стрелка
        ctx.save();
        ctx.rotate(min * Math.PI / 30 + sec * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -60);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        
        // Секундная стрелка
        ctx.save();
        ctx.rotate(sec * Math.PI / 30);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -65);
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        
        ctx.restore();
        requestAnimationFrame(draw);
      };
      
      draw();
      return container;
    }
  });
  
  // Цифровые часы
  registerWidget({ 
    id: 'digital', 
    name: 'Цифровые часы', 
    content: () => {
      const div = document.createElement('div');
      div.style.cssText = 'font-size:32px; font-weight:bold;';
      const update = () => {
        const now = new Date();
        div.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      };
      update();
      setInterval(update, 1000);
      return div;
    }
  });
}

/**
 * Инициализировать контекстное меню для добавления виджетов
 */
export function initWidgetContextMenu() {
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
      const { focusOrCreate } = require('./WindowManager.js');
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
  
  window.addEventListener('click', () => {
    contextMenu.style.display = 'none';
  });
}
