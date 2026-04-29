import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PlanRevenueSummary {
  planId: string;
  planName: string;
  currency: string;
  count: number;
  revenue: number;
}

export interface TopClient {
  userId: string;
  fullName: string;
  totalPaid: number;
  primaryCurrency: string;
  activePlansCount: number;
  activeSince: string;
}

export interface MonthTrend {
  month: string;  // YYYY-MM
  label: string;  // "Dic"
  totalCRC: number;
  totalUSD: number;
}

export interface RawSubscriptionRow {
  id: string;
  clientName: string;
  planName: string;
  finalPrice: number | null;
  currency: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

export interface RevenueReport {
  totalCRC: number;
  totalUSD: number;
  newSubscriptionsThisMonth: number;
  activeSubscriptionsTotal: number;
  uniqueClientsWithPlan: number;
  byPlan: PlanRevenueSummary[];
  topClients: TopClient[];
  trend: MonthTrend[];
  rawSubscriptions: RawSubscriptionRow[];
}

const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function fetchRevenueReport(tenantId: string, month: string): Promise<RevenueReport> {
  const [year, mon] = month.split('-').map(Number);
  const startOfMonth     = new Date(year, mon - 1, 1).toISOString();
  const startOfNextMonth = new Date(year, mon,     1).toISOString();
  const trendStart       = new Date(year, mon - 7, 1).toISOString();

  const [monthSubsRes, allActiveSubsRes, trendSubsRes] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id, final_price, start_date, end_date, status, plans(id, name, currency)')
      .eq('tenant_id', tenantId)
      .gte('start_date', startOfMonth)
      .lt('start_date', startOfNextMonth),

    supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id, final_price, start_date, plans(id, name, currency)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),

    supabase
      .from('user_subscriptions')
      .select('final_price, start_date, plans(currency)')
      .eq('tenant_id', tenantId)
      .gte('start_date', trendStart)
      .lt('start_date', startOfNextMonth),
  ]);

  const monthSubs     = (monthSubsRes.data    ?? []) as any[];
  const allActiveSubs = (allActiveSubsRes.data ?? []) as any[];
  const trendSubs     = (trendSubsRes.data    ?? []) as any[];

  // Fetch profiles for client names
  const userIds = [...new Set([
    ...allActiveSubs.map((s: any) => s.user_id as string),
    ...monthSubs.map((s: any) => s.user_id as string),
  ])];

  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    for (const p of profilesData ?? []) {
      profileMap.set(p.id, p.full_name);
    }
  }

  // ── Monthly totals ──
  let totalCRC = 0;
  let totalUSD = 0;
  const byPlanMap = new Map<string, PlanRevenueSummary>();

  for (const sub of monthSubs) {
    const currency = sub.plans?.currency ?? 'CRC';
    const price    = Number(sub.final_price ?? 0);
    if (currency === 'USD') totalUSD += price; else totalCRC += price;

    const planId   = sub.plan_id;
    const planName = sub.plans?.name ?? 'Plan';
    if (!byPlanMap.has(planId)) {
      byPlanMap.set(planId, { planId, planName, currency, count: 0, revenue: 0 });
    }
    const entry = byPlanMap.get(planId)!;
    entry.count++;
    entry.revenue += price;
  }

  // ── Active counts ──
  const uniqueClientsWithPlan = new Set(allActiveSubs.map((s: any) => s.user_id)).size;

  // ── Top clients ──
  const clientAgg = new Map<string, { totalPaid: number; activePlansCount: number; activeSince: string; primaryCurrency: string }>();

  for (const sub of allActiveSubs) {
    const uid      = sub.user_id as string;
    const price    = Number(sub.final_price ?? 0);
    const currency = sub.plans?.currency ?? 'CRC';
    const since    = sub.start_date as string;

    if (!clientAgg.has(uid)) {
      clientAgg.set(uid, { totalPaid: 0, activePlansCount: 0, activeSince: since, primaryCurrency: currency });
    }
    const c = clientAgg.get(uid)!;
    c.totalPaid += price;
    c.activePlansCount++;
    if (new Date(since) < new Date(c.activeSince)) c.activeSince = since;
    if (currency === 'CRC') c.primaryCurrency = 'CRC';
  }

  const topClients: TopClient[] = [...clientAgg.entries()]
    .sort((a, b) => b[1].totalPaid - a[1].totalPaid)
    .slice(0, 10)
    .map(([userId, data]) => ({
      userId,
      fullName: profileMap.get(userId) ?? 'Cliente',
      ...data,
    }));

  // ── 6-month trend ──
  const trendMap = new Map<string, MonthTrend>();
  for (const sub of trendSubs) {
    const d     = new Date(sub.start_date);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = MONTH_NAMES_ES[d.getMonth()];
    if (!trendMap.has(key)) trendMap.set(key, { month: key, label, totalCRC: 0, totalUSD: 0 });
    const currency = sub.plans?.currency ?? 'CRC';
    const price    = Number(sub.final_price ?? 0);
    const entry    = trendMap.get(key)!;
    if (currency === 'USD') entry.totalUSD += price; else entry.totalCRC += price;
  }

  const trend = [...trendMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  // ── Raw rows for CSV ──
  const rawSubscriptions: RawSubscriptionRow[] = monthSubs.map((sub: any) => ({
    id:         sub.id,
    clientName: profileMap.get(sub.user_id) ?? sub.user_id,
    planName:   sub.plans?.name ?? 'Plan',
    finalPrice: sub.final_price,
    currency:   sub.plans?.currency ?? 'CRC',
    startDate:  sub.start_date,
    endDate:    sub.end_date,
    status:     sub.status,
  }));

  return {
    totalCRC,
    totalUSD,
    newSubscriptionsThisMonth: monthSubs.length,
    activeSubscriptionsTotal:  allActiveSubs.length,
    uniqueClientsWithPlan,
    byPlan:            [...byPlanMap.values()].sort((a, b) => b.revenue - a.revenue),
    topClients,
    trend,
    rawSubscriptions,
  };
}

export function useRevenueReport(tenantId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['revenue-report', tenantId, month],
    queryFn:  () => fetchRevenueReport(tenantId!, month),
    enabled:  !!tenantId,
    staleTime: 3 * 60 * 1000,
  });
}

// ── Helpers ──────────────────────────────────────────────────────

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function offsetMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthFull(key: string): string {
  const FULL_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const [y, m] = key.split('-').map(Number);
  return `${FULL_NAMES[m - 1]} ${y}`;
}

export function buildCSV(rows: RawSubscriptionRow[], month: string): string {
  const header = 'ID,Cliente,Plan,Monto,Moneda,Fecha Inicio,Fecha Fin,Estado';
  const lines  = rows.map((r) =>
    [
      r.id,
      `"${r.clientName.replace(/"/g, '""')}"`,
      `"${r.planName.replace(/"/g, '""')}"`,
      r.finalPrice ?? 0,
      r.currency,
      r.startDate.slice(0, 10),
      r.endDate?.slice(0, 10) ?? '',
      r.status,
    ].join(',')
  );
  return `Reporte de Ingresos - ${formatMonthFull(month)}\n${header}\n${lines.join('\n')}`;
}
