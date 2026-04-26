import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { SearchBar } from '@/components/admin/SearchBar';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { ToastManager } from '@/components/shared/Toast';
import { useCoaches, useUpdateProfile, useToggleProfileActive, useCreateUser } from '@/hooks/useProfiles';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import type { ProfileRecord, UpdateProfileInput } from '@/services/profiles.service';

// ── Coach row ─────────────────────────────────────────────────
function CoachRow({ coach, onPress }: { coach: ProfileRecord; onPress: () => void }) {
  const T = useTheme();
  const initials = (coach.full_name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const isActive = coach.is_active !== false;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.row, { backgroundColor: T.bg }]}>
      <View style={[styles.avatar, { backgroundColor: isActive ? T.tealSoft ?? T.accentGlow : T.bgCard }]}>
        <Text style={[styles.avatarText, { color: isActive ? T.teal ?? T.accent : T.textMuted }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: T.text }]}>{coach.full_name}</Text>
        {coach.phone && <Text style={[styles.meta, { color: T.textSecondary }]}>{coach.phone}</Text>}
      </View>
      <View style={[styles.statusPill, { backgroundColor: isActive ? T.greenSoft : T.bgCard, borderColor: isActive ? T.green + '55' : T.border }]}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? T.green : T.textMuted }}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Edit modal ────────────────────────────────────────────────
