import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useDealTags, useTagsForDeal, useDealTagMutations } from "@/hooks/useDealTags";
import { DealTagBadge } from "./DealTagBadge";
import { Plus, Tag, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Amarelo", value: "#f59e0b" },
  { name: "Verde", value: "#22c55e" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Violeta", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
];

interface DealTagPickerProps {
  dealId: string;
  companyId: string;
}

export function DealTagPicker({ dealId, companyId }: DealTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[5].value);

  const { data: allTags = [], isLoading: loadingAll } = useDealTags(companyId);
  const { data: assignedTags = [], isLoading: loadingAssigned } = useTagsForDeal(dealId);
  const { createTag, assignTag, removeTag } = useDealTagMutations(companyId);

  const assignedIds = useMemo(() => new Set(assignedTags.map((t) => t.id)), [assignedTags]);

  const availableTags = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    return allTags
      .filter((t) => !assignedIds.has(t.id))
      .filter((t) => !lowerSearch || t.name.toLowerCase().includes(lowerSearch));
  }, [allTags, assignedIds, search]);

  const handleAssign = async (tagId: string) => {
    try {
      await assignTag.mutateAsync({ dealId, tagId });
    } catch {
      toast.error("Erro ao atribuir tag");
    }
  };

  const handleRemove = async (tagId: string) => {
    try {
      await removeTag.mutateAsync({ dealId, tagId });
    } catch {
      toast.error("Erro ao remover tag");
    }
  };

  const handleCreate = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    try {
      const newTag = await createTag.mutateAsync({ name: trimmed, color: newTagColor });
      // Auto-assign the new tag to this deal
      await assignTag.mutateAsync({ dealId, tagId: newTag.id });
      setNewTagName("");
      setShowCreate(false);
      toast.success("Tag criada!");
    } catch {
      toast.error("Erro ao criar tag");
    }
  };

  const isLoading = loadingAll || loadingAssigned;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Currently assigned tags */}
      {assignedTags.map((tag) => (
        <DealTagBadge key={tag.id} tag={tag} onRemove={() => handleRemove(tag.id)} />
      ))}

      {/* Add tag button + popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-border"
            aria-label="Adicionar tag"
          >
            <Tag className="h-2.5 w-2.5" />
            <Plus className="h-2.5 w-2.5" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-0" align="start" sideOffset={6}>
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Buscar tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableTags.length === 0 && !search ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Nenhuma tag disponível
              </p>
            ) : (
              availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAssign(tag.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate">{tag.name}</span>
                </button>
              ))
            )}

            {search && availableTags.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhuma tag encontrada
              </p>
            )}
          </div>

          {/* Create new tag section */}
          <div className="border-t border-border p-2">
            {!showCreate ? (
              <button
                onClick={() => {
                  setShowCreate(true);
                  if (search.trim()) setNewTagName(search.trim());
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" />
                Criar nova tag
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Nome da tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                  className="h-7 text-xs"
                  autoFocus
                />

                <div className="flex items-center gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewTagColor(c.value)}
                      className={`w-5 h-5 rounded-full transition-all ${
                        newTagColor === c.value ? "ring-2 ring-offset-1 ring-offset-background scale-110" : ""
                      }`}
                      style={{
                        backgroundColor: c.value,
                        ringColor: newTagColor === c.value ? c.value : undefined,
                      }}
                      title={c.name}
                      aria-label={c.name}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCreate}
                    disabled={!newTagName.trim() || createTag.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                  >
                    {createTag.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Criar
                  </button>
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setNewTagName("");
                    }}
                    className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
