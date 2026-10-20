import { create } from 'zustand'

import { storageAdapter } from '../../services/storage'
import type { Task, UserSettings } from '../../types/domain'
import { defaultSettings } from '../settings/defaultSettings'

type TimerMode = 'focus' | 'short' | 'long'

interface PersistedFocusState {
  mode: TimerMode
  remainingSeconds: number
  deadlineEpoch: number | null
  sessions: number
  linkedTaskId: string | null
  linkedTaskTitle: string | null
}

interface FocusState extends PersistedFocusState {
  settings: UserSettings
  isLoading: boolean
  error: string | null
  reducedMotion: boolean
  load: () => Promise<void>
  tick: () => void
  start: () => void
  pause: () => void
  reset: () => void
  setMode: (mode: TimerMode) => void
  adjust: (deltaSeconds: number) => void
  linkTask: (task: Task) => void
  clearTaskLink: () => void
}

const FOCUS_STATE_KEY = 'orma.focus.state.v1'

function modeSeconds(settings: UserSettings, mode: TimerMode) {
  if (mode === 'focus') return settings.focusMinutes * 60
  if (mode === 'short') return settings.shortBreakMinutes * 60
  return settings.longBreakMinutes * 60
}

function clampSeconds(value: number) {
  return Math.max(5, Math.min(4 * 60 * 60, Math.round(value)))
}

function todayKey() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function computeTaskRemainingSeconds(task: Task) {
  if (!task.time || !task.date || task.date !== todayKey()) {
    return task.duration * 60
  }
  const [hours, minutes] = task.time.split(':').map(Number)
  const start = hours * 60 + minutes
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const end = start + task.duration
  if (nowMinutes <= start) return task.duration * 60
  if (nowMinutes >= end) return task.duration * 60
  return Math.max(5 * 60, Math.ceil((end - nowMinutes) / 5) * 5 * 60)
}

function savePersistedState(state: PersistedFocusState) {
  localStorage.setItem(FOCUS_STATE_KEY, JSON.stringify(state))
}

function readPersistedState(): PersistedFocusState | null {
  try {
    const raw = localStorage.getItem(FOCUS_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedFocusState
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.mode !== 'focus' && parsed.mode !== 'short' && parsed.mode !== 'long') return null
    return {
      mode: parsed.mode,
      remainingSeconds: clampSeconds(parsed.remainingSeconds),
      deadlineEpoch:
        typeof parsed.deadlineEpoch === 'number' && Number.isFinite(parsed.deadlineEpoch)
          ? parsed.deadlineEpoch
          : null,
      sessions: Number.isInteger(parsed.sessions) ? Math.max(0, parsed.sessions) : 0,
      linkedTaskId: typeof parsed.linkedTaskId === 'string' ? parsed.linkedTaskId : null,
      linkedTaskTitle: typeof parsed.linkedTaskTitle === 'string' ? parsed.linkedTaskTitle : null,
    }
  } catch {
    return null
  }
}

function withSaved(state: FocusState, next: Partial<PersistedFocusState>): Partial<FocusState> {
  const merged: PersistedFocusState = {
    mode: next.mode ?? state.mode,
    remainingSeconds: next.remainingSeconds ?? state.remainingSeconds,
    deadlineEpoch: Object.hasOwn(next, 'deadlineEpoch') ? (next.deadlineEpoch ?? null) : state.deadlineEpoch,
    sessions: next.sessions ?? state.sessions,
    linkedTaskId: Object.hasOwn(next, 'linkedTaskId') ? (next.linkedTaskId ?? null) : state.linkedTaskId,
    linkedTaskTitle: Object.hasOwn(next, 'linkedTaskTitle')
      ? (next.linkedTaskTitle ?? null)
      : state.linkedTaskTitle,
  }
  savePersistedState(merged)
  return merged
}

