// /configurar-eva: a EVA aprende a empresa numa conversa de uns 3 minutos.
// Lê o site (edge eva-site-context), pergunta só o que faltou e mostra um
// resumo editável; nada é gravado antes do "É isso, salvar".
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EvaBot } from "@/components/eva/EvaBot";
import { EncontroProgress } from "@/components/brand/EncontroProgress";
import { WhatsAppConnectModal } from "@/components/inbox/WhatsAppConnectModal";
import { brl } from "@/lib/quoteText";
import { useEvaSetup, setupDismissKey } from "@/hooks/useEvaSetup";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { APP_HOME } from "@/config/routes";
import {
    composeContext,
    perguntasPendentes,
    resumoInicial,
    TICKETS,
    TONS,
    TRAVAS,
    type Financiamento,
    type SetupResumo,
    type SiteDraft,
    type Trava,
} from "@/lib/eva/setupContext";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const BTN_BASE = `inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[15px] font-semibold transition-all duration-150 ${EASE} active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100`;
const BTN_PRIMARY = `${BTN_BASE} bg-[#0B1220] text-white hover:bg-[#1F2A3B]`;
const CHIP = `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-left text-[14px] font-medium transition-colors duration-150 ${EASE} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2`;
const CHIP_OFF = "border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-strong)] hover:bg-[var(--vyz-surface-2)]";
const CHIP_ON = "border-[#0B1220] bg-[#0B1220] text-white";

type Pergunta = ReturnType<typeof perguntasPendentes>[number];
type Fase = "site" | "lendo" | Pergunta | "resumo" | "salvando" | "whatsapp" | "importando" | "placar";
type Seed = {
    quotes: number;
    stuck: number;
    stuck_value: number;
    stuck_without_value: number;
    your_turn: number;
    top: { first_name: string | null; amount: number | null; status: string; days_silent: number }[];
};

// Continua a contagem do cadastro (passo 1 de 4): quem chega aqui já tem um feito.
const PASSOS = ["Criar a conta", "Conhecer a empresa", "Conectar o WhatsApp", "Ver suas propostas paradas"];
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Msg = { de: "eva" | "voce" | "bloco"; texto: ReactNode };

const MOTIVO: Record<string, string> = {
    rede_social: "Instagram e Facebook eu não consigo ler, eles pedem login. Sem problema, te pergunto o que preciso.",
    fetch_failed: "Não consegui abrir esse site. Sem problema, te pergunto o que preciso.",
    empty_site: "O site abriu, mas quase não tem texto para eu ler. Te pergunto o que preciso.",
    site_invalido: "Esse endereço não parece um site. Sem problema, te pergunto o que preciso.",
};

const PERGUNTA: Record<Pergunta, string> = {
    oQueFaz: "Em uma frase: o que a empresa faz e para quem?",
    cidades: "Quais cidades vocês atendem?",
    financiamento: "Vocês trabalham com financiamento do sistema?",
    ticket: "Qual o valor médio de uma proposta de vocês?",
    travas: "Depois que a proposta sai, o que mais faz o cliente travar? Pode marcar mais de uma.",
    tom: "Como você quer que eu escreva as mensagens de retomada?",
};

