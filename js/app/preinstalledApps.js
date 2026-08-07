// Предустановленные приложения (preinstalledApps)
import { downloadsApp } from './downloads.js';

export const preinstalledApps = [
  downloadsApp,
  
  // Часы
  { 
    id: 'clock', 
    name: 'Часы', 
    icon: 'schedule', 
    createWindow: () => {
      const container = document.createElement('div');
      container.style.cssText = 'display:flex;flex-direction:column;height:100%;padding:20px;gap:16px;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);';
      
      const header = document.createElement('h2');
      header.textContent = 'Часы';
      header.style.margin = '0';
      container.appendChild(header);
      
      const clockDisplay = document.createElement('div');
      clockDisplay.style.cssText = 'font-size:72px;font-weight:bold;text-align:center;margin-top:40px;';
      container.appendChild(clockDisplay);
      
      const updateClock = () => {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      };
      
      updateClock();
      setInterval(updateClock, 1000);
      
      return container;
    }
  },
  
  // Калькулятор
  { 
    id: 'calculator', 
    name: 'Калькулятор', 
    icon: 'calculate', 
    createWindow: () => {
      const container = document.createElement('div');
      container.style.cssText = 'display:flex;flex-direction:column;height:100%;padding:20px;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);';
      
      const display = document.createElement('input');
      display.type = 'text';
      display.readOnly = true;
      display.style.cssText = 'width:100%;height:80px;font-size:32px;text-align:right;padding:16px;border:none;border-radius:16px;background:var(--md-sys-color-surface-container);color:var(--md-sys-color-on-surface);margin-bottom:16px;';
      container.appendChild(display);
      
      const buttons = [
        ['7', '8', '9', '/'],
        ['4', '5', '6', '*'],
        ['1', '2', '3', '-'],
        ['C', '0', '=', '+']
      ];
      
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:1;';
      
      buttons.forEach(row => {
        row.forEach(btn => {
          const button = document.createElement('button');
          button.textContent = btn;
          button.className = 'taskbar-btn';
          button.style.cssText = 'aspect-ratio:1;font-size:24px;border-radius:16px;';
          
          if (btn === '=') {
            button.onclick = () => {
              try {
                display.value = eval(display.value);
              } catch(e) {
                display.value = 'Ошибка';
              }
            };
          } else if (btn === 'C') {
            button.onclick = () => { display.value = ''; };
          } else {
            button.onclick = () => { display.value += btn; };
          }
          
          grid.appendChild(button);
        });
      });
      
      container.appendChild(grid);
      return container;
    }
  },
  
  // Настройки (базовая версия)
  { 
    id: 'settings', 
    name: 'Настройки', 
    icon: 'settings', 
    createWindow: () => {
      const container = document.createElement('div');
      container.style.cssText = 'display:flex;height:100%;background:var(--md-sys-color-surface);';
      
      const sidebar = document.createElement('div');
      sidebar.style.cssText = 'width:280px;border-right:1px solid var(--md-sys-color-outline-variant);padding:16px 0;overflow-y:auto;';
      
      const contentArea = document.createElement('div');
      contentArea.style.cssText = 'flex:1;padding:24px;overflow-y:auto;';
      contentArea.innerHTML = '<h2 style="margin:0;">Добро пожаловать в настройки</h2><p style="opacity:0.7;margin-top:8px;">Выберите категорию слева</p>';
      
      container.append(sidebar, contentArea);
      
      const categories = [
        { id: 'network', label: 'Сеть и интернет', icon: 'wifi' },
        { id: 'display', label: 'Экран', icon: 'brightness_6' },
        { id: 'sound', label: 'Звук', icon: 'volume_up' },
        { id: 'apps', label: 'Приложения', icon: 'apps' }
      ];
      
      categories.forEach(cat => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:12px 24px;display:flex;align-items:center;gap:16px;cursor:pointer;transition:background 0.2s;';
        item.innerHTML = `<span class="material-icons">${cat.icon}</span><span>${cat.label}</span>`;
        item.addEventListener('mouseenter', () => item.style.background = 'var(--md-sys-color-surface-container-high)');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('click', () => {
          contentArea.innerHTML = `<h2>${cat.label}</h2><p style="opacity:0.7;">Раздел в разработке</p>`;
        });
        sidebar.appendChild(item);
      });
      
      return container;
    }
  }
];
