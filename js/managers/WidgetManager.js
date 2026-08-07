/**
 * WidgetManager - Manages desktop widgets
 */

export class WidgetManager {
  constructor(storageManager, frameManager) {
    this.storage = storageManager;
    this.frame = frameManager;
    this.widgets = new Map();
    this.registeredWidgets = new Map();
    this.widgetIdCounter = 0;
    this.pickerElement = null;
  }

  async init() {
    this.pickerElement = document.getElementById('widget-picker');
    
    // Load saved widgets
    this._loadWidgets();
    
    console.log('WidgetManager initialized');
  }

  /**
   * Register a widget type
   */
  registerWidget(config) {
    const { id, name, content, interval } = config;
    
    const widgetDef = {
      id: id || `widget_type_${++this.widgetIdCounter}`,
      name: name || 'Widget',
      content: content,
      interval: interval || null
    };
    
    this.registeredWidgets.set(widgetDef.id, widgetDef);
    return widgetDef.id;
  }

  /**
   * Create a widget instance on desktop
   */
  createWidgetInstance(typeId, x, y, width, height) {
    const widgetDef = this.registeredWidgets.get(typeId);
    if (!widgetDef) {
      console.warn('Unknown widget type:', typeId);
      return null;
    }

    const id = `widget_inst_${++this.widgetIdCounter}`;
    const widgetEl = document.createElement('div');
    widgetEl.className = 'desktop-widget';
    widgetEl.id = id;
    widgetEl.dataset.typeId = typeId;
    widgetEl.style.left = (x || 100) + 'px';
    widgetEl.style.top = (y || 100) + 'px';
    widgetEl.style.width = (width || 200) + 'px';
    widgetEl.style.height = (height || 150) + 'px';

    widgetEl.innerHTML = `
      <div class="widget-content"></div>
      <div class="widget-resize-handle"></div>
    `;

    const widgetsLayer = document.getElementById('widgets-layer');
    if (widgetsLayer) {
      widgetsLayer.appendChild(widgetEl);
    }

    // Render content
    const contentEl = widgetEl.querySelector('.widget-content');
    if (contentEl && typeof widgetDef.content === 'function') {
      const result = widgetDef.content();
      if (result instanceof HTMLElement) {
        contentEl.appendChild(result);
      } else {
        contentEl.innerHTML = result;
      }
    }

    // Set up dragging
    this._setupWidgetDrag(widgetEl);
    
    // Set up resizing
    this._setupWidgetResize(widgetEl);

    // Save widget instance
    const widgetData = {
      id,
      typeId,
      element: widgetEl,
      x: x || 100,
      y: y || 100,
      width: width || 200,
      height: height || 150,
      intervalId: null
    };

    this.widgets.set(id, widgetData);

    // Start interval if defined
    if (widgetDef.interval && typeof widgetDef.content === 'function') {
      widgetData.intervalId = setInterval(() => {
        const result = widgetDef.content();
        if (contentEl) {
          if (result instanceof HTMLElement) {
            contentEl.innerHTML = '';
            contentEl.appendChild(result);
          } else {
            contentEl.innerHTML = result;
          }
        }
      }, widgetDef.interval);
    }

    this._saveWidgets();
    return widgetData;
  }

  _setupWidgetDrag(widgetEl) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    widgetEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.widget-resize-handle')) return;
      isDragging = true;
      dragOffset.x = e.clientX - widgetEl.offsetLeft;
      dragOffset.y = e.clientY - widgetEl.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      widgetEl.style.left = (e.clientX - dragOffset.x) + 'px';
      widgetEl.style.top = (e.clientY - dragOffset.y) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this._updateWidgetPosition(widgetEl.id);
      }
    });
  }

  _setupWidgetResize(widgetEl) {
    const resizeHandle = widgetEl.querySelector('.widget-resize-handle');
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = widgetEl.offsetWidth;
      startHeight = widgetEl.offsetHeight;
      e.preventDefault();
      widgetEl.classList.add('resizing');
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(160, startWidth + (e.clientX - startX));
      const newHeight = Math.max(120, startHeight + (e.clientY - startY));
      widgetEl.style.width = newWidth + 'px';
      widgetEl.style.height = newHeight + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        widgetEl.classList.remove('resizing');
        this._updateWidgetPosition(widgetEl.id);
      }
    });
  }

  _updateWidgetPosition(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (widget && widget.element) {
      widget.x = widget.element.offsetLeft;
      widget.y = widget.element.offsetTop;
      widget.width = widget.element.offsetWidth;
      widget.height = widget.element.offsetHeight;
      this._saveWidgets();
    }
  }

  _saveWidgets() {
    const widgetsData = [];
    this.widgets.forEach((widget, id) => {
      widgetsData.push({
        id,
        typeId: widget.typeId,
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height
      });
    });
    this.storage.set('widgets', widgetsData);
  }

  _loadWidgets() {
    const widgetsData = this.storage.get('widgets', []);
    widgetsData.forEach(data => {
      this.createWidgetInstance(data.typeId, data.x, data.y, data.width, data.height);
    });
  }

  /**
   * Show widget picker panel
   */
  showPicker() {
    if (!this.pickerElement) return;

    const contentEl = document.getElementById('widgetPickerContent');
    if (!contentEl) return;

    contentEl.innerHTML = '';
    
    this.registeredWidgets.forEach((widgetDef) => {
      const item = document.createElement('div');
      item.className = 'widget-picker-item';
      item.innerHTML = `
        <span class="material-symbols-outlined">widgets</span>
        <span>${widgetDef.name}</span>
      `;
      
      item.addEventListener('click', () => {
        this.createWidgetInstance(widgetDef.id, 150, 150, 200, 150);
        this.hidePicker();
      });
      
      contentEl.appendChild(item);
    });

    this.pickerElement.classList.remove('hidden');
    setTimeout(() => this.pickerElement.classList.add('visible'), 10);
  }

  /**
   * Hide widget picker
   */
  hidePicker() {
    if (!this.pickerElement) return;
    
    this.pickerElement.classList.remove('visible');
    setTimeout(() => this.pickerElement.classList.add('hidden'), 350);
  }

  /**
   * Remove widget
   */
  removeWidget(id) {
    const widget = this.widgets.get(id);
    if (widget) {
      if (widget.intervalId) {
        clearInterval(widget.intervalId);
      }
      if (widget.element) {
        widget.element.remove();
      }
      this.widgets.delete(id);
      this._saveWidgets();
    }
  }

  /**
   * Get widget by ID
   */
  getWidget(id) {
    return this.widgets.get(id);
  }
}
