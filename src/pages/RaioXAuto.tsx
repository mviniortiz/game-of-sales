// /raio-x: o Raio-X automático, a parte grátis do Vyzon. A pessoa conecta o
// WhatsApp, a Lume espera o histórico chegar e monta o relatório (edge
// raio-x-build, modo dono), que abre em /relatorio/:token para ela conferir.
// Nada é enviado para cliente nenhum.
//
// É um palco, não um chat: uma ação por vez e a Lume no centro mostrando o
// trabalho com números reais (mensagens, PDFs, nomes que chegam). Esperar vendo
// o trabalho acontecer parece mais curto e dá mais valor ao resultado do que
// ler balões. O fim é a revelação do número, antes do relatório.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { useLeituraHistorico } from "@/hooks/useLeituraHistorico";
import { VyzonMark } from "@/components/brand/VyzonMark";
import { WhatsAppConnectModal } from "@/components/inbox/WhatsAppConnectModal";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";
import { APP_HOME } from "@/config/routes";
import { EVA_SETUP_PATH, raioXDismissKey } from "@/hooks/useEvaSetup";
import { buscarVagaFundadora } from "@/hooks/useVagaFundadora";
import { fraseFundadora, type VagaFundadora } from "@/lib/fundadora";
import { PASSOS_PRIMEIRO_ACESSO, rotuloPasso, SO_LEIO } from "@/lib/primeiroAcesso";
import { logLandingEvent } from "@/lib/landingFunnel";
import { CONTACT, whatsappUrl } from "@/config/contact";
import { Check } from "lucide-react";
import "./raioXPalco.css";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const BTN_PRIMARY = `inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0B1220] px-6 text-[15px] font-semibold text-white transition-all duration-150 ${EASE} hover:bg-[#1F2A3B] active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none sm:w-auto sm:min-w-[260px]`;

type Fase = "inicio" | "conectar" | "lendo" | "montando" | "pronto" | "erro";
type Resumo = { quotes: number; stuck: number; stuck_value: number; stuck_without_value: number; your_turn: number; descartadas?: number };

// O primeiro acesso tem 3 passos, os mesmos do cadastro: a conta já foi feita.
// A configuração da Lume (/configurar-eva) vem depois, com nome próprio.
const ETAPAS = PASSOS_PRIMEIRO_ACESSO;
const etapaDe: Record<Fase, number> = { inicio: 1, conectar: 1, lendo: 2, montando: 2, pronto: 2, erro: 2 };
const evaDe: Record<Fase, EvaBotState> = { inicio: "idle", conectar: "idle", lendo: "thinking", montando: "pondering", pronto: "happy", erro: "idle" };

const MONTANDO = [
    "Separando proposta de ficha técnica, boleto e comprovante…",
    "Vendo quem falou por último em cada conversa…",
    "Somando o que ficou parado…",
    "Escrevendo a retomada das maiores…",
];

// Mesmo funil da home e do cadastro (landing_events, mesma sessão), com o
// passo em props.step: dá pra ver onde quem criou a conta para.
const FUNIL = "raio_x";
const medir = (evento: "view" | "cta_click" | "form_submit" | "form_error" | "whatsapp_click", props: Record<string, string | number> = {}) =>
    logLandingEvent(FUNIL, "solar", evento, props);