function EditCoachModal({
  coach, visible, onClose, onSaved,
}: {
  coach: ProfileRecord | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const T = useTheme();
  const updateMutation = useUpdateProfile('coach');
  const toggleMutation = useToggleProfileActive('coach');

  const [fullName, setFullName] = useState(coach?.full_name ?? '');
  const [phone, setPhone] = useState(coach?.phone ?? '');

  React.useEffect(() => {
    if (coach) {
      setFullName(coach.full_name ?? '');
      setPhone(coach.phone ?? '');
    }
  }, [coach]);

  const handleSave = async () => {
    if (!coach) return;
    if (!fullName.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    const input: UpdateProfileInput = {
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
    };
    try {
      await updateMutation.mutateAsync({ id: coach.id, input });
      ToastManager.show({ message: 'Coach actualizado', type: 'success' });
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo actualizar.');
    }
  };

  const handleToggleActive = async () => {
    if (!coach) return;
    const next = !coach.is_active;
    Alert.alert(
      next ? 'Activar coach' : 'Desactivar coach',
      `¿Deseas ${next ? 'activar' : 'desactivar'} a ${coach.full_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await toggleMutation.mutateAsync({ id: coach.id, isActive: next });
              ToastManager.show({ message: next ? 'Coach activado' : 'Coach desactivado', type: 'info' });
              onSaved();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'No se pudo cambiar el estado.');
            }
          },
        },
      ]
    );
  };

  const isBusy = updateMutation.isPending || toggleMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>Editar coach</Text>

              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre completo</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nombre completo"
                placeholderTextColor={T.textMuted}
              />

              <Text style={[styles.label, { color: T.textSecondary }]}>Teléfono</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+506 8888-8888"
                placeholderTextColor={T.textMuted}
                keyboardType="phone-pad"
              />

              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={isBusy} style={[styles.btn, { backgroundColor: T.accent }]}>
                  {updateMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>
                  }
                </TouchableOpacity>
              </View>

              {coach && (
                <TouchableOpacity
                  onPress={handleToggleActive}
                  disabled={isBusy}
                  style={[styles.toggleBtn, {
                    borderColor: coach.is_active ? T.red + '55' : T.green + '55',
                    backgroundColor: coach.is_active ? T.redSoft : T.greenSoft,
                  }]}
                >
                  {toggleMutation.isPending
                    ? <ActivityIndicator color={coach.is_active ? T.red : T.green} size="small" />
                    : <Text style={{ color: coach.is_active ? T.red : T.green, fontWeight: '700', fontSize: 14 }}>
                        {coach.is_active ? '⛔ Desactivar coach' : '✅ Activar coach'}
                      </Text>
                  }
                </TouchableOpacity>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Pending approval row ──────────────────────────────────────
interface PendingUser {
  id: string;
  full_name: string;
  requested_role: string | null;
  approval_status: string;
  created_at: string;
}

function PendingCoachRow({ item, adminId, onDone }: { item: PendingUser; adminId: string; onDone: () => void }) {
  const T = useTheme();
  const [busy, setBusy] = useState(false);
  const initials = item.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const approve = () => {
    Alert.alert('Aprobar coach', `¿Aprobar a ${item.full_name} como coach?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar', onPress: async () => {
          setBusy(true);
          try {
            const { error } = await supabase.rpc('approve_user', {
              p_user_id: item.id,
              p_role_name: 'coach',
              p_admin_id: adminId,
            });
            if (error) throw error;
            ToastManager.show({ message: `${item.full_name} aprobado como coach`, type: 'success' });
            onDone();
          } catch (e: any) { Alert.alert('Error', e.message); }
          finally { setBusy(false); }
        },
      },
    ]);
  };

  const reject = () => {
    Alert.alert('Rechazar solicitud', `¿Rechazar a ${item.full_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            const { error } = await supabase.rpc('reject_user', {
              p_user_id: item.id,
              p_reason: 'Rechazado por administrador',
              p_admin_id: adminId,
            });
            if (error) throw error;
            ToastManager.show({ message: `${item.full_name} rechazado`, type: 'info' });
            onDone();
          } catch (e: any) { Alert.alert('Error', e.message); }
          finally { setBusy(false); }
        },
      },
    ]);
  };

  return (
    <View style={[styles.row, { backgroundColor: T.bg }]}>
      <View style={[styles.avatar, { backgroundColor: T.accentGlow }]}>
        <Text style={[styles.avatarText, { color: T.accent }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: T.text }]}>{item.full_name}</Text>
        <Text style={[styles.meta, { color: T.textSecondary }]}>Solicita: coach</Text>
        <Text style={[styles.meta, { color: T.textMuted }]}>
          {new Date(item.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        <TouchableOpacity onPress={approve} disabled={busy}
          style={{ backgroundColor: T.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓ Aprobar</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={reject} disabled={busy}
          style={{ borderWidth: 1, borderColor: T.red + '55', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: T.red, fontSize: 12, fontWeight: '700' }}>✕ Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Create modal ──────────────────────────────────────────────
function CreateCoachModal({
  visible, onClose, onCreated,
}: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const T = useTheme();
  const createMutation = useCreateUser('coach');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const reset = () => { setFullName(''); setEmail(''); setPhone(''); setPassword(''); };

  const handleCreate = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    if (!email.trim()) { Alert.alert('Error', 'El email es requerido.'); return; }
    if (!password.trim() || password.length < 6) { Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.'); return; }
    try {
      await createMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        role: 'coach',
        phone: phone.trim() || undefined,
      });
      ToastManager.show({ message: 'Coach creado correctamente', type: 'success' });
      reset();
      onCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo crear el coach.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>Nuevo coach</Text>

              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre completo *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={fullName} onChangeText={setFullName} placeholder="Nombre completo" placeholderTextColor={T.textMuted} />

              <Text style={[styles.label, { color: T.textSecondary }]}>Email *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={email} onChangeText={setEmail} placeholder="coach@email.com" placeholderTextColor={T.textMuted} autoCapitalize="none" keyboardType="email-address" />

              <Text style={[styles.label, { color: T.textSecondary }]}>Contraseña temporal *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" placeholderTextColor={T.textMuted} secureTextEntry />

              <Text style={[styles.label, { color: T.textSecondary }]}>Teléfono</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={phone} onChangeText={setPhone} placeholder="+506 8888-8888" placeholderTextColor={T.textMuted} keyboardType="phone-pad" />

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} style={[styles.btn, { backgroundColor: T.accent }]}>
                  {createMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '700' }}>Crear coach</Text>
                  }
                </TouchableOpacity>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function AdminCoachesScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Activos');
  const [editTarget, setEditTarget] = useState<ProfileRecord | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const { data: coaches = [], isLoading, error, refetch } = useCoaches();

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const { data } = await supabase.rpc('get_users_by_approval_status', { p_status: 'pending' });
      const coachPending = (data ?? []).filter((u: PendingUser) => u.requested_role === 'coach');
      setPendingUsers(coachPending);
    } finally {
      setPendingLoading(false);
    }
  };

  React.useEffect(() => {
    if (filter === 'Pendientes') loadPending();
  }, [filter]);

  const filtered = coaches.filter((c) =>
    (c.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  const activeCount = coaches.filter((c) => c.is_active !== false).length;
  const pendingCount = pendingUsers.length;

  const openEdit = (coach: ProfileRecord) => {
    setEditTarget(coach);
    setShowEdit(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title="Coaches"
        subtitle={filter === 'Pendientes' ? `${pendingCount} pendientes` : `${activeCount} activos`}
        actionLabel="+ Nuevo"
        onAction={() => setShowCreate(true)}
      />

      {/* Filter tabs */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['Activos', 'Inactivos', 'Pendientes'] as const).map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={[styles.statusPill, { backgroundColor: filter === f ? T.accent : T.bgCard, borderColor: filter === f ? T.accent : T.border }]}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f ? '#fff' : T.textSecondary }}>
                {f}{f === 'Pendientes' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filter === 'Pendientes' ? (
        <View style={{ padding: 16 }}>
          {pendingLoading ? (
            <><SkeletonCard lines={2} /><SkeletonCard lines={2} /></>
          ) : pendingUsers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: T.textMuted, fontSize: 14 }}>No hay coaches pendientes de aprobación</Text>
            </View>
          ) : (
            pendingUsers.map((item) => (
              <React.Fragment key={item.id}>
                <PendingCoachRow item={item} adminId={user?.id ?? ''} onDone={() => { loadPending(); refetch(); }} />
                <View style={{ height: 1, backgroundColor: T.border }} />
              </React.Fragment>
            ))
          )}
        </View>
      ) : (
        <>
          <View style={{ padding: 16, paddingBottom: 0 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o teléfono..." />
          </View>
          {isLoading ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <Text style={{ color: T.red, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
                No se pudieron cargar los coaches.
              </Text>
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={{ color: T.accent, fontWeight: '700' }}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border }} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={{ color: T.textMuted, fontSize: 14 }}>
                    {search ? 'Sin resultados' : 'No hay coaches registrados'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => <CoachRow coach={item} onPress={() => openEdit(item)} />}
            />
          )}
        </>
      )}

      <EditCoachModal
        coach={editTarget}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => refetch()}
      />
      <CreateCoachModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  statusPill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { padding: 40, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  toggleBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
});
