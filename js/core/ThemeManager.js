/**
 * ThemeManager - Manages theme (dark/light) and accent colors
 */

export class ThemeManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.currentTheme = this.storage.get('theme', 'dark');
    this.accentColor = this.storage.get('accentColor', '#D0BCFF');
  }

  /**
   * Initialize theme on page load
   */
  init() {
    this.applyTheme(this.currentTheme);
    this.applyAccentColor(this.accentColor);
  }

  /**
   * Set theme (dark or light)
   */
  setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') {
      console.warn('Invalid theme:', theme);
      return;
    }
    this.currentTheme = theme;
    this.storage.set('theme', theme);
    this.applyTheme(theme);
  }

  /**
   * Apply theme to body
   */
  applyTheme(theme) {
    document.body.classList.remove('dark-theme', 'light-theme');
    document.body.classList.add(`${theme}-theme`);
    
    // Update frame fill color
    const frameFill = document.getElementById('frameOuterFill');
    if (frameFill) {
      frameFill.setAttribute('fill', theme === 'dark' ? '#000000' : '#FFFFFF');
    }
  }

  /**
   * Toggle between dark and light themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Set accent color
   */
  setAccentColor(color) {
    this.accentColor = color;
    this.storage.set('accentColor', color);
    this.applyAccentColor(color);
  }

  /**
   * Apply accent color to CSS variables
   */
  applyAccentColor(color) {
    document.documentElement.style.setProperty('--md-sys-color-primary', color);
    
    // Generate complementary colors (simplified)
    // In a full implementation, you'd use proper color theory algorithms
    const containerColor = this.darkenColor(color, 30);
    const onContainerColor = this.lightenColor(color, 40);
    
    document.documentElement.style.setProperty('--md-sys-color-primary-container', containerColor);
    document.documentElement.style.setProperty('--md-sys-color-on-primary-container', onContainerColor);
  }

  /**
   * Get current accent color
   */
  getAccentColor() {
    return this.accentColor;
  }

  /**
   * Darken a hex color by percentage
   */
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  /**
   * Lighten a hex color by percentage
   */
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min((num >> 16) + amt, 255);
    const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
    const B = Math.min((num & 0x0000FF) + amt, 255);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}