export const useFocusStore = create<FocusState>((set, get) => ({
  mode: 'focus',
  remainingSeconds: defaultSettings.focusMinutes * 60,
  deadlineEpoch: null,
  sessions: 0,
  linkedTaskId: null,
  linkedTaskTitle: null,
  settings: defaultSettings,
  isLoading: false,
  error: null,
  reducedMotion: false,
  async load() {
    set({ isLoading: true, error: null })
    try {
      const snapshot = await storageAdapter.load()
      const settings = snapshot.settings ? { ...defaultSettings, ...snapshot.settings } : defaultSettings
      const persisted = readPersistedState()
      const now = Date.now()
      const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      const remainingFromDeadline =
        persisted?.deadlineEpoch != null ? Math.max(0, Math.ceil((persisted.deadlineEpoch - now) / 1000)) : null

      const mode = persisted?.mode ?? 'focus'
      const remainingSeconds = remainingFromDeadline != null
        ? clampSeconds(remainingFromDeadline || modeSeconds(settings, mode))
        : clampSeconds(persisted?.remainingSeconds ?? modeSeconds(settings, mode))

      const deadlineEpoch = remainingFromDeadline != null && remainingFromDeadline > 0
        ? persisted?.deadlineEpoch ?? null
        : null

      set({
        mode,
        remainingSeconds,
        deadlineEpoch,
        sessions: persisted?.sessions ?? 0,
        linkedTaskId: persisted?.linkedTaskId ?? null,
        linkedTaskTitle: persisted?.linkedTaskTitle ?? null,
        settings,
        reducedMotion,
        isLoading: false,
      })

      const state = get()
      savePersistedState({
        mode: state.mode,
        remainingSeconds: state.remainingSeconds,
        deadlineEpoch: state.deadlineEpoch,
        sessions: state.sessions,
        linkedTaskId: state.linkedTaskId,
        linkedTaskTitle: state.linkedTaskTitle,
      })
    } catch {
      set({ isLoading: false, error: 'Could not load focus timer state.' })
    }
  },
  tick() {
    const state = get()
    if (!state.deadlineEpoch) return
    const remaining = Math.max(0, Math.ceil((state.deadlineEpoch - Date.now()) / 1000))
    if (remaining > 0) {
      set(withSaved(state, { remainingSeconds: remaining }))
      return
    }

    if (state.linkedTaskId) {
      const next = withSaved(state, {
        mode: 'focus',
        remainingSeconds: modeSeconds(state.settings, 'focus'),
        deadlineEpoch: null,
        sessions: state.sessions + 1,
        linkedTaskId: null,
        linkedTaskTitle: null,
      })
      set(next)
      return
    }

    if (state.mode === 'focus') {
      const sessions = state.sessions + 1
      const nextMode: TimerMode = sessions % 4 === 0 ? 'long' : 'short'
      const nextRemaining = modeSeconds(state.settings, nextMode)
      const autoStart = state.settings.autoStartBreak
      const next = withSaved(state, {
        mode: nextMode,
        sessions,
        remainingSeconds: nextRemaining,
        deadlineEpoch: autoStart ? Date.now() + nextRemaining * 1000 : null,
      })
      set(next)
      return
    }

    const nextRemaining = modeSeconds(state.settings, 'focus')
    const autoStart = state.settings.autoStartFocus
    const next = withSaved(state, {
      mode: 'focus',
      remainingSeconds: nextRemaining,
      deadlineEpoch: autoStart ? Date.now() + nextRemaining * 1000 : null,
    })
    set(next)
  },
  start() {
    const state = get()
    if (state.deadlineEpoch) return
    set(withSaved(state, { deadlineEpoch: Date.now() + state.remainingSeconds * 1000 }))
  },
  pause() {
    const state = get()
    if (!state.deadlineEpoch) return
    const remaining = Math.max(0, Math.ceil((state.deadlineEpoch - Date.now()) / 1000))
    set(withSaved(state, { remainingSeconds: clampSeconds(remaining), deadlineEpoch: null }))
  },
  reset() {
    const state = get()
    const remainingSeconds = modeSeconds(state.settings, state.mode)
    set(withSaved(state, { remainingSeconds, deadlineEpoch: null, linkedTaskId: null, linkedTaskTitle: null }))
  },
  setMode(mode) {
    const state = get()
    const remainingSeconds = modeSeconds(state.settings, mode)
    set(
      withSaved(state, {
        mode,
        remainingSeconds,
        deadlineEpoch: null,
        linkedTaskId: null,
        linkedTaskTitle: null,
      }),
    )
  },
  adjust(deltaSeconds) {
    const state = get()
    const remainingSeconds = clampSeconds(state.remainingSeconds + deltaSeconds)
    const deadlineEpoch = state.deadlineEpoch ? Date.now() + remainingSeconds * 1000 : null
    set(withSaved(state, { remainingSeconds, deadlineEpoch }))
  },
  linkTask(task) {
    const state = get()
    const remainingSeconds = clampSeconds(computeTaskRemainingSeconds(task))
    set(
      withSaved(state, {
        mode: 'focus',
        remainingSeconds,
        deadlineEpoch: Date.now() + remainingSeconds * 1000,
        linkedTaskId: task.id,
        linkedTaskTitle: task.title,
      }),
    )
  },
  clearTaskLink() {
    const state = get()
    set(withSaved(state, { linkedTaskId: null, linkedTaskTitle: null }))
  },
}))
