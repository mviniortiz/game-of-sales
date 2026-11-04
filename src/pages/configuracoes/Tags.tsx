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
import { Check, CircleNotch, GitMerge, MagnifyingGlass, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useCompanyTags, type TagWithUsage } from "@/hooks/useCompanyTags";
import { isHexColor } from "@/lib/tags";
import type { TagEntityType } from "@/types/tags";

// Cores que o usuário escolhe para cada tag. São dado (gravado em tags.color pela
// chave, ou hex em tags antigas), não cor de interface; por isso ficam em hex aqui.
const PALETTE = [
    { key: "emerald", hex: "#10B981", nome: "Verde" },
    { key: "blue", hex: "#1556C0", nome: "Azul" },
    { key: "sky", hex: "#0EA5E9", nome: "Celeste" },
    { key: "violet", hex: "#8B5CF6", nome: "Violeta" },
    { key: "purple", hex: "#A855F7", nome: "Roxo" },
    { key: "amber", hex: "#F59E0B", nome: "Âmbar" },
    { key: "orange", hex: "#F97316", nome: "Laranja" },
    { key: "rose", hex: "#F43F5E", nome: "Rosa" },
    { key: "red", hex: "#EF4444", nome: "Vermelho" },
    { key: "slate", hex: "#64748B", nome: "Cinza" },
];

const ENTITY_LABEL: Record<TagEntityType, [string, string]> = {
    deal: ["deal", "deals"],
    conversation: ["conversa", "conversas"],
    contact: ["contato", "contatos"],
    knowledge_item: ["item de conhecimento", "itens de conhecimento"],
};

const SLATE = PALETTE[PALETTE.length - 1].hex;

function hexOf(color: string | null): string {
    if (!color) return SLATE;
    if (isHexColor(color)) return color;
    return PALETTE.find((p) => p.key === color)?.hex ?? SLATE;
}

