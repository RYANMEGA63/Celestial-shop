-- ============================================================
-- Migration 002 : Modèles PC pré-configurés
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- Table principale : modèles PC
CREATE TABLE IF NOT EXISTS pc_models (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  description   TEXT,
  assembly_cost INTEGER     NOT NULL DEFAULT 79,
  is_published  BOOLEAN     NOT NULL DEFAULT true,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Slots par modèle (un slot = une catégorie avec un produit pré-sélectionné)
CREATE TABLE IF NOT EXISTS pc_model_slots (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id        UUID    NOT NULL REFERENCES pc_models(id) ON DELETE CASCADE,
  category_id     UUID    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  product_id      UUID    REFERENCES products(id) ON DELETE SET NULL,
  is_customizable BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE pc_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_model_slots ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les deux tables
CREATE POLICY "Public read pc_models"      ON pc_models      FOR SELECT USING (true);
CREATE POLICY "Public read pc_model_slots" ON pc_model_slots FOR SELECT USING (true);

-- Écriture réservée aux utilisateurs authentifiés
CREATE POLICY "Auth write pc_models"      ON pc_models      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write pc_model_slots" ON pc_model_slots FOR ALL USING (auth.role() = 'authenticated');
