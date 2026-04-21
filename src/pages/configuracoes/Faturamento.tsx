import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Crown, Zap, Check, ArrowRight, Users, Package, CreditCard,
  Loader2, AlertTriangle, Calendar, HeartCrack,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLAN_FEATURES, PLANS_INFO, PlanType } from "@/config/planConfig";
import { CancelSubscriptionDialog } from "@/components/configuracoes/CancelSubscriptionDialog";

const PLAN_DETAILS: Record<PlanType, {
  icon: React.ComponentType<any>;
  price: string;
  features: string[];
}> = {
  starter: {
    icon: Zap,
    price: "R$ 147/mês",
    features: ["2 vendedores", "10 produtos", "Dashboard + CRM", "Ranking + Gamificação"],
  },
  plus: {
    icon: Sparkles,
    price: "R$ 297/mês",
    features: ["10 vendedores", "50 produtos", "Eva (30/dia)", "Tudo do Starter"],
  },
  pro: {
    icon: Crown,
    price: "R$ 797/mês",
    features: ["Vendedores ilimitados", "Produtos ilimitados", "Eva ilimitada", "Tudo do Plus"],
  },
};

interface Subscription {
  status: "active" | "trialing" | "expired" | "cancelled";
  trial_ends_at: string | null;
  cancelled_at: string | null;
  ends_at: string | null;
  mp_subscription_id: string | null;
}

interface UsageStats {
  teamCount: number;
  productsCount: number;
  salesThisMonth: number;
  revenueThisMonth: number;
}

