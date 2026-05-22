-- ============================================================
-- Migration 003 : Paramètres globaux du site
-- Exécuter dans Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);

-- Écriture réservée aux utilisateurs authentifiés
CREATE POLICY "Auth write site_settings" ON site_settings FOR ALL USING (auth.role() = 'authenticated');

-- Valeur par défaut pour le coût d'assemblage
INSERT INTO site_settings (key, value)
VALUES ('default_assembly_cost', '79')
ON CONFLICT (key) DO NOTHING;
