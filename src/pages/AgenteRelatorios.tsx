import { ReportAgent } from "@/components/admin/ReportAgent";
import { usePlan } from "@/hooks/usePlan";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import { Lock, Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// Tela /eva — EVA Comercial (F4D.2, 2026-05-19)
//
// Identidade visual oficial: header com avatar XL + título "EVA Comercial" +
// subtítulo oficial + selo "IA Comercial" discreto. ReportAgent existente
// reposicionado como card "Chat com dados" sem reescrever lógica.
//
// REGRA "EVA inside Vyzon" (memory: feedback_eva_visual_rule):
// Roxo só como assinatura (avatar ring, selos micro). CTA principal azul.
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_MESSAGES = [
  { role: "user", text: "Quem mais vendeu este mês?" },
  { role: "eva", text: "Este mês, o ranking de vendas ficou assim:\n\n1. Marina Silva — R$ 48.200 (23 vendas)\n2. Carlos Souza — R$ 35.800 (18 vendas)\n3. Ana Costa — R$ 29.400 (15 vendas)\n\nA Marina lidera com 35% do faturamento total." },
  { role: "user", text: "Qual o produto mais vendido?" },
  { role: "eva", text: "O produto campeão é o Curso Avançado de Marketing Digital com 42 vendas e R$ 62.580 em receita. Ele representa 38% do total." },
];

// ─── EvaPaywall (planos free) ────────────────────────────────────────────

const EvaPaywall = () => {
  const navigate = useNavigate();

  return (
    <div className="relative h-full flex flex-col">
      {/* Blurred fake chat */}
      <div className="flex-1 overflow-hidden relative">
        <div className="blur-[6px] pointer-events-none select-none p-6 space-y-4 opacity-60">
          {SAMPLE_MESSAGES.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "eva" && (
                <div className="h-8 w-8 rounded-full shrink-0" style={{ background: "rgba(124,58,237,0.15)" }} />
              )}
              <div
                className="max-w-[75%] rounded-2xl px-4 py-3 text-sm"
                style={{
                  background: msg.role === "user" ? "rgba(37,99,235,0.10)" : "#F1F5F9",
                  color: msg.role === "user" ? "#1D4ED8" : "#0B1220",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Overlay card */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "rgba(243,246,250,0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            className="max-w-md w-full mx-4 p-8 rounded-2xl text-center"
            style={{
              background: "#FFFFFF",
              border: "1px solid #D9E2EC",
              boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.045)",
            }}
          >
            <div className="flex justify-center mb-5">
              <EvaPhotoAvatar size="lg" ring="glow" />
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold" style={{ color: "#0B1220", fontFamily: "var(--font-heading)" }}>
                  EVA Comercial
                </h2>
                <span
                  className="text-[9.5px] uppercase px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(124,58,237,0.10)",
                    color: "#6D28D9",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  IA Comercial
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Sua IA para analisar conversas, qualificar leads e recomendar próximos passos.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs mb-5" style={{ color: "#64748B" }}>
              <Lock className="h-3.5 w-3.5" />
              <span>Disponível nos planos Plus e Pro</span>
            </div>

            <button
              onClick={() => navigate("/upgrade?plan=plus")}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                boxShadow: "0 4px 12px -4px rgba(37,99,235,0.4)",
              }}
            >
              <Sparkles className="h-4 w-4" />
              Fazer upgrade
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-[11px] mt-3" style={{ color: "#94A3B8" }}>
              Plus: 30 consultas/dia · Pro: ilimitado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Header oficial da tela /eva ─────────────────────────────────────────

function EvaPageHeader() {
  return (
    <div
      className="rounded-2xl px-6 sm:px-8 py-6 sm:py-7 relative overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid #D9E2EC",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.045)",
      }}
    >
      {/* Top accent line lilás muito sutil */}
      <div
        className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.35) 50%, transparent)",
        }}
      />

      <div className="flex items-center gap-5 sm:gap-6">
        <EvaPhotoAvatar size="xl" ring="glow" className="hidden sm:block" />
        <EvaPhotoAvatar size="lg" ring="glow" className="sm:hidden" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1
              className="text-[22px] sm:text-[28px] font-bold tracking-tight"
              style={{ color: "#0B1220", letterSpacing: "-0.025em" }}
            >
              EVA Comercial
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
              style={{
                background: "rgba(124,58,237,0.10)",
                color: "#6D28D9",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              IA Comercial
            </span>
          </div>
          <p
            className="text-[13.5px] sm:text-sm max-w-2xl"
            style={{ color: "#64748B", lineHeight: 1.55 }}
          >
            Sua IA para analisar conversas, qualificar leads e recomendar próximos passos.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────

const AgenteRelatorios = () => {
  const { needsUpgrade } = usePlan();
  const blocked = needsUpgrade("eva");

  if (blocked) {
    return (
      <div className="h-full max-w-4xl mx-auto">
        <EvaPaywall />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto">
      <EvaPageHeader />

      {/* Card "Chat com dados" — envolve ReportAgent existente sem alterar lógica */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "#FFFFFF",
          border: "1px solid #D9E2EC",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.045)",
          minHeight: "calc(100vh - 16rem)",
        }}
      >
        {/* Header do card */}
        <div
          className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderBottom: "1px solid #EEF2F7" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(37,99,235,0.18)",
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" style={{ color: "#2563EB" }} strokeWidth={2.25} />
            </div>
            <div>
              <p
                className="text-[14px] font-semibold leading-tight"
                style={{ color: "#0B1220" }}
              >
                Chat com dados
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>
                Pergunte sobre faturamento, ranking, metas, conversões e tendências.
              </p>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded uppercase shrink-0"
            style={{
              background: "rgba(16,185,129,0.10)",
              color: "#047857",
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: "#10B981" }} />
            Em produção
          </span>
        </div>

        {/* ReportAgent existente — lógica intacta */}
        <div className="flex-1 overflow-hidden">
          <ReportAgent />
        </div>
      </div>
    </div>
  );
};

export default AgenteRelatorios;
