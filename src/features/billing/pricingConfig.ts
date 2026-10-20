export interface PlanConfig {
  code: string
  label: string
  cadence: 'monthly' | 'yearly'
  amountInr: number
  features: string[]
  isDefault?: boolean
}

export const FREE_PLAN_CODE = 'free'
export const PRO_PLAN_CODES = ['pro_monthly', 'pro_yearly'] as const

export const freePlan: PlanConfig = {
  code: FREE_PLAN_CODE,
  label: 'Free',
  cadence: 'monthly',
  amountInr: 0,
  isDefault: true,
  features: [
    'Core life map',
    'Task creation and organization',
    'Daily planning and calendar',
    'Basic pomodoro timer',
    'Basic settings',
    'JSON export and import',
  ],
}

export const proPlans: PlanConfig[] = [
  {
    code: 'pro_monthly',
    label: 'Orma Pro Monthly',
    cadence: 'monthly',
    amountInr: 349,
    features: [
      'Cloud sync across devices',
      'Advanced map customization',
      'Weekly/monthly reviews',
      'Advanced focus analytics',
      'AI-assisted planning (when enabled)',
    ],
  },
  {
    code: 'pro_yearly',
    label: 'Orma Pro Yearly',
    cadence: 'yearly',
    amountInr: 2699,
    features: [
      'Everything in monthly',
      'Annual discount',
      'Priority feature access',
    ],
  },
]
