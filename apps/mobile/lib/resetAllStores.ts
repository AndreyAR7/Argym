import { useRoutinesStore } from '@/store/routines.store';
import { usePlansStore } from '@/store/plans.store';
import { useProgressStore } from '@/store/progress.store';
import { useVideosStore } from '@/store/videos.store';
import { useProfileStore } from '@/store/profile.store';
import { useTenantStore } from '@/store/tenant.store';
import { useClientSelectionStore } from '@/store/clientSelection.store';
import { useSidebarStore } from '@/store/sidebar.store';
import { useClientSidebarStore } from '@/store/clientSidebar.store';
import { queryClient } from '@/lib/queryClient';

export function resetAllStores(): void {
  useRoutinesStore.getState().reset();
  usePlansStore.getState().reset();
  useProgressStore.getState().reset();
  useVideosStore.getState().reset();
  useProfileStore.getState().reset();
  useTenantStore.getState().reset();
  useClientSelectionStore.getState().reset();
  useSidebarStore.getState().reset();
  useClientSidebarStore.getState().reset();
  queryClient.clear();
}
