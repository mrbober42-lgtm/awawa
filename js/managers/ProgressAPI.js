/**
 * ProgressAPI - Прогресс-бары для задач
 */

const ProgressAPI = (function() {
  const container = document.getElementById('progress-chips-container');
  if (!container) { console.error('progress-chips-container не найден'); return null; }
  const tasks = new Map();
  const appChips = new Map();

  function createAppChip(appId, appIcon, appName) {
    const chip = document.createElement('div');
    chip.className = 'progress-app-chip';
    chip.title = appName;
    chip.innerHTML = `
      <div class="progress-app-icon">
        <span class="material-icons">${appIcon || 'apps'}</span>
      </div>
      <div class="progress-app-items"></div>
    `;
    chip.onclick = () => { if (typeof focusOrCreate === 'function') focusOrCreate(appId); };
    const itemsContainer = chip.querySelector('.progress-app-items');
    container.appendChild(chip);
    return { chip, itemsContainer };
  }

  return {
    create(id, options = {}) {
      if (tasks.has(id)) return;
      const appId = options.appId || 'system';
      const appIcon = options.appIcon || 'apps';
      const appName = options.appName || 'Приложение';

      const taskEl = document.createElement('div');
      taskEl.className = 'progress-task-item';
      taskEl.innerHTML = `
        <span class="material-icons">${options.icon || 'download'}</span>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${options.initialProgress || 0}%"></div>
        </div>
        <span class="task-label">${options.label || ''}</span>
      `;
      const fill = taskEl.querySelector('.progress-bar-fill');

      let appChip = appChips.get(appId);
      if (!appChip) {
        const { chip, itemsContainer } = createAppChip(appId, appIcon, appName);
        appChip = { element: chip, itemsContainer, tasks: new Set() };
        appChips.set(appId, appChip);
      }
      appChip.itemsContainer.appendChild(taskEl);
      appChip.tasks.add(id);
      tasks.set(id, { element: taskEl, fill, appId });
      requestAnimationFrame(() => taskEl.style.opacity = '1');
    },

    update(id, progress) {
      const task = tasks.get(id);
      if (task) task.fill.style.width = Math.min(100, Math.max(0, progress)) + '%';
    },

    remove(id) {
      const task = tasks.get(id);
      if (!task) return;
      const appChip = appChips.get(task.appId);
      if (!appChip) return;
      task.element.style.transition = 'opacity 0.2s, max-width 0.2s, padding 0.2s, margin 0.2s';
      task.element.style.opacity = '0';
      task.element.style.maxWidth = '0';
      task.element.style.padding = '0';
      task.element.style.margin = '0';
      setTimeout(() => {
        task.element.remove();
        appChip.tasks.delete(id);
        tasks.delete(id);
        if (appChip.tasks.size === 0) {
          appChip.element.style.transition = 'opacity 0.2s, max-width 0.2s';
          appChip.element.style.opacity = '0';
          appChip.element.style.maxWidth = '0';
          setTimeout(() => {
            appChip.element.remove();
            appChips.delete(task.appId);
          }, 200);
        }
      }, 200);
    },

    exists(id) { return tasks.has(id); }
  };
})();

export { ProgressAPI };
