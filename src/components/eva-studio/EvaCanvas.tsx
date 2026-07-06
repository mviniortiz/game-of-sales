// ─────────────────────────────────────────────────────────────────────────────
// EvaCanvas (EVA.CANVAS.3 "O dia da EVA", 2026-07-06) — o EVA Studio depois da
// ativação. Feedback do Markus na v2 (mapa de 4 blocos no meio): "o usuário não
// vai entender o que tá acontecendo". Resposta: o protagonista agora é o
// TRABALHO da EVA (feed real de agent_suggestions — leituras, sugestões,
// cards criados, aprovações), e a anatomia do agente vira um rail compacto à
// esquerda (Escuta → Sabe → Regras → Entrega) com estado ✓/falta.
//
//   ┌ rail: quem é o agente ┬ feed: o que ele fez hoje ┐
//   │ orb + ativa + prontidão│ 09:42 Marina · sugeri…  │
//   │ mapa vertical 4 blocos │ 10:15 card no pipeline ✓│
//   │ [Ver a EVA decidir]    │ 2 aguardando você → Inbox│
//   └────────────────────────┴─────────────────────────┘
//
// Blocos abrem MODAL CENTRAL com os editores que já existiam (nada de motor
// novo). Test-run "Ver a EVA decidir" percorre o rail com um momento REAL das
// conversas (useEvaReplayMoments) e o desfecho entra no topo do feed no padrão
// aprovar-e-enviar; "Mandaria assim" grava julgamento.
//
// Privacidade: o feed mostra a LEITURA da EVA (proxima_acao, título do card),
// nunca a mensagem crua do lead.
// Jornada (Criar→Ensinar→Provar→Ativar) segue sendo o first-run em EvaStudio.tsx.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    AudioLines,
    BookOpen,
    Check,
    ChevronRight,
    Inbox,
    Loader2,
    Play,
    ShieldCheck,
    X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { getSpecialist } from "@/lib/eva/evaSpecialists";
import type { ApprovalResult } from "@/lib/eva/approval";
import type { EvaMemory } from "@/hooks/useEvaMemory";
import { useAgentSuggestionFeed, type AgentFeedItem } from "@/hooks/useAgentSuggestionFeed";
import { INK, SUB, MUTE, HAIR, BLUE, PURPLE, GREEN, AMBER, cardSoft } from "./tokens";
import { ConversationalStudio } from "./ConversationalStudio";
import {
    GuidedContextBuilder,
    type ContextGap,
    type ContextSuggestion,
    type SuggestionResolution,
} from "./GuidedContextBuilder";
import {
    GuidedSimulationReplay,
    type MomentJudgment,
    type ReplayMoment,
} from "./GuidedSimulationReplay";
import type { AgentSourceInfo } from "./AgentPurposeCreate";
import { EvaAnalyticsPanel } from "./EvaAnalyticsPanel";
import { EvaMemoryView } from "./EvaMemoryTab";
import { EvaInsightsTab } from "./EvaInsightsTab";

type BlockKey = "escuta" | "sabe" | "regras" | "entrega";
type ModalKey = BlockKey | "memoria" | "insights" | "julgar";

export interface EvaCanvasProps {
    canEdit: boolean;
    approval: ApprovalResult;
    // Escuta
    sources: AgentSourceInfo[];
    memory: EvaMemory | null;
    memoryLoading: boolean;
    // Sabe
    hasSourceMaterial: boolean;
    suggestions: ContextSuggestion[];
    gaps: ContextGap[];
    onResolve: (s: ContextSuggestion, r: SuggestionResolution) => void;
    onConfirmBatch?: (batch: ContextSuggestion[]) => void;
    onDefineGap: (gap: ContextGap, answer: string) => void;
    onSubmitText: (text: string) => void;
    // Regras
    hybridOn: boolean;
    hybridSaving: boolean;
    onHybridChange: (v: boolean) => void;
    // Test-run / julgamento (momentos reais)
    moments: ReplayMoment[];
    savedJudgments: Record<string, MomentJudgment["action"]>;
    onJudge: (moment: ReplayMoment, judgment: MomentJudgment) => void;
    onRegenerateReplays?: () => void | Promise<void>;
    regeneratingReplays?: boolean;
    // Insights (montado pela página, tem dependências próprias)
    insightsContent: ReactNode;
}

const RUN_STEP_MS = 2000;

