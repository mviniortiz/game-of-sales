// ─────────────────────────────────────────────────────────────────────────────
// F4E.3 (2026-05-19) — Aba "Serviços" de Configurações > EVA.
//
// Edita eva_business_context.services (array). Cada serviço é um card
// expansível com nome/descrição/preço/cobrança/perguntas/objeções/fit.
//
// UX:
//   - Card colapsado mostra apenas nome + faixa de preço resumida
//   - "Adicionar serviço" cria entrada vazia e abre automaticamente
//   - Preço é opcional (null) — EVA reconhece ausência
//   - Objeções são pares { objeção, resposta sugerida }
//   - Salvar é por aba (envia só o array services no upsert)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Save,
  Briefcase,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  MODELOS_COBRANCA,
  Service,
  emptyService,
  newServiceId,
  servicesArraySchema,
} from "@/lib/eva/serviceSchema";

import { FieldRow, FormCard, ReadOnlyBanner, TagList } from "./_shared";

interface Props {
  value: Service[];
  readOnly: boolean;
  onSave: (next: Service[]) => Promise<void>;
}

const formatPriceRange = (s: Service): string => {
  if (s.preco_min == null && s.preco_max == null) return "Preço não informado";
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (s.preco_min != null && s.preco_max != null) {
    return s.preco_min === s.preco_max ? fmt(s.preco_min) : `${fmt(s.preco_min)} – ${fmt(s.preco_max)}`;
  }
  if (s.preco_min != null) return `A partir de ${fmt(s.preco_min)}`;
  return `Até ${fmt(s.preco_max!)}`;
};

