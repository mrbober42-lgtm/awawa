/**
 * SystemAPI - Система регистрации компонентов
 */

const SystemAPI = {
  components: new Map(),
  
  registerComponent(type, implementation) {
    this.components.set(type, implementation);
  },
  
  getComponent(type) {
    return this.components.get(type) || null;
  },
  
  initDefaultComponents() {
    if (!this.getComponent('desktop')) {
      this.registerComponent('desktop', {
        renderIcons: (apps) => {
          const desktopEl = document.getElementById('desktop');
          const widget = document.getElementById('widget');
          desktopEl.innerHTML = '';
          if (widget) desktopEl.appendChild(widget);
          let col = 0, row = 0;
          const cols = 6;
          apps.forEach(app => {
            if (!app.hidden) {
              const icon = document.createElement('div');
              icon.className = 'desktop-icon';
              icon.dataset.app = app.id;
              icon.style.left = (120 + col * 120) + 'px';
              icon.style.top = (120 + row * 120) + 'px';
              icon.innerHTML = `<span class="material-icons">${app.icon || 'apps'}</span><span>${app.name}</span>`;
              icon.setAttribute('draggable', 'true');
              desktopEl.appendChild(icon);
              col = (col + 1) % cols;
              if (col === 0) row++;
            }
          });
          desktopEl.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          });
          desktopEl.addEventListener('drop', e => {
            e.preventDefault();
            const raw = e.dataTransfer.getData('text/plain');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.type === 'app') {
              const app = window.state.installedApps.get(data.id);
              if (app && !app.hidden) {
                let existingIcon = document.querySelector(`.desktop-icon[data-app="${data.id}"]`);
                if (!existingIcon) {
                  existingIcon = document.createElement('div');
                  existingIcon.className = 'desktop-icon';
                  existingIcon.dataset.app = data.id;
                  existingIcon.innerHTML = `<span class="material-icons">${app.icon || 'apps'}</span><span>${app.name}</span>`;
                  existingIcon.setAttribute('draggable', 'true');
                  desktopEl.appendChild(existingIcon);
                  if (typeof attachIconHandlers === 'function') attachIconHandlers(existingIcon);
                }
                const rect = desktopEl.getBoundingClientRect();
                let x = e.clientX - rect.left - 48;
                let y = e.clientY - rect.top - 48;
                x = snapToGrid(x);
                y = snapToGrid(y);
                x = Math.max(0, Math.min(x, rect.width - 96));
                y = Math.max(0, Math.min(y, rect.height - 96));
                existingIcon.style.left = x + 'px';
                existingIcon.style.top = y + 'px';
              }
            }
          });
          document.querySelectorAll('.desktop-icon').forEach(i => {
            if (typeof attachIconHandlers === 'function') attachIconHandlers(i);
          });
        }
      });
    }

    if (!this.getComponent('qsPanel')) {
      this.registerComponent('qsPanel', {
        render: (tiles) => {
          const cont = document.getElementById('tiles-container');
          cont.innerHTML = '';
          tiles.forEach((t, idx) => {
            let tileDef = window.availableTiles.find(td => td.id === t.id);
            if (!tileDef) {
              tileDef = { icon: t.icon || 'help', label: t.label || t.id, type: 'switch' };
            }
            const isSwitch = tileDef && tileDef.type === 'switch';
            const isApp = tileDef && tileDef.launchApp;
            const hasPopup = tileDef && typeof tileDef.overlayContent === 'function';
            const isHalf = t.width === 'half';

            const el = document.createElement('div');
            el.className = 'tile';
            if (isApp) el.classList.add('tile-app');
            else if (isSwitch) {
              el.classList.add('tile-switch');
              if (hasPopup) el.classList.add('has-popup');
            }
            if (t.active) el.classList.add('active');
            el.style.width = isHalf ? '64px' : '140px';
            el.draggable = true;
            el.dataset.index = idx;
            el.dataset.id = t.id;
            if (isHalf) el.classList.add('half');

            el.innerHTML = `
              <div class="tile-icon-wrapper">
                <span class="material-icons">${tileDef.icon}</span>
              </div>
              <div class="tile-body">
                <span class="tile-text">${tileDef.label}</span>
              </div>
            `;

            el.addEventListener('click', (e) => {
              const target = e.target;

              if (isHalf) {
                t.active = !t.active;
                el.classList.toggle('active', t.active);
                localStorage.setItem('tiles', JSON.stringify(window.state.tiles));
                if (typeof tileDef.action === 'function') tileDef.action();
                return;
              }

              if (hasPopup) {
                if (target.closest('.tile-icon-wrapper')) {
                  t.active = !t.active;
                  el.classList.toggle('active', t.active);
                  localStorage.setItem('tiles', JSON.stringify(window.state.tiles));
                  if (typeof tileDef.action === 'function') tileDef.action();
                  return;
                }
                if (target.closest('.tile-body')) {
                  window.BaklavaAPI.openPopup({
                    sourceElement: el,
                    contentElement: tileDef.overlayContent(),
                    position: 'center',
                    draggable: false,
                    overlayStyle: { background: 'rgba(0,0,0,0.4)' },
                    closeOnOverlayClick: true,
                    closeOnSourceRemove: true,
                    morphOptions: { duration: 0.4 }
                  });
                  return;
                }
                return;
              }

              if (isSwitch) {
                t.active = !t.active;
                el.classList.toggle('active', t.active);
                localStorage.setItem('tiles', JSON.stringify(window.state.tiles));
                if (typeof tileDef.action === 'function') tileDef.action();
                return;
              }

              if (tileDef?.launchApp && tileDef.appId) {
                const rect = el.getBoundingClientRect();
                if (typeof closeAllShade === 'function') closeAllShade();
                createWindow(tileDef.appId, null, rect);
                return;
              }
            });

            if (isHalf && hasPopup) {
              el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                window.BaklavaAPI.openPopup({
                  sourceElement: el,
                  contentElement: tileDef.overlayContent(),
                  position: 'center',
                  draggable: false,
                  overlayStyle: { background: 'rgba(0,0,0,0.4)' },
                  closeOnOverlayClick: true,
                  closeOnSourceRemove: true,
                  morphOptions: { duration: 0.4 }
                });
              });
              let pressTimer;
              el.addEventListener('touchstart', () => {
                pressTimer = setTimeout(() => {
                  window.BaklavaAPI.openPopup({
                    sourceElement: el,
                    contentElement: tileDef.overlayContent(),
                    position: 'center',
                    draggable: false,
                    overlayStyle: { background: 'rgba(0,0,0,0.4)' },
                    closeOnOverlayClick: true,
                    closeOnSourceRemove: true,
                    morphOptions: { duration: 0.4 }
                  });
                }, 600);
              }, { passive: true });
              el.addEventListener('touchend', () => clearTimeout(pressTimer));
              el.addEventListener('touchmove', () => clearTimeout(pressTimer));
            }

            cont.appendChild(el);
          });
        }
      });
    }

    if (!this.getComponent('notificationPanel')) {
      this.registerComponent('notificationPanel', {
        render: (notifications) => {
          const area = document.getElementById('notifications-area');
          if (!window.state.notificationsEnabled) { area.innerHTML = ''; return; }
          const groups = {};
          notifications.forEach(n => { if (!groups[n.app]) groups[n.app] = []; groups[n.app].push(n); });
          area.innerHTML = '';
          Object.entries(groups).forEach(([app, notifs]) => {
            const card = document.createElement('div');
            card.className = 'notification-card';
            card.innerHTML = `<span class="material-icons">${notifs[0].icon}</span><div><strong>${app}</strong><br>${notifs.length} уведомлений</div><button class="clear-group"><span class="material-icons">delete</span></button>`;
            card.onclick = (e) => { if (!e.target.closest('button')) { if (typeof closeShade === 'function') closeShade(); if (typeof focusOrCreate === 'function') focusOrCreate(app); } };
            card.querySelector('.clear-group').onclick = e => { e.stopPropagation(); window.state.notifications = window.state.notifications.filter(n => n.app !== app); this.render(window.state.notifications); };
            area.appendChild(card);
          });
        }
      });
    }

    if (!this.getComponent('statusBar')) {
      this.registerComponent('statusBar', {
        updateTime: () => { document.getElementById('live-time').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); },
        updateBattery: (level) => { document.getElementById('battery-level').style.width = level + '%'; document.getElementById('battery-percent').textContent = Math.round(level) + '%'; }
      });
    }

    if (!this.getComponent('taskbar')) {
      this.registerComponent('taskbar', {
        updateCounter: (count) => { document.getElementById('window-count-text').textContent = `${count} ок.`; },
      });
    }
  }
};

export { SystemAPI };
