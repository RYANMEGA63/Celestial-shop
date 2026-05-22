import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  onOpen: (p: Product) => void;
  compact?: boolean;
}

export function ProductCard({ product, onOpen, compact }: Props) {
  return (
    <button
      onClick={() => onOpen(product)}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_30px_-12px_var(--color-primary)]"
    >
      <div className="absolute right-2 top-2 z-10 rounded-md bg-success/10 px-2 py-0.5 font-mono text-xs font-semibold text-success ring-1 ring-success/30">
        {Number(product.price).toLocaleString("fr-FR")} DA
      </div>
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="border-t border-border px-3 py-2.5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {product.brand}
        </div>
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {product.name}
        </div>
        {!compact && (
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {product.tagline}
          </div>
        )}
      </div>
    </button>
  );
}
