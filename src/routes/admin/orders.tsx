import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus, OrderItem, CartItemSpec } from "@/lib/types";
import {
  Loader2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  X,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

// ── Status configuration ─────────────────────────────────────────────────────

const STATUS_MAP: Record<
  OrderStatus,
  { label: string; badgeStyle: React.CSSProperties; dotColor: string; icon: any }
> = {
  pending: {
    label: "En attente",
    badgeStyle: {
      background: "color-mix(in oklab, hsl(38 92% 50%) 10%, transparent)",
      color: "hsl(38 92% 50%)",
      borderColor: "color-mix(in oklab, hsl(38 92% 50%) 25%, transparent)",
    },
    dotColor: "hsl(38 92% 50%)",
    icon: Clock,
  },
  processing: {
    label: "En préparation",
    badgeStyle: {
      background: "color-mix(in oklab, hsl(200 95% 55%) 10%, transparent)",
      color: "hsl(200 95% 55%)",
      borderColor: "color-mix(in oklab, hsl(200 95% 55%) 25%, transparent)",
    },
    dotColor: "hsl(200 95% 55%)",
    icon: Truck,
  },
  done: {
    label: "Fait",
    badgeStyle: {
      background: "color-mix(in oklab, hsl(160 84% 45%) 10%, transparent)",
      color: "hsl(160 84% 45%)",
      borderColor: "color-mix(in oklab, hsl(160 84% 45%) 25%, transparent)",
    },
    dotColor: "hsl(160 84% 45%)",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Refusé",
    badgeStyle: {
      background: "color-mix(in oklab, hsl(0 84% 60%) 10%, transparent)",
      color: "hsl(0 84% 60%)",
      borderColor: "color-mix(in oklab, hsl(0 84% 60%) 25%, transparent)",
    },
    dotColor: "hsl(0 84% 60%)",
    icon: XCircle,
  },
};

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_MAP[status];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
      style={meta.badgeStyle}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {meta.label}
    </span>
  );
}

// ── Sliding Tabs ─────────────────────────────────────────────────────────────

type TabKey = OrderStatus | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "processing", label: "En préparation" },
  { key: "done", label: "Fait" },
  { key: "rejected", label: "Refusé" },
];

interface SlidingTabsProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  counts: Record<TabKey, number>;
}

