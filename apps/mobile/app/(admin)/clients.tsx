import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { ToastManager } from '@/components/shared/Toast';
import {
  useClientsWithPlan, useClientsWithPlanInfinite,
  useUpdateProfile, useToggleProfileActive, useCreateUser,
} from '@/hooks/useProfiles';
import { useTenantPlans, useAssignPlan } from '@/hooks/useSubscriptions';
import { getClientSubscriptions } from '@/services/subscriptions.service';
import type { SubscriptionRecord } from '@/services/subscriptions.service';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { CLIENT_LEVEL_LABELS } from '@/services/profiles.service';
import { DatePickerField } from '@/components/shared/DatePickerField';
import type { UpdateProfileInput, ClientWithPlan } from '@/services/profiles.service';

// ─── Level tab config ─────────────────────────────────────────
type LevelTab = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'none' | 'pending';

const LEVEL_TABS: { key: LevelTab; label: string; emoji: string }[] = [
  { key: 'all',          label: 'Todos',        emoji: '👥' },
  { key: 'beginner',     label: 'Principiante', emoji: '🌱' },
  { key: 'intermediate', label: 'Intermedio',   emoji: '⚡' },
  { key: 'advanced',     label: 'Avanzado',     emoji: '🔥' },
  { key: 'none',         label: 'Sin nivel',    emoji: '❔' },
  { key: 'pending',      label: 'Pendientes',   emoji: '⏳' },
];

const LEVEL_COLORS: Record<LevelTab, string | null> = {
  all: null, beginner: '#00D68F', intermediate: '#6C63FF',
  advanced: '#FF4D6D', none: '#888', pending: '#F59E0B',
};

// ─── Frosted glass search bar ─────────────────────────────────
function GlassSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const T = useTheme();
  return (
    <View style={[glassStyles.wrap, { backgroundColor: T.bgCard + 'CC', borderColor: T.border + '88' }]}>
      <Text style={{ fontSize: 16, color: T.textMuted }}>🔍</Text>
      <TextInput
        style={[glassStyles.input, { color: T.text }]}
        value={value}
        onChangeText={onChange}
        placeholder="Buscar cliente..."
        placeholderTextColor={T.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 14, color: T.textMuted, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const glassStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11,
    marginHorizontal: 16, marginBottom: 4,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
});