export default function ConfigurarEva() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { profile, user } = useAuth();
    const { companyId, version, configured } = useEvaSetup();
    const wa = useWhatsappConnection();
    const [empresa, setEmpresa] = useState("sua empresa");
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [fase, setFase] = useState<Fase>("site");
    const [fila, setFila] = useState<Pergunta[]>([]);
    const [resumo, setResumo] = useState<SetupResumo | null>(null);
    const [texto, setTexto] = useState("");
    const [travas, setTravas] = useState<Trava[]>([]);
    const [conectar, setConectar] = useState(false);
    const [conversas, setConversas] = useState(0);
    const fimRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const vivo = useRef(true);
    const inicioDecidido = useRef(false);
    useEffect(() => {
        vivo.current = true;
        return () => { vivo.current = false; };
    }, []);

    const primeiroNome = (profile?.nome || "").split(" ")[0];

    useEffect(() => {
        if (!companyId) return;
        supabase.from("companies").select("name").eq("id", companyId).maybeSingle().then(({ data }) => {
            if (data?.name) setEmpresa(data.name as string);
        });
    }, [companyId]);

    // Quem já ensinou a empresa para a EVA pula direto para o WhatsApp.
    useEffect(() => {
        if (configured === null || wa.loading || inicioDecidido.current) return;
        inicioDecidido.current = true;
        const oi = `Oi${primeiroNome ? `, ${primeiroNome}` : ""}. Eu sou a EVA.`;
        if (configured) {
            setMsgs([{ de: "eva", texto: `${oi} Já conheço a ${empresa}. Falta pouco para eu começar a trabalhar.` }]);
            irParaWhatsapp();
            return;
        }
        setMsgs([
            { de: "eva", texto: `${oi} Vou aprender como vocês vendem para acompanhar cada proposta com você. Leva uns 3 minutos.` },
            { de: "eva", texto: "Qual o site da empresa? Eu leio e já adianto boa parte." },
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configured, wa.loading, primeiroNome]);

    useEffect(() => {
        fimRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "end" });
        if (fase === "site" || fase === "oQueFaz" || fase === "cidades") inputRef.current?.focus();
    }, [msgs, fase]);

    const fala = (...novas: Msg[]) => setMsgs((m) => [...m, ...novas]);

    function proxima(r: SetupResumo, restantes: Pergunta[]) {
        setResumo(r);
        if (restantes.length === 0) {
            setFase("resumo");
            fala({ de: "eva", texto: "Pronto. Confere se é isso. Pode corrigir qualquer campo antes de salvar." });
            return;
        }
        const [p, ...resto] = restantes;
        setFila(resto);
        setFase(p);
        fala({ de: "eva", texto: PERGUNTA[p] });
    }

    async function lerSite(site: string | null) {
        setTexto("");
        if (!site) {
            fala({ de: "voce", texto: "Não tenho site" }, { de: "eva", texto: "Tudo bem, te pergunto o que preciso." });
            const r = resumoInicial(null, empresa);
            proxima(r, perguntasPendentes(r));
            return;
        }
        fala({ de: "voce", texto: site });
        setFase("lendo");
        let draft: SiteDraft | null = null;
        let reason = "fetch_failed";
        try {
            const { data, error } = await supabase.functions.invoke("eva-site-context", { body: { site } });
            if (error) throw error;
            draft = (data?.draft as SiteDraft | null) ?? null;
            reason = (data?.reason as string) || reason;
        } catch {
            draft = null;
        }
        const r = resumoInicial(draft, empresa);
        if (draft) {
            const partes = [
                `Li o site. Entendi que a ${r.nome} ${minuscula(r.oQueFaz) || "trabalha com energia solar."}`,
                r.cidades ? `Atende ${r.cidades}.` : null,
                r.financiamento === "sim" ? "Vi que vocês trabalham com financiamento." : null,
            ].filter(Boolean).join(" ");
            fala({ de: "eva", texto: partes });
            if (!draft.e_energia_solar) {
                fala({ de: "eva", texto: "Pelo site, não ficou claro que vocês trabalham com energia solar. Sigo com o que você me disser." });
            }
        } else {
            fala({ de: "eva", texto: MOTIVO[reason] || MOTIVO.fetch_failed });
        }
        proxima(r, perguntasPendentes(r));
    }

    function responder(p: Pergunta, valor: string, mostrar = valor) {
        if (!resumo) return;
        fala({ de: "voce", texto: mostrar });
        setTexto("");
        const r = { ...resumo };
        if (p === "oQueFaz") r.oQueFaz = valor;
        if (p === "cidades") r.cidades = valor;
        if (p === "financiamento") r.financiamento = valor as Financiamento;
        if (p === "ticket") r.ticket = valor;
        if (p === "tom") r.tom = valor as SetupResumo["tom"];
        proxima(r, fila);
    }

    function enviarTexto(e: FormEvent) {
        e.preventDefault();
        const v = texto.trim();
        if (!v) return;
        if (fase === "site") void lerSite(v.slice(0, 200));
        else if (fase === "oQueFaz" || fase === "cidades") responder(fase, v.slice(0, 300));
    }

    function confirmarTravas() {
        if (!resumo) return;
        const nomes = TRAVAS.filter((t) => travas.includes(t.key)).map((t) => t.label);
        fala({ de: "voce", texto: nomes.length ? nomes.join(", ") : "Nenhuma dessas" });
        proxima({ ...resumo, travas }, fila);
    }

    async function salvar() {
        if (!resumo || !companyId) return;
        setFase("salvando");
        const ctx = composeContext(resumo);
        const { data: atual } = await supabase
            .from("eva_business_context")
            .select("services, playbooks")
            .eq("company_id", companyId)
            .maybeSingle();
        // Reconfigurar troca só o que veio desta conversa; o que foi aprovado
        // pela base de conhecimento continua.
        const deOutraFonte = (lista: unknown) =>
            (Array.isArray(lista) ? lista : []).filter((x) => !String((x as { id?: string; source?: string })?.id ?? "").startsWith("svc_conversa") && (x as { source?: string })?.source !== "configuracao_por_conversa");
        const row = {
            company_id: companyId,
            agency: ctx.agency,
            icp: ctx.icp,
            services: [...ctx.services, ...deOutraFonte(atual?.services)],
            playbooks: [...ctx.playbooks, ...deOutraFonte(atual?.playbooks)],
            version: (version ?? 0) + 1,
            last_edited_by: user?.id ?? null,
            updated_at: new Date().toISOString(),
        };
        const { error } = atual
            ? await supabase.from("eva_business_context").update(row).eq("company_id", companyId)
            : await supabase.from("eva_business_context").insert(row);
        if (error) {
            setFase("resumo");
            toast.error(/permission|policy|rls/i.test(error.message) ? "Só o administrador da conta pode salvar isso." : "Não consegui salvar. Tente de novo.");
            return;
        }
        try { localStorage.removeItem(setupDismissKey(companyId)); } catch { /* sem storage */ }
        await qc.invalidateQueries({ queryKey: ["eva-setup"] });
        fala({ de: "eva", texto: "Salvo. A partir de agora eu leio as conversas de vocês com isso na cabeça." });
        irParaWhatsapp();
    }

    function irParaWhatsapp() {
        if (wa.connected) {
            void lerWhatsapp(false);
            return;
        }
        setFase("whatsapp");
        fala({ de: "eva", texto: "Agora conecta o WhatsApp que você usa para mandar proposta. Eu leio os últimos 90 dias e te mostro quanto dinheiro está parado." });
    }

    async function contarConversas() {
        const { count } = await supabase.from("channel_conversations").select("id", { count: "exact", head: true }).eq("company_id", companyId!);
        return count ?? 0;
    }

    async function gravarPlacar(): Promise<Seed | null> {
        try {
            const { data, error } = await supabase.functions.invoke("quote-seed-history", { body: {} });
            if (error || !data || data.error) return null;
            return data as Seed;
        } catch {
            return null;
        }
    }

    // O histórico chega em lotes logo depois da conexão: espera a contagem de
    // conversas parar de subir (ou 75 s) e só então procura as propostas.
    async function lerWhatsapp(acabouDeConectar: boolean) {
        if (!companyId) return;
        setFase("importando");
        fala({ de: "eva", texto: acabouDeConectar ? "Conectou. Estou lendo suas conversas para achar as propostas." : "Seu WhatsApp já está conectado. Estou lendo suas conversas para achar as propostas." });
        const inicio = Date.now();
        let anterior = -1;
        let parado = 0;
        while (vivo.current && Date.now() - inicio < 75_000) {
            await espera(3000);
            const n = await contarConversas();
            setConversas(n);
            parado = n > 0 && n === anterior ? parado + 1 : 0;
            anterior = n;
            if (parado >= 3 && Date.now() - inicio > 9000) break;
        }
        let r = await gravarPlacar();
        if (vivo.current && r && r.quotes === 0 && anterior < 5) {
            await espera(20_000);
            r = (await gravarPlacar()) ?? r;
        }
        if (!vivo.current) return;
        await qc.invalidateQueries({ queryKey: ["quote-board"] });
        setFase("placar");
        if (!r) {
            fala({ de: "eva", texto: "Não consegui terminar a leitura agora. Sem problema: cada proposta que sair do seu WhatsApp já entra no placar sozinha." });
        } else if (r.stuck > 0) {
            fala({ de: "eva", texto: "Pronto. Olha o que achei nos últimos 30 dias:" }, { de: "bloco", texto: <Placar r={r} /> });
        } else if (r.quotes > 0) {
            fala({ de: "eva", texto: `Achei ${r.quotes === 1 ? "1 proposta" : `${r.quotes} propostas`} nos últimos 30 dias e nenhuma parada. Bom sinal.` });
        } else {
            fala({ de: "eva", texto: "Não achei proposta nos últimos 30 dias nesse número. Daqui pra frente, cada proposta que sair dele entra no placar sozinha." });
        }
        fala({ de: "eva", texto: "Daqui pra frente é assim: quando uma proposta passar 2 dias sem resposta, eu te mando no WhatsApp a retomada pronta. Você responde 1 e ela sai do seu número." });
    }

    function depois() {
        if (companyId) {
            try { localStorage.setItem(setupDismissKey(companyId), "1"); } catch { /* sem storage */ }
        }
        navigate(APP_HOME, { replace: true });
    }

    const passo = fase === "whatsapp" ? 2 : fase === "importando" ? 3 : fase === "placar" ? 4 : 1;

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--vyz-bg)] text-[var(--vyz-text-primary)]">
            <header className="shrink-0 border-b border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
                <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <EncontroProgress step={passo} total={4} size={34} />
                        <div className="min-w-0">
                            <p className="text-[14px] font-semibold leading-tight">Primeiros passos</p>
                            <p className="truncate text-[12px] text-[var(--vyz-text-muted)]">
                                {passo < 4 ? `Passo ${passo + 1} de 4 · ${PASSOS[passo]}` : `Tudo pronto · ${empresa}`}
                            </p>
                        </div>
                    </div>
                    {fase !== "placar" && fase !== "importando" && (
                        <button type="button" onClick={depois} className="rounded-full px-3 py-2 text-[13px] font-medium text-[var(--vyz-text-muted)] hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-strong)]">
                            Fazer depois
                        </button>
                    )}
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-6 pt-6">
                {msgs.map((m, i) => (
                    <Bolha key={i} de={m.de}>{m.texto}</Bolha>
                ))}
                {fase === "lendo" && <Bolha de="eva"><span className="text-[var(--vyz-text-muted)]">Lendo o site…</span></Bolha>}
                {fase === "importando" && <Leitura conversas={conversas} />}

                {fase === "resumo" || fase === "salvando" ? (
                    resumo && <Resumo r={resumo} onChange={setResumo} />
                ) : null}
                <div ref={fimRef} />
                </div>
            </main>

            <footer className="max-h-[55dvh] shrink-0 overflow-y-auto border-t border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
                <div className="mx-auto w-full max-w-2xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {(fase === "site" || fase === "oQueFaz" || fase === "cidades") && (
                        <form onSubmit={enviarTexto} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    inputMode={fase === "site" ? "url" : "text"}
                                    autoCapitalize={fase === "site" ? "none" : "sentences"}
                                    placeholder={fase === "site" ? "suaempresa.com.br" : fase === "cidades" ? "Ex.: Campinas, Valinhos e região" : "Ex.: Instalamos energia solar para casas e comércios"}
                                    aria-label={fase === "site" ? "Site da empresa" : PERGUNTA[fase]}
                                    className="h-11 min-w-0 flex-1 rounded-full border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] px-4 text-[16px] outline-none placeholder:text-[var(--vyz-text-soft)] focus:border-[var(--vyz-accent)] focus:ring-2 focus:ring-[var(--vyz-accent)]/20"
                                />
                                <button type="submit" disabled={!texto.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0B1220] text-white transition-colors hover:bg-[#1F2A3B] disabled:opacity-40">
                                    <ArrowUp className="h-5 w-5" aria-hidden />
                                </button>
                            </div>
                            {fase === "site" && (
                                <div>
                                    <button type="button" onClick={() => void lerSite(null)} className={`${CHIP} ${CHIP_OFF}`}>Não tenho site</button>
                                </div>
                            )}
                        </form>
                    )}

                    {fase === "financiamento" && (
                        <Opcoes>
                            <button type="button" className={`${CHIP} ${CHIP_OFF}`} onClick={() => responder("financiamento", "sim", "Sim")}>Sim</button>
                            <button type="button" className={`${CHIP} ${CHIP_OFF}`} onClick={() => responder("financiamento", "nao", "Não")}>Não</button>
                        </Opcoes>
                    )}

                    {fase === "ticket" && (
                        <Opcoes>
                            {TICKETS.map((t) => (
                                <button key={t} type="button" className={`${CHIP} ${CHIP_OFF}`} onClick={() => responder("ticket", t)}>{t}</button>
                            ))}
                        </Opcoes>
                    )}

                    {fase === "travas" && (
                        <div className="flex flex-col gap-3">
                            <Opcoes>
                                {TRAVAS.map((t) => {
                                    const on = travas.includes(t.key);
                                    return (
                                        <button
                                            key={t.key}
                                            type="button"
                                            aria-pressed={on}
                                            className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                                            onClick={() => setTravas((v) => (on ? v.filter((x) => x !== t.key) : [...v, t.key]))}
                                        >
                                            {on && <Check className="h-4 w-4" aria-hidden />}
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </Opcoes>
                            <button type="button" onClick={confirmarTravas} className={`${BTN_PRIMARY} self-end`}>
                                {travas.length ? "Continuar" : "Nenhuma dessas"}
                            </button>
                        </div>
                    )}

                    {fase === "tom" && (
                        <div className="flex flex-col gap-2">
                            {TONS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => responder("tom", t.key, t.label)}
                                    className={`rounded-2xl border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] px-4 py-3 text-left transition-colors duration-150 ${EASE} hover:bg-[var(--vyz-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]`}
                                >
                                    <span className="block text-[14px] font-semibold text-[var(--vyz-text-strong)]">{t.label}</span>
                                    <span className="block text-[13px] text-[var(--vyz-text-muted)]">{t.descricao}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {(fase === "resumo" || fase === "salvando") && (
                        <button type="button" onClick={() => void salvar()} disabled={fase === "salvando" || !resumo?.oQueFaz.trim()} className={`${BTN_PRIMARY} w-full`}>
                            {fase === "salvando" ? "Salvando…" : "É isso, salvar"}
                        </button>
                    )}

                    {fase === "whatsapp" && (
                        <div className="flex flex-col gap-2">
                            <button type="button" onClick={() => setConectar(true)} className={`${BTN_PRIMARY} w-full`}>Conectar meu WhatsApp</button>
                            <p className="text-center text-[12px] text-[var(--vyz-text-muted)]">Você lê um QR Code no celular, como no WhatsApp Web. Nada sai para cliente sem você aprovar.</p>
                        </div>
                    )}

                    {fase === "importando" && (
                        <p className="py-2 text-center text-[13px] text-[var(--vyz-text-muted)]">Costuma levar menos de 2 minutos. Pode deixar esta tela aberta.</p>
                    )}

                    {fase === "placar" && (
                        <Link to={APP_HOME} replace className={`${BTN_PRIMARY} w-full`}>Ver meu placar</Link>
                    )}
                </div>
            </footer>
            <WhatsAppConnectModal
                open={conectar}
                onClose={() => setConectar(false)}
                onConnected={() => {
                    setConectar(false);
                    void lerWhatsapp(true);
                }}
            />
        </div>
    );
}

function Leitura({ conversas }: { conversas: number }) {
    return (
        <div className="flex max-w-[92%] items-end gap-2">
            <span className="mb-0.5 shrink-0"><EvaBot size={24} state="thinking" /></span>
            <div className="rounded-2xl rounded-bl-md border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-2.5 text-[15px] leading-snug text-[var(--vyz-text-strong)]">
                {conversas > 0 ? (
                    <>Li <span className="font-semibold tabular-nums">{conversas}</span> {conversas === 1 ? "conversa" : "conversas"} até agora…</>
                ) : (
                    <span className="text-[var(--vyz-text-muted)]">Esperando o histórico chegar…</span>
                )}
            </div>
        </div>
    );
}

const SITUACAO: Record<string, (d: number) => string> = {
    no_reply: (d) => `sem resposta há ${d} ${d === 1 ? "dia" : "dias"}`,
    went_quiet: (d) => `parou de responder há ${d} ${d === 1 ? "dia" : "dias"}`,
    your_turn: (d) => `esperando você há ${d} ${d === 1 ? "dia" : "dias"}`,
};

// O primeiro número: o valor parado sobe de zero até o total, uma vez.
function Placar({ r }: { r: Seed }) {
    const [valor, setValor] = useState(0);
    useEffect(() => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches || r.stuck_value === 0) {
            setValor(r.stuck_value);
            return;
        }
        let raf = 0;
        const t0 = performance.now();
        const anda = (t: number) => {
            const k = Math.min(1, (t - t0) / 1100);
            setValor(Math.round(r.stuck_value * (1 - Math.pow(1 - k, 3))));
            if (k < 1) raf = requestAnimationFrame(anda);
        };
        raf = requestAnimationFrame(anda);
        return () => cancelAnimationFrame(raf);
    }, [r.stuck_value]);

    return (
        <section aria-label="Propostas paradas" className="flex flex-col gap-4 rounded-2xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-20px_rgba(37,99,235,0.35)] sm:ml-8">
            <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--vyz-text-muted)]">Parado no seu WhatsApp</p>
                <p className="mt-1 font-satoshi text-[40px] font-black leading-none tracking-[-0.03em] text-[var(--vyz-text-primary)] tabular-nums">
                    {r.stuck_value > 0 ? brl(valor) : `${r.stuck}`}
                </p>
                <p className="mt-1.5 text-[14px] text-[var(--vyz-text)]">
                    em {r.stuck === 1 ? "1 proposta parada" : `${r.stuck} propostas paradas`}
                    {r.stuck_without_value > 0 && r.stuck_value > 0 ? ` (${r.stuck_without_value} sem valor escrito na conversa)` : ""}
                </p>
            </div>
            {r.top.length > 0 && (
                <ul className="flex flex-col divide-y divide-[var(--vyz-border-subtle)] border-t border-[var(--vyz-border-subtle)]">
                    {r.top.map((q, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="min-w-0">
                                <span className="block truncate text-[14px] font-semibold text-[var(--vyz-text-strong)]">{q.first_name || "Cliente"}</span>
                                <span className="block text-[13px] text-[var(--vyz-text-muted)]">{(SITUACAO[q.status] ?? SITUACAO.no_reply)(q.days_silent)}</span>
                            </span>
                            <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[var(--vyz-text-strong)]">{q.amount ? brl(q.amount) : "sem valor"}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function minuscula(s: string) {
    const t = s.trim();
    return t ? t.charAt(0).toLowerCase() + t.slice(1) : "";
}

function Bolha({ de, children }: { de: Msg["de"]; children: ReactNode }) {
    if (de === "bloco") return <>{children}</>;
    if (de === "voce") {
        return (
            <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0B1220] px-4 py-2.5 text-[15px] leading-snug text-white">{children}</p>
            </div>
        );
    }
    return (
        <div className="flex max-w-[92%] items-end gap-2">
            <span className="mb-0.5 shrink-0"><EvaBot size={24} still state="idle" /></span>
            <div className="rounded-2xl rounded-bl-md border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-2.5 text-[15px] leading-snug text-[var(--vyz-text-strong)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {children}
            </div>
        </div>
    );
}

function Opcoes({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Resumo({ r, onChange }: { r: SetupResumo; onChange: (r: SetupResumo) => void }) {
    const set = <K extends keyof SetupResumo>(k: K, v: SetupResumo[K]) => onChange({ ...r, [k]: v });
    const campo = "w-full rounded-xl border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] px-3 py-2 text-[16px] text-[var(--vyz-text-strong)] outline-none focus:border-[var(--vyz-accent)] focus:ring-2 focus:ring-[var(--vyz-accent)]/20 sm:text-[15px]";
    return (
        <section aria-label="Resumo da empresa" className="ml-0 flex flex-col gap-4 rounded-2xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)] sm:ml-8 sm:p-5">
            <Campo label="Empresa">
                <input className={campo} value={r.nome} onChange={(e) => set("nome", e.target.value)} />
            </Campo>
            <Campo label="O que faz">
                <textarea className={`${campo} min-h-[76px] resize-y`} value={r.oQueFaz} onChange={(e) => set("oQueFaz", e.target.value)} />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Cidades que atende">
                    <input className={campo} value={r.cidades} onChange={(e) => set("cidades", e.target.value)} placeholder="Ex.: Campinas e região" />
                </Campo>
                <Campo label="Tipos de cliente">
                    <input className={campo} value={r.clientes} onChange={(e) => set("clientes", e.target.value)} placeholder="Ex.: residencial, comercial" />
                </Campo>
                <Campo label="Financiamento">
                    <select className={campo} value={r.financiamento} onChange={(e) => set("financiamento", e.target.value as Financiamento)}>
                        <option value="sim">Sim, trabalhamos</option>
                        <option value="nao">Não trabalhamos</option>
                        <option value="nao_sei">Prefiro não dizer</option>
                    </select>
                </Campo>
                <Campo label="Valor médio da proposta">
                    <select className={campo} value={r.ticket} onChange={(e) => set("ticket", e.target.value)}>
                        <option value="">Não informado</option>
                        {TICKETS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </Campo>
            </div>
            <Campo label="Jeito de escrever">
                <select className={campo} value={r.tom} onChange={(e) => set("tom", e.target.value as SetupResumo["tom"])}>
                    {TONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
            </Campo>
            {r.travas.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--vyz-text-muted)]">Quando o cliente trava, eu sugiro</p>
                    <ul className="flex flex-col gap-1.5">
                        {TRAVAS.filter((t) => r.travas.includes(t.key)).map((t) => (
                            <li key={t.key} className="text-[14px] leading-snug text-[var(--vyz-text)]">
                                <span className="font-semibold text-[var(--vyz-text-strong)]">{t.label}:</span> {t.resposta}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {r.servicos.length > 0 && (
                <p className="text-[13px] leading-snug text-[var(--vyz-text-muted)]">
                    Do site também anotei: {r.servicos.map((s) => s.nome).join(", ")}.
                </p>
            )}
        </section>
    );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--vyz-text-muted)]">{label}</span>
            {children}
        </label>
    );
}
