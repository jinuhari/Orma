export type LifeArea = 'career' | 'money' | 'health' | 'family'

export interface TaskPosition {
  x: number
  y: number
}

export interface Task {
  id: string
  userId?: string
  title: string
  area: LifeArea
  duration: number
  done: boolean
  date: string | null
  time: string | null
  deadline: string | null
  private: boolean
  parent: string | null
  mapRole: 'startup' | 'launch' | 'networking' | 'resume' | 'mental' | 'fitness' | 'main' | null
  color: string | null
  pos: TaskPosition | null
  createdAt?: string
  updatedAt?: string
}

export interface UserSettings {
  showCompleted: boolean
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  autoStartBreak: boolean
  autoStartFocus: boolean
  tickSoundEnabled: boolean
  completionSoundEnabled: boolean
  enableWaterFx: boolean
}

export interface FocusSession {
  id: string
  userId?: string
  taskId: string | null
  mode: 'focus' | 'short' | 'long'
  startedAt: string
  endedAt: string | null
  durationSeconds: number
}

export interface Subscription {
  userId: string
  provider: 'stripe' | 'razorpay'
  planCode: string
  status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  currentPeriodEnd: string | null
}
