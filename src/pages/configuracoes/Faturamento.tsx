import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Star, Crown, Rocket, Check, ArrowRight, Users, CreditCard,
  Loader2, AlertTriangle, Calendar, HeartCrack,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLAN_FEATURES, PlanType } from "@/config/planConfig";
import { PLANS, formatPrice } from "@/config/plans";
import { whatsappUrl } from "@/config/contact";
import { CancelSubscriptionDialog } from "@/components/configuracoes/CancelSubscriptionDialog";
import { normalizeSubscriptionStatus } from "@/lib/utils";

// Ícones por plano — os dados (preço, features, limites) vêm da fonte única
// em src/config/plans.ts, nada de lista hardcoded aqui.
const PLAN_ICONS: Record<PlanType, React.ComponentType<any>> = {
  free: Star,
  pro: Rocket,
};

interface Subscription {
  status: "active" | "trialing" | "expired" | "cancelled";
  trial_ends_at: string | null;
  cancelled_at: string | null;
  ends_at: string | null;
  mp_subscription_id: string | null;
}


export default function Faturamento() {
  const { isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const { currentPlan, planInfo } = usePlan();
  const navigate = useNavigate();

  const effectiveCompanyId = activeCompanyId || companyId;

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);

    const [companyRes, teamRes] = await Promise.all([
      supabase
        .from("companies")
        .select("subscription_status, trial_ends_at, subscription_cancelled_at, subscription_ends_at, mp_subscription_id")
        .eq("id", effectiveCompanyId)
        .maybeSingle(),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId),
    ]);

    if (companyRes.data) {
      setSubscription({
        status: normalizeSubscriptionStatus(companyRes.data.subscription_status),
        trial_ends_at: companyRes.data.trial_ends_at,
        cancelled_at: companyRes.data.subscription_cancelled_at,
        ends_at: companyRes.data.subscription_ends_at,
        mp_subscription_id: companyRes.data.mp_subscription_id,
      });
    }

    setTeamCount(teamRes.count || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [effectiveCompanyId]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-8 text-center">
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

  const PlanIcon = PLAN_ICONS[currentPlan];
  const status = subscription?.status || "active";
  const daysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  // Trial expirado não é mais "trialing" pra UI: a conta degradou pro Free.
  const isTrialing = status === "trialing" && (daysLeft ?? 0) > 0;
  const isCancelled = status === "cancelled" || !!subscription?.cancelled_at;
  const currentPlanData = PLANS[currentPlan];

  const endsAtFormatted = subscription?.ends_at
    ? new Date(subscription.ends_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;


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
            onClick={() => navigate("/upgrade")}
            className="h-8 text-xs rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 shrink-0"
          >
            Reativar
          </Button>
        </div>
      )}

      {/* Plan card */}
      <div className="rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
        <div className="grid sm:grid-cols-[1fr_auto] divide-y sm:divide-y-0 sm:divide-x divide-[#E6EDF5]">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                currentPlan === "pro" ? "bg-[rgba(37,99,235,0.12)]" :
                "bg-[#F1F5F9]"
              }`}>
                <PlanIcon className={`h-5 w-5 ${
                  currentPlan === "pro" ? "text-[#2563EB]" :
                  "text-[#64748B]"
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-foreground">Plano {planInfo.label}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    !subscription ? "bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)]" :
                    isCancelled ? "bg-[var(--vyz-danger-bg)] text-[var(--vyz-danger)]" :
                    status === "expired" ? "bg-[var(--vyz-warning-bg)] text-[var(--vyz-warning)]" :
                    isTrialing ? "bg-[var(--vyz-warning-bg)] text-[var(--vyz-warning)]" :
                    "bg-[var(--vyz-success-bg)] text-[var(--vyz-success)]"
                  }`}>
                    {!subscription ? "Sem dados" : isCancelled ? "Cancelado" : status === "expired" ? "Vencido" : isTrialing ? "Em teste" : "Ativo"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isTrialing
                    ? "Teste grátis"
                    : currentPlanData.monthlyPrice
                      ? `${formatPrice(currentPlanData.monthlyPrice)}/mês`
                      : formatPrice(currentPlanData.monthlyPrice)}
                  {isTrialing && daysLeft !== null && (
                    <span className="text-amber-400 font-medium"> · {daysLeft}d restantes, depois sua conta continua no Free</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {currentPlanData.features.map((f, i) => (
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
                used={teamCount}
                limit={PLAN_FEATURES[currentPlan].maxUsers}
                label="Pessoas na equipe"
                icon={Users}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Assinar: quem ainda não paga (teste grátis, vencido ou cancelado) */}
      {status !== "active" && (
        <div className="rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-semibold text-foreground">Assinar o Vyzon</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatPrice(PLANS.pro.monthlyPrice)}/mês, tudo liberado. Pagamento por Pix ou cartão.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/upgrade")}
            className="h-9 rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 shrink-0"
          >
            Assinar
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
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
          className={`h-full rounded-full transition-all ${nearLimit ? "bg-amber-500" : "bg-[#2563EB]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
