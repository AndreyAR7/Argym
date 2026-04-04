import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { ClientTheme } from '@/constants/clientTheme'; // for non-color tokens only
import { AppointmentCard } from '@/components/client/AppointmentCard';
import { SectionHeader } from '@/components/client/SectionHeader';
import { QuickActionButton } from '@/components/client/QuickActionButton';
import { ClientPromoBanner } from '@/components/client/ClientPromoBanner';
import { VideoCard } from '@/components/client/VideoCard';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import {
  MOCK_NEXT_APPOINTMENT, MOCK_ROUTINE, MOCK_NUTRITION,
  MOCK_PROMOTION, MOCK_VIDEOS, MOCK_USER,
} from '@/data/clientMock';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function ClientHome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const T = useTheme(); // ← reactive theme tokens
  const [refreshing, setRefreshing] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);

  const name = user?.full_name ?? MOCK_USER.full_name;
  const firstName = name.split(' ')[0];
  const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('');
  const routineProgress = Math.round((MOCK_ROUTINE.completed_exercises / MOCK_ROUTINE.total_exercises) * 100);
  const mealsCompleted = MOCK_NUTRITION.meals.filter((m) => m.completed).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* ✅ GLOBAL THEMING WORKING — shows active theme name */}
      <View style={{ backgroundColor: T.accent, paddingVertical: 8, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>
          ✅ GLOBAL THEMING WORKING · Tema: {T.id ?? 'activo'}
        </Text>
      </View>

      <ClientTopBar />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: T.textSecondary, fontWeight: '500' }}>{getGreeting()},</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: T.text, marginBottom: 4 }}>{firstName} 👋</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
              <Text style={{ fontSize: 13, color: ClientTheme.orange, fontWeight: '600' }}>{MOCK_USER.streak} días seguidos</Text>
            </View>
          </View>
          <View style={{
            width: 48, height: 48, borderRadius: 16,
            backgroundColor: T.accent + '33',
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 2, borderColor: T.accent + '55',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: T.accent }}>{initials}</Text>
          </View>
        </View>

        {/* Promo banner */}
        {!promoDismissed && (
          <ClientPromoBanner
            title={MOCK_PROMOTION.title}
            description={MOCK_PROMOTION.description}
            discountPct={MOCK_PROMOTION.discount_percentage}
            endDate={MOCK_PROMOTION.end_date}
            onPress={() => router.push('/(client)/plans')}
            onDismiss={() => setPromoDismissed(true)}
          />
        )}

        {/* Daily summary */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Resumen de hoy</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SummaryItem
              icon="💪" label="Rutina"
              value={`${MOCK_ROUTINE.completed_exercises}/${MOCK_ROUTINE.total_exercises}`}
              sub="ejercicios" color={T.accent} progress={routineProgress}
              bg={T.card} border={T.border} textColor={T.text} mutedColor={T.textSecondary}
              onPress={() => router.push('/(client)/routine')}
            />
            <SummaryItem
              icon="🥗" label="Nutrición"
              value={`${mealsCompleted}/${MOCK_NUTRITION.meals.length}`}
              sub="comidas" color={ClientTheme.green} progress={Math.round((mealsCompleted / MOCK_NUTRITION.meals.length) * 100)}
              bg={T.card} border={T.border} textColor={T.text} mutedColor={T.textSecondary}
              onPress={() => router.push('/(client)/nutrition')}
            />
          </View>
        </View>

        {/* Next appointment */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Próxima cita" actionLabel="Ver todas" onAction={() => router.push('/(client)/appointments')} />
          <AppointmentCard appointment={MOCK_NEXT_APPOINTMENT} onPress={() => {}} />
        </View>

        {/* Quick actions */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Acciones rápidas" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <QuickActionButton icon="💪" label="Rutina" onPress={() => router.push('/(client)/routine')} accent={T.accent} />
            <QuickActionButton icon="🥗" label="Nutrición" onPress={() => router.push('/(client)/nutrition')} accent={ClientTheme.green} />
            <QuickActionButton icon="📊" label="Progreso" onPress={() => router.push('/(client)/progress')} accent={ClientTheme.orange} />
            <QuickActionButton icon="🎬" label="Videos" onPress={() => router.push('/(client)/videos')} accent={ClientTheme.blue} />
          </View>
        </View>

        {/* Featured videos */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="Videos para ti" subtitle="Contenido asignado por tu coach" actionLabel="Ver todos" onAction={() => router.push('/(client)/videos')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {MOCK_VIDEOS.filter((v) => v.is_assigned).slice(0, 4).map((v) => (
              <VideoCard key={v.id} video={v} onPress={() => {}} />
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({ icon, label, value, sub, color, progress, bg, border, textColor, mutedColor, onPress }: {
  icon: string; label: string; value: string; sub: string;
  color: string; progress: number; bg: string; border: string;
  textColor: string; mutedColor: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: 1, backgroundColor: bg,
        borderRadius: 14, borderWidth: 1, borderColor: color + '33',
        padding: 14,
        shadowColor: color, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 28, fontWeight: '800', color: textColor }}>{value}</Text>
      <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 10 }}>{sub}</Text>
      <View style={{ height: 4, backgroundColor: border, borderRadius: 2, marginBottom: 4 }}>
        <View style={{ height: 4, borderRadius: 2, width: `${progress}%` as any, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{progress}%</Text>
    </TouchableOpacity>
  );
}
