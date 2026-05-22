// Shared types for products and categories (used across Supabase + components)

export interface Category {
  id: string;
  label: string;
  slug: string;
  is_customizable?: boolean;
  default_attributes?: string[];
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category_id: string;
  category?: Category;
  price: number;
  image_url: string;
  tagline: string;
  socket?: string | null;
  chipset?: string | null;
  ram_type?: string | null;
  form_factor?: string | null;
  tdp?: number | null;
  specs: Record<string, string>;
  created_at?: string;
}

// ── Modèles PC pré-configurés ──────────────────────────────────────────────

export interface PcModel {
  id: string;
  name: string;
  description: string | null;
  fixed_price: number;
  assembly_cost: number;
  is_published: boolean;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
  slots?: PcModelSlot[];
}

export interface PcModelSlot {
  id: string;
  model_id: string;
  category_id: string;
  product_id: string | null;
  is_customizable: boolean;
  sort_order: number;
  category?: Category;
  product?: Product | null;
}

// ── Panier ─────────────────────────────────────────────────────────────────

export type CartItemType = 'product' | 'pc_model' | 'free_build';

export interface CartItemSpec {
  category: string;
  product: string;
  price: number;
  image_url?: string;
}

export interface CartItem {
  /** Unique cart entry ID (generated client-side) */
  cartId: string;
  type: CartItemType;
  /** Reference to original product/model id (for display only) */
  reference_id?: string;
  name: string;
  image_url?: string;
  unit_price: number;
  quantity: number;
  description?: string;
  /** For products: their specs. For builds: array of slot snapshots */
  specs?: Record<string, string> | CartItemSpec[];
}

// ── Wilayas ────────────────────────────────────────────────────────────────

export interface Wilaya {
  id: number;
  code: number;
  name: string;
  delivery_cost: number;
  is_active: boolean;
}

// ── Commandes ──────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'done' | 'rejected';
export type DeliveryType = 'bureau' | 'domicile';

export interface Order {
  id: string;
  status: OrderStatus;
  customer_name: string;
  company?: string | null;
  email: string;
  phone: string;
  address: string;
  delivery_type: DeliveryType;
  wilaya_id: number;
  wilaya_name: string;
  delivery_cost: number;
  subtotal: number;
  total: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_type: CartItemType;
  reference_id?: string | null;
  name: string;
  image_url?: string | null;
  unit_price: number;
  quantity: number;
  description?: string | null;
  specs?: Record<string, string> | CartItemSpec[] | null;
}
