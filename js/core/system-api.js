/**
 * System API Module
 * Provides core system functionality and component registration
 */

export class SystemAPI {
    constructor(state) {
        this.state = state;
        this.components = new Map();
        this.initDefaultComponents();
    }
    
    registerComponent(type, implementation) {
        this.components.set(type, implementation);
    }
    
    getComponent(type) {
        return this.components.get(type) || null;
    }
    
    initDefaultComponents() {
        // Desktop component
        if (!this.getComponent('desktop')) {
            this.registerComponent('desktop', {
                renderIcons: (apps) => {
                    const desktopEl = document.getElementById('desktop');
                    const widget = document.getElementById('widget');
                    desktopEl.innerHTML = '';
                    if (widget) desktopEl.appendChild(widget);
                    
                    let col = 0, row = 0;
                    const cols = 6;
                    
                    apps.forEach(app => {
                        if (!app.hidden) {
                            const icon = document.createElement('div');
                            icon.className = 'desktop-icon';
                            icon.dataset.app = app.id;
                            icon.style.left = (120 + col * 120) + 'px';
                            icon.style.top = (120 + row * 120) + 'px';
                            icon.innerHTML = `<span class="material-icons">${app.icon || 'apps'}</span><span>${app.name}</span>`;
                            icon.setAttribute('draggable', 'true');
                            desktopEl.appendChild(icon);
                            
                            col = (col + 1) % cols;
                            if (col === 0) row++;
                        }
                    });
                    
                    // Add drag handlers to icons
                    desktopEl.querySelectorAll('.desktop-icon').forEach(i => {
                        this._attachIconHandlers(i);
                    });
                }
            });
        }
        
        // Status Bar component
        if (!this.getComponent('statusBar')) {
            this.registerComponent('statusBar', {
                updateTime: () => {
                    const timeEl = document.getElementById('live-time');
                    if (timeEl) {
                        timeEl.textContent = new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
                    }
                },
                updateBattery: (level) => {
                    const levelEl = document.getElementById('battery-level');
                    const percentEl = document.getElementById('battery-percent');
                    if (levelEl) levelEl.style.width = level + '%';
                    if (percentEl) percentEl.textContent = Math.round(level) + '%';
                }
            });
        }
    }
    
    _attachIconHandlers(icon) {
        // Basic click handler - will be enhanced by WindowManager
        icon.addEventListener('click', (e) => {
            console.log('Icon clicked:', icon.dataset.app);
        });
    }
    
    applyWallpaper() {
        const isDark = document.body.classList.contains('dark-theme');
        const baseWall = this.state.wallpaper;
        const desktop = document.getElementById('desktop');
        
        if (baseWall && baseWall.startsWith('live:')) {
            // Live wallpaper handling would go here
            return;
        }
        
        let wallpaper = baseWall;
        if (baseWall === 'grad1') {
            wallpaper = isDark 
                ? 'linear-gradient(145deg, #2b2533 0%, #1f1a24 100%)' 
                : 'linear-gradient(145deg, #f5ebff 0%, #eaddff 100%)';
        } else if (baseWall === 'grad2') {
            wallpaper = isDark 
                ? 'linear-gradient(135deg, #1a2a3a, #0f1a24)' 
                : 'linear-gradient(135deg, #a8d8ea, #e0f2fe)';
        }
        
        if (desktop) desktop.style.background = wallpaper;
    }
}
