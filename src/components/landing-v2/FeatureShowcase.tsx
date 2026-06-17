import type { ReactNode } from "react";

// LP.9 (v2) — previews detalhados dos tiles. Cada benefício clicável tem o seu
// preview (mini-UI real, sem badges/chips coloridos — só texto refinado, mono e
// um acento azul). Trocam dentro do tile com mesh + grain.
const cardStyle: React.CSSProperties = { border: "1px solid var(--lp-line)", boxShadow: "0 18px 44px -26px rgba(13,20,33,0.42)", background: "#fff" };

function Card({ children, max = 340 }: { children: ReactNode; max?: number }) {
    return <div className="w-full rounded-2xl p-5" style={{ ...cardStyle, maxWidth: max }}>{children}</div>;
}
function Bubble({ children }: { children: ReactNode }) {
    return (
        <div className="inline-block px-4 py-2.5 text-[13.5px]" style={{ background: "var(--lp-paper)", border: "1px solid var(--lp-line)", borderRadius: "13px 13px 13px 4px", color: "var(--lp-ink-90)", lineHeight: 1.45, maxWidth: "88%" }}>
            {children}
        </div>
    );
}
function Mono({ children }: { children: ReactNode }) {
    return <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>{children}</p>;
}
function Lines({ items }: { items: string[] }) {
    return (
        <div className="mt-1.5">
            {items.map((l, i) => (
                <p key={l} className="py-2 text-[13.5px]" style={{ color: "var(--lp-ink-90)", borderTop: i === 0 ? "none" : "1px solid var(--lp-line-soft)" }}>{l}</p>
            ))}
        </div>
    );
}
const dot = (c = "var(--lp-blue)") => <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />;

// ── Row 1 — Assistente comercial ──────────────────────────────────────
const PContexto = () => (
    <Card>
        <Bubble>Oi, queria entender melhor os planos para minha agência.</Bubble>
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--lp-line-soft)" }}>
            <Mono>Leitura da EVA</Mono>
            <Lines items={["Primeiro contato", "Interesse em planos", "Perfil: agência"]} />
        </div>
    </Card>
);
const PSugestao = () => (
    <Card>
        <Bubble>Quais são os planos de vocês?</Bubble>
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--lp-line-soft)" }}>
            <Mono>Sugestão da EVA</Mono>
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>Claro. Antes de passar os planos, posso entender quantos atendimentos vocês recebem por mês?</p>
            <div className="mt-4 flex items-center gap-2.5">
                <span className="rounded-lg px-3.5 py-2 text-[12.5px] text-white" style={{ background: "var(--lp-blue)", fontWeight: 600 }}>Usar sugestão</span>
                <span className="rounded-lg px-3.5 py-2 text-[12.5px]" style={{ border: "1px solid var(--lp-line)", color: "var(--lp-ink-55)", fontWeight: 600 }}>Editar</span>
            </div>
        </div>
    </Card>
);
const PAprovacao = () => (
    <Card>
        <Mono>Rascunho da EVA</Mono>
        <p className="mt-1.5 text-[14px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>Perfeito! Te envio uma proposta ainda hoje à tarde. Pode ser?</p>
        <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--lp-line-soft)" }}>
            <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Aguardando você aprovar</span>
            <div className="flex items-center gap-2">
                <span className="rounded-lg px-3 py-1.5 text-[12px] text-white" style={{ background: "var(--lp-blue)", fontWeight: 600 }}>Aprovar</span>
                <span className="rounded-lg px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--lp-line)", color: "var(--lp-ink-55)", fontWeight: 600 }}>Editar</span>
            </div>
        </div>
    </Card>
);

