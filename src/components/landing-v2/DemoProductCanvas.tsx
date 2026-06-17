import { LEAD_MESSAGE, type SceneKind } from "./evaDemoData";

// LP.7 (v2) — canvas do produto da demo guiada. Janela minimalista (off-white,
// hairlines, sem dashboard cheio nem badges coloridas). Conteúdo muda por cena;
// o painel secundário sobe suave (vz-rise) depois do conteúdo principal.
const HEADER: Record<SceneKind, string> = {
    conversation: "Conversa",
    analysis: "Conversa",
    suggestion: "Conversa",
    nextstep: "Oportunidade",
    command: "Início",
    pipeline: "Pipeline",
    performance: "Desempenho",
    agent: "Agentes",
};

function Bubble() {
    return (
        <div
            className="inline-block px-4 py-2.5 text-[13.5px]"
            style={{ background: "var(--lp-paper)", border: "1px solid var(--lp-line)", borderRadius: "13px 13px 13px 4px", color: "var(--lp-ink-90)", lineHeight: 1.45, maxWidth: "85%" }}
        >
            {LEAD_MESSAGE}
        </div>
    );
}

function AnalysisPanel() {
    const lines = ["Primeiro contato", "Interesse em planos", "Perfil: agência"];
    return (
        <div className="vz-rise mt-4 rounded-xl p-4" style={{ border: "1px solid var(--lp-line)", background: "rgba(5,5,5,0.012)", animationDelay: "0.12s" }}>
            <p className="lp-mono mb-1" style={{ color: "var(--lp-ink-55)" }}>Leitura da EVA</p>
            <div>
                {lines.map((l, i) => (
                    <p key={l} className="py-2 text-[13.5px]" style={{ color: "var(--lp-ink-90)", borderTop: i === 0 ? "none" : "1px solid var(--lp-line-soft)" }}>
                        {l}
                    </p>
                ))}
            </div>
        </div>
    );
}

function SuggestionCard() {
    return (
        <div className="vz-rise mt-4 border-t pt-4" style={{ borderColor: "var(--lp-line-soft)", animationDelay: "0.12s" }}>
            <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Sugestão da EVA</p>
            <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>
                Claro. Antes de te passar os planos, posso entender quantos atendimentos vocês recebem por mês hoje?
            </p>
            <div className="mt-4 flex items-center gap-2.5">
                <span className="inline-block rounded-lg px-3.5 py-2 text-[12.5px] text-white" style={{ background: "var(--lp-blue)", fontWeight: 600 }}>Usar sugestão</span>
                <span className="inline-block rounded-lg px-3.5 py-2 text-[12.5px]" style={{ border: "1px solid var(--lp-line)", color: "var(--lp-ink-55)", fontWeight: 600 }}>Editar</span>
            </div>
        </div>
    );
}

function AgentCard() {
    return (
        <div className="vz-rise" style={{ animationDelay: "0.06s" }}>
            <p className="lp-display" style={{ fontSize: "1.25rem", letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>Especialista em qualificação</p>
            <div className="mt-4">
                <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Objetivo</p>
                <p className="mt-1 text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>Entender intenção, momento e próximos passos do lead.</p>
            </div>
            <div className="mt-4">
                <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Fontes</p>
                <div className="mt-1.5">
                    {["Playbook da agência", "Histórico da conversa", "Regras de aprovação"].map((s, i) => (
                        <p key={s} className="py-1.5 text-[13.5px]" style={{ color: "var(--lp-ink-90)", borderTop: i === 0 ? "none" : "1px solid var(--lp-line-soft)" }}>{s}</p>
                    ))}
                </div>
            </div>
        </div>
    );
}

function NextStepCard() {
    return (
        <div className="vz-rise" style={{ animationDelay: "0.06s" }}>
            <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Próximo passo sugerido</p>
            <p className="mt-1.5 text-[14px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>
                Enviar diagnóstico inicial e propor uma call de 15 minutos.
            </p>
            <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--lp-line-soft)" }}>
                <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Status</span>
                <span className="text-[12.5px]" style={{ color: "var(--lp-ink-90)", fontWeight: 600 }}>Aguardando aprovação</span>
            </div>
        </div>
    );
}

function CommandCanvas() {
    const rows = [
        { l: "Conversas hoje", v: "8" },
        { l: "Aguardando resposta", v: "3" },
        { l: "Oportunidades abertas", v: "5" },
    ];
    return (
        <div className="vz-rise" style={{ animationDelay: "0.06s" }}>
            <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Seu dia</p>
            <div className="mt-2">
                {rows.map((r, i) => (
                    <div key={r.l} className="flex items-center justify-between py-2.5" style={{ borderTop: i === 0 ? "none" : "1px solid var(--lp-line-soft)" }}>
                        <span className="text-[13.5px]" style={{ color: "var(--lp-ink-90)" }}>{r.l}</span>
                        <span className="text-[14px]" style={{ color: "var(--lp-ink)", fontWeight: 700 }}>{r.v}</span>
                    </div>
                ))}
            </div>
            <div className="mt-3 rounded-xl p-3.5" style={{ border: "1px solid var(--lp-line)", background: "rgba(21,86,192,0.04)" }}>
                <p className="lp-mono" style={{ color: "var(--lp-blue)" }}>Ação sugerida pela EVA</p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.45 }}>Responder Clara R. ainda hoje, ela está pronta para avançar.</p>
            </div>
        </div>
    );
}

