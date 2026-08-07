/**
 * Константы приложения
 */

// Определение сенсорного устройства
export const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Размер сетки для позиционирования
export const GRID_SIZE = 120;

// Предустановленные приложения (базовые)
export const preinstalledApps = [
  { id: 'downloads', name: 'Загрузки', icon: 'download' },
  { id: 'accent', name: 'Цвета', icon: 'palette' },
  { id: 'settings', name: 'Настройки', icon: 'settings' },
  { id: 'calculator', name: 'Калькулятор', icon: 'calculate' },
  { id: 'clock', name: 'Часы', icon: 'schedule' }
];
