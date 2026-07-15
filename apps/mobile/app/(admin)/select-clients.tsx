/**
 * select-clients.tsx — Full-screen client selector.
 *
 * This is a real Expo Router screen, NOT a Modal.
 * On Android, real screens get proper window focus and keyboard handling.
 *
 * Flow:
 *   appointments.tsx → router.push('/(admin)/select-clients')
 *   user searches, selects, taps Confirmar
 *   router.back() → appointments.tsx reads from clientSelectionStore
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useClientSelectionStore, type SelectedClient } from '@/store/clientSelection.store';
import { CLIENT_LEVEL_LABELS, type ClientWithPlan } from '@/services/profiles.service';

export default function SelectClientsScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const router = useRouter();
  const { selected, toggle } = useClientSelectionStore();

  // Source of truth: user.tenant_id from auth store (always loaded when admin is here)
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenant_id ?? '';

  console.log('[SelectClients] tenant source: authStore.user.tenant_id');
  console.log('[SelectClients] tenantId resolved:', tenantId || '(empty — will skip query)');

  const [allClients, setAllClients] = useState<ClientWithPlan[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      console.log('[SelectClients] skipping load, tenantId missing');
      return;
    }
    loadClients();
  }, [tenantId]);

  const loadClients = async () => {
    console.log('[SelectClients] loading clients (role=client only) for tenant:', tenantId);
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase.rpc('get_clients_with_plan');
      if (error) throw error;
      const clients = (data ?? []) as ClientWithPlan[];
      console.log('[SelectClients] clients loaded:', clients.length);
      setAllClients(clients);
    } catch (err) {
      console.error('[SelectClients] load error:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Local filter ───────────────────────────────────────────
  const filtered = query.trim() === ''
    ? allClients
    : allClients.filter((c) =>
        c.full_name.toLowerCase().includes(query.toLowerCase())
      );

  const isSelected = (c: ClientWithPlan) => selected.some((s) => s.id === c.id);

  const toggleClient = (c: ClientWithPlan) => toggle({ id: c.id, full_name: c.full_name });

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0] ?? '').slice(0, 2).join('').toUpperCase();

  const handleConfirm = () => {
    console.log('[SelectClients] confirmed:', selected.length, 'clients');
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  // Guard: tenant not available yet
  if (!tenantId) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
        <View style={s.center}>
          <ActivityIndicator color={T.accent} />
          <Text style={{ color: T.textMuted, marginTop: 12 }}>{t('admin.selectClients.loadingTenant')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={handleCancel} style={s.cancelBtn}>
          <Text style={{ color: T.textSecondary, fontSize: 15 }}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: T.text }]}>
          {t('navigation.clients')}{selected.length > 0 ? ` (${selected.length})` : ''}
        </Text>
        <TouchableOpacity onPress={handleConfirm}
          style={[s.confirmBtn, { backgroundColor: T.accent }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('common.confirm')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search input — plain, no wrappers, no Modal ── */}
      <View style={[s.searchWrap, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          placeholder={t('admin.selectClients.searchPlaceholder')}
          placeholderTextColor={T.textMuted}
          value={query}
          onChangeText={(v) => {
            console.log('[SelectClients] search text changed:', v);
            setQuery(v);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          underlineColorAndroid="transparent"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: T.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Selected chips ── */}
      {selected.length > 0 && (
        <View style={s.chipsWrap}>
          {selected.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => toggle(c)}
              style={[s.chip, { backgroundColor: T.accent + '25', borderColor: T.accent }]}>
              <Text style={{ fontSize: 12, color: T.accent, fontWeight: '700' }}>
                {c.full_name.split(' ')[0]}
              </Text>
              <Text style={{ fontSize: 11, color: T.accent, marginLeft: 3 }}>✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Body ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={{ color: T.textMuted, marginTop: 12 }}>{t('admin.selectClients.loadingClients')}</Text>
        </View>
      ) : loadError ? (
        <View style={s.center}>
          <Text style={{ color: T.red, fontSize: 14, marginBottom: 12 }}>
            {t('admin.selectClients.loadError')}
          </Text>
          <TouchableOpacity onPress={loadClients}
            style={[s.retryBtn, { borderColor: T.accent }]}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>👤</Text>
              <Text style={{ color: T.textMuted, fontSize: 14, textAlign: 'center' }}>
                {query ? t('admin.selectClients.noResultsFor', { query }) : t('admin.selectClients.noClientsAvailable')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const sel = isSelected(item);
            const levelLabel = item.client_level ? CLIENT_LEVEL_LABELS[item.client_level] : null;
            const subtitle = [levelLabel, item.plan_name].filter(Boolean).join(' · ');
            return (
              <TouchableOpacity
                onPress={() => toggleClient(item)}
                activeOpacity={0.65}
                style={[s.row, {
                  borderBottomColor: T.border,
                  backgroundColor: sel ? T.accent + '14' : 'transparent',
                }]}
              >
                <View style={[s.avatar, { backgroundColor: sel ? T.accent + '33' : T.accent + '18' }]}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: T.accent }}>
                    {initials(item.full_name)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: T.text, fontWeight: sel ? '700' : '400' }}>
                    {item.full_name}
                  </Text>
                  {subtitle ? (
                    <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{subtitle}</Text>
                  ) : null}
                </View>
                <View style={[s.check, {
                  borderColor: sel ? T.accent : T.border,
                  backgroundColor: sel ? T.accent : 'transparent',
                }]}>
                  {sel && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: { minWidth: 70 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  confirmBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minWidth: 70, alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  retryBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});
