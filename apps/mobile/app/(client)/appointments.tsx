import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { AppointmentCard } from '@/components/client/AppointmentCard';
import { EmptyState } from '@/components/client/EmptyState';
import { MOCK_NEXT_APPOINTMENT } from '@/data/clientMock';

const MOCK_APPOINTMENTS = [
  MOCK_NEXT_APPOINTMENT,
  {
    id: 'apt-2',
    title: 'Consulta Nutricional',
    coach_name: 'Coach Luis Pérez',
    start_time: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    location: 'Sala Virtual',
    appointment_type: 'virtual' as const,
    status: 'scheduled' as const,
  },
];

export default function ClientAppointments() {
  const T = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Mis Citas" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>Mis Citas</Text>
          <Text style={[styles.subtitle, { color: T.textMuted }]}>{MOCK_APPOINTMENTS.length} citas programadas</Text>
        </View>
        {MOCK_APPOINTMENTS.length === 0 ? (
          <EmptyState icon="📅" title="Sin citas programadas" description="Tu coach programará tu próxima sesión pronto." />
        ) : (
          MOCK_APPOINTMENTS.map((apt) => (
            <View key={apt.id} style={{ marginBottom: 10 }}>
              <AppointmentCard appointment={apt} onPress={() => {}} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
});
