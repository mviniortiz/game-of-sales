// EVA.STUDIO.8A — Aba Memória: "com base em que a EVA orienta as sugestões?"
// Só leitura.
//
// EVA.STUDIO.JOURNEY: separado em EvaMemoryView (presentational, dados via
// props — entra na jornada/preview) e EvaMemoryTab (wrapper com useEvaMemory,
// uso do Studio real). Mesmo visual nos dois.
import { BookOpen, ShieldCheck, AlertTriangle, Share2, Clock, Database, MessageCircle, GitBranch, Tag as TagIcon, Layers, Loader2 } from "lucide-react";
import { useEvaMemory, type EvaMemory } from "@/hooks/useEvaMemory";
import { INK, SUB, MUTE, HAIR, PURPLE, GREEN, AMBER, cardSoft, cardFlat } from "./tokens";

const SOURCES = [
    { icon: Database, name: "CRM" },
    { icon: MessageCircle, name: "WhatsApp" },
    { icon: BookOpen, name: "Base de conhecimento" },
    { icon: ShieldCheck, name: "Playbooks" },
    { icon: GitBranch, name: "Pipeline" },
    { icon: TagIcon, name: "Tags" },
];

function fmt(iso: string | null): string {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
}

export function EvaMemoryView({ memory, loading }: { memory: EvaMemory | null; loading: boolean }) {
    if (loading) {
        return (
            <div className="rounded-2xl p-10 flex items-center justify-center" style={cardSoft}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: PURPLE }} />
            </div>
        );
    }

    const summary = [
        { k: "Playbooks ativos", v: memory?.playbooksCount ?? 0 },
        { k: "Regras do EVA Studio", v: memory?.evaStudioCount ?? 0 },
        { k: "Lacunas abertas", v: memory?.gapsOpenCount ?? 0 },
        { k: "Fontes conectadas", v: SOURCES.length },
    ];

    const empty = !loading && memory && memory.rules.length === 0 && memory.gaps.length === 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {summary.map((s) => (
                    <div key={s.k} className="rounded-2xl p-4" style={cardFlat}>
                        <p className="text-[26px] font-bold tabular-nums leading-none" style={{ color: INK, letterSpacing: "-0.02em" }}>{s.v}</p>
                        <p className="text-[11px] mt-2" style={{ color: MUTE }}>{s.k}</p>
                    </div>
                ))}
            </div>
            <p className="text-[12px] flex items-center gap-1.5" style={{ color: MUTE }}>
                <Clock className="w-3.5 h-3.5" /> Última atualização da memória: {fmt(memory?.updatedAt ?? null)}
            </p>

            {empty && (
                <div className="rounded-2xl p-8 text-center" style={cardSoft}>
                    <Layers className="w-7 h-7 mx-auto mb-2" style={{ color: PURPLE }} />
                    <p className="text-[13px] font-medium" style={{ color: INK }}>A memória da EVA ainda está vazia</p>
                    <p className="text-[12px] mt-1" style={{ color: SUB }}>Adicione regras, playbooks ou lacunas para fortalecer a memória da EVA.</p>
                </div>
            )}

            {!empty && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    <div className="space-y-6 min-w-0">
                        {/* Regras ativas */}
                        <div className="rounded-2xl p-6" style={cardSoft}>
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldCheck className="w-4 h-4" style={{ color: PURPLE }} />
                                <h2 className="text-[14px] font-semibold" style={{ color: INK }}>Regras ativas</h2>
                            </div>
                            {memory && memory.rules.length > 0 ? (
                                <div className="space-y-2.5">
                                    {memory.rules.map((r, i) => (
                                        <div key={i} className="flex items-start justify-between gap-3 rounded-xl px-3.5 py-2.5" style={{ background: "#F8FAFC", border: "1px solid #EEF2F7" }}>
                                            <span className="text-[12.5px] flex-1" style={{ color: INK }}>{r.text}</span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={r.origin === "EVA Studio" ? { background: "#F5F3FF", color: "#6D28D9" } : { background: "#F1F5F9", color: SUB }}>{r.origin}</span>
                                                <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: GREEN }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} /> ativa</span>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-[10.5px] pt-1" style={{ color: MUTE }}>Impacta: sugestões da EVA no Inbox e no Deal.</p>
                                </div>
                            ) : (
                                <p className="text-[12px]" style={{ color: SUB }}>Nenhuma regra ativa ainda. Aplique regras pelo EVA Studio.</p>
                            )}
                        </div>

                        {/* Lacunas */}
                        <div className="rounded-2xl p-6" style={cardSoft}>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-4 h-4" style={{ color: AMBER }} />
                                <h2 className="text-[14px] font-semibold" style={{ color: INK }}>Lacunas de conhecimento</h2>
                            </div>
                            {memory && memory.gaps.length > 0 ? (
                                <div className="space-y-2">
                                    {memory.gaps.map((g, i) => (
                                        <div key={i} className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5" style={{ background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.18)" }}>
                                            <span className="text-[12.5px] flex-1" style={{ color: "#92660A" }}>{g}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "#FFFFFF", border: `1px solid ${HAIR}`, color: AMBER }}>aberta</span>
                                        </div>
                                    ))}
                                    <p className="text-[10.5px] pt-1" style={{ color: MUTE }}>Recomendação: completar antes de aprovar o agente.</p>
                                </div>
                            ) : (
                                <p className="text-[12px]" style={{ color: SUB }}>Nenhuma lacuna aberta. 👍</p>
                            )}
                        </div>
                    </div>

                    {/* Fontes de contexto */}
                    <aside>
                        <p className="text-[11px] font-semibold uppercase px-1 mb-2" style={{ color: MUTE, letterSpacing: "0.06em" }}>Fontes de contexto</p>
                        <div className="rounded-2xl px-4 py-1 divide-y" style={{ ...cardFlat, borderColor: HAIR }}>
                            {SOURCES.map((s) => (
                                <div key={s.name} className="flex items-center gap-2.5 py-2.5">
                                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.08)" }}>
                                        <s.icon className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                                    </span>
                                    <span className="text-[12.5px] flex-1" style={{ color: INK }}>{s.name}</span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: GREEN }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} /> Ativo</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10.5px] mt-2 px-1 flex items-center gap-1" style={{ color: MUTE }}><Share2 className="w-3 h-3" /> Fontes alimentam o contexto da EVA.</p>
                    </aside>
                </div>
            )}
        </div>
    );
}

export function EvaMemoryTab() {
    const { memory, loading } = useEvaMemory();
    return <EvaMemoryView memory={memory} loading={loading} />;
}

export default EvaMemoryTab;
