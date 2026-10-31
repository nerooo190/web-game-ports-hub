const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('node:path');

ipcMain.handle('open-external', (_e, url) => {
  if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: '#0f1220', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'web', 'index.html'));
  // Game links that try to open a new window go to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
}

app.whenReady().then(() => {
  // Let third-party game pages load inside the app's <iframe>: drop only the headers that forbid framing.
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    if (details.resourceType !== 'subFrame') return cb({});
    const h = { ...details.responseHeaders };
    for (const k of Object.keys(h)) {
      const lk = k.toLowerCase();
      if (lk === 'x-frame-options') delete h[k];
      else if (lk === 'content-security-policy') h[k] = h[k].map((v) => v.replace(/frame-ancestors[^;]*;?/gi, ''));
    }
    cb({ responseHeaders: h });
  });
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
