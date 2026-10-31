const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('native', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
