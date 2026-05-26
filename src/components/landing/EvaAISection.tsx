// ─────────────────────────────────────────────────────────────────────────────
// F2.10.2 (2026-05-20) — EvaAISection v3 (camada operacional, não BI)
//
// Redesign completo da seção "Pergunte para a EVA":
//   - Removida narrativa de chat de BI (gráficos, ranking, tendências)
//   - Nova tese: EVA é camada de inteligência comercial assistida
//   - Layout 2 colunas: copy + 3 cards à esquerda, fluxo de 3 cards à direita
//   - Light premium, sem dashboard. Sem image gen.
// ─────────────────────────────────────────────────────────────────────────────
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  MessageSquare,
  Workflow,
  Check,
  Sparkle,
  Calendar,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import { Reveal, StaggerContainer } from "./animation/Reveal";

const fadeIn = {
  initial: { y: 20 } as const,
  whileInView: { y: 0 } as const,
  viewport: { once: true } as const,
  transition: { duration: 0.5 },
};

export function EvaAISection({ onCTAClick }: { onCTAClick?: () => void }) {
  return (
    <section
      id="eva"
      className="py-24 sm:py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ background: "#FFFFFF" }}
    >
      {/* Ambient sutil — azul + lilás muito leve, sem cara de BI */}
      <div
        className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 0%, rgba(37,99,235,0.07) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="absolute -top-10 -right-20 w-[500px] h-[400px] rounded-full pointer-events-none hidden lg:block"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)",
        }}
        aria-hidden
      />

      <div className="max-w-[1280px] mx-auto relative z-10">
        {/* Header de seção */}
        <motion.div className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto" {...fadeIn}>
          <span
            className="inline-flex items-center gap-2 text-[11px] sm:text-[12px] uppercase rounded-full px-3.5 py-1.5 mb-6"
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.28)",
              color: "#6D28D9",
              fontWeight: 700,
              letterSpacing: "0.15em",
            }}
          >
            <Sparkle className="h-3 w-3" strokeWidth={2.5} />
            EVA Comercial
          </span>
          <h2
            className="font-satoshi mx-auto"
            style={{
              fontWeight: 700,
              fontSize: "clamp(1.95rem, 4.6vw, 2.95rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              color: "#0B1220",
              maxWidth: "820px",
            }}
          >
            A EVA entende sua agência
            <br />
            <span
              className="bg-gradient-to-r from-[#2563EB] via-[#4A8CE8] to-[#7C3AED] bg-clip-text"
              style={{ color: "transparent" }}
            >
              antes de sugerir qualquer coisa.
            </span>
          </h2>
          <p
            className="mt-5 mx-auto text-[15px] sm:text-[17px]"
            style={{ color: "rgba(10,10,10,0.58)", lineHeight: 1.55, maxWidth: "720px" }}
          >
            Cadastre serviços, ICP, tom de voz, objeções e playbooks. A EVA usa
            esse contexto para analisar conversas e sugerir próximos passos mais
            consistentes.
          </p>
          <p
            className="mt-3.5 mx-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.22)",
              color: "#6D28D9",
              fontWeight: 500,
            }}
          >
            <Sparkle className="h-3 w-3" strokeWidth={2.3} />
            A EVA sugere. Seu time aprova.
          </p>
        </motion.div>

        {/* Body: 2 colunas desktop / 1 col mobile. Em mobile mock vai PRIMEIRO
            (order-1) e pilares depois (order-2) — segue briefing. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-start">
          {/* COL ESQUERDA — pilares (mobile order-2, desktop order-1) */}
          <div className="space-y-8 order-2 lg:order-1">
            <Reveal>
              <div className="flex items-center gap-4 pb-2">
                <EvaPhotoAvatar size="md" ring="subtle" />
                <div>
                  <p
                    className="text-[10.5px] uppercase mb-1"
                    style={{
                      letterSpacing: "0.12em",
                      color: "#6D28D9",
                      fontWeight: 700,
                    }}
                  >
                    Camada comercial assistida
                  </p>
                  <p
                    className="text-[15px]"
                    style={{ color: "#0B1220", fontWeight: 600 }}
                  >
                    Mais que um chat, uma operação inteira.
                  </p>
                </div>
              </div>
            </Reveal>

            <StaggerContainer
              className="space-y-3.5"
              stagger={0.08}
              duration={0.5}
            >
              <PillarCard
                icon={MessageSquare}
                title="Analisa conversas"
                body="Identifica intenção, fit, urgência e objeções em cada lead."
              />
              <PillarCard
                icon={Workflow}
                title="Sugere próximos passos"
                body="Resposta, follow-up, criação de oportunidade e handoff."
              />
              <PillarCard
                icon={Brain}
                title="Usa o contexto da agência"
                body="Serviços, ICP, tom de voz, objeções e playbooks cadastrados."
              />
              <PillarCard
                icon={BookOpen}
                title="Aprende com materiais aprovados"
                body="Você adiciona o material. Nada entra no contexto sem aprovação."
              />
            </StaggerContainer>

            {/* CTA */}
            {onCTAClick && (
              <Reveal delay={0.1}>
                <button
                  onClick={onCTAClick}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] text-white transition-all hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                    fontWeight: 600,
                    boxShadow: "0 8px 22px -4px rgba(37,99,235,0.45)",
                  }}
                >
                  Ver a EVA em ação
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Reveal>
            )}
          </div>

          {/* COL DIREITA — fluxo de 3 cards (mobile order-1, desktop order-2) */}
          <Reveal delay={0.15} duration={0.7} className="order-1 lg:order-2">
            <FlowMock />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PillarCard — card pequeno na coluna esquerda
