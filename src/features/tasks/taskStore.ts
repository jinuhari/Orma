import { create } from 'zustand'

import type { LifeArea, Task } from '../../types/domain'
import { storageAdapter } from '../../services/storage'
import { defaultSettings } from '../settings/defaultSettings'

type TaskInput = {
  title: string
  area: LifeArea
  duration: number
  date: string | null
  time: string | null
  deadline: string | null
  private: boolean
}

type TaskFilter = 'all' | LifeArea

interface TaskState {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  filter: TaskFilter
  showCompleted: boolean
  load: () => Promise<void>
  setFilter: (filter: TaskFilter) => void
  setShowCompleted: (value: boolean) => void
  addTask: (input: TaskInput) => Promise<void>
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  removeTask: (id: string) => Promise<void>
  exportJson: () => Promise<string>
  importJson: (payload: string) => Promise<void>
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const byDate = (a.date ?? '').localeCompare(b.date ?? '')
    if (byDate !== 0) return byDate
    const byTime = (a.time ?? '').localeCompare(b.time ?? '')
    if (byTime !== 0) return byTime
    return a.title.localeCompare(b.title)
  })
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  filter: 'all',
  showCompleted: true,
  async load() {
    set({ isLoading: true, error: null })
    try {
      const snapshot = await storageAdapter.load()
      set({
        tasks: sortTasks(snapshot.tasks),
        showCompleted: snapshot.settings?.showCompleted ?? true,
        isLoading: false,
      })
    } catch {
      set({ isLoading: false, error: 'Could not load tasks from local storage.' })
    }
  },
  setFilter(filter) {
    set({ filter })
  },
  setShowCompleted(value) {
    set({ showCompleted: value })
    void (async () => {
      const snapshot = await storageAdapter.load()
      const mergedSettings = snapshot.settings
        ? { ...defaultSettings, ...snapshot.settings, showCompleted: value }
        : { ...defaultSettings, showCompleted: value }
      await storageAdapter.saveSettings({
        ...mergedSettings,
      })
    })()
  },
  async addTask(input) {
    const current = get().tasks
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      area: input.area,
      duration: input.duration,
      done: false,
      date: input.date,
      time: input.time,
      deadline: input.deadline,
      private: input.private,
      parent: null,
      mapRole: null,
      color: null,
      pos: null,
    }
    const next = sortTasks([...current, task])
    await storageAdapter.saveTasks(next)
    set({ tasks: next, error: null })
  },
  async updateTask(id, patch) {
    const next = get().tasks.map((task) => (task.id === id ? { ...task, ...patch } : task))
    await storageAdapter.saveTasks(next)
    set({ tasks: sortTasks(next), error: null })
  },
  async toggleDone(id) {
    const next = get().tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    await storageAdapter.saveTasks(next)
    set({ tasks: sortTasks(next), error: null })
  },
  async removeTask(id) {
    const next = get().tasks
      .filter((task) => task.id !== id)
      .map((task) => (task.parent === id ? { ...task, parent: null } : task))
    await storageAdapter.saveTasks(next)
    set({ tasks: sortTasks(next), error: null })
  },
  async exportJson() {
    return storageAdapter.exportJson()
  },
  async importJson(payload) {
    const snapshot = await storageAdapter.importJson(payload)
    await storageAdapter.saveTasks(snapshot.tasks)
    const mergedSettings = snapshot.settings
      ? { ...defaultSettings, ...snapshot.settings }
      : defaultSettings
    await storageAdapter.saveSettings(mergedSettings)
    set({ tasks: sortTasks(snapshot.tasks), error: null })
  },
}))
