export type NutritionStatus = 'draft' | 'published' | 'archived';

export interface NutritionPlan {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  calories_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  goal: string | null;
  status: NutritionStatus;
  is_template: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionAssignment {
  id: string;
  nutrition_plan_id: string;
  client_id: string;
  tenant_id: string;
  assigned_by: string | null;
  assigned_at: string;
  note: string | null;
  nutrition_plan?: NutritionPlan;
}

export const NUTRITION_STATUS_LABELS: Record<NutritionStatus, string> = {
  draft:     'Borrador',
  published: 'Publicado',
  archived:  'Archivado',
};
