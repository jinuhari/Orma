import { beforeEach, describe, expect, it } from 'vitest'

import { useSettingsStore } from './settingsStore'

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({
      settings: {
        showCompleted: true,
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        autoStartBreak: false,
        autoStartFocus: false,
        tickSoundEnabled: true,
        completionSoundEnabled: true,
        enableWaterFx: true,
      },
      isLoading: false,
      error: null,
      isSaved: false,
    })
  })

  it('loads defaults when local settings are absent', async () => {
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().settings.focusMinutes).toBe(25)
  })

  it('updates and persists one field', async () => {
    await useSettingsStore.getState().update('focusMinutes', 40)
    const raw = localStorage.getItem('orma.settings.v1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string).focusMinutes).toBe(40)
  })
})
