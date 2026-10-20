import { useEffect } from 'react'

import { useSettingsStore } from './settingsStore'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function SettingsPage() {
  const { settings, isLoading, isSaved, error, load, update, reset } = useSettingsStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="settings-page-native" aria-labelledby="settingsNativeTitle">
      <header className="settings-header-native">
        <h1 id="settingsNativeTitle">Settings (Native Module)</h1>
        {isSaved ? <p className="ok">Saved</p> : null}
      </header>

      {isLoading ? <p>Loading settings...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="settings-grid-native">
        <article className="settings-card-native">
          <h2>Display</h2>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.showCompleted}
              onChange={(event) => void update('showCompleted', event.target.checked)}
            />
            Show completed tasks
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.enableWaterFx}
              onChange={(event) => void update('enableWaterFx', event.target.checked)}
            />
            Enable cinematic water effect
          </label>
        </article>

        <article className="settings-card-native">
          <h2>Pomodoro Defaults</h2>
          <label>
            Focus minutes
            <input
              type="number"
              min={5}
              max={180}
              value={settings.focusMinutes}
              onChange={(event) =>
                void update('focusMinutes', clamp(Number(event.target.value) || 25, 5, 180))
              }
            />
          </label>
          <label>
            Short break minutes
            <input
              type="number"
              min={1}
              max={60}
              value={settings.shortBreakMinutes}
              onChange={(event) =>
                void update('shortBreakMinutes', clamp(Number(event.target.value) || 5, 1, 60))
              }
            />
          </label>
          <label>
            Long break minutes
            <input
              type="number"
              min={5}
              max={90}
              value={settings.longBreakMinutes}
              onChange={(event) =>
                void update('longBreakMinutes', clamp(Number(event.target.value) || 15, 5, 90))
              }
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.autoStartBreak}
              onChange={(event) => void update('autoStartBreak', event.target.checked)}
            />
            Auto-start breaks
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.autoStartFocus}
              onChange={(event) => void update('autoStartFocus', event.target.checked)}
            />
            Auto-start focus after break
          </label>
        </article>

        <article className="settings-card-native">
          <h2>Audio</h2>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.tickSoundEnabled}
              onChange={(event) => void update('tickSoundEnabled', event.target.checked)}
            />
            Tick sound
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.completionSoundEnabled}
              onChange={(event) => void update('completionSoundEnabled', event.target.checked)}
            />
            Completion sound
          </label>
          <button type="button" onClick={() => void reset()}>
            Reset to defaults
          </button>
        </article>
      </div>
    </section>
  )
}
