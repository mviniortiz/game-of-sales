// ─────────────────────────────────────────────────────────────────────────────
// F2.12.2 (2026-05-20) — OperationFlowSection v4 (dark premium graphite)
//
// Redesign completo: base graphite #070B12 (não preto chapado), overlays
// radiais direcionais (azul atrás do mock, roxo perto da EVA, emerald sutil),
// vignette nas bordas, bridge curta sem faixa cinza no topo, progress
// indicator vertical, mock dominante com cross-fade entre steps.
//
// Sticky storytelling via Framer Motion useScroll (sem hijacking).
// prefers-reduced-motion: renderiza static, step 4 (estado final).
// Mobile <lg: stack simples sem altura gigante.
//
// SEM image gen. Mock 100% HTML/CSS.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Sparkle,
  CheckCheck,
  Workflow,
  CalendarCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Reveal } from "./animation/Reveal";

type StepKey = "inbox" | "eva" | "approval" | "pipeline" | "agenda";

interface Step {
  key: StepKey;
  index: number;
  label: string;
  title: string;
  body: string;
  icon: typeof MessageCircle;
  accent: string;
}

const STEPS: Step[] = [
  {
    key: "inbox",
    index: 1,
    label: "WhatsApp",
    title: "Lead chega pelo WhatsApp",
    body: "A mensagem entra organizada na Inbox Comercial, com origem e histórico.",
    icon: MessageCircle,
    accent: "#4A8CE8",
  },
  {
    key: "eva",
    index: 2,
    label: "EVA",
    title: "EVA analisa e sugere",
    body: "A IA lê a conversa com o contexto da agência e sugere o próximo passo.",
    icon: Sparkle,
    accent: "#A78BFA",
  },
  {
    key: "approval",
    index: 3,
    label: "Aprovação humana",
    title: "Seu time aprova",
    body: "A EVA sugere. O humano decide. Use, edite ou ignore antes de agir.",
    icon: CheckCheck,
    accent: "#60A5FA",
  },
  {
    key: "pipeline",
    index: 4,
    label: "Pipeline",
    title: "Oportunidade anda no pipeline",
    body: "Quando o lead faz sentido, vira oportunidade com etapa, valor e próxima ação.",
    icon: Workflow,
    accent: "#2563EB",
  },
  {
    key: "agenda",
    index: 5,
    label: "Central de Comando",
    title: "Gestor acompanha pela Central",
    body: "Prioridades, gargalos e conversas que precisam de atenção, sem perguntar no grupo.",
    icon: CalendarCheck,
    accent: "#10B981",
  },
];

const GRAPHITE = "#070B12";

export const OperationFlowSection = () => {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden" style={{ background: GRAPHITE }}>
      {/* Bridge curta no topo (white → graphite) — sem faixa cinza pesada */}
      <div
        className="absolute top-0 inset-x-0 pointer-events-none"
        style={{
          height: "100px",
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 30%, " + GRAPHITE + " 100%)",
        }}
        aria-hidden
      />
      {/* Bridge inferior — F2.12.3: 120 → 80px, alinhado com runway menor */}
      <div
        className="absolute bottom-0 inset-x-0 pointer-events-none"
        style={{
          height: "80px",
          background:
            "linear-gradient(180deg, " + GRAPHITE + " 0%, #F1F5F9 70%, #FFFFFF 100%)",
        }}
        aria-hidden
      />

      <DarkBackdrop />

      {/* Desktop sticky storytelling (lg+) */}
      <div className="hidden lg:block">
        {prefersReduced ? <DesktopStatic /> : <DesktopSticky />}
      </div>
      {/* Mobile/tablet stack (<lg) */}
      <div className="block lg:hidden">
        <MobileStack />
      </div>
    </section>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// DarkBackdrop — composição premium graphite + overlays direcionais + vignette
// ───────────────────────────────────────────────────────────────────────────

