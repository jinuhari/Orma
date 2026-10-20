import type { UserSettings } from '../../types/domain'

export const defaultSettings: UserSettings = {
  showCompleted: true,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreak: false,
  autoStartFocus: false,
  tickSoundEnabled: true,
  completionSoundEnabled: true,
  enableWaterFx: true,
}
