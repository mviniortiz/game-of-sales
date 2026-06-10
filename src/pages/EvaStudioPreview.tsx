// ─────────────────────────────────────────────────────────────────────────────
// EvaStudioPreview (EVA.STUDIO.F1-F3 + JOURNEY) — página TEMPORÁRIA de
// validação do novo EVA Studio.
//
// ★★★★ Studio acoplado (EvaStudioJourney) é a vista principal: a jornada
// completa Criar → Ensinar (chat + revisão) → Provar (campo de provas + casos
// reais) → Ativar, com as peças que antes viviam soltas aqui embaixo. As
// vistas antigas ficam pra comparação até o Markus validar.
//
// Dados 100% mock. Os callbacks mostram em toast o que seria gravado (inclusive
// o delta de correção — o sinal de aprendizado). Remover página + rota
// /eva-studio-preview após integrar.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { toast } from "sonner";
import {
    AgentPurposeCreate,
    type AgentPurpose,
    type AgentPurposeOption,
    type AgentSourceInfo,
} from "@/components/eva-studio/AgentPurposeCreate";
import {
    GuidedContextBuilder,
    type ContextGap,
    type ContextSuggestion,
    type SuggestionResolution,
} from "@/components/eva-studio/GuidedContextBuilder";
import {
    GuidedSimulationReplay,
    type MomentJudgment,
    type ReplayMoment,
} from "@/components/eva-studio/GuidedSimulationReplay";
import {
    EvaStudioShell,
    type StudioStepKey,
} from "@/components/eva-studio/EvaStudioShell";
import { ConversationalStudio } from "@/components/eva-studio/ConversationalStudio";
import {
    SimulationLab,
    type LabJudgment,
    type LabScenario,
} from "@/components/eva-studio/SimulationLab";
import { EvaStudioJourney } from "@/components/eva-studio/EvaStudioJourney";
import { EvaMemoryView } from "@/components/eva-studio/EvaMemoryTab";
import { EvaInsightsTab } from "@/components/eva-studio/EvaInsightsTab";
import type { EvaMemory } from "@/hooks/useEvaMemory";
import type { ApprovalResult } from "@/lib/eva/approval";

// ─── Mocks Frente 1 ─────────────────────────────────────────────────────────

const PURPOSES: AgentPurposeOption[] = [
    { purpose: "vender", available: true },
    { purpose: "suporte", available: false },
    { purpose: "pos_venda", available: false },
];

const SOURCES: AgentSourceInfo[] = [
    {
        key: "whatsapp",
        name: "Conversas do WhatsApp",
        detail: "O histórico real dos seus leads: o que pedem, como falam, onde travam.",
        available: true,
        stateLabel: "conectado",
    },
    {
        key: "pipeline",
        name: "Pipeline e oportunidades",
        detail: "Etapas, valores e o que o seu time já registrou no CRM.",
        available: true,
        stateLabel: "disponível",
    },
    {
        key: "docs",
        name: "Textos seus",
        detail: "Proposta, site, pitch: qualquer texto que você colar vira contexto.",
        available: false,
        stateLabel: "você cola depois",
    },
];

// ─── Mocks Frente 2 (cenário Metria Growth; fontes = docs colados) ──────────

const SUGGESTIONS: ContextSuggestion[] = [
    {
        id: "s1",
        type: "service",
        confidence: 0.92,
        statement:
            "Vocês vendem gestão de tráfego pago (Meta e Google) a partir de R$ 2.500/mês.",
        evidence:
            "Investimento: gestão de tráfego a partir de R$ 2.500 mensais (Meta + Google), com otimização semanal.",
        source: "da proposta que você colou",
        effect: "As respostas sobre preço de tráfego param de ser genéricas.",
    },
    {
        id: "s2",
        type: "service",
        confidence: 0.88,
        statement: "Social media em dois pacotes: 12 ou 20 posts por mês.",
        evidence: "Plano Essencial (12 posts/mês) e Plano Completo (20 posts/mês).",
        source: "da página de serviços do seu site",
        effect: "A EVA passa a oferecer o pacote certo pro porte do lead.",
    },
    {
        id: "s3",
        type: "icp",
        confidence: 0.74,
        statement:
            "Cliente ideal: clínicas e negócios locais faturando acima de R$ 50 mil/mês.",
        evidence:
            "Atendemos clínicas e negócios locais em crescimento que já faturam a partir de R$ 50 mil mensais.",
        source: "da proposta que você colou",
        effect: "A lista do Inbox passa a separar fit bom de fit fraco.",
    },
    {
        id: "s4",
        type: "forbidden_promise",
        confidence: 0.86,
        statement: "Nunca prometer resultado garantido antes do diagnóstico.",
        evidence:
            "Não trabalhamos com promessa de resultado garantido; todo plano começa por um diagnóstico.",
        source: "da proposta que você colou",
        effect: "A EVA fica proibida de prometer resultado nas sugestões.",
    },
    {
        id: "s5",
        type: "objection",
        confidence: 0.68,
        statement:
            "Quando o lead acha caro, vocês oferecem começar só com tráfego e expandir depois.",
        evidence:
            "Se o investimento total pesar, é possível iniciar apenas com a frente de tráfego.",
        source: "da proposta que você colou",
        effect: "Objeção de preço ganha uma resposta sua, não inventada.",
    },
];

