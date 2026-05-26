// ─────────────────────────────────────────────────────────────────────────────
// F4E.2.1 (2026-05-19) — Aba "Contexto" de Configurações > EVA, redesenhada.
//
// Layout premium em 2 colunas (xl+): main com cards agrupados,
// sidebar sticky com painéis de contexto ("Como a EVA usa isso",
// "Completude", "Exemplo de sugestão", "Última edição/versão").
//
// Mudanças vs F4E.2/F4E.3:
//   - Largura controlada no main (max-w-[920px]) — evita campos gigantes
//   - 4 cards bem agrupados em vez de 4 cards genéricos
//   - Microcopy específica por bloco
//   - Sidebar sticky com guidance + completude calculada local + preview
//   - Barra de status simples (dirty / saving / saved)
//   - Sem alteração de schema, upsert ou RLS
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Save,
  Info,
  Building2,
  MessageSquare,
  Clock,
  ShieldAlert,
  Sparkle,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AgencyContext,
  agencyContextSchema,
} from "@/lib/eva/agencyContextSchema";

import { FieldRow, FormCard, ReadOnlyBanner, TagList } from "./_shared";

interface Props {
  value: AgencyContext;
  readOnly: boolean;
  onSave: (next: AgencyContext) => Promise<void>;
  version: number | null;
  updatedAtLabel: string | null;
}

// JSON.stringify simples basta — shape é fixo e ordem de chaves vem do schema
const isEqual = (a: AgencyContext, b: AgencyContext) =>
  JSON.stringify(a) === JSON.stringify(b);

