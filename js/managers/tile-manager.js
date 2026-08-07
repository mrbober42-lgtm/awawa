/**
 * Tile Manager Module
 * Handles quick settings tiles rendering and interaction
 */

export class TileManager {
    constructor(state, systemAPI) {
        this.state = state;
        this.systemAPI = systemAPI;
        this.tilesContainer = document.getElementById('tiles-container');
        
        // Available tile definitions
        this.availableTiles = [
            { id: 'wifi', label: 'Wi-Fi', icon: 'wifi', type: 'switch' },
            { id: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth', type: 'switch' },
            { id: 'flashlight', label: 'Фонарик', icon: 'flashlight_on', type: 'switch' },
            { id: 'location', label: 'Геолокация', icon: 'location_on', type: 'switch' },
            { id: 'battery_saver', label: 'Экономия', icon: 'battery_saver', type: 'switch' }
        ];
    }
    
    renderTiles() {
        if (!this.tilesContainer) return;
        
        this.tilesContainer.innerHTML = '';
        
        this.state.tiles.forEach((tile, idx) => {
            const el = this._createTileElement(tile, idx);
            this.tilesContainer.appendChild(el);
        });
    }
    
    _createTileElement(tile, idx) {
        const el = document.createElement('div');
        el.className = 'tile';
        el.style.width = tile.width === 'half' ? '64px' : '140px';
        el.classList.toggle('half', tile.width === 'half');
        
        // Check if tile has popup functionality
        const hasPopup = ['wifi', 'bluetooth', 'location'].includes(tile.id);
        if (hasPopup) el.classList.add('has-popup');
        
        el.innerHTML = `
            <div class="tile-icon-wrapper">
                <span class="material-icons">${tile.icon}</span>
            </div>
            <div class="tile-body">
                <span class="tile-text">${tile.label}</span>
            </div>
            ${tile.width !== 'half' ? '<div class="tile-resize-lever"></div>' : ''}
        `;
        
        el.addEventListener('click', () => {
            this._handleTileClick(tile, idx);
        });
        
        if (tile.width !== 'half') {
            const lever = el.querySelector('.tile-resize-lever');
            this._attachResizeHandler(lever, tile, el, idx);
        }
        
        return el;
    }
    
    _handleTileClick(tile, idx) {
        // Handle different tile types
        switch(tile.id) {
            case 'theme_toggle':
                const isDark = !document.body.classList.contains('dark-theme');
                document.body.classList.toggle('dark-theme', isDark);
                localStorage.setItem('android16-theme', isDark ? 'dark' : 'light');
                tile.active = isDark;
                this.systemAPI.applyWallpaper();
                break;
                
            case 'dnd':
                tile.active = !tile.active;
                this.state.notificationsEnabled = !tile.active;
                this.renderNotifications();
                break;
                
            case 'wifi':
            case 'bluetooth':
            case 'flashlight':
            case 'location':
            case 'battery_saver':
                tile.active = !tile.active;
                alert(`${tile.label} ${tile.active ? 'включён' : 'выключен'}`);
                break;
        }
        
        this.state.saveTiles();
        this.renderTiles();
    }
    
    _attachResizeHandler(lever, tile, el, idx) {
        let dragging = false, startX, startW;
        
        const startResize = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragging) return;
            dragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            startX = clientX;
            startW = el.offsetWidth;
            el.classList.add('resizing');
            
            const onDrag = (e) => {
                if (!dragging) return;
                e.preventDefault();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const w = startW + clientX - startX;
                tile.width = w < 120 ? 'half' : 'normal';
                el.style.width = tile.width === 'half' ? '64px' : '140px';
                el.classList.toggle('half', tile.width === 'half');
            };
            
            const onDragEnd = () => {
                dragging = false;
                el.classList.remove('resizing');
                this.state.saveTiles();
                this.renderTiles();
                window.removeEventListener('mousemove', onDrag);
                window.removeEventListener('touchmove', onDrag);
                window.removeEventListener('mouseup', onDragEnd);
                window.removeEventListener('touchend', onDragEnd);
            };
            
            window.addEventListener('mousemove', onDrag);
            window.addEventListener('touchmove', onDrag, {passive: false});
            window.addEventListener('mouseup', onDragEnd);
            window.addEventListener('touchend', onDragEnd);
        };
        
        lever.addEventListener('mousedown', startResize);
        lever.addEventListener('touchstart', startResize, {passive: false});
    }
    
    renderNotifications() {
        // Delegate to NotificationManager if available
        if (window.NotificationManager) {
            window.NotificationManager.renderNotifications();
        }
    }
}
