import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { fetchVideosAdmin } from '@/services/videos.service';
import { formatDuration } from '@/types/videos';
import type { Video } from '@/types/videos';

interface Props {
  tenantId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function VideoSelector({ tenantId, selectedIds, onChange }: Props) {
  const T = useTheme();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideosAdmin(tenantId)
      .then((vids) => setVideos(vids.filter((v) => v.status === 'published')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (loading) return <ActivityIndicator color={T.accent} style={{ marginVertical: 8 }} />;

  if (videos.length === 0) {
    return (
      <Text style={{ color: T.textMuted, fontSize: 13, paddingVertical: 8 }}>
        No hay videos publicados disponibles.
      </Text>
    );
  }

  return (
    <>
      {videos.map((v) => {
        const selected = selectedIds.includes(v.id);
        return (
          <TouchableOpacity
            key={v.id}
            onPress={() => toggle(v.id)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingVertical: 10, paddingHorizontal: 12,
              borderRadius: 8, marginBottom: 6,
              backgroundColor: selected ? T.accent + '18' : T.bgCard,
              borderWidth: 1,
              borderColor: selected ? T.accent + '66' : T.border,
            }}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 5,
              borderWidth: 2,
              borderColor: selected ? T.accent : T.textMuted,
              backgroundColor: selected ? T.accent : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {selected && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {v.title}
              </Text>
              <Text style={{ color: T.textMuted, fontSize: 11 }}>
                {LEVEL_LABEL[v.level] ?? v.level}
                {v.duration_seconds ? ` · ${formatDuration(v.duration_seconds)}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
