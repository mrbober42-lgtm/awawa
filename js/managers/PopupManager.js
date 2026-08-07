/**
 * PopupManager и класс BaklavaPopup
 */
import { animateMorph } from '../core/utils.js';

const PopupManager = {
  popups: [],
  nextZIndex: 700,

  register(popup) {
    this.popups.push(popup);
    this.updateZIndices();
  },

  unregister(popup) {
    const idx = this.popups.indexOf(popup);
    if (idx !== -1) this.popups.splice(idx, 1);
    this.updateZIndices();
  },

  updateZIndices() {
    this.popups.forEach((p, i) => {
      p.container.style.zIndex = this.nextZIndex + i * 2;
      if (p.overlay) p.overlay.style.zIndex = this.nextZIndex + i * 2 - 1;
    });
  },

  closeTop() {
    if (this.popups.length > 0) {
      const top = this.popups[this.popups.length - 1];
      top.close();
    }
  }
};

class BaklavaPopup {
  constructor(options) {
    this.id = Date.now() + Math.random();
    this.options = options;
    this.sourceElement = options.sourceElement || null;
    this.overlay = null;
    this.container = null;
    this.dragHint = null;
    this.dropZone = null;
    this.draggable = options.draggable || false;
    this.closeOnOverlayClick = options.closeOnOverlayClick !== false;
    this.closeOnSourceRemove = options.closeOnSourceRemove !== false;
    this._onClose = options.onClose || (() => {});
    this._morphOptions = options.morphOptions || {};
    this._closed = false;
    this._mutationObserver = null;
    this._placeholder = null;
    this.maxWidth = options.maxWidth || '90vw';
    this.maxHeight = options.maxHeight || '90vh';
    this._opening = false;
    this._targetRect = null;

    let content = options.contentElement;
    if (typeof content === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = content;
      this.popupContent = wrapper;
    } else if (content instanceof Node) {
      this.popupContent = content;
    } else {
      console.error('BaklavaPopup: contentElement must be string or Node');
      this.popupContent = document.createElement('div');
    }

    if (this.sourceElement) {
      this._originalParent = this.sourceElement.parentNode;
      this._originalNextSibling = this.sourceElement.nextSibling;
      this._originalRect = this.sourceElement.getBoundingClientRect();
      this._savedCssText = this.sourceElement.style.cssText;
      this._originalBorderRadius = getComputedStyle(this.sourceElement).borderRadius;
      this._originalChildren = Array.from(this.sourceElement.children);
    }

    this._build();
    this._show();
  }

