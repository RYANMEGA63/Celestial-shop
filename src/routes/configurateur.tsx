import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Product, Category, PcModel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import {
  Check,
  AlertTriangle,
  ShoppingCart,
  Zap,
  X,
  Loader2,
  Wrench,
  Lock,
  Cpu,
  Sliders,
  Layers,
  Monitor,
  HardDrive,
  Snowflake,
  Server,
  Box,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useCartContext } from "@/lib/cartContext";
import type { PcModelSlot } from "@/lib/types";

export const Route = createFileRoute("/configurateur")({
  head: () => ({
    meta: [
      { title: "Configurateur PC sur mesure - Celestial Shop" },
      {
        name: "description",
        content:
          "Configurez votre PC sur mesure ou choisissez un modèle pré-configuré avec compatibilité garantie et prix en temps réel.",
      },
    ],
  }),
  component: Builder,
});

// ----------------------------------------------------------------

type Build = Record<string, Product>;
type ViewMode = "libre" | "modeles";

// ----------------------------------------------------------------

function compatible(
  product: Product,
  categorySlug: string,
  build: Build,
): { ok: boolean; reason?: string } {
  const getCatSlug = (p: Product) => (p.category as Category | undefined)?.slug ?? "";
  const cpu = Object.values(build).find((p) => getCatSlug(p) === "cpu");
  const mb = Object.values(build).find((p) => getCatSlug(p) === "motherboard");
  const ram = Object.values(build).find((p) => getCatSlug(p) === "ram");

  if (categorySlug === "motherboard" && cpu?.socket && product.socket && cpu.socket !== product.socket)
    return { ok: false, reason: `Socket ${product.socket} != CPU ${cpu.socket}` };
  if (categorySlug === "cpu" && mb?.socket && product.socket && mb.socket !== product.socket)
    return { ok: false, reason: `Socket incompatible avec ${mb.name}` };
  if (categorySlug === "ram" && mb?.ram_type && product.ram_type && mb.ram_type !== product.ram_type)
    return { ok: false, reason: `${product.ram_type} != ${mb.ram_type}` };
  if (categorySlug === "motherboard" && ram?.ram_type && product.ram_type && ram.ram_type !== product.ram_type)
    return { ok: false, reason: `RAM ${ram.ram_type} requise` };
  return { ok: true };
}

// ----------------------------------------------------------------

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case "cpu":
      return Cpu;
    case "motherboard":
      return Layers;
    case "ram":
      return Server;
    case "gpu":
      return Monitor;
    case "cooler":
    case "fans":
      return Snowflake;
    case "ssd":
    case "hdd":
    case "storage":
      return HardDrive;
    case "psu":
      return Zap;
    case "case":
      return Box;
    default:
      return Wrench;
  }
};

// ----------------------------------------------------------------

const getBentoSpan = (slug: string) => {
  switch (slug) {
    case "case":
      return "sm:col-span-2 sm:row-span-2";
    case "cpu":
      return "sm:col-span-2";
    case "gpu":
      return "sm:col-span-2";
    case "motherboard":
      return "sm:col-span-2";
    default:
      return "";
  }
};

// ----------------------------------------------------------------

