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
import {
    ArrowRight,
    ArrowUp,
    CalendarBlank as Calendar,
    ChatCircle as MessageCircle,
    CheckCircle,
    Clock,
    Funnel,
    Sparkle as Sparkles,
    Target,
    Warning,
} from "@phosphor-icons/react";
import type {
    DailyPriority,
    EvaHighlight,
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
const LEVEL: Record<DailyPriority["priority"], { label: string; color: string; chipBg: string; soft: string; border: string }> = {
    critical: { label: "Crítico", color: "#BE123C", chipBg: "rgba(244,63,94,0.10)",   soft: "#FFF6F7", border: "rgba(244,63,94,0.28)" },
    high:     { label: "Alto",    color: "#B45309", chipBg: "rgba(245,158,11,0.12)",  soft: "#FFFBF2", border: "rgba(245,158,11,0.30)" },
    medium:   { label: "Médio",   color: "#1D4ED8", chipBg: "rgba(37,99,235,0.10)",   soft: "#F6F9FF", border: "rgba(37,99,235,0.22)" },
    low:      { label: "Baixo",   color: "#64748B", chipBg: "rgba(148,163,184,0.15)", soft: "#FFFFFF", border: "#E2E8F0" },
};

const TYPE_META: Record<DailyPriority["source"], { icon: typeof MessageCircle; label: string }> = {
    conversation: { icon: MessageCircle, label: "Conversa" },
    deal:         { icon: Target,        label: "Oportunidade" },
    eva:          { icon: Sparkles,      label: "Insight da EVA" },
    calendar:     { icon: Calendar,      label: "Agenda" },
};

const SEV: Record<EvaHighlight["severity"], { label: string; color: string; bg: string }> = {
    high:   { label: "Alta",  color: "#BE123C", bg: "rgba(244,63,94,0.10)" },
    medium: { label: "Média", color: "#B45309", bg: "rgba(245,158,11,0.12)" },
    low:    { label: "Baixa", color: "#64748B", bg: "rgba(148,163,184,0.15)" },
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

function CardShell({ title, subtitle, badge, children }: { title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl" style={CARD_STYLE}>
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b" style={{ borderColor: "#F1F5F9" }}>
                <div className="flex items-center gap-2">
                    {badge}
                    <h3 className="text-[15px] font-bold" style={{ color: "#0B1220", letterSpacing: "-0.012em" }}>{title}</h3>
                </div>
                {subtitle && <p className="text-[12px] mt-0.5" style={{ color: "#64748B" }}>{subtitle}</p>}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </div>
    );
}

function EvaBadge() {
    return (
        <span className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 leading-none" style={{ background: "#7C3AED" }}>
            E
        </span>
    );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Target; title: string; text: string }) {
    return (
        <div className="flex flex-col items-center text-center py-7 px-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2.5" style={{ background: "rgba(148,163,184,0.12)" }}>
                <Icon size={20} weight="duotone" style={{ color: "#64748B" }} />
            </div>
            <p className="text-[13px] font-semibold mb-0.5" style={{ color: "#0B1220" }}>{title}</p>
            <p className="text-[11.5px]" style={{ color: "#64748B", maxWidth: 260, lineHeight: 1.5 }}>{text}</p>
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

// ── 1) Fila de ação ───────────────────────────────────────────────────────────

function ActionHero({ item, rank, onNavigate }: { item: DailyPriority; rank: number; onNavigate: (href: string) => void }) {
    const lv = LEVEL[item.priority];
    const tp = TYPE_META[item.source];
    const TypeIcon = tp.icon;
    return (
        <div className="rounded-xl p-4 sm:p-5 flex flex-col" style={{ background: lv.soft, border: `1px solid ${lv.border}`, boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center justify-center h-6 min-w-[26px] px-1.5 rounded-md text-[12px] font-bold tabular-nums text-white" style={{ background: "#0B1220" }}>
                    #{rank}
                </span>
                <span className="inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: lv.chipBg, color: lv.color, letterSpacing: "0.05em" }}>
                    {lv.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#64748B" }}>
                    <TypeIcon size={12} weight="duotone" /> {tp.label}
                </span>
                {item.contactName && <span className="text-[11px] truncate" style={{ color: "#94A3B8" }}>· {item.contactName}</span>}
                {item.createdAt && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] tabular-nums" style={{ color: "#94A3B8" }}>
                        <Clock size={11} weight="duotone" /> {relativeTime(item.createdAt)}
                    </span>
                )}
            </div>
            <p className="text-[16px] sm:text-[17px] font-bold leading-snug" style={{ color: "#0B1220", letterSpacing: "-0.015em" }}>{item.title}</p>
            <p className="text-[12.5px] mt-1" style={{ color: "#475569", lineHeight: 1.5 }}>{item.description}</p>
            <p className="text-[11.5px] mt-1.5" style={{ color: "#94A3B8" }}>
                <span style={{ fontWeight: 600 }}>Por que:</span> {item.reason}
            </p>
            {item.href && (
                <div className="mt-3.5 pt-3.5 border-t flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "#F1F5F9" }}>
                    <span className="text-[11.5px]" style={{ color: "#64748B" }}>Próxima ação</span>
                    <button
                        type="button"
                        onClick={() => onNavigate(item.href!)}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-110"
                        style={{ background: "#2563EB", boxShadow: "0 6px 14px -6px rgba(37,99,235,0.45)" }}
                    >
                        {item.actionLabel}
                        <ArrowRight size={12} weight="bold" />
                    </button>
                </div>
            )}
        </div>
    );
}

function ActionItem({ item, rank, onNavigate }: { item: DailyPriority; rank: number; onNavigate: (href: string) => void }) {
    const lv = LEVEL[item.priority];
    const tp = TYPE_META[item.source];
    const TypeIcon = tp.icon;
    const clickable = !!item.href;
    return (
        <div
            className={`rounded-xl p-3.5 flex items-start gap-3 transition-colors ${clickable ? "cursor-pointer hover:bg-[#F8FAFC]" : ""}`}
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
            onClick={() => { if (item.href) onNavigate(item.href); }}
        >
            <span className="text-[12px] font-bold tabular-nums shrink-0 pt-0.5 w-6 text-center" style={{ color: "#CBD5E1" }}>#{rank}</span>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: lv.chipBg }}>
                <TypeIcon size={15} weight="duotone" style={{ color: lv.color }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13.5px] font-semibold truncate" style={{ color: "#0B1220" }}>{item.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: lv.chipBg, color: lv.color, fontWeight: 700, letterSpacing: "0.04em" }}>
                        {lv.label.toUpperCase()}
                    </span>
                </div>
                <p className="text-[11.5px] truncate" style={{ color: "#64748B" }}>{item.reason}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                {item.createdAt && <span className="text-[10.5px] tabular-nums" style={{ color: "#94A3B8" }}>{relativeTime(item.createdAt)}</span>}
                {clickable && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#2563EB" }}>
                        {item.actionLabel}
                        <ArrowRight size={11} weight="bold" />
                    </span>
                )}
            </div>
        </div>
    );
}

function ActionQueue({ priorities, loading, onNavigate }: { priorities: DailyPriority[]; loading: boolean; onNavigate: (href: string) => void }) {
    const subtitle = loading
        ? "Carregando…"
        : priorities.length === 0
            ? "Sem ações críticas agora."
            : `${priorities.length} ${priorities.length === 1 ? "ação na fila" : "ações na fila"} · ordenadas por prioridade`;
    return (
        <CardShell title="Fila de ação" subtitle={subtitle}>
            {loading ? (
                <Skeleton rows={3} h={72} />
            ) : priorities.length === 0 ? (
                <EmptyState icon={Target} title="Tudo em dia" text="Nada crítico agora. Continuo de olho nas conversas e te aviso quando surgir uma ação urgente." />
            ) : (
                <div className="flex flex-col gap-3">
                    <ActionHero item={priorities[0]} rank={1} onNavigate={onNavigate} />
                    {priorities.slice(1).map((p, i) => (
                        <ActionItem key={p.id} item={p} rank={i + 2} onNavigate={onNavigate} />
                    ))}
                </div>
            )}
        </CardShell>
    );
}

// ── 2) Leitura da EVA (sidebar editorial) ─────────────────────────────────────

function ReadingLine({ icon: Icon, color, label, children }: { icon: typeof Warning; color: string; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2.5 py-2.5">
            <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1A` }}>
                <Icon size={13} weight="duotone" style={{ color }} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase mb-0.5" style={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.06em" }}>{label}</p>
                <p className="text-[12.5px] leading-snug" style={{ color: "#334155" }}>{children}</p>
            </div>
        </div>
    );
}

function EvaReading({ priorities, highlights, recentActivity, loading }: { priorities: DailyPriority[]; highlights: EvaHighlight[]; recentActivity: RecentActivityItem[]; loading: boolean }) {
    const risk = priorities.find((p) => p.priority === "critical") ?? priorities.find((p) => p.priority === "high") ?? priorities[0] ?? null;
    const sevRank: Record<EvaHighlight["severity"], number> = { high: 3, medium: 2, low: 1 };
    const bottleneck = [...highlights].sort((a, b) => (sevRank[b.severity] - sevRank[a.severity]) || ((b.count ?? 0) - (a.count ?? 0)))[0] ?? null;
    const repliesSent = recentActivity.filter((r) => r.type === "message_outbound").length;
    const recommendation = risk
        ? <>Comece por <strong style={{ color: "#0B1220" }}>{risk.title}</strong>.</>
        : bottleneck
            ? <>Complete o contexto sobre <strong style={{ color: "#0B1220" }}>{bottleneck.title.toLowerCase()}</strong>.</>
            : <>Acompanhe as novas conversas do dia.</>;

    return (
        <CardShell title="Leitura da EVA" subtitle="Síntese estratégica do dia" badge={<EvaBadge />}>
            {loading ? (
                <Skeleton rows={4} h={36} />
            ) : (
                <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                    <ReadingLine icon={Warning} color="#F43F5E" label="Maior risco">
                        {risk ? risk.title : "Nenhum risco crítico no momento."}
                    </ReadingLine>
                    <ReadingLine icon={Funnel} color="#F59E0B" label="Maior gargalo">
                        {bottleneck ? bottleneck.title : "Sem gargalos relevantes detectados."}
                    </ReadingLine>
                    <ReadingLine icon={CheckCircle} color="#10B981" label="Sinal positivo">
                        {repliesSent > 0 ? `Time enviou ${repliesSent} ${repliesSent === 1 ? "resposta" : "respostas"} recentemente.` : "Operação seguindo o ritmo."}
                    </ReadingLine>
                    <ReadingLine icon={ArrowUp} color="#7C3AED" label="Recomendação do dia">
                        {recommendation}
                    </ReadingLine>
                </div>
            )}
        </CardShell>
    );
}

// ── 3) Gargalos e lacunas de contexto ─────────────────────────────────────────

function BottleneckCard({ item, onNavigate }: { item: EvaHighlight; onNavigate: (href: string) => void }) {
    const sev = SEV[item.severity];
    const route = resolveHighlightRoute(item);
    const affects = item.count ?? (item.items?.length ?? 0);
    const clickable = !!route.href;
    return (
        <div
            className={`rounded-xl p-4 flex flex-col transition-colors ${clickable ? "cursor-pointer hover:bg-[#FBFAFF]" : ""}`}
            style={{ background: "#FFFFFF", border: "1px solid #ECE6FB" }}
            onClick={() => { if (route.href) onNavigate(route.href); }}
        >
            <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.10)" }}>
                    <Sparkles size={14} weight="duotone" style={{ color: "#6D28D9" }} />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: sev.bg, color: sev.color, fontWeight: 700, letterSpacing: "0.04em" }}>
                    <span className="h-1 w-1 rounded-full" style={{ background: sev.color }} /> {sev.label}
                </span>
                {affects > 0 && (
                    <span className="ml-auto text-[10.5px] tabular-nums" style={{ color: "#94A3B8" }}>
                        afeta {affects} {affects === 1 ? "conversa" : "conversas"}
                    </span>
                )}
            </div>
            <p className="text-[13.5px] font-semibold" style={{ color: "#0B1220", letterSpacing: "-0.01em" }}>{item.title}</p>
            <p className="text-[12px] mt-0.5 flex-1" style={{ color: "#64748B", lineHeight: 1.5 }}>{item.description}</p>
            {route.cta && (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold mt-2.5 self-start" style={{ color: "#6D28D9" }}>
                    {route.cta}
                    <ArrowRight size={12} weight="bold" />
                </span>
            )}
        </div>
    );
}

function Bottlenecks({ items, loading, onNavigate }: { items: EvaHighlight[]; loading: boolean; onNavigate: (href: string) => void }) {
    const subtitle = loading
        ? "Carregando…"
        : items.length === 0
            ? "Sem gargalos estruturais hoje."
            : `${items.length} ${items.length === 1 ? "tema" : "temas"} que a EVA identificou na operação`;
    return (
        <CardShell title="Gargalos e lacunas de contexto" subtitle={subtitle} badge={<EvaBadge />}>
            {loading ? (
                <Skeleton rows={2} h={96} />
            ) : items.length === 0 ? (
                <EmptyState icon={Sparkles} title="Sem gargalos por enquanto" text="Quando a EVA acumular sinais sobre ICP, serviços, preço ou captação, os temas aparecem aqui." />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((it) => <BottleneckCard key={it.id} item={it} onNavigate={onNavigate} />)}
                </div>
            )}
        </CardShell>
    );
}

// ── 4) Atividade recente (timeline compacta) ──────────────────────────────────

function ActivityTimeline({ items, loading, onNavigate }: { items: RecentActivityItem[]; loading: boolean; onNavigate: (href: string) => void }) {
    const visible = items.slice(0, 6);
    return (
        <CardShell title="Atividade recente" subtitle={loading ? "Carregando…" : "Conversas e respostas"}>
            {loading ? (
                <Skeleton rows={4} h={20} />
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
                                <span className="absolute -left-3 h-1.5 w-1.5 rounded-full ring-2 ring-white" style={{ background: isOut ? "#10B981" : "#2563EB", top: "0.7rem" }} />
                                <p className="flex-1 min-w-0 text-[12px] truncate pl-1.5" style={{ color: "#475569" }}>
                                    {describeActivity(it)}
                                </p>
                                <span className="text-[10.5px] tabular-nums shrink-0" style={{ color: "#94A3B8" }}>{relativeTime(it.timestamp)}</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </CardShell>
    );
}

// ── Composição ────────────────────────────────────────────────────────────────

export interface DecisionWorkspaceProps {
    priorities: DailyPriority[];
    highlights: EvaHighlight[];
    recentActivity: RecentActivityItem[];
    loading: boolean;
    onNavigate: (href: string) => void;
}

export function DecisionWorkspace({ priorities, highlights, recentActivity, loading, onNavigate }: DecisionWorkspaceProps) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8">
                    <ActionQueue priorities={priorities} loading={loading} onNavigate={onNavigate} />
                </div>
                <aside className="lg:col-span-4 flex flex-col gap-5">
                    <EvaReading priorities={priorities} highlights={highlights} recentActivity={recentActivity} loading={loading} />
                    <ActivityTimeline items={recentActivity} loading={loading} onNavigate={onNavigate} />
                </aside>
            </div>
            <Bottlenecks items={highlights} loading={loading} onNavigate={onNavigate} />
        </div>
    );
}
