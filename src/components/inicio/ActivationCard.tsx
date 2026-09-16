// ActivationCard — o único passo de ativação da conta: conectar o WhatsApp.
// Some sozinho quando a conexão fica ativa.
//
// Era um checklist de 4 passos (WhatsApp, ensinar a EVA, importar contatos,
// abrir a primeira oportunidade). Os outros três dependiam do primeiro e a EVA
// resolve todos depois que as conversas começam a chegar, então cobrá-los aqui
// só adiava a única coisa que a pessoa precisa fazer.
import { WhatsappLogo, ArrowRight } from "@phosphor-icons/react";
import { EvaThinkingOrb } from "@/components/eva/EvaThinkingOrb";
import { isDemoSession } from "@/lib/analytics";

export function ActivationCard({ onNavigate }: { onNavigate: (href: string) => void }) {
    // Na demo embutida da landing o card quebra a ilusão de operação madura
    // (a conta demo nunca conecta WhatsApp de verdade).
    if (isDemoSession()) return null;

    return (
        <section
            className="rounded-2xl overflow-hidden"
            style={{
                background: "#FFFFFF",
                border: "1px solid #E7E1FA",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}
        >
            <div
                className="px-5 sm:px-6 py-5 flex items-center gap-4"
                style={{ background: "linear-gradient(180deg, rgba(124,58,237,0.05) 0%, #FFFFFF 90%)" }}
            >
                <EvaThinkingOrb state="listening" size={20} displaySize={30} theme="light" className="shrink-0" aria-hidden />

                <div className="min-w-0 flex-1">
                    <h2 className="text-[17px] font-bold leading-tight" style={{ color: "#0B1220", letterSpacing: "-0.015em" }}>
                        Conecte seu WhatsApp
                    </h2>
                    <p className="text-[12.5px] leading-snug mt-0.5" style={{ color: "#475569" }}>
                        É o único passo. Depois disso eu leio cada conversa, abro as oportunidades e te mando o
                        próximo passo pronto para você aprovar.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => onNavigate("/inbox")}
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-105 shrink-0"
                    style={{ background: "#2563EB" }}
                >
                    <WhatsappLogo size={16} weight="fill" />
                    Conectar
                    <ArrowRight size={12} weight="bold" />
                </button>
            </div>
        </section>
    );
}
