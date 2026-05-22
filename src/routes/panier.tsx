import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCartContext } from "@/lib/cartContext";
import type { CartItem, CartItemSpec } from "@/lib/types";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  Cpu,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Mon Panier — Celestial Shop" },
      { name: "description", content: "Votre panier d'achat Celestial Shop." },
    ],
  }),
  component: PanierPage,
});

function isSlotSpecs(
  specs: CartItem["specs"]
): specs is CartItemSpec[] {
  return Array.isArray(specs);
}

function CartItemTypeIcon({ type }: { type: CartItem["type"] }) {
  if (type === "pc_model")
    return <Cpu className="h-3.5 w-3.5 text-primary" />;
  if (type === "free_build")
    return <Wrench className="h-3.5 w-3.5 text-primary" />;
  return <Package className="h-3.5 w-3.5 text-primary" />;
}

function CartItemTypeLabel({ type }: { type: CartItem["type"] }) {
  if (type === "pc_model") return "Modèle PC";
  if (type === "free_build") return "Config. personnalisée";
  return "Produit";
}

function CartItemRow({ item }: { item: CartItem }) {
  const { updateQty, remove } = useCartContext();
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasDetails =
    item.specs && isSlotSpecs(item.specs) && item.specs.length > 0;

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      remove(item.cartId);
    }, 350);
  };

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isDeleting
          ? "opacity-0 -translate-x-8 max-h-0 !mt-0 overflow-hidden pointer-events-none"
          : "max-h-[800px] opacity-100"
      }`}
    >
      <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_45px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden transition-all duration-300">
        <div className="flex gap-4 p-4">
          {/* Image */}
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.01]">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CartItemTypeIcon type={item.type} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                <CartItemTypeLabel type={item.type} />
              </span>
            </div>
            <div className="font-semibold text-sm leading-tight truncate">
              {item.name}
            </div>
            {item.description && (
              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {item.description}
              </div>
            )}

            {hasDetails && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-300 ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
                {expanded ? "Masquer" : "Voir"} les composants
              </button>
            )}
          </div>

          {/* Price + Qty */}
          <div className="flex flex-col items-end justify-between shrink-0">
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-foreground">
                {(item.unit_price * item.quantity).toLocaleString("fr-DZ")} DA
              </div>
              {item.quantity > 1 && (
                <div className="text-[11px] text-muted-foreground">
                  {item.unit_price.toLocaleString("fr-DZ")} DA / u.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              {/* Qty controls — only for simple products */}
              {item.type === "product" && (
                <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.01] overflow-hidden">
                  <button
                    onClick={() => updateQty(item.cartId, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center font-mono text-xs font-semibold text-foreground/90">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.cartId, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )}

              <button
                onClick={handleDelete}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        {/* Component details */}
        {hasDetails && expanded && (
          <div className="px-4 pb-4 pt-0">
            <div className="border-t border-white/[0.08] pt-4 space-y-2">
              {item.specs.map((slot, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {slot.image_url && (
                      <img
                        src={slot.image_url}
                        alt={slot.product}
                        className="h-6 w-6 shrink-0 rounded object-cover border border-white/[0.05]"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block leading-none mb-0.5">
                        {slot.category}
                      </span>
                      <span className="text-xs text-foreground font-medium truncate block leading-tight">
                        {slot.product}
                      </span>
                    </div>
                  </div>
                  {item.type !== "pc_model" && (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground/80">
                      {slot.price.toLocaleString("fr-DZ")} DA
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PanierPage() {
  const { items, totalPrice, clear } = useCartContext();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-[0_8px_30px_rgba(0,0,0,0.3)] rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.01]">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h1 className="text-2xl font-bold">Votre panier est vide</h1>
          <p className="text-sm text-muted-foreground">
            Ajoutez des composants depuis la boutique ou configurez votre PC sur mesure.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <Link
              to="/boutique"
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_4px_20px_-8px_var(--color-primary)]"
            >
              Voir la boutique
            </Link>
            <Link
              to="/configurateur"
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.01] px-5 py-2.5 text-sm font-semibold hover:border-primary/40 hover:bg-white/[0.03] transition-all duration-200"
            >
              Configurateur PC
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
            // Panier
          </div>
          <h1 className="mt-1 text-2xl font-bold">
            Mon panier{" "}
            <span className="text-muted-foreground font-normal text-base">
              ({items.length} article{items.length > 1 ? "s" : ""})
            </span>
          </h1>
        </div>
        <button
          onClick={clear}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.01] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
          Vider le panier
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Items list */}
        <div className="space-y-3">
          {items.map((item) => (
            <CartItemRow key={item.cartId} item={item} />
          ))}

          <div className="flex gap-3 pt-2">
            <Link
              to="/boutique"
              className="rounded-lg border border-white/[0.08] bg-white/[0.01] px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white/[0.03] transition-all duration-200"
            >
              ← Continuer mes achats
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="sticky top-20 h-fit">
          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_45px_rgba(0,0,0,0.5)] transition-all duration-300 rounded-xl p-5 space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              // Récapitulatif
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.cartId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[160px]">
                    {item.name}{" "}
                    {item.quantity > 1 && (
                      <span className="text-xs">×{item.quantity}</span>
                    )}
                  </span>
                  <span className="font-mono font-medium shrink-0 ml-2">
                    {(item.unit_price * item.quantity).toLocaleString("fr-DZ")} DA
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.05] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sous-total</span>
                <span className="font-mono font-semibold">
                  {totalPrice.toLocaleString("fr-DZ")} DA
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Livraison</span>
                <span>Calculée à l'étape suivante</span>
              </div>
            </div>

            <button
              onClick={() => navigate({ to: "/commander" })}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_4px_20px_-8px_var(--color-primary)] cursor-pointer"
            >
              Commander
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              Paiement à la livraison · Algérie uniquement
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
