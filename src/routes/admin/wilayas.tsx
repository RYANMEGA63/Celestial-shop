import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Wilaya } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wilayas")({
  component: AdminWilayas,
});

function AdminWilayas() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<number | null>(null);
  const [localCosts, setLocalCosts] = useState<Record<number, string>>({});

  const { data: wilayas = [], isLoading } = useQuery<Wilaya[]>({
    queryKey: ["admin-wilayas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wilayas")
        .select("*")
        .order("code");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: Wilaya[]) => {
      const initial: Record<number, string> = {};
      data.forEach((w) => { initial[w.id] = String(w.delivery_cost); });
      setLocalCosts(initial);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, delivery_cost, is_active }: { id: number; delivery_cost?: number; is_active?: boolean }) => {
      const { error } = await supabase
        .from("wilayas")
        .update({ ...(delivery_cost !== undefined ? { delivery_cost } : {}), ...(is_active !== undefined ? { is_active } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wilayas"] });
      qc.invalidateQueries({ queryKey: ["wilayas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function saveCost(wilaya: Wilaya) {
    const cost = parseInt(localCosts[wilaya.id] ?? "0");
    if (isNaN(cost) || cost < 0) {
      toast.error("Coût invalide");
      return;
    }
    setSaving(wilaya.id);
    await updateMutation.mutateAsync({ id: wilaya.id, delivery_cost: cost });
    toast.success(`${wilaya.name} — coût mis à jour`);
    setSaving(null);
  }

  async function toggleActive(wilaya: Wilaya) {
    await updateMutation.mutateAsync({ id: wilaya.id, is_active: !wilaya.is_active });
    toast.success(`${wilaya.name} — ${!wilaya.is_active ? "activée" : "désactivée"}`);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
          // Livraison
        </div>
        <h1 className="mt-1 text-2xl font-bold">Wilayas & Coûts de livraison</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurez le coût de livraison par wilaya. Les wilayas inactives n'apparaissent pas lors de la commande.
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_160px_80px_40px] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">N°</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Wilaya</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Coût livraison (DA)</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">Statut</span>
          <span />
        </div>

        <div className="divide-y divide-border">
          {wilayas.map((w) => (
            <div
              key={w.id}
              className={`grid grid-cols-[40px_1fr_160px_80px_40px] items-center gap-3 px-4 py-2.5 transition-colors ${
                !w.is_active ? "opacity-50 bg-muted/10" : "hover:bg-muted/10"
              }`}
            >
              {/* Code */}
              <span className="font-mono text-xs text-muted-foreground">
                {String(w.code).padStart(2, "0")}
              </span>

              {/* Name */}
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium">{w.name}</span>
              </div>

              {/* Cost input */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  value={localCosts[w.id] ?? String(w.delivery_cost)}
                  onChange={(e) =>
                    setLocalCosts((prev) => ({ ...prev, [w.id]: e.target.value }))
                  }
                  className="h-7 w-full font-mono text-xs"
                  disabled={!w.is_active}
                />
                <button
                  onClick={() => saveCost(w)}
                  disabled={saving === w.id || !w.is_active}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40"
                >
                  {saving === w.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </button>
              </div>

              {/* Active toggle */}
              <div className="flex justify-center">
                <button
                  onClick={() => toggleActive(w)}
                  className={`transition-colors ${w.is_active ? "text-success" : "text-muted-foreground"}`}
                >
                  {w.is_active ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Empty */}
              <div />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {wilayas.filter((w) => w.is_active).length} wilayas actives sur {wilayas.length}
      </p>
    </div>
  );
}
