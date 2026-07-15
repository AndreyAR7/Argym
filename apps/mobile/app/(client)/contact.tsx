import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useTenantStore } from '@/store/tenant.store';

function ContactCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const T = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[styles.contactCard, { backgroundColor: T.bgCard, borderColor: T.border }]}
    >
      <View style={[styles.contactIconWrap, { backgroundColor: T.accentGlow }]}>
        <Text style={styles.contactIcon}>{icon}</Text>
      </View>
      <View style={styles.contactTextWrap}>
        <Text style={[styles.contactLabel, { color: T.textMuted }]}>{label}</Text>
        <Text style={[styles.contactValue, { color: T.text }]}>{value}</Text>
      </View>
      <Text style={[styles.arrow, { color: T.textMuted }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function ContactScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { tenant } = useTenantStore();

  const phone = (tenant as any)?.phone ?? '+506 8888-8888';
  const email = (tenant as any)?.email ?? 'info@gimnasio.cr';

  const openWhatsApp = () => {
    const cleaned = phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleaned}`).catch(() => {
      Alert.alert(t('client.contact.whatsappUnavailableTitle'), t('client.contact.whatsappUnavailableMessage'));
    });
  };

  const openCall = () => {
    Linking.openURL(`tel:${phone}`);
  };

  const openEmail = () => {
    Linking.openURL(`mailto:${email}`);
  };

  const SCHEDULE_ROWS = [
    { days: t('client.contact.schedule.weekdaysLabel'), hours: t('client.contact.schedule.weekdaysHours') },
    { days: t('client.contact.schedule.saturdayLabel'), hours: t('client.contact.schedule.saturdayHours') },
    { days: t('client.contact.schedule.sundayLabel'),   hours: t('client.contact.schedule.sundayHours')  },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.contact.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>{t('client.contact.heading')}</Text>
          <Text style={[styles.subtitle, { color: T.textMuted }]}>
            {t('client.contact.subtitle')}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: T.textMuted }]}>{t('client.contact.channelsSection')}</Text>

        <ContactCard
          icon="💬"
          label={t('client.contact.whatsapp')}
          value={phone}
          onPress={openWhatsApp}
        />
        <ContactCard
          icon="📞"
          label={t('client.contact.call')}
          value={phone}
          onPress={openCall}
        />
        <ContactCard
          icon="📧"
          label={t('client.contact.email')}
          value={email}
          onPress={openEmail}
        />

        <Text style={[styles.sectionLabel, { color: T.textMuted }]}>{t('client.contact.hoursSection')}</Text>

        <View style={[styles.scheduleCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          {SCHEDULE_ROWS.map((row, i) => (
            <View
              key={row.days}
              style={[
                styles.scheduleRow,
                i < SCHEDULE_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
              ]}
            >
              <Text style={[styles.scheduleDays, { color: T.text }]}>{row.days}</Text>
              <Text style={[styles.scheduleHours, { color: T.textSecondary }]}>{row.hours}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10, marginLeft: 2,
  },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  contactIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  contactIcon: { fontSize: 22 },
  contactTextWrap: { flex: 1 },
  contactLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  contactValue: { fontSize: 15, fontWeight: '600' },
  arrow: { fontSize: 20 },
  scheduleCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  scheduleDays: { fontSize: 14, fontWeight: '600' },
  scheduleHours: { fontSize: 14 },
});
