// /raio-x: o Raio-X automático, a parte grátis do Vyzon. A pessoa conecta o
// WhatsApp, a EVA espera o histórico chegar e monta o relatório (edge
// raio-x-build, modo dono), que abre em /relatorio/:token para ela conferir.
// Nada é enviado para cliente nenhum.
//
// É um palco, não um chat: uma ação por vez e a EVA no centro mostrando o
// trabalho com números reais (mensagens, PDFs, nomes que chegam). Esperar vendo
// o trabalho acontecer parece mais curto e dá mais valor ao resultado do que
// ler balões. O fim é a revelação do número, antes do relatório.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { useLeituraHistorico } from "@/hooks/useLeituraHistorico";
import { VyzonMark } from "@/components/brand/VyzonMark";
import { WhatsAppConnectModal } from "@/components/inbox/WhatsAppConnectModal";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";
import { APP_HOME } from "@/config/routes";
import { raioXDismissKey } from "@/hooks/useEvaSetup";
import "./raioXPalco.css";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const BTN_PRIMARY = `inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0B1220] px-6 text-[15px] font-semibold text-white transition-all duration-150 ${EASE} hover:bg-[#1F2A3B] active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none sm:w-auto sm:min-w-[260px]`;

type Fase = "inicio" | "conectar" | "lendo" | "montando" | "pronto" | "erro";
type Resumo = { quotes: number; stuck: number; stuck_value: number; stuck_without_value: number; your_turn: number; descartadas?: number };

const ETAPAS = ["Conectar", "Ler", "Separar", "Pronto"];
const etapaDe: Record<Fase, number> = { inicio: 0, conectar: 0, lendo: 1, montando: 2, pronto: 3, erro: 2 };
const evaDe: Record<Fase, EvaBotState> = { inicio: "idle", conectar: "idle", lendo: "thinking", montando: "pondering", pronto: "happy", erro: "idle" };

const MONTANDO = [
    "Separando proposta de ficha técnica, boleto e comprovante…",
    "Vendo quem falou por último em cada conversa…",
    "Somando o que ficou parado…",
    "Escrevendo a retomada das maiores…",
];

const n = (v: number) => v.toLocaleString("pt-BR");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const semMovimento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Número que corre até o valor novo (contador ao vivo e a revelação final).
function useCorrida(alvo: number, ms = 700) {
    const [v, setV] = useState(alvo);
    const atual = useRef(alvo);
    useEffect(() => {
        if (semMovimento()) {
            atual.current = alvo;
            setV(alvo);
            return;
        }
        const de = atual.current;
        const t0 = performance.now();
        let raf = 0;
        const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / ms);
            const e = 1 - Math.pow(1 - p, 3);
            atual.current = Math.round(de + (alvo - de) * e);
            setV(atual.current);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [alvo, ms]);
    return v;
}

function Contador({ rotulo, valor }: { rotulo: string; valor: number }) {
    const v = useCorrida(valor);
    return (
        <div className="rx-contador flex flex-col items-center gap-0.5 rounded-2xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-2 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="text-[22px] font-semibold tabular-nums leading-none text-[var(--vyz-text-strong)] sm:text-[26px]">{n(v)}</span>
            <span className="text-[12px] text-[var(--vyz-text-muted)]">{rotulo}</span>
        </div>
    );
}

