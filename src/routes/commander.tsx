import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCartContext } from "@/lib/cartContext";
import { supabase } from "@/lib/supabase";
import type { CartItemSpec, Wilaya } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Check,
  Package,
  Loader2,
  ShoppingBag,
  MapPin,
  ChevronRight,
  Truck,
  Building,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/commander")({
  head: () => ({
    meta: [
      { title: "Commander — Celestial Shop" },
      { name: "description", content: "Finalisez votre commande." },
    ],
  }),
  component: CommanderPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderForm {
  customer_name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  wilaya_id: string;
  delivery_type: "bureau" | "domicile" | "";
}

const EMPTY_FORM: OrderForm = {
  customer_name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  wilaya_id: "",
  delivery_type: "",
};

// ── Stepper ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Panier", icon: ShoppingBag },
  { id: 2, label: "Livraison", icon: MapPin },
  { id: 3, label: "Paiement", icon: CreditCard },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="mx-auto mb-10 flex w-full max-w-xl items-center justify-between px-0 sm:px-4">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isDone = current > step.id;
        const isActive = current === step.id;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step Circle with cyber design */}
            <div className="flex flex-col items-center relative group">
              <div
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all duration-300 sm:h-10 sm:w-10 ${
                  isDone
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : isActive
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)] animate-pulse"
                    : "border-white/10 bg-black/40 text-muted-foreground"
                }`}
              >
                {/* Cyber corner marks */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current opacity-70" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current opacity-70" />

                {isDone ? (
                  <Check className="h-4 w-4 stroke-[3px]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Label */}
              <div className="absolute top-11 flex w-16 flex-col items-center text-center sm:top-12 sm:w-auto">
                <span
                  className={`font-mono text-[8px] uppercase tracking-wider transition-colors duration-300 sm:text-[10px] sm:tracking-widest ${
                    isActive
                      ? "text-primary font-semibold"
                      : isDone
                      ? "text-emerald-400/90"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {step.id}. {step.label}
                </span>
              </div>
            </div>

            {/* SVG Connecting Line with Emerald Gradient */}
            {i < STEPS.length - 1 && (
              <div className="mx-1 flex flex-1 items-center sm:mx-4">
                <svg className="w-full h-2" viewBox="0 0 100 8" preserveAspectRatio="none" fill="none">
                  {/* Background thin dashed line */}
                  <line
                    x1="0"
                    y1="4"
                    x2="100"
                    y2="4"
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  {/* Progress Line */}
                  <line
                    x1="0"
                    y1="4"
                    x2="100"
                    y2="4"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    className="transition-all duration-700 ease-in-out"
                    style={{
                      strokeDasharray: "100",
                      strokeDashoffset: isDone ? 0 : 100,
                    }}
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Industrial Input with Floating Label ──────────────────────────────────────

interface IndustrialInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  required?: boolean;
  error?: string;
  isTextArea?: boolean;
  rows?: number;
}

function IndustrialInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  error,
  isTextArea = false,
  rows = 3,
}: IndustrialInputProps) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.trim().length > 0;

  return (
    <div className="relative group flex flex-col w-full">
      <div
        className={`relative w-full rounded-lg bg-card/70 border transition-all duration-300 backdrop-blur-md ${
          error
            ? "border-red-500/50 focus-within:border-red-500/80"
            : focused
            ? "border-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.1)]"
            : "border-border/70 hover:border-border"
        }`}
      >
        {/* Floating Label */}
        <label
          className={`absolute left-3 font-mono tracking-widest transition-all duration-200 pointer-events-none uppercase ${
            isFloating
              ? "top-1.5 text-[9px] text-sky-400 font-semibold"
              : "top-3.5 text-xs text-muted-foreground/80"
          }`}
        >
          {label} {required && <span className="text-red-400">*</span>}
        </label>

        {isTextArea ? (
          <textarea
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={rows}
            className="w-full bg-transparent px-3 pb-2 pt-6 text-sm text-foreground focus:outline-none resize-none"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full h-12 bg-transparent px-3 pb-1 pt-5 text-sm text-foreground focus:outline-none"
          />
        )}

        {/* Center-out Tech Blue Glow Focus Border */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-600 origin-center transition-transform duration-300 pointer-events-none ${
            focused ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </div>

      {/* Error Badge */}
      {error && (
        <div className="mt-1.5 self-start flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/20 bg-red-950/20 text-red-400 font-mono text-[9px] tracking-wider uppercase">
          <AlertTriangle className="h-3 w-3 animate-pulse" />
          <span>ERR // {error}</span>
        </div>
      )}
    </div>
  );
}

// ── Industrial Select with Floating Label ─────────────────────────────────────

interface IndustrialSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function IndustrialSelect({
  label,
  value,
  onChange,
  required = false,
  error,
  children,
}: IndustrialSelectProps) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value !== "";

  return (
    <div className="relative group flex flex-col w-full">
      <div
        className={`relative w-full rounded-lg bg-card/70 border transition-all duration-300 backdrop-blur-md ${
          error
            ? "border-red-500/50 focus-within:border-red-500/80"
            : focused
            ? "border-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.1)]"
            : "border-border/70 hover:border-border"
        }`}
      >
        {/* Floating Label */}
        <label
          className={`absolute left-3 font-mono tracking-widest transition-all duration-200 pointer-events-none uppercase ${
            isFloating
              ? "top-1.5 text-[9px] text-sky-400 font-semibold"
              : "top-3.5 text-xs text-muted-foreground/80"
          }`}
        >
          {label} {required && <span className="text-red-400">*</span>}
        </label>

        <select
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full h-12 bg-transparent px-3 pb-1 pt-5 text-sm text-foreground focus:outline-none appearance-none cursor-pointer"
        >
          {children}
        </select>

        {/* Custom Chevron Indicator */}
        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rotate-90 text-muted-foreground/60 transition-transform duration-200 group-focus-within:rotate-270 group-focus-within:text-sky-400" />

        {/* Center-out Tech Blue Glow Focus Border */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-600 origin-center transition-transform duration-300 pointer-events-none ${
            focused ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </div>

      {/* Error Badge */}
      {error && (
        <div className="mt-1.5 self-start flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/20 bg-red-950/20 text-red-400 font-mono text-[9px] tracking-wider uppercase">
          <AlertTriangle className="h-3 w-3 animate-pulse" />
          <span>ERR // {error}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

function CommanderPage() {
  const { items, totalPrice, clear } = useCartContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OrderForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof OrderForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Fetch wilayas
  const { data: wilayas = [] } = useQuery<Wilaya[]>({
    queryKey: ["wilayas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wilayas")
        .select("*")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!form.wilaya_id && wilayas.length > 0) {
      setForm((f) => ({ ...f, wilaya_id: String(wilayas[0].id) }));
    }
  }, [wilayas, form.wilaya_id]);

  const selectedWilaya = wilayas.find((w) => String(w.id) === form.wilaya_id);
  const rawDeliveryCost = selectedWilaya?.delivery_cost ?? 0;
  
  // Delivery: home varies by wilaya, office pickup is free.
  const deliveryCost = form.delivery_type === "domicile" ? rawDeliveryCost : 0;
    
  const totalWithDelivery = totalPrice + deliveryCost;

  // ── Redirect if cart empty ────────────────────────────────────────────────
  if (items.length === 0 && !orderId) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <Package className="mx-auto h-16 w-16 text-muted-foreground/30 animate-pulse" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Panier vide</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre panier est actuellement vide. Ajoutez des configurations ou des composants avant de passer commande.
        </p>
        <Link
          to="/boutique"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_20px_-8px_var(--color-primary)]"
        >
          Découvrir la Boutique
        </Link>
      </main>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (orderId) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="flex flex-col items-center gap-6 p-8 rounded-2xl border border-emerald-500/20 bg-black/40 backdrop-blur-md relative overflow-hidden">
          {/* Cyber accents for success box */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500" />

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/30">
            <Check className="h-8 w-8 text-emerald-400 stroke-[3px]" />
          </div>

          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
              // Transaction approuvée
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Commande Enregistrée !
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Votre commande a été transmise avec succès à nos équipes. Elle sera traitée dans les plus brefs délais.
            </p>
            <div className="mt-4 inline-block px-4 py-2 rounded bg-white/5 border border-white/10">
              <p className="font-mono text-xs text-muted-foreground">
                REF DE COMMANDE :{" "}
                <span className="text-foreground font-bold tracking-wider">
                  {orderId.split("-")[0].toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Link
              to="/boutique"
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Retour à la boutique
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validateForm(): boolean {
    const e: Partial<Record<keyof OrderForm, string>> = {};
    if (!form.customer_name.trim()) e.customer_name = "Nom requis";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email valide requis";
    if (!form.phone.trim() || form.phone.replace(/\s/g, "").length < 9)
      e.phone = "Numéro requis (min 9 chiffres)";
    if (!form.address.trim()) e.address = "Adresse complète requise";
    if (!form.wilaya_id) e.wilaya_id = "Wilaya requise";
    if (!form.delivery_type) e.delivery_type = "Mode de livraison requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const wilaya = wilayas.find((w) => String(w.id) === form.wilaya_id)!;

      const finalDeliveryCost = form.delivery_type === "domicile" ? wilaya.delivery_cost : 0;
      const finalTotal = totalPrice + finalDeliveryCost;

      // Insert order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          status: "pending",
          customer_name: form.customer_name.trim(),
          company: form.company.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          delivery_type: form.delivery_type,
          wilaya_id: wilaya.id,
          wilaya_name: wilaya.name,
          delivery_cost: finalDeliveryCost,
          subtotal: totalPrice,
          total: finalTotal,
        })
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      // Insert order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        item_type: item.type,
        reference_id: item.reference_id ?? null,
        name: item.name,
        image_url: item.image_url ?? null,
        unit_price: item.unit_price,
        quantity: item.quantity,
        description: item.description ?? null,
        specs: item.specs ?? null,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsErr) throw itemsErr;

      clear();
      setOrderId(order.id);
    } catch (err: any) {
      toast.error(`Erreur lors de la commande : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      {/* Header */}
      <div className="mb-8 border-b border-border/50 pb-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
          // Système de Commande
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Finaliser ma commande</h1>
      </div>

      {/* Stepper */}
      <div className="mb-12">
        <Stepper current={step} />
      </div>

      {/* ── Step 1: Cart recap ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/45" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/45" />
            
            <div className="border-b border-border/60 px-5 py-4 bg-muted/25">
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold">
                // Récapitulatif du Panier
              </span>
            </div>
            
            <div className="divide-y divide-white/5">
              {items.map((item) => (
                <div key={item.cartId} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover border border-border/60"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/35">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-foreground">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {item.description}
                      </div>
                    )}
                    {/* Specs check */}
                    {Array.isArray(item.specs) && item.specs.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(item.specs as CartItemSpec[]).map((s, i) => (
                          <span
                            key={i}
                            className="rounded bg-muted/35 border border-border/50 px-2 py-0.5 font-mono text-[9px] text-muted-foreground"
                          >
                            {s.category}: {s.product}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="font-mono text-sm font-bold text-foreground">
                      {(item.unit_price * item.quantity).toLocaleString("fr-DZ")} DA
                    </div>
                    {item.quantity > 1 && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        ×{item.quantity}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-border/60 bg-muted/20 px-5 py-4 flex justify-between items-center">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Sous-total</span>
              <span className="font-mono text-base font-bold text-foreground">
                {totalPrice.toLocaleString("fr-DZ")} DA
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/panier"
              className="rounded-lg border border-border/70 px-5 py-2.5 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground transition-all hover:border-border hover:text-foreground"
            >
              ← Modifier le panier
            </Link>
            <button
              onClick={() => setStep(2)}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_4px_25px_-8px_var(--color-primary)] transition-all hover:bg-primary/95"
            >
              Informations de livraison
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Delivery form ── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="rounded-xl border border-border/70 bg-card/55 backdrop-blur-md p-6 space-y-5 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/45" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/45" />
            
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">
              // Coordonnées de Contact
            </div>
            
            <div className="grid gap-5 sm:grid-cols-2">
              <IndustrialInput
                label="Nom complet"
                required
                value={form.customer_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customer_name: e.target.value }))
                }
                error={errors.customer_name}
              />
              <IndustrialInput
                label="Entreprise (facultatif)"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
              />
              <IndustrialInput
                label="Email"
                required
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                error={errors.email}
              />
              <IndustrialInput
                label="Numéro de téléphone"
                required
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                error={errors.phone}
              />
            </div>

            <IndustrialInput
              label="Adresse complète"
              required
              isTextArea
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              error={errors.address}
            />
          </div>

          {/* Delivery choices */}
          <div className="rounded-xl border border-border/70 bg-card/55 backdrop-blur-md p-6 space-y-6 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/45" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/45" />
            
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">
              // Destination et Option d'envoi
            </div>

            {/* Wilaya Selection */}
            <IndustrialSelect
              label="Wilaya"
              required
              value={form.wilaya_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, wilaya_id: e.target.value }))
              }
              error={errors.wilaya_id}
            >
              {wilayas.map((w) => (
                <option key={w.id} value={String(w.id)} className="bg-card text-foreground">
                  {String(w.code).padStart(2, "0")} — {w.name}
                </option>
              ))}
            </IndustrialSelect>

            {/* Delivery Type (2 Large Interactive Cards) */}
            <div className="space-y-3">
              <label className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                Mode de livraison {errors.delivery_type && <span className="text-red-400">*</span>}
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Domicile Card */}
                <div
                  onClick={() => setForm((f) => ({ ...f, delivery_type: "domicile" }))}
                  className={`relative flex flex-col p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer backdrop-blur-md overflow-hidden ${
                    form.delivery_type === "domicile"
                      ? "border-emerald-500 bg-emerald-500/[0.03] shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                      : "border-border/60 bg-card/50 hover:border-border hover:bg-card/65"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-all ${
                        form.delivery_type === "domicile"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-border/60 bg-muted/35 text-muted-foreground/70"
                      }`}
                    >
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4
                        className={`font-semibold text-sm transition-colors ${
                          form.delivery_type === "domicile" ? "text-emerald-400" : "text-foreground"
                        }`}
                      >
                        Livraison à Domicile
                      </h4>
                      <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                        Colis livré en mains propres à l'adresse indiquée ci-dessus.
                      </p>
                      
                      {selectedWilaya && (
                        <div className="mt-4 font-mono text-xs font-bold text-foreground">
                          Tarif : {rawDeliveryCost.toLocaleString("fr-DZ")} DA
                        </div>
                      )}
                      
                    </div>
                  </div>

                  <span
                    className={`absolute top-3 right-3 font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border transition-all ${
                      form.delivery_type === "domicile"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-border/40 bg-muted/25 text-muted-foreground/40"
                    }`}
                  >
                    {form.delivery_type === "domicile" ? "[ ACTIF ]" : "[ SÉLECTIONNER ]"}
                  </span>
                </div>

                {/* Bureau Card */}
                <div
                  onClick={() => setForm((f) => ({ ...f, delivery_type: "bureau" }))}
                  className={`relative flex flex-col p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer backdrop-blur-md overflow-hidden ${
                    form.delivery_type === "bureau"
                      ? "border-emerald-500 bg-emerald-500/[0.03] shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                      : "border-border/60 bg-card/50 hover:border-border hover:bg-card/65"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-all ${
                        form.delivery_type === "bureau"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-border/60 bg-muted/35 text-muted-foreground/70"
                      }`}
                    >
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <h4
                        className={`font-semibold text-sm transition-colors ${
                          form.delivery_type === "bureau" ? "text-emerald-400" : "text-foreground"
                        }`}
                      >
                        Retrait au Bureau
                      </h4>
                      <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                        Retrait directement à notre bureau (présence du client requise).
                      </p>

                    </div>
                  </div>

                  <span
                    className={`absolute top-3 right-3 font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border transition-all ${
                      form.delivery_type === "bureau"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-border/40 bg-muted/25 text-muted-foreground/40"
                    }`}
                  >
                    {form.delivery_type === "bureau" ? "[ ACTIF ]" : "[ SÉLECTIONNER ]"}
                  </span>
                </div>
              </div>

              {errors.delivery_type && (
                <div className="mt-1.5 self-start flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/20 bg-red-950/20 text-red-400 font-mono text-[9px] tracking-wider uppercase">
                  <AlertTriangle className="h-3 w-3 animate-pulse" />
                  <span>ERR // {errors.delivery_type}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-border/70 px-5 py-2.5 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground transition-all hover:border-border hover:text-foreground"
            >
              ← Retour
            </button>
            <button
              onClick={() => {
                if (validateForm()) setStep(3);
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_4px_25px_-8px_var(--color-primary)] transition-all hover:bg-primary/95"
            >
              Vérifier ma commande
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirmation ── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* final items check */}
          <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/45" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/45" />
            
            <div className="border-b border-border/60 px-5 py-4 bg-muted/25 font-mono text-[10px] uppercase tracking-widest text-primary font-semibold">
              // Facturation Finale
            </div>
            
            <div className="divide-y divide-white/5">
              {items.map((item) => (
                <div key={item.cartId} className="flex items-center gap-3 px-5 py-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-10 w-10 shrink-0 rounded-md object-cover border border-border/60"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/35">
                      <Package className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 text-xs font-semibold truncate text-foreground">{item.name}</div>
                  <div className="font-mono text-xs font-bold text-foreground shrink-0">
                    {(item.unit_price * item.quantity).toLocaleString("fr-DZ")} DA
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/60 bg-muted/20 px-5 py-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Sous-total</span>
                <span className="font-mono text-foreground">{totalPrice.toLocaleString("fr-DZ")} DA</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                  Frais de port ({selectedWilaya?.name} — {form.delivery_type === "bureau" ? "Bureau" : "Domicile"})
                </span>
                <span className="font-mono text-foreground">
                  {deliveryCost.toLocaleString("fr-DZ")} DA
                </span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-3 mt-1 font-bold text-sm">
                <span className="font-mono uppercase tracking-widest text-xs">Total à payer</span>
                <span className="font-mono text-primary text-base">
                  {totalWithDelivery.toLocaleString("fr-DZ")} DA
                </span>
              </div>
            </div>
          </div>

          {/* Customer details recap */}
          <div className="rounded-xl border border-border/70 bg-card/55 backdrop-blur-md p-6 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/45" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/45" />

            <div className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold mb-4">
              // Coordonnées de Livraison
            </div>

            <div className="grid gap-y-3 gap-x-8 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-1 border-b border-border/50 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">Destinataire</span>
                <span className="font-semibold text-foreground">{form.customer_name}</span>
              </div>
              {form.company && (
                <div className="flex flex-col gap-1 border-b border-border/50 pb-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">Entreprise</span>
                  <span className="font-semibold text-foreground">{form.company}</span>
                </div>
              )}
              <div className="flex flex-col gap-1 border-b border-border/50 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">Email</span>
                <span className="font-semibold text-foreground">{form.email}</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-border/50 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">Téléphone</span>
                <span className="font-semibold text-foreground">{form.phone}</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-border/50 pb-2 sm:col-span-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">Adresse</span>
                <span className="font-semibold text-foreground">{form.address}</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-border/50 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">Wilaya</span>
                <span className="font-semibold text-foreground">{selectedWilaya?.name}</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-border/50 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">Type de livraison</span>
                <span className="font-semibold text-foreground capitalize">
                  {form.delivery_type === "bureau" ? "Retrait au Bureau" : "Livraison à Domicile"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-border/70 px-5 py-2.5 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground transition-all hover:border-border hover:text-foreground"
            >
              ← Modifier
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_4px_25px_-8px_var(--color-primary)] transition-all hover:bg-primary/95 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {submitting ? "Traitement..." : "Confirmer et Commander"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
