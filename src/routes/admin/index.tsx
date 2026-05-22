import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Tag, ArrowRight, Wrench, Loader2, ShoppingBag, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

// ── Sparkline SVG Component ──────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

function Sparkline({ data, color, height = 40, width = 120 }: SparklineProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [animated, setAnimated] = useState(false);

  const normalized = (() => {
    if (data.length < 2) return data.map((_, i) => ({ x: i, y: 0 }));
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((v - min) / range) * (height * 0.8) - height * 0.1,
    }));
  })();

  const pathD =
    normalized.length < 2
      ? ""
      : normalized.reduce((acc, pt, i) => {
          if (i === 0) return `M ${pt.x},${pt.y}`;
          const prev = normalized[i - 1];
          const cpx = (prev.x + pt.x) / 2;
          return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
        }, "");

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    if (!animated) {
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
    } else {
      el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)";
      el.style.strokeDashoffset = "0";
    }
  }, [animated, pathD]);

  if (!pathD) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={pathD}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const qc = useQueryClient();
  const [costInput, setCostInput] = useState("79");
  const [customPreviewCategoryInput, setCustomPreviewCategoryInput] = useState("");

  // Fetch Counts

  const { data: categories } = useQuery({
    queryKey: ["admin-categories-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: categoriesList = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,label")
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ["admin-pending-orders-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-revenue-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total, status, created_at");
      if (error) throw error;

      const revenue = (data ?? [])
        .filter((o) => o.status === "done" || o.status === "processing")
        .reduce((sum, o) => sum + o.total, 0);

      const totalCount = data?.length ?? 0;

      // Build daily revenue trend for sparkline (last 14 days)
      const now = Date.now();
      const DAYS = 14;
      const buckets = Array.from({ length: DAYS }, (_, i) => {
        const dayStart = now - (DAYS - 1 - i) * 86400000;
        return { dayStart, value: 0 };
      });

      (data ?? [])
        .filter((o) => o.status === "done" || o.status === "processing")
        .forEach((o) => {
          const ts = new Date(o.created_at).getTime();
          const idx = buckets.findIndex(
            (b, i) =>
              ts >= b.dayStart &&
              (i === buckets.length - 1 || ts < buckets[i + 1].dayStart)
          );
          if (idx >= 0) buckets[idx].value += o.total;
        });

      const revenueSparkline = buckets.map((b) => b.value);

      // Order count trend (last 14 days)
      const orderBuckets = Array.from({ length: DAYS }, (_, i) => {
        const dayStart = now - (DAYS - 1 - i) * 86400000;
        return { dayStart, value: 0 };
      });

      (data ?? []).forEach((o) => {
        const ts = new Date(o.created_at).getTime();
        const idx = orderBuckets.findIndex(
          (b, i) =>
            ts >= b.dayStart &&
            (i === orderBuckets.length - 1 || ts < orderBuckets[i + 1].dayStart)
        );
        if (idx >= 0) orderBuckets[idx].value += 1;
      });

      const ordersSparkline = orderBuckets.map((b) => b.value);

      return { revenue, totalCount, revenueSparkline, ordersSparkline };
    },
  });

  // Fetch Settings

  const { data: dbAssemblyCost, isLoading: loadingSetting } = useQuery({
    queryKey: ["site-setting-assembly-cost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "default_assembly_cost")
        .maybeSingle();

      if (error) {
        console.warn("Table site_settings non migrée ou erreur :", error.message);
        return "79";
      }
      return data?.value ?? "79";
    },
  });

  const { data: dbCustomPreviewCategoryId, isLoading: loadingPreviewSetting } = useQuery({
    queryKey: ["site-setting-custom-preview-category"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "custom_builder_preview_category_id")
        .maybeSingle();
      if (error) return "";
      return data?.value ?? "";
    },
  });

  useEffect(() => {
    if (dbAssemblyCost !== undefined) {
      setCostInput(dbAssemblyCost);
    }
  }, [dbAssemblyCost]);

  useEffect(() => {
    if (dbCustomPreviewCategoryId !== undefined) {
      setCustomPreviewCategoryInput(dbCustomPreviewCategoryId);
    }
  }, [dbCustomPreviewCategoryId]);

  // Mutation

  const updateCost = useMutation({
    mutationFn: async (val: string) => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("Le coût doit être un nombre positif");

      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "default_assembly_cost", value: String(num) });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-setting-assembly-cost"] });
      toast.success("Coût d'assemblage général mis à jour !");
    },
    onError: (e: any) => {
      toast.error(`Erreur : ${e.message}`);
    },
  });

  const updateCustomPreviewCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "custom_builder_preview_category_id", value: categoryId || "case" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-setting-custom-preview-category"] });
      toast.success("Catégorie d'aperçu du builder libre mise à jour !");
    },
    onError: (e: any) => {
      toast.error(`Erreur : ${e.message}`);
    },
  });

  const handleSaveCost = (e: React.FormEvent) => {
    e.preventDefault();
    updateCost.mutate(costInput);
  };

  const handleSaveCustomPreviewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomPreviewCategory.mutate(customPreviewCategoryInput);
  };

  const revenueSparkline = stats?.revenueSparkline ?? Array(14).fill(0);
  const ordersSparkline = stats?.ordersSparkline ?? Array(14).fill(0);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
          // Vue d'ensemble
        </div>
        <h1 className="mt-1 text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Bento Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "auto auto",
        }}
      >
        {/* Card: Revenus CA — large featured (2x2) */}
        <Link
          to="/admin/orders"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md transition-all hover:shadow-[0_8px_40px_-12px_var(--color-success)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ gridColumn: "span 2", gridRow: "span 2" }}
        >
          {/* Backlit glow blob */}
          <div
            className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full blur-3xl"
            style={{ background: "color-mix(in oklab, var(--color-success) 18%, transparent)" }}
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Revenus CA
                </div>
                <div
                  className="mt-2 font-mono text-3xl font-bold tabular-nums"
                  style={{ color: "var(--color-success)" }}
                >
                  {(stats?.revenue ?? 0).toLocaleString("fr-DZ")}
                  <span className="ml-1 text-lg font-semibold opacity-70">DA</span>
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {stats?.totalCount ?? 0} commande{(stats?.totalCount ?? 0) > 1 ? "s" : ""} au total
                </div>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-colors group-hover:ring-2"
                style={{
                  background: "color-mix(in oklab, var(--color-success) 12%, transparent)",
                  ringColor: "color-mix(in oklab, var(--color-success) 25%, transparent)",
                }}
              >
                <Landmark className="h-6 w-6" style={{ color: "var(--color-success)" }} />
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-6">
              <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50">
                14 derniers jours
              </div>
              <Sparkline
                data={revenueSparkline}
                color="var(--color-success)"
                height={52}
                width={160}
              />
            </div>

            <ArrowRight
              className="mt-4 h-4 w-4 self-end opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
              style={{ color: "var(--color-success)" }}
            />
          </div>
        </Link>

        {/* Card: Commandes en attente — wide (2x1) */}
        <Link
          to="/admin/orders"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md transition-all hover:shadow-[0_8px_40px_-12px_var(--color-warning)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ gridColumn: "span 2", gridRow: "span 1" }}
        >
          <div
            className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full blur-3xl"
            style={{ background: "color-mix(in oklab, var(--color-warning) 15%, transparent)" }}
            aria-hidden="true"
          />
          <div className="relative flex h-full items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors group-hover:ring-2"
                style={{
                  background: "color-mix(in oklab, var(--color-warning) 12%, transparent)",
                }}
              >
                <ShoppingBag className="h-5 w-5" style={{ color: "var(--color-warning)" }} />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  En attente
                </div>
                <div
                  className="mt-0.5 font-mono text-4xl font-bold tabular-nums"
                  style={{ color: "var(--color-warning)" }}
                >
                  {pendingOrders ?? "—"}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Sparkline
                data={ordersSparkline}
                color="var(--color-warning)"
                height={36}
                width={90}
              />
              <ArrowRight
                className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                style={{ color: "var(--color-warning)" }}
              />
            </div>
          </div>
        </Link>

        {/* Card: Categories (1x1) */}
        <Link
          to="/admin/categories"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md transition-all hover:shadow-[0_8px_40px_-12px_var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ gridColumn: "span 1", gridRow: "span 1" }}
        >
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full blur-2xl"
            style={{ background: "color-mix(in oklab, var(--color-primary) 16%, transparent)" }}
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col justify-between">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg ring-1"
              style={{
                background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
              }}
            >
              <Tag className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Catégories
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{categories ?? "—"}</div>
            </div>
            <ArrowRight
              className="mt-3 h-3.5 w-3.5 self-end opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
              style={{ color: "var(--color-primary)" }}
            />
          </div>
        </Link>

        {/* Card: Products (1x1) */}
        <Link
          to="/admin/products"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md transition-all hover:shadow-[0_8px_40px_-12px_var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ gridColumn: "span 1", gridRow: "span 1" }}
        >
          <div
            className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full blur-2xl"
            style={{ background: "color-mix(in oklab, var(--color-primary) 16%, transparent)" }}
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col justify-between">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg ring-1"
              style={{
                background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
              }}
            >
              <Package className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Produits
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{products ?? "—"}</div>
            </div>
            <ArrowRight
              className="mt-3 h-3.5 w-3.5 self-end opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
              style={{ color: "var(--color-primary)" }}
            />
          </div>
        </Link>
      </div>

      {/* Configuration Coût d'assemblage */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md">
        <div
          className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--color-primary) 8%, transparent)" }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg ring-1"
            style={{
              background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
            }}
          >
            <Wrench className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Assemblage PC (Builder libre)</h2>
            <p className="text-xs text-muted-foreground">
              Configurez le coût de montage appliqué automatiquement aux configurations libres.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCost} className="relative mt-4 flex max-w-sm items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="global-assembly-cost">Coût d'assemblage (DA)</Label>
            <Input
              id="global-assembly-cost"
              type="number"
              min={0}
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              disabled={loadingSetting}
            />
          </div>
          <Button type="submit" disabled={updateCost.isPending || loadingSetting}>
            {updateCost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </div>

      {/* Configuration Aperçu Architecture Personnalisée */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md">
        <div
          className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--color-primary) 8%, transparent)" }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg ring-1"
            style={{
              background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
            }}
          >
            <Package className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Aperçu Builder Libre</h2>
            <p className="text-xs text-muted-foreground">
              Choisissez la catégorie dont la photo sera affichée en priorité dans l’aperçu final de l’architecture personnalisée.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCustomPreviewCategory} className="relative mt-4 flex max-w-sm items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="custom-preview-category">Catégorie mise en avant</Label>
            <select
              id="custom-preview-category"
              value={customPreviewCategoryInput}
              onChange={(e) => setCustomPreviewCategoryInput(e.target.value)}
              disabled={loadingPreviewSetting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {categoriesList.map((cat: { id: string; label: string }) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={updateCustomPreviewCategory.isPending || loadingPreviewSetting}>
            {updateCustomPreviewCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </div>

      {/* Démarrage rapide */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary mb-3">
          // Démarrage rapide
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            Consultez les{" "}
            <Link to="/admin/orders" className="text-primary hover:underline">
              commandes en attente
            </Link>{" "}
            de validation
          </li>
          <li>
            Configurez vos{" "}
            <Link to="/admin/categories" className="text-primary hover:underline">
              catégories
            </Link>{" "}
            pour organiser la boutique
          </li>
          <li>
            Ajoutez vos{" "}
            <Link to="/admin/products" className="text-primary hover:underline">
              produits
            </Link>{" "}
            avec leurs fiches techniques
          </li>
          <li>
            Gérez les frais de livraison par région sur l'onglet{" "}
            <Link to="/admin/wilayas" className="text-primary hover:underline">
              Wilayas
            </Link>
          </li>
        </ol>
      </div>
    </div>
  );
}
