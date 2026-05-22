-- ============================================================
-- Migration 009 : Prix fixe pour les modèles PC
-- ============================================================

ALTER TABLE pc_models
ADD COLUMN IF NOT EXISTS fixed_price INTEGER NOT NULL DEFAULT 0;

