/**
 * Window Manager Module
 * Handles window creation, dragging, minimizing, and fullscreen functionality
 */

export class WindowManager {
    constructor(state) {
        this.state = state;
        this.windowsLayer = document.getElementById('windows-layer');
    }
    
    createWindow(appType, customContent, intent, sourceRect = null) {
        const id = `${appType}-${Date.now()}`;
        const win = document.createElement('div');
        win.className = 'app-window';
        win.dataset.app = appType;
        win.dataset.id = id;
        
        // Target dimensions and position
        const targetLeft = 100 + (this.state.windows.size % 5) * 30;
        const targetTop = 80 + (this.state.windows.size % 5) * 20;
        const targetWidth = 400;
        const targetHeight = 350;
        
        if (sourceRect) {
            // Animate from source rect to target position
            win.style.position = 'absolute';
            win.style.left = sourceRect.left + 'px';
            win.style.top = sourceRect.top + 'px';
            win.style.width = sourceRect.width + 'px';
            win.style.height = sourceRect.height + 'px';
            win.style.borderRadius = '24px';
            
            requestAnimationFrame(() => {
                win.style.transition = 'all 0.35s cubic-bezier(0.2, 0.9, 0.4, 1)';
                win.style.left = targetLeft + 'px';
                win.style.top = targetTop + 'px';
                win.style.width = targetWidth + 'px';
                win.style.height = targetHeight + 'px';
                
                const onTransitionEnd = () => {
                    win.style.transition = '';
                    win.removeEventListener('transitionend', onTransitionEnd);
                };
                win.addEventListener('transitionend', onTransitionEnd);
            });
        } else {
            win.style.left = targetLeft + 'px';
            win.style.top = targetTop + 'px';
            win.style.width = targetWidth + 'px';
            win.style.height = targetHeight + 'px';
        }
        
        win.style.zIndex = ++this.state.nextZIndex;
        
        // Create window structure
        const dragLine = document.createElement('div');
        dragLine.className = 'window-drag-line';
        
        const header = document.createElement('div');
        header.className = 'window-header';
        header.innerHTML = `
            <span>${this._getAppDisplayName(appType)}</span>
            <div>
                <button class="minimize-btn"><span class="material-icons">minimize</span></button>
                <button class="close-btn"><span class="material-icons">close</span></button>
            </div>
        `;
        
        const content = document.createElement('div');
        content.className = 'window-content';
        
        if (customContent) {
            content.appendChild(customContent);
        } else {
            const app = this.state.installedApps.get(appType);
            if (app && typeof app.createWindow === 'function') {
                try {
                    const appContent = app.createWindow(intent);
                    if (appContent instanceof Node) content.appendChild(appContent);
                    else content.innerHTML = '<p>Ошибка загрузки приложения</p>';
                } catch (e) {
                    console.error('Ошибка создания окна приложения', appType, e);
                    content.innerHTML = '<p>Ошибка при запуске приложения</p>';
                }
            } else {
                content.innerHTML = '<p>Приложение не найдено</p>';
            }
        }
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle material-icons';
        resizeHandle.textContent = 'open_in_full';
        
        win.append(dragLine, header, content, resizeHandle);
        this.windowsLayer.appendChild(win);
        
        this.state.windows.set(id, {
            element: win,
            appType,
            minimized: false,
            id,
            isFullscreen: false,
            prevRect: null
        });
        
        // Setup event handlers
        this._setupWindowHandlers(win, dragLine, header, resizeHandle, id);
        
        return id;
    }
    
    _setupWindowHandlers(win, dragLine, header, resizeHandle, id) {
        // Close button
        win.querySelector('.close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeWindow(id);
        });
        
