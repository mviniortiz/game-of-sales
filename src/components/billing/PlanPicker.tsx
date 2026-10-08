// Plano único do Vyzon, usado no /upgrade e na tela de teste expirado.
// Cobrança manual por enquanto: o botão abre o WhatsApp do Markus com o pedido
// pronto; ele manda o link do Mercado Pago (Pix ou cartão) e marca a empresa
// como paga no admin (AdminCompanyDetail). Dados do plano em src/config/plans.ts.
import { motion } from "framer-motion";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { PLANS, formatPrice } from "@/config/plans";
import { whatsappUrl } from "@/config/contact";
import { useAuth } from "@/contexts/AuthContext";

interface PlanPickerProps {
    /** Empresa já paga (subscription_status 'active'): mostra como plano atual. */
    paid?: boolean;
}

export function PlanPicker({ paid = false }: PlanPickerProps) {
    const { user } = useAuth();
    const plan = PLANS.pro;
    const mensagem =
        `Oi, Markus! Quero assinar o Vyzon (${formatPrice(plan.monthlyPrice)}/mês).` +
        (user?.email ? ` Meu e-mail de acesso é ${user.email}.` : "");

    return (
        <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-md flex-col rounded-[18px] bg-[var(--vyz-surface-1)] p-6 shadow-[0_0_0_1.5px_var(--vyz-text-primary),0_18px_40px_-22px_rgba(11,18,32,0.35)]"
            aria-label={`Plano ${plan.name}`}
        >
            <header className="flex items-center justify-between gap-3">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">{plan.name}</h3>
                <span className="rounded-full bg-[var(--vyz-accent-soft-10)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--vyz-accent)]">
                    {paid ? "Seu plano" : "Tudo liberado"}
                </span>
            </header>
            <p className="mt-1 text-[13px] text-[var(--vyz-text-muted)]">{plan.description}</p>

            <div className="mt-5 flex items-baseline gap-1">
                <span className="text-[34px] font-semibold tabular-nums tracking-[-0.03em] text-[var(--vyz-text-primary)]">
                    {formatPrice(plan.monthlyPrice)}
                </span>
                <span className="text-[14px] text-[var(--vyz-text-muted)]">/mês</span>
            </div>

            <ul className="mt-5 flex-1 space-y-2.5 border-t border-[var(--vyz-border-subtle)] pt-5">
                {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13.5px] text-[var(--vyz-text)]">
                        <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-[var(--vyz-accent)]" aria-hidden />
                        {feature}
                    </li>
                ))}
            </ul>

            {paid ? (
                <p className="mt-6 text-center text-[13px] text-[var(--vyz-text-muted)]">Sua assinatura está ativa.</p>
            ) : (
                <>
                    <a
                        href={whatsappUrl(mensagem)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackEvent(FUNNEL_EVENTS.UPGRADE_CLICK, { plan: plan.id, via: "whatsapp" })}
                        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--vyz-btn-solid)] text-[14px] font-semibold text-[var(--vyz-btn-on)] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.3)]"
                    >
                        Assinar pelo WhatsApp
                        <ArrowRight size={15} weight="bold" aria-hidden />
                    </a>
                    <p className="mt-3 text-center text-[12px] leading-relaxed text-[var(--vyz-text-muted)]">
                        Você recebe o link de pagamento por Pix ou cartão. Assim que o pagamento cair, a conta fica liberada.
                    </p>
                </>
            )}
        </motion.article>
    );
}