// ── Row 2 — Qualificação ──────────────────────────────────────────────
const PIntencao = () => (
    <Card>
        <Bubble>Quanto custa pra rodar tráfego pago pra minha loja esse mês?</Bubble>
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--lp-line-soft)" }}>
            <Mono>Sinais detectados</Mono>
            <Lines items={["Intenção: contratar tráfego pago", "Urgência: alta", "Decisor na conversa: provável"]} />
        </div>
    </Card>
);
const PCuriosidade = () => (
    <Card>
        <Mono>Conversas</Mono>
        <div className="mt-2 flex flex-col gap-1">
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(21,86,192,0.05)" }}>
                <span className="text-[13px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>Clara R.</span>
                <p className="mt-0.5 text-[12px]" style={{ color: "var(--lp-ink-55)" }}>"Quero começar ainda esse mês"</p>
                <p className="mt-1 text-[11.5px]" style={{ color: "var(--lp-blue)", fontWeight: 600 }}>Pronta para avançar</p>
            </div>
            <div className="rounded-xl px-3 py-2.5">
                <span className="text-[13px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>Bruno T.</span>
                <p className="mt-0.5 text-[12px]" style={{ color: "var(--lp-ink-55)" }}>"Só pesquisando preço por enquanto"</p>
                <p className="mt-1 text-[11.5px]" style={{ color: "var(--lp-ink-40)", fontWeight: 600 }}>Ainda curiosidade</p>
            </div>
        </div>
    </Card>
);
const PPriorizar = () => (
    <Card>
        <Mono>Fila de atendimento</Mono>
        <div className="mt-2">
            {[{ n: "Clara R.", s: "Quente · responder agora" }, { n: "Mayara B.", s: "Morno · retomar amanhã" }, { n: "Jean B.", s: "Frio · nutrir" }].map((r, i) => (
                <div key={r.n} className="flex items-center gap-3 py-2.5" style={{ borderTop: i === 0 ? "none" : "1px solid var(--lp-line-soft)" }}>
                    <span className="text-[12.5px]" style={{ color: "var(--lp-ink-40)", fontWeight: 700, width: 12 }}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                        <span className="text-[13px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>{r.n}</span>
                        <p className="truncate text-[11.5px]" style={{ color: "var(--lp-ink-55)" }}>{r.s}</p>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

// ── Row 3 — Playbook da agência ───────────────────────────────────────
const PPadroniza = () => (
    <Card>
        <Mono>Playbook da agência</Mono>
        <div className="mt-2.5 flex flex-col gap-0.5">
            {["Diagnóstico do lead", "Proposta personalizada", "Follow-up em 2 dias"].map((s, i) => (
                <div key={s} className="flex items-center gap-2.5 py-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white" style={{ background: "var(--lp-blue)", fontWeight: 700 }}>{i + 1}</span>
                    <span className="text-[13.5px]" style={{ color: "var(--lp-ink-90)" }}>{s}</span>
                </div>
            ))}
        </div>
    </Card>
);
const PNovos = () => (
    <Card>
        <Mono>Próximo passo sugerido</Mono>
        <p className="mt-1.5 text-[14px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>Enviar o diagnóstico inicial e propor uma call de 15 minutos.</p>
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--lp-line-soft)" }}>
            <p className="lp-mono" style={{ color: "var(--lp-blue)" }}>seguindo o playbook da agência</p>
        </div>
    </Card>
);
const PAlinhada = () => (
    <Card>
        <Mono>Resposta alinhada</Mono>
        <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>A sugestão segue o tom da marca e as regras de aprovação da agência.</p>
        <div className="mt-3 flex flex-col gap-1.5">
            {["Tom da marca", "Sem prometer prazo sem aprovação", "Próximo passo claro"].map((l) => (
                <div key={l} className="flex items-start gap-2.5 text-[12.5px]" style={{ color: "var(--lp-ink-90)" }}>{dot()}<span>{l}</span></div>
            ))}
        </div>
    </Card>
);

export interface ShowcaseItem { label: string; preview: ReactNode; }
export interface ShowcaseRow {
    label: string;
    title: string;
    body: string;
    variant: "blue" | "cyan" | "lilac" | "green";
    reverse?: boolean;
    items: ShowcaseItem[];
}

export const FEATURE_ROWS: ShowcaseRow[] = [
    {
        label: "Assistente comercial",
        title: "Ajude sua equipe a responder melhor cada lead",
        body: "A EVA lê a conversa, entende o momento do lead e sugere uma resposta clara para avançar o atendimento.",
        variant: "cyan",
        items: [
            { label: "Entende o contexto da conversa", preview: <PContexto /> },
            { label: "Sugere uma resposta pronta para revisão", preview: <PSugestao /> },
            { label: "Mantém aprovação humana antes do envio", preview: <PAprovacao /> },
        ],
    },
    {
        label: "Qualificação",
        title: "Saiba quais conversas merecem atenção agora",
        body: "A EVA identifica sinais de compra, dúvidas comerciais e oportunidades que podem passar despercebidas no WhatsApp.",
        variant: "blue",
        reverse: true,
        items: [
            { label: "Identifica intenção comercial", preview: <PIntencao /> },
            { label: "Diferencia curiosidade de oportunidade real", preview: <PCuriosidade /> },
            { label: "Ajuda o time a priorizar atendimentos", preview: <PPriorizar /> },
        ],
    },
    {
        label: "Playbook da agência",
        title: "Transforme seu processo comercial em próximos passos",
        body: "A EVA usa o contexto da sua operação para sugerir respostas alinhadas ao jeito certo de vender da agência.",
        variant: "lilac",
        items: [
            { label: "Padroniza a condução comercial", preview: <PPadroniza /> },
            { label: "Ajuda novos vendedores a seguir o processo", preview: <PNovos /> },
            { label: "Reduz respostas desalinhadas", preview: <PAlinhada /> },
        ],
    },
];
