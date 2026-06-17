// LP.6 (v2) — FAQ editorial. Accordion com <details> nativo (sem JS), divisórias
// finas, perguntas em serif, respostas em sans muted. Responde objeções reais.
const FAQS = [
    {
        q: "A EVA envia mensagens sozinha?",
        a: "Não. A EVA sugere respostas e próximos passos, mas o envio depende da aprovação do seu time. A ideia é acelerar a operação sem tirar o controle humano.",
    },
    {
        q: "A EVA substitui meu time comercial?",
        a: "Não. Ela funciona como uma camada de apoio para ajudar o time a entender contexto, responder melhor e seguir o playbook comercial da agência.",
    },
    {
        q: "Funciona com WhatsApp?",
        a: "Sim. A proposta da EVA é acompanhar conversas comerciais que já acontecem no WhatsApp e transformar esse contexto em sugestões práticas para o time.",
    },
    {
        q: "Preciso mudar meu processo comercial?",
        a: "Não necessariamente. A EVA deve se adaptar ao processo da agência: etapas, ofertas, critérios de qualificação, tom de voz e próximos passos.",
    },
    {
        q: "Serve para qualquer empresa?",
        a: "A Vyzon está sendo pensada principalmente para agências e operações comerciais que vendem por conversa, especialmente onde o WhatsApp concentra boa parte do atendimento.",
    },
    {
        q: "Como funciona a implantação?",
        a: "Na demo, entendemos seu fluxo comercial, canais, volume de atendimentos e playbook atual. A partir disso, avaliamos como a EVA pode entrar na operação sem bagunçar o processo.",
    },
];

export const FaqV2 = () => {
    return (
        <section id="faq" className="px-5 py-24 sm:py-32" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="vz-faq mx-auto max-w-[820px]">
                <h2
                    className="lp-display"
                    style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
                >
                    Dúvidas frequentes
                </h2>
                <div className="mt-10">
                    {FAQS.map((f) => (
                        <details key={f.q} className="border-t py-5" style={{ borderColor: "rgba(0,0,0,0.10)" }}>
                            <summary className="flex items-center justify-between gap-6">
                                <span
                                    className="lp-display"
                                    style={{ fontSize: "clamp(1.15rem, 2vw, 1.4rem)", lineHeight: 1.25, letterSpacing: "-0.02em", color: "var(--lp-ink)" }}
                                >
                                    {f.q}
                                </span>
                                <span
                                    className="vz-faq-plus shrink-0 text-[22px] leading-none"
                                    style={{ color: "rgba(5,5,5,0.4)", fontWeight: 300 }}
                                    aria-hidden="true"
                                >
                                    +
                                </span>
                            </summary>
                            <p className="mt-3 max-w-[680px]" style={{ fontSize: "1rem", lineHeight: 1.6, color: "rgba(5,5,5,0.66)" }}>
                                {f.a}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
};