const GAPS: ContextGap[] = [
    {
        id: "g1",
        question: "Quanto custa o social media pra quem já é cliente de tráfego?",
        blocks: "respostas sobre preço de combo",
        occurrenceCount: 7,
    },
    {
        id: "g2",
        question: "Vocês atendem e-commerce ou só negócio local?",
        blocks: "qualificação de fit",
        occurrenceCount: 4,
    },
    {
        id: "g3",
        question: "Qual o prazo mínimo de contrato?",
        blocks: "objeção de compromisso",
        occurrenceCount: 2,
    },
];

// Conta nova: as perguntas uma-a-uma são as lacunas essenciais (count 0)
const SEED_GAPS: ContextGap[] = [
    {
        id: "seed1",
        question: "O que a sua agência vende hoje?",
        blocks: "tudo: sem isso eu não sugiro nada",
        occurrenceCount: 0,
    },
    {
        id: "seed2",
        question: "Pra quem você vende (porte, segmento)?",
        blocks: "qualificação de fit",
        occurrenceCount: 0,
    },
];

// ─── Mocks Frente 3 (replay de momento-chave; Metria Growth) ────────────────
// Perdidas/sumidas no núcleo + 1 ganha de tempero; 2 casos críticos (linha
// vermelha). Falas de agência de marketing — ICP correto, não o resíduo de
// imobiliária do SCENARIOS antigo.

const MOMENTS: ReplayMoment[] = [
    {
        id: "m1",
        leadName: "Marina · Clínica OdontoSorriso",
        tension: "Objeção de preço",
        critical: true,
        outcome: "lost",
        outcomeDetail: "Esse lead você perdeu, sumiu 2 dias depois desta mensagem.",
        context: "Marina pediu proposta de tráfego, recebeu o valor e voltou comparando com concorrente.",
        leadMessage: "Achei caro. Uma agência aqui da cidade cobra quase metade disso.",
        evaReply:
            "Entendo a comparação. A diferença costuma estar no que entra: a nossa gestão é com otimização semanal, não só subir campanha. Se o investimento total pesa agora, dá pra começar só pela frente de tráfego (R$ 2.500) e expandir quando o retorno aparecer. Quer que eu te mostre como ficaria assim?",
        sellerReply: "Consigo fazer 20% de desconto se fechar hoje. Topa?",
    },
    {
        id: "m2",
        leadName: "Rogério · Academia PowerFit",
        tension: "Pedido de garantia de resultado",
        critical: true,
        outcome: "lost",
        outcomeDetail: "Esse lead você perdeu logo depois desta resposta.",
        context: "Rogério gostou da proposta, mas travou pedindo garantia antes de assinar.",
        leadMessage: "Mas vocês garantem que eu vou ter retorno? Não quero jogar dinheiro fora.",
        evaReply:
            "Não trabalho com promessa de resultado garantido, e prefiro ser honesta com você desde já. O que eu garanto é o método: a gente começa por um diagnóstico, define meta junto e acompanha de perto toda semana. Posso te mostrar resultados reais de clientes parecidos com a PowerFit pra você decidir com base em fato, não em promessa?",
        sellerReply: "Com certeza! Pode confiar que você vai vender muito mais com a gente.",
    },
    {
        id: "m3",
        leadName: "Tatiane · Studio de Pilates",
        tension: "Preço de combo (lacuna do contexto)",
        outcome: "ghosted",
        outcomeDetail: "Conversa esfriou aqui, Tatiane não respondeu mais.",
        context: "Já cliente de tráfego, Tatiane perguntou sobre adicionar social media.",
        leadMessage: "E se eu quiser somar o social media ao tráfego que já faço com vocês, quanto fica?",
        evaReply:
            "Boa pergunta. Como você já é cliente de tráfego, o social media entra em condição de combo, não pelo cheio. Vou confirmar o valor exato com o time e já te trago, mas adianto que os pacotes são de 12 ou 20 posts por mês. Qual volume faz mais sentido pro seu Studio?",
        sellerReply: "Deixa eu ver com o pessoal e te falo depois.",
    },
    {
        id: "m4",
        leadName: "Eduardo · E-commerce de suplementos",
        tension: "Decisão compartilhada com sócio",
        outcome: "ghosted",
        outcomeDetail: "Ficou de retornar e não voltou.",
        context: "Eduardo demonstrou interesse alto mas adiou citando o sócio.",
        leadMessage: "Gostei bastante, mas preciso alinhar com meu sócio antes de fechar qualquer coisa.",
        evaReply:
            "Faz total sentido, é uma decisão de dois. Pra facilitar essa conversa, posso te mandar um resumo de uma página com escopo, investimento e o que esperar nos primeiros 30 dias, assim vocês olham juntos. Te chamo na quinta pra saber o que decidiram?",
        sellerReply: "Sem problema, qualquer coisa me chama quando decidir.",
    },
    {
        id: "m5",
        leadName: "Camila · Restaurante Tempero da Vila",
        tension: "Sinal de fechamento",
        outcome: "won",
        outcomeDetail: "Você fechou esse, 3 dias depois desta conversa.",
        context: "Depois do diagnóstico, Camila sinalizou que queria começar.",
        leadMessage: "Fechado, gostei da proposta. Como faço pra começar?",
        evaReply:
            "Que ótimo, vamos juntos! O primeiro passo é o contrato e o briefing inicial, que leva uns 15 minutos. Já te envio o link agora e a gente agenda a reunião de kickoff pra esta semana. Prefere começar pela frente de tráfego ou já alinhar tráfego e social desde o início?",
        sellerReply: "Maravilha! Vou te passar os próximos passos.",
    },
];

