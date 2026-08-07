/**
 * Notification Manager Module
 * Handles notification creation, grouping, and dismissal
 */

export class NotificationManager {
    constructor(state) {
        this.state = state;
        this.notificationsArea = document.getElementById('notifications-area');
    }
    
    addNotification(notif) {
        if (!notif.id) notif.id = 'notif_' + Date.now() + '_' + Math.random().toString(36);
        if (notif.expanded === undefined) notif.expanded = true;
        this.state.notifications.push(notif);
        this.renderNotifications();
        return notif.id;
    }
    
    dismissNotification(id) {
        const card = document.querySelector(`.notification-card[data-notif-id="${id}"]`);
        if (card) {
            card.style.transition = 'max-height 0.3s ease, opacity 0.3s, margin 0.3s';
            card.style.maxHeight = card.offsetHeight + 'px';
            requestAnimationFrame(() => {
                card.style.maxHeight = '0';
                card.style.opacity = '0';
                card.style.margin = '0';
                card.style.padding = '0';
            });
            setTimeout(() => {
                card.remove();
                this.state.notifications = this.state.notifications.filter(n => n.id !== id);
                this.renderNotifications();
            }, 300);
        } else {
            this.state.notifications = this.state.notifications.filter(n => n.id !== id);
            this.renderNotifications();
        }
    }
    
    renderNotifications() {
        if (!this.notificationsArea) return;
        
        if (!this.state.notificationsEnabled) { 
            this.notificationsArea.innerHTML = ''; 
            this._updateNotifBadge(); 
            return; 
        }
        
        this.notificationsArea.innerHTML = '';
        
        const grouped = {};
        this.state.notifications.forEach(n => {
            if (!grouped[n.app]) grouped[n.app] = [];
            grouped[n.app].push(n);
        });
        
        Object.entries(grouped).forEach(([app, notifs]) => {
            const appName = this._getAppDisplayName(app);
            
            if (notifs.length >= 2) {
                // Group notifications
                const groupCard = this._createGroupCard(app, notifs, appName);
                this.notificationsArea.appendChild(groupCard);
            } else {
                // Single notification
                const card = this._createNotificationCard(notifs[0]);
                this.notificationsArea.appendChild(card);
            }
        });
        
        this._updateNotifBadge();
    }
    
