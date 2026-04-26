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
import { useClientsWithPlanInfinite, CLIENTS_INFINITE_KEY, useUpdateProfile, useToggleProfileActive, useCreateUser } from '@/hooks/useProfiles';
import { useTenantPlans, useAssignPlan } from '@/hooks/useSubscriptions';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { CLIENT_LEVEL_LABELS } from '@/services/profiles.service';
import { DatePickerField } from '@/components/shared/DatePickerField';
import type { UpdateProfileInput, ClientWithPlan } from '@/services/profiles.service';

const FILTERS = ['Activos', 'Inactivos', 'Pendientes'];

// ── Client row ────────────────────────────────────────────────
function ClientRow({
  client, onEdit, onPlan,
}: { client: ClientWithPlan; onEdit: () => void; onPlan: () => void }) {
  const T = useTheme();
  const initials = (client.full_name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const levelLabel = client.client_level ? CLIENT_LEVEL_LABELS[client.client_level] : null;
  const parts = [
    levelLabel,
    client.plan_name ?? 'Sin plan',
    client.promotion_title ? `🎁 ${client.promotion_title}` : null,
  ].filter(Boolean);
  const subtitle = parts.join(' · ');
  return (
    <View style={[styles.rowWrap, { borderBottomColor: T.border }]}>
      <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={[styles.row, { backgroundColor: T.bg }]}>
        <View style={[styles.avatar, { backgroundColor: T.accentGlow }]}>
          <Text style={[styles.avatarText, { color: T.accent }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: T.text }]}>{client.full_name}</Text>
          {subtitle ? <Text style={[styles.meta, { color: T.accent, fontWeight: '600' }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPlan} style={[styles.planBtn, { borderColor: T.accent + '55' }]}>
        <Text style={{ fontSize: 11, color: T.accent, fontWeight: '700' }}>
          {client.plan_name ? '🔄 Plan' : '➕ Plan'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Edit modal ────────────────────────────────────────────────
function EditClientModal({
  clientId, client, visible, onClose, onSaved,
}: { clientId: string | null; client?: ClientWithPlan | null; visible: boolean; onClose: () => void; onSaved: () => void }) {
  const T = useTheme();
  const updateMutation = useUpdateProfile('client');
  const toggleMutation = useToggleProfileActive('client');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [clientLevel, setClientLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);

  React.useEffect(() => {
    if (!clientId || !visible) return;
    supabase
      .from('profiles')
      .select('full_name, phone, date_of_birth, is_active, client_level')
      .eq('id', clientId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setFullName(data.full_name ?? '');
        setPhone(data.phone ?? '');
        setDob(data.date_of_birth ?? '');
        setIsActive(data.is_active ?? true);
        setClientLevel(data.client_level ?? null);
      });
  }, [clientId, visible]);

  const handleSave = async () => {
    if (!clientId) return;
    if (!fullName.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    const input: UpdateProfileInput = {
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      date_of_birth: dob.trim() || undefined,
      client_level: clientLevel ?? undefined,
    };
    try {
      await updateMutation.mutateAsync({ id: clientId, input });
      ToastManager.show({ message: 'Cliente actualizado', type: 'success' });
      onSaved(); onClose();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'No se pudo actualizar.'); }
  };

  const handleToggle = async () => {
    if (!clientId) return;
    Alert.alert(
      isActive ? 'Desactivar cliente' : 'Activar cliente', '¿Confirmar?',
      [{ text: 'Cancelar', style: 'cancel' }, {
        text: 'Confirmar', onPress: async () => {
          try {
            await toggleMutation.mutateAsync({ id: clientId, isActive: !isActive });
            ToastManager.show({ message: isActive ? 'Cliente desactivado' : 'Cliente activado', type: 'info' });
            onSaved(); onClose();
          } catch (err: any) { Alert.alert('Error', err.message); }
        },
      }]
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
              <Text style={[styles.sheetTitle, { color: T.text }]}>Editar cliente</Text>

              {/* Current plan/promo/level info */}
              {(client?.plan_name || client?.promotion_title || client?.client_level) && (
                <View style={[styles.infoCard, { backgroundColor: T.accentGlow, borderColor: T.accent + '33' }]}>
                  {client?.plan_name && (
                    <View style={styles.infoRow}>
                      <Text style={{ fontSize: 13, color: T.textSecondary }}>💳 Plan</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: T.text }}>{client.plan_name}</Text>
                    </View>
                  )}
                  {client?.promotion_title && (
                    <View style={styles.infoRow}>
                      <Text style={{ fontSize: 13, color: T.textSecondary }}>🎁 Promo</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: T.green }}>{client.promotion_title}</Text>
                    </View>
                  )}
                  {client?.client_level && (
                    <View style={styles.infoRow}>
                      <Text style={{ fontSize: 13, color: T.textSecondary }}>⭐ Nivel</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: T.accent }}>{CLIENT_LEVEL_LABELS[client.client_level] ?? client.client_level}</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre completo</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={fullName} onChangeText={setFullName} placeholder="Nombre completo" placeholderTextColor={T.textMuted} />
              <Text style={[styles.label, { color: T.textSecondary }]}>Teléfono</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={phone} onChangeText={setPhone} placeholder="+506 8888-8888" placeholderTextColor={T.textMuted} keyboardType="phone-pad" />
              <DatePickerField
                label="Fecha de nacimiento"
                value={dob}
                onChange={setDob}
                placeholder="Seleccionar fecha"
                maxDate={new Date()}
              />
              <Text style={[styles.label, { color: T.textSecondary }]}>Nivel de fitness</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {([{ value: null, label: 'Sin nivel' }, { value: 'beginner', label: 'Principiante' }, { value: 'intermediate', label: 'Intermedio' }, { value: 'advanced', label: 'Avanzado' }] as const).map((opt) => {
                  const active = clientLevel === opt.value;
                  return (
                    <TouchableOpacity key={String(opt.value)} onPress={() => setClientLevel(opt.value)}
                      style={{ flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: active ? T.accent : T.bg, borderColor: active ? T.accent : T.border }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#fff' : T.textSecondary }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={isBusy} style={[styles.btn, { backgroundColor: T.accent }]}>
                  {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>}
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleToggle} disabled={isBusy}
                style={[styles.toggleBtn, { borderColor: isActive ? T.red + '55' : T.green + '55', backgroundColor: isActive ? T.redSoft : T.greenSoft }]}>
                <Text style={{ color: isActive ? T.red : T.green, fontWeight: '700', fontSize: 14 }}>
                  {isActive ? '⛔ Desactivar cliente' : '✅ Activar cliente'}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Assign plan modal ─────────────────────────────────────────
function AssignPlanModal({
  client, visible, onClose, onSaved, tenantId,
}: { client: ClientWithPlan | null; visible: boolean; onClose: () => void; onSaved: () => void; tenantId: string }) {
  const T = useTheme();
  const { data: plans = [], isLoading: plansLoading } = useTenantPlans();
  const assignMutation = useAssignPlan();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  React.useEffect(() => { if (visible) setSelectedPlanId(null); }, [visible]);

  const handleAssign = async () => {
    if (!client || !selectedPlanId) { Alert.alert('Error', 'Selecciona un plan.'); return; }
    const plan = plans.find((p) => p.id === selectedPlanId);
    try {
      await assignMutation.mutateAsync({ userId: client.id, tenantId, planId: selectedPlanId, planPrice: plan?.price ?? 0 });
      ToastManager.show({ message: `Plan "${plan?.name}" asignado a ${client.full_name}`, type: 'success' });
      onSaved(); onClose();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'No se pudo asignar el plan.'); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sheetTitle, { color: T.text }]}>
              {client?.plan_name ? `Cambiar plan — ${client.full_name?.split(' ')[0]}` : `Asignar plan — ${client?.full_name?.split(' ')[0]}`}
            </Text>
            {client?.plan_name && (
              <Text style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>Plan actual: {client.plan_name}</Text>
            )}
            {plansLoading ? (
              <ActivityIndicator color={T.accent} style={{ marginVertical: 24 }} />
            ) : plans.length === 0 ? (
              <Text style={{ color: T.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 24 }}>No hay planes disponibles.</Text>
            ) : (
              plans.map((plan) => {
                const active = selectedPlanId === plan.id;
                return (
                  <TouchableOpacity key={plan.id} onPress={() => setSelectedPlanId(plan.id)}
                    style={[styles.planOption, { backgroundColor: active ? T.accent + '18' : T.bg, borderColor: active ? T.accent : T.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>{plan.name}</Text>
                      {plan.description && <Text style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{plan.description}</Text>}
                      <Text style={{ fontSize: 13, color: T.accent, fontWeight: '600', marginTop: 4 }}>
                        {plan.currency} {plan.price.toLocaleString('es-CR')} / {plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle === 'yearly' ? 'año' : 'único'}
                      </Text>
                    </View>
                    <View style={[styles.planCheck, { borderColor: active ? T.accent : T.border, backgroundColor: active ? T.accent : 'transparent' }]}>
                      {active && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={[styles.actions, { marginTop: 16 }]}>
              <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAssign} disabled={!selectedPlanId || assignMutation.isPending}
                style={[styles.btn, { backgroundColor: selectedPlanId ? T.accent : T.bgCard, opacity: selectedPlanId ? 1 : 0.5 }]}>
                {assignMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: selectedPlanId ? '#fff' : T.textMuted, fontWeight: '700' }}>Asignar</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Pending row ───────────────────────────────────────────────
interface PendingUser { id: string; full_name: string; requested_role: string | null; approval_status: string; created_at: string; }

function PendingRow({ item, adminId, onDone }: { item: PendingUser; adminId: string; onDone: () => void }) {
  const T = useTheme();
  const [busy, setBusy] = useState(false);
  const initials = item.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const approve = () => Alert.alert('Aprobar cliente', `¿Aprobar a ${item.full_name}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Aprobar', onPress: async () => {
      setBusy(true);
      try {
        const { error } = await supabase.rpc('approve_user', { p_user_id: item.id, p_role_name: item.requested_role ?? 'client', p_admin_id: adminId });
        if (error) throw error;
        ToastManager.show({ message: `${item.full_name} aprobado`, type: 'success' });
        onDone();
      } catch (e: any) { Alert.alert('Error', e.message); } finally { setBusy(false); }
    }},
  ]);

  const reject = () => Alert.alert('Rechazar cliente', `¿Rechazar a ${item.full_name}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Rechazar', style: 'destructive', onPress: async () => {
      setBusy(true);
      try {
        const { error } = await supabase.rpc('reject_user', { p_user_id: item.id, p_reason: 'Rechazado por administrador', p_admin_id: adminId });
        if (error) throw error;
        ToastManager.show({ message: `${item.full_name} rechazado`, type: 'info' });
        onDone();
      } catch (e: any) { Alert.alert('Error', e.message); } finally { setBusy(false); }
    }},
  ]);

  return (
    <View style={[styles.row, { backgroundColor: T.bg }]}>
      <View style={[styles.avatar, { backgroundColor: T.accentGlow }]}>
        <Text style={[styles.avatarText, { color: T.accent }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: T.text }]}>{item.full_name}</Text>
        <Text style={[styles.meta, { color: T.textSecondary }]}>Rol: {item.requested_role ?? 'client'}</Text>
        <Text style={[styles.meta, { color: T.textMuted }]}>{new Date(item.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <TouchableOpacity onPress={approve} disabled={busy} style={{ backgroundColor: T.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓ Aprobar</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={reject} disabled={busy} style={{ borderWidth: 1, borderColor: T.red + '55', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: T.red, fontSize: 12, fontWeight: '700' }}>✕ Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Create modal ──────────────────────────────────────────────
function CreateClientModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const T = useTheme();
  const createMutation = useCreateUser('client');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const reset = () => { setFullName(''); setEmail(''); setPhone(''); setDob(''); setPassword(''); };

  const handleCreate = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    if (!email.trim()) { Alert.alert('Error', 'El email es requerido.'); return; }
    if (!password.trim() || password.length < 6) { Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.'); return; }
    try {
      await createMutation.mutateAsync({ email: email.trim().toLowerCase(), password: password.trim(), full_name: fullName.trim(), role: 'client', phone: phone.trim() || undefined, date_of_birth: dob.trim() || undefined });
      ToastManager.show({ message: 'Cliente creado correctamente', type: 'success' });
      reset(); onCreated(); onClose();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'No se pudo crear el cliente.'); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>Nuevo cliente</Text>
              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre completo *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={fullName} onChangeText={setFullName} placeholder="Nombre completo" placeholderTextColor={T.textMuted} />
              <Text style={[styles.label, { color: T.textSecondary }]}>Email *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={email} onChangeText={setEmail} placeholder="cliente@email.com" placeholderTextColor={T.textMuted} autoCapitalize="none" keyboardType="email-address" />
              <Text style={[styles.label, { color: T.textSecondary }]}>Contraseña temporal *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" placeholderTextColor={T.textMuted} secureTextEntry />
              <Text style={[styles.label, { color: T.textSecondary }]}>Teléfono</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]} value={phone} onChangeText={setPhone} placeholder="+506 8888-8888" placeholderTextColor={T.textMuted} keyboardType="phone-pad" />
              <DatePickerField
                label="Fecha de nacimiento"
                value={dob}
                onChange={setDob}
                placeholder="Seleccionar fecha"
                maxDate={new Date()}
              />
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} style={[styles.btn, { backgroundColor: T.accent }]}>
                  {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Crear cliente</Text>}
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
export default function AdminClientsScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Activos');
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editTargetClient, setEditTargetClient] = useState<ClientWithPlan | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [planTarget, setPlanTarget] = useState<ClientWithPlan | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const tenantId = user?.tenant_id ?? '';
  const {
    data: clientPages,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useClientsWithPlanInfinite();

  const clients = clientPages?.pages.flat() ?? [];

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const { data } = await supabase.rpc('get_users_by_approval_status', { p_status: 'pending' });
      setPendingUsers((data ?? []).filter((u: PendingUser) => !u.requested_role || u.requested_role === 'client'));
    } finally { setPendingLoading(false); }
  };

  React.useEffect(() => { if (filter === 'Pendientes') loadPending(); }, [filter]);

  // useClientsWithPlan returns ClientWithPlan — cast for filtering
  const allClients = clients as unknown as (ClientWithPlan & { is_active?: boolean })[];

  const filtered = allClients.filter((c) => {
    const matchSearch = (c.full_name ?? '').toLowerCase().includes(search.toLowerCase());
    const active = (c as any).is_active !== false;
    const matchFilter = filter === 'Activos' ? active : filter === 'Inactivos' ? !active : true;
    return matchSearch && matchFilter;
  });

  const activeCount = allClients.filter((c) => (c as any).is_active !== false).length;
  const pendingCount = pendingUsers.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title="Clientes"
        subtitle={filter === 'Pendientes' ? `${pendingCount} pendientes` : `${activeCount} activos`}
        actionLabel="+ Nuevo"
        onAction={() => setShowCreate(true)}
      />
      <View style={styles.toolbar}>
        {filter !== 'Pendientes' && (
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre..." />
        )}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={[styles.chip, { backgroundColor: filter === f ? T.accent : T.bgCard, borderColor: filter === f ? T.accent : T.border }]}>
              <Text style={[styles.chipText, { color: filter === f ? '#fff' : T.textSecondary }]}>
                {f}{f === 'Pendientes' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filter === 'Pendientes' ? (
        pendingLoading ? (
          <View style={{ padding: 16 }}><SkeletonCard lines={2} /><SkeletonCard lines={2} /></View>
        ) : (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border }} />}
            ListEmptyComponent={<View style={styles.empty}><Text style={{ color: T.textMuted, fontSize: 14 }}>No hay clientes pendientes</Text></View>}
            renderItem={({ item }) => <PendingRow item={item} adminId={user?.id ?? ''} onDone={() => { loadPending(); refetch(); }} />}
          />
        )
      ) : isLoading ? (
        <View style={{ padding: 16 }}><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /></View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={{ color: T.red, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>No se pudieron cargar los clientes.</Text>
          <TouchableOpacity onPress={() => refetch()}><Text style={{ color: T.accent, fontWeight: '700' }}>Reintentar</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border }} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={{ color: T.textMuted, fontSize: 14 }}>{search ? 'Sin resultados' : 'No hay clientes registrados'}</Text></View>}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={T.accent} style={{ marginVertical: 16 }} /> : null}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <ClientRow
              client={item}
              onEdit={() => { setEditTargetId(item.id); setEditTargetClient(item); setShowEdit(true); }}
              onPlan={() => { setPlanTarget(item); setShowPlan(true); }}
            />
          )}
        />
      )}

      <EditClientModal clientId={editTargetId} client={editTargetClient} visible={showEdit} onClose={() => setShowEdit(false)} onSaved={() => refetch()} />
      <CreateClientModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={() => refetch()} />
      <AssignPlanModal client={planTarget} visible={showPlan} onClose={() => setShowPlan(false)} onSaved={() => refetch()} tenantId={tenantId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toolbar: { padding: 16, gap: 10 },
  filters: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  rowWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 0 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  planBtn: { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 56, marginBottom: 10 },
  empty: { padding: 40, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  toggleBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  planOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  planCheck: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16, gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
