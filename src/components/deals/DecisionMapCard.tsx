// ─────────────────────────────────────────────────────────────────────────────
// Mapa de decisão — quem influencia a compra, editável em qualquer deal.
//
// Princípios (NÃO violar):
//   - Dados MANUAIS em deals.source_data.mapa_decisao. Sem busca externa,
//     sem scraping de Google/LinkedIn, sem enriquecimento automático.
//   - "Detalhe da pessoa" usa SÓ dados internos (conversas + notas do deal).
//   - EVA SUGERE a partir da conversa; o time aprova antes de adicionar.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, MessageSquare, StickyNote } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ── Tipos / leitura ─────────────────────────────────────────────────────────

export interface DecisionPerson {
    nome: string;
    relacao?: string;
    papel?: string;
    origem?: string;
}

export function getDecisionMap(sourceData: unknown): DecisionPerson[] {
    if (!sourceData || typeof sourceData !== "object") return [];
    const md = (sourceData as Record<string, unknown>).mapa_decisao;
    return Array.isArray(md) ? (md as DecisionPerson[]) : [];
}

const ROLE_OPTIONS = ["Lead principal", "Decisor financeiro", "Influenciador", "Apoia entrada", "Apoio financeiro"];

const ROLE_CHIP: Record<string, string> = {
    "Lead principal": "bg-[#1556C0]/10 text-[#1556C0]",
    "Decisor financeiro": "bg-[#7C3AED]/10 text-[#7C3AED]",
    "Influenciador": "bg-amber-100 text-amber-700",
    "Apoia entrada": "bg-[#10B981]/10 text-[#0F8A63]",
    "Apoio financeiro": "bg-[#10B981]/10 text-[#0F8A63]",
};

const ROLE_AVATAR: Record<string, string> = {
    "Lead principal": "bg-[#1556C0]",
    "Decisor financeiro": "bg-[#7C3AED]",
    "Influenciador": "bg-amber-500",
    "Apoia entrada": "bg-[#10B981]",
    "Apoio financeiro": "bg-[#10B981]",
};

