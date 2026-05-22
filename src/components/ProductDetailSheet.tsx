import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Category, Product } from "@/lib/types";
import { ShoppingCart } from "lucide-react";

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (p: Product) => void;
  addLabel?: string;
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onAdd,
  addLabel = "Ajouter au panier",
}: Props) {
  const categoryLabel =
    (product?.category as Category | undefined)?.label ?? product?.category_id ?? "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[88vw] overflow-y-auto border-l p-0 sm:w-[420px] sm:max-w-[420px] lg:w-[480px] lg:max-w-[480px]"
      >
        {product && (
          <div className="flex h-full flex-col bg-background">
            <SheetHeader className="border-b border-border px-4 pb-4 pt-6 sm:px-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                {categoryLabel} · {product.brand}
              </div>
              <SheetTitle className="pr-8 text-lg sm:text-xl">{product.name}</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                {product.tagline}
              </SheetDescription>
            </SheetHeader>

            <div className="aspect-[5/4] w-full overflow-hidden border-b border-border bg-muted">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted font-mono text-xs text-muted-foreground">
                  Aucune image
                </div>
              )}
            </div>

            <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
              <div className="mb-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Prix TTC
                </div>
                <div className="font-mono text-2xl font-bold text-success">
                  {Number(product.price).toLocaleString("fr-FR")} DA
                </div>
              </div>
              <Button
                onClick={() => onAdd?.(product)}
                className="w-full bg-success text-success-foreground hover:bg-success/90"
                size="lg"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {addLabel}
              </Button>
            </div>

            <div className="flex-1 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Fiche technique
                </h3>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Object.keys(product.specs ?? {}).length} attributs
                </span>
              </div>

              {Object.keys(product.specs ?? {}).length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">Aucun attribut renseigne.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="spec-table w-full">
                    <tbody>
                      {Object.entries(product.specs ?? {}).map(([k, v], i) => (
                        <tr key={k} className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}>
                          <td className="w-[42%] border-b border-border px-3 py-2 align-top text-muted-foreground">
                            {k}
                          </td>
                          <td className="border-b border-border px-3 py-2 font-semibold text-foreground">
                            {v}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
