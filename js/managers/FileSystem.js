/**
 * FileSystem - Класс для работы с локальным хранилищем приложений
 */

class FileSystem {
  constructor() {
    this.data = JSON.parse(localStorage.getItem('fs')) || { '/data': { 'apps': {} } };
  }
  
  save() {
    localStorage.setItem('fs', JSON.stringify(this.data));
  }
  
  getApps() {
    return this.data['/data']['apps'] || {};
  }
  
  addApp(id, code) {
    this.data['/data']['apps'][id] = code;
    this.save();
  }
  
  removeApp(id) {
    delete this.data['/data']['apps'][id];
    this.save();
  }
}

export { FileSystem };