export default function Faturamento() {
  const { isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const { currentPlan, planInfo } = usePlan();
  const navigate = useNavigate();

  const effectiveCompanyId = activeCompanyId || companyId;

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [stats, setStats] = useState<UsageStats>({
    teamCount: 0,
    productsCount: 0,
    salesThisMonth: 0,
    revenueThisMonth: 0,
  });
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);

    const [companyRes, teamRes, productsRes, salesRes] = await Promise.all([
      supabase
        .from("companies")
        .select("subscription_status, trial_ends_at, subscription_cancelled_at, subscription_ends_at, mp_subscription_id")
        .eq("id", effectiveCompanyId)
        .maybeSingle(),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId),
      supabase.from("produtos").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId),
      supabase
        .from("vendas")
        .select("valor")
        .eq("company_id", effectiveCompanyId)
        .eq("status", "Aprovado")
        .gte("data_venda", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    if (companyRes.data) {
      setSubscription({
        status: companyRes.data.subscription_status || "active",
        trial_ends_at: companyRes.data.trial_ends_at,
        cancelled_at: companyRes.data.subscription_cancelled_at,
        ends_at: companyRes.data.subscription_ends_at,
        mp_subscription_id: companyRes.data.mp_subscription_id,
      });
    }

    const revenue = (salesRes.data || []).reduce((s: number, v: any) => s + (Number(v.valor) || 0), 0);
    setStats({
      teamCount: teamRes.count || 0,
      productsCount: productsRes.count || 0,
      salesThisMonth: salesRes.data?.length || 0,
      revenueThisMonth: revenue,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [effectiveCompanyId]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Apenas admins podem acessar faturamento.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const PlanIcon = PLAN_DETAILS[currentPlan].icon;
  const status = subscription?.status || "active";
  const isTrialing = status === "trialing";
  const isCancelled = status === "cancelled" || !!subscription?.cancelled_at;
  const planOrder: PlanType[] = ["starter", "plus", "pro"];
  const currentIndex = planOrder.indexOf(currentPlan);

  const daysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const endsAtFormatted = subscription?.ends_at
    ? new Date(subscription.ends_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-5">
      {/* Cancellation banner */}
      {isCancelled && endsAtFormatted && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Assinatura cancelada — ativa até {endsAtFormatted}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Você mantém acesso ao <strong className="text-foreground">{planInfo.label}</strong> até
              essa data. Após isso, a conta vira Free. Pode reativar a qualquer momento.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/upgrade?plan=${currentPlan}`)}
            className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
          >
            Reativar
          </Button>
        </div>
      )}

      {/* Plan card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="grid sm:grid-cols-[1fr_auto] divide-y sm:divide-y-0 sm:divide-x divide-border/50">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                currentPlan === "pro" ? "bg-emerald-500/15" :
                currentPlan === "plus" ? "bg-blue-500/15" :
                "bg-zinc-500/15"
              }`}>
                <PlanIcon className={`h-5 w-5 ${
                  currentPlan === "pro" ? "text-emerald-400" :
                  currentPlan === "plus" ? "text-blue-400" :
                  "text-zinc-400"
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-foreground">Plano {planInfo.label}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    isCancelled ? "bg-rose-500/15 text-rose-400" :
                    status === "active" ? "bg-emerald-500/15 text-emerald-400" :
                    isTrialing ? "bg-amber-500/15 text-amber-400" :
                    "bg-zinc-500/15 text-zinc-400"
                  }`}>
                    {isCancelled ? "Cancelado" : isTrialing ? "Trial" : "Ativo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {PLAN_DETAILS[currentPlan].price}
                  {isTrialing && daysLeft !== null && (
                    <span className="text-amber-400 font-medium"> · {daysLeft}d restantes no trial</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {PLAN_DETAILS[currentPlan].features.map((f, i) => (
                <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-500/70" />{f}
                </span>
              ))}
            </div>
          </div>

          {/* Usage meters */}
          <div className="p-6 space-y-3 sm:min-w-[240px]">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Uso atual</p>
            <div className="space-y-2.5">
              <UsageRow
                used={stats.teamCount}
                limit={PLAN_FEATURES[currentPlan].maxUsers}
                label="Vendedores"
                icon={Users}
              />
              <UsageRow
                used={stats.productsCount}
                limit={PLAN_FEATURES[currentPlan].maxProducts}
                label="Produtos"
                icon={Package}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Faturamento no mês</p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {formatCurrency(stats.revenueThisMonth)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Vendas no mês</p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {stats.salesThisMonth}
          </p>
        </div>
      </div>

      {/* Upgrade options */}
      {currentIndex < planOrder.length - 1 && !isCancelled && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/50">
            <h2 className="text-[13px] font-semibold text-foreground">Fazer upgrade</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Destrava mais vendedores, Eva e integrações</p>
          </div>
          <div className="p-3 space-y-2">
            {planOrder.slice(currentIndex + 1).map((plan) => {
              const details = PLAN_DETAILS[plan];
              const info = PLANS_INFO[plan];
              const Icon = details.icon;
              return (
                <button
                  key={plan}
                  onClick={() => navigate(`/upgrade?plan=${plan}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all text-left group"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    plan === "plus" ? "bg-blue-500/15" : "bg-emerald-500/15"
                  }`}>
                    <Icon className={`h-4 w-4 ${plan === "plus" ? "text-blue-400" : "text-emerald-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{info.label}</p>
                    <p className="text-xs text-muted-foreground">{details.price} · {details.features[0]}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {!isCancelled && (
        <div className="pt-6 mt-2 border-t border-border/30">
          <div className="flex items-center justify-between gap-4 px-1">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Cancelar assinatura
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">
                {isTrialing
                  ? "Encerra o trial imediatamente e sua conta vira Free."
                  : "Você mantém acesso até o fim do ciclo pago atual."}
              </p>
            </div>
            <button
              onClick={() => setCancelOpen(true)}
              className="text-[12px] font-medium text-muted-foreground hover:text-rose-400 transition-colors px-3 py-1.5 rounded-md hover:bg-rose-500/5 shrink-0"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cancel dialog */}
      {effectiveCompanyId && (
        <CancelSubscriptionDialog
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          companyId={effectiveCompanyId}
          planLabel={planInfo.label}
          onCancelled={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function UsageRow({
  used, limit, label, icon: Icon,
}: { used: number; limit: number; label: string; icon: React.ComponentType<any> }) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 12 : Math.min(100, (used / limit) * 100);
  const nearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[11px]">
        <Icon className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-muted-foreground flex-1">{label}</span>
        <span className={`font-medium tabular-nums ${nearLimit ? "text-amber-400" : "text-foreground"}`}>
          {used}{isUnlimited ? "" : ` / ${limit}`}
          {isUnlimited && <span className="text-muted-foreground/50 ml-1 text-[10px]">∞</span>}
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${nearLimit ? "bg-amber-500" : "bg-emerald-500/80"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
