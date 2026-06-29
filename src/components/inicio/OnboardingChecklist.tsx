// OnboardingChecklist — "Primeiros passos" no /inicio. Card de ativação que
// aparece enquanto a conta não ativou; auto-marca cada passo a partir dos dados
// reais (useOnboardingProgress) e some sozinho quando tudo está pronto.
import {
    WhatsappLogo,
    Brain,
    UsersThree,
    Target,
    CheckCircle,
    ArrowRight,
} from "@phosphor-icons/react";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import type { OnboardingProgress, OnboardingStepKey } from "@/hooks/useOnboardingProgress";

interface StepDef {
    key: OnboardingStepKey;
    label: string;
    desc: string;
    cta: string;
    href: string;
    icon: typeof Target;
}

const STEPS: StepDef[] = [
    { key: "whatsapp", label: "Conecte seu WhatsApp", desc: "Seus leads chegam aqui e a EVA passa a ler cada conversa.", cta: "Conectar", href: "/inbox", icon: WhatsappLogo },
    { key: "eva", label: "Ensine a EVA sobre você", desc: "Conte o que você vende e pra quem. As sugestões saem na sua voz.", cta: "Configurar", href: "/configuracoes/eva", icon: Brain },
    { key: "leads", label: "Traga seus contatos", desc: "Importe sua lista ou espere o primeiro lead cair no WhatsApp.", cta: "Importar", href: "/importar", icon: UsersThree },
    { key: "deal", label: "Abra sua 1ª oportunidade", desc: "Quando um lead esquentar, leve a conversa pro funil.", cta: "Ver pipeline", href: "/pipeline", icon: Target },
];

// Nudge da EVA por passo pendente: voz assistida ("eu sugiro, você aprova"),
// orientada a benefício, sem jargão e sem travessão.
const NUDGE: Record<OnboardingStepKey, string> = {
    whatsapp: "Conecta seu WhatsApp que eu já começo a ler seus leads e apontar quem está quente.",
    eva: "Me conta o que você vende e pra quem, aí minhas sugestões saem na sua voz.",
    leads: "Assim que o primeiro lead chegar, eu leio a conversa e te digo o próximo passo.",
    deal: "Falta levar uma conversa quente pro funil. Eu sugiro, você aprova.",
};

export function OnboardingChecklist({
    progress,
    doneCount,
    total,
    nextStep,
    onNavigate,
}: {
    progress: OnboardingProgress;
    doneCount: number;
    total: number;
    nextStep: OnboardingStepKey | null;
    onNavigate: (href: string) => void;
}) {
    const pct = Math.round((doneCount / total) * 100);

    return (
        <section
            className="rounded-2xl overflow-hidden"
            style={{
                background: "#FFFFFF",
                border: "1px solid #E7E1FA",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}
        >
            {/* Header + EVA nudge */}
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b" style={{ borderColor: "#F1F5F9", background: "linear-gradient(180deg, rgba(124,58,237,0.05) 0%, #FFFFFF 90%)" }}>
                <div className="flex items-center gap-3">
                    <EvaOrb variant="blue" size={30} showVoice={false} state="idle" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[17px] font-bold leading-tight" style={{ color: "#0B1220", letterSpacing: "-0.015em" }}>
                            Primeiros passos
                        </h2>
                        <p className="text-[12.5px] leading-snug" style={{ color: "#475569" }}>
                            {nextStep ? NUDGE[nextStep] : "Tudo pronto. Sua central está no ar."}
                        </p>
                    </div>
                    <span className="text-[13px] font-bold tabular-nums shrink-0" style={{ color: "#7C3AED" }}>
                        {doneCount}/{total}
                    </span>
                </div>
                <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: "#EEE9FB" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#7C3AED,#2563EB)" }} />
                </div>
            </div>

            {/* Steps */}
            <div className="p-3 sm:p-4 flex flex-col gap-2">
                {STEPS.map((s, i) => {
                    const done = progress[s.key];
                    const Icon = s.icon;
                    const isNext = s.key === nextStep;
                    return (
                        <div
                            key={s.key}
                            className="flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-colors"
                            style={{
                                background: isNext ? "rgba(37,99,235,0.04)" : "transparent",
                                border: `1px solid ${isNext ? "rgba(37,99,235,0.18)" : "#F1F5F9"}`,
                            }}
                        >
                            {/* status */}
                            <span
                                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                                style={
                                    done
                                        ? { background: "rgba(16,185,129,0.12)", color: "#047857" }
                                        : { background: isNext ? "rgba(37,99,235,0.10)" : "#F1F5F9", color: isNext ? "#2563EB" : "#94A3B8" }
                                }
                            >
                                {done ? <CheckCircle size={20} weight="fill" /> : <Icon size={19} weight="duotone" />}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold leading-tight" style={{ color: done ? "#64748B" : "#0B1220", textDecoration: done ? "line-through" : "none" }}>
                                    {s.label}
                                </p>
                                {!done && <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "#64748B" }}>{s.desc}</p>}
                            </div>

                            {done ? (
                                <span className="text-[12px] font-semibold shrink-0 inline-flex items-center gap-1" style={{ color: "#047857" }}>
                                    Concluído
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onNavigate(s.href)}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-105 shrink-0"
                                    style={{ background: isNext ? "#2563EB" : "#0B1220" }}
                                >
                                    {s.cta}
                                    <ArrowRight size={12} weight="bold" />
                                </button>
                            )}

                            {/* número discreto à esquerda do índice (acessível) */}
                            <span className="sr-only">{`Passo ${i + 1} de ${STEPS.length}`}</span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
