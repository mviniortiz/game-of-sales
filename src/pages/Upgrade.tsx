import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PLANS, PLAN_ORDER, formatPrice, getBillingConfig, getAnnualMonthlyEquivalent, type BillingCycle } from "@/config/plans";
import { PLANS_INFO, PLAN_FEATURES, type PlanType } from "@/config/planConfig";
import { initMercadoPago } from "@mercadopago/sdk-react";
import coreCreateCardToken from "@mercadopago/sdk-react/esm/coreMethods/cardToken/create";
import {
  ArrowLeft, ArrowRight, Check, Crown, CreditCard, Eye, EyeOff,
  Loader2, Lock, Rocket, Shield, Sparkles, Zap, Users, Package, Bot
} from "lucide-react";
import { formatDocument, validateDocument } from "@/utils/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Initialize MercadoPago
const mpPublicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
if (mpPublicKey) {
  initMercadoPago(mpPublicKey, { locale: "pt-BR" });
}

// ─── Helpers ───────────────────────────────────────────────────────

const PLAN_ICONS: Record<string, React.ComponentType<any>> = {
  starter: Zap,
  plus: Crown,
  pro: Rocket,
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  starter: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30" },
  plus: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  pro: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
};

const MP_ERROR_MESSAGES: Record<string, string> = {
  "106": "Número do cartão inválido.",
  "205": "Número do cartão inválido.",
  "208": "Mês de validade inválido.",
  "209": "Ano de validade inválido.",
  "212": "CPF/CNPJ inválido.",
  "214": "CPF/CNPJ inválido.",
  "221": "Nome do titular inválido.",
  "224": "CVV inválido.",
  "E301": "Número do cartão inválido.",
  "E302": "CVV inválido.",
  "316": "Nome do titular inválido.",
  "default": "Não foi possível processar o cartão. Verifique os dados.",
};

const getMpErrorMessage = (error: any): string => {
  const cause = error?.cause;
  if (Array.isArray(cause)) {
    for (const c of cause) {
      const code = c?.code || c?.message;
      if (code && MP_ERROR_MESSAGES[code]) return MP_ERROR_MESSAGES[code];
    }
  }
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("card number")) return "Número do cartão inválido.";
  if (msg.includes("security code") || msg.includes("cvv")) return "CVV inválido.";
  if (msg.includes("expiration")) return "Data de validade inválida.";
  if (msg.includes("timeout") || msg.includes("tempo")) return "Tempo esgotado. Tente novamente.";
  return MP_ERROR_MESSAGES["default"];
};

const formatCardNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatExpiration = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};


// ─── Main ──────────────────────────────────────────────────────────

