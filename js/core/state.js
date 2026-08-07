/**
 * State Management Module
 * Handles all application state including localStorage persistence
 */

export class State {
    constructor() {
        this.theme = localStorage.getItem('android16-theme') || 'light';
        this.notificationsEnabled = true;
        this.accentColor = localStorage.getItem('accent') || '#6750A4';
        this.wallpaper = localStorage.getItem('wallpaper') || 'grad1';
        this.windows = new Map();
        this.nextZIndex = 100;
        this.tiles = JSON.parse(localStorage.getItem('tiles')) || [
            { id:'theme_toggle', label:'Тёмная тема', icon:'dark_mode', active:false, width:'normal' },
            { id:'dnd', label:'Не беспокоить', icon:'do_not_disturb_on', active:false, width:'normal' }
        ];
        this.downloads = new Map();
        this.installedApps = new Map();
        this.widgets = new Map();
        this.widgetInstances = new Map();
        this.notifications = [];
        this.appTilesMap = new Map(JSON.parse(localStorage.getItem('appTilesMap') || '[]'));
        this.typeRegistry = new Map();
        this.defaultApps = new Map();
        this.openWithCallback = null;
        
        // Load saved type registry and default apps
        this._loadTypeData();
    }
    
    _loadTypeData() {
        try {
            const saved = JSON.parse(localStorage.getItem('typeRegistry') || '{}');
            for (const [k,v] of Object.entries(saved)) this.typeRegistry.set(k, v);
        } catch(e) {}
        try {
            const saved = JSON.parse(localStorage.getItem('defaultApps') || '{}');
            for (const [k,v] of Object.entries(saved)) this.defaultApps.set(k, v);
        } catch(e) {}
    }
    
    saveTiles() {
        localStorage.setItem('tiles', JSON.stringify(this.tiles));
    }
    
    saveAppTilesMap() {
        localStorage.setItem('appTilesMap', JSON.stringify(Array.from(this.appTilesMap.entries())));
    }
    
    saveTypeData() {
        const tr = {}; 
        this.typeRegistry.forEach((v,k) => tr[k] = v);
        localStorage.setItem('typeRegistry', JSON.stringify(tr));
        const da = {}; 
        this.defaultApps.forEach((v,k) => da[k] = v);
        localStorage.setItem('defaultApps', JSON.stringify(da));
    }
}
