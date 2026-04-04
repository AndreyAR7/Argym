// Admin mock data — structured to connect to Supabase later

export const ADMIN_KPI = {
  activeClients: 47,
  appointmentsToday: 8,
  appointmentsWeek: 34,
  monthlyRevenue: 1_240_000,
  currency: 'CRC',
  activePlans: 3,
  activePromotions: 2,
  newClientsThisMonth: 6,
  churnRate: 2.1,
};

export const ADMIN_RECENT_ACTIVITY = [
  { id: '1', type: 'client', icon: '👤', text: 'María González se registró', time: 'Hace 15min', color: '#10B981' },
  { id: '2', type: 'appointment', icon: '📅', text: 'Cita cancelada — Carlos Mora', time: 'Hace 1h', color: '#EF4444' },
  { id: '3', type: 'payment', icon: '💳', text: 'Pago recibido — Plan Pro', time: 'Hace 2h', color: '#3B82F6' },
  { id: '4', type: 'routine', icon: '💪', text: 'Rutina asignada a Ana Rodríguez', time: 'Hace 3h', color: '#8B5CF6' },
  { id: '5', type: 'promo', icon: '🏷️', text: 'Promoción activada — 30% OFF', time: 'Ayer', color: '#F59E0B' },
];

export const ADMIN_ALERTS = [
  { id: '1', type: 'warning', text: '3 citas sin confirmar para mañana', action: 'Revisar' },
  { id: '2', type: 'info', text: '2 clientes sin plan asignado', action: 'Asignar' },
];

export const MOCK_CLIENTS = [
  { id: 'c1', full_name: 'María González', email: 'maria@demo.com', status: 'active', plan: 'Plan Pro', coach: 'Ana Rodríguez', joined: '2025-01-15', level: 'intermediate' },
  { id: 'c2', full_name: 'Carlos Mora', email: 'carlos@demo.com', status: 'active', plan: 'Plan Starter', coach: 'Luis Pérez', joined: '2025-02-01', level: 'beginner' },
  { id: 'c3', full_name: 'Ana Rodríguez', email: 'ana@demo.com', status: 'active', plan: 'Plan Pro', coach: 'Ana Rodríguez', joined: '2024-11-20', level: 'advanced' },
  { id: 'c4', full_name: 'Diego Vargas', email: 'diego@demo.com', status: 'inactive', plan: null, coach: null, joined: '2025-03-10', level: 'beginner' },
  { id: 'c5', full_name: 'Sofía Castro', email: 'sofia@demo.com', status: 'active', plan: 'Plan Enterprise', coach: 'Luis Pérez', joined: '2024-09-05', level: 'intermediate' },
];

export const MOCK_APPOINTMENTS = [
  { id: 'a1', title: 'Sesión de Fuerza', client: 'María González', coach: 'Ana Rodríguez', start_time: new Date(Date.now() + 2 * 3600000).toISOString(), status: 'scheduled', type: 'in_person' },
  { id: 'a2', title: 'Consulta Nutricional', client: 'Carlos Mora', coach: 'Luis Pérez', start_time: new Date(Date.now() + 5 * 3600000).toISOString(), status: 'confirmed', type: 'virtual' },
  { id: 'a3', title: 'Evaluación Física', client: 'Ana Rodríguez', coach: 'Ana Rodríguez', start_time: new Date(Date.now() - 1 * 3600000).toISOString(), status: 'completed', type: 'in_person' },
  { id: 'a4', title: 'Sesión HIIT', client: 'Sofía Castro', coach: 'Luis Pérez', start_time: new Date(Date.now() + 24 * 3600000).toISOString(), status: 'scheduled', type: 'in_person' },
  { id: 'a5', title: 'Coaching Mental', client: 'Diego Vargas', coach: 'Ana Rodríguez', start_time: new Date(Date.now() - 3 * 3600000).toISOString(), status: 'cancelled', type: 'virtual' },
];

export const MOCK_ROUTINES = [
  { id: 'r1', name: 'Fuerza — Tren Superior', exercises: 6, assigned_to: 12, level: 'intermediate', created_by: 'Ana Rodríguez', is_template: true },
  { id: 'r2', name: 'HIIT Cardio 30min', exercises: 8, assigned_to: 7, level: 'advanced', created_by: 'Luis Pérez', is_template: true },
  { id: 'r3', name: 'Movilidad y Flexibilidad', exercises: 10, assigned_to: 18, level: 'beginner', created_by: 'Ana Rodríguez', is_template: true },
  { id: 'r4', name: 'Fuerza — Tren Inferior', exercises: 5, assigned_to: 9, level: 'intermediate', created_by: 'Luis Pérez', is_template: true },
];

export const MOCK_NUTRITION_PLANS = [
  { id: 'n1', name: 'Plan Proteico Fase 1', calories: 2200, clients: 8, created_by: 'Ana Rodríguez', goal: 'Ganancia muscular' },
  { id: 'n2', name: 'Plan Definición', calories: 1800, clients: 5, created_by: 'Luis Pérez', goal: 'Pérdida de grasa' },
  { id: 'n3', name: 'Plan Mantenimiento', calories: 2000, clients: 11, created_by: 'Ana Rodríguez', goal: 'Mantenimiento' },
];

export const MOCK_ADMIN_VIDEOS = [
  { id: 'v1', title: 'Técnica: Press de Banca', level: 'intermediate', category: 'Fuerza', assigned_clients: 12, is_active: true, duration: '8:24' },
  { id: 'v2', title: 'Calentamiento Dinámico', level: 'beginner', category: 'Movilidad', assigned_clients: 28, is_active: true, duration: '12:10' },
  { id: 'v3', title: 'HIIT Avanzado 20min', level: 'advanced', category: 'Cardio', assigned_clients: 4, is_active: true, duration: '22:00' },
  { id: 'v4', title: 'Nutrición para Atletas', level: 'beginner', category: 'Nutrición', assigned_clients: 19, is_active: false, duration: '15:45' },
];
