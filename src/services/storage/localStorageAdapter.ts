import { z } from 'zod'

import type { Task, UserSettings } from '../../types/domain'
import type { StorageAdapter, StorageSnapshot } from './types'

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(160),
  area: z.enum(['career', 'money', 'health', 'family']),
  duration: z.number().int().min(5).max(1020),
  done: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5][05]$/).nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  private: z.boolean(),
  parent: z.string().nullable(),
  mapRole: z.enum(['startup', 'launch', 'networking', 'resume', 'mental', 'fitness', 'main']).nullable(),
  color: z.string().nullable(),
  pos: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .nullable(),
})

const settingsSchema = z.object({
  showCompleted: z.boolean(),
  focusMinutes: z.number().int().min(5).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(5).max(90),
  autoStartBreak: z.boolean(),
  autoStartFocus: z.boolean(),
  tickSoundEnabled: z.boolean(),
  completionSoundEnabled: z.boolean(),
  enableWaterFx: z.boolean(),
})

const importSchema = z.object({
  version: z.number().int().min(1),
  tasks: z.array(taskSchema),
  settings: settingsSchema.optional(),
})

const TASKS_KEY = 'orma.tasks.v5'
const SETTINGS_KEY = 'orma.settings.v1'
const LEGACY_KEYS = ['orma.tasks.v4', 'orma.map.tasks.v3']

function normalizeLegacyTask(raw: Record<string, unknown>): Task | null {
  const area = raw.area
  if (area !== 'career' && area !== 'money' && area !== 'health' && area !== 'family') return null
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 160) : ''
  if (!title) return null
  const durationRaw = typeof raw.duration === 'number' ? raw.duration : 30
  const rounded = Math.round(durationRaw / 5) * 5
  const duration = Math.max(5, Math.min(1020, Number.isFinite(rounded) ? rounded : 30))
  const normalized: Task = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    title,
    area,
    duration,
    done: Boolean(raw.done),
    date: typeof raw.date === 'string' ? raw.date : null,
    time: typeof raw.time === 'string' ? raw.time : null,
    deadline: typeof raw.deadline === 'string' ? raw.deadline : null,
    private: Boolean(raw.private),
    parent: typeof raw.parent === 'string' ? raw.parent : null,
    mapRole:
      raw.mapRole === 'startup' ||
      raw.mapRole === 'launch' ||
      raw.mapRole === 'networking' ||
      raw.mapRole === 'resume' ||
      raw.mapRole === 'mental' ||
      raw.mapRole === 'fitness' ||
      raw.mapRole === 'main'
        ? raw.mapRole
        : null,
    color: typeof raw.color === 'string' ? raw.color : null,
    pos:
      raw.pos &&
      typeof raw.pos === 'object' &&
      typeof (raw.pos as { x?: unknown }).x === 'number' &&
      typeof (raw.pos as { y?: unknown }).y === 'number'
        ? { x: Math.round((raw.pos as { x: number }).x), y: Math.round((raw.pos as { y: number }).y) }
        : null,
  }
  const parsed = taskSchema.safeParse(normalized)
  return parsed.success ? (parsed.data as Task) : null
}

function parseLegacyTasks(raw: string | null): Task[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { tasks?: unknown }).tasks)
        ? (parsed as { tasks: unknown[] }).tasks
        : []
    return list
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => normalizeLegacyTask(item))
      .filter((item): item is Task => Boolean(item))
  } catch {
    return []
  }
}

function parseTasks(raw: string | null): Task[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { tasks?: unknown }
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : []
    return z.array(taskSchema).parse(tasks) as Task[]
  } catch {
    return []
  }
}

function parseSettings(raw: string | null): UserSettings | null {
  if (!raw) return null
  try {
    return settingsSchema.parse(JSON.parse(raw)) as UserSettings
  } catch {
    return null
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<StorageSnapshot> {
    const primary = parseTasks(localStorage.getItem(TASKS_KEY))
    const tasks = primary.length
      ? primary
      : LEGACY_KEYS.flatMap((key) => parseLegacyTasks(localStorage.getItem(key)))
    return {
      tasks,
      settings: parseSettings(localStorage.getItem(SETTINGS_KEY)),
    }
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 5, tasks }))
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }

  async exportJson(): Promise<string> {
    const snapshot = await this.load()
    return JSON.stringify({ version: 1, ...snapshot }, null, 2)
  }

  async importJson(payload: string): Promise<StorageSnapshot> {
    if (payload.length > 2_000_000) {
      throw new Error('Import rejected: payload too large.')
    }
    const parsed = importSchema.parse(JSON.parse(payload))
    return {
      tasks: parsed.tasks as Task[],
      settings: (parsed.settings ?? null) as UserSettings | null,
    }
  }
}
