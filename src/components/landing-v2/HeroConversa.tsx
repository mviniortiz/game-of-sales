// LP.9 — a PROVA no hero: uma conversa encenada em CSS puro (sem JS, sem
// imagem). Lead pergunta → EVA deixa a sugestão → toque aprova → resposta
// enviada com ✓✓. Loop de 11s; com prefers-reduced-motion vira o estado
// final estático. Uma ideia visual só; substitui o disco de pontos.
export const HeroConversa = () => (
    <div className="vz-heroconv mx-auto w-full max-w-[440px] px-4" aria-hidden="true">
        <div className="vz-heroconv-in relative h-[262px] sm:h-[236px]">
            {/* 1. pergunta do lead */}
            <div className="vzhc vzhc-lead absolute left-0 top-0 max-w-[78%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-left shadow-sm" style={{ border: "1px solid var(--lp-line)" }}>
                <p className="text-[13.5px]" style={{ color: "var(--lp-ink)" }}>Consegue me mandar a proposta ainda hoje?</p>
                <span className="mt-1 block text-[10.5px]" style={{ color: "rgba(5,5,5,0.38)" }}>14:07</span>
            </div>
            {/* 2. sugestão da EVA + aprovação */}
            <div className="vzhc vzhc-card absolute left-1/2 top-[92px] sm:top-[74px] w-[92%] -translate-x-1/2 rounded-2xl px-4 py-3 text-left" style={{ background: "#FBFAFF", border: "1px solid rgba(109,40,217,0.16)", boxShadow: "0 1px 2px rgba(5,5,5,0.04), 0 14px 34px -18px rgba(109,40,217,0.18)" }}>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--lp-eva)" }}>Sugestão da EVA</span>
                <p className="mt-1 text-[13.5px]" style={{ color: "var(--lp-ink)", lineHeight: 1.45 }}>Consigo sim! Te mando em dez minutos. Prefere o plano mensal ou o trimestral?</p>
                <span className="vzhc-btn mt-2.5 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white" style={{ background: "#080808" }}>
                    Usar resposta <span aria-hidden>→</span>
                </span>
            </div>
            {/* 3. resposta enviada */}
            <div className="vzhc vzhc-sent absolute right-0 top-[136px] sm:top-[118px] max-w-[78%] rounded-2xl rounded-tr-md px-4 py-3 text-left" style={{ background: "#E7F8D9", border: "1px solid rgba(0,138,82,0.14)" }}>
                <p className="text-[13.5px]" style={{ color: "var(--lp-ink)" }}>Consigo sim! Te mando em dez minutos. Prefere o plano mensal ou o trimestral?</p>
                <span className="mt-1 flex items-center justify-end gap-1 text-[10.5px]" style={{ color: "rgba(5,5,5,0.38)" }}>
                    14:09 <span style={{ color: "#53BDEB", letterSpacing: "-0.18em" }}>✓✓</span>
                </span>
            </div>
        </div>
        <p className="vzhc-legend mt-2 text-center text-[12px]" style={{ color: "rgba(5,5,5,0.45)" }}>
            A EVA sugere. Seu time aprova.
        </p>
    </div>
);