function Builder() {
  const { addModel, addFreeBuild } = useCartContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("libre");
  const [activeSlot, setActiveSlot] = useState<string>("");
  const [build, setBuild] = useState<Build>({});
  const [detail, setDetail] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");

  // Model mode state
  const [selectedModel, setSelectedModel] = useState<PcModel | null>(null);
  const [lockedSlots, setLockedSlots] = useState<Set<string>>(new Set());

  // ----------------------------------------------------------------

  const { data: categories = [], isLoading: loadingCats } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("label");
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories(id, label, slug)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: models = [], isLoading: loadingModels } = useQuery<PcModel[]>({
    queryKey: ["pc_models_published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pc_models")
        .select("*, slots:pc_model_slots(*, category:categories(*), product:products(*, category:categories(id,label,slug)))")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch default assembly cost
  const { data: dbAssemblyCost } = useQuery<string>({
    queryKey: ["site-setting-assembly-cost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "default_assembly_cost")
        .maybeSingle();
      if (error) return "79";
      return data?.value ?? "79";
    },
  });

  const { data: customPreviewCategoryId } = useQuery<string | null>({
    queryKey: ["site-setting-custom-preview-category"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "custom_builder_preview_category_id")
        .maybeSingle();
      if (error) return null;
      return data?.value ?? null;
    },
  });

  const defaultAssemblyCost = Number(dbAssemblyCost ?? "79");

  // ----------------------------------------------------------------

  useEffect(() => {
    if (categories.length > 0 && !activeSlot) {
      setActiveSlot(categories[0].id);
    }
  }, [categories, activeSlot]);

  // ----------------------------------------------------------------

  const isLoading = loadingCats || loadingProducts || loadingModels;
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models;

    const query = modelSearch.toLowerCase();
    return models.filter((model) => {
      const matchName = model.name.toLowerCase().includes(query);
      const matchDescription = (model.description ?? "").toLowerCase().includes(query);
      return matchName || matchDescription;
    });
  }, [models, modelSearch]);

  // Filter categories depending on selected model
  const visibleCategories = useMemo(() => {
    if (!selectedModel) return categories.filter((c) => c.is_customizable !== false);
    const modelCategoryIds = new Set((selectedModel.slots ?? []).map((s) => s.category_id));
    return categories.filter((c) => modelCategoryIds.has(c.id));
  }, [categories, selectedModel]);

  // Handle setting correct active category when model is loaded/cleared
  useEffect(() => {
    if (visibleCategories.length > 0 && !visibleCategories.some((c) => c.id === activeSlot)) {
      setActiveSlot(visibleCategories[0].id);
    }
  }, [visibleCategories, activeSlot]);

  const activeCategorySlug = useMemo(
    () => categories.find((c) => c.id === activeSlot)?.slug ?? "",
    [categories, activeSlot]
  );

  const options = useMemo(
    () => products.filter((p) => p.category_id === activeSlot),
    [products, activeSlot]
  );

  const totalPrice = Object.values(build).reduce((s, p) => s + (Number(p?.price) ?? 0), 0);
  const caseProduct = Object.values(build).find((p) => (p.category as Category)?.slug === "case");
  const customPreviewProduct = customPreviewCategoryId ? build[customPreviewCategoryId] : undefined;

  const previewProduct = useMemo(() => {
    // Applies only to the free builder (architecture personnalisée).
    if (!selectedModel && customPreviewProduct?.image_url) {
      return customPreviewProduct;
    }
    return caseProduct?.image_url ? caseProduct : null;
  }, [selectedModel, customPreviewProduct, caseProduct]);

  // Free builder uses components + assembly; PC models use fixed price.
  const effectiveAssemblyCost = selectedModel ? 0 : defaultAssemblyCost;
  const grandTotal = selectedModel
    ? Number(selectedModel.fixed_price ?? 0)
    : totalPrice + effectiveAssemblyCost;
  const filledCount = Object.keys(build).length;

  // ----------------------------------------------------------------

  const pickPart = (p: Product) => {
    const targetSlotId = p.category_id;
    if (lockedSlots.has(targetSlotId)) {
      toast.error("Ce composant est fixé par le modèle sélectionné.");
      return;
    }
    const targetCategory = categories.find((cat) => cat.id === targetSlotId);
    const targetCategorySlug = targetCategory?.slug ?? "";
    const c = compatible(p, targetCategorySlug, build);
    if (!c.ok) {
      toast.error(`Incompatible : ${c.reason}`);
      return;
    }
    const newBuild = { ...build, [targetSlotId]: p };
    setBuild(newBuild);
    toast.success(`${p.name} ajouté à la config`);
    if (targetSlotId === activeSlot) {
      const next = visibleCategories.find((cat) => !newBuild[cat.id] && cat.id !== activeSlot);
      if (next) setActiveSlot(next.id);
    }
  };

  const removePart = (catId: string) => {
    if (lockedSlots.has(catId)) {
      toast.error("Impossible de retirer un composant verrouillé.");
      return;
    }
    const { [catId]: _, ...rest } = build;
    setBuild(rest);
  };

  const loadModel = (model: PcModel) => {
    setSelectedModel(model);

    const newBuild: Build = {};
    const locked = new Set<string>();

    (model.slots ?? []).forEach((slot) => {
      if (slot.product) {
        newBuild[slot.category_id] = slot.product as Product;
      }
      if (!slot.is_customizable || slot.category?.is_customizable === false) {
        locked.add(slot.category_id);
      }
    });

    setBuild(newBuild);
    setLockedSlots(locked);
    toast.success(`Modèle "${model.name}" chargé !`);

    // Set active slot to first unlocked customizable one
    const modelCategoryIds = new Set((model.slots ?? []).map((s) => s.category_id));
    const firstCustomizable = categories.find(
      (c) => modelCategoryIds.has(c.id) && !locked.has(c.id)
    );
    if (firstCustomizable) {
      setActiveSlot(firstCustomizable.id);
    } else {
      const firstModelCat = categories.find((c) => modelCategoryIds.has(c.id));
      if (firstModelCat) setActiveSlot(firstModelCat.id);
    }
    setViewMode("libre");
  };

  const clearModel = () => {
    setSelectedModel(null);
    setLockedSlots(new Set());
    setBuild({});
    const visible = categories.filter((c) => c.is_customizable !== false);
    if (visible.length > 0) setActiveSlot(visible[0].id);
  };

  const addModelDirectToCart = (model: PcModel) => {
    const configuredSlots: PcModelSlot[] = (model.slots ?? []).map((slot) => ({
      ...slot,
      product: slot.product,
    }));
    addModel(model, configuredSlots, Number(model.fixed_price ?? 0));
    toast.success(`${model.name} ajouté au panier !`);
    navigate({ to: "/panier" });
  };

  // ----------------------------------------------------------------

  // ----------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------

  return (
    <main className="mx-auto max-w-[1400px] px-3 py-6 sm:px-4 sm:py-8">
      {/* HUD Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes neon-glow-pulse {
          0%, 100% {
            box-shadow: 0 0 5px rgba(56, 189, 248, 0.15), 0 0 10px rgba(56, 189, 248, 0.05);
          }
          50% {
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.45), 0 0 25px rgba(56, 189, 248, 0.15);
          }
        }
        .neon-pulse-btn {
          animation: neon-glow-pulse 3s infinite ease-in-out;
        }
        .grid-bg {
          background-size: 20px 20px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
        }
        .glow-cyan {
          color: #38bdf8 !important;
          filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.7));
        }
      `}} />

      {/* Page header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-sky-500">
            // Studio d'ingénierie
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Configuration PC
          </h1>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            Vérification de compatibilité en temps réel · contrôle de puissance et TDP
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border/40 bg-card/30 p-1 backdrop-blur-md md:w-auto md:self-auto">
          <button
            onClick={() => setViewMode("libre")}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
              viewMode === "libre"
                ? "bg-sky-500/10 text-[#38bdf8] ring-1 ring-sky-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Builder libre
          </button>
          <button
            onClick={() => setViewMode("modeles")}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
              viewMode === "modeles"
                ? "bg-sky-500/10 text-[#38bdf8] ring-1 ring-sky-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Modèles
            {models.length > 0 && (
              <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[8px] font-bold text-[#38bdf8]">
                {models.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Model banner */}
      {selectedModel && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-[#38bdf8] glow-cyan" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-sky-400">
                Modèle de base actif
              </div>
              <div className="text-sm font-semibold tracking-wide text-foreground">
                {selectedModel.name}
              </div>
            </div>
            {lockedSlots.size > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 px-2.5 py-0.5 font-mono text-[9px] text-orange-400">
                <Lock className="h-3 w-3" />
                {lockedSlots.size} slot{lockedSlots.size > 1 ? "s" : ""} verrouillé{lockedSlots.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={clearModel}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-red-400 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest">
            Initialisation du système...
          </p>
        </div>
      ) : viewMode === "modeles" ? (
        // ----------------------------------------------------------------
        // MODE MODÈLES
        // ----------------------------------------------------------------
        <div>
          <div className="mb-6 rounded-xl border border-border/30 bg-card/30 p-4 backdrop-blur-md">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-sky-400">
              Recherche modele
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="h-10 border-border/40 bg-background/70 pl-9"
                placeholder="Chercher un nom ou un mot de la description"
              />
            </div>
          </div>

          {models.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-24 text-center">
              <Cpu className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-mono text-xs text-muted-foreground">
                Aucun modèle disponible pour l'instant.
              </p>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-24 text-center">
              <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-mono text-xs text-muted-foreground">
                Aucun modele ne correspond a votre recherche.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:gap-6 xl:grid-cols-3">
              {filteredModels.map((model) => {
                const slots = model.slots ?? [];
                const lockedCount = slots.filter((s) => !s.is_customizable).length;
                const customizableCount = slots.filter((s) => s.is_customizable).length;

                return (
                  <div
                    key={model.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border/30 bg-card/30 backdrop-blur-md transition-all duration-300 hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted/10 border-b border-border/30">
                      {model.image_url ? (
                        <img
                          src={model.image_url}
                          alt={model.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-card/20">
                          <Cpu className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-white/60">
                            PC Configuré
                          </div>
                          <div className="text-base font-bold text-white tracking-wide">{model.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[9px] text-white/50">Prix fixe</div>
                          <div className="font-mono text-base font-bold text-emerald-400" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {Number(model.fixed_price ?? 0).toLocaleString("fr-FR")} DA
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex flex-1 flex-col p-5">
                      {model.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {model.description}
                        </p>
                      )}

                      {/* Slot summary */}
                      <div className="mt-4 space-y-2 border-t border-border/20 pt-4 flex-1">
                        {slots.slice(0, 4).map((s) => {
                          const prod = s.product as Product | undefined;
                          return (
                            <div key={s.id} className="flex items-center justify-between gap-3">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/80">
                                {(s.category as Category | undefined)?.label}
                              </span>
                              <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                                {!s.is_customizable && (
                                  <Lock className="h-3 w-3 text-orange-400 shrink-0" />
                                )}
                                <span className="text-xs text-foreground font-medium truncate">
                                  {prod ? prod.name : "Non sélectionné"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {slots.length > 4 && (
                          <div className="font-mono text-[9px] text-muted-foreground/60 pt-1">
                            + {slots.length - 4} autre{slots.length - 4 > 1 ? "s" : ""} catégorie{slots.length - 4 > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="mt-4 flex flex-wrap gap-1.5 pt-2 border-t border-border/10">
                        <span className="rounded-md bg-sky-500/10 px-2 py-1 font-mono text-[9px] text-[#38bdf8] border border-sky-500/15">
                          Prix fixe
                        </span>
                        {lockedCount > 0 && (
                          <span className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 font-mono text-[9px] text-orange-400 border border-orange-500/15">
                            <Lock className="h-2.5 w-2.5" />
                            {lockedCount} fixe{lockedCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {customizableCount > 0 && (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-[9px] text-emerald-400 border border-emerald-500/15">
                            {customizableCount} libre{customizableCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <Button
                        className="mt-5 w-full bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs uppercase tracking-wider py-5"
                        onClick={() => addModelDirectToCart(model)}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Ajouter au panier
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // ----------------------------------------------------------------
        // MODE BUILDER LIBRE - LAYOUT ASYMMÉTRIQUE
        // ----------------------------------------------------------------
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* COLUMN LEFT: Bento Grid & Product Options Selector (col-span-8) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            
            {/* Bento Grid slots */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:grid-flow-dense">
              {visibleCategories.map((cat, i) => {
                const filled = !!build[cat.id];
                const isActive = activeSlot === cat.id;
                const isLocked = lockedSlots.has(cat.id);
                const selectedProd = build[cat.id];
                const IconComponent = getCategoryIcon(cat.slug);

                return (
                  <div
                    key={cat.id}
                    onClick={() => setActiveSlot(cat.id)}
                    className={`group relative flex flex-col justify-between rounded-xl p-4 transition-all duration-300 cursor-pointer border min-h-[110px] ${
                      getBentoSpan(cat.slug)
                    } ${
                      isActive
                        ? "bg-sky-950/15 border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)] ring-1 ring-sky-500/20"
                        : filled
                        ? "bg-card/40 border-border/40 hover:border-sky-500/30 hover:shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                        : "bg-card/20 border-border/20 opacity-70 hover:opacity-100 hover:border-sky-500/20"
                    }`}
                  >
                    {/* Top bar: Category Name and Icons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">
                          {String(i + 1).padStart(2, "0")} . SLOT
                        </span>
                        <span className="font-semibold text-xs tracking-wide text-foreground mt-0.5">
                          {cat.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isLocked && <Lock className="h-3 w-3 text-orange-400 shrink-0" />}
                        {filled && !isLocked && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                        <IconComponent
                          className={`h-4.5 w-4.5 transition-all duration-300 ${
                            isActive || filled
                              ? "glow-cyan text-[#38bdf8]"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Bottom part: Selected Product Details or Empty State */}
                    <div className="mt-4 flex flex-col justify-end">
                      {selectedProd ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase text-muted-foreground tracking-wide truncate">
                            {selectedProd.brand}
                          </span>
                          <span className="text-xs font-semibold text-foreground line-clamp-1">
                            {selectedProd.name}
                          </span>
                          <span className="font-mono text-xs text-emerald-400 font-semibold mt-1" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {Number(selectedProd.price).toLocaleString("fr-FR")} DA
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors">
                          <span className="font-mono text-[9px] uppercase tracking-wider">Non configuré</span>
                          <span className="text-xs">+</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Product selection selector for active category */}
            {options.length > 0 && !lockedSlots.has(activeSlot) && (
              <div className="rounded-xl border border-border/40 bg-card/25 p-4 backdrop-blur-md sm:p-6">
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-4 gap-2">
                  <div>
                    <h2 className="text-base font-bold tracking-wide text-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      Configuration du Slot : {categories.find((c) => c.id === activeSlot)?.label}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Intégrez ce composant à votre architecture matérielle.
                    </p>
                  </div>
                  {build[activeSlot] && (
                    <button
                      onClick={() => removePart(activeSlot)}
                      className="font-mono text-[10px] uppercase tracking-wider text-red-400 hover:underline self-start sm:self-auto"
                    >
                      Retirer le composant
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {options.map((p) => {
                    const compat = compatible(p, activeCategorySlug, build);
                    const isSelected = build[activeSlot]?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`group flex flex-col justify-between overflow-hidden rounded-xl border bg-card/30 backdrop-blur-sm transition-all duration-300 ${
                          isSelected
                            ? "border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                            : !compat.ok
                            ? "border-destructive/20 opacity-50 hover:opacity-75"
                            : "border-border/30 hover:border-sky-500/40 hover:shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                        }`}
                      >
                        {/* Product image */}
                        <button
                          onClick={() => { setDetail(p); setOpen(true); }}
                          className="relative aspect-[16/10] w-full overflow-hidden bg-muted/20 border-b border-border/30"
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-card/10 font-mono text-[10px] text-muted-foreground/60">
                              Image indisponible
                            </div>
                          )}
                          <div className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[9px] text-white backdrop-blur-sm">
                            {p.brand}
                          </div>
                        </button>

                        {/* Product details */}
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="line-clamp-1 font-semibold text-xs text-foreground tracking-wide">
                            {p.name}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground leading-normal flex-1">
                            {p.tagline}
                          </p>

                          {/* Technical attributes */}
                          {Object.keys(p.specs || {}).length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-border/10 pt-3 text-[9px] text-muted-foreground/80 font-mono">
                              {Object.entries(p.specs).slice(0, 2).map(([k, v]) => (
                                <div key={k} className="truncate">
                                  <span className="opacity-60">{k}:</span> {v}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between gap-3 pt-2">
                            <div className="font-mono text-sm font-bold text-emerald-400" style={{ fontVariantNumeric: "tabular-nums" }}>
                              {Number(p.price).toLocaleString("fr-FR")} DA
                            </div>
                            <Button
                              size="sm"
                              disabled={!compat.ok}
                              onClick={() => pickPart(p)}
                              className={
                                isSelected
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500 h-8"
                                  : "bg-sky-600/90 text-white hover:bg-sky-500 h-8"
                              }
                            >
                              {isSelected ? "Sélectionné" : "Choisir"}
                            </Button>
                          </div>

                          {!compat.ok && (
                            <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-2 font-mono text-[9px] text-destructive leading-normal">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{compat.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locked notices */}
            {lockedSlots.has(activeSlot) && (
              <div className="flex items-start gap-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 backdrop-blur-sm">
                <Lock className="h-5 w-5 shrink-0 text-orange-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider font-mono">Slot verrouillé par le modèle</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Ce slot est configuré de façon fixe pour le modèle "{selectedModel?.name}".
                    Vous pouvez réinitialiser le modèle si vous souhaitez construire en mode libre.
                  </p>
                </div>
              </div>
            )}

            {/* Empty slots notice */}
            {options.length === 0 && !lockedSlots.has(activeSlot) && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-16 text-center bg-card/10">
                <p className="font-mono text-xs text-muted-foreground">
                  Aucun produit référencé dans cette catégorie.
                </p>
              </div>
            )}
          </div>

          {/* COLUMN RIGHT: Sticky Summary Sidebar (col-span-4) */}
          <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="overflow-hidden rounded-xl border border-border/30 bg-card/30 backdrop-blur-md flex flex-col">
              
              {/* Header Info */}
              <div className="border-b border-border/30 bg-muted/10 px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/80">
                    // Diagnostic & Aperçu
                  </div>
                  <div className="mt-0.5 text-sm font-semibold tracking-wide text-foreground">
                    {selectedModel ? selectedModel.name : "Architecture Personnalisée"}
                  </div>
                </div>
                <div className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] text-[#38bdf8] border border-sky-500/15">
                  SYS.OK
                </div>
              </div>

              {/* HUD PC Preview Container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-card/10 to-background/5 border-b border-border/30 flex items-center justify-center p-6">
                <div className="absolute inset-0 grid-bg opacity-30" />
                
                {/* HUD blueprint circles */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-40 h-40 rounded-full border border-dashed border-sky-500 animate-[spin_40s_linear_infinite]" />
                  <div className="absolute w-48 h-48 rounded-full border border-sky-500/30 animate-[spin_60s_linear_infinite_reverse]" />
                </div>
                <div className="absolute top-3 left-4 font-mono text-[8px] text-muted-foreground/50 tracking-wider">
                  SYS.MONITOR // PC.BUILD.v2
                </div>
                <div className="absolute bottom-3 right-4 font-mono text-[8px] text-muted-foreground/50 tracking-wider">
                  ENGINEERING STUDIO
                </div>

                {previewProduct && previewProduct.image_url ? (
                  <div className="relative flex h-full w-full items-center justify-center z-10">
                    <img
                      src={previewProduct.image_url}
                      alt={previewProduct.name}
                      className="max-h-[85%] max-w-[85%] object-contain transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 rounded-md bg-black/70 px-2 py-1 font-mono text-[9px] text-white backdrop-blur-sm border border-border/20">
                      {previewProduct.brand} {previewProduct.name}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/30 p-4 text-center z-10 bg-card/5 backdrop-blur-sm">
                    <Wrench className="mb-2 h-6 w-6 text-muted-foreground/30 animate-pulse" />
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      Aucun boîtier sélectionné
                    </div>
                    <p className="mt-1 text-[9px] text-muted-foreground/50 max-w-[180px] leading-relaxed">
                      Choisissez un boîtier pour projeter l'aperçu matériel du PC.
                    </p>
                  </div>
                )}
              </div>


              {/* Assembly info text block (free builder only) */}
              {!selectedModel && <div className="px-5 py-3 border-b border-border/30 bg-muted/10">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Wrench className="h-4 w-4 text-[#38bdf8] shrink-0 mt-0.5 glow-cyan" />
                  <div className="leading-normal">
                    <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-foreground">
                      Assemblage & stress tests inclus
                    </div>
                    <div className="font-mono text-[8px] text-muted-foreground/80 mt-0.5">
                      Câblage premium · tests de charge 24h · coût : {effectiveAssemblyCost} DA
                    </div>
                  </div>
                </div>
              </div>}

              {/* Price Breakdown */}
              <div className="px-5 py-4 bg-muted/5 space-y-2 text-xs font-mono">
                {!selectedModel && <div className="flex justify-between text-muted-foreground">
                  <span>Composants</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {totalPrice.toLocaleString("fr-FR")} DA
                  </span>
                </div>}
                {!selectedModel && <div className="flex justify-between text-muted-foreground">
                  <span>Montage expert</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {effectiveAssemblyCost.toLocaleString("fr-FR")} DA
                  </span>
                </div>}
                {selectedModel && <div className="flex justify-between text-muted-foreground">
                  <span>Modèle PC</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {Number(selectedModel.fixed_price ?? 0).toLocaleString("fr-FR")} DA
                  </span>
                </div>}
                <div className="border-t border-border/20 pt-3 flex items-baseline justify-between text-foreground">
                  <span className="font-semibold text-xs tracking-wider">TOTAL TTC</span>
                  <span className="text-xl font-bold text-emerald-400" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {grandTotal.toLocaleString("fr-FR")} DA
                  </span>
                </div>
              </div>

              {/* Add to Cart CTA */}
              <div className="p-4 border-t border-border/30 bg-muted/10">
                <Button
                  disabled={filledCount === 0}
                  onClick={() => {
                    if (selectedModel) {
                      const configuredSlots: PcModelSlot[] = (selectedModel.slots ?? []).map((slot) => {
                        const product = build[slot.category_id] ?? slot.product;
                        return {
                          ...slot,
                          product,
                        };
                      });
                      addModel(selectedModel, configuredSlots, grandTotal);
                      toast.success(`${selectedModel.name} ajouté au panier !`);
                    } else {
                      const components = visibleCategories
                        .filter((cat) => build[cat.id])
                        .map((cat) => ({
                          categoryLabel: cat.label,
                          product: build[cat.id],
                        }));
                      addFreeBuild(components, effectiveAssemblyCost);
                      toast.success("Votre PC personnalisé a été ajouté au panier !");
                    }
                  }}
                  className="w-full bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-mono text-xs uppercase tracking-wider py-6 rounded-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] neon-pulse-btn"
                >
                  <ShoppingCart className="mr-2 h-4 w-4 shrink-0" />
                  {filledCount === 0
                    ? "Sélectionnez vos composants"
                    : `Ajouter au panier`}
                </Button>
              </div>

            </div>
          </aside>

        </div>
      )}

      {/* Detail Sheet */}
      <ProductDetailSheet
        product={detail}
        open={open}
        onOpenChange={setOpen}
        onAdd={(p) => {
          pickPart(p);
          setOpen(false);
        }}
        addLabel="Ajouter à la config"
      />
    </main>
  );
}


