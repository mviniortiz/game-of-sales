import { ReportAgent } from "@/components/admin/ReportAgent";
import { usePlan } from "@/hooks/usePlan";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SAMPLE_MESSAGES = [
  { role: "user", text: "Quem mais vendeu este mês?" },
  { role: "eva", text: "Este mês, o ranking de vendas ficou assim:\n\n1. Marina Silva — R$ 48.200 (23 vendas)\n2. Carlos Souza — R$ 35.800 (18 vendas)\n3. Ana Costa — R$ 29.400 (15 vendas)\n\nA Marina lidera com 35% do faturamento total." },
  { role: "user", text: "Qual o produto mais vendido?" },
  { role: "eva", text: "O produto campeão é o Curso Avançado de Marketing Digital com 42 vendas e R$ 62.580 em receita. Ele representa 38% do total." },
];

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
                <div className="h-8 w-8 rounded-full bg-violet-500/20 shrink-0" />
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-[rgba(255,255,255,0.05)] text-zinc-300"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Overlay card */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-[#0a0c10] border border-[rgba(255,255,255,0.08)] text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <EvaAvatar size={40} thinking={false} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Conheça a Eva
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Sua analista de vendas com IA. Pergunte sobre faturamento, metas, ranking, produtos e tendências — ela consulta seus dados reais e responde em segundos.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Disponível nos planos Plus e Pro</span>
            </div>

            <button
              onClick={() => navigate("/admin?tab=billing")}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Fazer upgrade
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-[11px] text-zinc-600">
              Plus: 30 consultas/dia · Pro: ilimitado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto h-full">
      <ReportAgent />
    </div>
  );
};

export default AgenteRelatorios;
