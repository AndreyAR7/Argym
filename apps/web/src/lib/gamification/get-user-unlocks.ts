import { createClient } from '@/lib/supabase/server'

export interface UserUnlocks {
  level: number
  xp_total: number
  can_create_challenges: boolean
  exclusive_routines: boolean
  streak_shield: boolean
  ambassador: boolean
}

export async function getUserUnlocks(userId: string): Promise<UserUnlocks> {
  // Default: everything locked
  const defaults: UserUnlocks = {
    level: 0,
    xp_total: 0,
    can_create_challenges: false,
    exclusive_routines: false,
    streak_shield: false,
    ambassador: false,
  }

  const supabase = await createClient()

  // Get user's current level from user_game_stats
  const { data: stats } = await supabase
    .from('user_game_stats')
    .select('level, xp_total')
    .eq('user_id', userId)
    .single()

  if (!stats) return defaults

  // Get all level_definitions up to and including user's level
  // Merge all unlocks from level 1 to user's level
  const { data: levels } = await supabase
    .from('level_definitions')
    .select('level, unlocks')
    .lte('level', stats.level)
    .not('unlocks', 'is', null)

  const unlocks: UserUnlocks = {
    ...defaults,
    level: stats.level,
    xp_total: stats.xp_total,
  }

  for (const lv of levels ?? []) {
    if (lv.unlocks?.can_create_challenges) unlocks.can_create_challenges = true
    if (lv.unlocks?.exclusive_routines) unlocks.exclusive_routines = true
    if (lv.unlocks?.streak_shield) unlocks.streak_shield = true
    if (lv.unlocks?.ambassador) unlocks.ambassador = true
  }

  return unlocks
}
