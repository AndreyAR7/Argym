// Mock data for client app — structured to match future Supabase schema

export const MOCK_USER = {
  id: 'mock-user-1',
  full_name: 'Carlos Mora',
  avatar_url: null,
  streak: 7,
  joinedDaysAgo: 42,
};

export const MOCK_NEXT_APPOINTMENT = {
  id: 'apt-1',
  title: 'Sesión de Entrenamiento',
  coach_name: 'Coach Ana Rodríguez',
  start_time: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
  location: 'Sala Principal',
  appointment_type: 'in_person' as const,
  status: 'scheduled' as const,
};

export const MOCK_ROUTINE = {
  id: 'routine-1',
  name: 'Fuerza — Semana 3',
  description: 'Enfocado en tren superior e hipertrofia',
  total_exercises: 6,
  completed_exercises: 4,
  exercises: [
    { id: 'ex-1', name: 'Press de Banca', sets: 4, reps: 8, rest: 90, completed: true, muscle: 'Pecho' },
    { id: 'ex-2', name: 'Remo con Barra', sets: 4, reps: 10, rest: 90, completed: true, muscle: 'Espalda' },
    { id: 'ex-3', name: 'Press Militar', sets: 3, reps: 10, rest: 60, completed: true, muscle: 'Hombros' },
    { id: 'ex-4', name: 'Curl de Bíceps', sets: 3, reps: 12, rest: 60, completed: true, muscle: 'Bíceps' },
    { id: 'ex-5', name: 'Extensión de Tríceps', sets: 3, reps: 12, rest: 60, completed: false, muscle: 'Tríceps' },
    { id: 'ex-6', name: 'Face Pull', sets: 3, reps: 15, rest: 45, completed: false, muscle: 'Hombros' },
  ],
};

export const MOCK_NUTRITION = {
  id: 'nutrition-1',
  name: 'Plan Proteico — Fase 2',
  coach_note: 'Mantén la hidratación alta. Prioriza proteína en el desayuno.',
  daily_calories: 2400,
  protein_g: 180,
  carbs_g: 240,
  fat_g: 80,
  meals: [
    {
      id: 'meal-1',
      name: 'Desayuno',
      time: '07:00',
      completed: true,
      calories: 550,
      foods: ['Avena con proteína', 'Huevos revueltos (3)', 'Fruta'],
    },
    {
      id: 'meal-2',
      name: 'Almuerzo',
      time: '12:30',
      completed: true,
      calories: 750,
      foods: ['Arroz integral', 'Pechuga de pollo 200g', 'Ensalada verde'],
    },
    {
      id: 'meal-3',
      name: 'Merienda',
      time: '16:00',
      completed: false,
      calories: 300,
      foods: ['Batido de proteína', 'Almendras 30g'],
    },
    {
      id: 'meal-4',
      name: 'Cena',
      time: '19:30',
      completed: false,
      calories: 600,
      foods: ['Salmón 180g', 'Batata asada', 'Brócoli al vapor'],
    },
  ],
};

export const MOCK_PROGRESS = {
  weeklyActivity: [
    { day: 'L', completed: true, minutes: 55 },
    { day: 'M', completed: true, minutes: 40 },
    { day: 'X', completed: false, minutes: 0 },
    { day: 'J', completed: true, minutes: 60 },
    { day: 'V', completed: true, minutes: 45 },
    { day: 'S', completed: false, minutes: 0 },
    { day: 'D', completed: false, minutes: 0 },
  ],
  metrics: [
    { label: 'Peso', value: '78.5', unit: 'kg', change: -1.2, date: '2025-04-01' },
    { label: 'Grasa corporal', value: '18.2', unit: '%', change: -0.8, date: '2025-04-01' },
    { label: 'Masa muscular', value: '62.1', unit: 'kg', change: +0.5, date: '2025-04-01' },
  ],
  weightHistory: [79.8, 79.2, 78.9, 79.1, 78.7, 78.5],
  weekLabels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'],
  completionRate: 71,
  totalWorkouts: 18,
  totalMinutes: 920,
};

export const MOCK_VIDEOS = [
  {
    id: 'vid-1',
    title: 'Técnica perfecta: Press de Banca',
    duration: '8:24',
    level: 'intermediate' as const,
    category: 'Fuerza',
    thumbnail_color: '#6C63FF',
    is_assigned: true,
    views: 1240,
  },
  {
    id: 'vid-2',
    title: 'Calentamiento dinámico completo',
    duration: '12:10',
    level: 'beginner' as const,
    category: 'Movilidad',
    thumbnail_color: '#00D68F',
    is_assigned: true,
    views: 3820,
  },
  {
    id: 'vid-3',
    title: 'Nutrición para ganar músculo',
    duration: '15:45',
    level: 'beginner' as const,
    category: 'Nutrición',
    thumbnail_color: '#FF8C42',
    is_assigned: true,
    views: 5610,
  },
  {
    id: 'vid-4',
    title: 'Entrenamiento HIIT avanzado',
    duration: '22:00',
    level: 'advanced' as const,
    category: 'Cardio',
    thumbnail_color: '#FF4D6D',
    is_assigned: false,
    views: 890,
  },
  {
    id: 'vid-5',
    title: 'Recuperación y movilidad post-entreno',
    duration: '18:30',
    level: 'beginner' as const,
    category: 'Recuperación',
    thumbnail_color: '#4DA6FF',
    is_assigned: true,
    views: 2100,
  },
];

export const MOCK_PROMOTION = {
  id: 'promo-1',
  title: '🎉 Oferta especial — 30% OFF',
  description: 'Actualiza tu plan este mes y ahorra en tu suscripción anual.',
  type: 'discount' as const,
  discount_percentage: 30,
  is_active: true,
  end_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
};

export const MOCK_SUBSCRIPTION = {
  plan_name: 'Plan Pro',
  status: 'active' as const,
  billing_cycle: 'monthly' as const,
  price: 29900,
  currency: 'CRC',
  next_billing: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString(),
};
