import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Product, Category } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCartContext } from "@/lib/cartContext";

export const Route = createFileRoute("/boutique")({
  head: () => ({
    meta: [
      { title: "Boutique — Celestial Shop" },
      {
        name: "description",
        content:
          "Catalogue complet de composants PC : CPU, GPU, cartes mères, RAM, stockage et périphériques.",
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
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("label");
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
      const matchSpecs = Object.values(p.specs ?? {}).some((v) =>
        v.toLowerCase().includes(lq)
      );
      if (!matchName && !matchBrand && !matchTagline && !matchSpecs)
        return false;
    }
    return true;
  });

  const isLoading = loadingCats || loadingProducts;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
          // Catalogue
        </div>
        <h1 className="mt-1 text-3xl font-bold">Boutique</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Chargement…"
            : `${filtered.length} composant${filtered.length !== 1 ? "s" : ""} disponibles · stock temps réel`}
        </p>
      </div>

      {/* Top filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        {/* All button */}
        <button
          onClick={() => setCatId("all")}
          className={`rounded-md border px-2.5 py-1 font-mono text-[11px] whitespace-nowrap transition-colors ${
            catId === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          Tous
        </button>

        {/* Category pills from Supabase */}
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatId(c.id)}
            className={`rounded-md border px-2.5 py-1 font-mono text-[11px] whitespace-nowrap transition-colors ${
              catId === c.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}

        {/* Divider */}
        <div className="hidden sm:block h-6 w-px bg-border shrink-0" />

        {/* Search bar */}
        <div className="relative shrink-0 w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-8"
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

      {/* Product grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 font-mono text-xs uppercase tracking-widest">
            Chargement du catalogue…
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <X className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun composant ne correspond à ces filtres.
          </p>
          <button
            onClick={() => { setCatId("all"); setQ(""); }}
            className="mt-3 font-mono text-xs uppercase tracking-widest text-primary hover:underline"
          >
            Réinitialiser
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onOpen={(pr) => { setSelected(pr); setOpen(true); }}
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
          toast.success(`${p.name} ajouté au panier !`);
        }}
      />
    </main>
  );
}
