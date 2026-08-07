// Приложение "Загрузки" (Downloads)
export const downloadsApp = {
  id: 'downloads',
  name: 'Загрузки',
  icon: 'download',
  createWindow: (intent) => {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;flex-direction:column;height:100%;padding:20px;gap:16px;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);';
    
    let downloads = [];
    try {
      downloads = JSON.parse(localStorage.getItem('downloads') || '[]');
    } catch(e) {}
    
    const saveDownloads = () => localStorage.setItem('downloads', JSON.stringify(downloads));
    const generateId = () => Math.random().toString(36).substr(2, 9);
    
    const header = document.createElement('div');
    header.innerHTML = '<h2 style="margin:0;font-size:28px;">Загрузки</h2>';
    container.appendChild(header);
    
    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;';
    container.appendChild(listContainer);
    
    const inputSection = document.createElement('div');
    inputSection.style.cssText = 'display:flex;gap:10px;';
    inputSection.innerHTML = `
      <input id="download-url-input" type="text" placeholder="URL файла" style="flex:1;padding:12px 16px;border-radius:12px;border:1px solid var(--md-sys-color-outline-variant);background:var(--md-sys-color-surface-container);color:var(--md-sys-color-on-surface);">
      <button id="download-add-btn" class="taskbar-btn" style="white-space:nowrap;">Добавить</button>
    `;
    container.appendChild(inputSection);
    
    const ProgressAPI = window.ProgressAPI;
    
    const renderList = () => {
      listContainer.innerHTML = '';
      downloads.forEach(dl => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:var(--md-sys-color-surface-container);';
        
        const progressBar = document.createElement('div');
        progressBar.style.cssText = 'width:100%;height:4px;background:var(--md-sys-color-surface-container-high);border-radius:2px;overflow:hidden;margin-top:6px;';
        const progressFill = document.createElement('div');
        progressFill.style.cssText = `width:${dl.progress}%;height:100%;background:var(--md-sys-color-primary);transition:width 0.3s;`;
        progressBar.appendChild(progressFill);
        
        const statusSpan = document.createElement('span');
        statusSpan.style.cssText = 'font-size:12px;opacity:0.7;';
        statusSpan.textContent = dl.status === 'completed' ? 'Готово' : 
                                  dl.status === 'paused' ? 'На паузе' : 
                                  dl.status === 'downloading' ? `${Math.round(dl.progress)}%` : 'Ожидание';
        
        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:6px;';
        const pauseBtn = document.createElement('button');
        pauseBtn.className = 'taskbar-btn';
        pauseBtn.style.cssText = 'padding:6px 12px;font-size:12px;';
        pauseBtn.textContent = dl.status === 'downloading' ? 'pause' : 'play_arrow';
        pauseBtn.classList.add('material-icons');
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'taskbar-btn';
        cancelBtn.style.cssText = 'padding:6px 12px;font-size:12px;';
        cancelBtn.textContent = 'close';
        controls.append(pauseBtn, cancelBtn);
        
        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-icons">${dl.icon || 'insert_drive_file'}</span>
            <div style="flex:1;">
              <div style="font-weight:500;">${dl.filename || 'Файл'}</div>
              <div style="font-size:12px; opacity:0.7;">${dl.url}</div>
            </div>
          </div>
        `;
        const infoDiv = item.querySelector('div[style*="flex:1"]');
        infoDiv.appendChild(progressBar);
        infoDiv.appendChild(statusSpan);
        item.appendChild(controls);
        listContainer.appendChild(item);
        
        pauseBtn.onclick = () => {
          if (dl.status === 'downloading') {
            dl.status = 'paused';
            if (dl.progressId && ProgressAPI) ProgressAPI.remove(dl.progressId);
            dl.progressId = null;
          } else if (dl.status === 'paused') {
            dl.status = 'downloading';
            simulateDownload(dl);
          }
          saveDownloads();
          renderList();
        };
        
        cancelBtn.onclick = () => {
          if (dl.progressId && ProgressAPI) ProgressAPI.remove(dl.progressId);
          downloads = downloads.filter(d => d.id !== dl.id);
          saveDownloads();
          renderList();
        };
      });
    };
    
    const simulateDownload = (dl) => {
      if (dl.status === 'completed') return;
      dl.status = 'downloading';
      dl.progress = dl.progress || 0;
      
      if (window.ProgressAPI && !dl.progressId) {
        window.ProgressAPI.create(dl.id, {
          appId: 'downloads',
          appIcon: 'download',
          appName: 'Загрузки',
          icon: 'download',
          label: dl.filename || 'Файл',
          initialProgress: dl.progress
        });
        dl.progressId = dl.id;
      }
      
      const interval = setInterval(() => {
        if (dl.status !== 'downloading') { clearInterval(interval); return; }
        dl.progress += Math.random() * 10 + 5;
        if (dl.progress >= 100) {
          dl.progress = 100;
          dl.status = 'completed';
          clearInterval(interval);
          if (dl.progressId && ProgressAPI) ProgressAPI.remove(dl.progressId);
        }
        if (dl.progressId && ProgressAPI) ProgressAPI.update(dl.progressId, dl.progress);
        saveDownloads();
        renderList();
      }, 300);
      dl.interval = interval;
    };
    
    const addDownload = (url) => {
      if (!url) return;
      const filename = url.split('/').pop() || 'file';
      const id = generateId();
      const newDl = { id, url, filename, icon: 'description', created: Date.now(), progress: 0, status: 'pending' };
      downloads.push(newDl);
      saveDownloads();
      renderList();
      simulateDownload(newDl);
    };
    
    if (intent && intent.action === 'download' && intent.url) { 
      addDownload(intent.url); 
    }
    
    const urlInput = container.querySelector('#download-url-input');
    const addBtn = container.querySelector('#download-add-btn');
    addBtn.onclick = () => { addDownload(urlInput.value.trim()); urlInput.value = ''; };
    urlInput.addEventListener('keypress', (e) => { 
      if (e.key === 'Enter') { 
        addDownload(urlInput.value.trim()); 
        urlInput.value = ''; 
      } 
    });
    
    renderList();
    
    container.cleanup = () => { 
      downloads.forEach(dl => { 
        if (dl.interval) clearInterval(dl.interval); 
      }); 
    };
    
    return container;
  }
};
