// ─────────────────────────────────────────────────────────────────────────────
// F4E.3 (2026-05-19) — Aba "ICP" de Configurações > EVA.
//
// Edita eva_business_context.icp. Estrutura:
//   - Descrição do cliente ideal (parágrafo)
//   - 4 listas de critérios (bom/médio/baixo/sem fit)
//   - Regras de pontuação: array { criterio, pontos -100..100 }
//
// EVA usa esses critérios pra sugerir fit_sugerido e score_sugerido em
// conversation_summaries.qualification. Sempre como SUGESTÃO — humano aprova.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Target,
  Plus,
  Trash2,
  Info,
  HelpCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Icp, RegraPontuacao, icpSchema } from "@/lib/eva/icpSchema";

import { FieldRow, FormCard, ReadOnlyBanner, TagList } from "./_shared";

interface Props {
  value: Icp;
  readOnly: boolean;
  onSave: (next: Icp) => Promise<void>;
}

export function EvaIcpTab({ value, readOnly, onSave }: Props) {
  const [icp, setIcp] = useState<Icp>(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIcp(value);
  }, [value]);

  const handleSave = async () => {
    const parsed = icpSchema.safeParse(icp);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {readOnly && <ReadOnlyBanner />}

      <FormCard
        icon={<Target className="h-4 w-4 text-muted-foreground/70" />}
        title="Cliente ideal (ICP)"
        helper="Quem é o lead que vocês conseguem entregar resultado de verdade"
      >
        <div className="-mb-1 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            A EVA usa esses critérios para sugerir fit (bom/médio/baixo/sem) e
            uma pontuação. Quanto mais específico, melhor — humano sempre revisa
            antes de qualquer ação no pipeline.
          </span>
        </div>

        <FieldRow
          label="Descrição do cliente ideal"
          hint="Em 1–2 parágrafos: setor, porte, maturidade, problema que vocês resolvem melhor."
        >
          <Textarea
            value={icp.descricao}
            onChange={(e) => setIcp({ ...icp, descricao: e.target.value })}
            placeholder="Ex: E-commerces de moda feminina faturando R$300k–R$1.5M/mês, com gestor de marketing interno, já investindo em ads há pelo menos 6 meses..."
            className="min-h-[110px] text-sm resize-y"
            disabled={readOnly}
            maxLength={2000}
          />
        </FieldRow>
      </FormCard>

      <FormCard
        icon={<Target className="h-4 w-4 text-muted-foreground/70" />}
        title="Critérios de fit"
        helper="Quanto mais específico, mais útil a sugestão da EVA"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FitTierCard
            tone="bom"
            label="Bom fit"
            description="Sinais fortes de cliente ideal. EVA tende a recomendar avançar."
            values={icp.criterios_bom_fit}
            onChange={(next) => setIcp({ ...icp, criterios_bom_fit: next })}
            placeholder="Ex: Faturamento acima de R$300k/mês"
            readOnly={readOnly}
          />
          <FitTierCard
            tone="medio"
            label="Médio fit"
            description="Atende parcialmente. EVA recomenda investigar mais."
            values={icp.criterios_medio_fit}
            onChange={(next) => setIcp({ ...icp, criterios_medio_fit: next })}
            placeholder="Ex: Já investe em ads mas sem time interno"
            readOnly={readOnly}
          />
          <FitTierCard
            tone="baixo"
            label="Baixo fit"
            description="Provavelmente não fecha. EVA recomenda nutrição leve."
            values={icp.criterios_baixo_fit}
            onChange={(next) => setIcp({ ...icp, criterios_baixo_fit: next })}
            placeholder="Ex: Nunca rodou ads pagos"
            readOnly={readOnly}
          />
          <FitTierCard
            tone="sem"
            label="Sem fit"
            description="Não atende. EVA recomenda recusar com cordialidade."
            values={icp.criterios_sem_fit}
            onChange={(next) => setIcp({ ...icp, criterios_sem_fit: next })}
            placeholder="Ex: Setor proibido (jogo de azar, política)"
            readOnly={readOnly}
          />
        </div>
      </FormCard>

      <FormCard
        icon={<Target className="h-4 w-4 text-muted-foreground/70" />}
        title="Regras de pontuação"
        helper="Pontos somam ou subtraem do score sugerido (0–100)"
      >
        <div className="-mb-1 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Cada regra é simples: um critério + pontos (positivo soma, negativo
            subtrai). A EVA aplica somando tudo e cortando entre 0 e 100. Você
            pode deixar vazio se preferir que a EVA use só os critérios de fit.
          </span>
        </div>

        <RulesList
          values={icp.regras_pontuacao}
          onChange={(next) => setIcp({ ...icp, regras_pontuacao: next })}
          readOnly={readOnly}
        />
      </FormCard>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground max-w-md">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            EVA só sugere — humano aprova score, fit e qualquer mudança no
            pipeline. Nada é executado sem clique.
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
          Salvar ICP
        </Button>
      </div>
    </div>
  );
}

