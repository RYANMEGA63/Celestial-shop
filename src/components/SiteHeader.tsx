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
      <div className="mx-auto flex min-h-14 max-w-[1400px] flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-6 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <Cpu className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">
            Celestial<span className="text-primary"> Shop</span>
          </span>
        </Link>

        <nav className="order-3 -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-1 overflow-x-auto px-3 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0 sm:pb-0">
          {links.map((l) => {
            const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
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

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            stock live expedition 48h-7j avec yalidine
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Cart icon */}
          <Link
            to="/panier"
            className={`relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
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




