import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Product, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Upload,
  ImageIcon,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

interface SpecRow {
  key: string;
  value: string;
}

const EMPTY_FORM = {
  name: "",
  brand: "",
  category_id: "",
  price: "",
  tagline: "",
  socket: "",
  chipset: "",
  ram_type: "",
  form_factor: "",
  tdp: "",
};

function AdminProducts() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [categorySpecs, setCategorySpecs] = useState<Record<string, string>>({});
  const [customSpecs, setCustomSpecs] = useState<SpecRow[]>([{ key: "", value: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

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

  const { data: products = [], isLoading } = useQuery<Product[]>({
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

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  function handleCategoryChange(newCategoryId: string) {
    setForm((f) => ({ ...f, category_id: newCategoryId }));

    const newCat = categories.find((c) => c.id === newCategoryId);
    const newDefaultAttrs = newCat?.default_attributes || [];

    // Merge current categorySpecs and customSpecs into a single lookup map
    const allSpecs: Record<string, string> = { ...categorySpecs };
    for (const row of customSpecs) {
      if (row.key.trim()) {
        allSpecs[row.key.trim()] = row.value;
      }
    }

    const nextCategorySpecs: Record<string, string> = {};
    const nextCustomSpecs: SpecRow[] = [];

    for (const attr of newDefaultAttrs) {
      const matchingKey = Object.keys(allSpecs).find(
        (k) => k.toLowerCase() === attr.toLowerCase()
      );
      if (matchingKey) {
        nextCategorySpecs[attr] = allSpecs[matchingKey];
        delete allSpecs[matchingKey];
      } else {
        nextCategorySpecs[attr] = "";
      }
    }

    for (const [key, value] of Object.entries(allSpecs)) {
      nextCustomSpecs.push({ key, value });
    }

    if (nextCustomSpecs.length === 0) {
      nextCustomSpecs.push({ key: "", value: "" });
    }

    setCategorySpecs(nextCategorySpecs);
    setCustomSpecs(nextCustomSpecs);
  }

  function openCreate() {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM });
    setCategorySpecs({});
    setCustomSpecs([{ key: "", value: "" }]);
    setImageFile(null);
    setImagePreview("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm({
      name: p.name,
      brand: p.brand,
      category_id: p.category_id,
      price: String(p.price),
      tagline: p.tagline,
      socket: p.socket ?? "",
      chipset: p.chipset ?? "",
      ram_type: p.ram_type ?? "",
      form_factor: p.form_factor ?? "",
      tdp: p.tdp != null ? String(p.tdp) : "",
    });

    const cat = categories.find((c) => c.id === p.category_id);
    const defaultAttrs = cat?.default_attributes || [];
    const catSpecs: Record<string, string> = {};
    const custSpecs: SpecRow[] = [];

    // Populate category attributes (prefilled from product specs if exist)
    for (const attr of defaultAttrs) {
      const match = Object.keys(p.specs || {}).find(
        (k) => k.toLowerCase() === attr.toLowerCase()
      );
      catSpecs[attr] = match ? p.specs[match] : "";
    }

    // Remaining specs go to custom specs
    for (const [key, value] of Object.entries(p.specs || {})) {
      const isDefault = defaultAttrs.some(
        (a) => a.toLowerCase() === key.toLowerCase()
      );
      if (!isDefault) {
        custSpecs.push({ key, value });
      }
    }

    if (custSpecs.length === 0) {
      custSpecs.push({ key: "", value: "" });
    }

    setCategorySpecs(catSpecs);
    setCustomSpecs(custSpecs);
    setImageFile(null);
    setImagePreview(p.image_url);
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let image_url = editingProduct?.image_url ?? "";
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }
      setUploading(false);

      const specsObj: Record<string, string> = {};
      for (const [key, val] of Object.entries(categorySpecs)) {
        if (val.trim()) {
          specsObj[key] = val.trim();
        }
      }
      for (const row of customSpecs) {
        if (row.key.trim() && row.value.trim()) {
          specsObj[row.key.trim()] = row.value.trim();
        }
      }

      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category_id: form.category_id || null,
        price: parseFloat(form.price) || 0,
        image_url,
        tagline: form.tagline.trim(),
        socket: form.socket.trim() || null,
        chipset: form.chipset.trim() || null,
        ram_type: form.ram_type.trim() || null,
        form_factor: form.form_factor.trim() || null,
        tdp: form.tdp ? parseInt(form.tdp) : null,
        specs: specsObj,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-products-count"] });
      setShowForm(false);
      toast.success(
        editingProduct ? "Produit mis Ã  jour !" : "Produit crÃ©Ã© !"
      );
    },
    onError: (e: Error) => {
      setUploading(false);
      toast.error(e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-products-count"] });
      toast.success("Produit supprimÃ©");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary">// Gestion</div>
          <h1 className="mt-1 text-2xl font-bold">Produits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} produit{products.length !== 1 ? "s" : ""} dans le catalogue
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau produit
        </Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-lg border border-primary/30 bg-card p-6 shadow-[0_0_30px_-10px_var(--color-primary)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-primary">
              // {editingProduct ? "Modifier le produit" : "Nouveau produit"}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Image upload */}
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Photo du produit
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Cliquer pour uploader
                    </div>
                  </>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-8 w-8 text-primary" />
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
                <p className="mt-1.5 font-mono text-[10px] text-primary">
                  âœ“ {imageFile.name}
                </p>
              )}
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {/* Row 1 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom du produit">
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="h-9"
                  />
                </Field>
                <Field label="Marque / Constructeur">
                  <Input
                    value={form.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                    className="h-9"
                  />
                </Field>
              </div>

              {/* Row 2 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="CatÃ©gorie">
                  <div className="relative">
                    <select
                      value={form.category_id}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="h-9 w-full appearance-none rounded-md border border-border bg-background px-3 pr-8 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Aucune catégorie</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>
                <Field label="Prix (DA)">
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    min={0}
                    step="0.01"
                    className="h-9"
                  />
                </Field>
              </div>

              {/* Tagline */}
              <Field label="Description courte (tagline)">
                <Input
                  value={form.tagline}
                  onChange={(e) => setField("tagline", e.target.value)}
                  className="h-9"
                />
              </Field>

              {/* Compatibility */}
              <details className="group rounded-md border border-border">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  CompatibilitÃ© (optionnel)
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-3">
                  <Field label="Socket (ex: AM5, LGA1700)">
                    <Input
                      value={form.socket}
                      onChange={(e) => setField("socket", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </Field>
                  <Field label="Chipset">
                    <Input
                      value={form.chipset}
                      onChange={(e) => setField("chipset", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </Field>
                  <Field label="Type RAM">
                    <Input
                      value={form.ram_type}
                      onChange={(e) => setField("ram_type", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </Field>
                  <Field label="Format (ATX, ITXâ€¦)">
                    <Input
                      value={form.form_factor}
                      onChange={(e) => setField("form_factor", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </Field>
                  <Field label="TDP (Watts)">
                    <Input
                      type="number"
                      value={form.tdp}
                      onChange={(e) => setField("tdp", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </Field>
                </div>
              </details>

              {/* Category Default Specs (Fiche technique) */}
              {Object.keys(categorySpecs).length > 0 && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    // Fiche technique (Attributs de la catÃ©gorie)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(categorySpecs).map(([key, value]) => (
                      <div key={key}>
                        <label className="mb-1 block text-xs font-medium text-foreground">
                          {key}
                        </label>
                        <Input
                          value={value}
                          onChange={(e) =>
                            setCategorySpecs((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specs Specials (key-value) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Attributs spÃ©ciaux / additionnels
                  </label>
                  <button
                    onClick={() =>
                      setCustomSpecs((s) => [...s, { key: "", value: "" }])
                    }
                    className="flex items-center gap-1 font-mono text-[10px] text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Ajouter un attribut
                  </button>
                </div>
                <div className="space-y-2">
                  {customSpecs.map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={row.key}
                        onChange={(e) =>
                          setCustomSpecs((s) =>
                            s.map((r, j) =>
                              j === i ? { ...r, key: e.target.value } : r
                            )
                          )
                        }
                        className="h-8 flex-1 text-sm"
                      />
                      <Input
                        value={row.value}
                        onChange={(e) =>
                          setCustomSpecs((s) =>
                            s.map((r, j) =>
                              j === i ? { ...r, value: e.target.value } : r
                            )
                          )
                        }
                        className="h-8 flex-1 text-sm"
                      />
                      <button
                        onClick={() =>
                          setCustomSpecs((s) => s.filter((_, j) => j !== i))
                        }
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                !form.name.trim() ||
                !form.price ||
                saveMutation.isPending ||
                uploading
              }
            >
              {uploading
                ? "Upload photoâ€¦"
                : saveMutation.isPending
                ? "Enregistrementâ€¦"
                : editingProduct
                ? "Mettre Ã  jour"
                : "CrÃ©er le produit"}
            </Button>
          </div>
        </div>
      )}

      {/* Product list */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {isLoading ? (
          <div className="py-12 text-center font-mono text-xs text-muted-foreground">
            Chargementâ€¦
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-muted-foreground">
            Aucun produit. Cliquez sur "Nouveau produit" pour commencer.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-16" />
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Produit
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  CatÃ©gorie
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Prix
                </th>
                <th className="w-24 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-4 py-2">
                    <div className="h-10 w-10 overflow-hidden rounded-md border border-border bg-muted">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {p.brand}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {(p.category as Category)?.label ?? "â€”"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-success">
                    {Number(p.price).toLocaleString("fr-FR")} DA
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer "${p.name}" ?`))
                            deleteMutation.mutate(p.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}


