/**
 * ModalManager - Manages modal dialogs (replaces alert/confirm/prompt)
 */

export class ModalManager {
  constructor() {
    this.overlay = null;
    this.dialogContainer = null;
    this.currentModal = null;
    this.resolveCallback = null;
  }

  init() {
    this.overlay = document.getElementById('modal-overlay');
    if (!this.overlay) {
      // Create overlay if not exists
      this.overlay = document.createElement('div');
      this.overlay.id = 'modal-overlay';
      document.body.appendChild(this.overlay);
    }
  }

  /**
   * Show a modal dialog
   * @param {Object} config - Modal configuration
   * @returns {Promise} - Resolves with user action
   */
  show(config) {
    return new Promise((resolve) => {
      this._createModal(config, resolve);
    });
  }

  _createModal(config, resolveCallback) {
    this.resolveCallback = resolveCallback;

    // Clear existing content
    this.overlay.innerHTML = '';

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';

    let buttonsHtml = '';
    if (config.buttons && config.buttons.length > 0) {
      buttonsHtml = '<div class="modal-actions">';
      config.buttons.forEach((btn, index) => {
        const variant = btn.variant || 'secondary';
        buttonsHtml += `
          <button class="md3-button ${variant}" data-btn-index="${index}">
            ${btn.label}
          </button>
        `;
      });
      buttonsHtml += '</div>';
    }

    dialog.innerHTML = `
      <div class="modal-title">${config.title || ''}</div>
      <div class="modal-message">${this._formatMessage(config.message || '')}</div>
      ${buttonsHtml}
    `;

    this.overlay.appendChild(dialog);
    this.currentModal = { config, dialog };

    // Show overlay with animation
    requestAnimationFrame(() => {
      this.overlay.classList.add('active');
    });

    // Set up button handlers
    const buttons = dialog.querySelectorAll('.modal-actions button');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.btnIndex);
        const buttonConfig = config.buttons[index];
        
        this.hide();
        
        if (buttonConfig && typeof buttonConfig.action === 'function') {
          buttonConfig.action();
        }
        
        resolveCallback({ buttonIndex: index, button: buttonConfig });
      });
    });

    // Close on overlay click (optional)
    if (config.closeOnOverlayClick !== false) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.hide();
          resolveCallback({ closed: true });
        }
      });
    }
  }

  _formatMessage(message) {
    // Simple markdown-like formatting
    return message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Hide the current modal
   */
  hide() {
    if (!this.overlay) return;
    
    this.overlay.classList.remove('active');
    
    setTimeout(() => {
      this.overlay.innerHTML = '';
      this.currentModal = null;
      this.resolveCallback = null;
    }, 200);
  }

  /**
   * Show an alert-style modal
   */
  alert(message, title = 'Alert') {
    return this.show({
      title,
      message,
      buttons: [
        {
          label: 'OK',
          action: () => {},
          variant: 'primary'
        }
      ]
    });
  }

  /**
   * Show a confirm-style modal
   */
  confirm(message, title = 'Confirm') {
    return this.show({
      title,
      message,
      buttons: [
        {
          label: 'Cancel',
          action: () => {},
          variant: 'secondary'
        },
        {
          label: 'OK',
          action: () => {},
          variant: 'primary'
        }
      ]
    });
  }

  /**
   * Show a prompt-style modal
   */
  prompt(message, defaultValue = '', title = 'Prompt') {
    return new Promise((resolve) => {
      let inputValue = defaultValue;

      this.show({
        title,
        message: `
          ${message}
          <input type="text" id="modal-prompt-input" 
                 value="${defaultValue}" 
                 style="width: 100%; margin-top: 12px; padding: 8px; border-radius: 8px; border: 1px solid var(--md-sys-color-outline); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface);"
                 autofocus>
        `,
        buttons: [
          {
            label: 'Cancel',
            action: () => resolve(null),
            variant: 'secondary'
          },
          {
            label: 'OK',
            action: () => {
              const input = document.getElementById('modal-prompt-input');
              if (input) {
                inputValue = input.value;
              }
              resolve(inputValue);
            },
            variant: 'primary'
          }
        ]
      }).then((result) => {
        if (result.closed) {
          resolve(null);
        }
      });
    });
  }
}
