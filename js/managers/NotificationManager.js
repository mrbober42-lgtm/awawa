/**
 * NotificationManager - Manages system notifications
 */

export class NotificationManager {
  constructor(storageManager, panelManager) {
    this.storage = storageManager;
    this.panel = panelManager;
    this.notifications = new Map();
    this.notificationIdCounter = 0;
  }

  /**
   * Show a notification
   * @param {Object} config - Notification configuration
   * @returns {string} - Notification ID
   */
  show(config) {
    const id = `notif_${++this.notificationIdCounter}`;
    
    const notifData = {
      id,
      title: config.title || 'Notification',
      text: config.text || '',
      icon: config.icon || 'notifications',
      app: config.app || 'System',
      timestamp: Date.now(),
      content: config.content || null,
      onAction: config.onAction || null
    };

    this.notifications.set(id, notifData);
    this._renderNotification(notifData);
    this._updateNotificationsPanel();

    return id;
  }

  _renderNotification(notifData) {
    // Could add toast-style popup here
    console.log('Notification shown:', notifData.title);
  }

  _updateNotificationsPanel() {
    const notifList = document.getElementById('notifications-list');
    if (!notifList) return;

    // Sort by timestamp (newest first)
    const sorted = Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    notifList.innerHTML = '';

    sorted.forEach(notif => {
      const card = document.createElement('div');
      card.className = 'notification-card';
      card.dataset.id = notif.id;

      const timeAgo = this._getTimeAgo(notif.timestamp);

      card.innerHTML = `
        <div class="notification-icon">
          <span class="material-symbols-outlined">${notif.icon}</span>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notif.title}</div>
          <div class="notification-text">${notif.text}</div>
          <div class="notification-time">${timeAgo} • ${notif.app}</div>
          ${notif.content ? `<div class="notification-expand-btn" style="margin-top: 8px; font-size: 12px; color: var(--md-sys-color-primary); cursor: pointer;">Развернуть</div>` : ''}
        </div>
        <div class="notification-close">
          <span class="material-symbols-outlined">close</span>
        </div>
      `;

      // Close button
      const closeBtn = card.querySelector('.notification-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss(notif.id);
      });

      // Click to expand or action
      card.addEventListener('click', () => {
        if (notif.content) {
          // Expand notification
          this._expandNotification(notif.id);
        }
        if (notif.onAction) {
          notif.onAction(notif);
        }
      });

      notifList.appendChild(card);
    });
  }

  _getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Только что';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`;
    return `${Math.floor(seconds / 86400)} дн назад`;
  }

  _expandNotification(id) {
    const notif = this.notifications.get(id);
    if (!notif || !notif.content) return;

    // Show expanded content in a modal or panel
    if (window.baklava?.modal) {
      window.baklava.modal.show({
        title: notif.title,
        message: notif.content,
        buttons: [
          { label: 'Закрыть', action: () => {}, variant: 'primary' }
        ]
      });
    }
  }

  /**
   * Dismiss a notification
   */
  dismiss(id) {
    this.notifications.delete(id);
    this._updateNotificationsPanel();
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.clear();
    this._updateNotificationsPanel();
  }

  /**
   * Get notification by ID
   */
  get(id) {
    return this.notifications.get(id);
  }

  /**
   * Get all notifications
   */
  getAll() {
    return Array.from(this.notifications.values());
  }
}
