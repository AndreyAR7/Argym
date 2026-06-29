'use server'

import { getSessionData } from '@/lib/auth/session'

export interface RevenueSummary {
  total_revenue: number
  this_month_revenue: number
  last_month_revenue: number
  ytd_revenue: number
  active_subscriptions: number
  new_subs_this_month: number
  total_clients: number
  new_clients_this_month: number
  pending_approvals: number
}

export interface MonthlyRevenue {
  year_month: string
  revenue: number
  count: number
}

export interface TopPlan {
  plan_name: string
  purchases: number
  revenue: number
  currency: string
}

export interface TopPromotion {
  promo_title: string
  uses: number
  avg_discount: number
}

export interface TopUser {
  full_name: string
  revenue: number
  subscriptions: number
  appointments: number
  measurements: number
}

export interface BranchPerformance {
  branch_name: string
  clients: number
  coaches: number
  revenue: number
  appointments: number
}

export interface TopVideo {
  video_title: string
  assignments: number
}

export interface WeeklyActivity {
  year_week: string
  appointments: number
  new_subscriptions: number
  revenue: number
}

export interface AnalyticsData {
  summary: RevenueSummary
  monthlyRevenue: MonthlyRevenue[]
  topPlans: TopPlan[]
  topPromotions: TopPromotion[]
  topUsers: TopUser[]
  branches: BranchPerformance[]
  topVideos: TopVideo[]
  weeklyActivity: WeeklyActivity[]
  currency: string
}

function num(v: unknown): number {
  return typeof v === 'string' ? parseFloat(v) : (v as number) ?? 0
}

export async function getAnalyticsDataAction(): Promise<{ data?: AnalyticsData; error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase, tenantId } = session

  const [
    summaryRes,
    monthlyRes,
    plansRes,
    promosRes,
    usersRes,
    branchesRes,
    videosRes,
    weeklyRes,
  ] = await Promise.all([
    supabase.rpc('analytics_revenue_summary', { p_tenant_id: tenantId }),
    supabase.rpc('analytics_monthly_revenue', { p_tenant_id: tenantId }),
    supabase.rpc('analytics_top_plans',       { p_tenant_id: tenantId }),
    supabase.rpc('analytics_top_promotions',  { p_tenant_id: tenantId }),
    supabase.rpc('analytics_top_users',       { p_tenant_id: tenantId }),
    supabase.rpc('analytics_branch_performance', { p_tenant_id: tenantId }),
    supabase.rpc('analytics_top_videos',      { p_tenant_id: tenantId }),
    supabase.rpc('analytics_weekly_activity', { p_tenant_id: tenantId }),
  ])

  if (summaryRes.error) return { error: summaryRes.error.message }

  const rawSummary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data

  const summary: RevenueSummary = {
    total_revenue:          num(rawSummary?.total_revenue),
    this_month_revenue:     num(rawSummary?.this_month_revenue),
    last_month_revenue:     num(rawSummary?.last_month_revenue),
    ytd_revenue:            num(rawSummary?.ytd_revenue),
    active_subscriptions:   num(rawSummary?.active_subscriptions),
    new_subs_this_month:    num(rawSummary?.new_subs_this_month),
    total_clients:          num(rawSummary?.total_clients),
    new_clients_this_month: num(rawSummary?.new_clients_this_month),
    pending_approvals:      num(rawSummary?.pending_approvals),
  }

  const topPlans: TopPlan[] = ((plansRes.data as any[]) ?? []).map(r => ({
    plan_name: r.plan_name ?? '',
    purchases: num(r.purchases),
    revenue:   num(r.revenue),
    currency:  r.currency ?? 'CRC',
  }))

  const currency = topPlans[0]?.currency ?? 'CRC'

  return {
    data: {
      summary,
      monthlyRevenue: ((monthlyRes.data as any[]) ?? []).map(r => ({
        year_month: r.year_month,
        revenue:    num(r.revenue),
        count:      num(r.count),
      })),
      topPlans,
      topPromotions: ((promosRes.data as any[]) ?? []).map(r => ({
        promo_title:  r.promo_title ?? '',
        uses:         num(r.uses),
        avg_discount: num(r.avg_discount),
      })),
      topUsers: ((usersRes.data as any[]) ?? []).map(r => ({
        full_name:    r.full_name ?? '',
        revenue:      num(r.revenue),
        subscriptions: num(r.subscriptions),
        appointments: num(r.appointments),
        measurements: num(r.measurements),
      })),
      branches: ((branchesRes.data as any[]) ?? []).map(r => ({
        branch_name:  r.branch_name ?? '',
        clients:      num(r.clients),
        coaches:      num(r.coaches),
        revenue:      num(r.revenue),
        appointments: num(r.appointments),
      })),
      topVideos: ((videosRes.data as any[]) ?? []).map(r => ({
        video_title: r.video_title ?? '',
        assignments: num(r.assignments),
      })),
      weeklyActivity: ((weeklyRes.data as any[]) ?? []).map(r => ({
        year_week:         r.year_week,
        appointments:      num(r.appointments),
        new_subscriptions: num(r.new_subscriptions),
        revenue:           num(r.revenue),
      })),
      currency,
    },
  }
}
