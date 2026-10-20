import { FREE_PLAN_CODE, PRO_PLAN_CODES } from '../../features/billing/pricingConfig'

export interface Entitlements {
  cloudSync: boolean
  advancedMapLayouts: boolean
  historicalReviews: boolean
  advancedFocusAnalytics: boolean
  additionalThemes: boolean
  aiPlanning: boolean
}

const freeEntitlements: Entitlements = {
  cloudSync: false,
  advancedMapLayouts: false,
  historicalReviews: false,
  advancedFocusAnalytics: false,
  additionalThemes: false,
  aiPlanning: false,
}

const proEntitlements: Entitlements = {
  cloudSync: true,
  advancedMapLayouts: true,
  historicalReviews: true,
  advancedFocusAnalytics: true,
  additionalThemes: true,
  aiPlanning: true,
}

export function deriveEntitlements(planCode: string | null | undefined): Entitlements {
  if (!planCode || planCode === FREE_PLAN_CODE) return freeEntitlements
  if (PRO_PLAN_CODES.includes(planCode as (typeof PRO_PLAN_CODES)[number])) return proEntitlements
  return freeEntitlements
}
