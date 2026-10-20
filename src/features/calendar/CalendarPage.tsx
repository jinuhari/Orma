import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fromDateKey, prettyTime, toDateKey, todayKey } from '../../lib/date'
import { useFocusStore } from '../focus/focusStore'
import { useTaskStore } from '../tasks/taskStore'

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function gridStart(date: Date) {
  const first = monthStart(date)
  const weekday = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - weekday)
  return start
}

export function CalendarPage() {
  const navigate = useNavigate()
  const [activeMonth, setActiveMonth] = useState(monthStart(new Date()))
  const [selectedDate, setSelectedDate] = useState(todayKey())

  const { tasks, isLoading, error, load, toggleDone } = useTaskStore()
  const { linkTask } = useFocusStore()

  useEffect(() => {
    void load()
  }, [load])

  const days = useMemo(() => {
    const start = gridStart(activeMonth)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const key = toDateKey(date)
      return {
        key,
        date,
        inMonth: date.getMonth() === activeMonth.getMonth(),
      }
    })
  }, [activeMonth])

  const agenda = useMemo(
    () =>
      tasks
        .filter((task) => task.date === selectedDate)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [selectedDate, tasks],
  )

  return (
    <section className="calendar-page-native" aria-labelledby="calendarTitle">
      <header className="calendar-header-native">
        <h1 id="calendarTitle">Calendar (Native Module)</h1>
        <div className="calendar-controls-native">
          <button
            type="button"
            onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1))}
          >
            Prev
          </button>
          <button type="button" onClick={() => setActiveMonth(monthStart(new Date()))}>
            Today
          </button>
          <button
            type="button"
            onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1))}
          >
            Next
          </button>
          <span>{monthLabel(activeMonth)}</span>
        </div>
      </header>

      <div className="calendar-grid-native" role="grid" aria-label="Month view">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <strong key={day} className="weekday-native">
            {day}
          </strong>
        ))}
        {days.map((day) => {
          const count = tasks.filter((task) => task.date === day.key).length
          return (
            <button
              type="button"
              key={day.key}
              className={[
                'calendar-cell-native',
                day.inMonth ? '' : 'outside',
                day.key === selectedDate ? 'selected' : '',
                day.key === todayKey() ? 'today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedDate(day.key)}
            >
              <span>{day.date.getDate()}</span>
              <small>{count ? `${count} task${count === 1 ? '' : 's'}` : ''}</small>
            </button>
          )
        })}
      </div>

      <article className="calendar-agenda-native">
        <h2>{fromDateKey(selectedDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h2>
        {agenda.map((task) => (
          <div key={task.id} className={task.done ? 'agenda-task-native done' : 'agenda-task-native'}>
            <div>
              <h3>{task.title}</h3>
              <p>
                {prettyTime(task.time)} · {task.duration}m
              </p>
            </div>
            <div className="row-actions">
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
            </div>
          </div>
        ))}
        {!agenda.length ? <p>No tasks on this date.</p> : null}
      </article>

      {isLoading ? <p>Loading calendar...</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
