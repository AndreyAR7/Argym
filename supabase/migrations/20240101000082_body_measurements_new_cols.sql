-- ============================================================
-- Migration 000082: Add new circumference columns to body_measurements
--
-- The table existed before 000081 (created outside migrations).
-- This migration safely adds the new columns that 000081's
-- CREATE TABLE IF NOT EXISTS skipped.
-- ============================================================

ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS neck_cm      NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS shoulder_cm  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS abdomen_cm   NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS thigh_cm     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS calf_cm      NUMERIC(5,1);
