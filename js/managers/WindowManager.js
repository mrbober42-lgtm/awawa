/**
 * WindowManager - Manages application windows
 */

export class WindowManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.container = null;
    this.windows = new Map();
    this.activeWindowId = null;
    this.zIndexCounter = 100;
    this.windowIdCounter = 0;
  }

  async init() {
    this.container = document.getElementById('windows-layer');
    if (!this.container) {
      console.error('Windows layer not found');
      return;
    }
    console.log('WindowManager initialized');
  }

  createWindow(config) {
    const id = `window_${++this.windowIdCounter}`;
    const windowEl = document.createElement('div');
    windowEl.className = 'app-window opening';
    windowEl.id = id;
    windowEl.style.left = (config.x || 100 + (this.windowIdCounter * 20)) + 'px';
    windowEl.style.top = (config.y || 100 + (this.windowIdCounter * 20)) + 'px';
    windowEl.style.width = (config.width || 400) + 'px';
    windowEl.style.height = (config.height || 350) + 'px';
    windowEl.style.zIndex = ++this.zIndexCounter;

    windowEl.innerHTML = `
      <div class="window-header">
        <div class="window-title">
          <span class="material-symbols-outlined">${config.icon || 'apps'}</span>
          <span class="title-text">${config.title || 'Window'}</span>
        </div>
        <div class="window-controls">
          <div class="window-btn minimize-btn"><span class="material-symbols-outlined">remove</span></div>
          <div class="window-btn maximize-btn"><span class="material-symbols-outlined">crop_square</span></div>
          <div class="window-btn close-btn"><span class="material-symbols-outlined">close</span></div>
        </div>
      </div>
      <div class="status-tab hidden"></div>
      <div class="window-content"></div>
      <div class="window-resize-handle"></div>
    `;

    this.container.appendChild(windowEl);

    const winData = {
      id,
      element: windowEl,
      config,
      content: config.content || '',
      isMinimized: false,
      isFullscreen: false,
      previousRect: null
    };

    this.windows.set(id, winData);
    this._setupWindowListeners(winData);
    
    // Trigger opening animation
    setTimeout(() => windowEl.classList.remove('opening'), 10);
    
    return winData;
  }

  _setupWindowListeners(winData) {
    const { element } = winData;
    const header = element.querySelector('.window-header');
    const closeBtn = element.querySelector('.close-btn');
    const minimizeBtn = element.querySelector('.minimize-btn');
    const maximizeBtn = element.querySelector('.maximize-btn');
    const resizeHandle = element.querySelector('.window-resize-handle');

    // Focus on click
    element.addEventListener('mousedown', () => this.focusWindow(winData.id));

    // Close
    closeBtn.addEventListener('click', () => this.closeWindow(winData.id));

    // Minimize
    minimizeBtn.addEventListener('click', () => this.minimizeWindow(winData.id));

    // Maximize/Fullscreen
    maximizeBtn.addEventListener('click', () => this.toggleFullscreen(winData.id));

    // Dragging
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.window-controls')) return;
      if (winData.isFullscreen) return;
      isDragging = true;
      dragOffset.x = e.clientX - element.offsetLeft;
      dragOffset.y = e.clientY - element.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || winData.isFullscreen) return;
      element.style.left = (e.clientX - dragOffset.x) + 'px';
      element.style.top = (e.clientY - dragOffset.y) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Resizing
    let isResizing = false;
    let startWidth, startHeight, startX, startY;

    resizeHandle.addEventListener('mousedown', (e) => {
      if (winData.isFullscreen) return;
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = element.offsetWidth;
      startHeight = element.offsetHeight;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing || winData.isFullscreen) return;
      const newWidth = Math.max(320, startWidth + (e.clientX - startX));
      const newHeight = Math.max(200, startHeight + (e.clientY - startY));
      element.style.width = newWidth + 'px';
      element.style.height = newHeight + 'px';
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  closeWindow(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    winData.element.classList.add('closing');
    setTimeout(() => {
      winData.element.remove();
      this.windows.delete(id);
      if (this.activeWindowId === id) {
        this.activeWindowId = null;
      }
    }, 200);
  }

  minimizeWindow(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    winData.isMinimized = true;
    winData.element.style.display = 'none';
    if (this.activeWindowId === id) {
      this.activeWindowId = null;
    }
  }

  restoreWindow(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    winData.isMinimized = false;
    winData.element.style.display = 'flex';
    this.focusWindow(id);
  }

  toggleFullscreen(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    if (winData.isFullscreen) {
      // Exit fullscreen
      winData.isFullscreen = false;
      winData.element.classList.remove('fullscreen');
      if (winData.previousRect) {
        winData.element.style.left = winData.previousRect.left + 'px';
        winData.element.style.top = winData.previousRect.top + 'px';
        winData.element.style.width = winData.previousRect.width + 'px';
        winData.element.style.height = winData.previousRect.height + 'px';
      }
    } else {
      // Enter fullscreen
      winData.previousRect = {
        left: winData.element.offsetLeft,
        top: winData.element.offsetTop,
        width: winData.element.offsetWidth,
        height: winData.element.offsetHeight
      };
      winData.isFullscreen = true;
      winData.element.classList.add('fullscreen');
    }
  }

  focusWindow(id) {
    const winData = this.windows.get(id);
    if (!winData || this.activeWindowId === id) return;

    winData.element.style.zIndex = ++this.zIndexCounter;
    this.activeWindowId = id;
  }

  getActiveWindow() {
    return this.activeWindowId ? this.windows.get(this.activeWindowId) : null;
  }

  minimizeAll() {
    this.windows.forEach((winData) => {
      this.minimizeWindow(winData.id);
    });
  }

  setContent(id, content) {
    const winData = this.windows.get(id);
    if (!winData) return;
    
    const contentEl = winData.element.querySelector('.window-content');
    if (contentEl) {
      contentEl.innerHTML = content;
    }
  }
}