// Fundo e borda da etiqueta saem da cor da tag, clareada com color-mix.
const tint = (hex: string, pct: number) => `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

function TagBadge({ name, color }: { name: string; color: string | null }) {
    const hex = hexOf(color);
    return (
        <span
            className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium text-[var(--vyz-text-primary)]"
            style={{ background: tint(hex, 12), border: `1px solid ${tint(hex, 28)}` }}
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
                toast.error("Não consegui salvar a tag. Tente de novo.", { description: `Detalhe técnico: ${msg}` });
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
            toast.error("Não consegui excluir a tag. Tente de novo.", { description: `Detalhe técnico: ${String(e?.message ?? e)}` });
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
            toast.error("Não consegui juntar as tags. Tente de novo.", { description: `Detalhe técnico: ${String(e?.message ?? e)}` });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="vp-pilha">
            <section className="vp-cartao vp-cartao--lista" aria-labelledby="tags-lista">
                <div className="vp-cartao__cab">
                    <div>
                        <h2 id="tags-lista" className="vp-rotulo">Tags da empresa</h2>
                        <p className="vp-sub">Tags ajudam o time a filtrar e organizar deals, conversas e contatos.</p>
                    </div>
                    <button type="button" className="vp-botao" onClick={openCreate}>
                        <Plus size={16} weight="bold" aria-hidden /> Nova tag
                    </button>
                </div>

                <label className="vp-campo relative mt-4 sm:max-w-xs">
                    <span className="sr-only">Buscar tag</span>
                    <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vyz-text-dim)]" aria-hidden />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar tag"
                        style={{ paddingLeft: 36 }}
                    />
                </label>

                {loading ? (
                    <div className="flex items-center justify-center py-10" aria-busy="true">
                        <CircleNotch size={22} className="animate-spin text-[var(--vyz-text-muted)] motion-reduce:animate-none" aria-hidden />
                        <span className="sr-only">Carregando as tags</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="vp-separa py-8 text-center">
                        <p className="vp-rotulo">{search ? "Nenhuma tag encontrada" : "Nenhuma tag ainda"}</p>
                        <p className="vp-campo__ajuda mt-1">
                            {search ? "Tente outro termo." : "Crie tags para organizar deals, conversas e contatos do time."}
                        </p>
                        {!search && (
                            <button type="button" className="vp-botao mt-4" onClick={openCreate}>
                                <Plus size={16} weight="bold" aria-hidden /> Criar primeira tag
                            </button>
                        )}
                    </div>
                ) : (
                    <ul>
                        {filtered.map((t) => (
                            <li key={t.id} className="vp-separa flex items-center gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <TagBadge name={t.name} color={t.color} />
                                        {t.description && (
                                            <span className="truncate text-[13px] text-[var(--vyz-text-muted)]">{t.description}</span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-[12px] text-[var(--vyz-text-muted)]">{usageLabel(t)}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-0.5">
                                    <button type="button" onClick={() => openEdit(t)} title="Editar" aria-label={`Editar ${t.name}`} className="vp-icone">
                                        <PencilSimple size={18} aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setMerging(t); setMergeTarget(null); }}
                                        title="Mesclar em outra tag"
                                        aria-label={`Mesclar ${t.name} em outra tag`}
                                        disabled={tags.length < 2}
                                        className="vp-icone"
                                    >
                                        <GitMerge size={18} aria-hidden />
                                    </button>
                                    <button type="button" onClick={() => setDeleting(t)} title="Excluir" aria-label={`Excluir ${t.name}`} className="vp-icone vp-icone--perigo">
                                        <Trash size={18} aria-hidden />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Dialog: criar/editar */}
            <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
                <DialogContent className="vp-dialogo border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-primary)] sm:rounded-[18px] sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="text-[var(--vyz-text-primary)]">{form?.id ? "Editar tag" : "Nova tag"}</DialogTitle>
                        <DialogDescription className="text-[var(--vyz-text-muted)]">
                            Tags ajudam o time a filtrar e organizar deals, conversas e contatos.
                        </DialogDescription>
                    </DialogHeader>

                    {form && (
                        <div className="pt-1">
                            <label className="vp-campo">
                                <span className="vp-rotulo">Nome</span>
                                <input
                                    autoFocus
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                    placeholder="Ex: Lead quente, Sem orçamento, VIP"
                                />
                            </label>

                            <div className="vp-campo">
                                <span className="vp-rotulo" id="tag-cor">Cor</span>
                                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="tag-cor">
                                    {PALETTE.map((c) => {
                                        const active = form.color === c.key;
                                        return (
                                            <button
                                                type="button"
                                                key={c.key}
                                                onClick={() => setForm({ ...form, color: c.key })}
                                                title={c.nome}
                                                aria-label={c.nome}
                                                aria-pressed={active}
                                                className="grid h-8 w-8 place-items-center rounded-full text-white outline-offset-2 transition-transform duration-150 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--vyz-accent)] motion-reduce:transition-none motion-reduce:hover:scale-100"
                                                style={{ background: c.hex, boxShadow: active ? `0 0 0 2px var(--vyz-surface-1), 0 0 0 4px ${c.hex}` : undefined }}
                                            >
                                                {active && <Check size={16} weight="bold" aria-hidden />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="vp-campo">
                                <span className="vp-rotulo">Descrição (opcional)</span>
                                <input
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Quando usar essa tag"
                                />
                            </label>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <TagBadge name={form.name.trim() || "Prévia"} color={form.color} />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setForm(null)} className="vp-botao vp-botao--quieto">
                                        Cancelar
                                    </button>
                                    <button type="button" onClick={handleSave} disabled={busy} className="vp-botao">
                                        {busy && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                                        {form.id ? "Salvar" : "Criar tag"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog: excluir */}
            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="vp-dialogo border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-primary)] sm:rounded-[18px] sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="text-[var(--vyz-text-primary)]">Excluir tag</DialogTitle>
                        <DialogDescription className="text-[var(--vyz-text-muted)]">
                            {deleting && (
                                <>
                                    A tag <strong className="text-[var(--vyz-text-primary)]">{deleting.name}</strong>{" "}
                                    {deleting.usage > 0
                                        ? `será removida de ${deleting.usage} ${deleting.usage === 1 ? "item" : "itens"}.`
                                        : "será excluída."}{" "}
                                    Essa ação não pode ser desfeita.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setDeleting(null)} className="vp-botao vp-botao--quieto">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleDelete} disabled={busy} className="vp-botao vp-botao--perigo">
                            {busy && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                            Excluir
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog: mesclar */}
            <Dialog open={!!merging} onOpenChange={(o) => !o && (setMerging(null), setMergeTarget(null))}>
                <DialogContent className="vp-dialogo border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-primary)] sm:rounded-[18px] sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="text-[var(--vyz-text-primary)]">Mesclar tag</DialogTitle>
                        <DialogDescription className="text-[var(--vyz-text-muted)]">
                            {merging && (
                                <>Os usos de <strong className="text-[var(--vyz-text-primary)]">{merging.name}</strong> vão para a tag escolhida, e <strong className="text-[var(--vyz-text-primary)]">{merging.name}</strong> será excluída.</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[320px] space-y-2 overflow-y-auto pt-1">
                        {tags
                            .filter((t) => t.id !== merging?.id)
                            .map((t) => {
                                const active = mergeTarget === t.id;
                                return (
                                    <button
                                        type="button"
                                        key={t.id}
                                        onClick={() => setMergeTarget(t.id)}
                                        aria-pressed={active}
                                        className={`flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vyz-accent)] motion-reduce:transition-none ${
                                            active
                                                ? "border-[var(--vyz-accent-border-strong)] bg-[var(--vyz-accent-soft-6)]"
                                                : "border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] hover:bg-[var(--vyz-bg)]"
                                        }`}
                                    >
                                        <TagBadge name={t.name} color={t.color} />
                                        {active && <Check size={16} weight="bold" className="text-[var(--vyz-accent)]" aria-hidden />}
                                    </button>
                                );
                            })}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => { setMerging(null); setMergeTarget(null); }} className="vp-botao vp-botao--quieto">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleMerge} disabled={busy || !mergeTarget} className="vp-botao">
                            {busy && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                            Mesclar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
