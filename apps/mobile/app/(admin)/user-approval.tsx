import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { showToast } from '@/components/ui/Toast';

const ROLES = ['client', 'coach', 'admin'] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  client: 'Cliente',
  coach: 'Coach',
  admin: 'Admin',
};

interface PendingUser {
  id: string;
  full_name: string;
  email?: string;
  requested_role: string | null;
  approval_status: string;
  rejection_reason: string | null;
  created_at: string;
}

export default function UserApprovalScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Per-user role selection (defaults to 'client')
  const [roleSelections, setRoleSelections] = useState<Record<string, Role>>({});

  // Reject modal
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const getRole = (userId: string): Role => roleSelections[userId] ?? 'client';

  const setRole = (userId: string, role: Role) =>
    setRoleSelections((prev) => ({ ...prev, [userId]: role }));

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users_by_approval_status', {
        p_status: filter,
      });
      if (error) throw error;
      setUsers((data ?? []) as PendingUser[]);
    } catch {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, requested_role, approval_status, rejection_reason, created_at')
        .eq('approval_status', filter)
        .order('created_at', { ascending: false });
      setUsers((data ?? []) as PendingUser[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [filter]);

  const approveOne = async (pendingUser: PendingUser, role: Role) => {
    if (!user?.id) { Alert.alert('Error', 'Sesión no válida'); return; }
    const { error } = await supabase.rpc('approve_user', {
      p_user_id: pendingUser.id,
      p_role_name: role,
      p_admin_id: user.id,
    });
    if (error) throw error;
  };

  const handleApprove = (pendingUser: PendingUser) => {
    const role = getRole(pendingUser.id);
    Alert.alert(
      'Aprobar usuario',
      `Asignar rol "${ROLE_LABELS[role]}" a ${pendingUser.full_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await approveOne(pendingUser, role);
              showToast(`${pendingUser.full_name} ahora tiene acceso al sistema.`);
              loadUsers();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'No se pudo aprobar el usuario.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleApproveAll = () => {
    if (!user?.id) { Alert.alert('Error', 'Sesión no válida'); return; }
    const pending = users.filter((u) => u.approval_status === 'pending');
    if (pending.length === 0) return;
    Alert.alert(
      'Aprobar todos',
      `¿Aprobar ${pending.length} usuario(s) pendiente(s)? Se usará el rol seleccionado para cada uno (por defecto: Cliente).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Aprobar ${pending.length}`,
          onPress: async () => {
            setApproveAllLoading(true);
            const errors: string[] = [];
            for (const u of pending) {
              try {
                await approveOne(u, getRole(u.id));
              } catch (err: any) {
                errors.push(`${u.full_name}: ${err.message}`);
              }
            }
            setApproveAllLoading(false);
            if (errors.length > 0) {
              Alert.alert('Completado con errores', errors.join('\n'));
            } else {
              showToast(`${pending.length} usuario(s) aprobado(s).`);
            }
            loadUsers();
          },
        },
      ]
    );
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    if (!user?.id) { Alert.alert('Error', 'Sesión no válida'); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('reject_user', {
        p_user_id: rejectTarget.id,
        p_reason: rejectReason.trim() || 'Sin motivo especificado',
        p_admin_id: user.id,
      });
      if (error) throw error;
      setRejectModal(false);
      setRejectReason('');
      setRejectTarget(null);
      showToast(`La solicitud de ${rejectTarget.full_name} fue rechazada.`);
      loadUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo rechazar el usuario.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });

  const pendingCount = users.filter((u) => u.approval_status === 'pending').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title="Aprobación de usuarios"
        subtitle={`${users.length} ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobados' : 'rechazados'}`}
      />

      {/* Filter tabs */}
      <View style={[styles.tabRow, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        {(['pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.tab, filter === f && { backgroundColor: T.accent }]}
          >
            <Text style={[styles.tabText, { color: filter === f ? '#fff' : T.textSecondary }]}>
              {f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : 'Rechazados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Approve All button */}
      {filter === 'pending' && pendingCount > 1 && !loading && (
        <TouchableOpacity
          onPress={handleApproveAll}
          disabled={approveAllLoading}
          style={[styles.approveAllBtn, { backgroundColor: '#10B981' }]}
        >
          {approveAllLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.approveAllText}>✓ Aprobar todos ({pendingCount})</Text>
          }
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: T.bgCard, borderColor: T.border }]}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>
                {filter === 'pending' ? '🎉' : filter === 'approved' ? '✅' : '❌'}
              </Text>
              <Text style={{ color: T.textSecondary, fontSize: 14, textAlign: 'center' }}>
                {filter === 'pending'
                  ? 'No hay usuarios pendientes de aprobación'
                  : filter === 'approved'
                  ? 'No hay usuarios aprobados aún'
                  : 'No hay usuarios rechazados'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
              {/* User info */}
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: T.accent + '22' }]}>
                  <Text style={[styles.avatarText, { color: T.accent }]}>
                    {item.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: T.text }]}>{item.full_name}</Text>
                  <Text style={[styles.meta, { color: T.textSecondary }]}>
                    Registrado: {formatDate(item.created_at)}
                  </Text>
                </View>
                <StatusBadge status={item.approval_status} size="sm" />
              </View>

              {/* Role selector — only for pending */}
              {item.approval_status === 'pending' && (
                <View style={styles.roleSection}>
                  <Text style={[styles.roleLabel, { color: T.textSecondary }]}>Asignar rol:</Text>
                  <View style={styles.roleRow}>
                    {ROLES.map((role) => {
                      const active = getRole(item.id) === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          onPress={() => setRole(item.id, role)}
                          style={[
                            styles.roleChip,
                            {
                              backgroundColor: active ? T.accent + '22' : T.bg,
                              borderColor: active ? T.accent : T.border,
                            },
                          ]}
                        >
                          <Text style={[styles.roleChipText, { color: active ? T.accent : T.textSecondary }]}>
                            {ROLE_LABELS[role]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Actions — only for pending */}
              {item.approval_status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => handleApprove(item)}
                    disabled={actionLoading || approveAllLoading}
                    style={[styles.approveBtn, { backgroundColor: '#10B981' }]}
                  >
                    <Text style={styles.btnText}>✓ Aprobar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setRejectTarget(item); setRejectModal(true); }}
                    disabled={actionLoading || approveAllLoading}
                    style={[styles.rejectBtn, { borderColor: '#FF4D6D44' }]}
                  >
                    <Text style={[styles.btnText, { color: '#FF4D6D' }]}>✕ Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Reject modal */}
      <Modal visible={rejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: T.bgCard }]}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Rechazar usuario</Text>
            <Text style={[styles.modalDesc, { color: T.textSecondary }]}>
              ¿Rechazar la solicitud de {rejectTarget?.full_name}?
            </Text>
            <TextInput
              style={[styles.reasonInput, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
              placeholder="Motivo del rechazo (opcional)"
              placeholderTextColor={T.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setRejectModal(false); setRejectReason(''); }}
                style={[styles.modalBtn, { borderColor: T.border, borderWidth: 1 }]}
              >
                <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRejectConfirm}
                disabled={actionLoading}
                style={[styles.modalBtn, { backgroundColor: '#FF4D6D' }]}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Rechazar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 12,
    borderRadius: 12, padding: 4, borderWidth: 1,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 12, fontWeight: '600' },
  approveAllBtn: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  approveAllText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  meta: { fontSize: 11 },
  roleSection: { marginBottom: 10 },
  roleLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  roleChipText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 24, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalDesc: { fontSize: 14, marginBottom: 16 },
  reasonInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
