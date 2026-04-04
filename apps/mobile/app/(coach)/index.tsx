import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { SkeletonCard, SkeletonMetricCard } from '@/components/shared/SkeletonLoader';
import { Colors } from '@/constants/colors';

// Mock data for Sprint 1A
const MOCK_COACH_DATA = {
  upcomingAppointments: 5,
  assignedClients: 12,
  completionRate: 87,
  pendingTasks: 3,
};

const MOCK_UPCOMING = [
  { id: '1', client: 'María González', time: 'Hoy 10:00 AM', type: 'Entrenamiento' },
  { id: '2', client: 'Carlos Mora', time: 'Hoy 2:00 PM', type: 'Seguimiento' },
  { id: '3', client: 'Ana Rodríguez', time: 'Mañana 9:00 AM', type: 'Evaluación' },
  { id: '4', client: 'Luis Pérez', time: 'Mañana 11:00 AM', type: 'Entrenamiento' },
  { id: '5', client: 'Sofía Castro', time: 'Miércoles 3:00 PM', type: 'Nutrición' },
];

export default function CoachDashboard() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
            {t('dashboard.welcome')}, {user?.full_name?.split(' ')[0] ?? 'Coach'} 👋
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            {t('dashboard.coach.title')}
          </Text>
        </View>

        {/* Metrics */}
        {isLoading ? (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <SkeletonMetricCard />
              <SkeletonMetricCard />
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 24 }}>
              <SkeletonMetricCard />
              <SkeletonMetricCard />
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <View style={{
                flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 12,
                padding: 16, margin: 4, borderWidth: 1, borderColor: colors.border,
                borderLeftWidth: 4, borderLeftColor: colors.primary,
              }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                  {t('dashboard.coach.upcomingAppointments')}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
                  {MOCK_COACH_DATA.upcomingAppointments}
                </Text>
              </View>
              <View style={{
                flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 12,
                padding: 16, margin: 4, borderWidth: 1, borderColor: colors.border,
                borderLeftWidth: 4, borderLeftColor: colors.success,
              }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                  {t('dashboard.coach.assignedClients')}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
                  {MOCK_COACH_DATA.assignedClients}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 24 }}>
              <View style={{
                flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 12,
                padding: 16, margin: 4, borderWidth: 1, borderColor: colors.border,
                borderLeftWidth: 4, borderLeftColor: colors.warning,
              }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                  {t('dashboard.coach.completionRate')}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
                  {MOCK_COACH_DATA.completionRate}%
                </Text>
              </View>
              <View style={{
                flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 12,
                padding: 16, margin: 4, borderWidth: 1, borderColor: colors.border,
                borderLeftWidth: 4, borderLeftColor: colors.error,
              }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                  {t('dashboard.coach.pendingTasks')}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
                  {MOCK_COACH_DATA.pendingTasks}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Upcoming appointments */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
          Próximas citas
        </Text>

        {isLoading ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </>
        ) : (
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {MOCK_UPCOMING.map((appt, index) => (
              <View
                key={appt.id}
                style={{
                  padding: 14,
                  borderBottomWidth: index < MOCK_UPCOMING.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                    {appt.client}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {appt.type}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isDark ? '#1e3a5f' : '#eff6ff',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>
                    {appt.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
