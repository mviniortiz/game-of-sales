import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { WhatsAppConnectModal } from "@/components/inbox/WhatsAppConnectModal";
import { useWhatsappStatus, whatsappStatusKey } from "@/hooks/useWhatsappStatus";
import "./whatsappStatus.css";

// Pílula do topo do app com o estado real do WhatsApp. A queda do número é o que
// mais custa ao dono sem ele perceber: a retomada da EVA não chega, a prospecção
// para e as respostas dos clientes não entram. Em 16/10/2026 o chip caiu às 11h40
// e só foi notado às 12h25. Referência visual: "Up to date" da bluma.design.

function haQuanto(iso: string | null): string | null {
    if (!iso) return null;
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h} h`;
    return `desde ${new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
}

function hora(iso: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
}

export function WhatsappStatusPill({ soProblema = false }: { soProblema?: boolean }) {
    const { data } = useWhatsappStatus();
    const [qrAberto, setQrAberto] = useState(false);
    const queryClient = useQueryClient();
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();

    // Sem dado do vigia ainda: melhor não mostrar nada do que chutar "conectado".
    if (!data || data.estado === "verificando") return null;
    // Na sidebar a pílula só aparece quando o número pede atenção.
    if (soProblema && data.estado === "conectado") return null;

    const { estado } = data;
    const quando = haQuanto(data.desde);
    const conferido = data.verificadoEm ? `Conferido às ${hora(data.verificadoEm)}` : "";
    const texto =
        estado === "conectado" ? (data.oficial ? "WhatsApp oficial conectado" : "WhatsApp conectado")
        : estado === "conectando" ? "Conectando WhatsApp"
        : estado === "sem_conexao" ? "WhatsApp não conectado"
        : quando && quando !== "agora" ? `WhatsApp caiu ${quando}` : "WhatsApp desconectado";
    // No celular o topo é estreito: sai o "WhatsApp" e fica o que muda a decisão.
    const curto =
        estado === "conectando" ? "Conectando"
        : estado === "sem_conexao" ? "Sem WhatsApp"
        : quando && quando !== "agora" ? `Caiu ${quando}` : "Desconectado";
    const acao = estado === "desconectado" ? "Reconectar" : estado === "sem_conexao" ? "Conectar" : null;
    const titulo = estado === "conectado"
        ? [data.numero ? `Número ${data.numero}` : "", quando && quando !== "agora" ? `conectado ${quando}` : "", conferido].filter(Boolean).join(" · ")
        : estado === "desconectado"
            ? `A EVA não manda retomada, a prospecção para e as respostas não chegam até reconectar. ${conferido}`.trim()
            : conferido;

    return (
        <>
            <span className={`wa-status wa-status--${estado}`} role="status" title={titulo}>
                <span className="wa-status__ponto" aria-hidden="true" />
                <span className="wa-status__texto wa-status__texto--longo">{texto}</span>
                {estado !== "conectado" && <span className="wa-status__texto wa-status__texto--curto" aria-hidden="true">{curto}</span>}
                {acao && (
                    <button type="button" className="wa-status__acao" onClick={() => setQrAberto(true)}>
                        {acao}
                    </button>
                )}
            </span>
            {acao && (
                <WhatsAppConnectModal
                    open={qrAberto}
                    onClose={() => setQrAberto(false)}
                    onConnected={() => { void queryClient.invalidateQueries({ queryKey: whatsappStatusKey(activeCompanyId || companyId) }); }}
                />
            )}
        </>
    );
}
