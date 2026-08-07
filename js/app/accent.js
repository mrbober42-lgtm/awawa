// Приложение "Цвета" (Accent)
import { applyAccentColor } from '../managers/ThemeManager.js';
import state from '../core/state.js';

export const accentApp = {
  id: 'accent',
  name: 'Цвета',
  icon: 'palette',
  createWindow: () => {
    const c = document.createElement('div');
    c.style.cssText = 'display:flex;flex-direction:column;height:100%;padding:20px;gap:16px;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);';
    const current = state.accentColor || '#6750A4';
    c.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div>
          <div style="font-size:12px;opacity:0.7;margin-bottom:4px;">Pixel-style palette</div>
          <h2 style="margin:0;font-size:28px;">Цвета</h2>
        </div>
        <button id="accent-reset-btn" class="taskbar-btn" style="white-space:nowrap;">Сбросить</button>
      </div>
      <div style="background:var(--md-sys-color-surface-container-high);border-radius:28px;padding:18px;box-shadow:var(--elevation-1);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:14px;opacity:0.75;margin-bottom:6px;">Текущий акцент</div>
            <div id="accent-current-hex" style="font-size:24px;font-weight:700;font-family:monospace;">${current}</div>
          </div>
          <div id="accent-preview" style="width:88px;height:88px;border-radius:28px;background:${current};box-shadow:var(--elevation-2);border:2px solid var(--md-sys-color-outline-variant);"></div>
        </div>
      </div>
      <div>
        <div style="font-size:14px;opacity:0.75;margin:0 0 10px 4px;">Быстрые цвета</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;" id="accent-swatches">
          <button class="accent-swatch" data-color="#6750A4" style="aspect-ratio:1;border:none;border-radius:24px;background:#6750A4;box-shadow:var(--elevation-1);"></button>
          <button class="accent-swatch" data-color="#675ACD" style="aspect-ratio:1;border:none;border-radius:24px;background:#675ACD;box-shadow:var(--elevation-1);"></button>
          <button class="accent-swatch" data-color="#0F9D58" style="aspect-ratio:1;border:none;border-radius:24px;background:#0F9D58;box-shadow:var(--elevation-1);"></button>
          <button class="accent-swatch" data-color="#D93025" style="aspect-ratio:1;border:none;border-radius:24px;background:#D93025;box-shadow:var(--elevation-1);"></button>
          <button class="accent-swatch" data-color="#FF6D00" style="aspect-ratio:1;border:none;border-radius:24px;background:#FF6D00;box-shadow:var(--elevation-1);"></button>
          <button class="accent-swatch" data-color="#00ACC1" style="aspect-ratio:1;border:none;border-radius:24px;background:#00ACC1;box-shadow:var(--elevation-1);"></button>
          <button class="accent-swatch" data-color="#7CB342" style="aspect-ratio:1;border:none;border-radius:24px;background:#7CB342;box-shadow:var(--elevation-1);"></button>
          <button class="accent-swatch" data-color="#EC407A" style="aspect-ratio:1;border:none;border-radius:24px;background:#EC407A;box-shadow:var(--elevation-1);"></button>
        </div>
      </div>
      <div style="background:var(--md-sys-color-surface-container);border-radius:28px;padding:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;">
        <div>
          <div style="font-weight:600;margin-bottom:4px;">Свой цвет</div>
          <div style="font-size:13px;opacity:0.7;">Выбери любой оттенок как на Pixel</div>
        </div>
        <label style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:18px;background:var(--md-sys-color-primary-container);cursor:pointer;position:relative;">
          <input id="accent-picker" type="color" value="${current}" style="width:100%;height:100%;border:none;background:transparent;padding:0;opacity:0;cursor:pointer;">
          <span class="material-icons" style="position:absolute;pointer-events:none;color:var(--md-sys-color-on-primary-container);">palette</span>
        </label>
      </div>
      <div style="background:var(--md-sys-color-surface-container-high);border-radius:28px;padding:18px;display:flex;flex-direction:column;gap:12px;">
        <div style="font-weight:600;">Предпросмотр</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div style="padding:10px 14px;border-radius:999px;background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary);font-weight:600;">Primary</div>
          <div style="padding:10px 14px;border-radius:999px;background:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container);font-weight:600;">Container</div>
          <div style="padding:10px 14px;border-radius:999px;background:var(--md-sys-color-secondary-container);color:var(--md-sys-color-on-secondary-container);font-weight:600;">Secondary</div>
        </div>
      </div>
    `;

    const apply = (color) => {
      applyAccentColor(color);
      const hexEl = c.querySelector('#accent-current-hex');
      const prevEl = c.querySelector('#accent-preview');
      const pickerEl = c.querySelector('#accent-picker');
      if (hexEl) hexEl.textContent = color.toUpperCase();
      if (prevEl) prevEl.style.background = color;
      if (pickerEl) pickerEl.value = color;
    };

    c.querySelectorAll('.accent-swatch').forEach(btn => {
      btn.addEventListener('click', () => apply(btn.dataset.color));
    });
    c.querySelector('#accent-picker').addEventListener('input', e => apply(e.target.value));
    c.querySelector('#accent-reset-btn').addEventListener('click', () => apply('#6750A4'));

    return c;
  }
};

export default accentApp;
