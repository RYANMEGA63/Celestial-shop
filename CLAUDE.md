# CLAUDE.md — Celestial-Shop

Site e-commerce de Celestial pour **vendre des composants informatiques (hardware)** en Algérie. Lire aussi le `CLAUDE.md` racine de `Celestial Projects/` pour le contexte d'entreprise.

## Commandes

```bash
bun install       # deps (bun est le package manager — bun.lock, bunfig.toml)
bun run dev       # vite dev
bun run build     # vite build
bun run lint      # eslint
bun run format    # prettier
```

## Architecture

Stack : **TanStack Start** (React, file-based routing) + Vite + Tailwind + composants **Radix UI/shadcn** (`src/components/ui/`) + **Supabase** (DB/auth) + déploiement **Cloudflare Workers** (`wrangler.jsonc`, `@cloudflare/vite-plugin`).

```
src/
  routes/        ← pages (file-based routing TanStack), dont routes/admin/
  components/    ← composants ; components/ui/ = shadcn/Radix
  data/          ← données statiques
  hooks/
  lib/
supabase/        ← schéma/migrations
```

Projet initialement généré via **Lovable** (`.lovable/`) — certains patterns viennent de là.

## Notes

- Prix en **DZD**.
- `.env.local` contient les clés Supabase — jamais committer.
- État produit et décisions (paiement, livraison, catalogue) : voir `Second Brain/02 - Projets/Celestial Shop.md` à la racine de Celestial Projects.
