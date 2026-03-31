import React, { useState } from "react";
import { Pencil, Trash2, Plus, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  useTemplatesGrouped,
  useTemplateMutations,
  applyTemplate,
  TEMPLATE_CATEGORIES,
  AVAILABLE_VARIABLES,
  type WhatsAppTemplate,
  type TemplateCategory,
  type TemplateVariables,
} from "@/hooks/useWhatsAppTemplates";

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  userId?: string;
}

const EMPTY_FORM = {
  name: "",
  category: "geral" as TemplateCategory,
  content: "",
};

const PREVIEW_VARS: TemplateVariables = {
  nome: "João Silva",
  telefone: "+55 11 99999-0000",
  valor_deal: 5000,
  estagio: "Proposta",
  empresa: "Minha Empresa",
};

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  open,
  onOpenChange,
  companyId,
  userId,
}) => {
  const { data: templates = [], grouped, isLoading } = useTemplatesGrouped(companyId);
  const { createTemplate, updateTemplate, deleteTemplate } = useTemplateMutations(companyId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (tpl: WhatsAppTemplate) => {
    setForm({ name: tpl.name, category: tpl.category as TemplateCategory, content: tpl.content });
    setEditingId(tpl.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Template removido");
    } catch {
      toast.error("Erro ao remover template");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error("Preencha nome e conteúdo");
      return;
    }
    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, ...form });
        toast.success("Template atualizado");
      } else {
        await createTemplate.mutateAsync({ ...form, created_by: userId });
        toast.success("Template criado");
      }
      resetForm();
    } catch {
      toast.error("Erro ao salvar template");
    }
  };

  const filteredCategories =
    activeCategory === "all"
      ? Object.entries(grouped)
      : Object.entries(grouped).filter(([cat]) => cat === activeCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">Gerenciar Templates WhatsApp</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Crie e gerencie templates de mensagens para envio rápido.
          </DialogDescription>
        </DialogHeader>

        {/* Category filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-primary/15 text-primary"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            Todos ({templates.length})
          </button>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const count = grouped[cat.value]?.length || 0;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  activeCategory === cat.value
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Template list */}
        <ScrollArea className="flex-1 min-h-0 max-h-[320px] -mx-1 px-1">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
          ) : templates.length === 0 && !showForm ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum template criado ainda. Clique em "Novo Template" para começar.
            </div>
          ) : (
            filteredCategories.map(([category, tpls]) => {
              const catLabel = TEMPLATE_CATEGORIES.find((c) => c.value === category)?.label || category;
              return (
                <div key={category} className="mb-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                    {catLabel}
                  </div>
                  {tpls.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold text-foreground">{tpl.name}</div>
                        <div className="text-[11px] text-muted-foreground/70 line-clamp-2 mt-0.5 leading-snug">
                          {tpl.content}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleEdit(tpl)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </ScrollArea>

        {/* Create / Edit form */}
        {showForm ? (
          <div className="border-t border-white/[0.06] pt-3 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do template"
                className="text-[13px]"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as TemplateCategory }))}
              >
                <SelectTrigger className="w-[150px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-[13px]">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Conteúdo da mensagem. Use {{nome}}, {{valor_deal}}, etc."
              className="text-[13px] min-h-[80px] resize-none"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />

            {/* Variables hint */}
            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/60">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                    <div className="space-y-1">
                      {AVAILABLE_VARIABLES.map((v) => (
                        <div key={v.key}>
                          <span className="font-mono font-bold text-primary">{v.key}</span>{" "}
                          — {v.description}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span>
                Variáveis disponíveis:{" "}
                {AVAILABLE_VARIABLES.map((v) => v.key).join(", ")}
              </span>
            </div>

            {/* Preview */}
            {form.content.trim() && (
              <div className="bg-muted/20 border border-white/[0.06] rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Preview
                </div>
                <div className="text-[12px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {applyTemplate(form.content, PREVIEW_VARS)}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetForm} className="text-[12px]">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={createTemplate.isPending || updateTemplate.isPending}
                className="text-[12px]"
              >
                {editingId ? "Atualizar" : "Criar"} Template
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
              className="text-[12px]"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Template
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
