import type { Task, UserSettings } from '../../types/domain'

export interface StorageSnapshot {
  tasks: Task[]
  settings: UserSettings | null
}

export interface StorageAdapter {
  load(): Promise<StorageSnapshot>
  saveTasks(tasks: Task[]): Promise<void>
  saveSettings(settings: UserSettings): Promise<void>
  exportJson(): Promise<string>
  importJson(payload: string): Promise<StorageSnapshot>
}