// ───────── Sub: Card de tier de fit ─────────

type FitTone = "bom" | "medio" | "baixo" | "sem";

const TONE_STYLES: Record<FitTone, { ring: string; dot: string; chip: string }> = {
  bom: {
    ring: "border-emerald-500/30",
    dot: "bg-emerald-500",
    chip: "text-emerald-700 dark:text-emerald-400",
  },
  medio: {
    ring: "border-amber-500/30",
    dot: "bg-amber-500",
    chip: "text-amber-700 dark:text-amber-400",
  },
  baixo: {
    ring: "border-orange-500/30",
    dot: "bg-orange-500",
    chip: "text-orange-700 dark:text-orange-400",
  },
  sem: {
    ring: "border-rose-500/30",
    dot: "bg-rose-500",
    chip: "text-rose-700 dark:text-rose-400",
  },
};

function FitTierCard({
  tone,
  label,
  description,
  values,
  onChange,
  placeholder,
  readOnly,
}: {
  tone: FitTone;
  label: string;
  description: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  readOnly: boolean;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={cn("rounded-xl border bg-muted/10 p-4 space-y-3", styles.ring)}>
      <div className="flex items-start gap-2">
        <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", styles.dot)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-[13px] font-semibold", styles.chip)}>{label}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <TagList
        values={values}
        onChange={onChange}
        placeholder={placeholder}
        disabled={readOnly}
        maxTagLength={240}
      />
    </div>
  );
}

// ───────── Sub: Lista de regras de pontuação ─────────

function RulesList({
  values,
  onChange,
  readOnly,
}: {
  values: RegraPontuacao[];
  onChange: (next: RegraPontuacao[]) => void;
  readOnly: boolean;
}) {
  const [draftCriterio, setDraftCriterio] = useState("");
  const [draftPontos, setDraftPontos] = useState("");

  const add = () => {
    const c = draftCriterio.trim();
    const p = parseInt(draftPontos, 10);
    if (!c) return;
    if (Number.isNaN(p)) {
      toast.error("Pontos devem ser número inteiro (-100 a 100)");
      return;
    }
    if (p < -100 || p > 100) {
      toast.error("Pontos devem estar entre -100 e 100");
      return;
    }
    onChange([...values, { criterio: c, pontos: p }]);
    setDraftCriterio("");
    setDraftPontos("");
  };

  const update = (i: number, patch: Partial<RegraPontuacao>) => {
    onChange(values.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };

  const remove = (i: number) => {
    onChange(values.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      {values.length > 0 ? (
        <ul className="space-y-2">
          {values.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 p-2.5"
            >
              <div className="flex items-center gap-1 shrink-0">
                {r.pontos >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                )}
              </div>
              <Input
                value={r.criterio}
                onChange={(e) => update(i, { criterio: e.target.value })}
                className="h-8 text-sm flex-1"
                disabled={readOnly}
                maxLength={240}
              />
              <Input
                inputMode="numeric"
                value={String(r.pontos)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9-]/g, "");
                  const n = parseInt(raw, 10);
                  update(i, { pontos: Number.isFinite(n) ? n : 0 });
                }}
                className={cn(
                  "h-8 text-sm w-20 text-center font-medium",
                  r.pontos >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
                disabled={readOnly}
              />
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground/70">
          Nenhuma regra de pontuação ainda. Sem regras, a EVA usa só os
          critérios de fit acima.
        </p>
      )}

      {!readOnly && (
        <div className="rounded-md border border-dashed border-border/60 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Critério</Label>
              <Input
                value={draftCriterio}
                onChange={(e) => setDraftCriterio(e.target.value)}
                placeholder="Ex: Já investe em ads há mais de 6 meses"
                className="h-8 text-sm"
                maxLength={240}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Pontos (-100..100)</Label>
              <Input
                inputMode="numeric"
                value={draftPontos}
                onChange={(e) => setDraftPontos(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="20"
                className="h-8 text-sm text-center"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={add}
              disabled={!draftCriterio.trim() || !draftPontos.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar regra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