export function EvaContextTab({
  value,
  readOnly,
  onSave,
  version,
  updatedAtLabel,
}: Props) {
  const [agency, setAgency] = useState<AgencyContext>(value);
  const [serverValue, setServerValue] = useState<AgencyContext>(value);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setAgency(value);
    setServerValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  const dirty = !isEqual(agency, serverValue);

  // Quando o usuário começa a editar de novo, some o "salvo"
  useEffect(() => {
    if (dirty && savedRecently) setSavedRecently(false);
  }, [dirty, savedRecently]);

  const handleSave = async () => {
    const parsed = agencyContextSchema.safeParse(agency);
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
      setServerValue(parsed.data);
      setSavedRecently(true);
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => setSavedRecently(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  // ───── Completude (UI-only, não persiste) ─────
  const completion = useMemo(() => computeCompletion(agency), [agency]);

  return (
    // F4E.2.3: grid fixo 1fr+320 com gap 6. Wrapper (max-w-[1280px]) já corta
    // a largura total, então o main ocupa naturalmente ~936px sem "vão".
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
      {/* ─── COLUNA PRINCIPAL ─── */}
      <div className="space-y-5 min-w-0">
        {readOnly && <ReadOnlyBanner />}

        {/* Status bar (topo) */}
        <SaveStatusBar
          dirty={dirty}
          saving={saving}
          savedRecently={savedRecently}
          readOnly={readOnly}
          onSave={handleSave}
        />

        {/* 1. Identidade comercial */}
        <FormCard
          icon={<Building2 className="h-4 w-4 text-muted-foreground/70" />}
          title="Identidade comercial"
          helper="O que sua agência vende e para quem"
        >
          <p className="-mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Ajude a EVA a entender o que sua agência vende, para quem vende e
            qual tipo de lead vale priorizar.
          </p>

          <FieldRow
            label="Descrição da agência"
            hint="O que sua agência faz, em 1–3 parágrafos. Inclua tempo de mercado, posicionamento e o que vocês NÃO fazem."
          >
            <Textarea
              value={agency.descricao}
              onChange={(e) => setAgency({ ...agency, descricao: e.target.value })}
              placeholder="Ex: Somos uma agência de performance focada em e-commerce de moda, desde 2019..."
              className="min-h-[110px] text-sm resize-y"
              disabled={readOnly}
              maxLength={2000}
            />
          </FieldRow>

          <FieldRow
            label="Público-alvo"
            hint="Quem é o cliente ideal da agência? Setor, porte, faturamento, dores frequentes."
          >
            <Textarea
              value={agency.publico_alvo}
              onChange={(e) => setAgency({ ...agency, publico_alvo: e.target.value })}
              placeholder="Ex: E-commerces faturando R$200k–R$2M/mês em moda, beleza ou casa..."
              className="min-h-[90px] text-sm resize-y"
              disabled={readOnly}
              maxLength={2000}
            />
          </FieldRow>

          <FieldRow
            label="Ticket médio"
            hint="Quanto custa em média um projeto/contrato. Pode ser faixa ou valor."
          >
            <Input
              value={agency.ticket_medio}
              onChange={(e) => setAgency({ ...agency, ticket_medio: e.target.value })}
              placeholder="Ex: R$ 4.500/mês (mínimo R$ 3.000, máximo R$ 12.000)"
              className="h-9 text-sm max-w-[480px]"
              disabled={readOnly}
              maxLength={240}
            />
          </FieldRow>
        </FormCard>

        {/* 2. Voz e linguagem */}
        <FormCard
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground/70" />}
          title="Voz e linguagem"
          helper="Como a EVA escreve sugestões"
        >
          <p className="-mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Defina como a EVA deve escrever sugestões para manter o jeito da
            sua agência.
          </p>

          <FieldRow
            label="Tom de voz"
            hint="Formal/informal, técnico/acessível, próximo/distante. Pode dar 2–3 exemplos do que você diria e do que NÃO diria."
          >
            <Textarea
              value={agency.tom_de_voz}
              onChange={(e) => setAgency({ ...agency, tom_de_voz: e.target.value })}
              placeholder="Ex: Direto e consultivo, sem gírias. Tratamos por você (não 'vc'). Evitamos jargão técnico no primeiro contato..."
              className="min-h-[100px] text-sm resize-y"
              disabled={readOnly}
              maxLength={600}
            />
          </FieldRow>

          <FieldRow
            label="Palavras proibidas"
            hint="Termos que a EVA nunca deve usar nas sugestões. Enter para adicionar cada um."
          >
            <TagList
              values={agency.palavras_proibidas}
              onChange={(next) => setAgency({ ...agency, palavras_proibidas: next })}
              placeholder='Ex: "barato", "garanto", "milagre"'
              disabled={readOnly}
              maxTagLength={80}
            />
          </FieldRow>
        </FormCard>

        {/* 3. Operação e atendimento */}
        <FormCard
          icon={<Clock className="h-4 w-4 text-muted-foreground/70" />}
          title="Operação e atendimento"
          helper="Quando e como sua agência responde"
        >
          <p className="-mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Diga quando a EVA deve sugerir passar a conversa para uma pessoa
            do time.
          </p>

          <FieldRow
            label="Horário de atendimento"
            hint="A EVA usa pra calibrar urgência das sugestões fora do horário."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[640px]">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">
                  Dias da semana
                </Label>
                <Input
                  value={agency.horario_atendimento.dias}
                  onChange={(e) =>
                    setAgency({
                      ...agency,
                      horario_atendimento: {
                        ...agency.horario_atendimento,
                        dias: e.target.value,
                      },
                    })
                  }
                  placeholder="Ex: Segunda a sexta"
                  className="h-9 text-sm"
                  disabled={readOnly}
                  maxLength={240}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Início</Label>
                <Input
                  value={agency.horario_atendimento.inicio}
                  onChange={(e) =>
                    setAgency({
                      ...agency,
                      horario_atendimento: {
                        ...agency.horario_atendimento,
                        inicio: e.target.value,
                      },
                    })
                  }
                  placeholder="09:00"
                  className="h-9 text-sm"
                  disabled={readOnly}
                  maxLength={16}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Fim</Label>
                <Input
                  value={agency.horario_atendimento.fim}
                  onChange={(e) =>
                    setAgency({
                      ...agency,
                      horario_atendimento: {
                        ...agency.horario_atendimento,
                        fim: e.target.value,
                      },
                    })
                  }
                  placeholder="18:00"
                  className="h-9 text-sm"
                  disabled={readOnly}
                  maxLength={16}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">
                  Fuso horário
                </Label>
                <Input
                  value={agency.horario_atendimento.fuso}
                  onChange={(e) =>
                    setAgency({
                      ...agency,
                      horario_atendimento: {
                        ...agency.horario_atendimento,
                        fuso: e.target.value,
                      },
                    })
                  }
                  placeholder="America/Sao_Paulo (UTC-3)"
                  className="h-9 text-sm"
                  disabled={readOnly}
                  maxLength={64}
                />
              </div>
            </div>
          </FieldRow>

          <FieldRow
            label="Regras de handoff humano"
            hint="Quando a EVA precisa avisar um humano em vez de sugerir resposta. Ex: pedido de desconto, reclamação, jurídico."
          >
            <Textarea
              value={agency.regras_handoff}
              onChange={(e) => setAgency({ ...agency, regras_handoff: e.target.value })}
              placeholder="Ex: Sempre avisar humano em: pedido de desconto acima de 20%, qualquer menção a 'jurídico' ou 'reclamação', leads que pedem proposta detalhada..."
              className="min-h-[100px] text-sm resize-y"
              disabled={readOnly}
              maxLength={2000}
            />
          </FieldRow>
        </FormCard>

        {/* 4. Limites comerciais */}
        <FormCard
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground/70" />}
          title="Limites comerciais"
          helper="O que a EVA nunca deve prometer"
        >
          <p className="-mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Evite que a EVA sugira algo que sua agência não pode prometer.
          </p>

          <FieldRow
            label="Promessas proibidas"
            hint="Frases ou compromissos que a agência nunca pode prometer. Enter para adicionar."
          >
            <TagList
              values={agency.promessas_proibidas}
              onChange={(next) => setAgency({ ...agency, promessas_proibidas: next })}
              placeholder='Ex: "garantia de resultado em 30 dias"'
              disabled={readOnly}
              maxTagLength={160}
            />
          </FieldRow>

          <FieldRow
            label="Observações comerciais"
            hint="Qualquer contexto que ainda não coube acima: políticas internas, exceções, casos comuns."
          >
            <Textarea
              value={agency.observacoes}
              onChange={(e) => setAgency({ ...agency, observacoes: e.target.value })}
              placeholder="Ex: Não trabalhamos com nichos de jogo de azar, criptoativos ou política. Contratos mínimos de 6 meses..."
              className="min-h-[100px] text-sm resize-y"
              disabled={readOnly}
              maxLength={2000}
            />
          </FieldRow>
        </FormCard>

        {/* Footer: save final */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground max-w-md">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Contexto da agência alimenta sugestões da EVA na Inbox e em
              relatórios. EVA sempre sugere — humano aprova.
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || readOnly || !dirty}
            size="sm"
            className="bg-[#2563EB] hover:bg-[#1D4FD8] text-white shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            {saving ? "Salvando..." : dirty ? "Salvar contexto" : "Tudo salvo"}
          </Button>
        </div>
      </div>

      {/* ─── SIDEBAR STICKY ─── */}
      <aside className="xl:sticky xl:top-4 xl:self-start space-y-4">
        <HelpPanel />
        <CompletionCard completion={completion} />
        <ExampleSuggestionCard agency={agency} />
        <MetaCard version={version} updatedAtLabel={updatedAtLabel} />
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes locais
// ─────────────────────────────────────────────────────────────────────────────

function SaveStatusBar({
  dirty,
  saving,
  savedRecently,
  readOnly,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  savedRecently: boolean;
  readOnly: boolean;
  onSave: () => void;
}) {
  if (readOnly) return null;
  if (!dirty && !saving && !savedRecently) return null;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-2.5 flex items-center gap-3 text-sm transition-colors",
        savedRecently
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          : "border-[#2563EB]/30 bg-[#2563EB]/5 text-[#1D4FD8]",
      )}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : savedRecently ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <CircleDot className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 font-medium">
        {saving
          ? "Salvando contexto..."
          : savedRecently
          ? "Contexto salvo."
          : "Alterações não salvas."}
      </span>
      {dirty && !saving && (
        <Button
          onClick={onSave}
          size="sm"
          className="h-7 bg-[#2563EB] hover:bg-[#1D4FD8] text-white"
        >
          Salvar agora
        </Button>
      )}
    </div>
  );
}

function HelpPanel() {
  const items = [
    "Analisa conversas com o contexto da agência",
    "Qualifica leads com base no público-alvo",
    "Sugere respostas no tom definido",
    "Evita palavras e promessas proibidas",
    "Recomenda handoff quando necessário",
  ];
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
      <div className="flex items-center gap-2 mb-3">
        <Sparkle className="h-3.5 w-3.5 text-[#7C3AED]" />
        <p className="text-[12px] font-semibold text-foreground">
          Como a EVA usa isso
        </p>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed"
          >
            <span className="mt-1.5 w-1 h-1 rounded-full bg-[#2563EB] shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Completion {
  percent: number;
  completed: number;
  total: number;
  items: { label: string; done: boolean }[];
}

function CompletionCard({ completion }: { completion: Completion }) {
  const tone =
    completion.percent >= 80
      ? "emerald"
      : completion.percent >= 40
      ? "blue"
      : "amber";

  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "blue"
      ? "bg-[#2563EB]"
      : "bg-amber-500";

  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-semibold text-foreground">
          Completude do contexto
        </p>
        <Badge
          variant="outline"
          className="h-5 px-2 text-[10px] font-semibold border-transparent bg-muted text-foreground"
        >
          {completion.percent}%
        </Badge>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={cn("h-full transition-all duration-500", toneClass)}
          style={{ width: `${completion.percent}%` }}
        />
      </div>
      <ul className="space-y-1">
        {completion.items.map((it) => (
          <li
            key={it.label}
            className="flex items-center gap-2 text-[11.5px] leading-relaxed"
          >
            {it.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <CircleDot className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={cn(
                it.done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {it.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExampleSuggestionCard({ agency }: { agency: AgencyContext }) {
  const exampleParts = useMemo(() => buildExampleSuggestion(agency), [agency]);
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-foreground">
          Exemplo de sugestão EVA
        </p>
        <Badge
          variant="outline"
          className="h-5 px-2 text-[10px] font-medium border-[#7C3AED]/30 text-[#7C3AED] bg-[#7C3AED]/5"
        >
          Preview
        </Badge>
      </div>
      <div className="rounded-md bg-muted/40 border border-border/50 px-3 py-3 space-y-1.5">
        {exampleParts.map((p, i) => (
          <p
            key={i}
            className="text-[12px] text-foreground leading-relaxed"
          >
            {p}
          </p>
        ))}
      </div>
      <p className="text-[10.5px] text-muted-foreground/80 mt-2 leading-relaxed">
        Texto gerado localmente a partir do contexto preenchido. EVA real chega
        em F4E.4.
      </p>
    </div>
  );
}

function MetaCard({
  version,
  updatedAtLabel,
}: {
  version: number | null;
  updatedAtLabel: string | null;
}) {
  if (version === null && !updatedAtLabel) return null;
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
      <p className="text-[12px] font-semibold text-foreground mb-2">
        Versão e edição
      </p>
      <dl className="space-y-1.5 text-[11.5px]">
        {version !== null && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Versão</dt>
            <dd className="font-medium text-foreground">v{version}</dd>
          </div>
        )}
        {updatedAtLabel && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Última edição</dt>
            <dd className="font-medium text-foreground text-right">
              {updatedAtLabel}
            </dd>
          </div>
        )}
      </dl>
      <p className="text-[10.5px] text-muted-foreground/80 mt-2.5 leading-relaxed">
        Versão sobe sempre que o contexto muda — usado para invalidar cache da
        EVA.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeCompletion(agency: AgencyContext): Completion {
  const items = [
    { label: "Descrição da agência", done: agency.descricao.trim().length > 0 },
    { label: "Público-alvo", done: agency.publico_alvo.trim().length > 0 },
    { label: "Ticket médio", done: agency.ticket_medio.trim().length > 0 },
    { label: "Tom de voz", done: agency.tom_de_voz.trim().length > 0 },
    {
      label: "Horário de atendimento",
      done:
        agency.horario_atendimento.dias.trim().length > 0 ||
        agency.horario_atendimento.inicio.trim().length > 0,
    },
    {
      label: "Regras de handoff",
      done: agency.regras_handoff.trim().length > 0,
    },
    {
      label: "Limites comerciais",
      done:
        agency.promessas_proibidas.length > 0 ||
        agency.observacoes.trim().length > 0,
    },
  ];
  const completed = items.filter((it) => it.done).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { percent, completed, total, items };
}

function buildExampleSuggestion(agency: AgencyContext): string[] {
  const has = (s: string) => s.trim().length > 0;
  const truncate = (s: string, n: number) =>
    s.length > n ? `${s.slice(0, n).trim()}…` : s;

  const parts: string[] = [];

  if (has(agency.publico_alvo)) {
    parts.push(
      `Como vocês atendem ${truncate(agency.publico_alvo.trim(), 90)}, a EVA pode confirmar fit antes de qualificar.`,
    );
  } else {
    parts.push(
      "A EVA pode confirmar fit do lead antes de qualificar para o pipeline.",
    );
  }

  if (has(agency.tom_de_voz)) {
    parts.push(
      `Vai sugerir respostas no tom: ${truncate(agency.tom_de_voz.trim(), 80)}`,
    );
  } else {
    parts.push(
      "Defina um tom de voz para a EVA replicar nas sugestões automáticas.",
    );
  }

  if (agency.palavras_proibidas.length > 0 || agency.promessas_proibidas.length > 0) {
    const banned = [
      ...agency.palavras_proibidas.slice(0, 2),
      ...agency.promessas_proibidas.slice(0, 1),
    ];
    parts.push(`Evita: ${banned.map((b) => `"${b}"`).join(", ")}.`);
  }

  if (has(agency.regras_handoff)) {
    parts.push(
      "Quando bater nas regras de handoff, vai sugerir passar a conversa para humano.",
    );
  }

  // Garante pelo menos 1 frase fallback
  if (parts.length === 0) {
    parts.push(
      "Com esse contexto, a EVA pode sugerir perguntas sobre orçamento, urgência e fit antes de recomendar uma reunião.",
    );
  }

  return parts;
}