export default function RaioXAuto() {
    const navigate = useNavigate();
    const { profile, companyId: authCompanyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const companyId = activeCompanyId || authCompanyId || null;
    const wa = useWhatsappConnection();
    const { leitura, aguardar, vivo } = useLeituraHistorico(companyId);
    const [fase, setFase] = useState<Fase>("inicio");
    const [conectar, setConectar] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [resultado, setResultado] = useState<{ token: string; resumo: Resumo } | null>(null);
    const [giro, setGiro] = useState(0);
    const iniciou = useRef(false);
    const nome = (profile?.nome || "").split(" ")[0];

    useEffect(() => {
        document.title = "Raio-X do seu WhatsApp | Vyzon";
    }, []);

    useEffect(() => {
        if (wa.loading || iniciou.current) return;
        iniciou.current = true;
        if (wa.connected) void montar();
        else setFase("conectar");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wa.loading]);

    // O pensamento da EVA troca sozinho enquanto ela trabalha.
    useEffect(() => {
        if (fase !== "lendo" && fase !== "montando") return;
        const id = window.setInterval(() => setGiro((g) => g + 1), 2600);
        return () => window.clearInterval(id);
    }, [fase]);

    async function montar() {
        setFase("lendo");
        await aguardar();
        if (!vivo.current) return;
        setFase("montando");
        setGiro(0);
        try {
            const { data, error } = await supabase.functions.invoke("raio-x-build", { body: {} });
            if (!vivo.current) return;
            const d = data as { token?: string; summary?: Resumo; message?: string } | null;
            if (d?.token && d.summary) {
                setResultado({ token: d.token, resumo: d.summary });
                setFase("pronto");
                return;
            }
            throw new Error(d?.message || error?.message || "falhou");
        } catch (e) {
            if (!vivo.current) return;
            setErro(e instanceof Error && /3 Raio-X/.test(e.message) ? e.message : "Não consegui montar o Raio-X agora. Tente de novo em alguns minutos.");
            setFase("erro");
        }
    }

    const pensamento = (() => {
        if (fase === "montando") return MONTANDO[Math.min(giro, MONTANDO.length - 1)];
        if (fase !== "lendo") return "";
        if (leitura.mensagens === 0) return "Esperando o histórico chegar do seu WhatsApp…";
        const falas = [`Lendo ${n(leitura.mensagens)} mensagens de ${n(leitura.conversas)} conversas…`];
        if (leitura.pdfs > 0) falas.push(`Achei ${n(leitura.pdfs)} ${leitura.pdfs === 1 ? "PDF que você mandou" : "PDFs que você mandou"}. Vou ver quais são proposta.`);
        for (const x of leitura.nomes) falas.push(`Lendo a conversa com ${x}…`);
        return falas[giro % falas.length];
    })();

    const etapa = etapaDe[fase];
    const podeAdiar = fase === "conectar" || fase === "erro";

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--vyz-bg)] text-[var(--vyz-text-primary)]">
            <header className="shrink-0 border-b border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
                <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <VyzonMark size={30} />
                        <div className="min-w-0">
                            <p className="text-[14px] font-semibold leading-tight">Raio-X do seu WhatsApp</p>
                            <p className="truncate text-[12px] text-[var(--vyz-text-muted)]">{fase === "pronto" ? "Passo 3 de 3 · Pronto" : etapa === 0 ? "Passo 2 de 3 · Conectar o WhatsApp" : "Passo 3 de 3 · Seu Raio-X"}</p>
                        </div>
                    </div>
                    {podeAdiar && (
                        <button
                            type="button"
                            onClick={() => {
                                if (companyId) try { localStorage.setItem(raioXDismissKey(companyId), "1"); } catch { /* sem storage */ }
                                navigate(APP_HOME);
                            }}
                            className="rounded-full px-3 py-2 text-[13px] font-medium text-[var(--vyz-text-muted)] hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-strong)]"
                        >
                            Fazer depois
                        </button>
                    )}
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center px-5 pb-8 pt-6 text-center sm:pt-10">
                    <ol className="flex items-center gap-1.5 text-[12px] font-medium" aria-label="Etapas">
                        {ETAPAS.map((e, k) => (
                            <li key={e} className="flex items-center gap-1.5">
                                <span
                                    aria-current={k === etapa ? "step" : undefined}
                                    className={`rounded-full px-2.5 py-1 transition-colors duration-300 ${k < etapa ? "text-[var(--vyz-text-strong)]" : k === etapa ? "bg-[#0B1220] text-white" : "text-[var(--vyz-text-muted)]"}`}
                                >
                                    {k < etapa ? "✓ " : ""}{e}
                                </span>
                                {k < ETAPAS.length - 1 && <span className="h-px w-3 bg-[var(--vyz-border-strong)] sm:w-5" aria-hidden />}
                            </li>
                        ))}
                    </ol>

                    <div className="flex w-full flex-1 flex-col items-center justify-center pb-[6vh]">
                    <div className="rx-palco mt-8 flex flex-col items-center sm:mt-10">
                        <EvaBot state={fase === "pronto" && resultado && resultado.resumo.stuck > 0 ? "alert" : evaDe[fase]} size={112} label="EVA" />
                        <span className="eva-bot-floor mt-1 opacity-40" style={{ ["--s" as string]: "112px" }} aria-hidden />
                    </div>

                    <div className="mt-6 w-full" aria-live="polite">
                        {(fase === "inicio" || fase === "conectar") && (
                            <div className="rx-entra">
                                <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--vyz-text-strong)] sm:text-[28px]">
                                    {nome ? `${nome}, vou` : "Vou"} achar as propostas que ficaram paradas no seu WhatsApp.
                                </h1>
                                <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--vyz-text-muted)]">
                                    Leio os últimos 90 dias e te mostro quanto está parado, com a retomada pronta das maiores. Leva uns 3 minutos. Eu só leio: nada é enviado para cliente nenhum.
                                </p>
                                <div className="mt-7 flex flex-col items-center gap-2">
                                    <button type="button" onClick={() => setConectar(true)} disabled={fase === "inicio"} className={BTN_PRIMARY}>
                                        Conectar meu WhatsApp
                                    </button>
                                    <p className="text-[12px] text-[var(--vyz-text-muted)]">Por um código no celular ou pelo QR Code.</p>
                                </div>
                            </div>
                        )}

                        {(fase === "lendo" || fase === "montando") && (
                            <div>
                                <p key={pensamento} className="rx-pensamento mx-auto min-h-[3.2em] max-w-md text-[18px] font-medium leading-snug text-[var(--vyz-text-strong)] sm:text-[20px]">
                                    {pensamento}
                                </p>
                                <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2">
                                    <Contador rotulo="conversas" valor={leitura.conversas} />
                                    <Contador rotulo="mensagens" valor={leitura.mensagens} />
                                    <Contador rotulo="PDFs enviados" valor={leitura.pdfs} />
                                </div>
                                <p className="mt-6 text-[13px] text-[var(--vyz-text-muted)]">Costuma levar até 3 minutos. Pode deixar esta tela aberta.</p>
                            </div>
                        )}

                        {fase === "pronto" && resultado && <Revelacao resumo={resultado.resumo} onVer={() => navigate(`/relatorio/${resultado.token}`)} />}

                        {fase === "erro" && (
                            <div className="rx-entra">
                                <p className="mx-auto max-w-md text-[17px] font-medium leading-snug text-[var(--vyz-text-strong)]">{erro}</p>
                                <div className="mt-6 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setErro(null);
                                            void montar();
                                        }}
                                        disabled={!!erro && /3 Raio-X/.test(erro)}
                                        className={BTN_PRIMARY}
                                    >
                                        Tentar de novo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            </main>

            <WhatsAppConnectModal
                open={conectar}
                onClose={() => setConectar(false)}
                onConnected={() => {
                    setConectar(false);
                    void montar();
                }}
            />
        </div>
    );
}

