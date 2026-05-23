import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Brain, Briefcase, Cpu, Gamepad2, Loader2, Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Celestial Shop - Composants & PC sur mesure" },
      {
        name: "description",
        content:
          "Composants PC derniere generation et configurateur sur mesure : gaming, workstation et creation.",
      },
      {
        name: "keywords",
        content: "PC gamer, workstation, composants PC, configurateur PC, boutique informatique",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Celestial Shop - Composants & PC sur mesure" },
      {
        property: "og:description",
        content:
          "Composants PC derniere generation et configurateur sur mesure pour gaming, workstation et creation.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Celestial Shop - Composants & PC sur mesure" },
      {
        name: "twitter:description",
        content:
          "Composants PC derniere generation et configurateur sur mesure pour gaming, workstation et creation.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: Home,
});

type Universe = "gaming" | "pro" | "creation";

const universes: { id: Universe; title: string; subtitle: string; icon: typeof Cpu; accent: string }[] =
  [
    {
      id: "gaming",
      title: "Gaming / Stream",
      subtitle: "Frame rate, latence, RGB",
      icon: Gamepad2,
      accent: "from-primary/30 to-primary/5",
    },
    {
      id: "pro",
      title: "Professionnel / Travail",
      subtitle: "Fiabilite, multi-tache, silence",
      icon: Briefcase,
      accent: "from-success/30 to-success/5",
    },
    {
      id: "creation",
      title: "Creation / Rendu",
      subtitle: "VRAM, CUDA, performance",
      icon: Brain,
      accent: "from-primary/20 to-success/10",
    },
  ];

function Home() {
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const { data: dbProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["homepage-showcase-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories(id, label, slug)")
        .order("price", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const showcase = useMemo(() => {
    const categoryMap = new Map<string, Product>();
    dbProducts.forEach((p) => {
      if (!categoryMap.has(p.category_id)) {
        categoryMap.set(p.category_id, p);
      }
    });
    return Array.from(categoryMap.values()).slice(0, 6);
  }, [dbProducts]);

  const openProduct = (p: Product) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/70 to-primary/5" />
        <div className="relative mx-auto max-w-[1400px] px-3 py-10 sm:px-4 sm:py-16 md:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary">
              <Zap className="h-3 w-3" /> Build your dream Pc
            </div>
            <h1 className="text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl md:text-6xl">
              Assemblez la machine
              <br />
              <span className="text-primary">qui vous ressemble.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Composants tries sur le volet, compatibilite garantie par notre moteur,
              assemblage humain. Du build esport a la station de creation.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-success text-success-foreground hover:bg-success/90">
                <Link to="/configurateur">
                  Configurez votre PC Sur Mesure
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/boutique">Explorer le catalogue</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-3 py-12 sm:px-4 sm:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-primary">// Univers</div>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Choisissez votre terrain de jeu</h2>
          </div>
          <Link
            to="/boutique"
            className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary md:block"
          >
            Voir tout â†’
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {universes.map((u) => {
            const Icon = u.icon;
            return (
              <Link
                key={u.id}
                to="/boutique"
                search={{ universe: u.id } as never}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${u.accent} opacity-100`} />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">{u.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{u.subtitle}</p>
                  <div className="mt-6 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-primary">
                    Voir les builds <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-4">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-primary">// Vitrine</div>
              <h2 className="mt-1 text-3xl font-bold">Derniere generation</h2>
            </div>
            <Link
              to="/boutique"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              Catalogue complet â†’
            </Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-3 font-mono text-xs uppercase tracking-widest">
                Chargement de la vitrine...
              </p>
            </div>
          ) : showcase.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
              <Cpu className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-mono text-xs uppercase tracking-widest">
                Aucun produit disponible dans le catalogue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {showcase.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={openProduct} compact />
              ))}
            </div>
          )}
        </div>
      </section>

      <ProductDetailSheet
        product={selected}
        open={open}
        onOpenChange={setOpen}
        onAdd={(p) => toast.success(`${p.name} ajoute au panier`)}
      />
    </main>
  );
}

