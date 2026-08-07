// Main entry point for Baklava OS
import { State } from './core/state.js';
import { SystemAPI } from './core/system-api.js';
import { WindowManager } from './managers/window-manager.js';
import { NotificationManager } from './managers/notification-manager.js';
import { TileManager } from './managers/tile-manager.js';

// Initialize the system
async function init() {
    console.log('Baklava OS initializing...');
    
    // Initialize state
    const state = new State();
    window.state = state;
    
    // Initialize System API
    const systemAPI = new SystemAPI(state);
    window.SystemAPI = systemAPI;
    
    // Initialize managers
    const windowManager = new WindowManager(state);
    window.WindowManager = windowManager;
    
    const notificationManager = new NotificationManager(state);
    window.NotificationManager = notificationManager;
    
    const tileManager = new TileManager(state, systemAPI);
    window.TileManager = tileManager;
    
    // Run boot sequence
    await bootSequence(state, systemAPI, windowManager, notificationManager, tileManager);
}

async function bootSequence(state, systemAPI, windowManager, notificationManager, tileManager) {
    const bar = document.getElementById('boot-progress-bar');
    const status = document.getElementById('boot-status');
    const bootScreen = document.getElementById('boot-screen');
    
    const log = (msg, p) => {
        status.textContent = msg;
        bar.style.width = p + '%';
    };
    
    log('Загрузка...', 20);
    log('Приложения', 60);
    log('Модули', 75);
    
    // Render initial UI
    log('Рабочий стол', 85);
    tileManager.renderTiles();
    notificationManager.renderNotifications();
    systemAPI.getComponent('desktop')?.renderIcons(Array.from(state.installedApps.values()));
    
    // Apply wallpaper
    systemAPI.applyWallpaper();
    log('Готово', 100);
    
    // Fade out boot screen
    bootScreen.style.opacity = '0';
    await new Promise(resolve => {
        const onTransitionEnd = () => {
            bootScreen.removeEventListener('transitionend', onTransitionEnd);
            resolve();
        };
        bootScreen.addEventListener('transitionend', onTransitionEnd, { once: true });
        setTimeout(resolve, 500);
    });
    bootScreen.style.display = 'none';
    
    // Start clock updates
    setInterval(() => {
        systemAPI.getComponent('statusBar')?.updateTime();
        document.getElementById('widget-time').textContent = new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
        document.getElementById('widget-date').textContent = new Date().toLocaleDateString('ru-RU', {day:'numeric', month:'long', weekday:'short'});
    }, 1000);
    
    // Initial clock update
    systemAPI.getComponent('statusBar')?.updateTime();
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
