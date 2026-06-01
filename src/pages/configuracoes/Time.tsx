import { Users, ArrowUpRight, UserPlus, ShieldCheck, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// A gestão de pessoas foi unificada em Gestão → Equipe (lista + criar + admin +
// performance). Esta página vira um atalho pra evitar duplicação.
export default function Time() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-[#E6EDF5] bg-white p-8 text-center shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
        <p className="text-sm text-muted-foreground">Apenas admins gerenciam acessos da equipe.</p>
      </div>
    );
  }

  const hints = [
    { icon: UserPlus, title: "Adicionar vendedores", desc: "Convide o time por e-mail" },
    { icon: ShieldCheck, title: "Permissões de admin", desc: "Defina quem administra" },
    { icon: Trophy, title: "Performance e ranking", desc: "Acompanhe cada vendedor" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E6EDF5] bg-white overflow-hidden shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
        <div className="px-5 py-3.5 border-b border-[#E6EDF5] flex items-center gap-2.5">
          <Users className="h-4 w-4 text-[#2563EB]" />
          <h2 className="text-[13px] font-semibold text-[#0B1220]">Acesso da equipe</h2>
        </div>
        <div className="px-5 py-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.10)" }}>
              <Users className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#0B1220" }}>
                A gestão de equipe agora vive em um só lugar
              </p>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "#64748B" }}>
                Adicionar vendedores, definir quem é admin, ver performance e ranking ficou tudo
                centralizado em <span className="font-semibold" style={{ color: "#0B1220" }}>Gestão → Equipe</span>.
              </p>
              <Button
                onClick={() => navigate("/admin")}
                size="sm"
                className="mt-4 gap-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              >
                Ir para Equipe
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6 pt-5" style={{ borderTop: "1px solid #E6EDF5" }}>
            {hints.map((h) => (
              <div key={h.title} className="rounded-xl px-3.5 py-3" style={{ background: "#F8FAFC", border: "1px solid #E6EDF5" }}>
                <h.icon className="h-4 w-4 text-[#2563EB] mb-1.5" />
                <p className="text-[12.5px] font-semibold" style={{ color: "#0B1220" }}>{h.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
