// Raio-X rápido (QA de 04/11/2026): três perguntas de toque e uma estimativa do valor
// em orçamento que fica sem resposta, sem criar conta nem conectar o WhatsApp. Quem
// chega do Instagram vê um número antes de confiar o WhatsApp a um site que acabou de
// conhecer. O número é uma conta com as respostas da pessoa e a página diz isso; o
// Raio-X de verdade (com nome de cliente) continua em /criar-conta → /raio-x.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { logLandingEvent } from "@/lib/landingFunnel";

type Opcao = { rotulo: string; valor: number };
type Pergunta = { id: "orcamentos" | "ticket" | "somem"; titulo: string; opcoes: Opcao[] };

const PERGUNTAS: Pergunta[] = [
    {
        id: "orcamentos",
        titulo: "Quantos orçamentos você manda por mês?",
        opcoes: [
            { rotulo: "Até 10", valor: 8 },
            { rotulo: "10 a 30", valor: 20 },
            { rotulo: "30 a 60", valor: 45 },
            { rotulo: "Mais de 60", valor: 80 },
        ],
    },
    {
        id: "ticket",
        titulo: "Quanto vale um orçamento, em média?",
        opcoes: [
            { rotulo: "R$ 15 mil", valor: 15000 },
            { rotulo: "R$ 25 mil", valor: 25000 },
            { rotulo: "R$ 40 mil", valor: 40000 },
            { rotulo: "R$ 60 mil ou mais", valor: 60000 },
        ],
    },
    {
        id: "somem",
        titulo: "De cada 10 clientes que recebem o orçamento, quantos somem sem responder?",
        opcoes: [
            { rotulo: "2", valor: 0.2 },
            { rotulo: "4", valor: 0.4 },
            { rotulo: "6", valor: 0.6 },
            { rotulo: "8", valor: 0.8 },
        ],
    },
];