interface BlockDef {
    key: BlockKey;
    icon: typeof Inbox;
    title: string;
    /** Estado resumido no rail ("3 fontes ativas", "2 perguntas em aberto"). */
    state: string;
    ok: boolean;
    trace: string;
}

// ── Feed helpers ─────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: "aguardando você", bg: "rgba(37,99,235,0.10)", color: BLUE },
    accepted: { label: "você aprovou", bg: "rgba(22,163,74,0.10)", color: GREEN },
    sent: { label: "aprovada e enviada", bg: "rgba(22,163,74,0.10)", color: GREEN },
    adjusted: { label: "você ajustou", bg: "rgba(180,83,9,0.10)", color: AMBER },
    rejected: { label: "descartada", bg: "rgba(11,18,32,0.06)", color: MUTE },
    expired: { label: "expirou", bg: "rgba(11,18,32,0.06)", color: MUTE },
};

const KIND_LABEL: Record<string, string> = {
    qualification: "Qualificação",
    outbound_message: "Mensagem",
    followup: "Follow-up",
    objection: "Objeção",
    proposal: "Proposta",
};

function feedLine(item: AgentFeedItem): string {
    if (item.dealTitle) return `Criei o card no pipeline: ${item.dealTitle}`;
    if (item.nextAction) return `Li a conversa e sugeri: ${item.nextAction}`;
    return `Deixei uma sugestão de ${KIND_LABEL[item.kind]?.toLowerCase() ?? "qualificação"} no Inbox`;
}

function dayLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Hoje";
    if (same(d, yesterday)) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

const hourOf = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// ─────────────────────────────────────────────────────────────────────────────

