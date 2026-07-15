import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface BranchWithStats {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client_count: number;
  coach_count: number;
}

async function fetchBranches(): Promise<BranchWithStats[]> {
  const { data, error } = await supabase.rpc('get_branches_with_stats');
  if (error) throw error;
  return (data ?? []) as BranchWithStats[];
}

export function useBranches(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['branches', tenantId],
    queryFn: fetchBranches,
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });
}
