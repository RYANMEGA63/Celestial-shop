import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PcModel, PcModelSlot, Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Loader2,
  Cpu,
  Check,
  Upload,
  Image,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/models")({
  component: AdminModels,
});

// ── Helper ────────────────────────────────────────────────────────────────────

type SlotDraft = {
  category_id: string;
  product_id: string | null;
  is_customizable: boolean;
  sort_order: number;
  is_active: boolean;
};

type ModelDraft = {
  name: string;
  description: string;
  fixed_price: number;
  is_published: boolean;
  image_url: string;
  slots: SlotDraft[];
};

const emptyDraft = (categories: Category[]): ModelDraft => ({
  name: "",
  description: "",
  fixed_price: 0,
  is_published: true,
  image_url: "",
  slots: categories.map((cat, i) => ({
    category_id: cat.id,
    product_id: null,
    is_customizable: false,
    sort_order: i,
    is_active: true,
  })),
});

// ── Component ─────────────────────────────────────────────────────────────────

function AdminModels() {
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PcModel | null>(null);
  const [draft, setDraft] = useState<ModelDraft | null>(null);

  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (draft) {
      setDraft({ ...draft, image_url: "" });
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (draft) {
      setDraft({ ...draft, image_url: "" });
    }
  };

  const selectComponentImage = (url: string) => {
    setImageFile(null);
    setImagePreview(url);
    if (draft) {
      setDraft({ ...draft, image_url: url });
    }
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("label");
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories(id,label,slug)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedProductsWithImages = draft
    ? draft.slots
        .filter((s) => s.is_active && s.product_id)
        .map((s) => products.find((p) => p.id === s.product_id))
        .filter((p): p is Product => !!p && !!p.image_url)
    : [];

  const { data: models = [], isLoading } = useQuery<PcModel[]>({
    queryKey: ["pc_models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pc_models")
        .select("*, slots:pc_model_slots(*, category:categories(*), product:products(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (d: ModelDraft) => {
      setUploading(true);
      let image_url = imagePreview;
      if (imageFile) {
        try {
          image_url = await uploadImage(imageFile);
        } catch (err: any) {
          setUploading(false);
          throw err;
        }
      }
      setUploading(false);

      const payload = {
        name: d.name,
        description: d.description || null,
        fixed_price: d.fixed_price,
        assembly_cost: 0,
        is_published: d.is_published,
        image_url: image_url || null,
      };

      let modelId: string;

      if (editingModel) {
        const { error } = await supabase
          .from("pc_models")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingModel.id);
        if (error) throw error;
        modelId = editingModel.id;
        // Remove existing slots then re-insert
        await supabase.from("pc_model_slots").delete().eq("model_id", modelId);
      } else {
        const { data, error } = await supabase
          .from("pc_models")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        modelId = data.id;
      }

      // Insert active slots only
      const slotsPayload = d.slots
        .filter((s) => s.is_active)
        .map((s) => {
          const category = categories.find((c) => c.id === s.category_id);
          const isCustomizable = category?.is_customizable === false ? false : s.is_customizable;
          return {
            model_id: modelId,
            category_id: s.category_id,
            product_id: s.product_id,
            is_customizable: isCustomizable,
            sort_order: s.sort_order,
          };
        });

      if (slotsPayload.length > 0) {
        const { error } = await supabase
          .from("pc_model_slots")
          .insert(slotsPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pc_models"] });
      toast.success(editingModel ? "Modèle mis à jour !" : "Modèle créé !");
      closeSheet();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pc_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pc_models"] });
      toast.success("Modèle supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("pc_models")
        .update({ is_published: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pc_models"] }),
    onError: (e: any) => toast.error(e.message),
  });

  // ── Sheet helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingModel(null);
    setDraft(emptyDraft(categories));
    setImageFile(null);
    setImagePreview("");
    setSheetOpen(true);
  };

  const openEdit = (m: PcModel) => {
    setEditingModel(m);
    const existingSlots = m.slots ?? [];
    const slots: SlotDraft[] = categories.map((cat, i) => {
      const existing = existingSlots.find((s) => s.category_id === cat.id);
      return {
        category_id: cat.id,
        product_id: existing?.product_id ?? null,
        is_customizable: existing?.is_customizable ?? false,
        sort_order: existing?.sort_order ?? i,
        is_active: !!existing,
      };
    });
    setDraft({
      name: m.name,
      description: m.description ?? "",
      fixed_price: m.fixed_price ?? 0,
      is_published: m.is_published,
      image_url: m.image_url ?? "",
      slots,
    });
    setImageFile(null);
    setImagePreview(m.image_url ?? "");
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDraft(null);
    setEditingModel(null);
  };

  const updateSlot = (categoryId: string, patch: Partial<SlotDraft>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      slots: draft.slots.map((s) =>
        s.category_id === categoryId ? { ...s, ...patch } : s
      ),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Le nom du modèle est requis");
      return;
    }

    // Validation: fixed slot must have a selected product
    const invalidSlot = draft.slots.find(
      (s) => s.is_active && !s.is_customizable && !s.product_id
    );
    if (invalidSlot) {
      const catLabel = categories.find((c) => c.id === invalidSlot.category_id)?.label ?? "inconnue";
      toast.error(
        `Vous devez sélectionner un produit pour la catégorie "${catLabel}" car elle est définie comme fixe.`
      );
      return;
    }

    saveMutation.mutate(draft);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
            // Modèles PC
          </div>
          <h2 className="text-xl font-bold">Configurations pré-définies</h2>
          <p className="text-sm text-muted-foreground">
            Créez des PCs pré-configurés avec des slots verrouillés ou personnalisables
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Cpu className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-mono text-sm text-muted-foreground">
            Aucun modèle créé.
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Créer le premier modèle
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const slotCount = (m.slots ?? []).length;
            const lockedCount = (m.slots ?? []).filter(
              (s) => !s.is_customizable
            ).length;
            const customizableCount = (m.slots ?? []).filter(
              (s) => s.is_customizable
            ).length;
            return (
              <div
                key={m.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
              >
                {/* Card image */}
                <div className="relative aspect-[16/9] bg-muted">
                  {m.image_url ? (
                    <img
                      src={m.image_url}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Cpu className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                        m.is_published
                          ? "bg-success/20 text-success"
                          : "bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {m.is_published ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold">{m.name}</h3>
                  {m.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {m.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                      Prix fixe {Number(m.fixed_price ?? 0).toLocaleString("fr-FR")} DA
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                      {slotCount} catégorie{slotCount !== 1 ? "s" : ""}
                    </span>
                    {lockedCount > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 font-mono text-[10px] text-orange-500">
                        <Lock className="h-2.5 w-2.5" />
                        {lockedCount} fixe{lockedCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {customizableCount > 0 && (
                      <span className="rounded-md bg-success/10 px-2 py-1 font-mono text-[10px] text-success">
                        {customizableCount} libre{customizableCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(m)}
                      className="flex-1"
                    >
                      <Pencil className="mr-1.5 h-3 w-3" /> Éditer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        togglePublish.mutate({
                          id: m.id,
                          value: !m.is_published,
                        })
                      }
                    >
                      {m.is_published ? (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Supprimer "${m.name}" ?`))
                          deleteMutation.mutate(m.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet form */}
      <Sheet open={sheetOpen} onOpenChange={(v) => !v && closeSheet()}>
        <SheetContent
          side="right"
          className="flex w-full sm:max-w-2xl flex-col p-0 overflow-hidden border-l border-border bg-background/95 backdrop-blur-md"
        >
          <SheetHeader className="border-b border-border p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {editingModel ? "// Éditer le modèle" : "// Nouveau modèle"}
            </div>
            <SheetTitle className="text-xl">
              {editingModel ? editingModel.name : "Créer un modèle PC"}
            </SheetTitle>
          </SheetHeader>

          {draft && (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                {/* Basic info */}
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Informations générales
                  </div>

                  <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
                    {/* Image Column */}
                    <div className="space-y-3">
                      <Label>Photo du modèle</Label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative flex aspect-[16/9] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary"
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="preview"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <>
                            <Image className="h-6 w-6 text-muted-foreground" />
                            <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground text-center">
                              Cliquer pour uploader
                            </div>
                          </>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      {imageFile && (
                        <p className="font-mono text-[9px] text-primary truncate">
                          ✓ {imageFile.name}
                        </p>
                      )}
                      {imagePreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={clearImage}
                          className="h-6 w-full text-[9px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
                        >
                          Effacer l'image
                        </Button>
                      )}
                    </div>

                    {/* Text Fields Column */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="model-name">Nom du modèle *</Label>
                        <Input
                          id="model-name"
                          value={draft.name}
                          onChange={(e) =>
                            setDraft({ ...draft, name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="model-desc">Description</Label>
                        <textarea
                          id="model-desc"
                          value={draft.description}
                          onChange={(e) =>
                            setDraft({ ...draft, description: e.target.value })
                          }
                          rows={2}
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="model-fixed-price">
                            Prix fixe (DA)
                          </Label>
                          <Input
                            id="model-fixed-price"
                            type="number"
                            min={0}
                            value={draft.fixed_price}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                fixed_price: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="model-image">URL de l'image</Label>
                          <Input
                            id="model-image"
                            value={draft.image_url}
                            onChange={(e) => {
                              setDraft({ ...draft, image_url: e.target.value });
                              setImagePreview(e.target.value);
                              setImageFile(null);
                            }}
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Component photo picker (Only shown if products are selected and have photos) */}
                  {selectedProductsWithImages.length > 0 && (
                    <div className="border-t border-border/60 pt-3">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Utiliser la photo d'un composant de ce modèle :
                      </Label>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {selectedProductsWithImages.map((p) => {
                          const catLabel = categories.find((c) => c.id === p.category_id)?.label ?? "";
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectComponentImage(p.image_url)}
                              className={`flex items-center gap-2 rounded-md border p-1.5 text-left text-xs transition-colors hover:bg-muted/40 ${
                                imagePreview === p.image_url
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border bg-card text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt=""
                                  className="h-6 w-6 rounded object-cover"
                                />
                              ) : null}
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground leading-none">
                                  {catLabel}
                                </div>
                                <div className="line-clamp-1 max-w-[120px] font-semibold text-[10px] leading-tight">
                                  {p.name}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          is_published: !draft.is_published,
                        })
                      }
                      className={`relative flex h-6 w-11 items-center rounded-full border transition-colors ${
                        draft.is_published
                          ? "border-success bg-success"
                          : "border-border bg-muted"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          draft.is_published
                            ? "translate-x-[22px]"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-sm font-medium">
                      {draft.is_published ? "Publié (visible dans le configurateur)" : "Brouillon (caché)"}
                    </span>
                  </div>
                </div>

                {/* Slots configuration */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Configuration des catégories et customisation
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Activez les catégories incluses dans ce modèle, choisissez un produit par défaut et si le client peut le personnaliser.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {categories.map((cat) => {
                      const slotDraft = draft.slots.find(
                        (s) => s.category_id === cat.id
                      );
                      if (!slotDraft) return null;
                      const catProducts = products.filter(
                        (p) => p.category_id === cat.id
                      );

                      return (
                        <div
                          key={cat.id}
                          className={`flex flex-col gap-3 rounded-lg border p-4 transition-all md:flex-row md:items-center md:gap-4 ${
                            slotDraft.is_active
                              ? "border-border bg-card/40 backdrop-blur-sm"
                              : "border-dashed border-border/40 bg-muted/5 opacity-60"
                          }`}
                        >
                          {/* Left group: Switch, Status and Category Label */}
                          <div className="flex items-center justify-between md:justify-start gap-4">
                            <div className="flex items-center gap-3">
                              {/* Active / Include Switch */}
                              <button
                                type="button"
                                  onClick={() =>
                                    updateSlot(cat.id, {
                                      is_active: !slotDraft.is_active,
                                      // Reset values if disabled
                                      product_id: !slotDraft.is_active ? slotDraft.product_id : null,
                                    })
                                  }
                                className={`relative flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                                  slotDraft.is_active
                                    ? "border-primary bg-primary"
                                    : "border-border bg-muted"
                                }`}
                              >
                                <div
                                  className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                    slotDraft.is_active ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                              <span className="font-mono text-[9px] text-muted-foreground uppercase w-8">
                                {slotDraft.is_active ? "Actif" : "Exclu"}
                              </span>
                            </div>

                            <div className="font-mono text-xs font-bold uppercase tracking-wider text-foreground min-w-[100px]">
                              {cat.label}
                            </div>

                            {/* Mobile only Lock/Unlock to keep it in row */}
                            <div className="md:hidden">
                              {cat.is_customizable === false ? (
                                <div className="flex items-center gap-1 rounded-md border border-orange-500/20 bg-orange-500/5 text-orange-500/70 px-2 py-1 font-mono text-[9px] uppercase tracking-wider">
                                  <Lock className="h-3 w-3" />
                                  Fixe
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!slotDraft.is_active}
                                  onClick={() =>
                                    updateSlot(cat.id, {
                                      is_customizable: !slotDraft.is_customizable,
                                    })
                                  }
                                  className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                    !slotDraft.is_active
                                      ? "border-border text-muted-foreground/40"
                                      : slotDraft.is_customizable
                                      ? "border-success/40 bg-success/10 text-success"
                                      : "border-orange-500/40 bg-orange-500/10 text-orange-500"
                                  }`}
                                >
                                  {slotDraft.is_customizable ? (
                                    <Unlock className="h-3 w-3" />
                                  ) : (
                                    <Lock className="h-3 w-3" />
                                  )}
                                  {slotDraft.is_customizable ? "Libre" : "Fixe"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Middle/Right group: Product Selector and Desktop-only Lock/Unlock */}
                          <div className="flex flex-1 items-center gap-3">
                            <select
                              disabled={!slotDraft.is_active}
                              value={slotDraft.product_id ?? ""}
                              onChange={(e) =>
                                updateSlot(cat.id, {
                                  product_id: e.target.value || null,
                                })
                              }
                              className="w-full flex-1 rounded-md border border-input bg-background/50 px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-55"
                            >
                              <option value="">Aucun produit</option>
                              {catProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({Number(p.price).toLocaleString("fr-FR")} DA)
                                </option>
                              ))}
                            </select>

                            {/* Desktop only Lock/Unlock */}
                            <div className="hidden md:block">
                              {cat.is_customizable === false ? (
                                <div className="flex items-center gap-1.5 rounded-md border border-orange-500/20 bg-orange-500/5 text-orange-500/70 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider select-none">
                                  <Lock className="h-3 w-3" />
                                  Fixe (Global)
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!slotDraft.is_active}
                                  onClick={() =>
                                    updateSlot(cat.id, {
                                      is_customizable: !slotDraft.is_customizable,
                                    })
                                  }
                                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                    !slotDraft.is_active
                                      ? "border-border text-muted-foreground/40"
                                      : slotDraft.is_customizable
                                      ? "border-success/40 bg-success/10 text-success"
                                      : "border-orange-500/40 bg-orange-500/10 text-orange-500"
                                  }`}
                                >
                                  {slotDraft.is_customizable ? (
                                    <Unlock className="h-3 w-3" />
                                  ) : (
                                    <Lock className="h-3 w-3" />
                                  )}
                                  {slotDraft.is_customizable ? "Libre" : "Fixe"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border p-5">
                <Button type="button" variant="ghost" onClick={closeSheet}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saveMutation.isPending || uploading}>
                  {saveMutation.isPending || uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {uploading
                    ? "Upload photo..."
                    : saveMutation.isPending
                    ? "Enregistrement..."
                    : editingModel
                    ? "Mettre à jour"
                    : "Créer le modèle"}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