    _createGroupCard(app, notifs, appName) {
        const groupCard = document.createElement('div');
        groupCard.className = 'notification-group-card';
        
        const header = document.createElement('div');
        header.className = 'notification-group-header';
        header.innerHTML = `
            <span class="material-icons">${notifs[0].icon}</span>
            <div style="flex:1; font-weight:600;">${appName}</div>
            <span style="font-size:12px; opacity:0.6;">${notifs.length} увед.</span>
            <button class="clear-group-btn" title="Очистить все">
                <span class="material-icons">delete_sweep</span>
            </button>
            <span class="material-icons expand-group-icon" style="transition: transform 0.2s;">expand_more</span>
        `;
        
        const lastNotif = notifs[notifs.length - 1];
        const preview = this._createNotificationCard(lastNotif, true, true);
        preview.classList.add('group-last-preview');
        
        const list = document.createElement('div');
        list.className = 'notification-group-list';
        notifs.forEach(n => {
            const item = this._createNotificationCard(n, true);
            list.appendChild(item);
        });
        
        let isExpanded = false;
        header.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            isExpanded = !isExpanded;
            
            if (isExpanded) {
                list.style.transition = 'max-height 0.35s cubic-bezier(0.2,0.9,0.4,1)';
                list.style.overflow = 'hidden';
                list.style.maxHeight = list.scrollHeight + 'px';
                preview.style.display = 'none';
                
                const onTransitionEnd = () => {
                    list.style.maxHeight = 'none';
                    list.style.overflow = 'visible';
                    list.removeEventListener('transitionend', onTransitionEnd);
                };
                list.addEventListener('transitionend', onTransitionEnd);
            } else {
                list.style.transition = 'max-height 0.35s cubic-bezier(0.2,0.9,0.4,1)';
                list.style.overflow = 'hidden';
                list.style.maxHeight = list.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    list.style.maxHeight = '0';
                });
                preview.style.display = 'flex';
            }
            
            header.querySelector('.expand-group-icon').style.transform = isExpanded ? 'rotate(180deg)' : '';
        });
        
        header.querySelector('.clear-group-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            notifs.forEach(n => this.dismissNotification(n.id));
        });
        
        groupCard.append(header, preview, list);
        return groupCard;
    }
    
    _createNotificationCard(n, isGroupChild = false, forceCollapsed = false) {
        if (n.expanded === undefined) n.expanded = !forceCollapsed;
        
        const card = document.createElement('div');
        card.className = 'notification-card';
        card.dataset.notifId = n.id;
        if (isGroupChild) card.style.marginBottom = '0';
        
        card.innerHTML = `
            <span class="material-icons notif-icon">${n.icon}</span>
            <div class="notif-body">
                <div class="notif-title">${n.title}</div>
                <div class="notif-text" style="white-space: ${n.expanded ? 'normal' : 'nowrap'}; overflow: ${n.expanded ? 'visible' : 'hidden'}; text-overflow: ${n.expanded ? 'unset' : 'ellipsis'};">${n.text}</div>
                <div class="notif-time">${n.time}</div>
                <div class="notif-extra" style="max-height:0; overflow:hidden; transition: max-height 0.35s cubic-bezier(0.2,0.9,0.4,1);">${n.content || ''}</div>
            </div>
            <div class="notif-actions-right">
                <div class="notif-clear-btn" data-action="clear"><span class="material-icons">close</span></div>
                <button class="expand-btn" data-action="expand"><span class="material-icons">unfold_more</span></button>
            </div>
        `;
        
        const clearBtn = card.querySelector('[data-action="clear"]');
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dismissNotification(n.id);
        });
        
        const expandBtn = card.querySelector('[data-action="expand"]');
        if (!n.content || n.content.trim() === '') {
            expandBtn.style.display = 'none';
        } else {
            const extraEl = card.querySelector('.notif-extra');
            const setExpandedState = (expanded, animate = false) => {
                if (expanded) {
                    extraEl.style.transition = animate ? 'max-height 0.35s cubic-bezier(0.2,0.9,0.4,1)' : 'none';
                    extraEl.style.maxHeight = Math.max(extraEl.scrollHeight * 2, 200) + 'px';
                    expandBtn.querySelector('.material-icons').textContent = 'unfold_less';
                } else {
                    extraEl.style.transition = animate ? 'max-height 0.35s cubic-bezier(0.2,0.9,0.4,1)' : 'none';
                    extraEl.style.maxHeight = '0';
                    expandBtn.querySelector('.material-icons').textContent = 'unfold_more';
                }
            };
            
            setExpandedState(n.expanded, false);
            
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                n.expanded = !n.expanded;
                setExpandedState(n.expanded, true);
            });
        }
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.notif-clear-btn')) return;
            console.log('Open app:', n.app);
        });
        
        this._attachSwipeToDismiss(card, n.id);
        
        return card;
    }
    
    _attachSwipeToDismiss(card, notifId) {
        let startX = 0, startY = 0, offsetX = 0, swiping = false, dismissed = false;
        const threshold = 80;
        
        card.addEventListener('touchstart', e => {
            if (e.target.closest('button') || e.target.closest('.notif-clear-btn')) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            offsetX = 0;
            swiping = true;
            dismissed = false;
            card.classList.add('swiping');
            card.style.transition = 'none';
        }, { passive: false });
        
        card.addEventListener('touchmove', e => {
            if (!swiping || dismissed) return;
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
                swiping = false;
                card.style.transition = '';
                card.style.transform = '';
                card.style.opacity = '';
                card.classList.remove('swiping');
                return;
            }
            offsetX = dx;
            card.style.transform = `translateX(${dx}px)`;
            card.style.opacity = Math.max(0, 1 - Math.abs(dx) / 200);
        }, { passive: false });
        
        card.addEventListener('touchend', e => {
            if (!swiping || dismissed) return;
            swiping = false;
            card.classList.remove('swiping');
            card.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.9, 0.4, 1), opacity 0.25s';
            
            if (Math.abs(offsetX) > threshold) {
                dismissed = true;
                card.style.transform = `translateX(${offsetX > 0 ? 150 : -150}%)`;
                card.style.opacity = '0';
                setTimeout(() => this.dismissNotification(notifId), 350);
            } else {
                card.style.transform = '';
                card.style.opacity = '';
            }
            setTimeout(() => { if (!dismissed) card.style.transition = ''; }, 400);
        });
    }
    
    _updateNotifBadge() {
        const indicator = document.getElementById('notif-indicator');
        const count = this.state.notifications.length;
        if (indicator) {
            indicator.textContent = count;
            indicator.style.display = count > 0 ? 'flex' : 'none';
        }
    }
    
    _getAppDisplayName(appId) {
        if(this.state.installedApps.has(appId)) return this.state.installedApps.get(appId).name;
        const m = {
            settings: 'Настройки',
            calculator: 'Калькулятор',
            clock: 'Часы',
            downloads: 'Загрузки'
        };
        return m[appId] || appId;
    }
}