// ─── Mocks Memória + Insights (vistas secundárias da jornada) ────────────────

const MEMORY_MOCK: EvaMemory = {
    rules: [
        { text: "Nunca prometer resultado garantido antes do diagnóstico.", origin: "EVA Studio" },
        { text: "Se o investimento total pesar, oferecer começar só pela frente de tráfego (R$ 2.500) e expandir depois.", origin: "EVA Studio" },
        { text: "Pedido de desconto fora da alçada → passar pro humano.", origin: "Contexto" },
        { text: "Cliente ideal: clínicas e negócios locais faturando acima de R$ 50 mil/mês.", origin: "Contexto" },
    ],
    gaps: GAPS.map((g) => g.question),
    playbooksCount: 4,
    evaStudioCount: 2,
    gapsOpenCount: GAPS.length,
    updatedAt: "2026-06-09T14:30:00-03:00",
};

const APPROVAL_MOCK: ApprovalResult = {
    criteria: [],
    score: 78,
    blocked: false,
    blockers: [],
    testedCount: 4,
    rejected: 0,
    hasHandoff: true,
    agentStatus: "Em revisão",
    readiness: "review",
};

// ─── Página ─────────────────────────────────────────────────────────────────

type View = "journey" | "simlab" | "convo" | "shell" | "f1" | "f2-full" | "f2-empty" | "f3-full" | "f3-empty";

const VIEWS: { key: View; label: string }[] = [
    { key: "journey", label: "★★★★ Studio acoplado" },
    { key: "simlab", label: "★★★ Campo de Provas" },
    { key: "convo", label: "★★ Conversar com a EVA" },
    { key: "shell", label: "★ Casca · Jornada" },
    { key: "f1", label: "Frente 1 · Criar agente" },
    { key: "f2-full", label: "Frente 2 · Com matéria-prima" },
    { key: "f2-empty", label: "Frente 2 · Conta nova" },
    { key: "f3-full", label: "Frente 3 · Replay real" },
    { key: "f3-empty", label: "Frente 3 · Sem conversas" },
];

const STUDIO_STEPS = [
    { key: "criar" as StudioStepKey, label: "Criar", sub: "Escolher o propósito" },
    { key: "ensinar" as StudioStepKey, label: "Ensinar", sub: "Construir o contexto" },
    { key: "provar" as StudioStepKey, label: "Provar", sub: "Testar nos casos reais" },
    { key: "ativar" as StudioStepKey, label: "Ativar", sub: "Soltar no Inbox" },
];

const PURPOSE_LABEL: Record<AgentPurpose, string> = {
    vender: "Vender",
    suporte: "Dar suporte",
    pos_venda: "Pós-venda",
};

