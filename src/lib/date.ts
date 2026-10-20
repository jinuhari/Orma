export function toDateKey(date: Date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function todayKey() {
  return toDateKey(new Date())
}

export function fromDateKey(key: string) {
  return new Date(`${key}T12:00:00`)
}

export function prettyDate(key: string) {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function prettyTime(time: string | null) {
  if (!time) return 'Unplanned'
  const [hours, minutes] = time.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function addDays(key: string, offset: number) {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + offset)
  return toDateKey(date)
}
