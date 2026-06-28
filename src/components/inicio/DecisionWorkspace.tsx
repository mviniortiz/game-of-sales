// ─────────────────────────────────────────────────────────────────────────────
// COMMAND.UI — Decision Workspace da Central de Comando.
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
    CaretUp,
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
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import type {
    DailyPriority,
    EvaHighlight,
    RecentActivityItem,
} from "@/hooks/useCommandCenterData";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Casa com o breakpoint `lg` (1024px) do grid: ≥lg a EVA é rail; <lg vira
// bottom-sheet. Render único (não monta o chat 2x). Inicializa síncrono pra
// não piscar o layout errado no 1º frame.
function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
    );
    useEffect(() => {
        const mql = window.matchMedia("(min-width: 1024px)");
        const onChange = () => setIsDesktop(mql.matches);
        mql.addEventListener("change", onChange);
        onChange();
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return isDesktop;
}

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

const SEV: Record<EvaHighlight["severity"], { label: string; color: string; bg: string }> = {
    high:   { label: "Alta",  color: "#BE123C", bg: "rgba(244,63,94,0.10)" },
    medium: { label: "Média", color: "#B45309", bg: "rgba(245,158,11,0.12)" },
    low:    { label: "Baixa", color: "#475569", bg: "rgba(148,163,184,0.15)" },
};

function resolveHighlightRoute(it: EvaHighlight): { href: string | null; cta: string | null } {
    if (it.type === "missing_information" || it.source === "knowledge_gap") {
        return { href: "/configuracoes/eva?tab=conhecimento", cta: "Completar contexto" };
    }
    if (it.conversationId) return { href: `/inbox?conversationId=${it.conversationId}`, cta: "Abrir conversa" };
    if (it.type === "hot_leads_without_deal" || it.type === "meeting_intent_without_meeting" || it.type === "high_intent_unanswered") {
        return { href: "/inbox", cta: "Abrir Inbox" };
    }
    return { href: null, cta: null };
}

// ── Building blocks ─────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
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

function ActionHero({ item, onNavigate, onResolve, onSnooze, sendReply, replyConnected }: { item: DailyPriority } & QueueHandlers) {
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
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                {/* Esquerda — onde se age. Os botões descem pro fim (mt-auto) pra
                    alinhar com a base do contexto à direita. */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <SeverityBadge priority={item.priority} />
                        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#475569" }}>
                            <TypeIcon size={12} weight="duotone" /> {item.contactName || tp.label}
                        </span>
                    </div>
                    <p className="vz-row-title text-[20px] sm:text-[22px] font-bold leading-snug" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>{item.title}</p>
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
                <div className="sm:w-[188px] shrink-0 flex flex-row flex-wrap sm:flex-col gap-x-7 gap-y-3 sm:border-l sm:pl-5" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
                    {elapsedHrs != null && (
                        <HeroContext label="Parada há" strong={stale}>
                            <span className="tabular-nums" style={stale ? { color: lv.heroBtn } : undefined}>{elapsedHrs}h</span>
                        </HeroContext>
                    )}
                    {item.createdAt && (
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

function ActionQueue({ queue, loading, dayComplete, filterActive, handlers }: { queue: DailyPriority[]; loading: boolean; dayComplete: boolean; filterActive: boolean; handlers: QueueHandlers }) {
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
                            <ActionHero item={queue[0]} {...handlers} />
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

// ── 2) EVA unificada (direita): síntese + gargalos + chat numa voz só ─────────

function ReadingLine({ icon: Icon, color, label, children }: { icon: typeof Warning; color: string; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2.5 py-2">
            <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1A` }}>
                <Icon size={13} weight="duotone" style={{ color }} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase mb-0.5" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>{label}</p>
                <p className="text-[12.5px] leading-snug" style={{ color: "#334155" }}>{children}</p>
            </div>
        </div>
    );
}

// A EVA "fala a próxima frase": quando o risco/recomendação muda (ex: você
// resolveu a ação crítica), o texto antigo desliza pra fora e o novo pra dentro
// (mode="wait"), em vez de trocar seco. Só anima quando o swapKey muda.
function SwapText({ swapKey, children }: { swapKey: string; children: React.ReactNode }) {
    const reduce = useReducedMotion();
    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.span
                key={swapKey}
                className="block"
                initial={reduce ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
                transition={{ duration: reduce ? 0 : CHAIN.evaSwap, ease: "easeOut" }}
            >
                {children}
            </motion.span>
        </AnimatePresence>
    );
}

// "Ver no foco" — a EVA aponta pro herói (zona Foco) em vez de duplicar o card.
// Rola até o herói (#foco-do-dia) e dispara um anel azul que pulsa 1x.
function jumpToFocus() {
    if (typeof document === "undefined") return;
    const el = document.getElementById("foco-do-dia");
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    el.classList.remove("vz-focus-flash");
    void el.offsetWidth; // reinicia a animação
    el.classList.add("vz-focus-flash");
    window.setTimeout(() => el.classList.remove("vz-focus-flash"), 1300);
}

// Síntese da EVA — sinais, não uma 2ª fila. O "Maior risco" NÃO repete o card
// do Foco: vira um ponteiro ("Ver no foco"). Sem "Recomendação do dia" (que só
// repetia o Foco). risk/bottleneck já vêm computados do EvaPanel.
function EvaSynthesis({ risk, bottleneck, repliesSent }: { risk: DailyPriority | null; bottleneck: EvaHighlight | null; repliesSent: number }) {
    return (
        <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
            <ReadingLine icon={Warning} color="#F43F5E" label="Maior risco">
                {risk ? (
                    <SwapText swapKey={risk.id}>
                        <span className="inline">
                            A ação mais crítica já está no seu foco.{" "}
                            <button
                                type="button"
                                onClick={jumpToFocus}
                                className="inline-flex items-center gap-1 font-semibold align-baseline transition-colors hover:underline"
                                style={{ color: "#1D4ED8" }}
                            >
                                Ver no foco <ArrowRight size={11} weight="bold" />
                            </button>
                        </span>
                    </SwapText>
                ) : (
                    <SwapText swapKey="none">Nenhum risco crítico no momento.</SwapText>
                )}
            </ReadingLine>
            <ReadingLine icon={Funnel} color="#F59E0B" label="Maior gargalo">
                {bottleneck ? bottleneck.title : "Sem gargalos relevantes detectados."}
            </ReadingLine>
            <ReadingLine icon={CheckCircle} color="#10B981" label="Sinal positivo">
                {repliesSent > 0 ? `Time enviou ${repliesSent} ${repliesSent === 1 ? "resposta" : "respostas"} recentemente.` : "Operação seguindo o ritmo."}
            </ReadingLine>
        </div>
    );
}

// Gargalos condensados — "o que a EVA está vendo", lista compacta dentro do
// próprio território da EVA (não mais um card gigante separado embaixo).
function EvaBottlenecksSection({ items, onNavigate }: { items: EvaHighlight[]; onNavigate: (href: string) => void }) {
    const top = items.slice(0, 4);
    return (
        <div className="mt-1 pt-3 border-t" style={{ borderColor: "#F1F5F9" }}>
            <p className="px-5 text-[10px] uppercase mb-1" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>O que estou vendo</p>
            {top.length === 0 ? (
                <p className="px-5 pb-1 text-[12px]" style={{ color: "#475569" }}>Sem outros gargalos estruturais hoje.</p>
            ) : (
                top.map((it) => {
                    const sev = SEV[it.severity];
                    const route = resolveHighlightRoute(it);
                    const affects = it.count ?? (it.items?.length ?? 0);
                    const clickable = !!route.href;
                    return (
                        <button
                            key={it.id}
                            type="button"
                            disabled={!clickable}
                            onClick={() => { if (route.href) onNavigate(route.href); }}
                            className={`w-full flex items-start gap-2.5 px-5 py-2 text-left transition-colors ${clickable ? "hover:bg-[#FBFAFF] cursor-pointer" : "cursor-default"}`}
                        >
                            <span className="h-2 w-2 rounded-full mt-[5px] shrink-0" style={{ background: sev.color }} />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    <span className="text-[12.5px] font-semibold truncate" style={{ color: "#0B1220" }}>{it.title}</span>
                                    {affects > 0 && <span className="text-[10.5px] tabular-nums shrink-0" style={{ color: "#475569" }}>· {affects}</span>}
                                </span>
                                <span className="block text-[11px] truncate" style={{ color: "#475569" }}>{it.description}</span>
                            </span>
                            {clickable && <ArrowRight size={12} weight="bold" className="shrink-0 mt-1" style={{ color: "#64748B" }} />}
                        </button>
                    );
                })
            )}
        </div>
    );
}

// ── A EVA unificada: uma voz, um lugar (síntese + gargalos + chat). ───────────
// Copiloto que explica e aponta — não uma 2ª lista de tarefas. Vive no rail
// (300px). Computa risco/gargalo aqui pra alimentar a síntese (ponteiro) e a
// lista "O que estou vendo" SEM repetir o gargalo já mostrado.
function EvaPanel({ priorities, highlights, recentActivity, loading, onNavigate, evaChat, bare = false }: {
    priorities: DailyPriority[];
    highlights: EvaHighlight[];
    recentActivity: RecentActivityItem[];
    loading: boolean;
    onNavigate: (href: string) => void;
    evaChat?: React.ReactNode;
    /** true = dentro do bottom-sheet (mobile): sem o card externo (borda/sombra),
     *  a superfície vem da própria sheet. */
    bare?: boolean;
}) {
    const sevRank: Record<EvaHighlight["severity"], number> = { high: 3, medium: 2, low: 1 };
    const risk = priorities.find((p) => p.priority === "critical") ?? priorities.find((p) => p.priority === "high") ?? priorities[0] ?? null;
    const sortedHl = [...highlights].sort((a, b) => (sevRank[b.severity] - sevRank[a.severity]) || ((b.count ?? 0) - (a.count ?? 0)));
    const bottleneck = sortedHl[0] ?? null;
    const restHighlights = sortedHl.slice(1); // exclui o gargalo já exibido na síntese
    const repliesSent = recentActivity.filter((r) => r.type === "message_outbound").length;
    return (
        <div
            className={bare ? "overflow-hidden" : "rounded-2xl overflow-hidden"}
            style={bare ? undefined : {
                background: "linear-gradient(180deg, rgba(124,58,237,0.05) 0%, #FFFFFF 20%)",
                border: "1px solid #E7E1FA",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}
        >
            <div className="px-5 pt-5 pb-4 flex items-center gap-3">
                <EvaOrb variant="blue" size={28} showVoice={false} state="idle" className="shrink-0" />
                <div className="min-w-0">
                    <h3 className="text-[16px] font-bold leading-tight" style={{ color: "#0B1220", letterSpacing: "-0.015em" }}>EVA</h3>
                    {/* única linha de voz da EVA — serif itálico (humano), o resto é UI font */}
                    <p className="text-[12.5px] italic leading-snug" style={{ color: "#475569", fontFamily: "'Newsreader', Georgia, serif" }}>
                        Li suas conversas, oportunidades e sinais
                    </p>
                </div>
            </div>
            <div className="px-5 pb-1">
                {loading ? <Skeleton rows={3} h={30} /> : <EvaSynthesis risk={risk} bottleneck={bottleneck} repliesSent={repliesSent} />}
            </div>
            {!loading && <EvaBottlenecksSection items={restHighlights} onNavigate={onNavigate} />}
            {evaChat && (
                <div className="px-5 pt-4 pb-5 mt-1 border-t" style={{ borderColor: "#F1F5F9" }}>
                    {evaChat}
                </div>
            )}
        </div>
    );
}

// ── 4) Atividade recente (timeline compacta) ──────────────────────────────────

// Atividade — a zona de MENOR peso: log apagado, texto muted, timestamps mono.
// Sem o card forte (CardShell); container de baixa cromática que não compete com
// Foco/Fila. Inbound vira ponto cinza (azul = ação fica pro que importa).
function ActivityTimeline({ items, loading, onNavigate }: { items: RecentActivityItem[]; loading: boolean; onNavigate: (href: string) => void }) {
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

// ── Composição ────────────────────────────────────────────────────────────────

export interface DecisionWorkspaceProps {
    /** Pendentes do dia (sem resolvidos/adiados, sem filtro de UI). Alimenta a
     *  Leitura da EVA — síntese do que ainda falta, não do recorte filtrado. */
    priorities: DailyPriority[];
    /** Fila de ação já filtrada pela UI. Default = priorities. */
    queuePriorities?: DailyPriority[];
    filterActive?: boolean;
    /** true = havia ações hoje e todas foram resolvidas (missão concluída). */
    dayComplete?: boolean;
    highlights: EvaHighlight[];
    recentActivity: RecentActivityItem[];
    loading: boolean;
    onNavigate: (href: string) => void;
    onResolve: (id: string) => void;
    onSnooze: (id: string) => void;
    sendReply?: (chatJid: string, text: string) => Promise<void>;
    replyConnected?: boolean;
    /** Chat da EVA — renderizado dentro do território unificado da EVA (direita). */
    evaChat?: React.ReactNode;
    /** Barra-missão do dia (DayProgress). Topo da coluna principal, sem rótulo. */
    dayProgress?: React.ReactNode;
    /** Faixa de KPIs (KpiStrip) — a zona Pulso, no topo da coluna principal. */
    pulse?: React.ReactNode;
}

export function DecisionWorkspace({
    priorities,
    queuePriorities,
    filterActive = false,
    dayComplete = false,
    highlights,
    recentActivity,
    loading,
    onNavigate,
    onResolve,
    onSnooze,
    sendReply,
    replyConnected,
    evaChat,
    dayProgress,
    pulse,
}: DecisionWorkspaceProps) {
    const queue = queuePriorities ?? priorities;
    const handlers: QueueHandlers = { onNavigate, onResolve, onSnooze, sendReply, replyConnected };
    const isDesktop = useIsDesktop();
    const hasCriticalRisk = priorities.some((p) => p.priority === "critical");
    return (
        // Coluna principal (1fr) + rail da EVA (300px) no desktop. A ordem de
        // leitura desce: Pulso → Foco → Fila → Atividade. No mobile (<lg) a EVA
        // sai do fluxo e vira bottom-sheet (botão fixo no rodapé) — render único,
        // pra não montar o chat 2x.
        <>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
                <div className="flex flex-col gap-5 min-w-0">
                    {dayProgress}
                    {pulse && (
                        <section className="flex flex-col gap-2.5">
                            <ZoneLabel>Pulso</ZoneLabel>
                            {pulse}
                        </section>
                    )}
                    <ActionQueue queue={queue} loading={loading} dayComplete={dayComplete} filterActive={filterActive} handlers={handlers} />
                    <ActivityTimeline items={recentActivity} loading={loading} onNavigate={onNavigate} />
                </div>
                {/* Desktop: rail da EVA — síntese (ponteiros) + gargalos + chat. */}
                {isDesktop && (
                    <aside>
                        <EvaPanel
                            priorities={priorities}
                            highlights={highlights}
                            recentActivity={recentActivity}
                            loading={loading}
                            onNavigate={onNavigate}
                            evaChat={evaChat}
                        />
                    </aside>
                )}
            </div>

            {/* Mobile: a EVA vira bottom-sheet. Botão fixo no rodapé abre a sheet
                com a mesma leitura + gargalos + chat (padrão do Inbox). */}
            {!isDesktop && (
                <Drawer>
                    <DrawerTrigger asChild>
                        <button
                            type="button"
                            className="fixed bottom-4 inset-x-4 z-40 flex items-center justify-center gap-2.5 h-12 rounded-full transition-transform active:scale-[0.98]"
                            style={{ background: "#FFFFFF", border: "1px solid #E7E1FA", boxShadow: "0 10px 28px -8px rgba(15,23,42,0.28)" }}
                            aria-label="Abrir leitura da EVA"
                        >
                            <EvaOrb variant="blue" size={24} showVoice={false} state="idle" className="shrink-0" />
                            <span className="text-[14px] font-semibold" style={{ color: "#0B1220" }}>Perguntar à EVA</span>
                            {hasCriticalRisk && <span className="h-2 w-2 rounded-full" style={{ background: "#F43F5E" }} aria-hidden />}
                            <CaretUp size={14} weight="bold" style={{ color: "#94A3B8" }} />
                        </button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[90vh] bg-white">
                        <DrawerTitle className="sr-only">Leitura da EVA</DrawerTitle>
                        <div className="overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                            <EvaPanel
                                priorities={priorities}
                                highlights={highlights}
                                recentActivity={recentActivity}
                                loading={loading}
                                onNavigate={onNavigate}
                                evaChat={evaChat}
                                bare
                            />
                        </div>
                    </DrawerContent>
                </Drawer>
            )}
        </>
    );
}