  _build() {
    if (!this.options.overlayStyle || this.options.overlayStyle.background !== 'transparent') {
      this.overlay = document.createElement('div');
      this.overlay.className = 'popup-overlay';
      Object.assign(this.overlay.style, this.options.overlayStyle || { background: 'rgba(0,0,0,0.4)' });
      this.overlay.style.opacity = '0';
      document.body.appendChild(this.overlay);
      if (this.closeOnOverlayClick) {
        this.overlay.addEventListener('click', () => this.close());
      }
    }

    if (this.sourceElement) {
      this._placeholder = document.createElement('div');
      this._placeholder.style.width = this.sourceElement.offsetWidth + 'px';
      this._placeholder.style.height = this.sourceElement.offsetHeight + 'px';
      this._placeholder.style.flexShrink = '0';
      this._placeholder.style.visibility = 'hidden';
      this.sourceElement.parentNode.insertBefore(this._placeholder, this.sourceElement);
    }

    this.container = this.sourceElement;
    if (this.container) {
      document.body.appendChild(this.container);
      this.container.style.position = 'fixed';
      this.container.style.margin = '0';
      this.container.style.zIndex = PopupManager.nextZIndex + 1;
      this.container.style.transition = 'none';
      this.container.style.overflow = 'hidden';
    }

    if (this.draggable) this._setupDrag();

    if (this.closeOnSourceRemove && this.sourceElement) {
      this._mutationObserver = new MutationObserver(() => {
        if (!document.contains(this.sourceElement)) this.close();
      });
      this._mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    PopupManager.register(this);
  }

  _show() {
    const el = this.container;
    if (!el) return;

    this._opening = true;
    const sourceRect = this._originalRect;

    el.style.position = 'fixed';
    el.style.left = sourceRect.left + 'px';
    el.style.top = sourceRect.top + 'px';
    el.style.width = sourceRect.width + 'px';
    el.style.height = sourceRect.height + 'px';
    el.style.borderRadius = this._originalBorderRadius;
    el.style.transition = 'none';
    el.style.overflow = 'hidden';

    if (this.overlay) {
      this.overlay.style.transition = 'opacity 0.3s ease';
      this.overlay.style.opacity = '1';
    }

    this.popupContent.style.position = 'absolute';
    this.popupContent.style.top = '0';
    this.popupContent.style.left = '0';
    this.popupContent.style.width = '100%';
    this.popupContent.style.height = '100%';
    this.popupContent.style.padding = '16px';
    this.popupContent.style.boxSizing = 'border-box';
    this.popupContent.style.transition = 'opacity 0.3s ease';
    this.popupContent.style.opacity = '0';
    this.popupContent.style.pointerEvents = 'auto';
    el.appendChild(this.popupContent);

    this._originalChildren.forEach(child => {
      child.style.transition = 'opacity 0.3s ease';
      child.style.opacity = '1';
    });

    const clone = this.popupContent.cloneNode(true);
    clone.style.cssText = '';
    clone.style.padding = '16px';
    clone.style.boxSizing = 'border-box';

    const measure = document.createElement('div');
    measure.style.position = 'fixed';
    measure.style.visibility = 'hidden';
    measure.style.width = 'max-content';
    measure.style.maxWidth = this.maxWidth;
    measure.style.height = 'auto';
    measure.appendChild(clone);
    document.body.appendChild(measure);

    const naturalWidth = measure.offsetWidth;
    const naturalHeight = measure.scrollHeight;
    document.body.removeChild(measure);

    let targetWidth = naturalWidth;
    let targetHeight = naturalHeight;
    let needsOverflow = false;
    const maxH = typeof this.maxHeight === 'number' ? this.maxHeight : window.innerHeight * 0.9;
    const maxW = typeof this.maxWidth === 'number' ? this.maxWidth : window.innerWidth * 0.9;

    if (targetWidth < 160) targetWidth = 160;
    if (targetHeight < 80) targetHeight = 80;

    if (targetHeight > maxH) { targetHeight = maxH; needsOverflow = true; }
    if (targetWidth > maxW) { targetWidth = maxW; needsOverflow = true; }

    let targetLeft, targetTop;
    const position = this.options.position || 'center';
    const gap = 8;
    if (position === 'source') {
      targetLeft = sourceRect.left;
      targetTop = sourceRect.top;
      targetWidth = sourceRect.width;
      targetHeight = sourceRect.height;
    } else if (position === 'auto') {
      targetLeft = sourceRect.right - targetWidth + gap;
      targetTop = sourceRect.top - gap;
      targetLeft = Math.min(Math.max(gap, targetLeft), window.innerWidth - targetWidth - gap);
      targetTop = Math.min(Math.max(gap, targetTop), window.innerHeight - targetHeight - gap);
    } else if (typeof position === 'object') {
      targetLeft = position.left;
      targetTop = position.top;
      targetWidth = position.width || targetWidth;
      targetHeight = position.height || targetHeight;
    } else {
      targetLeft = (window.innerWidth - targetWidth) / 2;
      targetTop = (window.innerHeight - targetHeight) / 2;
    }

    this._targetRect = {
      left: targetLeft, top: targetTop,
      width: targetWidth, height: targetHeight,
      borderRadius: '28px', overflow: needsOverflow
    };

    const morphDone = new Promise(resolve => {
      animateMorph(el,
        {
          left: sourceRect.left, top: sourceRect.top,
          width: sourceRect.width, height: sourceRect.height,
          borderRadius: this._originalBorderRadius
        },
        {
          left: targetLeft, top: targetTop,
          width: targetWidth, height: targetHeight,
          borderRadius: '28px'
        },
        {
          ...this._morphOptions,
          onComplete: () => {
            el.style.width = targetWidth + 'px';
            el.style.height = targetHeight + 'px';
            el.style.maxWidth = 'none';
            el.style.maxHeight = 'none';
            el.style.overflow = needsOverflow ? 'auto' : 'hidden';
            resolve();
          }
        }
      );
    });

    requestAnimationFrame(() => {
      this._originalChildren.forEach(child => { child.style.opacity = '0'; });
      this.popupContent.style.opacity = '1';
    });

    const CROSSFADE_DURATION = 350;
    Promise.all([
      morphDone,
      new Promise(resolve => setTimeout(resolve, CROSSFADE_DURATION))
    ]).then(() => {
      if (!this._closed && this._opening) {
        this._opening = false;
        el.style.transition = '';
      }
    }).catch(() => {});
  }

  close() {
    if (this._closed) return;
    this._closed = true;
    if (this._mutationObserver) this._mutationObserver.disconnect();

    const el = this.container;
    if (!el) return;

    if (this._opening) {
      this._opening = false;
      el.style.transition = 'none';
      if (this._targetRect) {
        el.style.left = this._targetRect.left + 'px';
        el.style.top = this._targetRect.top + 'px';
        el.style.width = this._targetRect.width + 'px';
        el.style.height = this._targetRect.height + 'px';
        el.style.borderRadius = this._targetRect.borderRadius;
        el.style.overflow = this._targetRect.overflow ? 'auto' : 'hidden';
      }
      this._originalChildren.forEach(child => { child.style.opacity = '0'; });
      this.popupContent.style.opacity = '1';
    }

    if (this.overlay) {
      this.overlay.style.pointerEvents = 'none';
      this.overlay.style.transition = 'opacity 0.3s ease';
      this.overlay.style.opacity = '0';
    }

    const sourceRect = this._originalRect;

    const currentRect = {
      left: el.getBoundingClientRect().left,
      top: el.getBoundingClientRect().top,
      width: el.offsetWidth,
      height: el.offsetHeight,
      borderRadius: '28px'
    };

    const morphCloseDone = new Promise(resolve => {
      animateMorph(el, currentRect,
        {
          left: sourceRect.left, top: sourceRect.top,
          width: sourceRect.width, height: sourceRect.height,
          borderRadius: this._originalBorderRadius
        },
        {
          ...this._morphOptions,
          onComplete: resolve
        }
      );
    });

    requestAnimationFrame(() => {
      this._originalChildren.forEach(child => { child.style.opacity = '1'; });
      this.popupContent.style.opacity = '0';
    });

    const CROSSFADE_DURATION = 350;
    Promise.all([
      morphCloseDone,
      new Promise(resolve => setTimeout(resolve, CROSSFADE_DURATION))
    ]).then(() => {
      this.destroy();
    }).catch(() => {
      this.destroy();
    });
  }

  destroy() {
    const el = this.container;
    if (!el) return;

    if (el) el.style.transition = 'none';
    this._originalChildren.forEach(child => { child.style.transition = ''; child.style.opacity = ''; });
    if (this.popupContent) {
      this.popupContent.style.transition = '';
      this.popupContent.style.opacity = '';
      if (this.popupContent.parentNode) this.popupContent.remove();
    }

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.style.transition = '';
      this.overlay.remove();
    }

    if (el) {
      el.style.cssText = this._savedCssText;

      if (this._placeholder && this._placeholder.parentNode) {
        this._placeholder.parentNode.insertBefore(el, this._placeholder);
        this._placeholder.remove();
        this._placeholder = null;
      } else if (this._originalParent && this._originalParent !== document.body) {
        if (this._originalNextSibling && this._originalParent.contains(this._originalNextSibling)) {
          this._originalParent.insertBefore(el, this._originalNextSibling);
        } else {
          this._originalParent.appendChild(el);
        }
      } else {
        if (el.parentNode) el.remove();
      }
    }

    PopupManager.unregister(this);
    this._onClose();
  }

