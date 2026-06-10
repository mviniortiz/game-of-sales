// ─────────────────────────────────────────────────────────────────────────────
// EvaAssistPreview (EVA.INBOX.1) — página TEMPORÁRIA de validação visual da
// nova lateral da EVA, com os DOIS estados lado a lado (confia / se cala).
//
// Dados 100% mock (cenário "Agência Metria Growth"). O envio aqui só mostra
// um toast com o sinal de aprendizado capturado (accepted/edited + delta),
// pra validar o loop sem tocar em dado real.
//
// Remover esta página + rota /eva-assist-preview depois de integrar ao Inbox.
// ─────────────────────────────────────────────────────────────────────────────
import { toast } from "sonner";
import { EvaAssistColumn, type EvaAssistData } from "@/components/inbox/EvaAssistColumn";
import type { SuggestionOutcome } from "@/lib/eva/suggestionFeedback";

const MOCK_SUGGEST: EvaAssistData = {
    leadName: "Renata Souza",
    stateLine: "Lead quente, pediu valores de tráfego pago há 12 min",
    mode: "suggest",
    suggestion:
        "Oi Renata! Pra uma clínica do porte da Sorria Mais, a gestão de tráfego começa em R$ 2.500/mês, com otimização semanal e relatório quinzenal. Consigo te mostrar amanhã às 14h como ficaria o funil de agendamentos. Funciona pra você?",
    questions: [],
    context: {
        summary:
            "Dona de clínica odontológica, já investe R$ 3 mil/mês em Meta Ads sem agência. Quer previsibilidade na agenda de avaliações.",
        score: 82,
        temperatura: "quente",
        chips: ["Decisora", "Orçamento definido", "Urgência alta"],
    },
    nextAction:
        "Se ela topar o horário, crie a oportunidade e marque a demo no calendário.",
};

const MOCK_DISCOVER: EvaAssistData = {
    leadName: "Eduardo Lima",
    stateLine: "Lead novo, primeira mensagem há 3 min",
    mode: "discover",
    suggestion: null,
    questions: [
        "Qual é o seu negócio e o que você vende hoje?",
        "Você já investe em anúncios ou seria a primeira vez?",
    ],
    context: {
        summary:
            "Chegou pelo anúncio do Instagram. Só disse \"vi o anúncio de vocês\". Nenhum dado de negócio ainda.",
        score: null,
        temperatura: null,
        chips: ["Origem: Instagram Ads"],
    },
    nextAction:
        "Depois que ele responder, rode a análise de novo pra EVA conseguir sugerir.",
};

function handleSend(text: string, outcome: SuggestionOutcome | null) {
    if (!outcome) {
        toast.info("Pergunta de descoberta enviada (sem sinal de sugestão)", {
            description: text,
        });
        return;
    }
    const pct = Math.round(outcome.similarity * 100);
    toast.success(
        outcome.outcome === "accepted"
            ? "Sinal capturado: sugestão ACEITA sem edição"
            : `Sinal capturado: sugestão EDITADA (similaridade ${pct}%)`,
        { description: text },
    );
}

export default function EvaAssistPreview() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#EFF2F7",
                padding: "32px 24px",
                fontFamily: "inherit",
            }}
        >
            <div style={{ maxWidth: 880, margin: "0 auto" }}>
                <p
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.09em",
                        color: "#1E293B",
                        marginBottom: 4,
                    }}
                >
                    Preview local
                </p>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0B1220", marginBottom: 6 }}>
                    Lateral da EVA: máquina de resposta
                </h1>
                <p style={{ fontSize: 12.5, color: "#64748B", marginBottom: 24, lineHeight: 1.5 }}>
                    Dados mock. Enviar aqui só mostra o sinal de aprendizado capturado
                    (aceita / editada + similaridade) num toast.
                </p>

                <div style={{ display: "flex", gap: 24, alignItems: "stretch", flexWrap: "wrap" }}>
                    {(["CONFIA: resposta pronta", "SE CALA: descubra primeiro"] as const).map(
                        (label, i) => (
                            <div key={label} style={{ width: 380 }}>
                                <p
                                    style={{
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                        color: "#1E293B",
                                        marginBottom: 8,
                                    }}
                                >
                                    {label}
                                </p>
                                <div
                                    style={{
                                        height: 640,
                                        borderRadius: 16,
                                        overflow: "hidden",
                                        border: "1px solid #D9E2EC",
                                        boxShadow: "0 18px 40px -28px rgba(15,23,42,0.35)",
                                    }}
                                >
                                    <EvaAssistColumn
                                        data={i === 0 ? MOCK_SUGGEST : MOCK_DISCOVER}
                                        onSend={handleSend}
                                    />
                                </div>
                            </div>
                        ),
                    )}
                </div>
            </div>
        </div>
    );
}
