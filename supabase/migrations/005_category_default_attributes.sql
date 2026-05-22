-- ============================================================
-- Migration 005 : Attributs par défaut des catégories
-- Exécuter dans Supabase SQL Editor
-- ============================================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS default_attributes JSONB NOT NULL DEFAULT '[]'::jsonb;
