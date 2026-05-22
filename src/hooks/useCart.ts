import { useState, useEffect, useCallback } from "react";
import type { CartItem, CartItemSpec } from "@/lib/types";
import type { Product, PcModel, PcModelSlot } from "@/lib/types";

const STORAGE_KEY = "celestial_cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  // Sync to localStorage whenever items change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  // ── Add / Remove ────────────────────────────────────────────────────────

  const addProduct = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.type === "product" && i.reference_id === product.id
      );
      if (existing) {
        return prev.map((i) =>
          i.cartId === existing.cartId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      const item: CartItem = {
        cartId: genId(),
        type: "product",
        reference_id: product.id,
        name: product.name,
        image_url: product.image_url,
        unit_price: product.price,
        quantity: 1,
        description: product.tagline,
        specs: product.specs,
      };
      return [...prev, item];
    });
  }, []);

  const addModel = useCallback(
    (
      model: PcModel,
      configuredSlots: PcModelSlot[],
      totalPrice: number
    ) => {
      const slotSpecs: CartItemSpec[] = configuredSlots
        .filter((s) => s.product)
        .map((s) => ({
          category: s.category?.label ?? "Composant",
          product: s.product!.name,
          price: s.product!.price,
          image_url: s.product!.image_url,
        }));

      const item: CartItem = {
        cartId: genId(),
        type: "pc_model",
        reference_id: model.id,
        name: model.name,
        image_url: model.image_url ?? undefined,
        unit_price: totalPrice,
        quantity: 1,
        description: model.description ?? undefined,
        specs: slotSpecs,
      };
      setItems((prev) => [...prev, item]);
    },
    []
  );

  const addFreeBuild = useCallback(
    (
      components: Array<{ categoryLabel: string; product: Product }>,
      assemblyCost: number
    ) => {
      const subtotal = components.reduce((s, c) => s + c.product.price, 0);
      const total = subtotal + assemblyCost;

      const slotSpecs: CartItemSpec[] = components.map((c) => ({
        category: c.categoryLabel,
        product: c.product.name,
        price: c.product.price,
        image_url: c.product.image_url,
      }));

      const firstImage = components[0]?.product.image_url;

      const item: CartItem = {
        cartId: genId(),
        type: "free_build",
        name: "Configuration PC personnalisée",
        image_url: firstImage,
        unit_price: total,
        quantity: 1,
        description: `${components.length} composant(s) + montage (${assemblyCost.toLocaleString("fr-DZ")} DA)`,
        specs: slotSpecs,
      };
      setItems((prev) => [...prev, item]);
    },
    []
  );

  const updateQty = useCallback((cartId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.cartId !== cartId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.cartId === cartId ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const remove = useCallback((cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return {
    items,
    addProduct,
    addModel,
    addFreeBuild,
    updateQty,
    remove,
    clear,
    totalItems,
    totalPrice,
  };
}
