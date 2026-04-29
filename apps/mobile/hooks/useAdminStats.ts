import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AdminStats {
  monthlyRevenue: number;
  activePlans: number;
  activePromotions: number;
  pendingApprovals: number;
  newClientsThisMonth: number;
  lastMonthNewClients: number;
  expiringSubscriptions: number;
  clientsWithoutPlan: number;
}

async function fetchAdminStats(tenantId: string): Promise<AdminStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    revenueRes,
    plansRes,
    promoRes,
    pendingRes,
    newClientsRes,
    lastMonthRes,
    expiringRes,
    subscribedRes,
    approvedRes,
  ] = await Promise.all([
    // MRR: sum of active subscriptions
    supabase
      .from('user_subscriptions')
      .select('final_price')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),

    // Active plans count
    supabase
      .from('plans')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),

    // Active promotions count
    supabase
      .from('promotions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .lte('start_date', now.toISOString()),

    // Pending approvals
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending'),

    // New approved clients this month
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .gte('created_at', startOfMonth),

    // New approved clients last month (for trend)
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .gte('created_at', startOfLastMonth)
      .lt('created_at', startOfMonth),

    // Subscriptions expiring within 7 days
    supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .gte('end_date', now.toISOString())
      .lte('end_date', in7Days),

    // Clients WITH an active subscription (for "without plan" calc)
    supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),

    // Total approved active clients (role='client' only, via SECURITY DEFINER RPC)
    supabase.rpc('get_approved_client_count'),
  ]);

  const monthlyRevenue = (revenueRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.final_price ?? 0), 0
  );

  const subscribedIds = new Set((subscribedRes.data ?? []).map((r) => r.user_id));
  const totalApproved = (approvedRes.data as number) ?? 0;

  return {
    monthlyRevenue,
    activePlans: plansRes.count ?? 0,
    activePromotions: promoRes.count ?? 0,
    pendingApprovals: pendingRes.count ?? 0,
    newClientsThisMonth: newClientsRes.count ?? 0,
    lastMonthNewClients: lastMonthRes.count ?? 0,
    expiringSubscriptions: expiringRes.count ?? 0,
    clientsWithoutPlan: Math.max(0, totalApproved - subscribedIds.size),
  };
}

export function useAdminStats(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['admin-stats', tenantId],
    queryFn: () => fetchAdminStats(tenantId!),
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });
}