        // Minimize button
        win.querySelector('.minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimizeWindow(id);
        });
        
        // Bring to front on click
        win.addEventListener('mousedown', () => this.bringToFront(win));
        
        // Make draggable
        this._makeDraggable(win, header);
        
        // Make resizable
        this._makeResizable(win, resizeHandle);
        
        // Fullscreen drag handling
        this._makeFullscreenDraggable(win, dragLine, id);
    }
    
    bringToFront(win) {
        win.style.zIndex = ++this.state.nextZIndex;
    }
    
    closeWindow(id) {
        const obj = this.state.windows.get(id);
        if (!obj) return;
        
        obj.element.classList.add('closing');
        setTimeout(() => {
            if (obj.cleanup) obj.cleanup();
            obj.element.remove();
            this.state.windows.delete(id);
            if (obj.minimized) this._removeMinimizedTab(id);
        }, 200);
    }
    
    minimizeWindow(id) {
        const obj = this.state.windows.get(id);
        if (!obj || obj.minimized) return;
        
        const container = document.getElementById('minimized-windows');
        const app = this.state.installedApps.get(obj.appType);
        const icon = app ? app.icon : 'apps';
        const title = this._getAppDisplayName(obj.appType);
        
        let tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
        if (!tab) {
            tab = document.createElement('div');
            tab.className = 'minimized-tab';
            tab.dataset.windowId = id;
            tab.innerHTML = `<span class="material-icons tab-icon">${icon}</span><span class="tab-title">${title}</span>`;
            tab.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                this.restoreWindow(id); 
            });
            container.appendChild(tab);
        }
        
        tab.style.opacity = '1';
        tab.style.pointerEvents = 'auto';
        const tabRect = tab.getBoundingClientRect();
        
        if (obj.isFullscreen) {
            obj.isFullscreen = false;
            const win = obj.element;
            win.classList.remove('fullscreen');
            if (obj.prevRect) {
                win.style.left = obj.prevRect.left;
                win.style.top = obj.prevRect.top;
                win.style.width = obj.prevRect.width;
                win.style.height = obj.prevRect.height;
            }
        }
        
        obj.minimized = true;
        obj.prevRect = { 
            left: obj.element.style.left, 
            top: obj.element.style.top, 
            width: obj.element.style.width, 
            height: obj.element.style.height 
        };
        
        const dragLine = obj.element.querySelector('.window-drag-line');
        if (dragLine) { 
            dragLine.style.transition = 'all 0.2s'; 
            dragLine.style.width = '40px'; 
            dragLine.style.opacity = '0'; 
        }
        
        obj.element.style.transition = 'left 0.25s cubic-bezier(0.2,0,0,1), top 0.25s cubic-bezier(0.2,0,0,1), width 0.25s cubic-bezier(0.2,0,0,1), height 0.25s cubic-bezier(0.2,0,0,1), opacity 0.2s';
        obj.element.style.left = tabRect.left + 'px';
        obj.element.style.top = tabRect.top + 'px';
        obj.element.style.width = tabRect.width + 'px';
        obj.element.style.height = tabRect.height + 'px';
        obj.element.style.opacity = '0';
        
        setTimeout(() => {
            obj.element.style.display = 'none';
            obj.element.style.transition = '';
            obj.element.style.opacity = '';
            if (dragLine) { 
                dragLine.style.transition = ''; 
                dragLine.style.width = ''; 
                dragLine.style.opacity = ''; 
            }
        }, 250);
    }
    
    restoreWindow(id) {
        const obj = this.state.windows.get(id);
        if (!obj || !obj.minimized) return;
        
        const tab = document.querySelector(`.minimized-tab[data-window-id="${id}"]`);
        if (!tab) return;
        
        const tabRect = tab.getBoundingClientRect();
        obj.minimized = false;
        obj.element.style.display = 'flex';
        obj.element.style.transition = 'none';
        obj.element.style.width = tabRect.width + 'px';
        obj.element.style.height = tabRect.height + 'px';
        obj.element.style.left = tabRect.left + 'px';
        obj.element.style.top = tabRect.top + 'px';
        obj.element.style.opacity = '0';
        obj.element.style.zIndex = ++this.state.nextZIndex;
        
        requestAnimationFrame(() => {
            obj.element.style.transition = 'left 0.25s cubic-bezier(0.2,0,0,1), top 0.25s cubic-bezier(0.2,0,0,1), width 0.25s cubic-bezier(0.2,0,0,1), height 0.25s cubic-bezier(0.2,0,0,1), opacity 0.2s';
            obj.element.style.width = obj.prevRect?.width || '400px';
            obj.element.style.height = obj.prevRect?.height || '350px';
            obj.element.style.left = obj.prevRect?.left || '100px';
            obj.element.style.top = obj.prevRect?.top || '80px';
            obj.element.style.opacity = '1';
        });
        
        this._removeMinimizedTab(id);
    }
    
    _removeMinimizedTab(windowId) {
        const tab = document.querySelector(`.minimized-tab[data-window-id="${windowId}"]`);
        if (tab) tab.remove();
    }
    
    _getAppDisplayName(appId) {
        if(this.state.installedApps.has(appId)) return this.state.installedApps.get(appId).name;
        const m = {
            settings: 'Настройки',
            calculator: 'Калькулятор',
            clock: 'Часы',
            downloads: 'Загрузки'
        };
        return m[appId] || appId;
    }
    
    _makeDraggable(win, handle) {
        let ox, oy, drag = false, raf;
        
        const startDrag = (e) => {
            if (e.button && e.button !== 0) return;
            if (e.target.closest('button')) return;
            e.preventDefault();
            drag = true;
            const r = win.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            ox = clientX - r.left;
            oy = clientY - r.top;
            win.style.cursor = 'move';
            win.style.transition = 'none';
            win.classList.add('dragging');
            this.bringToFront(win);
        };
        
        const moveDrag = (e) => {
            if (!drag) return;
            e.preventDefault();
            raf = requestAnimationFrame(() => {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                let x = clientX - ox;
                let y = clientY - oy;
                x = Math.max(0, Math.min(x, window.innerWidth - win.offsetWidth));
                y = Math.max(0, Math.min(y, window.innerHeight - win.offsetHeight));
                win.style.left = x + 'px';
                win.style.top = y + 'px';
            });
        };
        
        const endDrag = () => {
            if (drag) {
                drag = false;
                win.style.cursor = '';
                win.style.transition = '';
                win.classList.remove('dragging');
            }
        };
        
        handle.addEventListener('mousedown', startDrag);
        handle.addEventListener('touchstart', startDrag, {passive: false});
        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('touchmove', moveDrag, {passive: false});
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);
    }
    
    _makeResizable(win, handle) {
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
                newWidth = Math.max(260, newWidth);
                newHeight = Math.max(180, newHeight);
                win.style.width = newWidth + 'px';
                win.style.height = newHeight + 'px';
            });
        };
        
        const onMouseUp = () => {
            if (resizing) {
                resizing = false;
                win.classList.remove('resizing');
                win.style.transition = '';
                if (rafId) cancelAnimationFrame(rafId);
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('touchmove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                window.removeEventListener('touchend', onMouseUp);
            }
        };
        
        const startResize = (e) => {
            e.preventDefault();
            e.stopPropagation();
            resizing = true;
            win.classList.add('resizing');
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            startWidth = win.offsetWidth;
            startHeight = win.offsetHeight;
            win.style.transition = 'none';
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('touchmove', onMouseMove, { passive: false });
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchend', onMouseUp);
        };
        
        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, { passive: false });
    }
    
    _makeFullscreenDraggable(win, dragLine, id) {
        // Simplified fullscreen drag handling
        // Full implementation would go here
    }
}
