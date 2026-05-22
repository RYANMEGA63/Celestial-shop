-- ============================================================
-- Migration 004 : Personnalisation des catégories
-- Exécuter dans Supabase SQL Editor
-- ============================================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN NOT NULL DEFAULT false;
