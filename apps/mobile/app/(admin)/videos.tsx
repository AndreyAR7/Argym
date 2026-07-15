import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useAdminVideos } from '@/hooks/useVideos';
import { useAuthStore } from '@/store/auth.store';

export default function AdminVideosScreen() {
  const T = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { videos, isLoading } = useAdminVideos();

  const total     = isLoading ? '--' : videos.length;
  const published = isLoading ? '--' : videos.filter((v) => v.status === 'published').length;
  const drafts    = isLoading ? '--' : videos.filter((v) => v.status === 'draft').length;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title={t('admin.videos.title')} subtitle={t('admin.videos.subtitle')} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Info card */}
        <View style={[s.infoCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={[s.infoIcon]}>🎬</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoTitle, { color: T.text }]}>{t('admin.videos.infoTitle')}</Text>
            <Text style={[s.infoDesc, { color: T.textMuted }]}>
              {t('admin.videos.infoDesc')}
            </Text>
          </View>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          onPress={() => router.push('/(admin)/content')}
          style={[s.ctaBtn, { backgroundColor: T.accent }]}
          activeOpacity={0.85}
        >
          <Text style={s.ctaText}>{t('admin.videos.goToContent')}</Text>
          <Text style={s.ctaArrow}>→</Text>
        </TouchableOpacity>

        {/* Stats section */}
        <Text style={[s.sectionLabel, { color: T.textMuted }]}>{t('admin.videos.summaryLabel')}</Text>
        <View style={s.kpiGrid}>
          <View style={[s.kpiCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={[s.kpiValue, { color: T.accent }]}>{total}</Text>
            <Text style={[s.kpiLabel, { color: T.textMuted }]}>{t('admin.videos.stats.total')}</Text>
          </View>
          <View style={[s.kpiCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={[s.kpiValue, { color: T.green }]}>{published}</Text>
            <Text style={[s.kpiLabel, { color: T.textMuted }]}>{t('admin.videos.stats.published')}</Text>
          </View>
          <View style={[s.kpiCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={[s.kpiValue, { color: T.orange }]}>{drafts}</Text>
            <Text style={[s.kpiLabel, { color: T.textMuted }]}>{t('admin.videos.stats.drafts')}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  content:     { padding: 16, paddingBottom: 40 },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, borderWidth: 1,
    padding: 16, marginBottom: 14,
  },
  infoIcon:  { fontSize: 28, marginTop: 2 },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoDesc:  { fontSize: 13, lineHeight: 18 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24,
    marginBottom: 24, gap: 8,
  },
  ctaText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  ctaArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10,
  },

  kpiGrid: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingVertical: 18, alignItems: 'center',
  },
  kpiValue: { fontSize: 26, fontWeight: '900', marginBottom: 4 },
  kpiLabel: { fontSize: 11, fontWeight: '600' },
});
