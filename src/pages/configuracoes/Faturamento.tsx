import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CalendarBlank, Check, CircleNotch, CreditCard, Users, type Icon } from "@phosphor-icons/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PLANS, formatPrice } from "@/config/plans";
import { whatsappUrl } from "@/config/contact";
import { formatError, normalizeSubscriptionStatus, type SubscriptionStatus } from "@/lib/utils";
import { usePreviewConfig } from "./preview";

// Preço, features e limites vêm da fonte única em src/config/plans.ts.

interface Subscription {
  status: SubscriptionStatus;
  cancelled_at: string | null;
  ends_at: string | null;
  /** Cliente no Stripe: tem portal para cartão, faturas e cancelamento. */
  stripe_customer_id: string | null;
}


export default function Faturamento() {
  const { isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const { currentPlan, planInfo } = usePlan();
  const navigate = useNavigate();
  const preview = usePreviewConfig();

  const effectiveCompanyId = activeCompanyId || companyId;

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [abrindoPortal, setAbrindoPortal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  // Volta do checkout: o webhook pode levar uns segundos para liberar a conta.
  const [confirmando, setConfirmando] = useState(searchParams.get("assinatura") === "ok");

  const load = async () => {
    if (!effectiveCompanyId) {
      // Preview de dev sem login: mostra a tela vazia em vez do carregando eterno.
      if (preview) setLoading(false);
      return;
    }
    setLoading(true);

    const [companyRes, teamRes] = await Promise.all([
      supabase
        .from("companies")
        .select("subscription_status, subscription_cancelled_at, subscription_ends_at, stripe_customer_id")
        .eq("id", effectiveCompanyId)
        .maybeSingle(),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId),
    ]);

    if (companyRes.data) {
      setSubscription({
        status: normalizeSubscriptionStatus(companyRes.data.subscription_status),

        cancelled_at: companyRes.data.subscription_cancelled_at,
        ends_at: companyRes.data.subscription_ends_at,
        stripe_customer_id: companyRes.data.stripe_customer_id,
      });
    }

    setTeamCount(teamRes.count || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (!confirmando || !effectiveCompanyId) return;
    let tentativas = 0;
    const timer = window.setInterval(async () => {
      tentativas += 1;
      const { data } = await supabase
        .from("companies")
        .select("subscription_status")
        .eq("id", effectiveCompanyId)
        .maybeSingle();
      if (data?.subscription_status === "active") {
        window.clearInterval(timer);
        toast.success("Pagamento aprovado. Sua conta está liberada.");
        // Recarrega para o menu e as travas lerem a assinatura nova. Vai para o
        // placar: conta paga sem a Lume configurada segue sozinha para a
        // conversa de configuração, e quem já configurou vê os primeiros passos.
        window.location.replace("/orcamentos");
      } else if (tentativas >= 20) {
        window.clearInterval(timer);
        setConfirmando(false);
        setSearchParams({}, { replace: true });
        toast.message("O pagamento ainda está sendo confirmado. A conta libera sozinha assim que ele for aprovado.");
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [confirmando, effectiveCompanyId]);

  const abrirPortal = async () => {
    setAbrindoPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("assinatura-portal", {
        body: { companyId: effectiveCompanyId },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Sem link");
      window.location.assign(data.url);
    } catch (e) {
      toast.error(`Não deu para abrir a assinatura: ${formatError(e)}`);
      setAbrindoPortal(false);
    }
  };

  if (!isAdmin && !preview) {
    return <div className="vp-vazio">Apenas admins podem acessar faturamento.</div>;
  }

  if (confirmando) {
    return (
      <div className="vp-cartao" role="status">
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <CircleNotch size={20} className="animate-spin text-[var(--vyz-text-muted)] motion-reduce:animate-none" aria-hidden />
          <p className="vp-rotulo">Confirmando o pagamento</p>
          <p className="vp-campo__ajuda">Leva poucos segundos.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="vp-vazio" aria-busy="true">
        <div className="flex items-center justify-center py-10">
          <CircleNotch size={20} className="animate-spin motion-reduce:animate-none" aria-hidden />
          <span className="sr-only">Carregando o plano</span>
        </div>
      </div>
    );
  }

  const status = subscription?.status || "active";
  const isCancelled = status === "cancelled" || !!subscription?.cancelled_at;
  const currentPlanData = PLANS[currentPlan];

  const endsAtFormatted = subscription?.ends_at
    ? new Date(subscription.ends_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  const statusChip: { texto: string; tom?: "ok" | "sol" | "ruim" } = !subscription
    ? { texto: "Sem dados" }
    : isCancelled
      ? { texto: "Cancelado", tom: "ruim" }
      : status === "expired"
        ? { texto: "Vencido", tom: "sol" }
        : status !== "active"
          ? { texto: "Sem plano" }
          : { texto: "Ativo", tom: "ok" };

  return (
    <div className="vp-pilha">
      {isCancelled && endsAtFormatted && (
        <section className="vp-cartao vp-cartao--sol flex flex-col gap-4 sm:flex-row sm:items-center" aria-labelledby="fat-cancelada">
          <CalendarBlank size={20} className="hidden shrink-0 text-[var(--vyz-warning)] sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="fat-cancelada" className="vp-rotulo">Assinatura cancelada, ativa até {endsAtFormatted}</h2>
            <p className="vp-sub">
              Você mantém acesso ao <strong className="font-semibold text-[var(--vyz-text-primary)]">{planInfo.label}</strong> até
              essa data. Depois dela, a conta fica sem assinatura. Pode reativar a qualquer momento.
            </p>
          </div>
          <button
            type="button"
            className="vp-botao self-start sm:self-center"
            disabled={abrindoPortal}
            onClick={() => (subscription?.stripe_customer_id && status === "active" ? abrirPortal() : navigate("/upgrade"))}
          >
            Reativar
          </button>
        </section>
      )}

      <section className="vp-cartao grid gap-6 sm:grid-cols-[1fr_240px]" aria-labelledby="fat-plano">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="fat-plano" className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">
              {/* "free" é piso interno (plans.ts): nunca aparece como plano para a pessoa. */}
              {currentPlan === "free" ? "Sem assinatura" : `Plano ${planInfo.label}`}
            </h2>
            <span className="vp-chip" data-tom={statusChip.tom}>{statusChip.texto}</span>
          </div>
          <p className="vp-sub">
            {currentPlan === "free"
              ? `Assine o Vyzon por ${formatPrice(PLANS.pro.monthlyPrice)}/mês para a Lume acompanhar seus orçamentos.`
              : currentPlanData.monthlyPrice
                ? `${formatPrice(currentPlanData.monthlyPrice)}/mês`
                : formatPrice(currentPlanData.monthlyPrice)}
          </p>
          {currentPlanData.features.length > 0 && (
            <ul className="mt-4 space-y-2">
              {currentPlanData.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--vyz-text)]">
                  <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-[var(--vyz-success)]" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--vyz-surface-2)] pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="vp-rotulo">Uso atual</p>
          <div className="mt-3">
            <UsageRow used={teamCount} limit={currentPlanData.limits.users} label="Pessoas na equipe" icon={Users} />
          </div>
        </div>
      </section>

      {/* Assinar: quem ainda não paga (sem plano, vencido ou cancelado) */}
      {status !== "active" && (
        <section className="vp-cartao flex flex-col gap-4 sm:flex-row sm:items-center" aria-labelledby="fat-assinar">
          <div className="min-w-0 flex-1">
            <h2 id="fat-assinar" className="vp-rotulo">Assinar o Vyzon</h2>
            <p className="vp-sub">
              {formatPrice(PLANS.pro.monthlyPrice)}/mês, tudo liberado. Pagamento no cartão de crédito.
            </p>
          </div>
          <button type="button" className="vp-botao self-start sm:self-center" onClick={() => navigate("/upgrade")}>
            Assinar
            <ArrowRight size={16} aria-hidden />
          </button>
        </section>
      )}

      {/* Assinatura no cartão: cartão, faturas e cancelamento ficam no portal do Stripe */}
      {status === "active" && !isCancelled && subscription?.stripe_customer_id && (
        <section className="vp-cartao flex flex-col gap-4 sm:flex-row sm:items-center" aria-labelledby="fat-gerenciar">
          <div className="min-w-0 flex-1">
            <h2 id="fat-gerenciar" className="vp-rotulo">Gerenciar assinatura</h2>
            <p className="vp-sub">
              Trocar o cartão, baixar as faturas ou cancelar. Cancelando, o acesso segue até o fim do mês já pago.
            </p>
          </div>
          <button
            type="button"
            className="vp-botao vp-botao--quieto self-start sm:self-center"
            disabled={abrindoPortal}
            onClick={abrirPortal}
          >
            {abrindoPortal ? (
              <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <CreditCard size={16} aria-hidden />
            )}
            Abrir
          </button>
        </section>
      )}

      {/* Paga por fora do cartão (combinada antes do Stripe): muda pelo suporte */}
      {status === "active" && !subscription?.stripe_customer_id && (
        <p className="px-1 text-[13px] leading-relaxed text-[var(--vyz-text-muted)]">
          Sua assinatura foi combinada direto com o Vyzon. Para mudar a forma de pagamento ou cancelar,{" "}
          <a
            href={whatsappUrl("Oi! Quero mudar a assinatura do Vyzon.")}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm font-medium text-[var(--vyz-text-primary)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vyz-accent)]"
          >
            fale com o suporte
          </a>
          .
        </p>
      )}
    </div>
  );
}

function UsageRow({
  used, limit, label, icon: RowIcon,
}: { used: number; limit: number; label: string; icon: Icon }) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 12 : Math.min(100, (used / limit) * 100);
  const nearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[13px]">
        <RowIcon size={16} className="text-[var(--vyz-text-muted)]" aria-hidden />
        <span className="flex-1 text-[var(--vyz-text-muted)]">{label}</span>
        <span className={`font-semibold tabular-nums ${nearLimit ? "text-[var(--vyz-warning)]" : "text-[var(--vyz-text-primary)]"}`}>
          {used}{isUnlimited ? "" : ` / ${limit}`}
          {isUnlimited && <span className="ml-1 text-[12px] text-[var(--vyz-text-dim)]">∞</span>}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--vyz-surface-2)]"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={isUnlimited ? undefined : limit}
        aria-valuenow={used}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${nearLimit ? "bg-[var(--vyz-warning)]" : "bg-[var(--vyz-accent)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
