// NotificationManager.js - Управление уведомлениями
import { state } from '../core/state.js';
import { getAppDisplayName } from '../core/utils.js';
import { closeAllShade } from './PanelManager.js';
import { focusOrCreate } from './WindowManager.js';

/**
 * Обновить бейдж уведомлений
 */
export function updateNotifBadge() {
  const indicator = document.getElementById('notif-indicator');
  const count = state.notifications.length;
  if (indicator) {
    indicator.textContent = count;
    indicator.style.display = count > 0 ? 'flex' : 'none';
  }
}

/**
 * Удалить уведомление
 */
export function dismissNotification(id) {
  const card = document.querySelector(`.notification-card[data-notif-id="${id}"]`);
  if (card) {
    card.style.transition = 'max-height 0.3s ease, opacity 0.3s, margin 0.3s';
    card.style.maxHeight = card.offsetHeight + 'px'; // фиксируем текущую высоту
    requestAnimationFrame(() => {
      card.style.maxHeight = '0';
      card.style.opacity = '0';
      card.style.margin = '0';
      card.style.padding = '0';
    });
    setTimeout(() => {
      card.remove();
      state.notifications = state.notifications.filter(n => n.id !== id);
      renderNotifications();
    }, 300);
  } else {
    state.notifications = state.notifications.filter(n => n.id !== id);
    renderNotifications();
  }
}

/**
 * Прикрепить свайп для удаления к карточке уведомления
 */
export function attachSwipeToDismiss(card, notifId) {
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
      setTimeout(() => dismissNotification(notifId), 350);
    } else {
      card.style.transform = '';
      card.style.opacity = '';
    }
    setTimeout(() => { if (!dismissed) card.style.transition = ''; }, 400);
  });
}

/**
 * Создать карточку уведомления
 */
export function createNotificationCard(n, isGroupChild = false, forceCollapsed = false) {
  // По умолчанию развёрнуто, если не задано и не принудительно свёрнуто
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

  const textEl = card.querySelector('.notif-text');
  const extraEl = card.querySelector('.notif-extra');
  const expandBtn = card.querySelector('[data-action="expand"]');
  const clearBtn = card.querySelector('[data-action="clear"]');

  // Останавливаем всплытие внутри панели
  extraEl.addEventListener('click', (e) => e.stopPropagation());

  // Обработчик удаления
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissNotification(n.id);
  });

  // Если нет контента – скрываем кнопку расширения
  if (!n.content || n.content.trim() === '') {
    expandBtn.style.display = 'none';
  } else {
    // Установка начальной иконки и высоты панели
    const setExpandedState = (expanded, animate = false) => {
      if (expanded) {
        if (animate) {
          extraEl.style.transition = 'max-height 0.35s cubic-bezier(0.2,0.9,0.4,1)';
          extraEl.style.maxHeight = Math.max(extraEl.scrollHeight * 2, 200) + 'px';
        } else {
          extraEl.style.transition = 'none';
          extraEl.style.maxHeight = Math.max(extraEl.scrollHeight * 2, 200) + 'px';
        }
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

  // Клик по карточке открывает приложение
  card.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.notif-clear-btn')) return;
    closeAllShade();
    focusOrCreate(n.app);
  });

  // Свайп для удаления
  attachSwipeToDismiss(card, n.id);

  // Корректировка высоты панели после вставки в DOM (если изначально развёрнуто)
  if (n.expanded && extraEl.scrollHeight > 0) {
    requestAnimationFrame(() => {
      extraEl.style.maxHeight = Math.max(extraEl.scrollHeight * 2, 200) + 'px';
    });
  }
  
  if (typeof n.onRender === 'function') {
    requestAnimationFrame(() => n.onRender(card));
  }

  return card;
}

/**
 * Отрисовать уведомления
 */
export function renderNotifications() {
  const area = document.getElementById('notifications-area');
  if (!state.notificationsEnabled) { 
    area.innerHTML = ''; 
    updateNotifBadge(); 
    return; 
  }
  area.innerHTML = '';

  const grouped = {};
  state.notifications.forEach(n => {
    if (!grouped[n.app]) grouped[n.app] = [];
    grouped[n.app].push(n);
  });

  Object.entries(grouped).forEach(([app, notifs]) => {
    const appName = getAppDisplayName(app);

    if (notifs.length >= 2) {
      // Групповая карточка
      const groupCard = document.createElement('div');
      groupCard.className = 'notification-group-card';

      // Заголовок группы
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

      // Превью последнего уведомления (сворачиваемое)
      const lastNotif = notifs[notifs.length - 1];
      // Принудительно свёрнутое превью (текст в одну строку)
      const preview = createNotificationCard(lastNotif, true, true);
      preview.classList.add('group-last-preview');
      // Убираем кнопку очистить, чтобы не удалить случайно, но оставляем развернуть
      const previewClearBtn = preview.querySelector('[data-action="clear"]');
      if (previewClearBtn) previewClearBtn.style.display = 'none';

      // Список всех уведомлений (скрыт по умолчанию)
      const list = document.createElement('div');
      list.className = 'notification-group-list';
      notifs.forEach(n => {
        const item = createNotificationCard(n, true);
        list.appendChild(item);
      });

      // Логика раскрытия/сворачивания
      let isExpanded = false;
      header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        isExpanded = !isExpanded;
        if (isExpanded) {
          // Расширяем список до его реальной высоты
          list.style.transition = 'max-height 0.35s cubic-bezier(0.2,0.9,0.4,1)';
          list.style.overflow = 'hidden';
          list.style.maxHeight = list.scrollHeight + 'px';
          preview.style.display = 'none';
          // После завершения анимации разрешаем свободное изменение высоты
          const onTransitionEnd = () => {
            list.style.maxHeight = 'none';
            list.style.overflow = 'visible';
            list.removeEventListener('transitionend', onTransitionEnd);
          };
          list.addEventListener('transitionend', onTransitionEnd);
        } else {
          // Сворачиваем: фиксируем текущую высоту и анимируем до 0
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

      // Очистить все уведомления этой группы
      header.querySelector('.clear-group-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        notifs.forEach(n => dismissNotification(n.id));
      });

      groupCard.append(header, preview, list);
      area.appendChild(groupCard);
    } else {
      // Одиночное уведомление
      const card = createNotificationCard(notifs[0]);
      area.appendChild(card);
    }
  });
  updateNotifBadge();
}
