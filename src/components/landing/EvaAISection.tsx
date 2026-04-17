import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BarChart3, TrendingUp, Users, Zap, ArrowRight } from "lucide-react";

// ─── Typing animation for the mockup ──────────────────────────────

function useTypingDemo(lines: string[], delay: number) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "typing" | "done">("waiting");
  const startedRef = useRef(false);

  const start = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase("typing");
  };

  useEffect(() => {
    if (phase !== "typing" || lineIdx >= lines.length) {
      if (lineIdx >= lines.length) setPhase("done");
      return;
    }

    const fullLine = lines[lineIdx];

    if (charIdx <= fullLine.length) {
      const timeout = setTimeout(() => {
        setCurrentLine(fullLine.slice(0, charIdx));
        setCharIdx((c) => c + 1);
      }, 14 + Math.random() * 12);
      return () => clearTimeout(timeout);
    }

    // Line complete — push and move to next
    const pause = setTimeout(() => {
      setVisibleLines((prev) => [...prev, fullLine]);
      setCurrentLine("");
      setCharIdx(0);
      setLineIdx((l) => l + 1);
    }, 300);
    return () => clearTimeout(pause);
  }, [phase, lineIdx, charIdx, lines]);

  return { visibleLines, currentLine, phase, start };
}

// ─── Static Eva Atom (landing-safe, no framer-motion dependency) ──

function EvaAtom({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="eva-landing-orb" x1="14" y1="10" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="20" rx="16" ry="6" stroke="#8b5cf6" strokeOpacity="0.3" strokeWidth="1" fill="none" />
      <ellipse cx="20" cy="20" rx="6" ry="16" stroke="#8b5cf6" strokeOpacity="0.18" strokeWidth="0.8" fill="none" transform="rotate(-30 20 20)" />
      <circle cx="20" cy="20" r="5.5" fill="url(#eva-landing-orb)" />
      <circle cx="18" cy="18" r="2" fill="white" opacity="0.25" />
      <circle cx="35" cy="17" r="1.8" fill="#a78bfa" opacity="0.7" />
      <circle cx="11" cy="7" r="1.2" fill="#a78bfa" opacity="0.4" />
    </svg>
  );
}

// ─── Chat mockup ──────────────────────────────────────────────────

const DEMO_QUESTION = "Quem mais vendeu este mês?";

const DEMO_LINES = [
  "**Carlos M.** lidera com R$ 28.400 em 14 vendas.",
  "Logo atrás, **Ana L.** com R$ 21.800 (11 vendas).",
  "",
  "O ticket médio do Carlos está 18% acima da média.",
  "Ana tem a melhor taxa de conversão: 34%.",
];

function ChatMockup({ onCTAClick }: { onCTAClick?: () => void }) {
  const { visibleLines, currentLine, phase, start } = useTypingDemo(DEMO_LINES, 800);
  const [questionVisible, setQuestionVisible] = useState(false);
  const mockRef = useRef<HTMLDivElement>(null);

  // Trigger animation on scroll into view
  useEffect(() => {
    const el = mockRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setQuestionVisible(true);
          setTimeout(start, 1200);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const renderLine = (text: string) => {
    if (!text.trim()) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div ref={mockRef} className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <EvaAtom size={28} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.9)" }}>Eva</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ fontWeight: "var(--fw-semibold)", background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>AI</span>
          </div>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            {phase === "typing" ? "Analisando..." : "Online agora"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="px-5 py-5 space-y-4 min-h-[220px]">
        {/* User question */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={questionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3 }}
          className="flex justify-end"
        >
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] text-white leading-relaxed max-w-[75%]" style={{ background: "rgba(139,92,246,0.7)" }}>
            {DEMO_QUESTION}
          </div>
        </motion.div>

        {/* Eva response */}
        {(visibleLines.length > 0 || currentLine) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
          >
            <EvaAtom size={24} className="shrink-0 mt-0.5" />
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] leading-relaxed max-w-[85%]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
              {visibleLines.map((line, i) => (
                line.trim() ? (
                  <p key={i} className="mb-1">{renderLine(line)}</p>
                ) : (
                  <div key={i} className="h-2" />
                )
              ))}
              {currentLine && (
                <p className="mb-0">
                  {renderLine(currentLine)}
                  <span
                    className="inline-block w-[2px] h-3.5 ml-0.5 align-middle rounded-full"
                    style={{ background: "#a78bfa", animation: "pulse 1s ease-in-out infinite" }}
                  />
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Chart + Highlights after done */}
        {phase === "done" && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="pl-9"
            >
              <DemoBarChart />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-1.5 pl-9"
            >
              {["#1 Carlos M. — R$ 28.4k", "Melhor conversão: Ana L. (34%)"].map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px]"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)", color: "rgba(255,255,255,0.5)", fontWeight: "var(--fw-medium)" }}
                >
                  <Zap className="h-2.5 w-2.5" style={{ color: "#a78bfa" }} />
                  {h}
                </span>
              ))}
            </motion.div>
          </>
        )}
      </div>

      {/* Input mockup */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="flex-1 text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>Pergunte algo pra Eva...</span>
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.5)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Demo chart (pure CSS, no Recharts dep) ─────────────────────

