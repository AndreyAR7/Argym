/**
 * ClientPickerModal — standalone component, no nesting issues.
 *
 * Strategy:
 * - Load ALL approved clients once when modal opens (no per-keystroke queries)
 * - Filter locally in JS (instant, no network lag, no async state issues)
 * - TextInput is the ONLY interactive element above the list — no wrappers blocking it
 * - No KeyboardAvoidingView on Android (causes more problems than it solves)
 * - Modal is at the top level of the component tree via its own Modal primitive
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

export interface ClientOption {
  id: string;
  full_name: string;
}

interface Props {
  visible: boolean;
  tenantId: string;
  selected: ClientOption[];
  onToggle: (c: ClientOption) => void;
  onClose: () => void;
}

export function ClientPickerModal({ visible, tenantId, selected, onToggle, onClose }: Props) {
  const T = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load all clients once when modal opens
  const loadClients = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setLoadError(false);
    try {
      // Step 1: get role_id for 'client'
      const { data: roleRow, error: roleErr } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'client')
        .maybeSingle();

      let clientIds: string[] = [];

      if (!roleErr && roleRow?.id) {
        // Step 2: get user_ids with that role in this tenant
        const { data: urRows } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('tenant_id', tenantId)
          .eq('role_id', roleRow.id);
        clientIds = (urRows ?? []).map((r: any) => r.user_id as string);
      }

      // Step 3: fetch profiles
      let q = supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', tenantId)
        .eq('approval_status', 'approved')
        .order('full_name');

      if (clientIds.length > 0) {
        q = q.in('id', clientIds);
      }

      const { data, error } = await q.limit(200);
      if (error) throw error;
      setAllClients((data ?? []) as ClientOption[]);
    } catch {
      setLoadError(true);
      setAllClients([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      loadClients();
      // Focus after modal animation completes
      const t = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Local filter — instant, no async
  const filtered = query.trim().length === 0
    ? allClients
    : allClients.filter((c) =>
        c.full_name.toLowerCase().includes(query.toLowerCase())
      );

  const isSelected = (c: ClientOption) => selected.some((s) => s.id === c.id);

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0] ?? '').slice(0, 2).join('').toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Full-screen backdrop */}
      <View style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        {/* Sheet */}
        <View style={[s.sheet, { backgroundColor: T.bgCard }]}>

          {/* Handle */}
          <View style={[s.handle, { backgroundColor: T.border }]} />

          {/* Header */}
          <View style={s.header}>
            <Text style={[s.title, { color: T.text }]}>
              Seleccionar clientes
              {selected.length > 0 ? ` (${selected.length})` : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={[s.doneBtn, { backgroundColor: T.accent }]}>
              <Text style={s.doneTxt}>Listo</Text>
            </TouchableOpacity>
          </View>

          {/* Search input — plain, no wrappers */}
          <View style={[s.searchWrap, { backgroundColor: T.bg, borderColor: T.border }]}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              ref={inputRef}
              style={[s.searchInput, { color: T.text }]}
              placeholder="Buscar cliente..."
              placeholderTextColor={T.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              underlineColorAndroid="transparent"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: T.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Selected chips row */}
          {selected.length > 0 && (
            <View style={s.chipsRow}>
              {selected.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => onToggle(c)}
                  style={[s.chip, { backgroundColor: T.accent + '25', borderColor: T.accent }]}
                >
                  <Text style={{ fontSize: 12, color: T.accent, fontWeight: '700' }}>
                    {c.full_name.split(' ')[0]}
                  </Text>
                  <Text style={{ fontSize: 11, color: T.accent, marginLeft: 3 }}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Body */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={T.accent} size="large" />
              <Text style={{ color: T.textMuted, marginTop: 12, fontSize: 14 }}>Cargando clientes...</Text>
            </View>
          ) : loadError ? (
            <View style={s.center}>
              <Text style={{ color: T.red, fontSize: 14, marginBottom: 12 }}>No se pudieron cargar los clientes.</Text>
              <TouchableOpacity onPress={loadClients} style={[s.retryBtn, { borderColor: T.accent }]}>
                <Text style={{ color: T.accent, fontWeight: '700' }}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={s.center}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>👤</Text>
                  <Text style={{ color: T.textMuted, fontSize: 14, textAlign: 'center' }}>
                    {query ? `Sin resultados para "${query}"` : 'No hay clientes disponibles'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const sel = isSelected(item);
                return (
                  <TouchableOpacity
                    onPress={() => onToggle(item)}
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
                    <Text style={{ flex: 1, fontSize: 15, color: T.text, fontWeight: sel ? '700' : '400' }}>
                      {item.full_name}
                    </Text>
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
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '82%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  doneBtn: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  doneTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  retryBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});
