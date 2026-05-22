import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Product, Category } from "@/lib/types";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {product && (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border p-4 sm:p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                {categoryLabel} · {product.brand}
              </div>
              <SheetTitle className="text-xl sm:text-2xl">{product.name}</SheetTitle>
              <SheetDescription>{product.tagline}</SheetDescription>
            </SheetHeader>

            <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted font-mono text-xs text-muted-foreground">
                  Aucune image
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Prix TTC
                </div>
                <div className="font-mono text-xl font-bold text-success sm:text-2xl">
                  {Number(product.price).toLocaleString("fr-FR")} DA
                </div>
              </div>
              <Button
                onClick={() => onAdd?.(product)}
                className="w-full bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
                size="lg"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {addLabel}
              </Button>
            </div>

            <div className="p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Fiche technique
                </h3>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Object.keys(product.specs ?? {}).length} attributs
                </span>
              </div>

              {Object.keys(product.specs ?? {}).length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Aucun attribut renseigné.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="spec-table min-w-[420px] w-full">
                    <tbody>
                      {Object.entries(product.specs ?? {}).map(([k, v], i) => (
                        <tr
                          key={k}
                          className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}
                        >
                          <td className="w-[45%] border-b border-border px-3 py-1.5 text-muted-foreground">
                            {k}
                          </td>
                          <td className="border-b border-border px-3 py-1.5 font-semibold text-foreground">
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