export function EvaCanvas(props: EvaCanvasProps) {
    const navigate = useNavigate();
    const spec = getSpecialist("qualificacao"); // único especialista com runtime hoje
    const feed = useAgentSuggestionFeed();
    const [modal, setModal] = useState<ModalKey | null>(null);
    /** Vista dentro do modal "O que ela sabe": hub → drill-down com volta. */
    const [sabeView, setSabeView] = useState<"hub" | "revisar" | "conversar" | "colar">("hub");
    const [pasteText, setPasteText] = useState("");

    /** -1 = parado; 0..3 = bloco do rail aceso; 4 = desfecho no feed. */
    const [runStep, setRunStep] = useState(-1);
    const timer = useRef<number | undefined>(undefined);
    const running = runStep >= 0 && runStep < 4;

    const runMoment = props.moments.find((m) => !props.savedJudgments[m.id]) ?? props.moments[0] ?? null;

    useEffect(() => {
        if (runStep < 0 || runStep >= 4) return;
        timer.current = window.setTimeout(() => setRunStep((s) => s + 1), RUN_STEP_MS);
        return () => window.clearTimeout(timer.current);
    }, [runStep]);
    const resetRun = () => {
        window.clearTimeout(timer.current);
        setRunStep(-1);
    };

    const openGaps = props.gaps.length;
    const rulesCount = props.memory?.rules.length ?? 0;
    const activeSources = props.sources.filter((s) => s.available).length;

    const blocks: BlockDef[] = [
        {
            key: "escuta", icon: AudioLines, title: "O que ela escuta",
            state: `${activeSources} de ${props.sources.length} fontes ativas`, ok: true,
            trace: runMoment ? `${runMoment.leadName} · ${runMoment.context}` : "",
        },
        {
            key: "sabe", icon: BookOpen, title: "O que ela sabe",
            state: openGaps > 0 ? `${openGaps} ${openGaps === 1 ? "pergunta em aberto" : "perguntas em aberto"}` : "Contexto em dia",
            ok: openGaps === 0,
            trace: runMoment ? `Tensão reconhecida: ${runMoment.tension}. Respondo com o que você me ensinou.` : "",
        },
        {
            key: "regras", icon: ShieldCheck, title: "Regras do jogo",
            state: `Aprovar-e-enviar · ${rulesCount} ${rulesCount === 1 ? "regra sua" : "regras suas"}`, ok: true,
            trace: runMoment?.critical
                ? "Linha vermelha: eu preparo, não envio. A decisão é sua."
                : "Dentro dos limites: a sugestão espera sua aprovação.",
        },
        {
            key: "entrega", icon: Inbox, title: "O que ela entrega",
            state: feed.pendingCount > 0 ? `${feed.pendingCount} ${feed.pendingCount === 1 ? "sugestão esperando" : "sugestões esperando"}` : "Inbox em dia",
            ok: true,
            trace: "Resposta pronta pro seu aprovar-e-enviar.",
        },
    ];

    // Feed agrupado por dia (já vem ordenado desc)
    const groups: { day: string; items: AgentFeedItem[] }[] = [];
    for (const item of feed.items) {
        const day = dayLabel(item.createdAt);
        const last = groups[groups.length - 1];
        if (last?.day === day) last.items.push(item);
        else groups.push({ day, items: [item] });
    }

    return (
        <div
            className="flex min-h-[calc(100vh-56px)] w-full flex-col"
            style={{
                background: "#F6F4EF",
                backgroundImage: "radial-gradient(rgba(11,18,32,0.05) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
                color: INK,
            }}
        >
            <style>{`
                @keyframes vz-canvas-trace-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .vz-canvas-trace { animation: vz-canvas-trace-in 0.35s ease-out both; }
                @keyframes vz-canvas-feed-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .vz-canvas-feed-item { animation: vz-canvas-feed-in 0.3s ease-out both; }
                @media (prefers-reduced-motion: reduce) {
                    .vz-canvas-trace, .vz-canvas-feed-item { animation: none; }
                }
            `}</style>

            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col gap-6 px-6 py-8 lg:flex-row lg:gap-10 xl:px-12 2xl:px-16">
                {/* ── Rail: quem é o agente ── */}
                <aside className="w-full flex-shrink-0 lg:w-[320px] 2xl:w-[360px]">
                    <div className="rounded-2xl p-5" style={cardSoft}>
                        <div className="flex items-center gap-3">
                            <EvaOrb variant={spec.orb} size={44} showVoice={false} state={running ? "analyzing" : "idle"} />
                            <div style={{ minWidth: 0 }}>
                                <h1 style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{spec.role}</h1>
                                <span
                                    className="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
                                    style={{ background: "rgba(22,163,74,0.10)", color: GREEN, fontSize: 11, fontWeight: 600 }}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
                                    Ativa no Inbox
                                </span>
                            </div>
                        </div>

                        {/* Prontidão */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between" style={{ fontSize: 11.5, color: SUB }}>
                                <span>Prontidão da EVA</span>
                                <span style={{ fontWeight: 700, color: INK }}>{props.approval.score}%</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(11,18,32,0.07)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${props.approval.score}%`, background: BLUE }} />
                            </div>
                        </div>

                        {/* Mapa vertical do agente */}
                        <div className="mt-5">
                            {blocks.map((b, i) => {
                                const Icon = b.icon;
                                const lit = runStep >= i;
                                const active = runStep === i;
                                return (
                                    <div key={b.key}>
                                        {i > 0 && (
                                            <div
                                                aria-hidden
                                                className="ml-[18px] h-4 w-0 border-l-2"
                                                style={{
                                                    borderLeftStyle: "dotted",
                                                    borderColor: runStep >= i ? BLUE : "rgba(11,18,32,0.18)",
                                                }}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => !running && setModal(b.key)}
                                            className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/[0.03]"
                                            style={{
                                                outline: active ? `2px solid ${BLUE}` : undefined,
                                                outlineOffset: 2,
                                                cursor: running ? "default" : "pointer",
                                            }}
                                        >
                                            <span
                                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                                                style={{ background: lit && runStep >= 0 ? "rgba(37,99,235,0.10)" : "rgba(11,18,32,0.05)" }}
                                            >
                                                <Icon style={{ width: 14, height: 14, color: lit && runStep >= 0 ? BLUE : SUB }} />
                                            </span>
                                            <span style={{ minWidth: 0, flex: 1 }}>
                                                <span className="flex items-center justify-between gap-2">
                                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{b.title}</span>
                                                    {b.ok ? (
                                                        <Check style={{ width: 12, height: 12, color: GREEN, flexShrink: 0 }} strokeWidth={3} />
                                                    ) : (
                                                        <span className="flex-shrink-0 rounded-full px-1.5 py-0.5" style={{ background: "rgba(180,83,9,0.10)", color: AMBER, fontSize: 10, fontWeight: 700 }}>
                                                            falta
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="block" style={{ fontSize: 11.5, color: b.ok ? MUTE : AMBER }}>{b.state}</span>
                                                {active && b.trace && (
                                                    <span className="vz-canvas-trace mt-1.5 block rounded-lg px-2 py-1.5" style={{ background: "rgba(37,99,235,0.06)", color: "#1e40af", fontSize: 11.5, lineHeight: 1.45 }}>
                                                        {b.trace}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Test-run */}
                        {runStep === -1 ? (
                            <button
                                type="button"
                                onClick={() => runMoment && setRunStep(0)}
                                disabled={!runMoment}
                                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-45"
                                style={{ background: "#080808", color: "#fff", fontSize: 13.5, fontWeight: 600 }}
                                title={runMoment ? undefined : "Ainda não há casos reais analisados"}
                            >
                                <Play style={{ width: 13, height: 13 }} fill="#fff" />
                                Ver a EVA decidir
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={resetRun}
                                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border"
                                style={{ borderColor: "rgba(8,8,8,0.25)", color: INK, fontSize: 13.5, fontWeight: 600, background: "transparent" }}
                            >
                                <X style={{ width: 13, height: 13 }} />
                                Encerrar
                            </button>
                        )}
                        {!runMoment && props.onRegenerateReplays && (
                            <button
                                type="button"
                                onClick={() => props.onRegenerateReplays?.()}
                                disabled={props.regeneratingReplays}
                                className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border disabled:opacity-50"
                                style={{ borderColor: "rgba(8,8,8,0.18)", color: SUB, fontSize: 12.5, fontWeight: 600, background: "transparent" }}
                            >
                                {props.regeneratingReplays && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Buscar momentos nas conversas
                            </button>
                        )}

                        <div className="mt-4 flex items-center justify-center gap-4" style={{ fontSize: 12 }}>
                            <button type="button" className="underline-offset-4 hover:underline" style={{ color: MUTE }} onClick={() => setModal("memoria")}>Memória</button>
                            <button type="button" className="underline-offset-4 hover:underline" style={{ color: MUTE }} onClick={() => setModal("insights")}>Insights</button>
                            <button type="button" className="underline-offset-4 hover:underline" style={{ color: MUTE }} onClick={() => setModal("julgar")}>Casos reais</button>
                        </div>
                    </div>
                </aside>

                {/* ── Feed: o que ela fez ── */}
                <main className="min-w-0 flex-1">
                    {/* Pendentes agora */}
                    {feed.pendingCount > 0 && (
                        <button
                            type="button"
                            onClick={() => navigate("/inbox")}
                            className="mb-5 flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left transition-transform hover:scale-[1.005]"
                            style={{ background: "#0d1421", color: "#fff" }}
                        >
                            <span style={{ fontSize: 14, fontWeight: 600 }}>
                                {feed.pendingCount} {feed.pendingCount === 1 ? "sugestão esperando" : "sugestões esperando"} sua aprovação no Inbox
                            </span>
                            <ChevronRight style={{ width: 16, height: 16, flexShrink: 0 }} />
                        </button>
                    )}

                    {/* Desfecho do test-run: aprovar-e-enviar de verdade */}
                    {runStep >= 4 && runMoment && (
                        <div className="vz-canvas-trace mb-5 rounded-2xl p-5" style={{ ...cardSoft, borderColor: "rgba(37,99,235,0.35)" }}>
                            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PURPLE }}>
                                Sugestão da EVA · aguardando você
                            </p>
                            <p className="mt-3" style={{ fontSize: 12.5, color: SUB }}>
                                {runMoment.leadName} disse: “{runMoment.leadMessage}”
                            </p>
                            <p className="mt-2" style={{ fontSize: 14, lineHeight: 1.55 }}>“{runMoment.evaReply}”</p>
                            <div className="mt-4 flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => { props.onJudge(runMoment, { action: "approve" }); resetRun(); }}
                                    disabled={!props.canEdit}
                                    className="inline-flex h-9 items-center gap-2 rounded-full px-4 disabled:opacity-50"
                                    style={{ background: "#080808", color: "#fff", fontSize: 13, fontWeight: 600 }}
                                >
                                    <Check style={{ width: 13, height: 13 }} strokeWidth={3} />
                                    Mandaria assim
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { resetRun(); setModal("julgar"); }}
                                    className="inline-flex h-9 items-center rounded-full border px-4"
                                    style={{ borderColor: "rgba(8,8,8,0.22)", color: INK, fontSize: 13, fontWeight: 600, background: "transparent" }}
                                >
                                    Julgar com calma
                                </button>
                                <span className="ml-auto" style={{ fontSize: 11.5, color: MUTE }}>Nada sai sem você.</span>
                            </div>
                        </div>
                    )}

                    {/* Feed por dia */}
                    {feed.loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-5 w-5 animate-spin" style={{ color: BLUE }} />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="rounded-2xl px-6 py-14 text-center" style={cardSoft}>
                            <EvaOrb variant={spec.orb} size={52} showVoice={false} state="idle" />
                            <p className="mt-4" style={{ fontSize: 15, fontWeight: 700 }}>A EVA ainda não registrou trabalho por aqui.</p>
                            <p className="mx-auto mt-2 max-w-md" style={{ fontSize: 13, color: SUB, lineHeight: 1.55 }}>
                                Assim que os leads chegarem no Inbox, cada leitura, sugestão e card criado
                                aparece nesta linha do tempo. Enquanto isso, veja como ela decide num caso real.
                            </p>
                            {runMoment && runStep === -1 && (
                                <button
                                    type="button"
                                    onClick={() => setRunStep(0)}
                                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-full px-5"
                                    style={{ background: "#080808", color: "#fff", fontSize: 13.5, fontWeight: 600 }}
                                >
                                    <Play style={{ width: 13, height: 13 }} fill="#fff" />
                                    Ver a EVA decidir
                                </button>
                            )}
                        </div>
                    ) : (
                        groups.map((g) => (
                            <section key={g.day} className="mb-7">
                                <h2 className="mb-2.5 px-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTE }}>
                                    {g.day}
                                </h2>
                                <div className="overflow-hidden rounded-2xl" style={cardSoft}>
                                    {g.items.map((item, i) => {
                                        const chip = STATUS_CHIP[item.status] ?? STATUS_CHIP.pending;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => (item.dealId ? navigate(`/deals/${item.dealId}`) : navigate("/inbox"))}
                                                className="vz-canvas-feed-item flex w-full items-baseline gap-3 px-5 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
                                                style={{
                                                    borderTop: i > 0 ? "1px solid rgba(11,18,32,0.05)" : undefined,
                                                    animationDelay: `${Math.min(i * 40, 320)}ms`,
                                                }}
                                            >
                                                <span className="flex-shrink-0 tabular-nums" style={{ fontSize: 11.5, color: MUTE, fontVariantNumeric: "tabular-nums" }}>
                                                    {hourOf(item.createdAt)}
                                                </span>
                                                <span style={{ minWidth: 0, flex: 1 }}>
                                                    <span className="block truncate" style={{ fontSize: 13.5 }}>
                                                        {item.contactName && <span style={{ fontWeight: 600 }}>{item.contactName} · </span>}
                                                        {feedLine(item)}
                                                    </span>
                                                    <span className="mt-0.5 block" style={{ fontSize: 11.5, color: MUTE }}>
                                                        {KIND_LABEL[item.kind] ?? item.kind}
                                                    </span>
                                                </span>
                                                <span className="flex-shrink-0 rounded-full px-2 py-0.5" style={{ background: chip.bg, color: chip.color, fontSize: 11, fontWeight: 600 }}>
                                                    {chip.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        ))
                    )}
                </main>
            </div>

            {/* ── Modais dos blocos (editores reais) ── */}
            <Dialog
                open={modal !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setModal(null);
                        setSabeView("hub");
                    }
                }}
            >
                <DialogContent
                    className="max-h-[85vh] overflow-y-auto p-0 sm:rounded-2xl"
                    style={{
                        maxWidth: (modal === "sabe" && sabeView !== "hub") || modal === "julgar" ? 880 : 640,
                        background: "#fff",
                    }}
                >
                    {modal === "escuta" && (
                        <ModalFrame icon={AudioLines} kicker="Entrada" title="O que ela escuta"
                            desc="Os canais e sinais que alimentam a leitura da EVA. Ela só escuta o que estiver conectado.">
                            <div className="space-y-2.5">
                                {props.sources.map((s) => (
                                    <div key={s.key} className="rounded-xl border px-4 py-3.5" style={{ borderColor: HAIR }}>
                                        <div className="flex items-center justify-between gap-3">
                                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</span>
                                            <span
                                                className="rounded-full px-2 py-0.5"
                                                style={{
                                                    fontSize: 11, fontWeight: 600,
                                                    background: s.available ? "rgba(22,163,74,0.10)" : "rgba(11,18,32,0.05)",
                                                    color: s.available ? GREEN : MUTE,
                                                }}
                                            >
                                                {s.stateLabel}
                                            </span>
                                        </div>
                                        <p className="mt-1" style={{ fontSize: 12.5, color: SUB, lineHeight: 1.5 }}>{s.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </ModalFrame>
                    )}

                    {modal === "sabe" && sabeView === "hub" && (
                        <ModalFrame icon={BookOpen} kicker="Conhecimento" title="O que ela sabe"
                            desc="Tudo que a EVA usa pra sugerir vem daqui. Você aprova cada coisa que entra.">
                            {/* 1 · O que já está na cabeça dela */}
                            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTE }}>
                                Na cabeça dela hoje
                            </p>
                            <div className="mt-2 grid grid-cols-3 gap-2.5">
                                {[
                                    { n: props.memory?.evaStudioCount ?? 0, label: "aprendizados seus" },
                                    { n: props.memory?.playbooksCount ?? 0, label: "playbooks e respostas" },
                                    { n: rulesCount, label: "regras de conduta" },
                                ].map((s) => (
                                    <div key={s.label} className="rounded-xl border px-3 py-3 text-center" style={{ borderColor: HAIR }}>
                                        <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{s.n}</p>
                                        <p className="mt-1" style={{ fontSize: 11.5, color: SUB, lineHeight: 1.3 }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => setModal("memoria")}
                                className="mt-2 underline-offset-4 hover:underline"
                                style={{ fontSize: 12, color: MUTE }}
                            >
                                Ver a memória completa (e de onde cada coisa veio)
                            </button>

                            {/* 2 · O que precisa de você */}
                            <p className="mt-6" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTE }}>
                                Precisa de você
                            </p>
                            {props.suggestions.length === 0 && props.gaps.length === 0 ? (
                                <div className="mt-2 flex items-center gap-2.5 rounded-xl border px-4 py-3.5" style={{ borderColor: HAIR }}>
                                    <Check style={{ width: 14, height: 14, color: GREEN }} strokeWidth={3} />
                                    <span style={{ fontSize: 13, color: SUB }}>Nada pendente. Tudo que ela extraiu já passou por você.</span>
                                </div>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {props.suggestions.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSabeView("revisar")}
                                            className="flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
                                            style={{ borderColor: "rgba(37,99,235,0.30)" }}
                                        >
                                            <span style={{ minWidth: 0 }}>
                                                <span className="block" style={{ fontSize: 13.5, fontWeight: 600 }}>
                                                    {props.suggestions.length} {props.suggestions.length === 1 ? "fato extraído esperando" : "fatos extraídos esperando"} seu carimbo
                                                </span>
                                                <span className="block" style={{ fontSize: 12, color: SUB }}>
                                                    Ela leu seu material e separou o que entendeu. Confirme ou corrija.
                                                </span>
                                            </span>
                                            <ChevronRight style={{ width: 15, height: 15, color: BLUE, flexShrink: 0 }} />
                                        </button>
                                    )}
                                    {props.gaps.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSabeView("revisar")}
                                            className="flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
                                            style={{ borderColor: "rgba(180,83,9,0.30)" }}
                                        >
                                            <span style={{ minWidth: 0 }}>
                                                <span className="block" style={{ fontSize: 13.5, fontWeight: 600 }}>
                                                    {props.gaps.length} {props.gaps.length === 1 ? "pergunta que ela não sabe" : "perguntas que ela não sabe"} responder
                                                </span>
                                                <span className="block" style={{ fontSize: 12, color: SUB }}>
                                                    Leads perguntaram e faltou resposta. Cada uma que você responder destrava sugestões melhores.
                                                </span>
                                            </span>
                                            <ChevronRight style={{ width: 15, height: 15, color: AMBER, flexShrink: 0 }} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* 3 · Ensinar mais */}
                            <p className="mt-6" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTE }}>
                                Ensinar mais
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setSabeView("conversar")}
                                    className="rounded-xl border px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
                                    style={{ borderColor: HAIR }}
                                >
                                    <span className="block" style={{ fontSize: 13.5, fontWeight: 600 }}>Conversar com a EVA</span>
                                    <span className="block" style={{ fontSize: 12, color: SUB }}>Ela pergunta, você responde. O jeito mais fácil.</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSabeView("colar")}
                                    className="rounded-xl border px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02]"
                                    style={{ borderColor: HAIR }}
                                >
                                    <span className="block" style={{ fontSize: 13.5, fontWeight: 600 }}>Colar um texto</span>
                                    <span className="block" style={{ fontSize: 12, color: SUB }}>Proposta, site, pitch. Ela extrai e você revisa.</span>
                                </button>
                            </div>
                        </ModalFrame>
                    )}

                    {modal === "sabe" && sabeView !== "hub" && (
                        <div className="p-6">
                            <button
                                type="button"
                                onClick={() => setSabeView("hub")}
                                className="mb-4 inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                                style={{ fontSize: 12.5, fontWeight: 600, color: SUB }}
                            >
                                <ChevronRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} />
                                O que ela sabe
                            </button>
                            <DialogTitle style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: INK }}>
                                {sabeView === "revisar" ? "Revisar o que ela extraiu" : sabeView === "conversar" ? "Conversar com a EVA" : "Colar um texto"}
                            </DialogTitle>
                            <div className="mt-4">
                                {sabeView === "revisar" && (
                                    <GuidedContextBuilder
                                        hideHeader
                                        hasSourceMaterial={props.hasSourceMaterial}
                                        suggestions={props.suggestions}
                                        gaps={props.gaps}
                                        onResolve={props.onResolve}
                                        onConfirmBatch={props.onConfirmBatch}
                                        onDefineGap={props.onDefineGap}
                                        onSubmitText={props.onSubmitText}
                                    />
                                )}
                                {sabeView === "conversar" && (
                                    <ConversationalStudio
                                        hideHeader
                                        agentKey={spec.key}
                                        onComplete={(fields) => {
                                            const text = spec.fields
                                                .map((f) => (fields[f.key] ? `${f.label}: ${fields[f.key]}` : ""))
                                                .filter(Boolean)
                                                .join("\n");
                                            if (text) props.onSubmitText(text);
                                        }}
                                    />
                                )}
                                {sabeView === "colar" && (
                                    <div>
                                        <p style={{ fontSize: 13, color: SUB, lineHeight: 1.55 }}>
                                            Cole qualquer texto seu: proposta, página do site, pitch, FAQ. A EVA extrai os
                                            fatos e devolve como sugestões pra você carimbar — nada entra direto.
                                        </p>
                                        <textarea
                                            value={pasteText}
                                            onChange={(e) => setPasteText(e.target.value)}
                                            rows={9}
                                            placeholder="Cole o texto aqui…"
                                            className="mt-3 w-full rounded-xl border p-4 outline-none focus:ring-2"
                                            style={{ borderColor: HAIR, fontSize: 13.5, lineHeight: 1.55, resize: "vertical" }}
                                        />
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                type="button"
                                                disabled={!pasteText.trim() || !props.canEdit}
                                                onClick={() => {
                                                    props.onSubmitText(pasteText.trim());
                                                    setPasteText("");
                                                    setSabeView("hub");
                                                }}
                                                className="inline-flex h-9 items-center rounded-full px-4 disabled:opacity-45"
                                                style={{ background: "#080808", color: "#fff", fontSize: 13, fontWeight: 600 }}
                                            >
                                                Enviar pra EVA extrair
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {modal === "regras" && (
                        <ModalFrame icon={ShieldCheck} kicker="Limites" title="Regras do jogo"
                            desc="Até onde a EVA vai sozinha. Mensagem pro lead, nunca: isso é sempre aprovar-e-enviar.">
                            <div className="rounded-xl border px-4 py-3.5" style={{ borderColor: HAIR }}>
                                <p style={{ fontSize: 13.5, fontWeight: 600 }}>Mensagem de saída: sempre com você</p>
                                <p className="mt-1" style={{ fontSize: 12.5, color: SUB, lineHeight: 1.5 }}>
                                    Nenhum agente envia mensagem sozinho. A EVA prepara, você aprova. Isso não é configurável, é o princípio do produto.
                                </p>
                            </div>
                            <div className="mt-2.5 flex items-start gap-4 rounded-xl border px-4 py-3.5" style={{ borderColor: HAIR }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13.5, fontWeight: 600 }}>Criar oportunidade automaticamente (modo híbrido)</p>
                                    <p className="mt-1" style={{ fontSize: 12.5, color: SUB, lineHeight: 1.5 }}>
                                        Ao qualificar um lead que chegou e recomendar avançar, o card entra no pipeline sozinho, com os campos preenchidos.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={props.hybridOn}
                                    disabled={!props.canEdit || props.hybridSaving}
                                    onClick={() => props.onHybridChange(!props.hybridOn)}
                                    className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
                                    style={{ background: props.hybridOn ? BLUE : "#CBD5E1" }}
                                >
                                    <span
                                        className="inline-block h-5 w-5 rounded-full bg-white transition-transform"
                                        style={{ transform: props.hybridOn ? "translateX(22px)" : "translateX(2px)" }}
                                    />
                                </button>
                            </div>
                            {rulesCount > 0 && (
                                <div className="mt-2.5 rounded-xl border px-4 py-3.5" style={{ borderColor: HAIR }}>
                                    <p style={{ fontSize: 13.5, fontWeight: 600 }}>Regras que ela aprendeu com você</p>
                                    <ul className="mt-2 space-y-1.5">
                                        {props.memory?.rules.slice(0, 8).map((r) => (
                                            <li key={r.text} className="flex items-baseline gap-2" style={{ fontSize: 12.5, color: SUB, lineHeight: 1.5 }}>
                                                <Check style={{ width: 11, height: 11, color: GREEN, flexShrink: 0, transform: "translateY(1px)" }} strokeWidth={3} />
                                                <span>{r.text} <span style={{ color: MUTE }}>· {r.origin}</span></span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </ModalFrame>
                    )}

                    {modal === "entrega" && (
                        <ModalFrame icon={Inbox} kicker="Saída" title="O que ela entrega"
                            desc="O trabalho dela aparece pro seu time no Inbox e no pipeline. Aqui, o quanto vocês estão aproveitando.">
                            <EvaAnalyticsPanel onTeach={() => setModal("sabe")} />
                            <div className="mt-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => navigate("/inbox")}
                                    className="inline-flex h-9 items-center gap-2 rounded-full px-4"
                                    style={{ background: "#080808", color: "#fff", fontSize: 13, fontWeight: 600 }}
                                >
                                    Abrir o Inbox
                                    <ChevronRight style={{ width: 13, height: 13 }} />
                                </button>
                            </div>
                        </ModalFrame>
                    )}

                    {modal === "memoria" && (
                        <ModalFrame icon={BookOpen} kicker="Bastidores" title="Memória da EVA"
                            desc="Tudo que ela sabe e de onde veio.">
                            <EvaMemoryView memory={props.memory} loading={props.memoryLoading} />
                        </ModalFrame>
                    )}

                    {modal === "insights" && (
                        <ModalFrame icon={ShieldCheck} kicker="Bastidores" title="Insights"
                            desc="O que dá pra melhorar, na leitura da própria EVA.">
                            {props.insightsContent}
                        </ModalFrame>
                    )}

                    {modal === "julgar" && (
                        <ModalFrame icon={ShieldCheck} kicker="Casos reais" title="Julgar as respostas da EVA"
                            desc="Momentos reais das suas conversas: diga se a EVA mandou bem. É assim que ela aprende os seus limites.">
                            <GuidedSimulationReplay
                                hideHeader
                                hasReplays={props.moments.length > 0}
                                moments={props.moments}
                                initialJudgments={props.savedJudgments}
                                onJudge={props.onJudge}
                                onRegenerate={props.onRegenerateReplays}
                                regenerating={props.regeneratingReplays}
                                onActivate={() => setModal(null)} // já ativada — só fecha
                            />
                        </ModalFrame>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Moldura padrão dos modais do canvas ─────────────────────────────────────
function ModalFrame({
    icon: Icon,
    kicker,
    title,
    desc,
    children,
}: {
    icon: typeof Inbox;
    kicker: string;
    title: string;
    desc: string;
    children: ReactNode;
}) {
    return (
        <div className="p-6">
            <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.08)" }}>
                    <Icon style={{ width: 17, height: 17, color: BLUE }} />
                </span>
                <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTE }}>{kicker}</p>
                    <DialogTitle style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: INK }}>{title}</DialogTitle>
                    <p className="mt-1.5" style={{ fontSize: 13.5, lineHeight: 1.55, color: SUB }}>{desc}</p>
                </div>
            </div>
            <div className="mt-5">{children}</div>
        </div>
    );
}
