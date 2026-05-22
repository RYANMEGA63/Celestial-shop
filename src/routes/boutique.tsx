import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useCartContext } from "@/lib/cartContext";

export const Route = createFileRoute("/boutique")({
  head: () => ({
    meta: [
      { title: "Boutique - Celestial Shop" },
      {
        name: "description",
        content:
          "Catalogue complet de composants PC : CPU, GPU, cartes meres, RAM, stockage et peripheriques.",
      },
    ],
  }),
  component: Boutique,
});

function Boutique() {
  const [catId, setCatId] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const { addProduct } = useCartContext();

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

  const filtered = products.filter((p) => {
    if (catId !== "all" && p.category_id !== catId) return false;
    if (q) {
      const lq = q.toLowerCase();
      const matchName = p.name.toLowerCase().includes(lq);
      const matchBrand = p.brand.toLowerCase().includes(lq);
      const matchTagline = p.tagline.toLowerCase().includes(lq);
      const matchCategory = (p.category?.label ?? "").toLowerCase().includes(lq);
      const matchSpecs = Object.values(p.specs ?? {}).some((v) => v.toLowerCase().includes(lq));
      if (!matchName && !matchBrand && !matchTagline && !matchCategory && !matchSpecs) {
        return false;
      }
    }
    return true;
  });

  const isLoading = loadingCats || loadingProducts;

  return (
    <main className="mx-auto max-w-[1400px] px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
          // Catalogue
        </div>
        <h1 className="mt-1 text-3xl font-bold">Boutique</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Chargement..."
            : `${filtered.length} composant${filtered.length !== 1 ? "s" : ""} disponibles · stock temps reel`}
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end sm:p-4">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Type de produit
          </div>
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder="Choisir un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Recherche
          </div>
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 pl-8"
              placeholder="Nom, marque, type ou caracteristique"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setCatId("all");
            setQ("");
          }}
          className="h-10 rounded-md border border-border bg-background px-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
        >
          Reset
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 font-mono text-xs uppercase tracking-widest">Chargement du catalogue...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <X className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun composant ne correspond a ces filtres.
          </p>
          <button
            onClick={() => {
              setCatId("all");
              setQ("");
            }}
            className="mt-3 font-mono text-xs uppercase tracking-widest text-primary hover:underline"
          >
            Reinitialiser
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              compact
              onOpen={(pr) => {
                setSelected(pr);
                setOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <ProductDetailSheet
        product={selected}
        open={open}
        onOpenChange={setOpen}
        onAdd={(p) => {
          addProduct(p);
          toast.success(`${p.name} ajoute au panier !`);
        }}
      />
    </main>
  );
}