  _setupDrag() {
    if (!this.container) return;
    this.container.draggable = true;
    let startX, startY, origLeft, origTop;
    this.container.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', this.id.toString());
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      this._showDragHint();
    });
    this.container.addEventListener('drag', (e) => {
      if (this.dropZone) {
        const dropRect = this.dropZone.getBoundingClientRect();
        const cx = e.clientX, cy = e.clientY;
        if (cx > dropRect.left && cx < dropRect.right && cy > dropRect.top && cy < dropRect.bottom) {
          this.dropZone.classList.add('ready');
        } else {
          this.dropZone.classList.remove('ready');
        }
      }
    });
    this.container.addEventListener('dragend', (e) => {
      this._hideDragHint();
      if (this.dropZone && this.dropZone.classList.contains('ready')) {
        this._animateIntoDropZone();
      }
      this.container.style.transition = 'none';
    });
  }

  _showDragHint() {
    if (!this.dragHint) {
      this.dragHint = document.createElement('div');
      this.dragHint.className = 'popup-drag-hint';
      this.dragHint.textContent = 'Удалить';
      document.body.appendChild(this.dragHint);
    }
    if (!this.dropZone) {
      this.dropZone = document.createElement('div');
      this.dropZone.className = 'popup-drop-zone';
      document.body.appendChild(this.dropZone);
    }
    requestAnimationFrame(() => this.dragHint.classList.add('active'));
  }

  _hideDragHint() {
    if (this.dragHint) this.dragHint.classList.remove('active');
    if (this.dropZone) this.dropZone.classList.remove('ready');
  }

  _animateIntoDropZone() {
    const dropRect = this.dropZone.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const targetLeft = dropRect.left + dropRect.width / 2 - containerRect.width / 2;
    const targetTop = dropRect.top;
    const targetWidth = containerRect.width;
    const targetHeight = 0;
    animateMorph(this.container,
      { left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height, borderRadius: '28px' },
      { left: targetLeft, top: targetTop, width: targetWidth, height: targetHeight, borderRadius: '28px' },
      { duration: 0.3, onComplete: () => this.close() }
    );
  }
}

export { PopupManager, BaklavaPopup };
