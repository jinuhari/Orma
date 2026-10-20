import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFocusStore } from './focusStore'

describe('focus store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
    useFocusStore.setState({
      mode: 'focus',
      remainingSeconds: 1500,
      deadlineEpoch: null,
      sessions: 0,
      linkedTaskId: null,
      linkedTaskTitle: null,
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
      reducedMotion: false,
    })
  })

  it('starts and pauses timer', () => {
    useFocusStore.getState().start()
    expect(useFocusStore.getState().deadlineEpoch).toBeTruthy()
    useFocusStore.getState().pause()
    expect(useFocusStore.getState().deadlineEpoch).toBeNull()
  })

  it('completing focus transitions to short break with session increment', () => {
    useFocusStore.setState({ deadlineEpoch: Date.now() - 1000, mode: 'focus', sessions: 0 })
    useFocusStore.getState().tick()
    const state = useFocusStore.getState()
    expect(state.mode).toBe('short')
    expect(state.sessions).toBe(1)
    expect(state.deadlineEpoch).toBeNull()
  })

  it('task-linked completion clears task link and resets to focus mode', () => {
    useFocusStore.setState({
      deadlineEpoch: Date.now() - 1000,
      mode: 'focus',
      sessions: 2,
      linkedTaskId: 'task-1',
      linkedTaskTitle: 'Task 1',
    })
    useFocusStore.getState().tick()
    const state = useFocusStore.getState()
    expect(state.linkedTaskId).toBeNull()
    expect(state.linkedTaskTitle).toBeNull()
    expect(state.mode).toBe('focus')
    expect(state.sessions).toBe(3)
  })
})