export default function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentPlan } = usePlan();
  const { activeCompanyId } = useTenant();

  // Target plan from URL, default to next plan
  const urlPlan = searchParams.get("plan") as PlanType | null;
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const defaultTarget = currentIdx < PLAN_ORDER.length - 1 ? PLAN_ORDER[currentIdx + 1] : null;
  const [targetPlan, setTargetPlan] = useState<string>(urlPlan || defaultTarget || "pro");

  // Billing
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");

  // Card form
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiration, setCardExpiration] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [showCvv, setShowCvv] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetIdx = PLAN_ORDER.indexOf(targetPlan);
  const isValidUpgrade = targetIdx > currentIdx;

  const currentPlanData = PLANS[currentPlan];
  const targetPlanData = PLANS[targetPlan];
  const CurrentIcon = PLAN_ICONS[currentPlan] || Zap;
  const TargetIcon = PLAN_ICONS[targetPlan] || Crown;
  const currentColors = PLAN_COLORS[currentPlan] || PLAN_COLORS.starter;
  const targetColors = PLAN_COLORS[targetPlan] || PLAN_COLORS.plus;

  // Price calculations
  const currentMonthly = currentPlanData?.monthlyPrice || 0;
  const targetMonthly = targetPlanData?.monthlyPrice || 0;
  const currentAnnual = currentPlanData ? getAnnualMonthlyEquivalent(currentPlanData) : 0;
  const targetAnnual = targetPlanData ? getAnnualMonthlyEquivalent(targetPlanData) : 0;

  const displayCurrentPrice = billingCycle === "annual" ? currentAnnual : currentMonthly;
  const displayTargetPrice = billingCycle === "annual" ? targetAnnual : targetMonthly;
  const priceDifference = displayTargetPrice - displayCurrentPrice;

  // Available upgrade options
  const upgradeOptions = PLAN_ORDER.slice(currentIdx + 1);

  // ─── Payment handler ────────────────────────────────────────────

  const handleUpgrade = async () => {
    if (!user?.email || !activeCompanyId) {
      toast.error("Sessão inválida. Recarregue a página.");
      return;
    }

    const rawCard = cardNumber.replace(/\D/g, "");
    const expParts = cardExpiration.split("/");
    const expMonth = expParts[0] || "";
    const expYear = expParts[1] ? (expParts[1].length === 2 ? `20${expParts[1]}` : expParts[1]) : "";
    const rawCvv = cardCvv.replace(/\D/g, "");
    const rawDoc = docNumber.replace(/\D/g, "");

    if (!cardholderName || !rawCard || !expMonth || !expYear || !rawCvv || !rawDoc) {
      toast.error("Preencha todos os dados do cartão.");
      return;
    }
    if (rawCard.length < 13) { toast.error("Número do cartão inválido."); return; }
    if (rawCvv.length < 3) { toast.error("CVV inválido."); return; }
    const docResult = validateDocument(rawDoc);
    if (!docResult.valid) { toast.error(docResult.error || "CPF/CNPJ inválido."); return; }

    setLoading(true);
    setError(null);

    try {
      // Create card token
      const tokenPromise = coreCreateCardToken({
        cardNumber: rawCard,
        cardholderName,
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear,
        securityCode: rawCvv,
        identificationType: docResult.type!,
        identificationNumber: rawDoc,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Tempo esgotado ao processar cartão.")), 30000)
      );
      const tokenResponse = await Promise.race([tokenPromise, timeoutPromise]) as any;

      if (!tokenResponse?.id) {
        throw new Error("Não foi possível processar o cartão.");
      }

      // Get billing config for the target plan
      const billing = getBillingConfig(targetPlan, billingCycle);
      if (!billing) throw new Error("Plano inválido.");

      // Call edge function
      const response = await supabase.functions.invoke("mercadopago-create-subscription", {
        body: {
          token: tokenResponse.id,
          email: user.email,
          companyId: activeCompanyId,
          upgrade: true,
          billingConfig: {
            frequency: billing.frequency,
            frequencyType: billing.frequencyType,
            transactionAmount: billing.transactionAmount,
          },
        },
      });

      if (response.error) {
        let detail = response.error.message;
        try {
          const ctx = (response.error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            detail = body?.error || body?.message || detail;
          }
        } catch { /* fallback */ }
        throw new Error(detail || "Erro ao criar assinatura.");
      }

      let result = response.data;
      if (typeof result === "string") {
        try { result = JSON.parse(result); } catch { /* keep */ }
      }
      if (!result?.success) {
        throw new Error(result?.error || "Erro ao processar pagamento.");
      }

      // Update company plan
      await supabase
        .from("companies")
        .update({ plan: targetPlan })
        .eq("id", activeCompanyId);

      toast.success(`Upgrade para ${PLANS_INFO[targetPlan as PlanType].label} realizado!`);
      navigate("/profile");
    } catch (err: any) {
      const msg = getMpErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Guards ──────────────────────────────────────────────────────

  if (currentPlan === "pro") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Crown className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          Você já está no plano máximo
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Você tem acesso a todos os recursos do Vyzon.</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao perfil
        </Button>
      </div>
    );
  }

  if (!isValidUpgrade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-xl font-bold text-foreground mb-2">Plano inválido</h1>
        <p className="text-sm text-muted-foreground mb-6">Selecione um plano superior ao seu plano atual.</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────

  const inputClasses = "h-10 text-sm bg-[rgba(255,255,255,0.04)] border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20";

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />Voltar ao perfil
        </button>
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Fazer upgrade
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Desbloqueie mais recursos para sua equipe de vendas.
        </p>
      </div>

      {/* Plan selection (if more than one upgrade option) */}
      {upgradeOptions.length > 1 && (
        <div className="flex gap-3">
          {upgradeOptions.map(plan => {
            const Icon = PLAN_ICONS[plan] || Sparkles;
            const colors = PLAN_COLORS[plan] || PLAN_COLORS.plus;
            const isSelected = targetPlan === plan;
            return (
              <button
                key={plan}
                onClick={() => setTargetPlan(plan)}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? `${colors.border} ${colors.bg}`
                    : "border-border/50 bg-card hover:bg-muted/30"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${colors.text}`} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                    {PLANS_INFO[plan as PlanType].label}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatPrice(PLANS[plan].monthlyPrice)}/mês</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Comparison card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr]">
          {/* Current plan */}
          <div className="p-5 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Plano atual</p>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${currentColors.bg}`}>
                <CurrentIcon className={`h-4.5 w-4.5 ${currentColors.text}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{PLANS_INFO[currentPlan].label}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(displayCurrentPrice)}/mês</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3 shrink-0" />
                {PLAN_FEATURES[currentPlan].maxUsers === Infinity ? "Ilimitados" : `Até ${PLAN_FEATURES[currentPlan].maxUsers}`} vendedores
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3 w-3 shrink-0" />
                {PLAN_FEATURES[currentPlan].maxProducts === Infinity ? "Ilimitados" : `Até ${PLAN_FEATURES[currentPlan].maxProducts}`} produtos
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="h-3 w-3 shrink-0" />
                Eva {PLAN_FEATURES[currentPlan].eva ? (currentPlan === "pro" ? "ilimitada" : "30/dia") : "—"}
              </div>
            </div>
          </div>

          {/* Arrow divider */}
          <div className="flex items-center justify-center px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-emerald-400" />
            </div>
          </div>

          {/* Target plan */}
          <div className={`p-5 space-y-3 ${targetColors.bg}`}>
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Novo plano</p>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${targetColors.bg}`}>
                <TargetIcon className={`h-4.5 w-4.5 ${targetColors.text}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{PLANS_INFO[targetPlan as PlanType].label}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(displayTargetPrice)}/mês</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Users className={`h-3 w-3 shrink-0 ${targetColors.text}`} />
                {PLAN_FEATURES[targetPlan as PlanType].maxUsers === Infinity ? "Ilimitados" : `Até ${PLAN_FEATURES[targetPlan as PlanType].maxUsers}`} vendedores
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Package className={`h-3 w-3 shrink-0 ${targetColors.text}`} />
                {PLAN_FEATURES[targetPlan as PlanType].maxProducts === Infinity ? "Ilimitados" : `Até ${PLAN_FEATURES[targetPlan as PlanType].maxProducts}`} produtos
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Bot className={`h-3 w-3 shrink-0 ${targetColors.text}`} />
                Eva {PLAN_FEATURES[targetPlan as PlanType].eva ? (targetPlan === "pro" ? "ilimitada" : "30/dia") : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Price difference strip */}
        <div className="px-5 py-3 border-t border-border/50 bg-emerald-500/5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Diferença mensal</span>
          <span className="text-sm font-bold text-emerald-400">+{formatPrice(priceDifference)}/mês</span>
        </div>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/30 w-fit">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            billingCycle === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setBillingCycle("annual")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            billingCycle === "annual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Anual
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">-10%</span>
        </button>
      </div>

      {/* Payment form */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
          <CreditCard className="h-4 w-4 text-muted-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Dados do pagamento</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Card number */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Número do cartão</Label>
            <Input
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className={inputClasses}
              maxLength={19}
            />
          </div>

          {/* Expiration + CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Validade</Label>
              <Input
                value={cardExpiration}
                onChange={e => setCardExpiration(formatExpiration(e.target.value))}
                placeholder="MM/AA"
                className={inputClasses}
                maxLength={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CVV</Label>
              <div className="relative">
                <Input
                  type={showCvv ? "text" : "password"}
                  value={cardCvv}
                  onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="000"
                  className={`${inputClasses} pr-10`}
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowCvv(!showCvv)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Cardholder name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome no cartão</Label>
            <Input
              value={cardholderName}
              onChange={e => setCardholderName(e.target.value.toUpperCase())}
              placeholder="NOME COMO ESTÁ NO CARTÃO"
              className={inputClasses}
            />
          </div>

          {/* CPF / CNPJ */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CPF ou CNPJ do titular</Label>
            <Input
              value={docNumber}
              onChange={e => setDocNumber(formatDocument(e.target.value))}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className={inputClasses}
              maxLength={18}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {loading ? "Processando..." : `Fazer upgrade por ${formatPrice(displayTargetPrice)}/mês`}
          </Button>

          {/* Security note */}
          <p className="text-[11px] text-muted-foreground/50 text-center flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" />
            Pagamento seguro via MercadoPago. Seus dados são criptografados.
          </p>
        </div>
      </div>
    </div>
  );
}
