import type { ThemeConfig } from '@/store/profile.store';
import type { PrimaryRole } from '@/lib/types';

export type AccentKey = 'accent' | 'accentSoft' | 'green' | 'orange' | 'blue' | 'gold' | 'purple' | 'teal' | 'red';

export interface OnboardingSlide {
  id: string;
  isLogo?: boolean;
  icon?: string;
  accentKey: AccentKey;
  titleKey: string;
  descKey: string;
}

// One slide per real, navigable section of the app for that role — mirrors
// ClientSidebar/AdminSidebar's NAV_ITEMS (same icons) so the tour visually
// matches what the user finds in the sidebar right after it.
const CLIENT_SLIDES: OnboardingSlide[] = [
  { id: 'welcome', isLogo: true, accentKey: 'accent', titleKey: 'onboarding.client.welcome.title', descKey: 'onboarding.client.welcome.desc' },
  { id: 'inicio', icon: '🏠', accentKey: 'accent', titleKey: 'onboarding.client.inicio.title', descKey: 'onboarding.client.inicio.desc' },
  { id: 'checkin-scan', icon: '📷', accentKey: 'green', titleKey: 'onboarding.client.checkinScan.title', descKey: 'onboarding.client.checkinScan.desc' },
  { id: 'client-appointments', icon: '📅', accentKey: 'blue', titleKey: 'onboarding.client.clientAppointments.title', descKey: 'onboarding.client.clientAppointments.desc' },
  { id: 'progress', icon: '📊', accentKey: 'orange', titleKey: 'onboarding.client.progress.title', descKey: 'onboarding.client.progress.desc' },
  { id: 'routine', icon: '💪', accentKey: 'accent', titleKey: 'onboarding.client.routine.title', descKey: 'onboarding.client.routine.desc' },
  { id: 'nutrition', icon: '🥗', accentKey: 'green', titleKey: 'onboarding.client.nutrition.title', descKey: 'onboarding.client.nutrition.desc' },
  { id: 'videos', icon: '🎬', accentKey: 'blue', titleKey: 'onboarding.client.videos.title', descKey: 'onboarding.client.videos.desc' },
  { id: 'plans', icon: '💳', accentKey: 'gold', titleKey: 'onboarding.client.plans.title', descKey: 'onboarding.client.plans.desc' },
  { id: 'promotions', icon: '🎁', accentKey: 'purple', titleKey: 'onboarding.client.promotions.title', descKey: 'onboarding.client.promotions.desc' },
  { id: 'gamification', icon: '🏆', accentKey: 'gold', titleKey: 'onboarding.client.gamification.title', descKey: 'onboarding.client.gamification.desc' },
  { id: 'profile', icon: '👤', accentKey: 'teal', titleKey: 'onboarding.client.profile.title', descKey: 'onboarding.client.profile.desc' },
];

const COACH_SLIDES: OnboardingSlide[] = [
  { id: 'welcome', isLogo: true, accentKey: 'accent', titleKey: 'onboarding.coach.welcome.title', descKey: 'onboarding.coach.welcome.desc' },
  { id: 'dashboard', icon: '🏠', accentKey: 'accent', titleKey: 'onboarding.coach.dashboard.title', descKey: 'onboarding.coach.dashboard.desc' },
  { id: 'coach-appointments', icon: '📅', accentKey: 'blue', titleKey: 'onboarding.coach.coachAppointments.title', descKey: 'onboarding.coach.coachAppointments.desc' },
  { id: 'clients', icon: '👥', accentKey: 'teal', titleKey: 'onboarding.coach.clients.title', descKey: 'onboarding.coach.clients.desc' },
  { id: 'routines', icon: '💪', accentKey: 'orange', titleKey: 'onboarding.coach.routines.title', descKey: 'onboarding.coach.routines.desc' },
  { id: 'notifications', icon: '🔔', accentKey: 'red', titleKey: 'onboarding.coach.notifications.title', descKey: 'onboarding.coach.notifications.desc' },
];

const ADMIN_SLIDES: OnboardingSlide[] = [
  { id: 'welcome', isLogo: true, accentKey: 'accent', titleKey: 'onboarding.admin.welcome.title', descKey: 'onboarding.admin.welcome.desc' },
  { id: 'dashboard', icon: '🏠', accentKey: 'accent', titleKey: 'onboarding.admin.dashboard.title', descKey: 'onboarding.admin.dashboard.desc' },
  { id: 'clients', icon: '👥', accentKey: 'blue', titleKey: 'onboarding.admin.clients.title', descKey: 'onboarding.admin.clients.desc' },
  { id: 'coaches', icon: '🏋️', accentKey: 'teal', titleKey: 'onboarding.admin.coaches.title', descKey: 'onboarding.admin.coaches.desc' },
  { id: 'admin-appointments', icon: '📅', accentKey: 'orange', titleKey: 'onboarding.admin.adminAppointments.title', descKey: 'onboarding.admin.adminAppointments.desc' },
  { id: 'content', icon: '🎬', accentKey: 'purple', titleKey: 'onboarding.admin.content.title', descKey: 'onboarding.admin.content.desc' },
  { id: 'monetization', icon: '💳', accentKey: 'gold', titleKey: 'onboarding.admin.monetization.title', descKey: 'onboarding.admin.monetization.desc' },
  { id: 'user-approval', icon: '✅', accentKey: 'green', titleKey: 'onboarding.admin.userApproval.title', descKey: 'onboarding.admin.userApproval.desc' },
  { id: 'notifications', icon: '🔔', accentKey: 'red', titleKey: 'onboarding.admin.notifications.title', descKey: 'onboarding.admin.notifications.desc' },
  { id: 'settings', icon: '⚙️', accentKey: 'accentSoft', titleKey: 'onboarding.admin.settings.title', descKey: 'onboarding.admin.settings.desc' },
];

export function getOnboardingSlides(role: PrimaryRole | undefined): OnboardingSlide[] {
  if (role === 'admin' || role === 'full_access') return ADMIN_SLIDES;
  if (role === 'coach') return COACH_SLIDES;
  return CLIENT_SLIDES;
}

export function roleHomeRoute(role: PrimaryRole | undefined): string {
  if (role === 'admin' || role === 'full_access') return '/(admin)/dashboard';
  if (role === 'coach') return '/(coach)/coach-appointments';
  return '/(client)/inicio';
}

export function resolveAccent(T: ThemeConfig, key: AccentKey): string {
  return T[key] as string;
}
