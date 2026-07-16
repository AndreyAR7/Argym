import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';

type Status = 'scanning' | 'loading' | 'success' | 'already' | 'error';

interface CheckinData {
  success: boolean;
  error?: string;
  already_checked_in: boolean;
  xp_earned: number;
  new_streak: number;
  new_badges: string[];
}

export default function CheckinScanScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<Status>('scanning');
  const [message, setMessage] = useState('');
  const [checkinData, setCheckinData] = useState<CheckinData | null>(null);

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || status !== 'scanning') return;
    setScanned(true);
    setStatus('loading');

    let branchId: string | null = null;
    try {
      const url = new URL(data);
      // Accept only URLs with /checkin path
      if (!url.pathname.includes('/checkin')) throw new Error('Not a checkin QR');
      branchId = url.searchParams.get('branch');
    } catch {
      setStatus('error');
      setMessage(t('client.checkinScan.errors.qrNotRecognized'));
      return;
    }

    if (!branchId || !user?.id || !user?.tenant_id) {
      setStatus('error');
      setMessage(t('client.checkinScan.errors.qrInvalid'));
      return;
    }

    try {
      const { data: result, error } = await supabase.rpc('award_gym_checkin', {
        p_user_id: user.id,
        p_tenant_id: user.tenant_id,
        p_branch_id: branchId,
      });

      if (error) {
        setStatus('error');
        setMessage(error.message ?? t('client.checkinScan.errors.checkinFailed'));
        return;
      }

      const r = (Array.isArray(result) ? result[0] : result) as CheckinData;
      setCheckinData(r);

      if (r?.already_checked_in) {
        setStatus('already');
      } else if (r?.success !== false) {
        setStatus('success');
      } else if (r?.error === 'no_active_membership') {
        setStatus('error');
        setMessage(t('client.checkinScan.errors.noActiveMembership'));
      } else {
        setStatus('error');
        setMessage(t('client.checkinScan.errors.checkinFailed'));
      }
    } catch {
      setStatus('error');
      setMessage(t('client.checkinScan.errors.connectionError'));
    }
  };

  const retry = () => {
    setScanned(false);
    setStatus('scanning');
    setMessage('');
    setCheckinData(null);
  };

  // — Permission loading —
  if (!permission) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.accent} />
      </SafeAreaView>
    );
  }

  // — Permission denied —
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: T.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <Text style={{ fontSize: 52, marginBottom: 20 }}>📷</Text>
        <Text style={[styles.title, { color: T.text }]}>{t('client.checkinScan.permission.title')}</Text>
        <Text style={[styles.subtitle, { color: T.textSecondary }]}>
          {t('client.checkinScan.permission.message')}
        </Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.btn, { backgroundColor: T.accent }]}>
          <Text style={styles.btnText}>{t('client.checkinScan.permission.grant')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: T.textMuted, fontSize: 14 }}>{t('client.checkinScan.actions.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Live camera — only when scanning */}
      {status === 'scanning' && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcode}
        />
      )}

      <SafeAreaView style={[StyleSheet.absoluteFill, { justifyContent: 'space-between' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('client.checkinScan.header.title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Scanning state — viewfinder */}
        {status === 'scanning' && (
          <View style={{ alignItems: 'center' }}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {/* Scan line */}
              <View style={{
                position: 'absolute', left: 10, right: 10, top: '50%',
                height: 2, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 1,
              }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 20, textAlign: 'center' }}>
              {t('client.checkinScan.scanning.hint')}
            </Text>
          </View>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <View style={[styles.resultBox, { backgroundColor: T.bg + 'F0' }]}>
            <ActivityIndicator size="large" color={T.accent} style={{ marginBottom: 16 }} />
            <Text style={{ color: T.text, fontSize: 16, fontWeight: '600' }}>{t('client.checkinScan.loading.title')}</Text>
          </View>
        )}

        {/* Success */}
        {status === 'success' && (
          <View style={[styles.resultBox, { backgroundColor: T.bg + 'F0' }]}>
            <Text style={{ fontSize: 64, marginBottom: 12 }}>🎉</Text>
            <Text style={[styles.title, { color: T.text }]}>{t('client.checkinScan.success.title')}</Text>
            {checkinData?.xp_earned ? (
              <View style={[styles.xpBadge, { backgroundColor: T.accent + '25', borderColor: T.accent + '55' }]}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: T.accent }}>+{checkinData.xp_earned}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.accent, marginLeft: 4 }}>XP</Text>
              </View>
            ) : null}
            {checkinData?.new_streak ? (
              <Text style={{ color: T.orange, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                🔥 {t('client.checkinScan.success.streak', { count: checkinData.new_streak })}
              </Text>
            ) : null}
            {checkinData?.new_badges?.length ? (
              <Text style={{ color: T.textSecondary, fontSize: 13, marginBottom: 4 }}>
                🏅 {checkinData.new_badges.join(', ')}
              </Text>
            ) : null}
            <TouchableOpacity onPress={() => router.back()} style={[styles.btn, { backgroundColor: T.accent, marginTop: 20 }]}>
              <Text style={styles.btnText}>{t('client.checkinScan.success.backHome')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Already checked in */}
        {status === 'already' && (
          <View style={[styles.resultBox, { backgroundColor: T.bg + 'F0' }]}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>✓</Text>
            <Text style={[styles.title, { color: T.text }]}>{t('client.checkinScan.already.title')}</Text>
            <Text style={[styles.subtitle, { color: T.textSecondary }]}>
              {t('client.checkinScan.already.message')}
            </Text>
            {checkinData?.new_streak ? (
              <Text style={{ color: T.orange, fontSize: 15, fontWeight: '700', marginTop: 8 }}>
                🔥 {t('client.checkinScan.already.streak', { count: checkinData.new_streak })}
              </Text>
            ) : null}
            <TouchableOpacity onPress={() => router.back()} style={[styles.btn, { backgroundColor: T.green, marginTop: 20 }]}>
              <Text style={styles.btnText}>{t('client.checkinScan.actions.goBack')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error */}
        {status === 'error' && (
          <View style={[styles.resultBox, { backgroundColor: T.bg + 'F0' }]}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>❌</Text>
            <Text style={[styles.title, { color: T.text }]}>{t('client.checkinScan.error.title')}</Text>
            <Text style={[styles.subtitle, { color: T.textSecondary }]}>{message}</Text>
            <TouchableOpacity onPress={retry} style={[styles.btn, { backgroundColor: T.accent, marginTop: 20 }]}>
              <Text style={styles.btnText}>{t('client.checkinScan.error.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
              <Text style={{ color: T.textMuted, fontSize: 14 }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom hint — only while scanning */}
        {status === 'scanning' && (
          <View style={{ paddingBottom: 28, alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' }}>
              {t('client.checkinScan.scanning.bottomHint')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const CORNER = 26;
const CW = 3;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: 256, height: 256, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff', borderWidth: CW },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  resultBox: {
    marginHorizontal: 24, borderRadius: 24, padding: 32,
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 4, paddingHorizontal: 8 },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 999, borderWidth: 1,
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 12,
  },
  btn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
