import { beforeEach, describe, expect, it } from 'vitest'

import { useTaskStore } from './taskStore'

describe('task store', () => {
  beforeEach(() => {
    localStorage.clear()
    useTaskStore.setState({
      tasks: [],
      isLoading: false,
      error: null,
      filter: 'all',
      showCompleted: true,
    })
  })

  it('adds a task and updates it', async () => {
    await useTaskStore.getState().addTask({
      title: 'Plan week',
      area: 'career',
      duration: 30,
      date: null,
      time: null,
      deadline: null,
      private: false,
    })

    const created = useTaskStore.getState().tasks[0]
    await useTaskStore.getState().updateTask(created.id, { date: '2026-10-20', time: '09:00' })

    const updated = useTaskStore.getState().tasks.find((task) => task.id === created.id)
    expect(updated?.date).toBe('2026-10-20')
    expect(updated?.time).toBe('09:00')
  })
})
