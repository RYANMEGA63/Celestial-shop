import { createFileRoute, Outlet, Link, useMatchRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Settings, Tag, Package, LayoutDashboard, LogOut, Cpu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate({ to: "/login" });
  };

  const navItems = [
    { to: "/admin" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/categories" as const, label: "Catégories", icon: Tag, exact: false },
    { to: "/admin/products" as const, label: "Produits", icon: Package, exact: false },
    { to: "/admin/models" as const, label: "Modèles PC", icon: Cpu, exact: false },
    { to: "/admin/orders" as const, label: "Commandes", icon: Package, exact: false },
    { to: "/admin/wilayas" as const, label: "Wilayas", icon: Tag, exact: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Admin top bar */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">// Admin</div>
              <div className="text-sm font-bold leading-none">Celestial Shop — Gestion</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/boutique"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              ← Voir la boutique
            </Link>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-destructive hover:text-destructive/80 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Sidebar nav */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? matchRoute({ to: item.to, fuzzy: false })
                : matchRoute({ to: item.to, fuzzy: true });
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Page content */}
          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