const initials = (n: string) => {
    const parts = (n || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── Itens internos (mensagens + notas) usados em menções e sugestões ──────────

interface ContextItem {
    body: string;
    ts: string;
    kind: "msg" | "note";
    direction?: string;
}

function snippet(text: string, idx: number) {
    const start = Math.max(0, idx - 28);
    const end = Math.min(text.length, start + 92);
    const core = text.slice(start, end).trim();
    return (start > 0 ? "…" : "") + core + (end < text.length ? "…" : "");
}

// EVA: heurística de menções a quem decide. Por relação (o lead raramente cita
// o nome), pra o humano completar. Nunca grava sozinha.
const RELATION_PATTERNS: { re: RegExp; relacao: string; papel: string }[] = [
    { re: /\b(minha esposa|minha mulher|meu marido|meu esposo|c[ôo]njuge)\b/i, relacao: "Cônjuge", papel: "Decisor financeiro" },
    { re: /\b(minha m[ãa]e|meu pai|meus pais|minha sogra|meu sogro|meus sogros)\b/i, relacao: "Família", papel: "Apoia entrada" },
    { re: /\b(meu s[óo]cio|minha s[óo]cia|meus s[óo]cios)\b/i, relacao: "Sócio", papel: "Decisor financeiro" },
    { re: /\b(quem decide|preciso falar com|vou (?:conversar|alinhar) com|preciso ver com)\b/i, relacao: "", papel: "Influenciador" },
];

interface DecisionSuggestion {
    relacao: string;
    papel: string;
    trecho: string;
}

function detectSuggestions(items: ContextItem[], people: DecisionPerson[]): DecisionSuggestion[] {
    const existingRel = new Set(people.map((p) => (p.relacao || "").toLowerCase()).filter(Boolean));
    const found = new Map<string, DecisionSuggestion>();
    for (const it of items) {
        const text = (it.body || "").trim();
        if (!text) continue;
        for (const pat of RELATION_PATTERNS) {
            const m = pat.re.exec(text);
            if (!m) continue;
            if (pat.relacao && existingRel.has(pat.relacao.toLowerCase())) continue;
            const key = pat.relacao || "__generico";
            if (!found.has(key)) {
                found.set(key, { relacao: pat.relacao, papel: pat.papel, trecho: snippet(text, m.index) });
            }
        }
    }
    return Array.from(found.values()).slice(0, 2);
}

function findMentions(person: DecisionPerson, items: ContextItem[]) {
    const first = (person.nome || "").trim().split(/\s+/)[0]?.toLowerCase() || "";
    if (first.length < 3) return [];
    return items
        .filter((it) => (it.body || "").toLowerCase().includes(first))
        .map((it) => ({ ...it, trecho: snippet(it.body, it.body.toLowerCase().indexOf(first)) }));
}

const fmtDate = (ts: string) => {
    try {
        return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
        return "";
    }
};

// ── Nós do flowchart ──────────────────────────────────────────────────────────

const DecisionNode = ({ p, root = false, onClick }: { p: DecisionPerson; root?: boolean; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="flex items-start gap-2.5 w-full text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-slate-50 transition-colors"
    >
        <span className={`flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${root ? "h-8 w-8 text-[11px]" : "h-7 w-7 text-[10px]"} ${(p.papel && ROLE_AVATAR[p.papel]) || "bg-slate-400"}`}>
            {initials(p.nome)}
        </span>
        <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[12.5px] font-semibold text-[#0B1220]">{p.nome}</span>
                {p.papel && (
                    <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold ${ROLE_CHIP[p.papel] ?? "bg-slate-100 text-slate-600"}`}>
                        {p.papel}
                    </span>
                )}
            </div>
            {(p.relacao || p.origem) && (
                <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">{[p.relacao, p.origem].filter(Boolean).join(" · ")}</p>
            )}
        </div>
    </button>
);

// Flowchart vertical: lead principal (raiz) -> influenciadores ramificados.
const DecisionFlow = ({ people, onSelect }: { people: DecisionPerson[]; onSelect: (i: number) => void }) => {
    const root = people.find((p) => p.papel === "Lead principal") ?? people[0];
    const rootIdx = people.indexOf(root);
    const branches = people.map((p, i) => ({ p, i })).filter(({ i }) => i !== rootIdx);
    return (
        <div>
            <DecisionNode p={root} root onClick={() => onSelect(rootIdx)} />
            {branches.length > 0 && (
                <div className="relative ml-4 mt-1 pl-5 border-l-2 border-dashed border-[#E5E7EB] space-y-3 pt-2">
                    {branches.map(({ p, i }) => (
                        <div key={i} className="relative">
                            <span className="absolute -left-5 top-3.5 w-4 border-t-2 border-dashed border-[#E5E7EB]" aria-hidden />
                            <DecisionNode p={p} onClick={() => onSelect(i)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Card principal ────────────────────────────────────────────────────────────

export function DecisionMapCard({ dealId, sourceData }: { dealId: string; sourceData: unknown }) {
    const qc = useQueryClient();
    const people = getDecisionMap(sourceData);

    const { data: items = [] } = useQuery<ContextItem[]>({
        queryKey: ["deal-decision-context", dealId],
        queryFn: async () => {
            const out: ContextItem[] = [];
            const { data: conv } = await supabase
                .from("channel_conversations")
                .select("id")
                .eq("deal_id", dealId)
                .order("last_message_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (conv?.id) {
                const { data: msgs } = await supabase
                    .from("channel_messages")
                    .select("direction, body, message_timestamp")
                    .eq("conversation_id", conv.id)
                    .order("message_timestamp", { ascending: true });
                for (const m of msgs || []) {
                    if (m.body) out.push({ body: m.body, ts: m.message_timestamp, kind: "msg", direction: m.direction });
                }
            }
            const { data: notes } = await supabase
                .from("deal_notes" as any)
                .select("content, created_at")
                .eq("deal_id", dealId)
                .order("created_at", { ascending: true });
            for (const n of (notes as any[]) || []) {
                if (n.content) out.push({ body: n.content, ts: n.created_at, kind: "note" });
            }
            return out;
        },
        enabled: !!dealId,
    });

    const suggestions = useMemo(() => detectSuggestions(items, people), [items, people]);

    const save = useMutation({
        mutationFn: async (next: DecisionPerson[]) => {
            const prev = sourceData && typeof sourceData === "object" ? (sourceData as Record<string, unknown>) : {};
            const { error } = await supabase.from("deals").update({ source_data: { ...prev, mapa_decisao: next } }).eq("id", dealId);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["deal", dealId] }),
        onError: () => toast.error("Não foi possível salvar o mapa de decisão"),
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [form, setForm] = useState<DecisionPerson>({ nome: "" });
    const [detailIndex, setDetailIndex] = useState<number | null>(null);

    const openAdd = (preset?: Partial<DecisionPerson>) => {
        setEditIndex(null);
        setForm({ nome: "", ...preset });
        setFormOpen(true);
    };
    const openEdit = (i: number) => {
        setEditIndex(i);
        setForm({ ...people[i] });
        setFormOpen(true);
    };

    const submit = () => {
        const nome = form.nome.trim();
        if (!nome) {
            toast.error("Informe o nome da pessoa");
            return;
        }
        const clean: DecisionPerson = {
            nome,
            relacao: form.relacao?.trim() || undefined,
            papel: form.papel || undefined,
            origem: form.origem?.trim() || undefined,
        };
        const next = [...people];
        if (editIndex === null) next.push(clean);
        else next[editIndex] = clean;
        save.mutate(next, {
            onSuccess: () => {
                setFormOpen(false);
                toast.success(editIndex === null ? "Pessoa adicionada ao mapa" : "Pessoa atualizada");
            },
        });
    };

    const remove = (i: number) => {
        const next = people.filter((_, idx) => idx !== i);
        save.mutate(next, {
            onSuccess: () => {
                setDetailIndex(null);
                setFormOpen(false);
                toast.success("Pessoa removida do mapa");
            },
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <p className="text-[13px] font-semibold text-[#0B1220]">Mapa de decisão</p>
                </div>
                {people.length > 0 && (
                    <button
                        type="button"
                        onClick={() => openAdd()}
                        title="Adicionar pessoa"
                        className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#1556C0] transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Pessoas mencionadas ou envolvidas na compra.</p>

            {/* Sugestões da EVA — assistida, time aprova */}
            {suggestions.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    {suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-[#7C3AED]/5 border border-[#7C3AED]/15 px-2.5 py-2">
                            <span className="text-[9px] font-bold text-white bg-[#7C3AED] rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-px leading-none">E</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-[#0B1220] leading-snug">
                                    {s.relacao
                                        ? <>A EVA notou menção a <strong className="font-semibold">{s.relacao.toLowerCase()}</strong> na conversa.</>
                                        : <>A EVA notou alguém que pode influenciar a decisão.</>}
                                </p>
                                <p className="text-[10px] text-slate-400 italic leading-snug mt-0.5 truncate">"{s.trecho}"</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openAdd({ relacao: s.relacao || undefined, papel: s.papel, origem: "Mencionado na conversa" })}
                                className="shrink-0 text-[10.5px] font-semibold text-[#7C3AED] hover:underline mt-px"
                            >
                                Adicionar
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Flowchart ou estado vazio */}
            {people.length > 0 ? (
                <DecisionFlow people={people} onSelect={setDetailIndex} />
            ) : (
                <button
                    type="button"
                    onClick={() => openAdd()}
                    className="w-full flex items-center justify-center gap-2 py-5 rounded-xl border border-dashed border-[#E5E7EB] text-slate-400 hover:border-[#1556C0]/40 hover:text-[#1556C0] transition-colors text-[12px] font-medium"
                >
                    <Plus className="h-4 w-4" /> Adicionar pessoa ao mapa
                </button>
            )}

            <p className="text-[10.5px] text-slate-400 pt-3 mt-3 border-t border-[#F1F5F9] leading-relaxed">
                Registre apenas pessoas informadas pelo lead ou pelo corretor durante a negociação.
            </p>

            {/* Form adicionar/editar */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>{editIndex === null ? "Adicionar pessoa" : "Editar pessoa"}</DialogTitle>
                        <DialogDescription>
                            Registre quem influencia a decisão, com base no que o lead ou o corretor informaram.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="dm-nome">Nome</Label>
                            <Input
                                id="dm-nome"
                                value={form.nome}
                                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                                placeholder="Ex: Marcos Moraes"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="dm-relacao">Relação</Label>
                                <Input
                                    id="dm-relacao"
                                    value={form.relacao ?? ""}
                                    onChange={(e) => setForm((f) => ({ ...f, relacao: e.target.value }))}
                                    placeholder="Ex: Cônjuge"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Papel na decisão</Label>
                                <Select value={form.papel ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, papel: v }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((r) => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="dm-origem">Como soubemos</Label>
                            <Input
                                id="dm-origem"
                                value={form.origem ?? ""}
                                onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                                placeholder="Ex: Mencionado na conversa"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        {editIndex !== null && (
                            <Button
                                variant="ghost"
                                className="mr-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => remove(editIndex)}
                                disabled={save.isPending}
                            >
                                Remover
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                        <Button onClick={submit} disabled={save.isPending}>
                            {save.isPending ? "Salvando…" : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detalhe da pessoa — só dados internos */}
            <Dialog open={detailIndex !== null} onOpenChange={(o) => { if (!o) setDetailIndex(null); }}>
                <DialogContent className="sm:max-w-[440px]">
                    {detailIndex !== null && people[detailIndex] && (() => {
                        const p = people[detailIndex];
                        const mentions = findMentions(p, items);
                        return (
                            <>
                                <DialogHeader>
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center justify-center rounded-full text-white font-semibold shrink-0 h-10 w-10 text-[13px] ${(p.papel && ROLE_AVATAR[p.papel]) || "bg-slate-400"}`}>
                                            {initials(p.nome)}
                                        </span>
                                        <div className="min-w-0">
                                            <DialogTitle className="text-left text-[15px]">{p.nome}</DialogTitle>
                                            {p.papel && (
                                                <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold mt-1 ${ROLE_CHIP[p.papel] ?? "bg-slate-100 text-slate-600"}`}>
                                                    {p.papel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </DialogHeader>
                                <div className="space-y-3">
                                    {(p.relacao || p.origem) && (
                                        <dl className="grid grid-cols-2 gap-3 text-[12px]">
                                            {p.relacao && (
                                                <div>
                                                    <dt className="text-slate-400 text-[10.5px] uppercase tracking-wide">Relação</dt>
                                                    <dd className="text-[#0B1220] font-medium mt-0.5">{p.relacao}</dd>
                                                </div>
                                            )}
                                            {p.origem && (
                                                <div>
                                                    <dt className="text-slate-400 text-[10.5px] uppercase tracking-wide">Como soubemos</dt>
                                                    <dd className="text-[#0B1220] font-medium mt-0.5">{p.origem}</dd>
                                                </div>
                                            )}
                                        </dl>
                                    )}
                                    <div>
                                        <p className="text-[11px] font-semibold text-[#0B1220] mb-1.5">Menções nesta negociação</p>
                                        {mentions.length > 0 ? (
                                            <ul className="space-y-1.5">
                                                {mentions.slice(0, 5).map((m, i) => (
                                                    <li key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                                                        {m.kind === "note"
                                                            ? <StickyNote className="h-3.5 w-3.5 text-slate-400 mt-px shrink-0" />
                                                            : <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-px shrink-0" />}
                                                        <div className="min-w-0">
                                                            <p className="text-[11.5px] text-[#0B1220] leading-snug">{m.trecho}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                                {m.kind === "note" ? "Nota" : m.direction === "outbound" ? "Resposta enviada" : "Mensagem recebida"} · {fmtDate(m.ts)}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-[11.5px] text-slate-500 leading-snug">
                                                Ainda não há menções a esta pessoa nas mensagens e notas registradas.
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed border-t border-[#F1F5F9] pt-2.5">
                                        Baseado nas conversas e notas desta negociação. A Vyzon não busca dados externos.
                                    </p>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="ghost"
                                        className="mr-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                        onClick={() => remove(detailIndex)}
                                        disabled={save.isPending}
                                    >
                                        Remover
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => { const i = detailIndex; setDetailIndex(null); openEdit(i); }}
                                    >
                                        Editar
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
