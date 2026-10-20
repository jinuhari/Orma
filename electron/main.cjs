const { app, BrowserWindow, ipcMain, net, protocol, shell } = require('electron')
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')

const APP_SCHEME = 'app'
const AUTH_SCHEME = 'orma'
const DIST_DIR = path.join(__dirname, '..', 'dist')
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// The built site is served from a real origin so routing, storage and the legacy map page work offline.
protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

let mainWindow = null

function openExternalSafe(rawUrl) {
  try {
    const url = new URL(rawUrl)
    const isLocalDev = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
    if (url.protocol === 'https:' || isLocalDev) return shell.openExternal(url.toString())
  } catch {
    // ignore malformed URLs
  }
  return undefined
}

// Receives orma://auth?state=…&idToken=… from the browser after Google sign-in.
function handleAuthUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    return
  }
  if (url.protocol !== `${AUTH_SCHEME}:` || url.hostname !== 'auth') return

  const state = url.searchParams.get('state')
  const idToken = url.searchParams.get('idToken')
  if (!state || !idToken || !mainWindow) return

  mainWindow.webContents.send('orma:auth-callback', {
    state,
    idToken,
    accessToken: url.searchParams.get('accessToken'),
  })
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, (request) => {
    const { pathname } = new URL(request.url)
    let filePath = path.normalize(path.join(DIST_DIR, decodeURIComponent(pathname)))

    if (path.relative(DIST_DIR, filePath).startsWith('..')) {
      return new Response('Forbidden', { status: 403 })
    }

    const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    if (!exists) {
      // Unknown paths with an extension are missing assets; everything else is a client-side route.
      if (path.extname(pathname)) return new Response('Not found', { status: 404 })
      filePath = path.join(DIST_DIR, 'index.html')
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const appOrigin = DEV_SERVER_URL ? new URL(DEV_SERVER_URL).origin : `${APP_SCHEME}://orma`

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafe(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appOrigin) {
      event.preventDefault()
      void openExternalSafe(url)
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  void mainWindow.loadURL(DEV_SERVER_URL || `${APP_SCHEME}://orma/`)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const authUrl = argv.find((arg) => arg.startsWith(`${AUTH_SCHEME}://`))
    if (authUrl) handleAuthUrl(authUrl)
    else if (mainWindow) mainWindow.focus()
  })

  // macOS delivers custom-scheme links through this event.
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleAuthUrl(url)
  })

  app.whenReady().then(() => {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(AUTH_SCHEME, process.execPath, [path.resolve(process.argv[1])])
      }
    } else {
      app.setAsDefaultProtocolClient(AUTH_SCHEME)
    }

    ipcMain.handle('orma:open-external', (_event, url) => openExternalSafe(String(url)))
    registerAppProtocol()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