function DarkBackdrop() {
  return (
    <>
      {/* Vignette superior+inferior pra dar profundidade nas bordas */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.40) 100%)",
        }}
        aria-hidden
      />
      {/* Glow azul direcional atrás do mock (lado direito) — luz de produto */}
      <div
        className="absolute pointer-events-none hidden lg:block"
        style={{
          top: "18%",
          right: "-5%",
          width: "950px",
          height: "780px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.06) 35%, transparent 65%)",
          filter: "blur(10px)",
        }}
        aria-hidden
      />
      {/* Glow lilás sutil perto do box EVA */}
      <div
        className="absolute pointer-events-none hidden lg:block"
        style={{
          top: "42%",
          right: "20%",
          width: "500px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 60%)",
          filter: "blur(6px)",
        }}
        aria-hidden
      />
      {/* Glow emerald muito sutil no rodapé (agenda) */}
      <div
        className="absolute pointer-events-none hidden lg:block"
        style={{
          bottom: "10%",
          right: "10%",
          width: "600px",
          height: "350px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)",
          filter: "blur(8px)",
        }}
        aria-hidden
      />
      {/* Grid sutil */}
      <div
        className="absolute inset-y-[4%] inset-x-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
        aria-hidden
      />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// SectionHeader (compartilhado entre desktop/mobile)
// ───────────────────────────────────────────────────────────────────────────

