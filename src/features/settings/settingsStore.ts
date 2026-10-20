import { create } from 'zustand'

import { storageAdapter } from '../../services/storage'
import type { UserSettings } from '../../types/domain'
import { defaultSettings } from './defaultSettings'

interface SettingsState {
  settings: UserSettings
  isLoading: boolean
  error: string | null
  isSaved: boolean
  load: () => Promise<void>
  saveAll: (next: UserSettings) => Promise<void>
  update: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>
  reset: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  error: null,
  isSaved: false,
  async load() {
    set({ isLoading: true, error: null, isSaved: false })
    try {
      const snapshot = await storageAdapter.load()
      const mergedSettings = snapshot.settings
        ? { ...defaultSettings, ...snapshot.settings }
        : defaultSettings
      set({
        settings: mergedSettings,
        isLoading: false,
      })
    } catch {
      set({ isLoading: false, error: 'Could not load settings from local storage.' })
    }
  },
  async saveAll(next) {
    try {
      await storageAdapter.saveSettings(next)
      set({ settings: next, error: null, isSaved: true })
      setTimeout(() => {
        if (get().isSaved) set({ isSaved: false })
      }, 1200)
    } catch {
      set({ error: 'Could not save settings to local storage.' })
    }
  },
  async update(key, value) {
    const next = { ...get().settings, [key]: value }
    await get().saveAll(next)
  },
  async reset() {
    await get().saveAll(defaultSettings)
  },
}))
