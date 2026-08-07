/**
 * ScreenManager - Manages screen navigation (push/pop screens)
 */

export class ScreenManager {
  constructor() {
    this.screens = [];
    this.container = null;
  }

  init() {
    // Could use a dedicated container or the main desktop area
    this.container = document.getElementById('desktop');
  }

  /**
   * Push a new screen
   */
  push(config) {
    const { id, title, content, onBack } = config;
    
    const screenEl = document.createElement('div');
    screenEl.className = 'screen';
    screenEl.id = `screen-${id}`;
    screenEl.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 70;
      background: var(--md-sys-color-background);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 300ms ease-in-out;
    `;

    screenEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid var(--md-sys-color-outline-variant);">
        <button class="md3-icon-btn" id="screen-back-btn">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span style="font-size: 20px; font-weight: 500;">${title || ''}</span>
      </div>
      <div style="flex: 1; overflow: auto; padding: 16px;">
        ${typeof content === 'string' ? content : ''}
      </div>
    `;

    document.body.appendChild(screenEl);

    // Animate in
    requestAnimationFrame(() => {
      screenEl.style.transform = 'translateX(0)';
    });

    // Set up back button
    const backBtn = screenEl.querySelector('#screen-back-btn');
    backBtn.addEventListener('click', () => {
      if (onBack) {
        onBack();
      }
      this.pop();
    });

    const screenData = {
      id,
      element: screenEl,
      config
    };

    this.screens.push(screenData);
    return screenData;
  }

  /**
   * Pop the current screen
   */
  pop() {
    if (this.screens.length === 0) return null;

    const screenData = this.screens.pop();
    const { element } = screenData;

    // Animate out
    element.style.transform = 'translateX(100%)';

    setTimeout(() => {
      element.remove();
    }, 300);

    return screenData;
  }

  /**
   * Clear all screens
   */
  clearAll() {
    while (this.screens.length > 0) {
      this.pop();
    }
  }

  /**
   * Get current screen
   */
  getCurrentScreen() {
    return this.screens.length > 0 ? this.screens[this.screens.length - 1] : null;
  }

  /**
   * Check if any screen is active
   */
  hasScreens() {
    return this.screens.length > 0;
  }
}
