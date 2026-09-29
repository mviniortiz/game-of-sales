// ─────────────────────────────────────────────────────────────────────────────
// Peças do Início (/inicio) que não são a fila: a linha do tempo de atividade
// recente (ActivityTimeline) e o estilo de card dos blocos do cockpit
// (CARD_STYLE). A fila "Agora" mora em AgoraQueue.tsx.
//
// Só dados reais: cada linha vem de uma mensagem de canal (useCommandCenterData).
// ─────────────────────────────────────────────────────────────────────────────
import { Clock } from "@phosphor-icons/react";
import type { RecentActivityItem } from "@/hooks/useCommandCenterData";

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

export const CARD_STYLE: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E4E9F2",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
};

function EmptyState({ icon: Icon, title, text }: { icon: typeof Clock; title: string; text: string }) {
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
