// LP.6 (v2) — micro-demos dos tiles de feature. Cada um é um card de produto
// compacto e legível que mostra a EVA "operando" em loop suave (CSS, ~9s),
// sem badges/chips/tags coloridas, sem typing/cursor/spinner. Estilos de
// animação em index.css (.vzd*).
const card: React.CSSProperties = {
    border: "1px solid var(--lp-line)",
    boxShadow: "0 18px 44px -26px rgba(13,20,33,0.42)",
    background: "#fff",
};

export function EvaSuggestionDemo() {
    return (
        <div className="w-full max-w-[330px] rounded-2xl p-5" style={card}>
            <div
                className="inline-block px-4 py-2.5 text-[13.5px]"
                style={{
                    background: "var(--lp-paper)",
                    border: "1px solid var(--lp-line)",
                    borderRadius: "13px 13px 13px 4px",
                    color: "var(--lp-ink-90)",
                    lineHeight: 1.45,
                }}
            >
                Oi, queria entender melhor os planos para minha agência.
            </div>

            <div className="vzd1-sug mt-4 border-t pt-4" style={{ borderColor: "var(--lp-line-soft)" }}>
                <p className="text-[11.5px]" style={{ color: "var(--lp-ink-55)", fontWeight: 600 }}>
                    Sugestão da EVA
                </p>
                <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>
                    Claro. Antes de te passar os planos, posso entender quantos atendimentos vocês recebem por mês hoje?
                </p>
                <div className="mt-4 flex items-center gap-2.5">
                    <span
                        className="vzd1-btn inline-block rounded-lg px-3.5 py-2 text-[12.5px] text-white"
                        style={{ background: "var(--lp-blue)", fontWeight: 600 }}
                    >
                        Usar sugestão
                    </span>
                    <span
                        className="inline-block rounded-lg px-3.5 py-2 text-[12.5px]"
                        style={{ border: "1px solid var(--lp-line)", color: "var(--lp-ink-55)", fontWeight: 600 }}
                    >
                        Editar
                    </span>
                </div>
            </div>
        </div>
    );
}

const QUALI = [
    { n: "Clara R.", s: "Quer entender os planos para minha agência", cls: "vzd2-r1" },
    { n: "Mayara B.", s: "Ainda pensando, me chama amanhã", cls: "vzd2-r2" },
    { n: "Jean B.", s: "Qual o valor do plano mensal?", cls: "" },
];

export function EvaQualificationDemo() {
    return (
        <div className="w-full max-w-[340px] rounded-2xl p-4" style={card}>
            <p className="mb-3 px-1 text-[12px]" style={{ color: "var(--lp-ink-40)", fontWeight: 600 }}>
                Conversas
            </p>
            <div className="flex flex-col gap-0.5">
                {QUALI.map((r) => (
                    <div key={r.n} className={`${r.cls} rounded-xl px-3 py-2.5`}>
                        <span className="text-[13px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                            {r.n}
                        </span>
                        <p className="mt-0.5 truncate text-[12px]" style={{ color: "var(--lp-ink-55)" }}>
                            {r.s}
                        </p>
                    </div>
                ))}
            </div>
            <div className="relative mt-3 px-1" style={{ height: 18 }}>
                <p className="vzd2-s1 absolute inset-x-1 text-[12px]" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                    Pronta para receber os planos.
                </p>
                <p className="vzd2-s2 absolute inset-x-1 text-[12px]" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                    Em dúvida — retomar amanhã.
                </p>
            </div>
        </div>
    );
}

const STEPS = [
    { label: "Primeiro contato", cls: "" },
    { label: "Diagnóstico", cls: "vzd3-a" },
    { label: "Proposta", cls: "vzd3-b" },
    { label: "Follow-up", cls: "" },
];

export function EvaPlaybookDemo() {
    return (
        <div className="w-full max-w-[330px] rounded-2xl p-5" style={card}>
            <p className="text-[12px]" style={{ color: "var(--lp-ink-55)", fontWeight: 600 }}>
                Próximo passo sugerido
            </p>
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>
                Enviar diagnóstico inicial e propor uma call de 15 minutos.
            </p>
            <div className="mt-4 flex flex-col gap-0.5">
                {STEPS.map((s) => (
                    <div key={s.label} className={`${s.cls} flex items-center gap-2.5 py-1.5`}>
                        <span
                            className="vzd3-dot h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: s.cls ? undefined : "var(--lp-line)" }}
                        />
                        <span
                            className="vzd3-txt text-[12.5px]"
                            style={{ color: s.cls ? undefined : "var(--lp-ink-55)" }}
                        >
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
