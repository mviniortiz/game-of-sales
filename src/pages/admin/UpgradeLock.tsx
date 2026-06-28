// Upgrade Lock — tela cheia quando o trial expira. Light-first, azul da marca.
// A seleção de plano + checkout é o componente compartilhado PlanPicker (mesmo
// usado no /upgrade). Pagamento aprovado → desbloqueia e volta pro app.
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { useAuth } from "@/contexts/AuthContext";
import { PlanPicker } from "@/components/billing/PlanPicker";

export default function UpgradeLock() {
    const navigate = useNavigate();
    const { refreshProfile, signOut } = useAuth();

    useEffect(() => {
        trackEvent(FUNNEL_EVENTS.TRIAL_EXPIRED);
    }, []);

    const handlePaid = async () => {
        try { await refreshProfile(); } catch { /* não crítico */ }
        toast.success("Assinatura ativada! Bem-vindo de volta.");
        navigate("/inicio");
    };

    return (
        <div className="min-h-screen flex flex-col relative" style={{ background: "#F8FAFC" }}>
            {/* Saída do lock: volta pro login (signOut leva a /auth). Sem isso a
                tela é um beco sem saída a não ser pagar. */}
            <button
                type="button"
                onClick={() => void signOut()}
                title="Sair da conta e voltar ao login"
                className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors hover:bg-white"
                style={{ color: "#64748B", border: "1px solid #E2E8F0", background: "rgba(255,255,255,0.7)" }}
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar
            </button>
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
                <ThemeLogo className="h-9 mb-8" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
                >
                    <Lock className="h-7 w-7" style={{ color: "#2563EB" }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-10 max-w-lg"
                >
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2.5" style={{ color: "#0B1220" }}>
                        Seu período de teste acabou
                    </h1>
                    <p className="text-[15px] leading-relaxed" style={{ color: "#64748B" }}>
                        Escolha um plano pra continuar com o Vyzon. Seus dados, pipeline e
                        conversas continuam salvos, é só reativar.
                    </p>
                </motion.div>

                <PlanPicker onPaid={handlePaid} />

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-[13px] mt-9 text-center"
                    style={{ color: "#94A3B8" }}
                >
                    Dúvidas?{" "}
                    <a href="mailto:suporte@vyzon.com.br" className="font-semibold hover:underline" style={{ color: "#2563EB" }}>
                        suporte@vyzon.com.br
                    </a>
                </motion.p>
            </div>
        </div>
    );
}
