import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '../../components/brand/BrandLogo'
import { OrmaMark } from '../../components/brand/OrmaMark'
import { env } from '../../lib/env'
import { detectPlatform, type Platform } from '../../lib/platform'
import { canPromptInstall, promptInstall, subscribeInstallPrompt } from '../../lib/pwaInstall'

type Availability = 'checking' | 'ready' | 'missing'

// Hosting rewrites unknown paths to index.html, so an HTML response means the installer is not uploaded yet.
function useInstallerAvailability(url: string): Availability {
  const external = /^https?:/.test(url)
  const [state, setState] = useState<Availability>('checking')

  useEffect(() => {
    // External hosts (GitHub Releases) block cross-origin probes; trust the configured link.
    if (external) return
    let cancelled = false
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        const isHtml = (response.headers.get('content-type') ?? '').includes('text/html')
        if (!cancelled) setState(response.ok && !isHtml ? 'ready' : 'missing')
      })
      .catch(() => {
        if (!cancelled) setState('missing')
      })
    return () => {
      cancelled = true
    }
  }, [url, external])

  return external ? 'ready' : state
}

function DownloadButton({ url, label, primary = false }: { url: string; label: string; primary?: boolean }) {
  const availability = useInstallerAvailability(url)
  const className = `site-button${primary ? ' is-primary' : ''}`

  if (availability === 'missing') {
    return (
      <button type="button" className={className} disabled>
        {label} · coming soon
      </button>
    )
  }
  return (
    <a className={className} href={url} download>
      {label}
    </a>
  )
}

function InstallAppButton({ primary = false }: { primary?: boolean }) {
  const canPrompt = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall)
  const [hint, setHint] = useState(false)

  if (!canPrompt) {
    return (
      <>
        <button type="button" className={`site-button${primary ? ' is-primary' : ''}`} onClick={() => setHint(true)}>
          Install on Android
        </button>
        {hint ? (
          <p className="site-hint" role="status">
            Open this page in Chrome, tap the ⋮ menu, then choose Install app.
          </p>
        ) : null}
      </>
    )
  }
  return (
    <button type="button" className={`site-button${primary ? ' is-primary' : ''}`} onClick={() => void promptInstall()}>
      Install on Android
    </button>
  )
}

const ORDER: Record<Platform, string[]> = {
  mac: ['mac', 'windows', 'ios', 'android'],
  windows: ['windows', 'mac', 'ios', 'android'],
  ios: ['ios', 'android', 'mac', 'windows'],
  android: ['android', 'ios', 'mac', 'windows'],
  other: ['mac', 'windows', 'ios', 'android'],
}

export function LandingPage() {
  const platform = detectPlatform()
  const order = ORDER[platform]
  const primaryKey = order[0]

  const cards: Record<string, { name: string; tag: string; body: ReactNode }> = {
    mac: {
      name: 'macOS',
      tag: 'DESKTOP APP',
      body: (
        <>
          <p>Universal app for Apple Silicon and Intel Macs.</p>
          <DownloadButton url={env.downloadMacUrl} label="Download for Mac" primary={primaryKey === 'mac'} />
          <p className="site-fine">Open the .dmg, drag Orma to Applications. First launch: right-click → Open.</p>
        </>
      ),
    },
    windows: {
      name: 'Windows',
      tag: 'DESKTOP APP',
      body: (
        <>
          <p>Installer for Windows 10 and 11.</p>
          <DownloadButton url={env.downloadWindowsUrl} label="Download for Windows" primary={primaryKey === 'windows'} />
          <p className="site-fine">Run Orma-Setup.exe. If SmartScreen appears, choose More info → Run anyway.</p>
        </>
      ),
    },
    ios: {
      name: 'iPhone & iPad',
      tag: 'INSTALL FROM SAFARI',
      body: (
        <>
          <p>No App Store needed. Open this page in Safari, then:</p>
          <ol className="site-steps">
            <li>Tap the Share button</li>
            <li>Choose Add to Home Screen</li>
            <li>Tap Add</li>
          </ol>
        </>
      ),
    },
    android: {
      name: 'Android',
      tag: 'INSTALL FROM CHROME',
      body: (
        <>
          <p>Install Orma straight from your browser. It lands on your home screen like any app.</p>
          <InstallAppButton primary={primaryKey === 'android'} />
        </>
      ),
    },
  }

  return (
    <div className="site">
      <header className="site-nav">
        <BrandLogo />
        <Link className="site-button" to="/map">
          Open in browser
        </Link>
      </header>

      <section className="site-hero">
        <div className="site-hero-copy">
          <span className="entry-eyebrow">ORMA · LIFE PLANNING</span>
          <h1>
            Your life,
            <br />
            <em>on one map.</em>
          </h1>
          <p className="entry-lede">
            Career, money, health and family in a single calm space. Sign in with Google once and the same map
            opens on your Mac, Windows PC, iPhone, iPad and Android.
          </p>
          <div className="site-actions">
            {primaryKey === 'mac' ? <DownloadButton url={env.downloadMacUrl} label="Download for Mac" primary /> : null}
            {primaryKey === 'windows' ? (
              <DownloadButton url={env.downloadWindowsUrl} label="Download for Windows" primary />
            ) : null}
            {primaryKey === 'android' ? <InstallAppButton primary /> : null}
            {primaryKey === 'ios' ? (
              <a className="site-button is-primary" href="#devices">
                Install on iPhone
              </a>
            ) : null}
            <Link className="site-button" to="/map">
              Use on the web
            </Link>
          </div>
        </div>
        <OrmaMark className="site-map" />
      </section>

      <section className="site-devices" id="devices" aria-labelledby="devicesTitle">
        <div className="site-section-head">
          <span className="entry-eyebrow">EVERY DEVICE</span>
          <h2 id="devicesTitle">Pick up where you left off.</h2>
        </div>
        <div className="site-grid">
          {order.map((key) => (
            <article key={key} className={`site-card${key === primaryKey ? ' is-match' : ''}`}>
              <span className="site-card-tag">{cards[key].tag}</span>
              <h3>{cards[key].name}</h3>
              {cards[key].body}
            </article>
          ))}
        </div>
      </section>

      <section className="site-sync" aria-label="How sync works">
        <div>
          <strong>Sign in with Google</strong>
          <p>One tap, no passwords to remember.</p>
        </div>
        <div>
          <strong>Saved to your account</strong>
          <p>Tasks, map layout, finances and photo live with your Google account.</p>
        </div>
        <div>
          <strong>Same everywhere</strong>
          <p>Open Orma on any device with the same email and your map is already there.</p>
        </div>
      </section>

      <footer className="site-foot">
        <span>© ORMA</span>
        <span>YOUR LIFE IN VIEW</span>
      </footer>
    </div>
  )
}
