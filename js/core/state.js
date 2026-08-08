/**
 * Глобальное состояние приложения
 */
const state = {
  theme: localStorage.getItem('android16-theme') || 'light',
  notificationsEnabled: true,
  accentColor: localStorage.getItem('accent') || '#6750A4',
  wallpaper: localStorage.getItem('wallpaper') || 'grad1',
  windows: new Map(),
  nextZIndex: 100,
  tiles: JSON.parse(localStorage.getItem('tiles')) || [
    { id: 'theme_toggle', label: 'Тёмная тема', icon: 'dark_mode', active: false, width: 'normal' },
    { id: 'dnd', label: 'Не беспокоить', icon: 'do_not_disturb_on', active: false, width: 'normal' }
  ],
  downloads: new Map(),
  installedApps: new Map(),
  widgets: new Map(),
  widgetInstances: new Map(),
  notifications: [],
  appTilesMap: new Map(JSON.parse(localStorage.getItem('appTilesMap') || '[]')),
  typeRegistry: new Map(),
  defaultApps: new Map(),
  openWithCallback: null
};

// Глобальный список всех доступных плиток
window.availableTiles = [];

// Зарегистрировать плитки от приложения
function registerAppTiles(appId, tiles) {
  if (!tiles || !tiles.length) return;
  if (!state.appTilesMap.has(appId)) state.appTilesMap.set(appId, []);
  const owned = state.appTilesMap.get(appId);
  tiles.forEach(tile => {
    if (!owned.includes(tile.id)) {
      owned.push(tile.id);
    }
    if (!window.availableTiles.some(t => t.id === tile.id)) {
      window.availableTiles.push(tile);
    }
  });
  localStorage.setItem('appTilesMap', JSON.stringify(Array.from(state.appTilesMap.entries())));
  // Вызываем только если функции уже определены (будут определены в TileManager)
  if (typeof window.renderTileEditor === 'function') window.renderTileEditor();
  if (typeof window.renderTiles === 'function') window.renderTiles();
}

// Удалить плитки приложения
function unregisterAppTiles(appId) {
  if (!state.appTilesMap.has(appId)) return;
  const tileIds = state.appTilesMap.get(appId);
  window.availableTiles = window.availableTiles.filter(t => !tileIds.includes(t.id));
  state.appTilesMap.delete(appId);
  localStorage.setItem('appTilesMap', JSON.stringify(Array.from(state.appTilesMap.entries())));
  if (typeof window.renderTileEditor === 'function') window.renderTileEditor();
  if (typeof window.renderTiles === 'function') window.renderTiles();
}

// Экспорт для использования в других модулях
export { state, registerAppTiles, unregisterAppTiles };
