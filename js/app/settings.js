// Приложение "Настройки" (Settings)
import { state } from '../core/state.js';
import { applyAccentColor, applyWallpaper } from '../managers/ThemeManager.js';
import { renderNotifications } from '../managers/NotificationManager.js';
import { renderTiles } from '../managers/TileManager.js';
import { toggleDrawer } from '../managers/AppManager.js';

export const settingsApp = {
  id: 'settings',
  name: 'Настройки',
  icon: 'settings',
  createWindow: () => {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex; height:100%; background:var(--md-sys-color-surface);';
    const sidebar = document.createElement('div');
    sidebar.style.cssText = 'width:280px; border-right:1px solid var(--md-sys-color-outline-variant); padding:16px 0; overflow-y:auto;';
    container.appendChild(sidebar);
    const contentArea = document.createElement('div');
    contentArea.style.cssText = 'flex:1; padding:24px; overflow-y:auto;';
    container.appendChild(contentArea);
    const categories = [
      { id: 'network', label: 'Сеть и интернет', icon: 'wifi' },
      { id: 'connected', label: 'Подключенные устройства', icon: 'devices' },
      { id: 'apps', label: 'Приложения', icon: 'apps' },
      { id: 'notifications', label: 'Уведомления', icon: 'notifications' },
      { id: 'display', label: 'Экран', icon: 'brightness_6' },
      { id: 'sound', label: 'Звук', icon: 'volume_up' },
      { id: 'storage', label: 'Хранилище', icon: 'storage' },
      { id: 'security', label: 'Безопасность', icon: 'security' },
      { id: 'accounts', label: 'Аккаунты', icon: 'account_circle' },
      { id: 'accessibility', label: 'Спец. возможности', icon: 'accessibility' },
      { id: 'system', label: 'Система', icon: 'info' }
    ];
    const searchDiv = document.createElement('div');
    searchDiv.style.cssText = 'padding:0 16px 16px;';
    searchDiv.innerHTML = `
      <div style="background:var(--md-sys-color-surface-container); border-radius:28px; padding:4px 16px; display:flex; align-items:center;">
        <span class="material-icons">search</span>
        <input id="settings-search" type="text" placeholder="Поиск настроек" style="border:none; background:transparent; padding:12px; width:100%; outline:none; color:var(--md-sys-color-on-surface);">
      </div>
    `;
    sidebar.appendChild(searchDiv);
    const renderCategories = (filter = '') => {
      sidebar.querySelectorAll('.category-item').forEach(el => el.remove());
      const filtered = categories.filter(cat => !filter || cat.label.toLowerCase().includes(filter));
      filtered.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.style.cssText = 'padding:12px 24px; display:flex; align-items:center; gap:16px; cursor:pointer; transition:background 0.2s;';
        item.innerHTML = `<span class="material-icons">${cat.icon}</span><span>${cat.label}</span>`;
        item.onmouseenter = () => item.style.background = 'var(--md-sys-color-surface-container)';
        item.onmouseleave = () => item.style.background = '';
        item.onclick = () => renderCategoryContent(cat.id);
        sidebar.appendChild(item);
      });
    };
    const renderCategoryContent = (categoryId) => {
      contentArea.innerHTML = '';
      const h2 = document.createElement('h2');
      h2.style.marginBottom = '24px';
      const section = document.createElement('div');
      section.className = 'settings-section';
      const addToggleItem = (label, id, checked, onChange) => {
        const div = document.createElement('div');
        div.className = 'settings-item';
        div.innerHTML = `<span>${label}</span>`;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = checked;
        if (onChange) checkbox.onchange = onChange;
        div.appendChild(checkbox);
        section.appendChild(div);
      };
      const addSliderItem = (label, id, value, min, max, onChange) => {
        const div = document.createElement('div');
        div.className = 'settings-item';
        div.innerHTML = `<span>${label}</span>`;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = id;
        slider.min = min;
        slider.max = max;
        slider.value = value;
        if (onChange) slider.oninput = onChange;
        div.appendChild(slider);
        section.appendChild(div);
      };
      const addButtonItem = (label, btnText, onClick) => {
        const div = document.createElement('div');
        div.className = 'settings-item';
        div.innerHTML = `<span>${label}</span>`;
        const btn = document.createElement('button');
        btn.className = 'taskbar-btn';
        btn.textContent = btnText;
        btn.onclick = onClick;
        div.appendChild(btn);
        section.appendChild(div);
      };
      switch(categoryId) {
        case 'network':
          h2.textContent = 'Сеть и интернет';
          addToggleItem('Wi-Fi', 'wifi-toggle', localStorage.getItem('wifi') !== 'false', e => localStorage.setItem('wifi', e.target.checked));
          addToggleItem('Мобильные данные', 'mobile-data-toggle', true, null);
          addToggleItem('Режим полёта', 'airplane-toggle', false, null);
          addButtonItem('Точка доступа', 'Настроить', () => alert('Точка доступа'));
          addButtonItem('VPN', 'Добавить', () => alert('Добавление VPN'));
          break;
        case 'display':
          h2.textContent = 'Экран';
          addSliderItem('Яркость', 'brightness-slider', localStorage.getItem('brightness') || 80, 0, 100, e => {
            const v = e.target.value;
            localStorage.setItem('brightness', v);
            const overlay = document.getElementById('brightness-overlay');
            if (overlay) overlay.style.opacity = (100 - v) / 100 * 0.6;
          });
          addToggleItem('Тёмная тема', 'theme-toggle', document.body.classList.contains('dark-theme'), e => {
            document.body.classList.toggle('dark-theme', e.target.checked);
            localStorage.setItem('android16-theme', e.target.checked ? 'dark' : 'light');
            applyWallpaper();
            applyAccentColor(state.accentColor);
          });
          addButtonItem('Обои', 'Сменить', () => {
            state.wallpaper = state.wallpaper === 'grad1' ? 'grad2' : 'grad1';
            localStorage.setItem('wallpaper', state.wallpaper);
            applyWallpaper();
          });
          addButtonItem('Акцентный цвет', 'Выбрать', () => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = state.accentColor;
            input.addEventListener('input', e => applyAccentColor(e.target.value));
            input.click();
          });
          break;
        case 'notifications':
          h2.textContent = 'Уведомления';
          addToggleItem('Показывать уведомления', 'notif-enable', state.notificationsEnabled, e => { state.notificationsEnabled = e.target.checked; renderNotifications(); });
          addToggleItem('Не беспокоить', 'dnd-toggle', false, null);
          addButtonItem('Звук уведомлений', 'По умолчанию', () => {});
          addButtonItem('Уведомления на экране блокировки', 'Показывать всё', () => {});
          break;
        case 'sound':
          h2.textContent = 'Звук';
          addSliderItem('Громкость медиа', 'media-volume', 70, 0, 100, null);
          addSliderItem('Громкость звонка', 'ring-volume', 80, 0, 100, null);
          addToggleItem('Вибрация при звонке', 'vibrate-toggle', true, null);
          addButtonItem('Мелодия звонка', 'Выбрать', () => {});
          break;
        case 'storage':
          h2.textContent = 'Хранилище';
          section.innerHTML = `<div class="settings-item"><span>Использовано 12.4 ГБ из 64 ГБ</span></div><div class="progress-bar-bg" style="width:100%; margin:8px 0;"><div class="progress-bar-fill" style="width:19%;"></div></div>`;
          addButtonItem('Очистить кэш', 'Очистить', () => alert('Кэш очищен'));
          break;
        case 'system':
          h2.textContent = 'Система';
          addButtonItem('Обновление системы', 'Проверить', () => alert('Система обновлена'));
          addButtonItem('Дата и время', 'Настроить', () => {});
          addButtonItem('Язык и ввод', 'Русский', () => {});
          addButtonItem('Сброс настроек', 'Сбросить', () => { if (confirm('Сбросить все настройки?')) { localStorage.clear(); location.reload(); } });
          addButtonItem('О телефоне', 'Подробнее', () => alert('Baklava OS 1.0'));
          break;
        default:
          h2.textContent = categories.find(c => c.id === categoryId).label;
          section.innerHTML = `<div class="settings-item">Настройки в разработке</div>`;
      }
      contentArea.appendChild(h2);
      contentArea.appendChild(section);
    };
    const searchInput = sidebar.querySelector('#settings-search');
    searchInput.addEventListener('input', e => renderCategories(e.target.value.toLowerCase()));
    renderCategories();
    renderCategoryContent('network');
    return container;
  }
};

export default settingsApp;