// ─── Level tab strip ──────────────────────────────────────────
function LevelTabStrip({
  active, counts, pendingCount, onChange,
}: {
  active: LevelTab;
  counts: Record<LevelTab, number>;
  pendingCount: number;
  onChange: (t: LevelTab) => void;
}) {
  const T = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
    >
      {LEVEL_TABS.map(({ key, label, emoji }) => {
        const isActive = active === key;
        const count = key === 'pending' ? pendingCount : counts[key];
        const accentColor = LEVEL_COLORS[key] ?? T.accent;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={[
              tabStyles.tab,
              isActive
                ? { backgroundColor: accentColor, borderColor: accentColor }
                : { backgroundColor: T.bgCard, borderColor: T.border },
            ]}
          >
            <Text style={{ fontSize: 13 }}>{emoji}</Text>
            <Text style={[tabStyles.label, { color: isActive ? '#fff' : T.textSecondary }]}>
              {label}
            </Text>
            {count > 0 && (
              <View style={[tabStyles.badge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : accentColor + '22' }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? '#fff' : accentColor }}>
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const tabStyles = StyleSheet.create({
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 22, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  label: { fontSize: 12, fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
});

// ─── Client row ───────────────────────────────────────────────
function ClientRow({ client, onEdit, onPlan }: {
  client: ClientWithPlan; onEdit: () => void; onPlan: () => void;
}) {
  const T = useTheme();
  const initials = (client.full_name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const levelLabel = client.client_level ? CLIENT_LEVEL_LABELS[client.client_level] : null;
  const levelColor = client.client_level === 'beginner' ? T.green
    : client.client_level === 'intermediate' ? T.accent
    : client.client_level === 'advanced' ? T.red : T.textMuted;

  return (
    <View style={[rowStyles.wrap, { borderBottomColor: T.border }]}>
      <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={[rowStyles.row]}>
        <View style={[rowStyles.avatar, { backgroundColor: T.accentGlow }]}>
          <Text style={[rowStyles.avatarText, { color: T.accent }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[rowStyles.name, { color: T.text }]}>{client.full_name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {levelLabel && (
              <View style={{ backgroundColor: levelColor + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: levelColor }}>{levelLabel}</Text>
              </View>
            )}
            <Text style={{ fontSize: 11, color: T.textMuted }} numberOfLines={1}>
              {client.plan_name ?? 'Sin plan'}
              {client.promotion_title ? ` · 🎁 ${client.promotion_title}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onPlan} style={[rowStyles.planBtn, { borderColor: T.accent + '55' }]}>
          <Text style={{ fontSize: 11, color: T.accent, fontWeight: '700' }}>
            {client.plan_name ? '🔄' : '➕'} Plan
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  planBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
});

// ─── Pending row ──────────────────────────────────────────────
interface PendingUser {
  id: string; full_name: string; requested_role: string | null;
  approval_status: string; created_at: string;
}

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

  const reject = () => Alert.alert('Rechazar', `¿Rechazar a ${item.full_name}?`, [
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
    <View style={[rowStyles.row, { borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[rowStyles.avatar, { backgroundColor: '#F59E0B22' }]}>
        <Text style={[rowStyles.avatarText, { color: '#F59E0B' }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.name]}>{item.full_name}</Text>
        <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          {new Date(item.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        <TouchableOpacity onPress={approve} disabled={busy}
          style={{ backgroundColor: '#00D68F', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓ Aprobar</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={reject} disabled={busy}
          style={{ borderWidth: 1, borderColor: '#FF4D6D55', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: '#FF4D6D', fontSize: 12, fontWeight: '700' }}>✕ Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Edit modal ───────────────────────────────────────────────
function EditClientModal({ clientId, client, visible, onClose, onSaved }: {
  clientId: string | null; client?: ClientWithPlan | null;
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
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
    supabase.from('profiles').select('full_name,phone,date_of_birth,is_active,client_level')
      .eq('id', clientId).single()
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
    try {
      await updateMutation.mutateAsync({ id: clientId, input: {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        date_of_birth: dob.trim() || undefined,
        client_level: clientLevel ?? undefined,
      }});
      ToastManager.show({ message: 'Cliente actualizado', type: 'success' });
      onSaved(); onClose();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'No se pudo actualizar.'); }
  };

  const handleToggle = async () => {
    if (!clientId) return;
    Alert.alert(isActive ? 'Desactivar cliente' : 'Activar cliente', '¿Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        try {
          await toggleMutation.mutateAsync({ id: clientId, isActive: !isActive });
          ToastManager.show({ message: isActive ? 'Cliente desactivado' : 'Cliente activado', type: 'info' });
          onSaved(); onClose();
        } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  const isBusy = updateMutation.isPending || toggleMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={modalStyles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[modalStyles.title, { color: T.text }]}>Editar cliente</Text>

              {(client?.plan_name || client?.promotion_title || client?.client_level) && (
                <View style={[modalStyles.infoCard, { backgroundColor: T.accentGlow, borderColor: T.accent + '33' }]}>
                  {client.plan_name && (
                    <View style={modalStyles.infoRow}>
                      <Text style={{ fontSize: 13, color: T.textSecondary }}>💳 Plan</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: T.text }}>{client.plan_name}</Text>
                    </View>
                  )}
                  {client.promotion_title && (
                    <View style={modalStyles.infoRow}>
                      <Text style={{ fontSize: 13, color: T.textSecondary }}>🎁 Promo</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: T.green }}>{client.promotion_title}</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={[modalStyles.label, { color: T.textSecondary }]}>Nombre completo</Text>
              <TextInput style={[modalStyles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={fullName} onChangeText={setFullName} placeholder="Nombre completo" placeholderTextColor={T.textMuted} />
              <Text style={[modalStyles.label, { color: T.textSecondary }]}>Teléfono</Text>
              <TextInput style={[modalStyles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={phone} onChangeText={setPhone} placeholder="+506 8888-8888" placeholderTextColor={T.textMuted} keyboardType="phone-pad" />
              <DatePickerField label="Fecha de nacimiento" value={dob} onChange={setDob} placeholder="Seleccionar fecha" maxDate={new Date()} />
              <Text style={[modalStyles.label, { color: T.textSecondary }]}>Nivel de fitness</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {([
                  { value: null, label: 'Sin nivel' },
                  { value: 'beginner', label: 'Principiante' },
                  { value: 'intermediate', label: 'Intermedio' },
                  { value: 'advanced', label: 'Avanzado' },
                ] as const).map((opt) => {
                  const active = clientLevel === opt.value;
                  return (
                    <TouchableOpacity key={String(opt.value)} onPress={() => setClientLevel(opt.value)}
                      style={{ flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center',
                        backgroundColor: active ? T.accent : T.bg, borderColor: active ? T.accent : T.border }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#fff' : T.textSecondary }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={modalStyles.actions}>
                <TouchableOpacity onPress={onClose} style={[modalStyles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={isBusy} style={[modalStyles.btn, { backgroundColor: T.accent }]}>
                  {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>}
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleToggle} disabled={isBusy}
                style={[modalStyles.toggleBtn, { borderColor: isActive ? T.red + '55' : T.green + '55', backgroundColor: isActive ? T.redSoft : T.greenSoft }]}>
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

// ─── Assign plan modal ────────────────────────────────────────
function AssignPlanModal({ client, visible, onClose, onSaved, tenantId }: {
  client: ClientWithPlan | null; visible: boolean;
  onClose: () => void; onSaved: () => void; tenantId: string;
}) {
  const T = useTheme();
  const { data: plans = [], isLoading: plansLoading } = useTenantPlans();
  const assignMutation = useAssignPlan();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [clientSubs, setClientSubs] = useState<SubscriptionRecord[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  React.useEffect(() => {
    if (!visible || !client) { setSelectedPlanId(null); setClientSubs([]); return; }
    setSelectedPlanId(null);
    setSubsLoading(true);
    getClientSubscriptions(client.id).then(setClientSubs).catch(() => setClientSubs([]))
      .finally(() => setSubsLoading(false));
  }, [visible, client?.id]);

  const subscribedPlanIds = new Set(clientSubs.map((s) => s.plan_id));
  const isLoading = plansLoading || subsLoading;

  const handleAssign = async () => {
    if (!client || !selectedPlanId) { Alert.alert('Error', 'Selecciona un plan.'); return; }
    if (subscribedPlanIds.has(selectedPlanId)) { Alert.alert('Info', 'El cliente ya tiene este plan activo.'); return; }
    const plan = plans.find((p) => p.id === selectedPlanId);
    try {
      await assignMutation.mutateAsync({ userId: client.id, tenantId, planId: selectedPlanId, planPrice: plan?.price ?? 0 });
      ToastManager.show({ message: `Plan "${plan?.name}" asignado`, type: 'success' });
      onSaved(); onClose();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'No se pudo asignar el plan.'); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: T.bgCard }]}>
          <View style={modalStyles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[modalStyles.title, { color: T.text }]}>
              Gestionar planes — {client?.full_name?.split(' ')[0]}
            </Text>
            {clientSubs.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[modalStyles.label, { color: T.textSecondary }]}>Planes activos</Text>
                {clientSubs.map((sub) => (
                  <View key={sub.id} style={[modalStyles.planOption, { backgroundColor: T.greenSoft, borderColor: T.green + '55' }]}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: T.text }}>{sub.plan?.name ?? 'Plan'}</Text>
                    <Text style={{ fontSize: 18, color: T.green }}>✓</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[modalStyles.label, { color: T.textSecondary }]}>Agregar nuevo plan</Text>
            {isLoading ? (
              <ActivityIndicator color={T.accent} style={{ marginVertical: 24 }} />
            ) : plans.map((plan) => {
              const alreadyHas = subscribedPlanIds.has(plan.id);
              const active = selectedPlanId === plan.id;
              return (
                <TouchableOpacity key={plan.id} onPress={() => !alreadyHas && setSelectedPlanId(plan.id)} disabled={alreadyHas}
                  style={[modalStyles.planOption, {
                    backgroundColor: active ? T.accent + '18' : T.bg,
                    borderColor: active ? T.accent : T.border,
                    opacity: alreadyHas ? 0.45 : 1,
                  }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>{plan.name}</Text>
                    <Text style={{ fontSize: 13, color: T.accent, fontWeight: '600', marginTop: 4 }}>
                      {plan.currency} {plan.price.toLocaleString('es-CR')} / {plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle === 'yearly' ? 'año' : 'único'}
                    </Text>
                  </View>
                  {!alreadyHas && (
                    <View style={[modalStyles.planCheck, { borderColor: active ? T.accent : T.border, backgroundColor: active ? T.accent : 'transparent' }]}>
                      {active && <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>}
                    </View>
                  )}
                  {alreadyHas && <Text style={{ fontSize: 10, color: T.green, fontWeight: '700' }}>YA TIENE</Text>}
                </TouchableOpacity>
              );
            })}
            <View style={[modalStyles.actions, { marginTop: 16 }]}>
              <TouchableOpacity onPress={onClose} style={[modalStyles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                <Text style={{ color: T.text, fontWeight: '600' }}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAssign} disabled={!selectedPlanId || assignMutation.isPending}
                style={[modalStyles.btn, { backgroundColor: selectedPlanId ? T.accent : T.bgCard, opacity: selectedPlanId ? 1 : 0.5 }]}>
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

// ─── Create client modal ──────────────────────────────────────
function CreateClientModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: () => void;
}) {
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
    if (password.length < 6) { Alert.alert('Error', 'Contraseña mínimo 6 caracteres.'); return; }
    try {
      await createMutation.mutateAsync({
        email: email.trim().toLowerCase(), password: password.trim(),
        full_name: fullName.trim(), role: 'client',
        phone: phone.trim() || undefined, date_of_birth: dob.trim() || undefined,
      });
      ToastManager.show({ message: 'Cliente creado correctamente', type: 'success' });
      reset(); onCreated(); onClose();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'No se pudo crear el cliente.'); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={modalStyles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[modalStyles.title, { color: T.text }]}>Nuevo cliente</Text>
              <Text style={[modalStyles.label, { color: T.textSecondary }]}>Nombre completo *</Text>
              <TextInput style={[modalStyles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={fullName} onChangeText={setFullName} placeholder="Nombre completo" placeholderTextColor={T.textMuted} />
              <Text style={[modalStyles.label, { color: T.textSecondary }]}>Email *</Text>
              <TextInput style={[modalStyles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={email} onChangeText={setEmail} placeholder="cliente@email.com" placeholderTextColor={T.textMuted}
                autoCapitalize="none" keyboardType="email-address" />
              <Text style={[modalStyles.label, { color: T.textSecondary }]}>Contraseña temporal *</Text>
              <TextInput style={[modalStyles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" placeholderTextColor={T.textMuted} secureTextEntry />
              <Text style={[modalStyles.label, { color: T.textSecondary }]}>Teléfono</Text>
              <TextInput style={[modalStyles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={phone} onChangeText={setPhone} placeholder="+506 8888-8888" placeholderTextColor={T.textMuted} keyboardType="phone-pad" />
              <DatePickerField label="Fecha de nacimiento" value={dob} onChange={setDob} placeholder="Seleccionar fecha" maxDate={new Date()} />
              <View style={modalStyles.actions}>
                <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[modalStyles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} style={[modalStyles.btn, { backgroundColor: T.accent }]}>
                  {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Crear</Text>}
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

// ─── Main screen ──────────────────────────────────────────────
export default function AdminClientsScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id ?? '';

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<LevelTab>('all');

  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editTargetClient, setEditTargetClient] = useState<ClientWithPlan | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [planTarget, setPlanTarget] = useState<ClientWithPlan | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // All clients (non-paginated for level counts + filtering)
  const { data: allClients = [], isLoading, error, refetch } = useClientsWithPlan();

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const { data } = await supabase.rpc('get_users_by_approval_status', { p_status: 'pending' });
      setPendingUsers((data ?? []).filter((u: PendingUser) => !u.requested_role || u.requested_role === 'client'));
    } finally { setPendingLoading(false); }
  };

  React.useEffect(() => { if (activeTab === 'pending') loadPending(); }, [activeTab]);

  // Count per level tab
  const counts = useMemo<Record<LevelTab, number>>(() => ({
    all:          allClients.length,
    beginner:     allClients.filter((c) => c.client_level === 'beginner').length,
    intermediate: allClients.filter((c) => c.client_level === 'intermediate').length,
    advanced:     allClients.filter((c) => c.client_level === 'advanced').length,
    none:         allClients.filter((c) => !c.client_level).length,
    pending:      0,
  }), [allClients]);

  // Filtered clients for the active tab + search
  const filtered = useMemo(() => {
    let list = allClients as ClientWithPlan[];
    if (activeTab === 'beginner')     list = list.filter((c) => c.client_level === 'beginner');
    if (activeTab === 'intermediate') list = list.filter((c) => c.client_level === 'intermediate');
    if (activeTab === 'advanced')     list = list.filter((c) => c.client_level === 'advanced');
    if (activeTab === 'none')         list = list.filter((c) => !c.client_level);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.full_name ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allClients, activeTab, search]);

  // Section header label for active tab
  const tabConfig = LEVEL_TABS.find((t) => t.key === activeTab);
  const sectionLabel = activeTab === 'pending'
    ? `${pendingUsers.length} pendientes`
    : `${filtered.length} cliente${filtered.length !== 1 ? 's' : ''}`;

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title="Clientes"
        subtitle={sectionLabel}
        actionLabel="+ Nuevo"
        onAction={() => setShowCreate(true)}
      />

      {/* Search bar */}
      <View style={{ paddingTop: 12 }}>
        <GlassSearchBar value={search} onChange={setSearch} />
      </View>

      {/* Level tabs */}
      <LevelTabStrip
        active={activeTab}
        counts={counts}
        pendingCount={pendingUsers.length}
        onChange={(t) => { setActiveTab(t); setSearch(''); }}
      />

      {/* Section divider */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tabConfig?.emoji} {tabConfig?.label}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
          <Text style={{ fontSize: 11, color: T.textMuted }}>{sectionLabel}</Text>
        </View>
      </View>

      {/* Content */}
      {activeTab === 'pending' ? (
        pendingLoading ? (
          <View style={{ padding: 16 }}>
            <SkeletonCard lines={2} /><SkeletonCard lines={2} />
          </View>
        ) : (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 0 }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>⏳</Text>
                <Text style={{ color: T.textMuted, fontSize: 14 }}>No hay solicitudes pendientes</Text>
              </View>
            }
            renderItem={({ item }) => (
              <PendingRow item={item} adminId={user?.id ?? ''} onDone={() => { loadPending(); refetch(); }} />
            )}
          />
        )
      ) : isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} />
        </View>
      ) : error ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: T.red, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
            No se pudieron cargar los clientes.
          </Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>
                {search ? '🔍' : tabConfig?.emoji ?? '👥'}
              </Text>
              <Text style={{ color: T.textMuted, fontSize: 14, textAlign: 'center' }}>
                {search ? `Sin resultados para "${search}"` : `No hay clientes en esta categoría`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClientRow
              client={item}
              onEdit={() => { setEditTargetId(item.id); setEditTargetClient(item); setShowEdit(true); }}
              onPlan={() => { setPlanTarget(item); setShowPlan(true); }}
            />
          )}
        />
      )}

      <EditClientModal clientId={editTargetId} client={editTargetClient} visible={showEdit}
        onClose={() => setShowEdit(false)} onSaved={() => refetch()} />
      <CreateClientModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={() => refetch()} />
      <AssignPlanModal client={planTarget} visible={showPlan} onClose={() => setShowPlan(false)}
        onSaved={() => refetch()} tenantId={tenantId} />
    </SafeAreaView>
  );
}

// ─── Modal styles ─────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
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
