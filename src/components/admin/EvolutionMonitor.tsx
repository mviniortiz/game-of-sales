// Monitor do WhatsApp (só super admin): o servidor Whatsmiau responde? Quais
// números estão conectados e quais caíram? Caídos primeiro, que é o que pede ação.
// A antiga "RAM estimada" saiu: era só a quantidade de números vezes um valor
// fixo, de um servidor (VPS Oracle) que nem é mais o usado.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowsClockwise, Trash, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "./admin.css";

interface InstanceInfo {
    instanceName: string;
    state: string;
    connected: boolean;
    userId: string | null;
    userName: string | null;
    avatarUrl: string | null;
    companyId: string | null;
    companyName: string | null;
}

interface MonitorData {
    success: boolean;
    evolutionOnline: boolean;
    error?: string;
    instances: InstanceInfo[];
}

const ESTADO: Record<string, string> = {
    open: "Conectado",
    connecting: "Conectando",
    close: "Caído",
    closed: "Caído",
};

const iniciais = (nome: string) =>
    nome
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

// Ordem de quem pede atenção: caído com dono, sem dono, conectando, conectado.
const peso = (i: InstanceInfo) => (i.connected ? 3 : !i.userName ? 1 : i.state === "connecting" ? 2 : 0);

export const EvolutionMonitor = () => {
    const { activeCompanyId } = useTenant();
    const [apagando, setApagando] = useState<InstanceInfo | null>(null);
    const [ocupado, setOcupado] = useState(false);

    const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<MonitorData>({
        queryKey: ["evolution-monitor"],
        queryFn: async () => {
            const r = await supabase.functions.invoke("evolution-whatsapp", {
                body: { action: "monitor", companyId: activeCompanyId },
            });
            if (r.error) throw new Error(r.error.message);
            return r.data as MonitorData;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const numeros = useMemo(() => [...(data?.instances ?? [])].sort((a, b) => peso(a) - peso(b)), [data]);
    const conectados = numeros.filter((i) => i.connected).length;
    const semDono = numeros.filter((i) => !i.userName).length;
    const caidos = numeros.length - conectados - numeros.filter((i) => !i.connected && !i.userName).length;
    const online = data?.evolutionOnline ?? false;
    const hora = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

    const apagar = async () => {
        if (!apagando) return;
        setOcupado(true);
        const r = await supabase.functions.invoke("evolution-whatsapp", {
            body: { action: "deleteInstance", companyId: activeCompanyId, targetInstanceName: apagando.instanceName },
        });
        setOcupado(false);
        if (r.error) {
            toast.error(r.error.message || "Não deu para apagar a conexão.");
            return;
        }
        toast.success("Conexão apagada.");
        setApagando(null);
        void refetch();
    };

    return (
        <div className="va">
            <div className="va-barra">
                <p className="va-topo__texto" role="status">
                    {isLoading ? (
                        "Verificando o servidor…"
                    ) : (
                        <>
                            Servidor do WhatsApp <b>{online ? "respondendo" : "fora do ar"}</b>
                            {hora && ` · atualizado às ${hora}`}
                        </>
                    )}
                </p>
                <button type="button" className="va-btn va-btn--leve ml-auto" onClick={() => void refetch()} disabled={isFetching}>
                    <ArrowsClockwise size={15} aria-hidden className={isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
                    Atualizar
                </button>
            </div>

            {data && !online && (
                <div className="va-alerta va-entra" role="alert">
                    <WarningCircle size={20} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
                    <div>
                        <b>O servidor do WhatsApp não respondeu</b>
                        <span>{data.error || "Ninguém recebe nem manda mensagem até ele voltar. Confira o serviço no Railway."}</span>
                    </div>
                </div>
            )}

            {data && (
                <div className="va-numeros va-entra">
                    <div className="va-numero" data-tom={conectados > 0 ? "bom" : undefined}>
                        <span>Conectados</span>
                        <b>{conectados}</b>
                    </div>
                    <div className="va-numero" data-tom={caidos > 0 ? "ruim" : undefined}>
                        <span>Caídos</span>
                        <b>{caidos}</b>
                    </div>
                    <div className="va-numero">
                        <span>Sem dono</span>
                        <b>{semDono}</b>
                    </div>
                </div>
            )}

            {isLoading && <div className="va-tabela"><div className="va-vazio">Carregando os números…</div></div>}

            {data && (
                <section
                    className="va-tabela"
                    aria-label="Números de WhatsApp"
                    style={{ "--va-cols": "minmax(0,1.3fr) minmax(0,1fr) 130px 32px", "--va-cols-cel": "minmax(0,1fr) auto 32px" } as React.CSSProperties}
                >
                    <div className="va-tabela__cab" aria-hidden>
                        <span>Número</span>
                        <span>Empresa</span>
                        <span>Estado</span>
                        <span />
                    </div>
                    {numeros.length === 0 ? (
                        <div className="va-vazio">
                            <b>Nenhum número conectado ainda</b>
                            Eles aparecem aqui quando uma empresa lê o QR Code.
                        </div>
                    ) : (
                        numeros.map((i, k) => {
                            const tom = i.connected ? "bom" : i.userName ? "ruim" : undefined;
                            return (
                                <div key={i.instanceName} className="va-linha va-entra-linha" style={{ "--i": k } as React.CSSProperties}>
                                    <span className="va-celula">
                                        <span className="va-avatar" data-redondo aria-hidden>
                                            {i.avatarUrl ? <img src={i.avatarUrl} alt="" /> : i.userName ? iniciais(i.userName) : "?"}
                                        </span>
                                        <span className="va-meio">
                                            <b>{i.userName || "Sem dono"}</b>
                                            <span>{i.instanceName}</span>
                                        </span>
                                    </span>
                                    <span className="va-texto va-texto--cinza" data-some-no-cel>
                                        {i.companyName || "Sem empresa"}
                                    </span>
                                    <span>
                                        <span className="va-chip" data-tom={tom}>
                                            {i.userName ? ESTADO[i.state] ?? i.state : "Sobrando"}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        className="va-icone va-icone--perigo"
                                        aria-label={`Apagar a conexão ${i.instanceName}`}
                                        title="Apagar conexão"
                                        onClick={() => setApagando(i)}
                                    >
                                        <Trash size={16} aria-hidden />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </section>
            )}

            <AlertDialog open={!!apagando} onOpenChange={(o) => !o && setApagando(null)}>
                <AlertDialogContent className="va-vars">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apagar a conexão de {apagando?.userName || apagando?.instanceName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O número sai do servidor e para de receber mensagens no Vyzon. Para voltar, a empresa lê o QR Code de novo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void apagar();
                            }}
                            disabled={ocupado}
                            className="va-btn va-btn--perigo"
                        >
                            {ocupado ? "Apagando…" : "Apagar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
