'use server'

import { getSessionData } from '@/lib/auth/session'

// ─── Summary types (existing) ────────────────────────────────────────────────
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

// ─── Executive KPIs (new) ────────────────────────────────────────────────────
export interface ExecutiveKpis {
  period_revenue: number
  prev_period_revenue: number
  mrr: number
  arr: number
  arpu: number
  avg_subscription_value: number
  new_subscriptions: number
  cancelled_subscriptions: number
  churn_rate_pct: number
  active_clients: number
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  appointment_fill_rate: number
  cancellation_rate: number
}

// ─── Detailed table types (new) ──────────────────────────────────────────────
export interface DetailedClient {
  full_name: string
  email: string
  phone: string | null
  client_level: string | null
  branch_name: string | null
  join_date: string
  approval_status: string
  is_active: boolean
  total_revenue: number
  active_plans: number
  total_subscriptions: number
  total_appointments: number
  completed_appointments: number
  measurements_count: number
  last_appointment_date: string | null
  last_subscription_date: string | null
}

export interface DetailedTransaction {
  invoice_number: string | null
  invoice_date: string
  client_name: string
  client_email: string
  plan_name: string
  billing_cycle: string
  amount: number
  currency: string
  invoice_status: string
  payment_reference: string | null
  promotion_title: string | null
  discount_applied: string | null
  stripe_subscription_id: string | null
}

export interface DetailedSubscription {
  start_date: string
  end_date: string | null
  client_name: string
  client_email: string
  plan_name: string
  billing_cycle: string
  status: string
  amount: number
  currency: string
  payment_reference: string | null
  stripe_subscription_id: string | null
  promotion_applied: string | null
  days_remaining: number | null
}

export interface DetailedAppointment {
  appointment_date: string
  end_time: string | null
  title: string | null
  appointment_type: string | null
  status: string
  client_name: string | null
  client_email: string | null
  coach_name: string | null
  location: string | null
  duration_minutes: number | null
  notes: string | null
}

// ─── Combined data type ──────────────────────────────────────────────────────
export interface AnalyticsData {
  summary: RevenueSummary
  kpis: ExecutiveKpis
  monthlyRevenue: MonthlyRevenue[]
  topPlans: TopPlan[]
  topPromotions: TopPromotion[]
  topUsers: TopUser[]
  branches: BranchPerformance[]
  topVideos: TopVideo[]
  weeklyActivity: WeeklyActivity[]
  currency: string
  from: string
  to: string
}

// ─── Detail data type ────────────────────────────────────────────────────────
export type DetailTab = 'clients' | 'transactions' | 'subscriptions' | 'appointments'

export interface DetailedAnalyticsData {
  clients: DetailedClient[]
  transactions: DetailedTransaction[]
  subscriptions: DetailedSubscription[]
  appointments: DetailedAppointment[]
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function num(v: unknown): number {
  return typeof v === 'string' ? parseFloat(v) : (v as number) ?? 0
}

// ─── Main analytics action ───────────────────────────────────────────────────
export async function getAnalyticsDataAction(
  from: string,
  to: string,
): Promise<{ data?: AnalyticsData; error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase, tenantId } = session

  const params = { p_tenant_id: tenantId, p_from: from, p_to: to }

  const [
    kpisRes,
    summaryRes,
    monthlyRes,
    plansRes,
    promosRes,
    usersRes,
    branchesRes,
    videosRes,
    weeklyRes,
  ] = await Promise.all([
    supabase.rpc('analytics_executive_kpis',     params),
    supabase.rpc('analytics_revenue_summary',    params),
    supabase.rpc('analytics_monthly_revenue',    params),
    supabase.rpc('analytics_top_plans',          params),
    supabase.rpc('analytics_top_promotions',     params),
    supabase.rpc('analytics_top_users',          params),
    supabase.rpc('analytics_branch_performance', params),
    supabase.rpc('analytics_top_videos',         params),
    supabase.rpc('analytics_weekly_activity',    params),
  ])

  if (summaryRes.error) return { error: summaryRes.error.message }
  if (kpisRes.error)    return { error: kpisRes.error.message }

  const rawSummary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data
  const rawKpis    = Array.isArray(kpisRes.data)    ? kpisRes.data[0]    : kpisRes.data

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

  const kpis: ExecutiveKpis = {
    period_revenue:           num(rawKpis?.period_revenue),
    prev_period_revenue:      num(rawKpis?.prev_period_revenue),
    mrr:                      num(rawKpis?.mrr),
    arr:                      num(rawKpis?.arr),
    arpu:                     num(rawKpis?.arpu),
    avg_subscription_value:   num(rawKpis?.avg_subscription_value),
    new_subscriptions:        num(rawKpis?.new_subscriptions),
    cancelled_subscriptions:  num(rawKpis?.cancelled_subscriptions),
    churn_rate_pct:           num(rawKpis?.churn_rate_pct),
    active_clients:           num(rawKpis?.active_clients),
    total_appointments:       num(rawKpis?.total_appointments),
    completed_appointments:   num(rawKpis?.completed_appointments),
    cancelled_appointments:   num(rawKpis?.cancelled_appointments),
    appointment_fill_rate:    num(rawKpis?.appointment_fill_rate),
    cancellation_rate:        num(rawKpis?.cancellation_rate),
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
      kpis,
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
        full_name:     r.full_name ?? '',
        revenue:       num(r.revenue),
        subscriptions: num(r.subscriptions),
        appointments:  num(r.appointments),
        measurements:  num(r.measurements),
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
      from,
      to,
    },
  }
}

// ─── Detailed tables action (lazy-loaded by client) ──────────────────────────
export async function getDetailedDataAction(
  tab: DetailTab,
  from: string,
  to: string,
): Promise<{ data?: DetailedClient[] | DetailedTransaction[] | DetailedSubscription[] | DetailedAppointment[]; error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase, tenantId } = session

  const params = { p_tenant_id: tenantId, p_from: from, p_to: to }

  const rpcMap: Record<DetailTab, string> = {
    clients:       'analytics_detailed_clients',
    transactions:  'analytics_detailed_transactions',
    subscriptions: 'analytics_detailed_subscriptions',
    appointments:  'analytics_detailed_appointments',
  }

  const { data, error } = await supabase.rpc(rpcMap[tab], params)
  if (error) return { error: error.message }

  return { data: (data as any[]) ?? [] }
}

// ─── Full export action (all tables at once) ─────────────────────────────────
export async function getAllDetailedDataAction(
  from: string,
  to: string,
): Promise<{ data?: DetailedAnalyticsData; error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase, tenantId } = session

  const params = { p_tenant_id: tenantId, p_from: from, p_to: to }

  const [clientsRes, txRes, subsRes, apptRes] = await Promise.all([
    supabase.rpc('analytics_detailed_clients',       params),
    supabase.rpc('analytics_detailed_transactions',  params),
    supabase.rpc('analytics_detailed_subscriptions', params),
    supabase.rpc('analytics_detailed_appointments',  params),
  ])

  if (clientsRes.error) return { error: clientsRes.error.message }

  return {
    data: {
      clients:       (clientsRes.data as any[]) ?? [],
      transactions:  (txRes.data       as any[]) ?? [],
      subscriptions: (subsRes.data     as any[]) ?? [],
      appointments:  (apptRes.data     as any[]) ?? [],
    },
  }
}