function PipelineCanvas() {
    const cols = [
        { t: "Lead", cards: ["Clara R."] },
        { t: "Qualificado", cards: ["Jean B.", "Marina L."] },
        { t: "Proposta", cards: ["Estúdio Vivo"] },
    ];
    return (
        <div className="vz-rise grid grid-cols-3 gap-2.5" style={{ animationDelay: "0.06s" }}>
            {cols.map((c) => (
                <div key={c.t} className="rounded-xl p-2.5" style={{ background: "rgba(5,5,5,0.025)" }}>
                    <p className="lp-mono mb-2" style={{ color: "var(--lp-ink-55)", fontSize: 10 }}>{c.t}</p>
                    <div className="flex flex-col gap-2">
                        {c.cards.map((name) => (
                            <div key={name} className="rounded-lg px-2.5 py-2 text-[12px]" style={{ background: "#fff", border: "1px solid var(--lp-line)", color: "var(--lp-ink-90)", fontWeight: 600 }}>{name}</div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PerformanceCanvas() {
    const top = [
        { p: "1", n: "Ana", v: "12 negócios" },
        { p: "2", n: "Bruno", v: "9 negócios" },
        { p: "3", n: "Carla", v: "7 negócios" },
    ];
    return (
        <div className="vz-rise" style={{ animationDelay: "0.06s" }}>
            <div className="flex items-center justify-between">
                <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Meta do mês</p>
                <span className="text-[12.5px]" style={{ color: "var(--lp-live)", fontWeight: 600 }}>no ritmo</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--lp-line)" }}>
                <div style={{ width: "68%", height: "100%", background: "var(--lp-blue)" }} />
            </div>
            <p className="mt-1 text-[12px]" style={{ color: "var(--lp-ink-55)" }}>68% concluído</p>

            <p className="lp-mono mt-5" style={{ color: "var(--lp-ink-55)" }}>Ranking do time</p>
            <div className="mt-1.5">
                {top.map((t, i) => (
                    <div key={t.n} className="flex items-center gap-3 py-2" style={{ borderTop: i === 0 ? "none" : "1px solid var(--lp-line-soft)" }}>
                        <span className="text-[13px]" style={{ color: "var(--lp-ink-40)", fontWeight: 700, width: 14 }}>{t.p}</span>
                        <span className="flex-1 text-[13.5px]" style={{ color: "var(--lp-ink-90)", fontWeight: 600 }}>{t.n}</span>
                        <span className="text-[12.5px]" style={{ color: "var(--lp-ink-55)" }}>{t.v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DemoProductCanvas({ kind }: { kind: SceneKind }) {
    const showBubble = kind === "conversation" || kind === "analysis" || kind === "suggestion";
    return (
        <div className="w-full max-w-[420px] overflow-hidden rounded-2xl" style={{ border: "1px solid var(--lp-line)", background: "#fff", boxShadow: "0 30px 70px -34px rgba(13,20,33,0.45)" }}>
            <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: "1px solid var(--lp-line-soft)" }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e5e2db" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e5e2db" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#e5e2db" }} />
                <span className="lp-mono ml-2" style={{ color: "var(--lp-ink-40)" }}>Vyzon · {HEADER[kind]}</span>
            </div>
            <div className="p-5 sm:p-6">
                {showBubble && <Bubble />}
                {kind === "analysis" && <AnalysisPanel />}
                {kind === "suggestion" && <SuggestionCard />}
                {kind === "nextstep" && <NextStepCard />}
                {kind === "command" && <CommandCanvas />}
                {kind === "pipeline" && <PipelineCanvas />}
                {kind === "performance" && <PerformanceCanvas />}
                {kind === "agent" && <AgentCard />}
            </div>
        </div>
    );
}
