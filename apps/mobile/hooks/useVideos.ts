import { useEffect } from 'react';
import { useVideosStore } from '@/store/videos.store';
import { useAuthStore } from '@/store/auth.store';
import { usePlansStore } from '@/store/plans.store';
import { recordVideoView, getVideoSignedUrl } from '@/services/videos.service';
import type { VideoLevel, VideoPlan, ClientVideo } from '@/types/videos';

// ─── Client hook ──────────────────────────────────────────────

export function useClientVideos() {
  const { user } = useAuthStore();
  const { mySubscription, mySubscriptions, fetchMySubscription } = usePlansStore();
  const { clientVideos, isLoadingClient, error, loadClientVideos } = useVideosStore();

  // Ensure subscription is loaded — needed to resolve plan tier
  useEffect(() => {
    if (user?.id && user?.tenant_id && !mySubscription) {
      fetchMySubscription(user.id, user.tenant_id);
    }
  }, [user?.id, user?.tenant_id]);

  // client_level comes from the profile (auth store, select('*') includes it)
  const clientLevel = (user?.client_level ?? null) as VideoLevel | null;

  // Use plan_tier from any active subscription for tier-based access
  const clientPlan = (mySubscription?.plan?.plan_tier ?? null) as VideoPlan | null;

  // All active subscription plan/promo IDs for junction-table access
  const planIds      = mySubscriptions.map((s) => s.plan_id);
  const promotionIds = mySubscriptions.map((s) => s.promotion_id).filter((id): id is string => !!id);
  const planIdsKey   = planIds.join(',');
  const promoIdsKey  = promotionIds.join(',');

  useEffect(() => {
    if (!user?.id || !user?.tenant_id) return;
    loadClientVideos(user.tenant_id, user.id, clientPlan, clientLevel, planIds, promotionIds);
  }, [user?.id, user?.tenant_id, clientPlan, clientLevel, planIdsKey, promoIdsKey]);

  const featured   = clientVideos.filter((v) => v.is_featured && v.is_accessible);
  const assigned   = clientVideos.filter((v) => v.is_assigned && v.is_accessible);
  const accessible = clientVideos.filter((v) => v.is_accessible);

  const openVideo = async (video: ClientVideo, sessionSeconds?: number): Promise<string | null> => {
    if (!user?.id || !user?.tenant_id) return null;
    recordVideoView(video.id, user.id, user.tenant_id, sessionSeconds).catch(() => {});
    if (video.video_storage_path) {
      try {
        return await getVideoSignedUrl(video.video_storage_path);
      } catch {
        return null;
      }
    }
    return null;
  };

  return {
    clientVideos,
    featured,
    assigned,
    accessible,
    isLoading: isLoadingClient,
    error,
    openVideo,
    clientPlan,
    clientLevel,
    reload: () => {
      if (user?.id && user?.tenant_id) {
        loadClientVideos(user.tenant_id, user.id, clientPlan, clientLevel, planIds, promotionIds);
      }
    },
  };
}

// ─── Admin hook ───────────────────────────────────────────────

export function useAdminVideos() {
  const { user } = useAuthStore();
  const {
    adminVideos, isLoadingAdmin, categories, error,
    loadAdminVideos, loadCategories, changeVideoStatus, removeVideo,
  } = useVideosStore();

  useEffect(() => {
    if (!user?.tenant_id) return;
    loadAdminVideos(user.tenant_id);
    loadCategories(user.tenant_id);
  }, [user?.tenant_id]);

  const publish = (id: string) => {
    if (user?.id) changeVideoStatus(id, 'published', user.id);
  };
  const archive = (id: string) => {
    if (user?.id) changeVideoStatus(id, 'archived', user.id);
  };

  return {
    videos: adminVideos,
    categories,
    isLoading: isLoadingAdmin,
    error,
    publish,
    archive,
    changeStatus: changeVideoStatus,
    remove: removeVideo,
    reload: () => { if (user?.tenant_id) loadAdminVideos(user.tenant_id); },
  };
}
