import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useCompanyTags } from "@/hooks/useCompanyTags";
import { useDealTagsSingle } from "@/hooks/useDealsTags";
import { useDealTagAssignments } from "@/hooks/useDealTagAssignments";
import { TAG_PALETTE, getTagColorClass, isHexColor, tagHex } from "@/lib/tags";
import type { Tag } from "@/types/tags";
import { Plus, Tag as TagIcon, Loader2, X, Check, Search } from "lucide-react";
import { toast } from "sonner";

interface DealTagPickerProps {
  dealId: string;
  companyId: string;
}

// Chip de tag F6T.1 (resolve cor nomeada via classes ou hex inline).
function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  const useHex = isHexColor(tag.color);
  return (
    <span
      className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${useHex ? "" : getTagColorClass(tag.color)}`}
      style={useHex ? { backgroundColor: `${tag.color}1a`, color: tag.color as string, boxShadow: `inset 0 0 0 1px ${tag.color}55` } : undefined}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="rounded-full p-0.5 hover:bg-black/10 transition-colors"
          aria-label={`Remover ${tag.name}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

export function DealTagPicker({ dealId, companyId }: DealTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newColor, setNewColor] = useState(TAG_PALETTE[0].name);

  const { tags: companyTags, loading: loadingAll } = useCompanyTags();
  const { tags: assignedTags, loading: loadingAssigned } = useDealTagsSingle(dealId);
  const { assignTag, removeTag, createAndAssign } = useDealTagAssignments(companyId, dealId);

  const assignedIds = useMemo(() => new Set(assignedTags.map((t) => t.id)), [assignedTags]);
  const lowerSearch = search.toLowerCase().trim();

  const available = useMemo(
    () => companyTags
      .filter((t) => !assignedIds.has(t.id))
      .filter((t) => !lowerSearch || t.name.toLowerCase().includes(lowerSearch)),
    [companyTags, assignedIds, lowerSearch],
  );

  // Nome buscado já existe (em qualquer tag da empresa)?
  const exactExists = useMemo(
    () => companyTags.some((t) => t.name.toLowerCase() === lowerSearch),
    [companyTags, lowerSearch],
  );

  const handleAssign = async (tagId: string) => {
    try { await assignTag.mutateAsync(tagId); } catch { toast.error("Erro ao aplicar tag"); }
  };
  const handleRemove = async (tagId: string) => {
    try { await removeTag.mutateAsync(tagId); } catch { toast.error("Erro ao remover tag"); }
  };
  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    try {
      await createAndAssign.mutateAsync({ name, color: newColor });
      setSearch("");
      toast.success("Tag criada e aplicada!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar tag");
    }
  };

  const isLoading = loadingAll || loadingAssigned;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {assignedTags.map((tag) => (
        <TagChip key={tag.id} tag={tag} onRemove={() => handleRemove(tag.id)} />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-colors border border-dashed border-border"
            aria-label="Adicionar tag"
          >
            <TagIcon className="h-3 w-3" />
            <Plus className="h-3 w-3 -ml-0.5" />
            Tag
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-0 overflow-hidden" align="start" sideOffset={6}>
          {/* Busca */}
          <div className="p-2.5 border-b border-border">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <Input
                placeholder="Buscar ou criar tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim() && !exactExists) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                className="h-8 border-0 bg-transparent px-0 text-[13px] focus-visible:ring-0"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de tags disponíveis */}
          <div className="max-h-44 overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : available.length > 0 ? (
              available.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAssign(tag.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] hover:bg-muted transition-colors text-left group"
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/5" style={{ backgroundColor: tagHex(tag.color) }} />
                  <span className="truncate flex-1">{tag.name}</span>
                  {tag.usage > 0 && <span className="text-[10px] text-muted-foreground/60 tabular-nums">{tag.usage}</span>}
                  <Plus className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors" />
                </button>
              ))
            ) : !search ? (
              <p className="text-[12px] text-muted-foreground text-center py-4">Nenhuma tag ainda. Digite acima para criar.</p>
            ) : null}
          </div>

          {/* Criar nova tag (aparece quando há busca sem match exato) */}
          {search.trim() && !exactExists && (
            <div className="border-t border-border p-2.5 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Nova tag</span>
                {/* Preview ao vivo */}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${getTagColorClass(newColor)}`}
                >
                  {search.trim()}
                </span>
              </div>

              {/* Paleta de cores nomeadas */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                {TAG_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setNewColor(c.name)}
                    title={c.label}
                    aria-label={c.label}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${newColor === c.name ? "scale-110 ring-2 ring-offset-2 ring-offset-background" : "hover:scale-105"}`}
                    style={{ backgroundColor: c.hex, boxShadow: newColor === c.name ? `0 0 0 2px ${c.hex}` : undefined }}
                  >
                    {newColor === c.name && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCreate}
                disabled={createAndAssign.isPending}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12.5px] font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {createAndAssign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Criar "{search.trim()}" e aplicar
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