function SectionHeader() {
  return (
    <Reveal className="text-center mb-12 lg:mb-14 max-w-3xl mx-auto">
      <span
        className="inline-flex items-center gap-2 text-[11px] sm:text-[12px] uppercase rounded-full px-3.5 py-1.5 mb-6"
        style={{
          background: "rgba(37,99,235,0.14)",
          border: "1px solid rgba(37,99,235,0.40)",
          color: "#93C5FD",
          fontWeight: 700,
          letterSpacing: "0.15em",
        }}
      >
        Como funciona
      </span>
      <h2
        className="font-satoshi mx-auto text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-[-0.04em] text-white leading-[1.04]"
        style={{ maxWidth: "920px" }}
      >
        Do WhatsApp ao pipeline,
        <br />
        <span className="bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#A78BFA] bg-clip-text text-transparent">
          sem perder o contexto.
        </span>
      </h2>
      <p
        className="mt-6 mx-auto"
        style={{
          fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
          lineHeight: 1.55,
          color: "#CBD5E1",
          fontWeight: 400,
          maxWidth: "740px",
        }}
      >
        Conversa entra pela Inbox, a EVA analisa o contexto, seu time aprova o
        próximo passo e a oportunidade segue no pipeline.
      </p>
      <p
        className="mt-4 mx-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
        style={{
          background: "rgba(124,58,237,0.12)",
          border: "1px solid rgba(124,58,237,0.30)",
          fontSize: "12.5px",
          color: "#C4B5FD",
          fontWeight: 500,
        }}
      >
        <Sparkle className="h-3.5 w-3.5" strokeWidth={2.3} />
        A EVA continua assistida: ela analisa e sugere, mas seu time aprova
        antes de qualquer ação.
      </p>
    </Reveal>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// DESKTOP STICKY (lg+) — Framer Motion useScroll
// ───────────────────────────────────────────────────────────────────────────

function DesktopSticky() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  // F2.12.4 2026-05-20: cálculo manual de progresso porque o useScroll mapeia
  // o intervalo total da section, mas o sticky "solta" antes do progress
  // chegar em 1. Resultado: steps 4-5 só ativavam DEPOIS de o conteúdo ter
  // saído do topo do viewport. Aqui o progresso é normalizado pelo intervalo
  // em que o sticky está realmente visível (section_height - viewport_h).
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!sectionRef.current || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const rect = sectionRef.current!.getBoundingClientRect();
        const sectionTopAbs = window.scrollY + rect.top;
        const stickyVisibleScroll = Math.max(1, rect.height - window.innerHeight);
        const scrolled = window.scrollY - sectionTopAbs;
        const p = Math.max(0, Math.min(1, scrolled / stickyVisibleScroll));

        let next = 0;
        if (p >= 0.20) next = 1;
        if (p >= 0.40) next = 2;
        if (p >= 0.60) next = 3;
        if (p >= 0.80) next = 4;
        setActiveStep((prev) => (prev === next ? prev : next));
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    // F2.12.4: runway 170 → 150vh. Cada step ocupa ~10vh do scroll real
    // (intervalo em que sticky está visível = 150-100 = 50vh / 5 steps).
    <div ref={sectionRef} className="relative" style={{ minHeight: "150vh" }}>
      <div className="sticky top-[8vh] pt-8 pb-8">
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10">
          <SectionHeader />
          <div className="grid grid-cols-[460px_minmax(0,1fr)] gap-12 xl:gap-16 items-start">
            <StepList activeStep={activeStep} />
            <ProductMock activeStep={activeStep} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopStatic() {
  return (
    <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 pt-24 pb-24">
      <SectionHeader />
      <div className="grid grid-cols-[460px_minmax(0,1fr)] gap-12 xl:gap-16 items-start">
        <div className="space-y-3">
          {STEPS.map((step) => (
            <StepCard key={step.key} step={step} active />
          ))}
        </div>
        <ProductMock activeStep={4} />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// MOBILE STACK (<lg)
// ───────────────────────────────────────────────────────────────────────────

function MobileStack() {
  const [activeStep, setActiveStep] = useState(0);
  return (
    <div className="relative z-10 max-w-[640px] mx-auto px-4 sm:px-6 pt-28 pb-28">
      <SectionHeader />
      <div className="mb-8">
        <ProductMock activeStep={activeStep} />
      </div>
      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <StepCard
            key={step.key}
            step={step}
            active={i === activeStep}
            onSelect={() => setActiveStep(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// StepList — lista com progress indicator vertical sutil
// ───────────────────────────────────────────────────────────────────────────

function StepList({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative">
      {/* Progress vertical sutil à esquerda — F2.12.2 polish */}
      <div
        className="absolute left-[7px] top-3 bottom-3 w-[2px] hidden lg:block rounded-full"
        style={{ background: "rgba(148,163,184,0.10)" }}
        aria-hidden
      />
      <motion.div
        className="absolute left-[7px] top-3 w-[2px] hidden lg:block rounded-full"
        style={{
          background:
            "linear-gradient(180deg, #4A8CE8 0%, #2563EB 50%, #A78BFA 100%)",
          boxShadow: "0 0 12px rgba(37,99,235,0.45)",
        }}
        animate={{
          height: `${((activeStep + 1) / STEPS.length) * 100}%`,
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden
      />

      <div className="space-y-3 lg:pl-7">
        {STEPS.map((step, i) => (
          <StepCard key={step.key} step={step} active={i === activeStep} />
        ))}
      </div>
    </div>
  );
}

function StepCard({
  step,
  active,
  onSelect,
}: {
  step: Step;
  active: boolean;
  onSelect?: () => void;
}) {
  const Icon = step.icon;
  const Tag = onSelect ? "button" : "div";
  return (
    <Tag
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      className="w-full text-left rounded-2xl p-5 sm:p-6 transition-all duration-300"
      style={{
        background: active ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.72)",
        border: `1px solid ${active ? "rgba(37,99,235,0.65)" : "rgba(148,163,184,0.20)"}`,
        boxShadow: active
          ? "0 0 0 1px rgba(37,99,235,0.35), 0 18px 44px -12px rgba(37,99,235,0.50)"
          : "0 1px 2px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: active ? `${step.accent}30` : "rgba(255,255,255,0.05)",
            border: `1px solid ${active ? `${step.accent}66` : "rgba(255,255,255,0.10)"}`,
            color: active ? step.accent : "#94A3B8",
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10.5px] uppercase"
              style={{
                color: active ? step.accent : "#94A3B8",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              Etapa {step.index} · {step.label}
            </span>
          </div>
          <p
            className="text-[16px] sm:text-[17px] mb-2"
            style={{
              color: active ? "#F8FAFC" : "#E2E8F0",
              fontWeight: 600,
              letterSpacing: "-0.012em",
              lineHeight: 1.28,
            }}
          >
            {step.title}
          </p>
          <p
            className="text-[13.5px] sm:text-[14px]"
            style={{
              color: active ? "#CBD5E1" : "#94A3B8",
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            {step.body}
          </p>
        </div>
      </div>
    </Tag>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// ProductMock — F2.12.2: maior, glass premium, cross-fade entre steps
// ───────────────────────────────────────────────────────────────────────────

function ProductMock({ activeStep }: { activeStep: number }) {
  const stepKey: StepKey = STEPS[activeStep]?.key ?? "inbox";
  const ring = (target: StepKey) =>
    stepKey === target ? "0 0 0 2px rgba(37,99,235,0.60)" : "none";

  return (
    <motion.div
      className="rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(148,163,184,0.24)",
        boxShadow:
          "0 40px 100px -24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 80px -20px rgba(37,99,235,0.20)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* TOP BAR */}
      <div
        className="px-7 py-5 flex items-center gap-4 border-b transition-shadow"
        style={{
          borderColor: "rgba(148,163,184,0.16)",
          boxShadow: ring("inbox"),
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: "#EF4444" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#F59E0B" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#10B981" }} />
        </div>
        <div className="flex items-center gap-3.5 ml-2 flex-1 min-w-0">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-[15px] font-semibold text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
              boxShadow: "0 4px 14px -2px rgba(37,99,235,0.45)",
            }}
          >
            CR
          </div>
          <div className="min-w-0">
            <p className="text-[16px] truncate" style={{ color: "#F8FAFC", fontWeight: 600 }}>
              Carla Ribeiro
            </p>
            <p className="text-[13px] truncate" style={{ color: "#94A3B8" }}>
              Meta Ads · LP Estética · 22:47
            </p>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`badges-${stepKey}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end"
          >
            {stepKey === "inbox" && <Pill tone="blue">Lead novo</Pill>}
            {(stepKey === "eva" || stepKey === "approval") && (
              <>
                <Pill tone="green">ICP fit</Pill>
                <Pill tone="purple">Intenção detectada</Pill>
                <Pill tone="blue">Urgência 30d</Pill>
              </>
            )}
            {stepKey === "pipeline" && <Pill tone="blue">Oportunidade criada</Pill>}
            {stepKey === "agenda" && <Pill tone="green">Central atualizada</Pill>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* THREAD */}
      <div className="px-7 py-7 space-y-5">
        <Bubble side="left">
          Oi, vi o anúncio e queria entender os planos.
        </Bubble>

        <div style={{ boxShadow: ring("eva"), borderRadius: "14px" }}>
          <EvaSuggestionBox
            text="Pergunte sobre orçamento e urgência antes de marcar a demo."
            highlight={stepKey === "eva"}
            showActions={
              stepKey === "approval" || stepKey === "pipeline" || stepKey === "agenda"
            }
          />
        </div>

        <div style={{ boxShadow: ring("approval"), borderRadius: "20px" }}>
          <Bubble side="right" approved>
            Perfeito, Carla. Hoje vocês já investem em tráfego ou estão
            começando agora?
          </Bubble>
        </div>
      </div>

      {/* PIPELINE */}
      <div
        className="px-7 py-5 border-t transition-shadow"
        style={{
          borderColor: "rgba(148,163,184,0.16)",
          background: "rgba(0,0,0,0.25)",
          boxShadow: ring("pipeline"),
        }}
      >
        <div className="flex items-center gap-1.5 mb-3.5">
          <Workflow className="h-3.5 w-3.5" style={{ color: "#94A3B8" }} />
          <span
            className="text-[11px] uppercase"
            style={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.12em" }}
          >
            Pipeline
          </span>
          <AnimatePresence mode="wait">
            {stepKey === "approval" && (
              <motion.span
                key="ready-human"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <Pill tone="blue">Pronto para humano</Pill>
              </motion.span>
            )}
            {stepKey === "pipeline" && (
              <motion.span
                key="opp-created"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto text-[12px]"
                style={{ color: "#93C5FD", fontWeight: 600 }}
              >
                Oportunidade criada no pipeline
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <MiniPipeline stepKey={stepKey} />
      </div>

      {/* AGENDA + PERFORMANCE */}
      <div
        className="px-7 py-5 border-t grid grid-cols-3 gap-4 transition-all"
        style={{
          borderColor: "rgba(148,163,184,0.16)",
          boxShadow: ring("agenda"),
          opacity: stepKey === "agenda" ? 1 : 0.55,
        }}
      >
        <MiniBlock
          icon={<CalendarCheck className="h-3.5 w-3.5" />}
          label="Próxima demo"
          value="Ter 21/05 · 14:30"
          tone="blue"
        />
        <MiniBlock
          icon={<Check className="h-3.5 w-3.5" />}
          label="Meta da semana"
          value="68% atingida"
          tone="green"
        />
        <MiniBlock
          icon={<MessageCircle className="h-3.5 w-3.5" />}
          label="Follow-up pendente"
          value="2 leads"
          tone="blue"
        />
      </div>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Subcomponentes do mock
// ───────────────────────────────────────────────────────────────────────────

function Bubble({
  children,
  side,
  approved,
}: {
  children: React.ReactNode;
  side: "left" | "right";
  approved?: boolean;
}) {
  const isRight = side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[78%] px-4.5 py-3 rounded-2xl"
        style={{
          background: isRight
            ? "linear-gradient(135deg, #2563EB, #4A8CE8)"
            : "rgba(255,255,255,0.07)",
          color: isRight ? "#FFFFFF" : "#F1F5F9",
          fontSize: "14px",
          lineHeight: 1.45,
          borderTopRightRadius: isRight ? "6px" : undefined,
          borderTopLeftRadius: !isRight ? "6px" : undefined,
          border: isRight
            ? "1px solid rgba(255,255,255,0.10)"
            : "1px solid rgba(255,255,255,0.08)",
          fontWeight: isRight ? 500 : 400,
          padding: "12px 18px",
          boxShadow: isRight ? "0 8px 24px -6px rgba(37,99,235,0.35)" : "none",
        }}
      >
        {children}
        {approved && (
          <p
            className="mt-2 text-[11px] inline-flex items-center gap-1"
            style={{ color: "rgba(255,255,255,0.88)", fontWeight: 600 }}
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
            Aprovado e enviado pelo humano
          </p>
        )}
      </div>
    </div>
  );
}

function EvaSuggestionBox({
  text,
  showActions,
  highlight,
}: {
  text: string;
  showActions: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-start gap-3.5 transition-all"
      style={{
        background: highlight
          ? "rgba(124,58,237,0.20)"
          : "rgba(124,58,237,0.12)",
        border: `1px solid ${highlight ? "rgba(124,58,237,0.60)" : "rgba(124,58,237,0.32)"}`,
        boxShadow: highlight ? "0 12px 32px -10px rgba(124,58,237,0.40)" : "none",
      }}
    >
      <Sparkle className="h-4.5 w-4.5 mt-0.5 shrink-0" strokeWidth={2.2} style={{ color: "#C4B5FD" }} />
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] uppercase mb-1.5"
          style={{ color: "#C4B5FD", fontWeight: 700, letterSpacing: "0.12em" }}
        >
          Sugestão EVA · Preview
        </p>
        <p className="text-[13.5px]" style={{ color: "#F1F5F9", lineHeight: 1.5 }}>
          {text}
        </p>
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                <MockBtn primary>Usar resposta</MockBtn>
                <MockBtn>Editar</MockBtn>
                <MockBtn>Ignorar</MockBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MockBtn({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-md text-[12px]"
      style={{
        background: primary
          ? "linear-gradient(135deg, #2563EB, #4A8CE8)"
          : "rgba(255,255,255,0.07)",
        color: primary ? "#FFFFFF" : "#E2E8F0",
        fontWeight: 600,
        border: primary
          ? "1px solid rgba(74,140,232,0.55)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: primary ? "0 6px 18px -4px rgba(37,99,235,0.50)" : "none",
      }}
    >
      {children}
    </span>
  );
}

function MiniPipeline({ stepKey }: { stepKey: StepKey }) {
  const stages = [
    { name: "Novo lead", active: true },
    {
      name: "Qualificação",
      active: stepKey === "pipeline" || stepKey === "agenda",
    },
    { name: "Demo marcada", active: stepKey === "agenda" },
  ];
  return (
    <div className="flex items-center gap-2.5">
      {stages.map((stage, i) => (
        <div key={stage.name} className="flex items-center gap-2.5 flex-1">
          <motion.div
            className="flex-1 rounded-lg px-4 py-2.5 text-center"
            animate={{
              background: stage.active ? "rgba(37,99,235,0.22)" : "rgba(255,255,255,0.04)",
            }}
            transition={{ duration: 0.3 }}
            style={{
              border: `1px solid ${stage.active ? "rgba(37,99,235,0.55)" : "rgba(148,163,184,0.16)"}`,
              color: stage.active ? "#93C5FD" : "#94A3B8",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: stage.active ? "0 6px 16px -6px rgba(37,99,235,0.35)" : "none",
            }}
          >
            {stage.name}
          </motion.div>
          {i < stages.length - 1 && (
            <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(148,163,184,0.5)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function MiniBlock({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "blue" | "green";
}) {
  const colorMap = {
    blue: { bg: "rgba(37,99,235,0.12)", border: "rgba(37,99,235,0.32)", text: "#93C5FD" },
    green: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.32)", text: "#6EE7B7" },
  };
  const c = colorMap[tone];
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: c.text }}>
        {icon}
        <span
          className="text-[10.5px] uppercase truncate"
          style={{ fontWeight: 700, letterSpacing: "0.10em" }}
        >
          {label}
        </span>
      </div>
      <p className="text-[14.5px]" style={{ color: "#F8FAFC", fontWeight: 600 }}>
        {value}
      </p>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "green" | "purple";
}) {
  const colorMap = {
    blue: { bg: "rgba(37,99,235,0.16)", border: "rgba(37,99,235,0.42)", text: "#BFDBFE" },
    green: { bg: "rgba(16,185,129,0.16)", border: "rgba(16,185,129,0.42)", text: "#A7F3D0" },
    purple: { bg: "rgba(124,58,237,0.16)", border: "rgba(124,58,237,0.42)", text: "#DDD6FE" },
  };
  const c = colorMap[tone];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px]"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
