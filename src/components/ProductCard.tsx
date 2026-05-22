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
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left"
    >
      <div className="absolute right-2 top-2 z-10 rounded-md bg-success/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-success ring-1 ring-success/30">
        {Number(product.price).toLocaleString("fr-FR")} DA
      </div>

      <div
        className={`w-full overflow-hidden bg-muted ${
          compact ? "aspect-[4/3]" : "aspect-[5/4] sm:aspect-[4/3]"
        }`}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className={`border-t border-border ${compact ? "px-2.5 py-2" : "px-3 py-3"}`}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {product.brand}
        </div>
        <div
          className={`line-clamp-2 font-semibold leading-snug text-foreground ${
            compact ? "text-xs sm:text-sm" : "text-sm"
          }`}
        >
          {product.name}
        </div>
        {!compact && (
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {product.tagline}
          </div>
        )}
      </div>
    </button>
  );
}
