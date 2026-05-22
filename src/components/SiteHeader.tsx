import { Link, useRouterState } from "@tanstack/react-router";
import { Cpu, Store, Wrench, ShoppingCart } from "lucide-react";
import { useCartContext } from "@/lib/cartContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { to: "/", label: "Accueil", icon: Cpu },
  { to: "/boutique", label: "Boutique", icon: Store },
  { to: "/configurateur", label: "Configurateur", icon: Wrench },
] as const;

export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { totalItems } = useCartContext();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Cpu className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">
            Celestial<span className="text-primary"> Shop</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            stock live · expédition 24h
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Cart icon */}
          <Link
            to="/panier"
            className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              path === "/panier"
                ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Panier</span>
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
