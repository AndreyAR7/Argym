import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useTheme } from '@/hooks/useTheme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem {
  question: string;
  answer: string;
}

function useFaqs(t: (key: string) => string): FaqItem[] {
  return [
    {
      question: t('client.help.faqs.cancelAppointment.question'),
      answer: t('client.help.faqs.cancelAppointment.answer'),
    },
    {
      question: t('client.help.faqs.viewRoutines.question'),
      answer: t('client.help.faqs.viewRoutines.answer'),
    },
    {
      question: t('client.help.faqs.changePlan.question'),
      answer: t('client.help.faqs.changePlan.answer'),
    },
    {
      question: t('client.help.faqs.pointsSystem.question'),
      answer: t('client.help.faqs.pointsSystem.answer'),
    },
    {
      question: t('client.help.faqs.forgotPassword.question'),
      answer: t('client.help.faqs.forgotPassword.answer'),
    },
    {
      question: t('client.help.faqs.updateProfilePhoto.question'),
      answer: t('client.help.faqs.updateProfilePhoto.answer'),
    },
  ];
}

function FaqRow({ item }: { item: FaqItem }) {
  const T = useTheme();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      activeOpacity={0.8}
      style={[styles.faqRow, { borderBottomColor: T.border }]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: T.text }]}>{item.question}</Text>
        <Text style={[styles.faqChevron, { color: T.textMuted, transform: [{ rotate: open ? '90deg' : '0deg' }] }]}>
          ›
        </Text>
      </View>
      {open && (
        <Text style={[styles.faqAnswer, { color: T.textSecondary }]}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const T = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const FAQS = useFaqs(t);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.help.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>{t('client.help.faqTitle')}</Text>
          <Text style={[styles.subtitle, { color: T.textMuted }]}>
            {t('client.help.faqSubtitle')}
          </Text>
        </View>

        <View style={[styles.faqCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          {FAQS.map((item, i) => (
            <FaqRow key={i} item={item} />
          ))}
        </View>

        <View style={[styles.supportCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={[styles.supportEmoji]}>🙋</Text>
          <Text style={[styles.supportTitle, { color: T.text }]}>{t('client.help.supportTitle')}</Text>
          <Text style={[styles.supportDesc, { color: T.textMuted }]}>
            {t('client.help.supportDesc')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(client)/contact' as any)}
            style={[styles.supportBtn, { backgroundColor: T.accent }]}
          >
            <Text style={styles.supportBtnText}>{t('client.help.supportBtn')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  faqCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  faqRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  faqChevron: { fontSize: 22, fontWeight: '700' },
  faqAnswer: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  supportCard: {
    borderRadius: 14, borderWidth: 1, padding: 20,
    alignItems: 'center', gap: 8,
  },
  supportEmoji: { fontSize: 36, marginBottom: 4 },
  supportTitle: { fontSize: 17, fontWeight: '800' },
  supportDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  supportBtn: {
    marginTop: 8, borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 28, alignItems: 'center',
  },
  supportBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
