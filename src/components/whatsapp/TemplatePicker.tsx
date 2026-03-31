import React, { useState, useMemo } from "react";
import { Search, Settings2, Zap, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useTemplates,
  applyTemplate,
  TEMPLATE_CATEGORIES,
  type TemplateVariables,
} from "@/hooks/useWhatsAppTemplates";
import { TemplateManager } from "./TemplateManager";

interface TemplatePickerProps {
  companyId: string | null;
  userId?: string;
  onSelect: (text: string) => void;
  onClose: () => void;
  contactName?: string;
  contactPhone?: string;
  dealValue?: number;
  dealStage?: string;
  companyName?: string;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  companyId,
  userId,
  onSelect,
  onClose,
  contactName,
  contactPhone,
  dealValue,
  dealStage,
  companyName,
}) => {
  const { data: templates = [], isLoading } = useTemplates(companyId);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showManager, setShowManager] = useState(false);

  const variables: TemplateVariables = useMemo(
    () => ({
      nome: contactName,
      telefone: contactPhone,
      valor_deal: dealValue,
      estagio: dealStage,
      empresa: companyName,
    }),
    [contactName, contactPhone, dealValue, dealStage, companyName]
  );

  const filtered = useMemo(() => {
    let list = templates;
    if (activeCategory !== "all") {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, activeCategory, search]);

  const handleSelect = (content: string) => {
    onSelect(applyTemplate(content, variables));
    onClose();
  };

  return (
    <>
      <div className="mb-2 bg-card/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="px-3 py-2 border-b border-white/[0.05] flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" /> Templates
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowManager(true)}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title="Gerenciar templates"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-2.5 py-1.5 border-b border-white/[0.03]">
          <div className="flex items-center gap-1.5 bg-muted/20 rounded-lg px-2">
            <Search className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <Input
              placeholder="Buscar template..."
              className="bg-transparent border-0 focus-visible:ring-0 text-[12px] p-0 min-h-[30px] placeholder:text-muted-foreground/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-2.5 py-1.5 border-b border-white/[0.03] flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeCategory === "all"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
            }`}
          >
            Todos
          </button>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates list */}
        <ScrollArea className="max-h-52">
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground/50 text-[11px]">
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground/50 text-[11px]">
              {templates.length === 0 ? (
                <div>
                  <p>Nenhum template criado.</p>
                  <button
                    onClick={() => setShowManager(true)}
                    className="text-primary hover:underline mt-1 inline-block"
                  >
                    Criar primeiro template
                  </button>
                </div>
              ) : (
                "Nenhum template encontrado"
              )}
            </div>
          ) : (
            <div>
              {filtered.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelect(tpl.content)}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.02] last:border-b-0 group"
                >
                  <span className="text-[10px] font-bold text-primary/80 group-hover:text-primary block mb-0.5">
                    {tpl.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60 line-clamp-1 leading-snug">
                    {applyTemplate(tpl.content, variables)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Template Manager Dialog */}
      <TemplateManager
        open={showManager}
        onOpenChange={setShowManager}
        companyId={companyId}
        userId={userId}
      />
    </>
  );
};