// O que pesa na hora de conectar o WhatsApp num site novo. Tudo confere com o
// produto: a leitura não envia nada, a saída para o lead sempre espera o dono
// responder no WhatsApp dele, e o aparelho aparece (e sai) em Aparelhos
// conectados, como o WhatsApp Web. A 1ª frase é a mesma do modal de conexão.
const GARANTIAS = [
    SO_LEIO,
    "Seu número e seu celular continuam iguais.",
    "Você desconecta quando quiser, em Aparelhos conectados.",
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

// Em dev, ?preview=conectar|lendo|pronto|fundadora abre a tela sem login.
const RESUMO_EXEMPLO: Resumo = { quotes: 23, stuck: 9, stuck_value: 187400, stuck_without_value: 2, your_turn: 2 };

export default function RaioXAuto() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const preview = import.meta.env.DEV ? params.get("preview") : null;
    const { profile, companyId: authCompanyId } = useAuth();
    const { activeCompanyId, recarregarEmpresas } = useTenant();
    const companyId = activeCompanyId || authCompanyId || null;
    const wa = useWhatsappConnection();
    const { leitura, aguardar, vivo } = useLeituraHistorico(companyId);
    const [fase, setFase] = useState<Fase>("inicio");
    const [conectar, setConectar] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [resultado, setResultado] = useState<{ token: string; resumo: Resumo } | null>(null);
    const [giro, setGiro] = useState(0);
    const [vaga, setVaga] = useState<VagaFundadora | null>(null);
    const iniciou = useRef(false);
    const nome = (profile?.nome || "").split(" ")[0];

    useEffect(() => {
        document.title = "Raio-X do seu WhatsApp | Vyzon";
    }, []);

    useEffect(() => {
        if (!preview) return;
        iniciou.current = true;
        if (preview === "lendo") setFase("lendo");
        else if (preview === "pronto" || preview === "fundadora") {
            setResultado({ token: "preview", resumo: RESUMO_EXEMPLO });
            if (preview === "fundadora") setVaga({ fundadora: true, numero: 3, vagas_restantes: 7, limite: 10 });
            setFase("pronto");
        } else setFase("conectar");
    }, [preview]);

    useEffect(() => {
        if (preview || wa.loading || iniciou.current) return;
        iniciou.current = true;
        medir("view", { step: wa.connected ? "ja_conectado" : "conectar" });
        if (wa.connected) void montar();
        else setFase("conectar");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wa.loading]);

    // O pensamento da Lume troca sozinho enquanto ela trabalha.
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
                medir("form_submit", { step: "pronto", paradas: d.summary.stuck });
                // A vaga de fundadora sai no banco quando o WhatsApp conecta
                // (trigger em channel_connections). Lê aqui, com a empresa de
                // novo, para o plano liberado valer no resto do app.
                const v = await buscarVagaFundadora(companyId);
                if (!vivo.current) return;
                if (v?.fundadora) {
                    medir("form_submit", { step: "fundadora", numero: v.numero ?? 0 });
                    recarregarEmpresas();
                }
                setVaga(v);
                setResultado({ token: d.token, resumo: d.summary });
                setFase("pronto");
                return;
            }
            throw new Error(d?.message || error?.message || "falhou");
        } catch (e) {
            if (!vivo.current) return;
            medir("form_error", { step: "montar", reason: (e instanceof Error ? e.message : "erro").slice(0, 60) });
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
                            <p className="truncate text-[12px] text-[var(--vyz-text-muted)]">{rotuloPasso(etapa)}</p>
                        </div>
                    </div>
                    {podeAdiar && (
                        <button
                            type="button"
                            onClick={() => {
                                medir("cta_click", { step: "adiar", fase });
                                if (companyId) try { localStorage.setItem(raioXDismissKey(companyId), "1"); } catch { /* sem storage */ }
                                navigate(APP_HOME);
                            }}
                            className="vz-toque rounded-full px-3 py-2 text-[13px] font-medium text-[var(--vyz-text-muted)] hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-strong)]"
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
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors duration-300 ${k < etapa ? "text-[var(--vyz-text-strong)]" : k === etapa ? "bg-[#0B1220] text-white" : "text-[var(--vyz-text-muted)]"}`}
                                >
                                    {k < etapa && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                                    {e}
                                </span>
                                {k < ETAPAS.length - 1 && <span className="h-px w-3 bg-[var(--vyz-border-strong)] sm:w-5" aria-hidden />}
                            </li>
                        ))}
                    </ol>

                    <div className="flex w-full flex-1 flex-col items-center justify-center pb-[6vh]">
                    <div className="rx-palco mt-8 flex flex-col items-center sm:mt-10">
                        <EvaBot state={fase === "pronto" && resultado && resultado.resumo.stuck > 0 ? "alert" : evaDe[fase]} size={112} label="Lume" />
                        <span className="eva-bot-floor mt-1 opacity-40" style={{ ["--s" as string]: "112px" }} aria-hidden />
                    </div>

                    <div className="mt-6 w-full" aria-live="polite">
                        {(fase === "inicio" || fase === "conectar") && (
                            <div className="rx-entra">
                                <p className="mb-2 text-[14px] font-medium text-[var(--vyz-text-muted)]">Oi, eu sou a Lume, a assistente do Vyzon.</p>
                                <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--vyz-text-strong)] sm:text-[28px]">
                                    {nome ? `${nome}, vou` : "Vou"} achar as propostas que ficaram paradas no seu WhatsApp.
                                </h1>
                                <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--vyz-text-muted)]">
                                    Leio os últimos 90 dias e te mostro quanto está parado, com a retomada pronta das maiores. Leva uns 3 minutos.
                                </p>
                                <ul className="mx-auto mt-5 flex w-fit flex-col gap-2 text-left">
                                    {GARANTIAS.map((g) => (
                                        <li key={g} className="flex items-start gap-2.5 text-[14px] leading-snug text-[var(--vyz-text-strong)]">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--vyz-accent)]" strokeWidth={2.5} aria-hidden />
                                            {g}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-7 flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            medir("cta_click", { step: "conectar" });
                                            setConectar(true);
                                        }}
                                        disabled={fase === "inicio"}
                                        className={BTN_PRIMARY}
                                    >
                                        Conectar meu WhatsApp
                                    </button>
                                    <p className="text-[12px] text-[var(--vyz-text-muted)]">Por um código no celular ou pelo QR Code.</p>
                                    <a
                                        href={whatsappUrl("Oi, Markus. Travei pra conectar o WhatsApp no Raio-X.", CONTACT.whatsappNumber)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => medir("whatsapp_click", { step: "ajuda" })}
                                        className="vz-toque mt-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--vyz-text-muted)] underline underline-offset-4 hover:text-[var(--vyz-text-strong)]"
                                    >
                                        Travou? Fale com o Markus
                                    </a>
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

                        {fase === "pronto" && resultado && (
                    <Revelacao
                        resumo={resultado.resumo}
                        vaga={vaga}
                        onVer={() => {
                            medir("cta_click", { step: "ver_relatorio" });
                            navigate(`/relatorio/${resultado.token}`);
                        }}
                        onConfigurar={() => medir("cta_click", { step: "configurar_lume" })}
                    />
                )}

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
                funil={FUNIL}
                open={conectar}
                onClose={() => setConectar(false)}
                onConnected={() => {
                    setConectar(false);
                    if (preview) return;
                    void montar();
                }}
            />
        </div>
    );
}

function Revelacao({ resumo, vaga, onVer, onConfigurar }: { resumo: Resumo; vaga: VagaFundadora | null; onVer: () => void; onConfigurar: () => void }) {
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
            {vaga?.fundadora && vaga.numero && (
                <div className="mx-auto mt-7 max-w-md rounded-2xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5">
                    <p className="text-[15px] font-semibold leading-snug text-[var(--vyz-text-strong)]">{fraseFundadora(vaga.numero, vaga.limite)}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--vyz-text-muted)]">
                        O próximo passo é me contar o que vocês vendem, para as retomadas saírem no tom da sua empresa.
                    </p>
                    <Link
                        to={EVA_SETUP_PATH}
                        onClick={onConfigurar}
                        className="mt-3 inline-flex rounded-full text-[14px] font-semibold text-[var(--vyz-accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
                    >
                        Configurar a Lume
                    </Link>
                </div>
            )}
        </div>
    );
}
