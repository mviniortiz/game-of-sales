// F6T.4 — Central de gestão de tags da empresa (Configurações → Tags).
// CRUD + cores + uso por tag + merge. Usa useCompanyTags (escrita real).
import { useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tag as TagIcon, Plus, Pencil, Trash2, GitMerge, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useCompanyTags, type TagWithUsage } from "@/hooks/useCompanyTags";
import { isHexColor } from "@/lib/tags";
import type { TagEntityType } from "@/types/tags";

const PALETTE = [
    { key: "emerald", hex: "#10B981" },
    { key: "blue", hex: "#2563EB" },
    { key: "sky", hex: "#0EA5E9" },
    { key: "violet", hex: "#8B5CF6" },
    { key: "purple", hex: "#A855F7" },
    { key: "amber", hex: "#F59E0B" },
    { key: "orange", hex: "#F97316" },
    { key: "rose", hex: "#F43F5E" },
    { key: "red", hex: "#EF4444" },
    { key: "slate", hex: "#64748B" },
];

const ENTITY_LABEL: Record<TagEntityType, [string, string]> = {
    deal: ["deal", "deals"],
    conversation: ["conversa", "conversas"],
    contact: ["contato", "contatos"],
    knowledge_item: ["item de conhecimento", "itens de conhecimento"],
};

function hexOf(color: string | null): string {
    if (!color) return "#64748B";
    if (isHexColor(color)) return color;
    return PALETTE.find((p) => p.key === color)?.hex ?? "#64748B";
}

function rgba(hex: string, a: number): string {
    const m = hex.replace("#", "");
    const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function TagBadge({ name, color }: { name: string; color: string | null }) {
    const hex = hexOf(color);
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: rgba(hex, 0.12), border: `1px solid ${rgba(hex, 0.28)}`, color: "#0B1220" }}
        >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
            {name}
        </span>
    );
}

function usageLabel(t: TagWithUsage): string {
    if (t.usage === 0) return "Não usada ainda";
    const parts = (Object.entries(t.usageByType) as [TagEntityType, number][])
        .filter(([, n]) => n > 0)
        .map(([type, n]) => `${n} ${ENTITY_LABEL[type][n === 1 ? 0 : 1]}`);
    return `${t.usage} ${t.usage === 1 ? "uso" : "usos"} · ${parts.join(", ")}`;
}

const primaryBtn =
    "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const ghostBtn =
    "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors hover:bg-[#F1F5F9]";

type FormState = { id?: string; name: string; color: string; description: string };