const parsePrice = (raw: string): number | null => {
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

export function EvaServicesTab({ value, readOnly, onSave }: Props) {
  const [services, setServices] = useState<Service[]>(value);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setServices(value);
    // ao recarregar do servidor, mantém colapsados (menos ruído visual)
  }, [value]);

  const updateService = (id: string, patch: Partial<Service>) => {
    setServices((curr) => curr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeService = (id: string) => {
    setServices((curr) => curr.filter((s) => s.id !== id));
    setExpanded((curr) => {
      const next = new Set(curr);
      next.delete(id);
      return next;
    });
  };

  const addService = () => {
    const id = newServiceId();
    setServices((curr) => [...curr, emptyService(id)]);
    setExpanded((curr) => new Set(curr).add(id));
  };

  const toggleExpand = (id: string) => {
    setExpanded((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    // Filtra serviços sem nome (entradas em branco) antes de validar
    const cleaned = services.filter((s) => (s.nome || "").trim().length > 0);
    const parsed = servicesArraySchema.safeParse(cleaned);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(
        `Validação: ${first?.message || "shape inválido"}${
          first?.path?.length ? ` (${first.path.join(".")})` : ""
        }`,
      );
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed.data);
      // Atualiza local pra refletir limpeza (entradas em branco removidas)
      setServices(parsed.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {readOnly && <ReadOnlyBanner />}

      <FormCard
        icon={<Briefcase className="h-4 w-4 text-muted-foreground/70" />}
        title="Serviços que sua agência vende"
        helper="A EVA usa para qualificar o lead e sugerir o próximo passo"
        trailing={
          !readOnly && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addService}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar serviço
            </Button>
          )
        }
      >
        <div className="-mb-1 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            A EVA usa seus serviços e critérios de fit para qualificar leads sem
            inventar informação. Se você não cadastrar o preço, ela responde
            "não tenho essa informação" em vez de chutar.
          </span>
        </div>

        {services.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-5 py-8 text-center">
            <Briefcase className="h-5 w-5 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Nenhum serviço cadastrado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre pelo menos 1 serviço para a EVA conseguir qualificar.
            </p>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                onClick={addService}
                className="mt-3 bg-[#2563EB] hover:bg-[#1D4FD8] text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar serviço
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {services.map((svc, idx) => (
              <li key={svc.id}>
                <ServiceCard
                  service={svc}
                  index={idx}
                  expanded={expanded.has(svc.id)}
                  readOnly={readOnly}
                  onToggle={() => toggleExpand(svc.id)}
                  onChange={(patch) => updateService(svc.id, patch)}
                  onRemove={() => removeService(svc.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </FormCard>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground max-w-md">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            EVA sugere qualificação com base nesses serviços. Humano sempre
            revisa o score antes de virar oportunidade no pipeline.
          </span>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || readOnly}
          size="sm"
          className="bg-[#2563EB] hover:bg-[#1D4FD8] text-white shrink-0"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Salvar serviços
        </Button>
      </div>
    </div>
  );
}

// ───────── Sub: Card de Serviço ─────────

interface ServiceCardProps {
  service: Service;
  index: number;
  expanded: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Service>) => void;
  onRemove: () => void;
}

function ServiceCard({
  service,
  index,
  expanded,
  readOnly,
  onToggle,
  onChange,
  onRemove,
}: ServiceCardProps) {
  const priceDraft = useMemo(() => formatPriceRange(service), [service]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-colors",
        expanded ? "border-[#2563EB]/30" : "border-border/50",
      )}
    >
      {/* Header colapsável */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-t-xl"
      >
        <div className="w-7 h-7 rounded-md bg-[#2563EB]/10 flex items-center justify-center text-[12px] font-semibold text-[#2563EB] shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {(service.nome || "").trim() || "Serviço sem nome"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {priceDraft}
            {service.modelo_cobranca && (
              <>
                <span className="mx-1.5">·</span>
                {MODELOS_COBRANCA.find((m) => m.value === service.modelo_cobranca)?.label}
              </>
            )}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-4 py-4 space-y-5">
          {/* Linha 1: nome + modelo cobrança */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[11px] text-muted-foreground">Nome do serviço</Label>
              <Input
                value={service.nome}
                onChange={(e) => onChange({ nome: e.target.value })}
                placeholder="Ex: Gestão de tráfego Meta + Google"
                className="h-9 text-sm"
                disabled={readOnly}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Modelo de cobrança</Label>
              <Select
                value={service.modelo_cobranca || undefined}
                onValueChange={(v) =>
                  onChange({ modelo_cobranca: v as Service["modelo_cobranca"] })
                }
                disabled={readOnly}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS_COBRANCA.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <FieldRow
            label="Descrição"
            hint="Como vocês entregam esse serviço, em 2–4 linhas."
          >
            <Textarea
              value={service.descricao}
              onChange={(e) => onChange({ descricao: e.target.value })}
              placeholder="Ex: Setup completo de campanhas, gestão diária, relatório semanal..."
              className="min-h-[80px] text-sm resize-y"
              disabled={readOnly}
              maxLength={1200}
            />
          </FieldRow>

          {/* Preço */}
          <FieldRow
            label="Faixa de preço"
            hint="Deixe vazio se preferir não cadastrar — a EVA reconhece e responde 'não tenho essa informação'."
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Mínimo (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={service.preco_min ?? ""}
                  onChange={(e) => onChange({ preco_min: parsePrice(e.target.value) })}
                  placeholder="3000"
                  className="h-9 text-sm"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Máximo (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={service.preco_max ?? ""}
                  onChange={(e) => onChange({ preco_max: parsePrice(e.target.value) })}
                  placeholder="12000"
                  className="h-9 text-sm"
                  disabled={readOnly}
                />
              </div>
            </div>
          </FieldRow>

          {/* Perguntas obrigatórias */}
          <FieldRow
            label="Perguntas obrigatórias"
            hint="O que a EVA deve garantir que sejam respondidas antes de qualificar o lead pra esse serviço."
          >
            <TagList
              values={service.perguntas_obrigatorias}
              onChange={(next) => onChange({ perguntas_obrigatorias: next })}
              placeholder="Ex: Qual o faturamento mensal hoje?"
              disabled={readOnly}
              maxTagLength={240}
            />
          </FieldRow>

          {/* Objeções (pares) */}
          <FieldRow
            label="Objeções comuns + resposta sugerida"
            hint="Pareie a objeção com o que vocês costumam responder. A EVA usa como base para sugerir resposta."
          >
            <ObjectionsList
              values={service.objecoes}
              onChange={(next) => onChange({ objecoes: next })}
              disabled={readOnly}
            />
          </FieldRow>

          {/* Critérios de fit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow
              label="Critérios de bom fit"
              hint="Sinais que indicam que o lead provavelmente fecha esse serviço."
            >
              <TagList
                values={service.criterios_bom_fit}
                onChange={(next) => onChange({ criterios_bom_fit: next })}
                placeholder="Ex: Já investe em ads há 6+ meses"
                disabled={readOnly}
                maxTagLength={240}
              />
            </FieldRow>
            <FieldRow
              label="Critérios de baixo fit"
              hint="Sinais que indicam que esse serviço provavelmente não é pro lead."
            >
              <TagList
                values={service.criterios_baixo_fit}
                onChange={(next) => onChange({ criterios_baixo_fit: next })}
                placeholder="Ex: Faturamento abaixo de R$50k/mês"
                disabled={readOnly}
                maxTagLength={240}
              />
            </FieldRow>
          </div>

          {/* Ações no rodapé do card */}
          {!readOnly && (
            <div className="flex justify-end pt-1 border-t border-border/40 -mx-4 px-4 -mb-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remover serviço
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────── Sub: Lista de objeções pareadas ─────────

interface ObjectionsListProps {
  values: Service["objecoes"];
  onChange: (next: Service["objecoes"]) => void;
  disabled?: boolean;
}

function ObjectionsList({ values, onChange, disabled }: ObjectionsListProps) {
  const [draftObj, setDraftObj] = useState("");
  const [draftResp, setDraftResp] = useState("");

  const add = () => {
    const o = draftObj.trim();
    if (!o) return;
    onChange([...values, { objecao: o, resposta_sugerida: draftResp.trim() }]);
    setDraftObj("");
    setDraftResp("");
  };

  const update = (i: number, patch: Partial<Service["objecoes"][number]>) => {
    onChange(values.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };

  const remove = (i: number) => {
    onChange(values.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      {values.length > 0 && (
        <ul className="space-y-2">
          {values.map((o, i) => (
            <li
              key={i}
              className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={o.objecao}
                    onChange={(e) => update(i, { objecao: e.target.value })}
                    placeholder='Ex: "Está caro"'
                    className="h-8 text-sm"
                    disabled={disabled}
                    maxLength={240}
                  />
                  <Textarea
                    value={o.resposta_sugerida}
                    onChange={(e) => update(i, { resposta_sugerida: e.target.value })}
                    placeholder="Como vocês respondem? (opcional)"
                    className="min-h-[60px] text-sm resize-y"
                    disabled={disabled}
                    maxLength={1200}
                  />
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="rounded-md border border-dashed border-border/60 p-3 space-y-2">
          <Input
            value={draftObj}
            onChange={(e) => setDraftObj(e.target.value)}
            placeholder='Nova objeção (ex: "Não tenho tempo agora")'
            className="h-8 text-sm"
            maxLength={240}
          />
          <Textarea
            value={draftResp}
            onChange={(e) => setDraftResp(e.target.value)}
            placeholder="Resposta sugerida (opcional)"
            className="min-h-[60px] text-sm resize-y"
            maxLength={1200}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={add}
              disabled={!draftObj.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar objeção
            </Button>
          </div>
        </div>
      )}

      {values.length === 0 && disabled && (
        <p className="text-[11px] text-muted-foreground/70">Nenhuma objeção cadastrada.</p>
      )}
    </div>
  );
}
