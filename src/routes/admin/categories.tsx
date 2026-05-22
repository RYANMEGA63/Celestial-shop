import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [defaultAttributes, setDefaultAttributes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editIsCustomizable, setEditIsCustomizable] = useState(false);
  const [editDefaultAttributes, setEditDefaultAttributes] = useState("");

  const { data: categories = [], isLoading } = useQuery<Category[]>({
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const attrs = defaultAttributes
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const { error } = await supabase.from("categories").insert({
        label: label.trim(),
        slug: slug.trim() || slugify(label),
        is_customizable: isCustomizable,
        default_attributes: attrs,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["admin-categories-count"] });
      setLabel("");
      setSlug("");
      setIsCustomizable(false);
      setDefaultAttributes("");
      toast.success("Catégorie créée !");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const attrs = editDefaultAttributes
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from("categories")
        .update({
          label: editLabel.trim(),
          slug: editSlug.trim(),
          is_customizable: editIsCustomizable,
          default_attributes: attrs,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
      toast.success("Catégorie mise à jour !");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["admin-categories-count"] });
      toast.success("Catégorie supprimée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">// Gestion</div>
        <h1 className="mt-1 text-2xl font-bold">Catégories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les catégories apparaissent dans la boutique et le configurateur.
        </p>
      </div>

      {/* Create form */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          // Nouvelle catégorie
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Nom affiché
              </label>
              <Input
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
                className="h-9"
              />
            </div>
            <div className="w-48">
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Slug (ID technique)
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Attributs par défaut (séparés par des virgules)
            </label>
            <Input
              value={defaultAttributes}
              onChange={(e) => setDefaultAttributes(e.target.value)}
              className="h-9"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ces attributs formeront la fiche technique par défaut des produits créés sous cette catégorie.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCustomizable(!isCustomizable)}
                className={`relative flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                  isCustomizable
                    ? "border-success bg-success"
                    : "border-border bg-muted"
                }`}
              >
                <div
                  className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    isCustomizable ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-xs font-medium">
                Customisable dans le configurateur (permet aux clients de choisir un produit de cette catégorie)
              </span>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!label.trim() || createMutation.isPending}
              className="h-9"
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {isLoading ? (
          <div className="py-12 text-center font-mono text-xs text-muted-foreground">
            Chargement…
          </div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-muted-foreground">
            Aucune catégorie. Créez-en une ci-dessus.
          </div>
        ) : (
          <table className="w-full">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                 <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                   Nom
                 </th>
                 <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                   Slug
                 </th>
                 <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                   Attributs par défaut
                 </th>
                 <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                   Customisable
                 </th>
                 <th className="w-24 px-4 py-2.5" />
               </tr>
             </thead>
             <tbody>
               {categories.map((cat, i) => (
                 <tr
                   key={cat.id}
                   className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                 >
                   {editingId === cat.id ? (
                     <>
                       <td className="px-4 py-2">
                         <Input
                           value={editLabel}
                           onChange={(e) => setEditLabel(e.target.value)}
                           className="h-8 text-sm"
                         />
                       </td>
                       <td className="px-4 py-2">
                         <Input
                           value={editSlug}
                           onChange={(e) => setEditSlug(e.target.value)}
                           className="h-8 font-mono text-xs"
                         />
                       </td>
                       <td className="px-4 py-2">
                         <Input
                           value={editDefaultAttributes}
                           onChange={(e) => setEditDefaultAttributes(e.target.value)}
                           className="h-8 text-sm"
                         />
                       </td>
                       <td className="px-4 py-2">
                         <div className="flex items-center gap-2">
                           <button
                             type="button"
                             onClick={() => setEditIsCustomizable(!editIsCustomizable)}
                             className={`relative flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                               editIsCustomizable
                                 ? "border-success bg-success"
                                 : "border-border bg-muted"
                             }`}
                           >
                             <div
                               className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                 editIsCustomizable ? "translate-x-4" : "translate-x-0.5"
                               }`}
                             />
                           </button>
                           <span className="text-xs font-mono text-muted-foreground">
                             {editIsCustomizable ? "Oui" : "Non"}
                           </span>
                         </div>
                       </td>
                       <td className="px-4 py-2">
                         <div className="flex gap-1.5">
                           <button
                             onClick={() => updateMutation.mutate(cat.id)}
                             className="rounded p-1 text-success hover:bg-success/10"
                           >
                             <Check className="h-4 w-4" />
                           </button>
                           <button
                             onClick={() => setEditingId(null)}
                             className="rounded p-1 text-muted-foreground hover:bg-muted"
                           >
                             <X className="h-4 w-4" />
                           </button>
                         </div>
                       </td>
                     </>
                   ) : (
                     <>
                       <td className="px-4 py-2.5 font-medium">{cat.label}</td>
                       <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                         {cat.slug}
                       </td>
                       <td className="px-4 py-2.5">
                         <div className="flex flex-wrap gap-1">
                           {cat.default_attributes && cat.default_attributes.length > 0 ? (
                             cat.default_attributes.map((attr, idx) => (
                               <span
                                 key={idx}
                                 className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                               >
                                 {attr}
                               </span>
                             ))
                           ) : (
                             <span className="text-xs italic text-muted-foreground/60">Aucun</span>
                           )}
                         </div>
                       </td>
                       <td className="px-4 py-2.5">
                         <span
                           className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                             cat.is_customizable !== false
                               ? "bg-success/20 text-success"
                               : "bg-orange-500/20 text-orange-500"
                           }`}
                         >
                           {cat.is_customizable !== false ? "Oui" : "Non"}
                         </span>
                       </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditLabel(cat.label);
                                setEditSlug(cat.slug);
                                setEditIsCustomizable(cat.is_customizable !== false);
                                setEditDefaultAttributes(
                                  cat.default_attributes
                                    ? cat.default_attributes.join(", ")
                                    : ""
                                );
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Supprimer "${cat.label}" ?`))
                                  deleteMutation.mutate(cat.id);
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