export default function Tags() {
    const { tags, loading, createTag, updateTag, deleteTag, mergeTags } = useCompanyTags();
    const [search, setSearch] = useState("");
    const [form, setForm] = useState<FormState | null>(null);
    const [deleting, setDeleting] = useState<TagWithUsage | null>(null);
    const [merging, setMerging] = useState<TagWithUsage | null>(null);
    const [mergeTarget, setMergeTarget] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return tags;
        return tags.filter((t) => t.name.toLowerCase().includes(q));
    }, [tags, search]);

    const openCreate = () => setForm({ name: "", color: "blue", description: "" });
    const openEdit = (t: TagWithUsage) =>
        setForm({ id: t.id, name: t.name, color: t.color ?? "slate", description: t.description ?? "" });

    const handleSave = async () => {
        if (!form) return;
        if (!form.name.trim()) {
            toast.error("Dê um nome para a tag");
            return;
        }
        setBusy(true);
        try {
            if (form.id) {
                await updateTag.mutateAsync({ id: form.id, name: form.name, color: form.color, description: form.description });
                toast.success("Tag atualizada");
            } else {
                await createTag.mutateAsync({ name: form.name, color: form.color, description: form.description });
                toast.success("Tag criada");
            }
            setForm(null);
        } catch (e: any) {
            const msg = String(e?.message ?? e);
            if (e?.code === "23505" || /duplicate|unique/i.test(msg)) {
                toast.error("Já existe uma tag com esse nome");
            } else {
                toast.error(`Erro ao salvar: ${msg}`);
            }
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setBusy(true);
        try {
            await deleteTag.mutateAsync(deleting.id);
            toast.success("Tag excluída");
            setDeleting(null);
        } catch (e: any) {
            toast.error(`Erro ao excluir: ${String(e?.message ?? e)}`);
        } finally {
            setBusy(false);
        }
    };

    const handleMerge = async () => {
        if (!merging || !mergeTarget) return;
        setBusy(true);
        try {
            await mergeTags.mutateAsync({ sourceId: merging.id, targetId: mergeTarget });
            toast.success("Tags mescladas");
            setMerging(null);
            setMergeTarget(null);
        } catch (e: any) {
            toast.error(`Erro ao mesclar: ${String(e?.message ?? e)}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Ações */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar tag..."
                        className="w-full pl-9 pr-3 h-9 text-sm rounded-lg outline-none transition-colors focus:border-[#2563EB]"
                        style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#0B1220" }}
                    />
                </div>
                <button className={primaryBtn} onClick={openCreate}>
                    <Plus className="w-4 h-4" /> Nova tag
                </button>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="rounded-2xl p-10 flex items-center justify-center" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5" }}>
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563EB" }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl p-10 text-center" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5" }}>
                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(37,99,235,0.08)" }}>
                        <TagIcon className="w-6 h-6" style={{ color: "#2563EB" }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#0B1220" }}>
                        {search ? "Nenhuma tag encontrada" : "Nenhuma tag ainda"}
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: "#64748B" }}>
                        {search ? "Tente outro termo." : "Crie tags para organizar deals, conversas e contatos do time."}
                    </p>
                    {!search && (
                        <button className={`${primaryBtn} mt-4`} onClick={openCreate}>
                            <Plus className="w-4 h-4" /> Criar primeira tag
                        </button>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
                    {filtered.map((t, i) => (
                        <div
                            key={t.id}
                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F8FAFC]"
                            style={i > 0 ? { borderTop: "1px solid #EEF2F7" } : undefined}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <TagBadge name={t.name} color={t.color} />
                                    {t.description && (
                                        <span className="text-[13px] truncate" style={{ color: "#64748B" }}>{t.description}</span>
                                    )}
                                </div>
                                <p className="text-[11px] mt-1" style={{ color: "#94A3B8" }}>{usageLabel(t)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => openEdit(t)}
                                    title="Editar"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F1F5F9]"
                                    style={{ color: "#64748B" }}
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { setMerging(t); setMergeTarget(null); }}
                                    title="Mesclar em outra tag"
                                    disabled={tags.length < 2}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ color: "#64748B" }}
                                >
                                    <GitMerge className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDeleting(t)}
                                    title="Excluir"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#FEF2F2]"
                                    style={{ color: "#DC2626" }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Dialog: criar/editar ── */}
            <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
                <DialogContent className="sm:max-w-[440px]" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5" }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: "#0B1220" }}>{form?.id ? "Editar tag" : "Nova tag"}</DialogTitle>
                        <DialogDescription style={{ color: "#64748B" }}>
                            Tags ajudam o time a filtrar e organizar deals, conversas e contatos.
                        </DialogDescription>
                    </DialogHeader>

                    {form && (
                        <div className="space-y-4 pt-1">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>Nome</label>
                                <input
                                    autoFocus
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                    placeholder="Ex: Lead quente, Sem orçamento, VIP"
                                    className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors focus:border-[#2563EB]"
                                    style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#0B1220" }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>Cor</label>
                                <div className="flex flex-wrap gap-2">
                                    {PALETTE.map((c) => {
                                        const active = form.color === c.key;
                                        return (
                                            <button
                                                key={c.key}
                                                onClick={() => setForm({ ...form, color: c.key })}
                                                title={c.key}
                                                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                                                style={{ background: c.hex, outline: active ? `2px solid ${c.hex}` : "none", outlineOffset: 2 }}
                                            >
                                                {active && <Check className="w-4 h-4 text-white" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>Descrição (opcional)</label>
                                <input
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Quando usar essa tag"
                                    className="w-full h-10 px-3 rounded-lg text-sm outline-none transition-colors focus:border-[#2563EB]"
                                    style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#0B1220" }}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                                <TagBadge name={form.name.trim() || "Prévia"} color={form.color} />
                                <div className="flex gap-2">
                                    <button onClick={() => setForm(null)} className={ghostBtn} style={{ border: "1px solid #E6EDF5", color: "#475569" }}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleSave} disabled={busy} className={primaryBtn}>
                                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {form.id ? "Salvar" : "Criar tag"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Dialog: excluir ── */}
            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="sm:max-w-[420px]" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5" }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: "#0B1220" }}>Excluir tag</DialogTitle>
                        <DialogDescription style={{ color: "#64748B" }}>
                            {deleting && (
                                <>
                                    A tag <strong>{deleting.name}</strong>{" "}
                                    {deleting.usage > 0
                                        ? `será removida de ${deleting.usage} ${deleting.usage === 1 ? "item" : "itens"}.`
                                        : "será excluída."}{" "}
                                    Essa ação não pode ser desfeita.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setDeleting(null)} className={ghostBtn} style={{ border: "1px solid #E6EDF5", color: "#475569" }}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={busy}
                            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors disabled:opacity-50"
                        >
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                            Excluir
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Dialog: mesclar ── */}
            <Dialog open={!!merging} onOpenChange={(o) => !o && (setMerging(null), setMergeTarget(null))}>
                <DialogContent className="sm:max-w-[440px]" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5" }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: "#0B1220" }}>Mesclar tag</DialogTitle>
                        <DialogDescription style={{ color: "#64748B" }}>
                            {merging && (
                                <>Os usos de <strong>{merging.name}</strong> vão para a tag escolhida, e <strong>{merging.name}</strong> será excluída.</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 pt-1 max-h-[320px] overflow-y-auto">
                        {tags
                            .filter((t) => t.id !== merging?.id)
                            .map((t) => {
                                const active = mergeTarget === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setMergeTarget(t.id)}
                                        className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-left transition-colors"
                                        style={active
                                            ? { background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.3)" }
                                            : { background: "#FFFFFF", border: "1px solid #E6EDF5" }}
                                    >
                                        <TagBadge name={t.name} color={t.color} />
                                        {active && <Check className="w-4 h-4" style={{ color: "#2563EB" }} />}
                                    </button>
                                );
                            })}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => { setMerging(null); setMergeTarget(null); }} className={ghostBtn} style={{ border: "1px solid #E6EDF5", color: "#475569" }}>
                            Cancelar
                        </button>
                        <button onClick={handleMerge} disabled={busy || !mergeTarget} className={primaryBtn}>
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                            Mesclar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