const PAGE = "raio_x_rapido";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function RaioXRapido() {
    const navigate = useNavigate();
    const [respostas, setRespostas] = useState<Partial<Record<Pergunta["id"], number>>>({});
    const comecou = useRef(false);
    const resultadoRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.title = "Raio-X rápido das propostas paradas | Vyzon";
        logLandingEvent(PAGE, "v1", "view", { path: window.location.pathname });
    }, []);

    const pronto = PERGUNTAS.every((p) => respostas[p.id] !== undefined);
    const conta = useMemo(() => {
        if (!pronto) return null;
        const somem = Math.round(respostas.orcamentos! * respostas.somem!);
        return { somem, mes: somem * respostas.ticket!, noventa: somem * respostas.ticket! * 3 };
    }, [pronto, respostas]);

    useEffect(() => {
        if (!conta) return;
        logLandingEvent(PAGE, "v1", "form_submit", { orcamentos: respostas.orcamentos!, ticket: respostas.ticket!, somem: respostas.somem!, estimativa_mes: conta.mes });
        resultadoRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conta?.mes]);

    const escolher = (id: Pergunta["id"], valor: number) => {
        if (!comecou.current) {
            comecou.current = true;
            logLandingEvent(PAGE, "v1", "form_start");
        }
        setRespostas((r) => ({ ...r, [id]: valor }));
    };

    return (
        <div className="lp-v2 lp-solar vz-auth-claro min-h-screen">
            <div className="mx-auto w-full max-w-[520px] px-5 py-6 sm:py-9">
                <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => navigate("/")} className="flex items-center" aria-label="Vyzon, voltar ao site">
                        <ThemeLogo variant="default" className="h-6 w-auto" />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors hover:text-[var(--lp-ink)]"
                        style={{ color: "var(--lp-ink-muted)" }}
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Voltar ao site
                    </button>
                </div>

                <header className="mt-10 landing-fade-in-up">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--lp-ink-muted)" }}>
                        Raio-X rápido · 3 perguntas · sem cadastro
                    </p>
                    <h1 className="vs-display mt-3 text-[36px] leading-[1.04] sm:text-[44px]">Quanto fica parado em orçamento sem resposta?</h1>
                    <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                        Toque nas respostas mais perto da sua realidade. A conta sai na hora, sem pedir seu WhatsApp.
                    </p>
                </header>

                <div className="mt-9 flex flex-col gap-8">
                    {PERGUNTAS.map((p, i) => (
                        <fieldset key={p.id} className="landing-fade-in-up">
                            <legend className="text-[16px] font-semibold leading-snug" style={{ color: "var(--lp-ink)" }}>
                                <span className="tabular-nums" style={{ color: "var(--lp-ink-muted)" }}>{i + 1}. </span>
                                {p.titulo}
                            </legend>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {p.opcoes.map((o) => {
                                    const ativo = respostas[p.id] === o.valor;
                                    return (
                                        <button
                                            key={o.rotulo}
                                            type="button"
                                            aria-pressed={ativo}
                                            onClick={() => escolher(p.id, o.valor)}
                                            className="min-h-[48px] rounded-[10px] border px-3 text-[15px] font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] focus-visible:ring-offset-2"
                                            style={{
                                                borderColor: ativo ? "var(--lp-ink)" : "var(--lp-line)",
                                                background: ativo ? "var(--lp-ink)" : "var(--lp-white)",
                                                color: ativo ? "var(--lp-white)" : "var(--lp-ink)",
                                            }}
                                        >
                                            {o.rotulo}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ))}
                </div>

                <div ref={resultadoRef} className="scroll-mt-6" aria-live="polite">
                    {conta ? (
                        <section className="mt-10 rounded-[12px] border p-5 landing-fade-in-up sm:p-6" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                            <p className="text-[14px]" style={{ color: "var(--lp-ink-muted)" }}>
                                Pela sua resposta, por mês
                            </p>
                            <p className="vs-display mt-1 text-[44px] leading-none tabular-nums sm:text-[52px]" style={{ color: "var(--lp-ink)" }}>
                                {brl(conta.mes)}
                            </p>
                            <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "var(--lp-ink)" }}>
                                em {conta.somem} {conta.somem === 1 ? "orçamento que o cliente recebeu" : "orçamentos que o cliente recebeu"} e não respondeu. Em 90
                                dias, perto de <strong className="font-semibold tabular-nums">{brl(conta.noventa)}</strong>.
                            </p>
                            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                                É uma conta com as suas respostas, não com as suas conversas. O Raio-X completo lê o seu WhatsApp e mostra cada proposta parada com o
                                nome do cliente, o valor e há quantos dias ela está sem resposta. Ele só lê: nada é enviado pros seus clientes.
                            </p>
                            <Link
                                to="/criar-conta?segmento=energia_solar&origem=raio_x_rapido"
                                onClick={() => logLandingEvent(PAGE, "v1", "cta_click", { destino: "criar_conta", estimativa_mes: conta.mes })}
                                className="vz-btn vz-btn--primary mt-6 inline-flex w-full justify-center"
                            >
                                <span>Ver as minhas, com nome do cliente</span>
                                <span className="vz-btn__arrow" aria-hidden="true">→</span>
                            </Link>
                            <p className="mt-3 text-center text-[13px]" style={{ color: "var(--lp-ink-muted)" }}>
                                Grátis e sem cartão. As 10 primeiras integradoras usam o Vyzon de graça, para sempre.
                            </p>
                        </section>
                    ) : (
                        <p className="mt-10 text-[14px]" style={{ color: "var(--lp-ink-muted)" }}>
                            {PERGUNTAS.filter((p) => respostas[p.id] === undefined).length === 3
                                ? "A conta aparece aqui quando você responder as 3."
                                : `Falta ${PERGUNTAS.filter((p) => respostas[p.id] === undefined).length === 1 ? "1 resposta" : `${PERGUNTAS.filter((p) => respostas[p.id] === undefined).length} respostas`}.`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
