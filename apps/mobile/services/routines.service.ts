import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { getInfoAsync, FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import type { Routine, Exercise, RoutineAssignment, ExerciseProgress, ClientRoutine } from '@/types/routines';

const DEMO_BUCKET = 'exercise-demos';

// ─── Admin ────────────────────────────────────────────────────

export async function fetchRoutinesAdmin(tenantId: string): Promise<Routine[]> {
  const { data: routines, error } = await supabase
    .from('routines')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!routines?.length) return [];

  const routineIds = routines.map((r) => r.id);
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .in('routine_id', routineIds)
    .order('sort_order', { ascending: true });

  const exercisesByRoutine = new Map<string, Exercise[]>();
  for (const ex of (exercises ?? []) as Exercise[]) {
    const list = exercisesByRoutine.get(ex.routine_id) ?? [];
    list.push(ex);
    exercisesByRoutine.set(ex.routine_id, list);
  }

  return routines.map((r) => ({ ...r, exercises: exercisesByRoutine.get(r.id) ?? [] })) as Routine[];
}

export async function createRoutine(
  routine: Omit<Routine, 'id' | 'created_at' | 'updated_at' | 'exercises'>
): Promise<Routine> {
  const { data, error } = await supabase
    .from('routines')
    .insert(routine)
    .select('*, exercises(*)')
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function updateRoutine(id: string, updates: Partial<Omit<Routine, 'exercises'>>): Promise<void> {
  const { error } = await supabase.from('routines').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleRoutineActive(id: string, isActive: boolean): Promise<void> {
  await updateRoutine(id, { is_active: isActive });
}

// ─── Exercises ────────────────────────────────────────────────

export async function addExercise(
  exercise: Omit<Exercise, 'id'>
): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert(exercise)
    .select()
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
  const { error } = await supabase.from('exercises').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

// ─── Assignments ──────────────────────────────────────────────

export async function assignRoutineToClient(
  routineId: string,
  clientId: string,
  tenantId: string,
  assignedBy: string,
): Promise<RoutineAssignment> {
  const { data, error } = await supabase
    .from('routine_assignments')
    .upsert({ routine_id: routineId, client_id: clientId, tenant_id: tenantId, assigned_by: assignedBy })
    .select()
    .single();
  if (error) throw error;
  return data as RoutineAssignment;
}

export async function removeRoutineAssignment(routineId: string, clientId: string): Promise<void> {
  const { error } = await supabase
    .from('routine_assignments')
    .delete()
    .eq('routine_id', routineId)
    .eq('client_id', clientId);
  if (error) throw error;
}

// ─── Client ───────────────────────────────────────────────────

export async function fetchClientRoutines(
  clientId: string,
  tenantId: string,
  clientPlan?: string | null,
  clientLevel?: string | null,
): Promise<ClientRoutine[]> {
  // Get assigned routines with exercises
  const { data: assignments, error: aErr } = await supabase
    .from('routine_assignments')
    .select('routine_id')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId);
  if (aErr) throw aErr;

  // Also fetch routines accessible by plan/level (not just assigned)
  const { data: allRoutines, error: rErr } = await supabase
    .from('routines')
    .select('*, exercises(*)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (rErr) throw rErr;

  const assignedIds = new Set((assignments ?? []).map((a) => a.routine_id));

  // Filter: assigned OR (plan matches AND level matches)
  const accessibleRoutines = (allRoutines ?? []).filter((r) => {
    if (assignedIds.has(r.id)) return true;
    const planOk = r.allowed_plans.length === 0 || (clientPlan && r.allowed_plans.includes(clientPlan));
    const levelOk = r.allowed_levels.length === 0 || (clientLevel && r.allowed_levels.includes(clientLevel));
    return planOk && levelOk;
  });

  if (!accessibleRoutines.length) return [];

  const routineIds = accessibleRoutines.map((r) => r.id);

  // Fetch exercises separately as a reliable fallback
  // (in case the join doesn't work due to missing FK in Supabase)
  const { data: exercisesData, error: exErr } = await supabase
    .from('exercises')
    .select('*')
    .in('routine_id', routineIds)
    .order('sort_order', { ascending: true });
  if (exErr) throw exErr;

  const exercisesByRoutine = new Map<string, Exercise[]>();
  for (const ex of (exercisesData ?? []) as Exercise[]) {
    const list = exercisesByRoutine.get(ex.routine_id) ?? [];
    list.push(ex);
    exercisesByRoutine.set(ex.routine_id, list);
  }

  console.log('[Routines] accessible:', accessibleRoutines.length, '| exercises total:', exercisesData?.length ?? 0);
  if (exErr) console.error('[Routines] exercises fetch error:', exErr);
  if ((exercisesData?.length ?? 0) === 0 && accessibleRoutines.length > 0) {
    console.warn('[Routines] WARNING: routines found but 0 exercises — check RLS on exercises table or verify exercises exist in DB');
  }

  const { data: progressData, error: pErr } = await supabase
    .from('exercise_progress')
    .select('*')
    .in('routine_id', routineIds)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('session_date', new Date().toISOString().split('T')[0]);
  if (pErr) throw pErr;

  const progressMap = new Map((progressData ?? []).map((p) => [p.exercise_id, p as ExerciseProgress]));

  return accessibleRoutines.map((r): ClientRoutine => {
    // Use separately fetched exercises (reliable) over join result
    const exercises = exercisesByRoutine.get(r.id) ?? (r.exercises ?? []) as Exercise[];
    const progress = exercises.map((e) => progressMap.get(e.id)).filter(Boolean) as ExerciseProgress[];
    const completedCount = progress.filter((p) => p.completed).length;
    return {
      ...r,
      exercises,
      progress,
      completedCount,
      totalCount: exercises.length,
      progressPct: exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0,
    };
  });
}

// ─── Exercise Demo Videos ─────────────────────────────────────

export async function uploadExerciseDemoVideo(
  tenantId: string,
  exerciseId: string,
  file: { uri: string; mimeType: string; extension?: string },
  onProgress?: (pct: number) => void,
): Promise<string> {
  const ext = file.extension ?? 'mp4';
  const storagePath = `${tenantId}/${exerciseId}/${Date.now().toString(36)}.${ext}`;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  const accessToken = session.access_token;

  const info = await getInfoAsync(file.uri);
  const fileSize = (info as any).size as number;

  const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB for demo videos
  if (fileSize > MAX_VIDEO_SIZE) throw new Error('El video demo supera el límite de 500 MB.');

  const createRes = await fetch(`${supabaseUrl}/storage/v1/upload/resumable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/offset+octet-stream',
      'Content-Length': '0',
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(fileSize),
      'Upload-Metadata': [
        `bucketName ${btoa(DEMO_BUCKET)}`,
        `objectName ${btoa(storagePath)}`,
        `contentType ${btoa(file.mimeType)}`,
        `cacheControl ${btoa('3600')}`,
        `x-upsert ${btoa('true')}`,
      ].join(','),
    },
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Upload failed: ${createRes.status} ${body}`);
  }

  const uploadUrl = createRes.headers.get('Location');
  if (!uploadUrl) throw new Error('No se recibió URL de subida');

  onProgress?.(5);

  const result = await uploadAsync(uploadUrl, file.uri, {
    httpMethod: 'PATCH',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/offset+octet-stream',
      'Content-Length': String(fileSize),
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
    },
  });

  if (result.status !== 204 && result.status !== 200) {
    throw new Error(`Upload failed: ${result.status} ${result.body}`);
  }

  onProgress?.(100);
  return storagePath;
}

export async function deleteExerciseDemoVideo(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(DEMO_BUCKET).remove([storagePath]);
  if (error) throw error;
}

export async function getExerciseDemoSignedUrl(storagePath: string, expiresIn = 7200): Promise<string> {
  const { data, error } = await supabase.storage.from(DEMO_BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// ─── Progress ─────────────────────────────────────────────────

export async function upsertExerciseProgress(
  routineId: string,
  exerciseId: string,
  clientId: string,
  tenantId: string,
  completed: boolean,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('exercise_progress')
    .upsert(
      {
        routine_id: routineId,
        exercise_id: exerciseId,
        client_id: clientId,
        tenant_id: tenantId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        session_date: today,
      },
      { onConflict: 'exercise_id,client_id,session_date' },
    );
  if (error) throw error;
}
