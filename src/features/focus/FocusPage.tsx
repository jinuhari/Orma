import { useEffect, useMemo, useState } from 'react'

import { useTaskStore } from '../tasks/taskStore'
import { useFocusStore } from './focusStore'

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function FocusPage() {
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const {
    mode,
    remainingSeconds,
    deadlineEpoch,
    sessions,
    linkedTaskId,
    linkedTaskTitle,
    settings,
    reducedMotion,
    isLoading,
    error,
    load,
    tick,
    start,
    pause,
    reset,
    setMode,
    adjust,
    linkTask,
    clearTaskLink,
  } = useFocusStore()

  const { tasks, load: loadTasks } = useTaskStore()

  useEffect(() => {
    void load()
    void loadTasks()
  }, [load, loadTasks])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      tick()
    }, 250)
    const onVisibility = () => tick()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tick])

  const running = Boolean(deadlineEpoch)
  const availableTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks])
  const modeLabel = mode === 'focus' ? 'Focus' : mode === 'short' ? 'Short break' : 'Long break'

  return (
    <section className="focus-page-native" aria-labelledby="focusNativeTitle">
      <header className="focus-header-native">
        <div>
          <h1 id="focusNativeTitle">Focus (Native Module)</h1>
          <p>{sessions} focus sessions completed</p>
        </div>
        <div className="focus-mode-buttons" role="tablist" aria-label="Timer mode">
          <button
            type="button"
            className={mode === 'focus' ? 'active' : ''}
            onClick={() => setMode('focus')}
          >
            Focus
          </button>
          <button
            type="button"
            className={mode === 'short' ? 'active' : ''}
            onClick={() => setMode('short')}
          >
            Short
          </button>
          <button
            type="button"
            className={mode === 'long' ? 'active' : ''}
            onClick={() => setMode('long')}
          >
            Long
          </button>
        </div>
      </header>

      <div className="focus-timer-card">
        <p className="focus-status-label">{linkedTaskTitle ? `Task focus: ${linkedTaskTitle}` : modeLabel}</p>
        <div className="focus-time-display" role="timer" aria-label="Time remaining">
          {formatSeconds(remainingSeconds)}
        </div>
        <div className="focus-actions-row">
          {!running ? (
            <button type="button" onClick={() => start()}>
              Start
            </button>
          ) : (
            <button type="button" onClick={() => pause()}>
              Pause
            </button>
          )}
          <button type="button" onClick={() => reset()}>
            Reset
          </button>
          <button type="button" onClick={() => adjust(-60)}>
            -1m
          </button>
          <button type="button" onClick={() => adjust(60)}>
            +1m
          </button>
        </div>
        <p className="focus-subtext">
          {running ? 'Timer running' : 'Timer paused'}
          {linkedTaskId ? ' · linked to task' : ''}
        </p>
      </div>

      <article className="focus-card-native">
        <h2>Start from task</h2>
        <div className="focus-task-row">
          <select
            value={selectedTaskId}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            aria-label="Select task to start focus"
          >
            <option value="">Select task</option>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedTaskId}
            onClick={() => {
              const selected = availableTasks.find((task) => task.id === selectedTaskId)
              if (selected) linkTask(selected)
            }}
          >
            Start task focus
          </button>
          <button type="button" onClick={() => clearTaskLink()}>
            Clear link
          </button>
        </div>
      </article>

      <article className="focus-card-native">
        <h2>Timer behavior</h2>
        <ul>
          <li>Focus: {settings.focusMinutes}m</li>
          <li>Short break: {settings.shortBreakMinutes}m</li>
          <li>Long break: {settings.longBreakMinutes}m</li>
          <li>Auto-start breaks: {settings.autoStartBreak ? 'On' : 'Off'}</li>
          <li>Auto-start focus: {settings.autoStartFocus ? 'On' : 'Off'}</li>
          <li>Tick sound: {settings.tickSoundEnabled ? 'On' : 'Off'}</li>
          <li>Completion sound: {settings.completionSoundEnabled ? 'On' : 'Off'}</li>
        </ul>
        <p className="focus-subtext">
          Water effect: {settings.enableWaterFx ? 'Enabled in settings' : 'Disabled in settings'} · Motion:{' '}
          {reducedMotion ? 'reduced by system preference' : 'normal'}
        </p>
      </article>

      {isLoading ? <p>Loading focus timer...</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
