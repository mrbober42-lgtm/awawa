/**
 * PermissionManager - Manages application permissions
 * Permissions: notifications, internet, storage, camera, microphone, geolocation, system_overlay
 */

export class PermissionManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.permissions = ['notifications', 'internet', 'storage', 'camera', 'microphone', 'geolocation', 'system_overlay'];
  }

  /**
   * Get permissions for an app
   */
  getAppPermissions(appId) {
    const allPermissions = this.storage.get('permissions', {});
    return allPermissions[appId] || {};
  }

  /**
   * Check if an app has a specific permission
   */
  hasPermission(appId, permission) {
    if (!this.permissions.includes(permission)) {
      console.warn(`Unknown permission: ${permission}`);
      return false;
    }
    const appPermissions = this.getAppPermissions(appId);
    return appPermissions[permission] === true;
  }

  /**
   * Grant a permission to an app
   */
  grantPermission(appId, permission) {
    if (!this.permissions.includes(permission)) {
      console.warn(`Unknown permission: ${permission}`);
      return false;
    }
    const allPermissions = this.storage.get('permissions', {});
    if (!allPermissions[appId]) {
      allPermissions[appId] = {};
    }
    allPermissions[appId][permission] = true;
    this.storage.set('permissions', allPermissions);
    return true;
  }

  /**
   * Revoke a permission from an app
   */
  revokePermission(appId, permission) {
    if (!this.permissions.includes(permission)) {
      console.warn(`Unknown permission: ${permission}`);
      return false;
    }
    const allPermissions = this.storage.get('permissions', {});
    if (allPermissions[appId]) {
      allPermissions[appId][permission] = false;
      this.storage.set('permissions', allPermissions);
    }
    return true;
  }

  /**
   * Request a permission (shows modal dialog)
   * Returns a Promise that resolves to true if granted
   */
  async requestPermission(appId, permission) {
    if (!this.permissions.includes(permission)) {
      console.warn(`Unknown permission: ${permission}`);
      return false;
    }

    // Check if already granted
    if (this.hasPermission(appId, permission)) {
      return true;
    }

    // Show permission request dialog
    return new Promise((resolve) => {
      const ModalManager = window.baklava?.modal;
      if (!ModalManager) {
        // Fallback if modal manager not available
        const granted = confirm(`App "${appId}" requests permission: ${permission}\n\nGrant access?`);
        if (granted) {
          this.grantPermission(appId, permission);
        }
        resolve(granted);
        return;
      }

      ModalManager.show({
        title: 'Permission Request',
        message: `The application "${appId}" is requesting access to:\n\n**${this._getPermissionLabel(permission)}**\n\nThis permission allows the app to ${this._getPermissionDescription(permission)}.`,
        buttons: [
          {
            label: 'Deny',
            action: () => resolve(false),
            variant: 'secondary'
          },
          {
            label: 'Allow',
            action: () => {
              this.grantPermission(appId, permission);
              resolve(true);
            },
            variant: 'primary'
          }
        ]
      });
    });
  }

  /**
   * Get human-readable label for permission
   */
  _getPermissionLabel(permission) {
    const labels = {
      notifications: 'Send Notifications',
      internet: 'Internet Access',
      storage: 'Local Storage',
      camera: 'Camera Access',
      microphone: 'Microphone Access',
      geolocation: 'Location Access',
      system_overlay: 'System Overlay'
    };
    return labels[permission] || permission;
  }

  /**
   * Get description for permission
   */
  _getPermissionDescription(permission) {
    const descriptions = {
      notifications: 'display notifications and alerts',
      internet: 'access network resources',
      storage: 'save data locally on your device',
      camera: 'access your camera',
      microphone: 'access your microphone',
      geolocation: 'access your location',
      system_overlay: 'display content over other applications'
    };
    return descriptions[permission] || 'use this feature';
  }

  /**
   * Reset all permissions for an app
   */
  resetAppPermissions(appId) {
    const allPermissions = this.storage.get('permissions', {});
    delete allPermissions[appId];
    this.storage.set('permissions', allPermissions);
  }

  /**
   * Reset all permissions
   */
  resetAllPermissions() {
    this.storage.set('permissions', {});
  }

  /**
   * Get all defined permissions
   */
  getAllPermissions() {
    return [...this.permissions];
  }
}
