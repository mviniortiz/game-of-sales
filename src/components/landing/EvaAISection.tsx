// ─────────────────────────────────────────────────────────────────────────────
// F2.10.2 (2026-05-20) — EvaAISection v3 (camada operacional, não BI)
// LP.4 (2026-06-09) — v4 "O Fio da Conversa": reskin editorial-técnico.
//   - Sem framer-motion (CSS-only landing-fade, seção é lazy)
//   - Sem EvaPhotoAvatar (imagem) — glifo EvaNode no lugar
//   - Conector do fluxo vira o fio pontilhado da página
//   - Copy LP.3 intocada; frase canônica = 2ª e última ocorrência
// ─────────────────────────────────────────────────────────────────────────────
import {
  ArrowRight,
  Brain,
  MessageSquare,
  Workflow,
  Check,
  Calendar,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { EvaNode } from "./EvaNode";

export function EvaAISection({ onCTAClick }: { onCTAClick?: () => void }) {
  return (
    <section
      id="eva"
      className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ background: "var(--lp-white)" }}
    >
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Estação do fio */}
        <div className="lp-station mb-12 sm:mb-16 landing-fade-in-up">
          <span className="lp-station-node" style={{ background: "var(--lp-eva)", boxShadow: "0 0 0 4px rgba(109,40,217,0.12)" }} />
          <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
            04 · eva comercial
          </span>
          <span className="lp-station-rule" />
        </div>

        {/* Header */}
        <div className="relative mb-12 sm:mb-16 landing-fade-in-up">
          <span
            className="lp-index absolute -top-8 right-0 hidden md:block"
            style={{ fontSize: "clamp(8rem, 18vw, 13rem)" }}
            aria-hidden="true"
          >
            04
          </span>
          <h2
            className="font-satoshi relative"
            style={{
              fontWeight: 900,
              fontSize: "clamp(1.95rem, 4.6vw, 3.1rem)",
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              color: "var(--lp-ink)",
              maxWidth: "760px",
            }}
          >
            A EVA entende sua agência{" "}
            <span className="lp-serif" style={{ color: "var(--lp-eva)", fontWeight: 500 }}>
              antes de sugerir qualquer coisa.
            </span>
          </h2>
          <p
            className="mt-5 text-[15px] sm:text-[17px]"
            style={{ color: "var(--lp-ink-70)", lineHeight: 1.6, maxWidth: "640px" }}
          >
            Cadastre serviços, ICP, tom de voz, objeções e playbooks. A EVA usa
            esse contexto para analisar conversas e sugerir próximos passos mais
            consistentes.
          </p>
          {/* Frase canônica — 2ª e última ocorrência */}
          <p
            className="lp-serif mt-5 inline-flex items-center gap-2"
            style={{ fontSize: "1.0625rem", color: "var(--lp-ink-70)" }}
          >
            <EvaNode size={13} color="var(--lp-eva)" />
            A EVA sugere. Seu time aprova.
          </p>
        </div>

        {/* Body: 2 colunas. Mobile: fluxo primeiro. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-12 lg:gap-16 items-start">
          {/* COL ESQUERDA — pilares */}
          <div className="order-2 lg:order-1 landing-fade-in-up landing-delay-100">
            <div className="flex items-center gap-3.5 pb-6">
              <span
                className="h-11 w-11 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ border: "1px solid var(--lp-line)", background: "var(--lp-paper)" }}
              >
                <EvaNode size={20} color="var(--lp-eva)" />
              </span>
              <div>
                <p className="lp-mono mb-0.5" style={{ color: "var(--lp-eva)" }}>
                  camada comercial assistida
                </p>
                <p className="text-[15px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                  Mais que um chat, uma operação inteira.
                </p>
              </div>
            </div>

            <div className="border-t" style={{ borderColor: "var(--lp-line)" }}>
              <PillarRow
                icon={MessageSquare}
                title="Analisa conversas"
                body="Identifica intenção, fit, urgência e objeções em cada lead."
              />
              <PillarRow
                icon={Workflow}
                title="Sugere próximos passos"
                body="Resposta, follow-up, criação de oportunidade e handoff."
              />
              <PillarRow
                icon={Brain}
                title="Usa o contexto da agência"
                body="Serviços, ICP, tom de voz, objeções e playbooks cadastrados."
              />
              <PillarRow
                icon={BookOpen}
                title="Aprende com materiais aprovados"
                body="Você adiciona o material. Nada entra no contexto sem aprovação."
              />
            </div>

            {onCTAClick && (
              <button
                onClick={onCTAClick}
                className="lp-press lp-press--blue mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-[10px] text-[14px] text-white"
                style={{
                  background: "var(--lp-blue)",
                  border: "1px solid var(--lp-blue-deep)",
                  fontWeight: 600,
                }}
              >
                Ver a EVA em ação
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* COL DIREITA — fluxo de 3 cards ligados pelo fio */}
          <div className="order-1 lg:order-2 landing-fade-in-up landing-delay-200">
            <FlowMock />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PillarRow — linha de razão (hairline) na coluna esquerda
// ─────────────────────────────────────────────────────────────────────────────

function PillarRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Brain;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex items-start gap-4 py-5 border-b"
      style={{ borderColor: "var(--lp-line)" }}
    >
      <span
        className="h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
        style={{ border: "1px solid var(--lp-line)", color: "var(--lp-blue)" }}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-[15.5px] mb-1"
          style={{ color: "var(--lp-ink)", fontWeight: 600, letterSpacing: "-0.012em", lineHeight: 1.3 }}
        >
          {title}
        </p>
        <p className="text-[13.5px] sm:text-[14px]" style={{ color: "var(--lp-ink-55)", lineHeight: 1.5 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowMock — Contexto → Análise → Ação, ligados pelo fio pontilhado
// ─────────────────────────────────────────────────────────────────────────────

function FlowMock() {
  return (
    <div>
      <FlowCard
        index={1}
        accent="#1556C0"
        eyebrow="Contexto da EVA"
        title="Memória comercial carregada"
        items={[
          { label: "Serviços cadastrados", value: "12 ativos" },
          { label: "ICP da agência", value: "definido" },
          { label: "Tom de voz", value: "Direto, consultivo" },
          { label: "Regras de handoff", value: "8 cadastradas" },
        ]}
      />

      <Connector />

      <FlowCard
        index={2}
        accent="#6D28D9"
        eyebrow="Conversa analisada"
        title="Carla R. · Meta Ads"
        pills={[
          { label: "Intenção: preço", tone: "blue" },
          { label: "Urgência: alta", tone: "amber" },
          { label: "Fit: bom", tone: "green" },
          { label: "Falta: orçamento", tone: "neutral" },
        ]}
        quote="“Oi, vi o anúncio e queria entender os planos.”"
      />

      <Connector />

      <FlowCard
        index={3}
        accent="#008A52"
        eyebrow="Próxima ação sugerida"
        title="3 sugestões assistidas"
        actions={[
          { icon: MessageSquare, label: "Responder com pergunta de qualificação", primary: true },
          { icon: Workflow, label: "Criar oportunidade no pipeline" },
          { icon: Calendar, label: "Agendar demo se houver fit" },
        ]}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowCard — card "do produto" pra cada etapa
// ─────────────────────────────────────────────────────────────────────────────

interface FlowCardProps {
  index: number;
  accent: string;
  eyebrow: string;
  title: string;
  items?: { label: string; value: string }[];
  pills?: { label: string; tone: "blue" | "amber" | "green" | "neutral" }[];
  quote?: string;
  actions?: { icon: typeof Brain; label: string; primary?: boolean }[];
}

function FlowCard({
  index,
  accent,
  eyebrow,
  title,
  items,
  pills,
  quote,
  actions,
}: FlowCardProps) {
  return (
    <div
      className="lp-card relative overflow-hidden p-5 sm:p-6"
      style={{ borderRadius: 10 }}
    >
      {/* Accent strip à esquerda */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />

      <div className="flex items-start gap-4">
        {/* Número mono */}
        <span
          className="lp-mono h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0"
          style={{
            border: `1px solid ${accent}55`,
            color: accent,
            fontSize: 13,
          }}
        >
          {String(index).padStart(2, "0")}
        </span>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className="lp-mono mb-1" style={{ color: accent }}>
            {eyebrow}
          </p>
          <p
            className="text-[15px] sm:text-[16px] mb-3"
            style={{
              color: "var(--lp-ink)",
              fontWeight: 600,
              letterSpacing: "-0.012em",
              lineHeight: 1.3,
            }}
          >
            {title}
          </p>

          {/* Items (contexto cadastrado) */}
          {items && (
            <ul className="space-y-2 mb-1">
              {items.map((it) => (
                <li
                  key={it.label}
                  className="flex items-center justify-between text-[12.5px]"
                >
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ color: "var(--lp-ink-55)" }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} style={{ color: accent }} />
                    {it.label}
                  </span>
                  <span style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                    {it.value}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Quote (mensagem analisada) */}
          {quote && (
            <div
              className="lp-serif rounded-[8px] px-3 py-2.5 mb-3 text-[14px]"
              style={{
                background: "var(--lp-paper)",
                border: "1px solid var(--lp-line-soft)",
                color: "var(--lp-ink-70)",
              }}
            >
              {quote}
            </div>
          )}

          {/* Pills (análise EVA) */}
          {pills && (
            <div className="flex flex-wrap gap-1.5">
              {pills.map((p) => (
                <AnalysisPill key={p.label} tone={p.tone}>
                  {p.label}
                </AnalysisPill>
              ))}
            </div>
          )}

          {/* Actions (próximos passos) */}
          {actions && (
            <ul className="space-y-2">
              {actions.map(({ icon: ActionIcon, label, primary }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-[8px] px-3 py-2.5"
                  style={{
                    background: primary ? "rgba(21,86,192,0.05)" : "transparent",
                    border: `1px solid ${primary ? "rgba(21,86,192,0.3)" : "var(--lp-line-soft)"}`,
                  }}
                >
                  <ActionIcon
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.2}
                    style={{ color: primary ? "var(--lp-blue)" : "var(--lp-ink-40)" }}
                  />
                  <span
                    className="text-[13px] truncate"
                    style={{
                      color: primary ? "var(--lp-blue-deep)" : "var(--lp-ink-55)",
                      fontWeight: primary ? 600 : 500,
                    }}
                  >
                    {label}
                  </span>
                  {primary && (
                    <span className="lp-mono ml-auto shrink-0" style={{ color: "var(--lp-blue)" }}>
                      sugerido
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connector — o fio pontilhado entre os FlowCards
// ─────────────────────────────────────────────────────────────────────────────

function Connector() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <div
        className="h-7 w-px"
        style={{
          background:
            "repeating-linear-gradient(180deg, var(--lp-line) 0 5px, transparent 5px 10px)",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisPill — pill mono pra análise da EVA
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "amber" | "green" | "neutral";
}) {
  const map = {
    blue: { bg: "rgba(21,86,192,0.07)", border: "rgba(21,86,192,0.3)", text: "#1556C0" },
    amber: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.35)", text: "#B45309" },
    green: { bg: "rgba(0,138,82,0.08)", border: "rgba(0,138,82,0.3)", text: "#008A52" },
    neutral: {
      bg: "rgba(13,20,33,0.04)",
      border: "rgba(13,20,33,0.16)",
      text: "var(--lp-ink-55)",
    },
  };
  const c = map[tone];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px]"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        fontWeight: 600,
        whiteSpace: "nowrap",
        fontFamily: "var(--lp-mono)",
        letterSpacing: "0.02em",
      }}
    >
      {tone === "amber" && (
        <AlertCircle className="h-2.5 w-2.5" strokeWidth={2.5} />
      )}
      {children}
    </span>
  );
}
