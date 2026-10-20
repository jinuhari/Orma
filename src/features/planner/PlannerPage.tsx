import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { addDays, prettyDate, prettyTime, todayKey } from '../../lib/date'
import { useFocusStore } from '../focus/focusStore'
import { useTaskStore } from '../tasks/taskStore'

export function PlannerPage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const { tasks, isLoading, error, load, updateTask, toggleDone, removeTask, showCompleted } = useTaskStore()
  const { linkTask } = useFocusStore()

  useEffect(() => {
    void load()
  }, [load])

  const scheduled = useMemo(() => {
    return tasks
      .filter((task) => task.date === selectedDate && (showCompleted || !task.done))
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  }, [selectedDate, showCompleted, tasks])

  const unscheduled = useMemo(
    () => tasks.filter((task) => !task.done && !task.date).slice(0, 12),
    [tasks],
  )

  return (
    <section className="planner-page-native" aria-labelledby="plannerTitle">
      <header className="planner-header-native">
        <div>
          <h1 id="plannerTitle">My Day (Native Module)</h1>
          <p>{prettyDate(selectedDate)}</p>
        </div>
        <div className="planner-date-controls">
          <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
            Previous
          </button>
          <button type="button" onClick={() => setSelectedDate(todayKey())}>
            Today
          </button>
          <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            Next
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value || todayKey())}
            aria-label="Select planner date"
          />
        </div>
      </header>

      <div className="planner-grid-native">
        <article className="planner-card-native">
          <h2>Scheduled</h2>
          {scheduled.map((task) => (
            <div key={task.id} className={task.done ? 'planner-task done' : 'planner-task'}>
              <div className="planner-task-main">
                <h3>{task.title}</h3>
                <p>
                  {prettyTime(task.time)} · {task.duration}m
                </p>
              </div>
              <div className="planner-task-actions">
                <input
                  type="time"
                  step={300}
                  value={task.time ?? '09:00'}
                  onChange={(event) => void updateTask(task.id, { time: event.target.value || null })}
                  aria-label={`Change time for ${task.title}`}
                />
                <input
                  type="number"
                  min={5}
                  max={1020}
                  step={5}
                  value={task.duration}
                  onChange={(event) =>
                    void updateTask(task.id, {
                      duration: Math.max(5, Math.min(1020, Math.round((Number(event.target.value) || 30) / 5) * 5)),
                    })
                  }
                  aria-label={`Change duration for ${task.title}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    linkTask(task)
                    navigate('/focus')
                  }}
                >
                  Focus
                </button>
                <button type="button" onClick={() => void toggleDone(task.id)}>
                  {task.done ? 'Reopen' : 'Complete'}
                </button>
                <button type="button" onClick={() => void removeTask(task.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!scheduled.length ? <p>No tasks scheduled for this day.</p> : null}
        </article>

        <article className="planner-card-native">
          <h2>Quick Schedule</h2>
          {unscheduled.map((task) => (
            <div key={task.id} className="planner-task">
              <div className="planner-task-main">
                <h3>{task.title}</h3>
                <p>{task.duration}m · {task.area}</p>
              </div>
              <div className="planner-task-actions">
                <button
                  type="button"
                  onClick={() =>
                    void updateTask(task.id, {
                      date: selectedDate,
                      time: task.time ?? '09:00',
                    })
                  }
                >
                  Add to day
                </button>
              </div>
            </div>
          ))}
          {!unscheduled.length ? <p>All open tasks already have a date.</p> : null}
        </article>
      </div>

      {isLoading ? <p>Loading planner...</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
