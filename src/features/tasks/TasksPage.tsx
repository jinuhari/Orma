import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import type { LifeArea } from '../../types/domain'
import { useTaskStore } from './taskStore'

const areaLabel: Record<LifeArea, string> = {
  career: 'Career',
  money: 'Money',
  health: 'Health',
  family: 'Family',
}

const areaColor: Record<LifeArea, string> = {
  career: '#70b7d5',
  money: '#d38aab',
  health: '#a0c27f',
  family: '#c6b598',
}

type Draft = {
  title: string
  area: LifeArea
  duration: number
  date: string
  time: string
  deadline: string
  private: boolean
}

const initialDraft: Draft = {
  title: '',
  area: 'career',
  duration: 30,
  date: '',
  time: '',
  deadline: '',
  private: false,
}

function formatWhen(date: string | null, time: string | null) {
  if (!date && !time) return 'Unplanned'
  return `${date ?? ''}${date && time ? ' / ' : ''}${time ?? ''}`
}

export function TasksPage() {
  const [draft, setDraft] = useState<Draft>(initialDraft)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const {
    tasks,
    isLoading,
    error,
    filter,
    showCompleted,
    load,
    setFilter,
    setShowCompleted,
    addTask,
    toggleDone,
    removeTask,
    exportJson,
    importJson,
  } = useTaskStore()

  useEffect(() => {
    void load()
  }, [load])

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!showCompleted && task.done) return false
      if (filter !== 'all' && task.area !== filter) return false
      return true
    })
  }, [filter, showCompleted, tasks])

  const counts = useMemo(() => {
    const open = tasks.filter((task) => !task.done).length
    const done = tasks.length - open
    return { open, done }
  }, [tasks])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) return
    await addTask({
      title: draft.title,
      area: draft.area,
      duration: Math.max(5, Math.min(1020, Math.round(draft.duration / 5) * 5)),
      date: draft.date || null,
      time: draft.time || null,
      deadline: draft.deadline || null,
      private: draft.private,
    })
    setDraft(initialDraft)
  }

  async function onExport() {
    const payload = await exportJson()
    await navigator.clipboard.writeText(payload)
  }

  async function onImport() {
    setImportError(null)
    try {
      await importJson(importText)
      setImportText('')
    } catch {
      setImportError('Invalid import payload. Check JSON format and schema.')
    }
  }

  return (
    <section className="tasks-page" aria-labelledby="tasksTitle">
      <header className="tasks-header">
        <div>
          <h1 id="tasksTitle">Tasks (Native Module)</h1>
          <p>
            {counts.open} open / {counts.done} completed
          </p>
        </div>
        <div className="tasks-actions">
          <button type="button" onClick={onExport}>
            Copy Export JSON
          </button>
        </div>
      </header>

      <form className="task-form" onSubmit={onSubmit}>
        <label>
          Title
          <input
            required
            maxLength={160}
            value={draft.title}
            onChange={(event) => setDraft((state) => ({ ...state, title: event.target.value }))}
          />
        </label>
        <label>
          Area
          <select
            value={draft.area}
            onChange={(event) => setDraft((state) => ({ ...state, area: event.target.value as LifeArea }))}
          >
            <option value="career">Career</option>
            <option value="money">Money</option>
            <option value="health">Health</option>
            <option value="family">Family</option>
          </select>
        </label>
        <label>
          Duration (min)
          <input
            type="number"
            min={5}
            max={1020}
            step={5}
            value={draft.duration}
            onChange={(event) => setDraft((state) => ({ ...state, duration: Number(event.target.value) || 30 }))}
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={draft.date}
            onChange={(event) => setDraft((state) => ({ ...state, date: event.target.value }))}
          />
        </label>
        <label>
          Time
          <input
            type="time"
            step={300}
            value={draft.time}
            onChange={(event) => setDraft((state) => ({ ...state, time: event.target.value }))}
          />
        </label>
        <label>
          Deadline
          <input
            type="date"
            value={draft.deadline}
            onChange={(event) => setDraft((state) => ({ ...state, deadline: event.target.value }))}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={draft.private}
            onChange={(event) => setDraft((state) => ({ ...state, private: event.target.checked }))}
          />
          Private task
        </label>
        <button type="submit">Add task</button>
      </form>

      <section className="task-filters" aria-label="Task filters">
        <div className="filter-group">
          {(['all', 'career', 'money', 'health', 'family'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {value === 'all' ? 'All' : areaLabel[value]}
            </button>
          ))}
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
          />
          Show completed
        </label>
      </section>

      {isLoading ? <p>Loading tasks...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="task-list-native" role="list">
        {visibleTasks.map((task) => (
          <article
            key={task.id}
            role="listitem"
            className={task.done ? 'done' : ''}
            style={{ borderColor: task.color ?? areaColor[task.area] }}
          >
            <header>
              <h2>{task.title}</h2>
              <span>{areaLabel[task.area]}</span>
            </header>
            <p>{task.duration} min</p>
            <p>{formatWhen(task.date, task.time)}</p>
            <p>{task.deadline ? `Deadline: ${task.deadline}` : 'No deadline'}</p>
            <p>{task.private ? 'Private' : 'Public'}</p>
            <div className="row-actions">
              <button type="button" onClick={() => void toggleDone(task.id)}>
                {task.done ? 'Reopen' : 'Complete'}
              </button>
              <button type="button" onClick={() => void removeTask(task.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
        {!visibleTasks.length && !isLoading ? <p>No tasks in this filter.</p> : null}
      </div>

      <section className="import-box" aria-label="JSON import">
        <h2>Import JSON</h2>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder="Paste exported JSON"
          rows={10}
        />
        <div className="row-actions">
          <button type="button" onClick={() => void onImport()}>
            Import
          </button>
        </div>
        {importError ? <p className="error">{importError}</p> : null}
      </section>
    </section>
  )
}
