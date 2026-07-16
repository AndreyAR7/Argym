import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────

export interface GameStats {
  user_id: string;
  tenant_id: string;
  xp_total: number;
  xp_this_week: number;
  xp_this_month: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  total_checkins: number;
  app_current_streak: number;
  app_longest_streak: number;
  app_last_checkin_date: string | null;
  app_total_checkins: number;
  total_challenges_completed: number;
  total_challenges_won: number;
  streak_shield_count: number;
}

export interface LevelDefinition {
  level: number;
  xp_required: number;
  name: string;
  color: string;
  unlocks: string[];
}

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition_type: string;
  condition_value: number | null;
  sort_order: number;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: BadgeDefinition;
}

export interface Challenge {
  id: string;
  tenant_id: string;
  creator_id: string;
  challenge_type: 'global' | '1v1' | 'group';
  title: string;
  description: string | null;
  target_metric: 'checkins' | 'honor' | 'routine';
  target_value: number;
  xp_reward: number;
  badge_id: string | null;
  promotion_id: string | null;
  status: 'draft' | 'active' | 'completed' | 'expired';
  starts_at: string;
  expires_at: string | null;
  max_participants: number | null;
  created_at: string;
  creator?: { full_name: string };
  participant_count?: number;
  my_status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'failed' | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  level: number;
  xp_total: number;
  xp_this_week: number;
  xp_this_month: number;
  current_streak: number;
  total_checkins: number;
  total_challenges_won: number;
  is_me: boolean;
}

export interface CheckinResult {
  success: boolean;
  already_checked_in: boolean;
  xp_earned: number;
  new_streak: number;
  new_badges: BadgeDefinition[];
  new_level: number | null;
}

// ─── Service functions ────────────────────────────────────────

/**
 * Fetch aggregated game stats for a user within a tenant.
 * Returns null when no row exists yet (first-time user).
 */
export async function fetchGameStats(
  userId: string,
  tenantId: string,
): Promise<GameStats | null> {
  const { data, error } = await supabase
    .from('user_game_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw error;
  return data as GameStats | null;
}

/**
 * Fetch leaderboard rankings for the given period via RPC.
 */
export async function fetchLeaderboard(
  tenantId: string,
  period: 'week' | 'month' | 'all' = 'week',
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_tenant_id: tenantId,
    p_period: period,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

/**
 * Fetch all badges a user has earned, including badge definition details.
 */
export async function fetchUserBadges(
  userId: string,
  tenantId: string,
): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badge_definitions(*)')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserBadge[];
}

/**
 * Fetch the global catalogue of active badge definitions.
 */
export async function fetchAllBadges(): Promise<BadgeDefinition[]> {
  const { data, error } = await supabase
    .from('badge_definitions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BadgeDefinition[];
}

/**
 * Fetch challenges relevant to the authenticated user via RPC.
 * The RPC returns global challenges, 1v1 invitations, and group challenges
 * the user belongs to — all in one call.
 */
export async function fetchChallenges(
  userId: string,
  tenantId: string,
): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc('get_user_challenges', {
    p_user_id: userId,
    p_tenant_id: tenantId,
  });
  if (error) throw error;
  return (data ?? []) as Challenge[];
}

/**
 * Record an async app-engagement check-in (the in-app "check in today"
 * button) and award XP via RPC. Distinct from the physical QR check-in
 * flow (apps/mobile/app/(client)/checkin-scan.tsx), which requires an
 * active gym membership — this one only requires an approved account.
 */
export async function performCheckin(
  userId: string,
  tenantId: string,
): Promise<CheckinResult> {
  const { data, error } = await supabase.rpc('award_app_checkin', {
    p_user_id: userId,
    p_tenant_id: tenantId,
  });
  if (error) throw error;
  return data as CheckinResult;
}

/**
 * Create a new challenge and optionally invite a specific user (for 1v1).
 */
export async function createChallenge(params: {
  tenantId: string;
  title: string;
  description?: string;
  challengeType: 'global' | '1v1' | 'group';
  targetMetric: 'checkins' | 'honor';
  targetValue: number;
  xpReward: number;
  expiresAt?: string;
  maxParticipants?: number;
  inviteUserId?: string;
}): Promise<Challenge> {
  const {
    tenantId,
    title,
    description,
    challengeType,
    targetMetric,
    targetValue,
    xpReward,
    expiresAt,
    maxParticipants,
    inviteUserId,
  } = params;

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .insert({
      tenant_id: tenantId,
      title,
      description: description ?? null,
      challenge_type: challengeType,
      target_metric: targetMetric,
      target_value: targetValue,
      xp_reward: xpReward,
      expires_at: expiresAt ?? null,
      max_participants: maxParticipants ?? null,
      status: 'active',
      starts_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (challengeError) throw challengeError;

  if (inviteUserId) {
    const { error: participantError } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challenge.id,
        user_id: inviteUserId,
        status: 'pending',
      });
    if (participantError) throw participantError;
  }

  return challenge as Challenge;
}

/**
 * Accept or decline a 1v1 / group challenge invitation.
 */
export async function respondToChallenge(
  challengeId: string,
  userId: string,
  response: 'accepted' | 'declined',
): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .update({ status: response })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Mark the user's challenge entry as completed and claim XP / badges via RPC.
 */
export async function completeChallenge(
  challengeId: string,
  userId: string,
): Promise<{ xp_earned: number; badges_earned: BadgeDefinition[] }> {
  const { data, error } = await supabase.rpc('complete_challenge_entry', {
    p_challenge_id: challengeId,
    p_user_id: userId,
  });
  if (error) throw error;
  return data as { xp_earned: number; badges_earned: BadgeDefinition[] };
}

/**
 * Fetch the ordered list of level thresholds and metadata.
 */
export async function fetchLevelDefinitions(): Promise<LevelDefinition[]> {
  const { data, error } = await supabase
    .from('level_definitions')
    .select('*')
    .order('level', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LevelDefinition[];
}
