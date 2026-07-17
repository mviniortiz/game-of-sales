// ─────────────────────────────────────────────────────────────────────────────
// COMMAND.UI.7 — peças da Fila de ação da Central (/inicio).
//
// A composição DecisionWorkspace e o território da EVA (EvaPanel/EvaSynthesis/
// chat) foram REMOVIDOS em 2026-07-06: a Central virou Cockpit do gestor
// (dashboard em Inicio.tsx) e a EVA saiu da página (fica só o dock global).
// Este arquivo mantém as peças reutilizadas: ActionQueue (herói + fila,
// resolver/adiar/responder rápido) e ActivityTimeline.
//
// Substitui as três listas planas (Prioridades / Atenção / Movimentos) por uma
// superfície de decisão hierárquica:
//   - Fila de ação (bloco principal): cards rankeados, 1º em destaque.
//   - Leitura da EVA (sidebar): síntese editorial (risco / gargalo / sinal+ / rec).
//   - Gargalos e lacunas de contexto: cards por tema (evaHighlights).
//   - Atividade recente: timeline compacta, baixo peso visual.
//
// Só dados reais. Campos sem fonte (impacto, reincidência) são derivados do que
// existe (nível, nº de conversas, tempo) ou omitidos — nunca inventados.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
    ArrowRight,
    CalendarBlank as Calendar,
    ChatCircle as MessageCircle,
    Check,
    CheckCircle,
    CircleNotch,
    Clock,
    ClockCounterClockwise,
    Funnel,
    PaperPlaneRight,
    Sparkle as Sparkles,
    Target,
    Warning,
    X,
} from "@phosphor-icons/react";
import type {
    DailyPriority,
    RecentActivityItem,
} from "@/hooks/useCommandCenterData";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null | undefined): string {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return "agora";
    const min = Math.floor(diffMs / 60_000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

const INBOUND_PHRASE: Record<string, string> = {
    "Áudio recebido": "enviou um áudio",
    "Imagem recebida": "enviou uma imagem",
    "Vídeo recebido": "enviou um vídeo",
    "Documento recebido": "enviou um documento",
    "Localização recebida": "enviou uma localização",
    "Contato recebido": "enviou um contato",
    "Nova mensagem": "enviou nova mensagem",
};

function describeActivity(item: RecentActivityItem): string {
    const name = (item.contactName && item.contactName.trim()) || "Contato";
    if (item.type === "message_outbound") {
        return item.title === "Resposta enviada" ? `Resposta para ${name}` : `Mensagem para ${name}`;
    }
    return `${name} ${INBOUND_PHRASE[item.title] || "enviou uma mensagem"}`;
}

// Nível (azul/laranja/coral/cinza por papel de cor do produto).
//  - color/chipBg/bar: usados na fila secundária e badges (escala única).
//  - heroBg/heroBorder/heroBtn: o card HERÓI satura a cor do seu nível pra
//    dominar a tela. O herói é o único lugar com volume forte de cor.
interface LevelTone {
    label: string;
    color: string;
    chipBg: string;
    bar: string;
    heroBg: string;
    heroBorder: string;
    heroBtn: string;
    heroBtnHover: string;
}
const LEVEL: Record<DailyPriority["priority"], LevelTone> = {
    critical: { label: "Crítico", color: "#BE123C", chipBg: "rgba(244,63,94,0.10)",   bar: "#F43F5E", heroBg: "linear-gradient(135deg, #FFF1EC 0%, #FBDCD1 100%)", heroBorder: "#EDA591", heroBtn: "#CB4327", heroBtnHover: "#AF3820" },
    high:     { label: "Alto",    color: "#B45309", chipBg: "rgba(245,158,11,0.12)",  bar: "#F59E0B", heroBg: "linear-gradient(135deg, #FFF8EC 0%, #FCEED0 100%)", heroBorder: "#E9CB89", heroBtn: "#B45309", heroBtnHover: "#92400E" },
    medium:   { label: "Médio",   color: "#1D4ED8", chipBg: "rgba(37,99,235,0.10)",   bar: "#3B82F6", heroBg: "linear-gradient(135deg, #F4F8FF 0%, #E3EDFD 100%)", heroBorder: "#AFC7F0", heroBtn: "#1D4ED8", heroBtnHover: "#1E40AF" },
    low:      { label: "Baixo",   color: "#475569", chipBg: "rgba(148,163,184,0.15)", bar: "#94A3B8", heroBg: "#F8FAFC",                                          heroBorder: "#E2E8F0", heroBtn: "#475569", heroBtnHover: "#334155" },
};

function hoursSince(iso?: string | null): number {
    if (!iso) return 0;
    return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

// Badge de severidade padronizado (escala única Crítico/Alto/Médio/Baixo):
// sólido só pra Crítico; os demais como texto colorido discreto + ponto (não-cor
// pra daltônicos). Mesma escala em toda a fila.
function SeverityBadge({ priority }: { priority: DailyPriority["priority"] }) {
    const lv = LEVEL[priority];
    if (priority === "critical") {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white" style={{ background: "#BE123C", letterSpacing: "0.05em" }}>
                <Warning size={10} weight="fill" /> {lv.label}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase" style={{ color: lv.color, letterSpacing: "0.04em" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: lv.color }} /> {lv.label}
        </span>
    );
}

const TYPE_META: Record<DailyPriority["source"], { icon: typeof MessageCircle; label: string }> = {
    conversation: { icon: MessageCircle, label: "Conversa" },
    deal:         { icon: Target,        label: "Oportunidade" },
    eva:          { icon: Sparkles,      label: "Insight da EVA" },
    calendar:     { icon: Calendar,      label: "Agenda" },
};

export const CARD_STYLE: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E4E9F2",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
};

function EmptyState({ icon: Icon, title, text }: { icon: typeof Target; title: string; text: string }) {
    return (
        <div className="flex flex-col items-center text-center py-7 px-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2.5" style={{ background: "rgba(148,163,184,0.12)" }}>
                <Icon size={20} weight="duotone" style={{ color: "#475569" }} />
            </div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: "#0B1220" }}>{title}</p>
            <p className="text-[11.5px]" style={{ color: "#475569", maxWidth: 260, lineHeight: 1.5 }}>{text}</p>
        </div>
    );
}

