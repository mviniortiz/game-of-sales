// Checkout de cartão reutilizável (Mercado Pago). Encapsula os campos, a
// tokenização do cartão e a criação da assinatura, pra ser usado tanto no
// /upgrade quanto na tela de trial expirado (sem duplicar a integração).
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getBillingConfig, type BillingCycle } from "@/config/plans";
import { initMercadoPago } from "@mercadopago/sdk-react";
import coreCreateCardToken from "@mercadopago/sdk-react/esm/coreMethods/cardToken/create";
import { formatDocument, validateDocument } from "@/utils/document";
import { Loader2, Lock, Eye, EyeOff, CreditCard } from "lucide-react";

const mpPublicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
if (mpPublicKey) initMercadoPago(mpPublicKey, { locale: "pt-BR" });

const MP_ERROR_MESSAGES: Record<string, string> = {
    "106": "Número do cartão inválido.",
    "205": "Número do cartão inválido.",
    "208": "Mês de validade inválido.",
    "209": "Ano de validade inválido.",
    "212": "CPF/CNPJ inválido.",
    "214": "CPF/CNPJ inválido.",
    "221": "Nome do titular inválido.",
    "224": "CVV inválido.",
    E301: "Número do cartão inválido.",
    E302: "CVV inválido.",
    "316": "Nome do titular inválido.",
    default: "Não foi possível processar o cartão. Verifique os dados.",
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

const formatCardNumber = (value: string) =>
    value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiration = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

interface PlanCheckoutFormProps {
    planId: string;
    billingCycle?: BillingCycle;
    /** true = troca entre planos pagos (cancela a anterior); false = ativação/reativação. */
    upgrade?: boolean;
    submitLabel?: string;
    onSuccess: () => void;
}

const inputCls =
    "w-full h-11 px-3.5 rounded-xl text-[14px] outline-none transition-all";
const inputStyle = { background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#0B1220" } as const;

export function PlanCheckoutForm({
    planId,
    billingCycle = "monthly",
    upgrade = false,
    submitLabel = "Pagar e ativar",
    onSuccess,
}: PlanCheckoutFormProps) {
    const { user } = useAuth();
    const { activeCompanyId } = useTenant();

    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiration, setCardExpiration] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [cardholderName, setCardholderName] = useState("");
    const [docNumber, setDocNumber] = useState("");
    const [showCvv, setShowCvv] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!user?.email || !activeCompanyId) {
            toast.error("Sessão inválida. Recarregue a página.");
            return;
        }
        const rawCard = cardNumber.replace(/\D/g, "");
        const [m, y] = cardExpiration.split("/");
        const expMonth = m || "";
        const expYear = y ? (y.length === 2 ? `20${y}` : y) : "";
        const rawCvv = cardCvv.replace(/\D/g, "");
        const rawDoc = docNumber.replace(/\D/g, "");

        if (!cardholderName || !rawCard || !expMonth || !expYear || !rawCvv || !rawDoc) {
            toast.error("Preencha todos os dados do cartão.");
            return;
        }
        if (rawCard.length < 13) return toast.error("Número do cartão inválido.");
        if (rawCvv.length < 3) return toast.error("CVV inválido.");
        const doc = validateDocument(rawDoc);
        if (!doc.valid) return toast.error(doc.error || "CPF/CNPJ inválido.");

        setLoading(true);
        setError(null);
        try {
            const tokenPromise = coreCreateCardToken({
                cardNumber: rawCard,
                cardholderName,
                cardExpirationMonth: expMonth,
                cardExpirationYear: expYear,
                securityCode: rawCvv,
                identificationType: doc.type!,
                identificationNumber: rawDoc,
            });
            const timeout = new Promise((_, rej) =>
                setTimeout(() => rej(new Error("Tempo esgotado ao processar cartão.")), 30000),
            );
            const tokenResponse = (await Promise.race([tokenPromise, timeout])) as any;
            if (!tokenResponse?.id) throw new Error("Não foi possível processar o cartão.");

            const billing = getBillingConfig(planId, billingCycle);
            if (!billing) throw new Error("Plano inválido.");

            const response = await supabase.functions.invoke("mercadopago-create-subscription", {
                body: {
                    token: tokenResponse.id,
                    email: user.email,
                    planId,
                    companyId: activeCompanyId,
                    upgrade,
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
            if (!result?.success) throw new Error(result?.error || "Erro ao processar pagamento.");

            await supabase.from("companies").update({ plan: planId }).eq("id", activeCompanyId);
            onSuccess();
        } catch (err: any) {
            const msg = getMpErrorMessage(err);
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4" style={{ color: "#64748B" }} />
                <h3 className="text-[13px] font-semibold" style={{ color: "#0B1220" }}>Dados do pagamento</h3>
            </div>

            <div className="space-y-3.5">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "#64748B" }}>Número do cartão</label>
                    <input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="0000 0000 0000 0000" className={inputCls} style={inputStyle} maxLength={19} inputMode="numeric" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: "#64748B" }}>Validade</label>
                        <input value={cardExpiration} onChange={(e) => setCardExpiration(formatExpiration(e.target.value))}
                            placeholder="MM/AA" className={inputCls} style={inputStyle} maxLength={5} inputMode="numeric" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium" style={{ color: "#64748B" }}>CVV</label>
                        <div className="relative">
                            <input type={showCvv ? "text" : "password"} value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder="000" className={`${inputCls} pr-10`} style={inputStyle} maxLength={4} inputMode="numeric" />
                            <button type="button" onClick={() => setShowCvv(!showCvv)}
                                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }}>
                                {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "#64748B" }}>Nome no cartão</label>
                    <input value={cardholderName} onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                        placeholder="NOME COMO ESTÁ NO CARTÃO" className={inputCls} style={inputStyle} />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: "#64748B" }}>CPF ou CNPJ do titular</label>
                    <input value={docNumber} onChange={(e) => setDocNumber(formatDocument(e.target.value))}
                        placeholder="000.000.000-00" className={inputCls} style={inputStyle} maxLength={18} inputMode="numeric" />
                </div>

                {error && (
                    <div className="p-3 rounded-lg text-[13px]" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#B91C1C" }}>
                        {error}
                    </div>
                )}

                <button type="button" onClick={handleSubmit} disabled={loading}
                    className="w-full h-12 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 transition-transform hover:-translate-y-px disabled:hover:translate-y-0"
                    style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", boxShadow: "0 4px 20px -6px rgba(37,99,235,0.5)" }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {submitLabel}
                </button>

                <p className="text-[11px] text-center" style={{ color: "#94A3B8" }}>
                    Pagamento seguro via Mercado Pago. Cancele quando quiser.
                </p>
            </div>
        </div>
    );
}
