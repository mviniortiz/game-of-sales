import { AlertCircle, Bell, BarChart3, Hourglass, MessageSquareWarning, GitPullRequestClosed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Pain = {
    icon: LucideIcon;
    title: string;
    description: string;
};

const PAINS: readonly Pain[] = [
    {
        icon: AlertCircle,
        title: "O time não atualiza o CRM",
        description: "Vendedor entra, faz reunião, fecha proposta — e nada vai pro sistema. Pipeline vira ficção.",
    },
    {
        icon: MessageSquareWarning,
        title: "O gestor cobra tudo no WhatsApp",
        description: "Status de deal, follow-up, meta — tudo vira mensagem solta no grupo. Cobrança vira rotina, não gestão.",
    },
    {
        icon: BarChart3,
        title: "O ranking é manual",
        description: "Alguém compila planilha no fim do mês e dispara um print. Quando chega, já não muda comportamento.",
    },
    {
        icon: Hourglass,
        title: "A meta só aparece no fim do mês",
        description: "Quando o time descobre que está abaixo do ritmo, faltam 3 dias úteis. Tarde demais pra reagir.",
    },
    {
        icon: Bell,
        title: "Follow-ups se perdem",
        description: "Lead esfria, retorno cai pra próxima semana, próxima semana vira nunca. Oportunidade evapora sem aviso.",
    },
    {
        icon: GitPullRequestClosed,
        title: "O pipeline não mostra a realidade",
        description: "Deals parados há semanas continuam abertos. O forecast vira ficção e ninguém confia nos números.",
    },
];

export const PainPoints = () => {
    return (
        <section className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                aria-hidden="true"
                style={{
                    background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-5xl mx-auto">
                <div className="text-center mb-14 sm:mb-16 landing-fade-in-up">
                    <p
                        className="text-xs uppercase mb-4 tracking-widest"
                        style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.35)" }}
                    >
                        O problema
                    </p>
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: "var(--fw-bold)",
                            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Seu CRM virou só mais uma ferramenta{" "}
                        <span className="text-red-400">que o vendedor ignora?</span>
                    </h2>
                    <p
                        className="mt-4 max-w-2xl mx-auto text-[15px]"
                        style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}
                    >
                        Time comercial vive de ritmo, meta e clareza. Quando o CRM não entrega isso, a operação volta pra planilha, print e cobrança no WhatsApp.
                    </p>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PAINS.map(({ icon: Icon, title, description }, i) => {
                        const delay = i % 3 === 0 ? "" : i % 3 === 1 ? "landing-delay-100" : "landing-delay-200";
                        return (
                            <li
                                key={title}
                                className={`landing-fade-in-up ${delay}`}
                            >
                                <div
                                    className="h-full rounded-2xl p-5 sm:p-6 flex flex-col gap-3"
                                    style={{
                                        background: "rgba(255,255,255,0.02)",
                                        border: "1px solid rgba(239,68,68,0.18)",
                                        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.18)",
                                    }}
                                >
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                                        style={{ background: "rgba(239,68,68,0.12)" }}
                                        aria-hidden="true"
                                    >
                                        <Icon className="h-5 w-5 text-red-400" strokeWidth={1.9} />
                                    </div>
                                    <h3
                                        className="text-[15px] sm:text-base"
                                        style={{ fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.95)" }}
                                    >
                                        {title}
                                    </h3>
                                    <p
                                        className="text-[13.5px] leading-relaxed"
                                        style={{ color: "rgba(255,255,255,0.6)" }}
                                    >
                                        {description}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <div className="mt-14 sm:mt-16 max-w-2xl mx-auto text-center landing-fade-in-up landing-delay-400">
                    <p
                        className="text-base sm:text-lg"
                        style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.95)", lineHeight: 1.55 }}
                    >
                        A Vyzon transforma a rotina comercial em uma experiência{" "}
                        <span className="text-emerald-400" style={{ fontWeight: "var(--fw-bold)" }}>
                            clara, visual e orientada por metas.
                        </span>
                    </p>
                    <p
                        className="text-xs mt-2"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                        Pipeline vivo, ranking ao vivo, alertas e automações. No ar em 5 minutos.
                    </p>
                    <div className="h-12 w-px mx-auto mt-8" style={{ background: "rgba(255,255,255,0.08)" }} aria-hidden="true" />
                </div>
            </div>
        </section>
    );
};
