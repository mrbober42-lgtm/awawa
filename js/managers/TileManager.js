// TileManager.js - Плитки QS (Quick Settings)
import { state } from '../core/state.js';

/**
 * Отрисовать плитки QS
 */
export function renderTiles() { 
  const SystemAPI = window.SystemAPI;
  SystemAPI?.getComponent('qsPanel')?.render(state.tiles); 
}

/**
 * Получить индекс для вставки при drag'n'drop
 */
export function getDropIndex(e, container) {
  const children = [...container.children];
  const mouseY = e.clientY;
  for (let i = 0; i < children.length; i++) {
    const rect = children[i].getBoundingClientRect();
    if (mouseY < rect.top + rect.height / 2) return i;
  }
  return children.length;
}

/**
 * Обработать drop事件
 */
export function handleDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  const targetType = target.id === 'active-tiles-editor' ? 'active' : 'available';
  const raw = e.dataTransfer.getData('text/plain');
  if (!raw) return;
  const data = JSON.parse(raw);
  
  if (targetType === 'active' && data.type === 'available') {
    if (!state.tiles.some(t => t.id === data.id)) {
      const dropIndex = getDropIndex(e, target);
      const newTile = { ...data.tile, active: false, width: 'normal' };
      if (dropIndex === -1) state.tiles.push(newTile);
      else state.tiles.splice(dropIndex, 0, newTile);
    }
  } else if (targetType === 'available' && data.type === 'active') {
    state.tiles.splice(data.index, 1);
  } else if (targetType === 'active' && data.type === 'active') {
    const from = data.index;
    const to = getDropIndex(e, target);
    if (from !== to && to !== -1) {
      const moved = state.tiles.splice(from, 1)[0];
      state.tiles.splice(to, 0, moved);
    }
  }
  
  renderTileEditor();
  renderTiles();
  localStorage.setItem('tiles', JSON.stringify(state.tiles));
}

/**
 * Отрисовать редактор плиток
 */
export function renderTileEditor() {
  const activeCont = document.getElementById('active-tiles-editor');
  const availCont = document.getElementById('available-tiles-editor');
  activeCont.innerHTML = '';
  availCont.innerHTML = '';
  
  [activeCont, availCont].forEach(c => {
    c.addEventListener('dragover', e => e.preventDefault());
    c.addEventListener('drop', handleDrop);
  });

  state.tiles.forEach((tile, idx) => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.width = tile.width === 'half' ? '64px' : '140px';
    el.classList.toggle('half', tile.width === 'half');
    el.draggable = true;
    el.dataset.index = idx;
    el.dataset.type = 'active';
    el.dataset.id = tile.id;

    el.innerHTML = `
      <div class="tile-icon-wrapper">
        <span class="material-icons">${tile.icon}</span>
      </div>
      <div class="tile-body">
        <span class="tile-text">${tile.label}</span>
      </div>
      <div class="tile-resize-lever"></div>
    `;

    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'active', index: idx, id: tile.id }));
      el.style.opacity = '0.5';
    });
    el.addEventListener('dragend', e => { el.style.opacity = ''; });

    const lever = el.querySelector('.tile-resize-lever');
    let dragging = false, startX, startW;
    const startResize = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragging) return;
      dragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      startX = clientX;
      startW = el.offsetWidth;
      el.classList.add('resizing');
      const onDrag = (e) => {
        if (!dragging) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const w = startW + clientX - startX;
        tile.width = w < 120 ? 'half' : 'normal';
        el.style.width = tile.width === 'half' ? '64px' : '140px';
        el.classList.toggle('half', tile.width === 'half');
      };
      const onDragEnd = () => {
        dragging = false;
        el.classList.remove('resizing');
        renderTileEditor();
        renderTiles();
        localStorage.setItem('tiles', JSON.stringify(state.tiles));
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('touchmove', onDrag);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('touchend', onDragEnd);
      };
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('touchmove', onDrag, {passive: false});
      window.addEventListener('mouseup', onDragEnd);
      window.addEventListener('touchend', onDragEnd);
    };
    lever.addEventListener('mousedown', startResize);
    lever.addEventListener('touchstart', startResize, {passive: false});
    activeCont.appendChild(el);
  });

  window.availableTiles.forEach(tileDef => {
    if (!state.tiles.some(t => t.id === tileDef.id)) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.style.width = '140px';
      el.draggable = true;
      el.dataset.type = 'available';
      el.dataset.id = tileDef.id;
      el.innerHTML = `
        <div class="tile-icon-wrapper">
          <span class="material-icons">${tileDef.icon}</span>
        </div>
        <div class="tile-body">
          <span class="tile-text">${tileDef.label}</span>
        </div>
      `;
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'available', id: tileDef.id, tile: tileDef }));
        el.style.opacity = '0.5';
      });
      el.addEventListener('dragend', e => { el.style.opacity = ''; });
      availCont.appendChild(el);
    }
  });
}

/**
 * Инициализировать обработчики кнопок редактора QS
 */
export function initTileEditorListeners() {
  const editTilesBtn = document.getElementById('edit-tiles-btn');
  const backFromEditorBtn = document.getElementById('back-from-editor');
  const qsPanel = document.getElementById('qs-panel');

  if (editTilesBtn) {
    editTilesBtn.style.position = 'relative';
    editTilesBtn.style.zIndex = '20';
    editTilesBtn.style.pointerEvents = 'auto';
    editTilesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      qsPanel.classList.add('qs-edit-mode');
      requestAnimationFrame(() => renderTileEditor());
    });
    editTilesBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      qsPanel.classList.add('qs-edit-mode');
      requestAnimationFrame(() => renderTileEditor());
    }, { passive: false });
  }

  if (backFromEditorBtn) {
    backFromEditorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      qsPanel.classList.remove('qs-edit-mode');
      renderTiles();
    });
    backFromEditorBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      qsPanel.classList.remove('qs-edit-mode');
      renderTiles();
    }, { passive: false });
  }
}