function Revelacao({ resumo, onVer }: { resumo: Resumo; onVer: () => void }) {
    const valor = useCorrida(resumo.stuck_value, 1400);
    const temValor = resumo.stuck_value > 0;
    const titulo =
        resumo.stuck === 0
            ? resumo.quotes > 0
                ? `Achei ${resumo.quotes} ${resumo.quotes === 1 ? "proposta" : "propostas"}, e nenhuma está parada.`
                : "Não achei proposta parada nos últimos 90 dias."
            : null;
    return (
        <div className="rx-entra">
            {titulo ? (
                <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--vyz-text-strong)]">{titulo}</h1>
            ) : (
                <>
                    <p className="text-[15px] font-medium text-[var(--vyz-text-muted)]">Achei parado no seu WhatsApp</p>
                    {temValor ? (
                        <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[var(--vyz-text-strong)] sm:text-[56px]">{brl(valor)}</p>
                    ) : null}
                    <p className={`${temValor ? "mt-2 text-[17px]" : "mt-1 text-[32px] font-semibold"} text-[var(--vyz-text-strong)]`}>
                        em {resumo.stuck} {resumo.stuck === 1 ? "proposta parada" : "propostas paradas"}
                    </p>
                    {resumo.stuck_without_value > 0 && (
                        <p className="mt-2 text-[13px] text-[var(--vyz-text-muted)]">
                            {resumo.stuck_without_value} {resumo.stuck_without_value === 1 ? "delas veio" : "delas vieram"} sem valor no histórico. Você completa no relatório.
                        </p>
                    )}
                </>
            )}
            {resumo.your_turn > 0 && (
                <p className="mx-auto mt-4 w-fit rounded-full bg-[#FEF3C7] px-3 py-1.5 text-[13px] font-medium text-[#92400E]">
                    {resumo.your_turn} {resumo.your_turn === 1 ? "cliente está esperando" : "clientes estão esperando"} você responder
                </p>
            )}
            <div className="mt-7 flex justify-center">
                <button type="button" onClick={onVer} className={BTN_PRIMARY}>
                    Ver meu Raio-X
                </button>
            </div>
            <p className="mt-3 text-[12px] text-[var(--vyz-text-muted)]">Com a retomada pronta das maiores. Você confere e corrige.</p>
        </div>
    );
}
