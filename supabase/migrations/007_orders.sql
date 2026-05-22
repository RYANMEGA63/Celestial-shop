-- Migration 007: Commandes et lignes de commande
CREATE TABLE IF NOT EXISTS orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','done','rejected')),
  customer_name   text NOT NULL,
  company         text,
  email           text NOT NULL,
  phone           text NOT NULL,
  address         text NOT NULL,
  delivery_type   text NOT NULL CHECK (delivery_type IN ('bureau','domicile')),
  wilaya_id       integer REFERENCES wilayas(id),
  wilaya_name     text NOT NULL,
  delivery_cost   integer NOT NULL DEFAULT 0,
  subtotal        integer NOT NULL,
  total           integer NOT NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type     text NOT NULL CHECK (item_type IN ('product','pc_model','free_build')),
  reference_id  text,
  name          text NOT NULL,
  image_url     text,
  unit_price    integer NOT NULL,
  quantity      integer NOT NULL DEFAULT 1,
  description   text,
  specs         jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (place an order)
CREATE POLICY "orders_insert_public" ON orders FOR INSERT WITH CHECK (true);
-- Only authenticated (admin) can read/update/delete
CREATE POLICY "orders_admin_all"     ON orders FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "order_items_insert_public" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_admin_all"     ON order_items FOR ALL USING (auth.role() = 'authenticated');

-- Index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