// ─────────────────────────────────────────────────────────────────────────────

function PillarCard({
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
      className="rounded-2xl p-5 sm:p-6 bg-white hover-lift"
      style={{
        border: "1px solid #D9E2EC",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.045)",
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.18)",
          }}
        >
          <Icon className="h-4.5 w-4.5 text-[#2563EB]" strokeWidth={2.1} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[15.5px] sm:text-[16px] mb-1.5"
            style={{
              color: "#0B1220",
              fontWeight: 600,
              letterSpacing: "-0.012em",
              lineHeight: 1.3,
            }}
          >
            {title}
          </p>
          <p
            className="text-[13.5px] sm:text-[14px]"
            style={{ color: "rgba(10,10,10,0.55)", lineHeight: 1.5 }}
          >
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowMock — 3 cards em sequência: Contexto → Análise → Ação
// ─────────────────────────────────────────────────────────────────────────────

function FlowMock() {
  return (
    <div className="space-y-3">
      <FlowCard
        index={1}
        accent="#2563EB"
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
        accent="#7C3AED"
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
        accent="#10B981"
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
      className="rounded-2xl p-5 sm:p-6 bg-white relative overflow-hidden"
      style={{
        border: "1px solid #D9E2EC",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 14px 36px -10px rgba(15,23,42,0.08)",
      }}
    >
      {/* Accent strip à esquerda */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />

      <div className="flex items-start gap-4">
        {/* Número */}
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-bold"
          style={{
            background: `${accent}14`,
            border: `1px solid ${accent}40`,
            color: accent,
          }}
        >
          {index}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[10.5px] uppercase mb-1"
            style={{
              letterSpacing: "0.12em",
              color: accent,
              fontWeight: 700,
            }}
          >
            {eyebrow}
          </p>
          <p
            className="text-[15px] sm:text-[16px] mb-3"
            style={{
              color: "#0B1220",
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
                    style={{ color: "rgba(10,10,10,0.55)" }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} style={{ color: accent }} />
                    {it.label}
                  </span>
                  <span style={{ color: "#0B1220", fontWeight: 600 }}>
                    {it.value}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Quote (mensagem analisada) */}
          {quote && (
            <div
              className="rounded-lg px-3 py-2.5 mb-3 text-[13px]"
              style={{
                background: "rgba(10,10,10,0.04)",
                border: "1px solid rgba(10,10,10,0.06)",
                color: "rgba(10,10,10,0.65)",
                fontStyle: "italic",
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
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-all"
                  style={{
                    background: primary ? "rgba(37,99,235,0.06)" : "rgba(10,10,10,0.03)",
                    border: `1px solid ${primary ? "rgba(37,99,235,0.22)" : "rgba(10,10,10,0.06)"}`,
                  }}
                >
                  <ActionIcon
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.2}
                    style={{ color: primary ? "#2563EB" : "rgba(10,10,10,0.45)" }}
                  />
                  <span
                    className="text-[13px] truncate"
                    style={{
                      color: primary ? "#1D4ED8" : "rgba(10,10,10,0.65)",
                      fontWeight: primary ? 600 : 500,
                    }}
                  >
                    {label}
                  </span>
                  {primary && (
                    <span
                      className="ml-auto text-[10px] uppercase shrink-0"
                      style={{
                        color: "#2563EB",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Sugerido
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
// Connector — linha vertical conectando os 3 FlowCards
// ─────────────────────────────────────────────────────────────────────────────

function Connector() {
  return (
    <div className="flex justify-center" aria-hidden>
      <div
        className="h-6 w-[2px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(37,99,235,0.20), rgba(124,58,237,0.30), rgba(16,185,129,0.20))",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisPill — pill colorida pra análise da EVA
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "amber" | "green" | "neutral";
}) {
  const map = {
    blue: { bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.22)", text: "#1D4ED8" },
    amber: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", text: "#B45309" },
    green: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.28)", text: "#047857" },
    neutral: {
      bg: "rgba(148,163,184,0.10)",
      border: "rgba(148,163,184,0.28)",
      text: "rgba(10,10,10,0.55)",
    },
  };
  const c = map[tone];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {tone === "amber" && (
        <AlertCircle className="h-2.5 w-2.5" strokeWidth={2.5} />
      )}
      {children}
    </span>
  );
}