function Skeleton({ rows = 3, h = 64 }: { rows?: number; h?: number }) {
    return (
        <div className="space-y-2.5">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="rounded-xl" style={{ height: h, background: "#F1F5F9" }} />
            ))}
        </div>
    );
}

// ── 1) Fila de ação — sistema de 3 pesos ──────────────────────────────────────
// Herói (1º, cor saturada do nível, domina) + secundários (brancos, barra
// lateral codificando severidade). Cada item resolve/adia/responde de verdade.

export interface QueueHandlers {
    onNavigate: (href: string) => void;
    onResolve: (id: string) => void;
    onSnooze: (id: string) => void;
    /** Enviar resposta direta (Evolution). Ausente = sem "Responder rápido". */
    sendReply?: (chatJid: string, text: string) => Promise<void>;
    replyConnected?: boolean;
}

function formatDayMonth(iso?: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Coluna de contexto do herói: rótulo discreto + valor. Enche a direita do card
// com informação (não com ar) — "Parada há", "Última mensagem", "Por que agora".
function HeroContext({ label, strong, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="text-[9.5px] uppercase mb-0.5" style={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.07em" }}>{label}</p>
            <p className="text-[12.5px]" style={{ color: strong ? "#0B1220" : "#334155", fontWeight: strong ? 700 : 500, lineHeight: 1.4 }}>{children}</p>
        </div>
    );
}

// ── Tempos da cadeia ao resolver (segundos) — calibrar de olho AQUI ──────────
// Regra: a EVA tem onset IMEDIATO (o texto antigo já sai no instante do resolve)
// e fecha junto com o reflow, pra ler como "reação" e não "atraso/trailing".
// Se o swap da EVA terminar muito depois do reflow assentar, vira ruído.
const CHAIN = {
    reflow: 0.22,    // linhas de baixo sobem pra preencher
    heroGrow: 0.24,  // o próximo cresce e vira o herói
    evaSwap: 0.13,   // cada fase (out/in) do swap da EVA — rápido, sem trailing
    stateSwap: 0.2,  // o vazio cedendo lugar (fade/scale) antes do novo entrar
    arrive: 0.34,    // card urgente entrando no vazio — com presença (o pulso faz o resto)
};

// Resolver com micro-recompensa: check "pop" + linha esmaecendo antes de sair
// da fila ("o dia encolhendo"). Em reduced-motion, resolve na hora, sem delay.
function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function useResolveTransition(onResolve: (id: string) => void, id: string) {
    const [resolving, setResolving] = useState(false);
    const resolve = () => {
        if (resolving) return;
        if (prefersReducedMotion()) { onResolve(id); return; }
        setResolving(true);
        window.setTimeout(() => onResolve(id), 300);
    };
    return { resolving, resolve };
}

function ActionHero({ item, onNavigate, onResolve, onSnooze, sendReply, replyConnected, compact = false }: { item: DailyPriority; compact?: boolean } & QueueHandlers) {
    const lv = LEVEL[item.priority];
    const tp = TYPE_META[item.source];
    const TypeIcon = tp.icon;
    const canQuickReply = !!item.chatJid && !!sendReply;
    const isCritical = item.priority === "critical";
    const elapsedHrs = item.createdAt ? Math.floor(hoursSince(item.createdAt)) : null;
    const stale = elapsedHrs != null && elapsedHrs >= 48;
    const { resolving, resolve } = useResolveTransition(onResolve, item.id);

    const [replyOpen, setReplyOpen] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const handleSend = async () => {
        if (!item.chatJid || !sendReply || !text.trim() || sending) return;
        setSending(true);
        setErr(null);
        try {
            await sendReply(item.chatJid, text.trim());
            setReplyOpen(false);
            setText("");
            onResolve(item.id); // respondeu = ação resolvida
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Falha ao enviar. Tente abrir a conversa.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div id="foco-do-dia" className={`rounded-2xl p-4 sm:p-5 ${isCritical ? "vz-pulse-critical" : ""} ${resolving ? "vz-resolving" : ""}`} style={{ background: lv.heroBg, border: `1.5px solid ${lv.heroBorder}`, boxShadow: "0 2px 4px rgba(15,23,42,0.04), 0 12px 28px -10px rgba(15,23,42,0.12)" }}>
            <div className={compact ? "flex flex-col gap-3" : "flex flex-col sm:flex-row gap-4 sm:gap-5"}>
                {/* Esquerda — onde se age. Os botões descem pro fim (mt-auto) pra
                    alinhar com a base do contexto à direita. */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <SeverityBadge priority={item.priority} />
                        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#475569" }}>
                            <TypeIcon size={12} weight="duotone" /> {item.contactName || tp.label}
                        </span>
                    </div>
                    <p className={`vz-row-title font-bold leading-snug ${compact ? "text-[15.5px]" : "text-[20px] sm:text-[22px]"}`} style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>{item.title}</p>
                    <p className="text-[13px] mt-1.5" style={{ color: "#334155", lineHeight: 1.55 }}>{item.description}</p>

                    {/* Botões à esquerda — primário PRETO pill; secundários discretos. */}
                    <div className="mt-auto pt-4 flex items-center gap-2 flex-wrap">
                        {item.href && (
                            <button
                                type="button"
                                onClick={() => onNavigate(item.href!)}
                                className="inline-flex items-center gap-1.5 h-9 px-4 text-[12.5px] font-semibold transition-all hover:brightness-110"
                                style={{ background: "var(--vyz-btn-solid)", color: "var(--vyz-btn-on)", borderRadius: "var(--vyz-radius-pill)", boxShadow: "0 6px 14px -7px rgba(8,8,8,0.55)" }}
                            >
                                {item.actionLabel}
                                <ArrowRight size={12} weight="bold" />
                            </button>
                        )}
                        {canQuickReply && (
                            <button
                                type="button"
                                onClick={() => setReplyOpen((o) => !o)}
                                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold transition-colors"
                                style={{ background: "#FFFFFF", border: `1px solid ${lv.heroBorder}`, color: "#334155" }}
                            >
                                <PaperPlaneRight size={12} weight="duotone" /> Responder rápido
                            </button>
                        )}
                        <span className="ml-auto flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onSnooze(item.id)}
                                title="Adiar para amanhã"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold transition-colors hover:bg-white/70"
                                style={{ color: "#475569" }}
                            >
                                <ClockCounterClockwise size={13} weight="duotone" /> Adiar
                            </button>
                            <button
                                type="button"
                                onClick={resolve}
                                disabled={resolving}
                                title="Marcar como resolvido"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold transition-colors hover:bg-white/70 disabled:opacity-80"
                                style={{ color: "#047857" }}
                            >
                                <CheckCircle size={14} weight={resolving ? "fill" : "duotone"} className={resolving ? "vz-check-pop" : ""} /> {resolving ? "Resolvido" : "Resolver"}
                            </button>
                        </span>
                    </div>
                </div>

                {/* Direita — contexto que estava oco: tempo parado, data da última
                    mensagem e o porquê de subir agora. Informação, não ar. */}
                <div
                    className={compact
                        ? "order-first -mb-1 flex flex-row flex-wrap gap-x-5 gap-y-1.5"
                        : "sm:w-[188px] shrink-0 flex flex-row flex-wrap sm:flex-col gap-x-7 gap-y-3 sm:border-l sm:pl-5"}
                    style={compact ? undefined : { borderColor: "rgba(15,23,42,0.08)" }}
                >
                    {elapsedHrs != null && (
                        <HeroContext label="Parada há" strong={stale}>
                            <span className="tabular-nums" style={stale ? { color: lv.heroBtn } : undefined}>{elapsedHrs}h</span>
                        </HeroContext>
                    )}
                    {!compact && item.createdAt && (
                        <HeroContext label="Última mensagem"><span className="tabular-nums">{formatDayMonth(item.createdAt)}</span></HeroContext>
                    )}
                    {item.reason && <HeroContext label="Por que agora">{item.reason}</HeroContext>}
                </div>
            </div>

            {/* Composer inline — envia de verdade via Evolution */}
            {replyOpen && canQuickReply && (
                <div className="mt-3 rounded-xl p-3" style={{ background: "#FFFFFF", border: "1px solid #E4E9F2" }}>
                    {!replyConnected && (
                        <p className="text-[11.5px] mb-2 px-1" style={{ color: "#B45309" }}>
                            WhatsApp pode estar desconectado. Se falhar, abra a conversa pra responder.
                        </p>
                    )}
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                        placeholder={`Responder ${item.contactName || "o lead"}…`}
                        rows={2}
                        autoFocus
                        disabled={sending}
                        className="w-full resize-none text-[13px] outline-none px-1 py-1 disabled:opacity-60"
                        style={{ color: "#0B1220", background: "transparent" }}
                    />
                    {err && <p className="text-[11.5px] mt-1 px-1" style={{ color: "#B91C1C" }}>{err}</p>}
                    <div className="flex items-center justify-end gap-2 mt-2">
                        <button type="button" onClick={() => { setReplyOpen(false); setText(""); setErr(null); }} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold transition-colors hover:bg-[#F1F5F9]" style={{ color: "#475569" }}>
                            <X size={12} weight="bold" /> Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSend()}
                            disabled={!text.trim() || sending}
                            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-semibold text-white transition-all disabled:opacity-40"
                            style={{ background: lv.heroBtn }}
                        >
                            {sending ? <CircleNotch size={13} weight="bold" className="animate-spin" /> : <PaperPlaneRight size={13} weight="fill" />}
                            {sending ? "Enviando…" : "Enviar"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActionItem({ item, onNavigate, onResolve }: { item: DailyPriority } & Pick<QueueHandlers, "onNavigate" | "onResolve">) {
    const lv = LEVEL[item.priority];
    const clickable = !!item.href;
    const shortLabel = (item.actionLabel || "Abrir").split(" ")[0];
    const { resolving, resolve } = useResolveTransition(onResolve, item.id);
    return (
        <div
            className={`relative rounded-xl pl-4 pr-3 py-3 flex items-center gap-3 bg-white border border-[#E4E9F2] transition duration-150 ease-out hover:bg-[#FCFDFE] hover:border-[#D9E2EC] ${clickable ? "hover:translate-x-[3px]" : ""} ${resolving ? "vz-resolving" : ""}`}
        >
            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full" style={{ background: lv.bar }} aria-hidden />
            {/* Severidade vai só na barra lateral (cor) — sem badge de texto
                repetido em toda linha. O metadado consolida no rótulo da zona. */}
            <div className="flex-1 min-w-0">
                <p className="vz-row-title text-[13.5px] font-semibold truncate mb-0.5" style={{ color: "#0B1220" }}>{item.title}</p>
                <p className="text-[11.5px] truncate" style={{ color: "#475569" }}>{item.reason || item.description}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <button
                    type="button"
                    onClick={resolve}
                    disabled={resolving}
                    title="Marcar como resolvido"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors hover:bg-[#ECFDF5]"
                    style={{ border: `1px solid ${resolving ? "#3B6D11" : "#E4E9F2"}`, background: resolving ? "#3B6D11" : "transparent", color: resolving ? "#FFFFFF" : "#047857" }}
                >
                    <Check size={14} weight="bold" className={resolving ? "vz-check-pop" : ""} />
                </button>
                {clickable && (
                    <button
                        type="button"
                        onClick={() => onNavigate(item.href!)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors hover:bg-[#F1F5F9]"
                        style={{ border: "1px solid #E2E8F0", color: "#334155" }}
                    >
                        {shortLabel}
                        <ArrowRight size={11} weight="bold" />
                    </button>
                )}
            </div>
        </div>
    );
}

// Rótulo de zona discreto (text-xs muted) — todas as zonas (Pulso/Foco/Fila/
// Atividade) usam o mesmo peso. O metadado consolida aqui (hint à direita), não
// repetido em cada linha. O peso visual fica no conteúdo, não no rótulo.
function ZoneLabel({ children, hint, className = "" }: { children: React.ReactNode; hint?: React.ReactNode; className?: string }) {
    return (
        <div className={`flex items-baseline gap-2 ${className}`}>
            <p className="text-[11px] uppercase" style={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.08em" }}>{children}</p>
            {hint != null && hint !== "" && <span className="text-[11px]" style={{ color: "#94A3B8", fontWeight: 500 }}>{hint}</span>}
        </div>
    );
}

function QueueEmptyCard({ children }: { children: React.ReactNode }) {
    return <div className="rounded-2xl" style={CARD_STYLE}>{children}</div>;
}

export function ActionQueue({ queue, loading, dayComplete, filterActive, handlers, compact = false }: { queue: DailyPriority[]; loading: boolean; dayComplete: boolean; filterActive: boolean; handlers: QueueHandlers; compact?: boolean }) {
    const reduce = useReducedMotion();
    if (loading) {
        return (
            <QueueEmptyCard>
                <div className="p-5"><Skeleton rows={3} h={84} /></div>
            </QueueEmptyCard>
        );
    }
    // Três estados sob UM AnimatePresence (mode="wait"): cheio ↔ vazio.
    //  - 1ª montagem (initial={false}): sem entrada, a vz-stagger da página cuida.
    //  - cheio→vazio (resolveu a última): a fila cede lugar, "Missão concluída" entra.
    //  - VAZIO→CHEIO (a EVA detecta algo urgente): o vazio sai e o card sobe com
    //    presença (CHAIN.arrive + o pulso do crítico). É o momento de interrupção,
    //    onde a tela mais encanta ou mais quebra — aqui ele NÃO popa seco.
    // Dentro do "cheio", um 2º AnimatePresence (popLayout) faz a cadeia ao resolver:
    // item sai → os de baixo sobem (layout) → o próximo cresce e vira herói (mesma
    // key, sem fantasma). Tudo congelado em reduced-motion.
    return (
        <AnimatePresence mode="wait" initial={false}>
            {queue.length === 0 ? (
                <motion.div
                    key="empty"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    transition={{ duration: reduce ? 0 : CHAIN.stateSwap, ease: "easeOut" }}
                >
                    <QueueEmptyCard>
                        {filterActive ? (
                            <EmptyState icon={Funnel} title="Nada com esses filtros" text="Nenhuma ação bate com os filtros selecionados. Ajuste ou limpe os filtros pra ver a fila completa." />
                        ) : dayComplete ? (
                            <EmptyState icon={CheckCircle} title="Missão do dia concluída" text="Você resolveu todas as ações de hoje. A EVA te avisa quando surgir algo novo." />
                        ) : (
                            <EmptyState icon={Target} title="Tudo em dia" text="Nada crítico agora. Continuo de olho nas conversas e te aviso quando surgir uma ação urgente." />
                        )}
                    </QueueEmptyCard>
                </motion.div>
            ) : (
                <motion.div
                    key="filled"
                    className="flex flex-col gap-3"
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    transition={{ duration: reduce ? 0 : CHAIN.arrive, ease: "easeOut" }}
                >
                    <ZoneLabel>Foco agora</ZoneLabel>
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={queue[0].id}
                            layout={!reduce}
                            initial={false}
                            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                            transition={{ duration: reduce ? 0 : CHAIN.heroGrow, ease: "easeOut" }}
                        >
                            <ActionHero compact={compact} item={queue[0]} {...handlers} />
                        </motion.div>
                        {queue.length > 1 && (
                            <motion.div
                                key="lbl-depois"
                                layout={!reduce}
                                className="mt-2"
                                transition={{ duration: reduce ? 0 : CHAIN.heroGrow, ease: "easeOut" }}
                            >
                                <ZoneLabel hint={`${queue.length - 1} ${queue.length - 1 === 1 ? "pendente" : "pendentes"}`}>Fila</ZoneLabel>
                            </motion.div>
                        )}
                        {queue.slice(1).map((p) => (
                            <motion.div
                                key={p.id}
                                layout={!reduce}
                                initial={false}
                                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                                transition={{ duration: reduce ? 0 : CHAIN.reflow, ease: "easeOut" }}
                            >
                                <ActionItem item={p} onNavigate={handlers.onNavigate} onResolve={handlers.onResolve} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function ActivityTimeline({ items, loading, onNavigate }: { items: RecentActivityItem[]; loading: boolean; onNavigate: (href: string) => void }) {
    const visible = items.slice(0, 6);
    return (
        <section className="flex flex-col gap-2.5">
            <ZoneLabel>Atividade</ZoneLabel>
            <div className="rounded-2xl px-5 py-4" style={{ background: "var(--vyz-surface-1)", border: "1px solid var(--vyz-border-subtle)" }}>
                {loading ? (
                    <Skeleton rows={4} h={18} />
                ) : visible.length === 0 ? (
                    <EmptyState icon={Clock} title="Sem movimentos" text="Quando chegarem novas mensagens, aparecem aqui." />
                ) : (
                    <ol className="relative pl-3">
                        <span className="absolute left-[3px] top-1.5 bottom-1.5 w-px" style={{ background: "#E9EEF5" }} aria-hidden />
                        {visible.map((it) => {
                            const isOut = it.type === "message_outbound";
                            const clickable = !!it.conversationId;
                            return (
                                <li
                                    key={it.id}
                                    className={`relative flex items-center gap-2.5 py-1.5 ${clickable ? "cursor-pointer group" : ""}`}
                                    onClick={() => { if (it.conversationId) onNavigate(`/inbox?conversationId=${it.conversationId}`); }}
                                >
                                    <span className="absolute -left-3 h-1.5 w-1.5 rounded-full ring-2 ring-white" style={{ background: isOut ? "#10B981" : "#94A3B8", top: "0.7rem" }} />
                                    <p className="flex-1 min-w-0 text-[12px] truncate pl-1.5 transition-colors group-hover:text-[#334155]" style={{ color: "#64748B" }}>
                                        {describeActivity(it)}
                                    </p>
                                    <span className="font-mono text-[10.5px] tabular-nums shrink-0" style={{ color: "#94A3B8" }}>{relativeTime(it.timestamp)}</span>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </section>
    );
}