function SlidingTabs({ active, onChange, counts }: SlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const idx = TABS.findIndex((t) => t.key === active);
    const tab = tabRefs.current[idx];
    const container = containerRef.current;
    if (!tab || !container) return;
    const containerRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    setIndicator({
      left: tabRect.left - containerRect.left,
      width: tabRect.width,
    });
  }, [active]);

  useEffect(() => {
    updateIndicator();
  }, [active, updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-muted/20 p-1"
      role="tablist"
      aria-label="Filtrer les commandes"
    >
      {/* Sliding indicator */}
      <span
        className="pointer-events-none absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          background: "color-mix(in oklab, var(--color-primary) 14%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-primary) 22%, transparent)",
        }}
        aria-hidden="true"
      />

      {TABS.map((tab, idx) => {
        const isActive = active === tab.key;
        const count = counts[tab.key];
        return (
          <button
            key={tab.key}
            ref={(el) => { tabRefs.current[idx] = el; }}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className="relative z-10 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-muted-foreground)",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {tab.label}
            {count > 0 && (
              <span
                className="rounded-md px-1 py-px text-[9px] tabular-nums"
                style={
                  isActive
                    ? {
                        background: "color-mix(in oklab, var(--color-primary) 18%, transparent)",
                        color: "var(--color-primary)",
                      }
                    : {
                        background: "color-mix(in oklab, var(--color-foreground) 8%, transparent)",
                        color: "var(--color-muted-foreground)",
                      }
                }
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSlotSpecs(specs: any): specs is CartItemSpec[] {
  return Array.isArray(specs);
}

// ── Order Detail Drawer ───────────────────────────────────────────────────────

interface DrawerProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  isMutating: boolean;
}

function OrderDrawer({ order, open, onClose, onStatusChange, isMutating }: DrawerProps) {
  // Retain order data during close animation
  const [displayOrder, setDisplayOrder] = useState<Order | null>(order);

  useEffect(() => {
    if (order) setDisplayOrder(order);
  }, [order]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setDisplayOrder(null), 350);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: open ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
          backdropFilter: open ? "blur(4px)" : "blur(0px)",
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Détails de la commande"
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-350 ease-out"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          transitionTimingFunction: open
            ? "cubic-bezier(0.22, 1, 0.36, 1)"
            : "cubic-bezier(0.55, 0, 1, 0.45)",
        }}
      >
        {displayOrder ? (
          <>
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  // Détails commande
                </div>
                <h2 className="mt-0.5 font-mono text-base font-bold">
                  N° {displayOrder.id.split("-")[0].toUpperCase()}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <StatusBadge status={displayOrder.status} />
                <button
                  onClick={onClose}
                  aria-label="Fermer le panneau"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
              {/* Status Update Actions */}
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Changer le statut
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["pending", "processing", "done", "rejected"] as OrderStatus[]).map((status) => {
                    const meta = STATUS_MAP[status];
                    const isActive = displayOrder.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => !isActive && onStatusChange(displayOrder.id, status)}
                        disabled={isActive || isMutating}
                        className="rounded-lg border px-2.5 py-2 text-center font-mono text-[10px] uppercase tracking-wider transition-all disabled:cursor-not-allowed"
                        style={
                          isActive
                            ? {
                                ...meta.badgeStyle,
                                fontWeight: 600,
                                opacity: 1,
                              }
                            : {
                                background: "transparent",
                                color: "var(--color-muted-foreground)",
                                borderColor: "var(--color-border)",
                              }
                        }
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            const el = e.currentTarget;
                            el.style.background = `color-mix(in oklab, ${meta.dotColor} 8%, transparent)`;
                            el.style.borderColor = `color-mix(in oklab, ${meta.dotColor} 22%, transparent)`;
                            el.style.color = meta.dotColor;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            const el = e.currentTarget;
                            el.style.background = "transparent";
                            el.style.borderColor = "var(--color-border)";
                            el.style.color = "var(--color-muted-foreground)";
                          }
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Client Info */}
              <div className="space-y-2.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Informations Client
                </span>
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-foreground">{displayOrder.customer_name}</div>
                  {displayOrder.company && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-3.5 w-3.5 shrink-0" />
                      {displayOrder.company}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <a href={`tel:${displayOrder.phone}`} className="font-mono hover:text-foreground hover:underline transition-colors">
                      {displayOrder.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${displayOrder.email}`} className="hover:text-foreground hover:underline transition-colors truncate">
                      {displayOrder.email}
                    </a>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div>
                      {displayOrder.address}
                      <div className="font-semibold text-foreground mt-0.5">
                        {displayOrder.wilaya_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Livraison :</span>
                    <span className="font-semibold capitalize text-foreground">
                      {displayOrder.delivery_type === "domicile"
                        ? "A Domicile"
                        : "En Bureau / Agence"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground">
                      {new Date(displayOrder.created_at).toLocaleDateString("fr-DZ", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Items List */}
              <div className="space-y-2.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Articles Commandés
                </span>
                <div className="space-y-3">
                  {displayOrder.order_items?.map((item: OrderItem) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border bg-muted/10 p-3 text-xs space-y-1"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                        <span className="font-semibold text-foreground">
                          {item.name}{" "}
                          <span className="text-muted-foreground font-normal">x{item.quantity}</span>
                        </span>
                        <span className="font-mono font-medium shrink-0 tabular-nums">
                          {(item.unit_price * item.quantity).toLocaleString("fr-DZ")} DA
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground italic">
                          {item.description}
                        </p>
                      )}
                      {item.specs && isSlotSpecs(item.specs) && (
                        <div className="pl-2 border-l border-border space-y-0.5 mt-1 text-[10px] text-muted-foreground">
                          {item.specs.map((slot, i) => (
                            <div key={i} className="flex justify-between gap-2">
                              <span className="truncate">
                                {slot.category}: {slot.product}
                              </span>
                              <span className="font-mono tabular-nums shrink-0">
                                {slot.price.toLocaleString("fr-DZ")} DA
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer: totals */}
            <div className="space-y-1.5 border-t border-border bg-card px-4 py-4 sm:px-5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Sous-total</span>
                <span className="font-mono tabular-nums">
                  {displayOrder.subtotal.toLocaleString("fr-DZ")} DA
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Livraison</span>
                <span className="font-mono tabular-nums">
                  {displayOrder.delivery_cost.toLocaleString("fr-DZ")} DA
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                <span>Total</span>
                <span className="font-mono tabular-nums" style={{ color: "var(--color-primary)" }}>
                  {displayOrder.total.toLocaleString("fr-DZ")} DA
                </span>
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function AdminOrders() {
  const qc = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<TabKey>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = (order: Order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders", selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .order("created_at", { ascending: false });

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });

  // Fetch all orders for counts (without status filter)
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ["admin-orders-all-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const counts: Record<TabKey, number> = {
    all: allOrders.length,
    pending: allOrders.filter((o) => o.status === "pending").length,
    processing: allOrders.filter((o) => o.status === "processing").length,
    done: allOrders.filter((o) => o.status === "done").length,
    rejected: allOrders.filter((o) => o.status === "rejected").length,
  };

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders-all-counts"] });
      toast.success("Statut de la commande mis à jour");
      if (selectedOrder && selectedOrder.id === variables.orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: variables.status } : null));
      }
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
          // Commandes
        </div>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">Gestion des commandes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les commandes des clients, suivez leur état d'avancement et visualisez les détails
          des configurations.
        </p>
      </div>

      {/* Sliding Tabs */}
      <SlidingTabs
        active={selectedStatus}
        onChange={setSelectedStatus}
        counts={counts}
      />

      {/* Order List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/25 p-8 text-center text-sm text-muted-foreground sm:p-16">
          <Package className="h-8 w-8 text-muted-foreground/30" />
          Aucune commande trouvée pour ce statut.
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => {
            const itemsCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
            const isSelected = selectedOrder?.id === order.id && drawerOpen;
            return (
              <button
                key={order.id}
                onClick={() => openDrawer(order)}
                className="group w-full cursor-pointer rounded-xl border p-4 text-left transition-all hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                  borderColor: isSelected
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                  background: isSelected
                    ? "color-mix(in oklab, var(--color-primary) 5%, transparent)"
                    : "var(--color-card)",
                  boxShadow: isSelected
                    ? "0 0 0 1px color-mix(in oklab, var(--color-primary) 20%, transparent)"
                    : "none",
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        N° {order.id.split("-")[0].toUpperCase()}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {order.customer_name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleDateString("fr-DZ")}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {order.wilaya_name}
                      </span>
                      <span>
                        {itemsCount} article{itemsCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <div className="font-mono text-sm font-bold text-foreground tabular-nums">
                      {order.total.toLocaleString("fr-DZ")} DA
                    </div>
                    <div className="text-[10px] text-muted-foreground">Livraison incluse</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Side Drawer */}
      <OrderDrawer
        order={selectedOrder}
        open={drawerOpen}
        onClose={closeDrawer}
        onStatusChange={(orderId, status) =>
          updateStatusMutation.mutate({ orderId, status })
        }
        isMutating={updateStatusMutation.isPending}
      />
    </div>
  );
}
