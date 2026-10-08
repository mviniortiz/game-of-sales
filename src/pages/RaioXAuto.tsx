// /raio-x: o Raio-X automático, a parte grátis do Vyzon. A pessoa conecta o
// WhatsApp, a EVA espera o histórico chegar e monta o relatório (edge
// raio-x-build, modo dono), que abre em /relatorio/:token para ela conferir.
// Nada é enviado para cliente nenhum.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { useLeituraHistorico } from "@/hooks/useLeituraHistorico";
import { EncontroProgress } from "@/components/brand/EncontroProgress";
import { WhatsAppConnectModal } from "@/components/inbox/WhatsAppConnectModal";
import { Bolha, Leitura, type Msg } from "@/components/eva/ConversaEva";
import { APP_HOME } from "@/config/routes";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const BTN_PRIMARY = `inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0B1220] px-5 text-[15px] font-semibold text-white transition-all duration-150 ${EASE} hover:bg-[#1F2A3B] active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none`;

type Fase = "inicio" | "conectar" | "lendo" | "montando" | "erro";

export default function RaioXAuto() {
    const navigate = useNavigate();
    const { profile, companyId: authCompanyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const companyId = activeCompanyId || authCompanyId || null;
    const wa = useWhatsappConnection();
    const { conversas, aguardar, vivo } = useLeituraHistorico(companyId);
    const [fase, setFase] = useState<Fase>("inicio");
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [conectar, setConectar] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const iniciou = useRef(false);
    const fimRef = useRef<HTMLDivElement>(null);
    const fala = (...novas: Msg[]) => setMsgs((m) => [...m, ...novas]);
    const nome = (profile?.nome || "").split(" ")[0];

    useEffect(() => {
        document.title = "Raio-X do seu WhatsApp | Vyzon";
    }, []);

    useEffect(() => {
        if (wa.loading || iniciou.current) return;
        iniciou.current = true;
        setMsgs([
            {
                de: "eva",
                texto: `Oi${nome ? `, ${nome}` : ""}. Eu sou a EVA. Vou ler as propostas que vocês mandaram pelo WhatsApp nos últimos 90 dias e te mostrar quanto está parado, com a retomada pronta das maiores.`,
            },
            { de: "eva", texto: "Leva uns 3 minutos. Eu só leio: nada é enviado para cliente nenhum." },
        ]);
        if (wa.connected) {
            void montar(false);
        } else {
            setFase("conectar");
            fala({ de: "eva", texto: "Para começar, conecta o WhatsApp que você usa para mandar proposta." });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wa.loading]);

    useEffect(() => {
        fimRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "end" });
    }, [msgs, fase, conversas]);

    async function montar(acabouDeConectar: boolean) {
        setFase("lendo");
        fala({ de: "eva", texto: acabouDeConectar ? "Conectou. Estou lendo suas conversas." : "Seu WhatsApp já está conectado. Estou lendo suas conversas." });
        await aguardar();
        if (!vivo.current) return;
        setFase("montando");
        fala({ de: "eva", texto: "Achei as conversas. Agora estou separando as propostas e escrevendo a retomada das maiores." });
        try {
            const { data, error } = await supabase.functions.invoke("raio-x-build", { body: {} });
            if (!vivo.current) return;
            const token = (data as { token?: string } | null)?.token;
            if (token) {
                navigate(`/relatorio/${token}`);
                return;
            }
            const msg = (data as { message?: string } | null)?.message;
            throw new Error(msg || error?.message || "falhou");
        } catch (e) {
            if (!vivo.current) return;
            const texto = e instanceof Error && /3 Raio-X/.test(e.message) ? e.message : "Não consegui montar o Raio-X agora. Tente de novo em alguns minutos.";
            setErro(texto);
            setFase("erro");
            fala({ de: "eva", texto });
        }
    }

    const passo = fase === "inicio" || fase === "conectar" ? 1 : 2;
    const rotulo = fase === "conectar" || fase === "inicio" ? "Passo 2 de 3 · Conectar o WhatsApp" : "Passo 3 de 3 · Seu Raio-X";

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--vyz-bg)] text-[var(--vyz-text-primary)]">
            <header className="shrink-0 border-b border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
                <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <EncontroProgress step={passo} total={3} size={34} />
                        <div className="min-w-0">
                            <p className="text-[14px] font-semibold leading-tight">Raio-X do seu WhatsApp</p>
                            <p className="truncate text-[12px] text-[var(--vyz-text-muted)]">{rotulo}</p>
                        </div>
                    </div>
                    {(fase === "conectar" || fase === "erro") && (
                        <Link to={APP_HOME} className="rounded-full px-3 py-2 text-[13px] font-medium text-[var(--vyz-text-muted)] hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-strong)]">
                            Fazer depois
                        </Link>
                    )}
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-6 pt-6">
                    {msgs.map((m, i) => (
                        <Bolha key={i} de={m.de}>{m.texto}</Bolha>
                    ))}
                    {fase === "lendo" && <Leitura conversas={conversas} />}
                    {fase === "montando" && <Leitura conversas={conversas} />}
                    <div ref={fimRef} />
                </div>
            </main>

            <footer className="shrink-0 border-t border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
                <div className="mx-auto w-full max-w-2xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {fase === "conectar" && (
                        <div className="flex flex-col gap-2">
                            <button type="button" onClick={() => setConectar(true)} className={BTN_PRIMARY}>
                                Conectar meu WhatsApp
                            </button>
                            <p className="text-center text-[12px] text-[var(--vyz-text-muted)]">Você lê um QR Code no celular, como no WhatsApp Web.</p>
                        </div>
                    )}
                    {(fase === "lendo" || fase === "montando") && (
                        <p className="py-2 text-center text-[13px] text-[var(--vyz-text-muted)]">Costuma levar menos de 3 minutos. Pode deixar esta tela aberta.</p>
                    )}
                    {fase === "erro" && (
                        <button
                            type="button"
                            onClick={() => {
                                setErro(null);
                                void montar(false);
                            }}
                            disabled={!!erro && /3 Raio-X/.test(erro)}
                            className={BTN_PRIMARY}
                        >
                            Tentar de novo
                        </button>
                    )}
                </div>
            </footer>

            <WhatsAppConnectModal
                open={conectar}
                onClose={() => setConectar(false)}
                onConnected={() => {
                    setConectar(false);
                    void montar(true);
                }}
            />
        </div>
    );
}