export default function EvaStudioPreview() {
    const [view, setView] = useState<View>("journey");
    const [shellStep, setShellStep] = useState<StudioStepKey>("ensinar");

    // ── Handlers mock (mostram o que seria gravado) ──
    const handleCreate = (purpose: AgentPurpose) => {
        toast.success(`Agente "${PURPOSE_LABEL[purpose]}" criado (mock)`);
    };

    const handleResolve = (s: ContextSuggestion, r: SuggestionResolution) => {
        if (r.action === "confirm") {
            toast.success("Confirmado → entraria no contexto da EVA", {
                description: s.effect ?? s.statement,
            });
        } else if (r.action === "correct") {
            const pct = Math.round(r.outcome.similarity * 100);
            toast.success(
                `Corrigido → sinal de aprendizado capturado (similaridade ${pct}%)`,
                { description: r.correctedText },
            );
        } else {
            toast.info("Descartado — não entra no contexto.");
        }
    };

    const handleConfirmBatch = (batch: ContextSuggestion[]) => {
        toast.success(
            `${batch.length} sugestões de confiança alta confirmadas → entrariam no contexto`,
            { description: batch.map((s) => s.statement).join(" · ").slice(0, 140) },
        );
    };

    const handleDefineGap = (gap: ContextGap, answer: string) => {
        toast.success("Lacuna fechada → entraria no contexto da EVA", {
            description: `${gap.question} → ${answer}`,
        });
    };

    const handleSubmitText = (text: string) => {
        toast.success("Texto enviado pro pipeline de extração (mock)", {
            description: `${text.slice(0, 80)}… → viraria cards de sugestão pra você revisar.`,
        });
    };

    const handleJudge = (m: ReplayMoment, j: MomentJudgment) => {
        if (j.action === "approve") {
            toast.success(`"${m.leadName}" → aprovado (result: approved)`, {
                description: "Enche o termômetro de confiança.",
            });
        } else if (j.action === "adjust") {
            const pct = Math.round(j.outcome.similarity * 100);
            toast.success(`Corrigido → sinal de aprendizado (similaridade ${pct}%)`, {
                description: `result: needs_adjustment · ${j.correctedText.slice(0, 90)}`,
            });
        } else if (j.action === "redline") {
            toast[m.critical ? "error" : "warning"](
                m.critical
                    ? `Linha vermelha em caso CRÍTICO → trava a ativação`
                    : `Marcado inaceitável (result: rejected)`,
                { description: m.critical ? "Hard-stop: precisa resolver antes de soltar a EVA." : undefined },
            );
        } else {
            toast.info("Pulado — sai da fila, não conta no termômetro.");
        }
    };

    const handleActivate = () => {
        toast.success("Ativaria a EVA L2 no Inbox (mock)", {
            description: "No integrado: eva_blueprints.status → approved_assisted.",
        });
    };

    const handleLabJudge = (s: LabScenario, j: LabJudgment) => {
        if (j.action === "approve") {
            toast.success(`Campo de provas · "${s.persona}" aprovado`, {
                description: "Conta na prontidão da EVA.",
            });
        } else {
            const pct = Math.round(j.outcome.similarity * 100);
            toast.success(`Campo de provas · corrigido (similaridade ${pct}%)`, {
                description: j.correctedText.slice(0, 90),
            });
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#FFFFFF", paddingBottom: 60 }}>
            {/* Switcher de frentes do preview */}
            <div
                style={{
                    maxWidth: 780,
                    margin: "0 auto",
                    padding: "20px 24px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                }}
            >
                <p
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.09em",
                        color: "#1E293B",
                        marginRight: 8,
                    }}
                >
                    Preview local
                </p>
                {VIEWS.map((v) => {
                    const on = view === v.key;
                    return (
                        <button
                            key={v.key}
                            type="button"
                            onClick={() => setView(v.key)}
                            style={{
                                height: 28,
                                padding: "0 12px",
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: on ? "#534AB7" : "#FFFFFF",
                                color: on ? "#FFFFFF" : "#475569",
                                border: `1px solid ${on ? "#534AB7" : "#D9E2EC"}`,
                            }}
                        >
                            {v.label}
                        </button>
                    );
                })}
            </div>

            {view === "journey" && (
                <EvaStudioJourney
                    purposes={PURPOSES}
                    sources={SOURCES}
                    onCreate={handleCreate}
                    hasSourceMaterial
                    suggestions={SUGGESTIONS}
                    gaps={GAPS}
                    onResolve={handleResolve}
                    onConfirmBatch={handleConfirmBatch}
                    onDefineGap={handleDefineGap}
                    onSubmitText={handleSubmitText}
                    hasReplays
                    moments={MOMENTS}
                    onJudge={handleJudge}
                    onLabJudge={handleLabJudge}
                    onActivate={handleActivate}
                    memoryContent={<EvaMemoryView memory={MEMORY_MOCK} loading={false} />}
                    insightsContent={
                        <EvaInsightsTab
                            hideHeader
                            approval={APPROVAL_MOCK}
                            memory={MEMORY_MOCK}
                            lastSimAt="2026-06-09T11:05:00-03:00"
                        />
                    }
                />
            )}
            {view === "simlab" && <SimulationLab />}
            {view === "convo" && <ConversationalStudio />}
            {view === "shell" && (
                <EvaStudioShell
                    steps={STUDIO_STEPS}
                    current={shellStep}
                    doneKeys={
                        shellStep === "criar" ? []
                        : shellStep === "ensinar" ? ["criar"]
                        : shellStep === "provar" ? ["criar", "ensinar"]
                        : ["criar", "ensinar", "provar"]
                    }
                    onSelect={setShellStep}
                    readiness={{
                        label: "Prontidão da EVA",
                        pct: shellStep === "criar" ? 0.1 : shellStep === "ensinar" ? 0.4 : shellStep === "provar" ? 0.7 : 0.95,
                    }}
                    secondary={[
                        { key: "memoria", label: "Memória", onClick: () => toast.info("Abriria a Memória da EVA") },
                        { key: "insights", label: "Insights", onClick: () => toast.info("Abriria os Insights da EVA") },
                    ]}
                >
                    {shellStep === "criar" && (
                        <AgentPurposeCreate hideHeader purposes={PURPOSES} sources={SOURCES} onCreate={handleCreate} onProceed={() => setShellStep("ensinar")} />
                    )}
                    {shellStep === "ensinar" && (
                        <GuidedContextBuilder hideHeader hasSourceMaterial suggestions={SUGGESTIONS} gaps={GAPS} onResolve={handleResolve} onConfirmBatch={handleConfirmBatch} onDefineGap={handleDefineGap} onSubmitText={handleSubmitText} />
                    )}
                    {shellStep === "provar" && (
                        <GuidedSimulationReplay hideHeader hasReplays moments={MOMENTS} onJudge={handleJudge} onActivate={() => setShellStep("ativar")} />
                    )}
                    {shellStep === "ativar" && (
                        <div className="vz-simreplay-panel vz-simreplay-panel--ready">
                            <div className="vz-simreplay-panel-top">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="vz-simreplay-panel-headline">A EVA está pronta pra te ajudar no Inbox.</p>
                                    <p className="vz-simreplay-panel-reason">
                                        Você criou, ensinou e provou. Agora a EVA passa a sugerir respostas no Inbox, sempre pra você aprovar antes de enviar.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="vz-simreplay-activate vz-simreplay-activate--ready"
                                style={{ marginTop: 16 }}
                                onClick={() => toast.success("Ativaria a EVA no Inbox (mock)")}
                            >
                                Ativar a EVA no Inbox
                            </button>
                        </div>
                    )}
                </EvaStudioShell>
            )}
            {view === "f1" && (
                <AgentPurposeCreate
                    purposes={PURPOSES}
                    sources={SOURCES}
                    onCreate={handleCreate}
                    onProceed={() => setView("f2-full")}
                />
            )}
            {view === "f2-full" && (
                <GuidedContextBuilder
                    hasSourceMaterial
                    suggestions={SUGGESTIONS}
                    gaps={GAPS}
                    onResolve={handleResolve}
                    onConfirmBatch={handleConfirmBatch}
                    onDefineGap={handleDefineGap}
                    onSubmitText={handleSubmitText}
                />
            )}
            {view === "f2-empty" && (
                <GuidedContextBuilder
                    hasSourceMaterial={false}
                    suggestions={[]}
                    gaps={SEED_GAPS}
                    onResolve={handleResolve}
                    onDefineGap={handleDefineGap}
                    onSubmitText={handleSubmitText}
                />
            )}
            {view === "f3-full" && (
                <GuidedSimulationReplay
                    hasReplays
                    moments={MOMENTS}
                    onJudge={handleJudge}
                    onActivate={handleActivate}
                />
            )}
            {view === "f3-empty" && (
                <GuidedSimulationReplay
                    hasReplays={false}
                    moments={[]}
                    onJudge={handleJudge}
                    onActivate={handleActivate}
                />
            )}
        </div>
    );
}
