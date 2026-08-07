// Приложение "Часы" (Clock)

export const clockApp = {
  id: 'clock',
  name: 'Часы',
  icon: 'schedule',
  createWindow: () => {
    const c = document.createElement('div'); 
    c.innerHTML = '<div style="padding:16px;text-align:center;"><div style="background:var(--md-sys-color-surface-container-high);border-radius:40px;padding:24px;"><div id="clock-digital" style="font-size:68px;"></div><div id="clock-date" style="font-size:18px;opacity:0.7;margin-top:8px;"></div></div></div>';
    const upd = () => { 
      const d = new Date(); 
      c.querySelector('#clock-digital').textContent = d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}); 
      c.querySelector('#clock-date').textContent = d.toLocaleDateString('ru-RU', {day:'numeric', month:'long', weekday:'long'}); 
    };
    upd(); 
    const int = setInterval(upd, 1000); 
    c.cleanup = () => clearInterval(int); 
    return c;
  }
};

export default clockApp;