const DEMO_CHART_DATA = [
  { name: "Carlos M.", value: 28400, color: "#8b5cf6" },
  { name: "Ana L.", value: 21800, color: "#10b981" },
  { name: "Rafael S.", value: 18200, color: "#f59e0b" },
  { name: "Julia P.", value: 12600, color: "#06b6d4" },
];

function DemoBarChart() {
  const maxValue = Math.max(...DEMO_CHART_DATA.map((d) => d.value));

  return (
    <div
      className="rounded-xl p-3.5 mt-2"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
        Ranking — Faturamento do mês
      </p>
      <div className="space-y-2.5">
        {DEMO_CHART_DATA.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2.5">
            <span className="text-[11px] w-[72px] truncate shrink-0" style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
              {item.name}
            </span>
            <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                className="h-full rounded-md"
                style={{ background: item.color, opacity: 0.8 }}
              />
            </div>
            <span className="text-[10px] tabular-nums shrink-0" style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500, minWidth: 42 }}>
              R$ {(item.value / 1000).toFixed(1)}k
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature pills ────────────────────────────────────────────────

const FEATURES = [
  { icon: BarChart3, label: "Gráficos gerados por IA na hora" },
  { icon: Users, label: "Ranking e performance do time" },
  { icon: TrendingUp, label: "Tendências e previsões" },
  { icon: Sparkles, label: "Insights automáticos" },
];

// ─── Fade-in ──────────────────────────────────────────────────────

const fadeIn = {
  initial: { y: 20 } as const,
  whileInView: { y: 0 } as const,
  viewport: { once: true } as const,
  transition: { duration: 0.5 },
};

// ─── Main Section ─────────────────────────────────────────────────

export function EvaAISection({ onCTAClick }: { onCTAClick?: () => void }) {
  return (
    <section id="eva" className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "#06080a" }}>
      {/* Violet aurora spotlight from top */}
      <div
        className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,92,246,0.14) 0%, rgba(139,92,246,0.04) 35%, transparent 70%)",
        }}
      />
      {/* Central violet ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 60%)" }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div className="text-center mb-16" {...fadeIn}>
          <span
            className="inline-flex items-center gap-1.5 text-xs rounded-full px-4 py-1.5 mb-5"
            style={{
              fontWeight: "var(--fw-semibold)",
              letterSpacing: "0.08em",
              color: "#a78bfa",
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            <Sparkles className="h-3 w-3" />
            SUA ANALISTA COM IA
          </span>

          <h2
            className="font-heading mb-4"
            style={{
              fontWeight: "var(--fw-bold)",
              fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Pergunte pra{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
            >
              Eva
            </span>
            . Ela responde com seus dados.
          </h2>

          <p
            className="max-w-xl mx-auto"
            style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(255,255,255,0.4)" }}
          >
            Faturamento, ranking, metas, tendências — é só perguntar.{" "}
            <span style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.75)" }}>
              Sem filtro, sem relatório manual.
            </span>
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: Chat mockup */}
          <motion.div
            initial={{ x: -20 }}
            whileInView={{ x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ChatMockup onCTAClick={onCTAClick} />
          </motion.div>

          {/* Right: Features + CTA */}
          <motion.div
            initial={{ x: 20 }}
            whileInView={{ x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Feature list */}
            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ y: 10 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: "#a78bfa" }} />
                  </div>
                  <span className="text-sm" style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.7)" }}>
                    {label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Value prop */}
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)" }}
            >
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                Disponível nos planos{" "}
                <span style={{ fontWeight: "var(--fw-semibold)", color: "#a78bfa" }}>Plus</span> e{" "}
                <span style={{ fontWeight: "var(--fw-semibold)", color: "#a78bfa" }}>Pro</span>.
                {" "}Consultas ilimitadas no Pro — pergunte sobre faturamento, meta, ranking, produto e tendência.
              </p>
            </div>

            {/* CTA */}
            {onCTAClick && (
              <button
                onClick={onCTAClick}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  fontWeight: "var(--fw-semibold)",
                  boxShadow: "0 4px 20px rgba(139,92,246,0.25)",
                }}
              >
                Experimentar a Eva
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* CSS for cursor blink */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
