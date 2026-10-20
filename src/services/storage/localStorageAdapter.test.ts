import { beforeEach, describe, expect, it } from 'vitest'

import { LocalStorageAdapter } from './localStorageAdapter'

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads v5 tasks when available', async () => {
    const adapter = new LocalStorageAdapter()
    localStorage.setItem(
      'orma.tasks.v5',
      JSON.stringify({
        version: 5,
        tasks: [
          {
            id: '1',
            title: 'Task A',
            area: 'career',
            duration: 30,
            done: false,
            date: null,
            time: null,
            deadline: null,
            private: false,
            parent: null,
            mapRole: null,
            color: null,
            pos: null,
          },
        ],
      }),
    )

    const snapshot = await adapter.load()
    expect(snapshot.tasks).toHaveLength(1)
    expect(snapshot.tasks[0].title).toBe('Task A')
  })

  it('falls back to legacy keys when v5 is unavailable', async () => {
    const adapter = new LocalStorageAdapter()
    localStorage.removeItem('orma.tasks.v5')
    localStorage.setItem(
      'orma.tasks.v4',
      JSON.stringify({
        tasks: [
          {
            id: 'legacy-1',
            title: 'Legacy Task',
            area: 'health',
            duration: 35,
            done: false,
            date: null,
            time: null,
            deadline: null,
            private: false,
            parent: null,
            mapRole: null,
            color: null,
            pos: null,
          },
        ],
      }),
    )

    const snapshot = await adapter.load()
    expect(snapshot.tasks).toHaveLength(1)
    expect(snapshot.tasks[0].id).toBe('legacy-1')
    expect(snapshot.tasks[0].duration).toBe(35)
  })
})
