const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ormaDesktop', {
  isDesktop: true,
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('orma:open-external', url),
  onAuthCallback: (handler) => {
    const listener = (_event, payload) => handler(payload)
    ipcRenderer.on('orma:auth-callback', listener)
    return () => ipcRenderer.removeListener('orma:auth-callback', listener)
  },
})
