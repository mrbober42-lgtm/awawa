/**
 * PopupManager - Manages popups from tray icons and context menus
 */

export class PopupManager {
  constructor(frameManager) {
    this.frame = frameManager;
    this.popups = new Map();
    this.container = null;
  }

  init() {
    this.container = document.getElementById('panelContentContainer');
    if (!this.container) {
      console.error('Popup container not found');
    }
  }

  /**
   * Show a popup near an element
   */
  show(config) {
    const { anchorElement, content, width = 280 } = config;
    
    if (!anchorElement || !this.container) return null;

    const id = `popup_${Date.now()}`;
    
    const popupEl = document.createElement('div');
    popupEl.className = 'edge-panel panel-popup';
    popupEl.id = id;
    popupEl.innerHTML = `
      <div class="edge-panel-content" style="padding: 12px;">
        ${typeof content === 'string' ? content : ''}
      </div>
    `;

    this.container.appendChild(popupEl);

    // Position popup
    this._positionPopup(popupEl, anchorElement, width);

    // Show with animation
    requestAnimationFrame(() => {
      popupEl.classList.add('active');
    });

    // Store popup data
    const popupData = {
      id,
      element: popupEl,
      anchorElement,
      config
    };

    this.popups.set(id, popupData);

    // Set up auto-hide on mouse leave
    popupEl.addEventListener('mouseleave', () => {
      setTimeout(() => this.hide(id), 200);
    });

    return popupData;
  }

  _positionPopup(popupEl, anchorElement, width) {
    const anchorRect = anchorElement.getBoundingClientRect();
    const popupWidth = width;
    
    // Position to the right of anchor
    let left = anchorRect.right + 8;
    let top = anchorRect.top;
    
    // If popup would go off screen, position to the left
    if (left + popupWidth > window.innerWidth) {
      left = anchorRect.left - popupWidth - 8;
    }
    
    // Ensure popup stays within viewport vertically
    if (top + 300 > window.innerHeight) {
      top = window.innerHeight - 300 - 16;
    }
    
    popupEl.style.left = left + 'px';
    popupEl.style.top = top + 'px';
    popupEl.style.width = popupWidth + 'px';
  }

  /**
   * Hide a popup
   */
  hide(id) {
    const popupData = this.popups.get(id);
    if (!popupData) return;

    popupData.element.classList.remove('active');
    
    setTimeout(() => {
      popupData.element.remove();
      this.popups.delete(id);
    }, 200);
  }

  /**
   * Hide all popups
   */
  hideAll() {
    this.popups.forEach((popupData, id) => {
      this.hide(id);
    });
  }

  /**
   * Update popup content
   */
  updateContent(id, content) {
    const popupData = this.popups.get(id);
    if (!popupData) return;

    const contentEl = popupData.element.querySelector('.edge-panel-content');
    if (contentEl) {
      contentEl.innerHTML = typeof content === 'string' ? content : '';
    }
  }

  /**
   * Get popup by ID
   */
  getPopup(id) {
    return this.popups.get(id);
  }
}
