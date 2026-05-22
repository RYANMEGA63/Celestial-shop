import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cartContext";
import { ThemeProvider } from "@/lib/theme";

import appCss from "../styles.css?url";

// Script injecté avant le premier rendu pour éviter le flash de thème incorrect (FOUC)
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('celestial-theme');
      if (t === 'light') { document.documentElement.classList.remove('dark'); }
      else { document.documentElement.classList.add('dark'); }
    } catch(e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce composant n'existe pas dans notre catalogue.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Erreur de chargement</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Celestial Shop — Composants & Configurateur sur mesure" },
      { name: "description", content: "E-commerce de composants PC et configurateur sur mesure pour gamers, pros et IA." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
        {/* Anti-FOUC : applique le thème avant le premier rendu */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CartProvider>
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground">
              <SiteHeader />
              <Outlet />
              <footer className="mt-20 border-t border-border bg-muted/30 py-8">
                <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-3 px-4 sm:flex-row sm:items-center">
                  <div className="font-mono text-xs text-muted-foreground">
                    Celestial Shop · Assemblage en Algérie
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    v1.0 · build live
                  </div>
                </div>
              </footer>
              <Toaster richColors position="bottom-right" />
            </div>
          </AuthProvider>
        </CartProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
