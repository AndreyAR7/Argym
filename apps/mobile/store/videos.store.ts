import { create } from 'zustand';
import {
  fetchVideosAdmin, fetchVideosForClient,
  createVideo, updateVideo, setVideoStatus, deleteVideo,
  assignVideoToClient, removeVideoAssignment,
  fetchCategories,
} from '@/services/videos.service';
import type { Video, VideoCategory, ClientVideo, VideoPlan, VideoLevel, VideoStatus } from '@/types/videos';

interface VideosState {
  // Admin
  adminVideos: Video[];
  isLoadingAdmin: boolean;
  categories: VideoCategory[];
  // Client
  clientVideos: ClientVideo[];
  isLoadingClient: boolean;
  error: string | null;
}

interface VideosActions {
  // Admin
  loadAdminVideos: (tenantId: string) => Promise<void>;
  loadCategories: (tenantId: string) => Promise<void>;
  addVideo: (video: Omit<Video, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'category'>) => Promise<Video>;
  editVideo: (id: string, updates: Partial<Omit<Video, 'category'>>) => Promise<void>;
  changeVideoStatus: (id: string, status: VideoStatus, userId: string) => Promise<void>;
  removeVideo: (id: string) => Promise<void>;
  // Client
  loadClientVideos: (tenantId: string, clientId: string, plan: VideoPlan | null, level: VideoLevel | null, planIds?: string[], promotionIds?: string[]) => Promise<void>;
  // Assignments
  assignVideo: (videoId: string, clientId: string, tenantId: string, assignedBy: string, note?: string) => Promise<void>;
  unassignVideo: (videoId: string, clientId: string) => Promise<void>;
}

export const useVideosStore = create<VideosState & VideosActions>()((set, get) => ({
  adminVideos: [],
  isLoadingAdmin: false,
  categories: [],
  clientVideos: [],
  isLoadingClient: false,
  error: null,

  loadAdminVideos: async (tenantId) => {
    set({ isLoadingAdmin: true, error: null });
    try {
      const videos = await fetchVideosAdmin(tenantId);
      set({ adminVideos: videos, isLoadingAdmin: false });
    } catch (e: any) {
      set({ isLoadingAdmin: false, error: e.message });
    }
  },

  loadCategories: async (tenantId) => {
    try {
      const cats = await fetchCategories(tenantId);
      set({ categories: cats });
    } catch { /* non-critical */ }
  },

  addVideo: async (video) => {
    const created = await createVideo(video);
    set((s) => ({ adminVideos: [created, ...s.adminVideos] }));
    return created;
  },

  editVideo: async (id, updates) => {
    await updateVideo(id, updates);
    set((s) => ({
      adminVideos: s.adminVideos.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
  },

  changeVideoStatus: async (id, status, userId) => {
    await setVideoStatus(id, status, userId);
    set((s) => ({
      adminVideos: s.adminVideos.map((v) => (v.id === id ? { ...v, status } : v)),
    }));
  },

  removeVideo: async (id) => {
    await deleteVideo(id);
    set((s) => ({ adminVideos: s.adminVideos.filter((v) => v.id !== id) }));
  },

  loadClientVideos: async (tenantId, clientId, plan, level, planIds, promotionIds) => {
    set({ isLoadingClient: true, error: null });
    try {
      const videos = await fetchVideosForClient(tenantId, clientId, plan, level, planIds, promotionIds);
      set({ clientVideos: videos, isLoadingClient: false });
    } catch (e: any) {
      set({ isLoadingClient: false, error: e.message });
    }
  },

  assignVideo: async (videoId, clientId, tenantId, assignedBy, note) => {
    await assignVideoToClient(videoId, clientId, tenantId, assignedBy, note);
    await get().loadAdminVideos(tenantId);
  },

  unassignVideo: async (videoId, clientId) => {
    await removeVideoAssignment(videoId, clientId);
  },
}));
