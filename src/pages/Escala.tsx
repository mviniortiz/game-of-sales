// /escala: pedido do plano Escala, para quem vende por mais de um WhatsApp.
// Sem preço: a pessoa conta como a operação funciona e o Markus monta a
// proposta. O envio vai pela RPC submit_escala_request, que grava em
// demo_requests (source='plano_escala'), cria o card "Escala: <empresa>" no
// funil do Markus e não dispara mensagem automática.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { trackEvent } from "@/lib/analytics";

const NUMEROS = ["2", "3 a 5", "6 a 10", "Mais de 10"];
const VENDEDORES = ["1 a 3", "4 a 10", "11 a 30", "Mais de 30"];
const PROPOSTAS = ["Até 50", "50 a 200", "200 a 500", "Mais de 500"];

const CAMPO =
    "h-12 w-full rounded-xl border bg-white px-4 text-[16px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--lp-blue)] focus:shadow-[0_0_0_3px_rgba(21,86,192,0.18)]";

export default function Escala() {
    const [nome, setNome] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [email, setEmail] = useState("");
    const [numeros, setNumeros] = useState("");
    const [vendedores, setVendedores] = useState("");
    const [propostas, setPropostas] = useState("");
    const [precisa, setPrecisa] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [enviado, setEnviado] = useState(false);

    useEffect(() => {
        document.title = "Plano Escala | Vyzon";
    }, []);

    const enviar = async (e: FormEvent) => {
        e.preventDefault();
        setErro("");
        if (whatsapp.replace(/\D/g, "").length < 10) {
            setErro("Confira o WhatsApp com DDD.");
            return;
        }
        setEnviando(true);
        const a = getAttribution();
        const { error } = await supabase.rpc("submit_escala_request" as never, {
            payload: {
                name: nome,
                company: empresa,
                phone: whatsapp,
                email,
                numbers: numeros,
                team_size: vendedores,
                proposals: propostas,
                need: precisa,
                utm_source: a?.utm_source,
                utm_medium: a?.utm_medium,
                utm_campaign: a?.utm_campaign,
                utm_term: a?.utm_term,
                utm_content: a?.utm_content,
                gclid: a?.gclid,
                fbclid: a?.fbclid,
                referrer: a?.referrer,
                landing_page: a?.landing_page,
            },
        } as never);
        setEnviando(false);
        if (error) {
            setErro("Não deu para enviar agora. Tente de novo em instantes.");
            return;
        }
        trackEvent("escala_form_submit", { numeros: numeros || "nao_informado" });
        setEnviado(true);
        window.scrollTo({ top: 0 });
    };

    return (
        <div className="lp-v2 lp-solar min-h-screen">
            <div className="vs-topo">
                <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-5 sm:px-5 md:px-8">
                    <Link to="/" aria-label="Vyzon, início">
                        <ThemeLogo className="h-[22px] w-auto" />
                    </Link>
                    <Link to="/auth" className="text-sm font-medium" style={{ color: "var(--lp-ink-muted)" }}>
                        Entrar
                    </Link>
                </header>
            </div>

            <main className="mx-auto w-full max-w-[640px] px-4 pb-20 pt-10 sm:px-5 md:pt-16">
                {enviado ? (
                    <section aria-live="polite">
                        <p className="vs-label">Plano Escala</p>
                        <h1 className="vs-display mt-3 text-[34px] leading-[1.05] md:text-[44px]">Recebemos, {nome.split(" ")[0] || "obrigado"}.</h1>
                        <p className="mt-4 text-[17px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                            O Markus vai ler o que você contou e te chamar no WhatsApp {whatsapp} para montar o plano com você.
                        </p>
                        <Link to="/" className="vs-btn mt-8 inline-flex">
                            Voltar para o início
                        </Link>
                    </section>
                ) : (
                    <>
                        <p className="vs-label">Plano Escala</p>
                        <h1 className="vs-display mt-3 text-[34px] leading-[1.05] md:text-[44px]">
                            Sua equipe vende por <span className="vs-azul">mais de um WhatsApp?</span>
                        </h1>
                        <p className="mt-4 text-[17px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                            Conta como a sua operação funciona. A gente monta o plano e o preço com você, do tamanho da sua equipe.
                        </p>

                        <form onSubmit={enviar} className="mt-10 space-y-6">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Campo rotulo="Seu nome" id="nome">
                                    <input id="nome" required autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO} style={{ borderColor: "var(--lp-line)" }} />
                                </Campo>
                                <Campo rotulo="Empresa" id="empresa">
                                    <input id="empresa" required autoComplete="organization" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={CAMPO} style={{ borderColor: "var(--lp-line)" }} />
                                </Campo>
                                <Campo rotulo="WhatsApp com DDD" id="whatsapp">
                                    <input id="whatsapp" required type="tel" inputMode="tel" autoComplete="tel" placeholder="(48) 99999-0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={CAMPO} style={{ borderColor: "var(--lp-line)" }} />
                                </Campo>
                                <Campo rotulo="E-mail" id="email">
                                    <input id="email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={CAMPO} style={{ borderColor: "var(--lp-line)" }} />
                                </Campo>
                            </div>

                            <Escolha legenda="Quantos números de WhatsApp a equipe usa para vender?" nome="numeros" opcoes={NUMEROS} valor={numeros} onChange={setNumeros} />
                            <Escolha legenda="Quantas pessoas vendem?" nome="vendedores" opcoes={VENDEDORES} valor={vendedores} onChange={setVendedores} />
                            <Escolha legenda="Quantas propostas saem por mês, mais ou menos?" nome="propostas" opcoes={PROPOSTAS} valor={propostas} onChange={setPropostas} />

                            <Campo rotulo="O que você precisa resolver? (opcional)" id="precisa">
                                <textarea
                                    id="precisa"
                                    rows={4}
                                    maxLength={1500}
                                    value={precisa}
                                    onChange={(e) => setPrecisa(e.target.value)}
                                    placeholder="Ex.: cada vendedor tem o próprio número e eu não vejo quais propostas ficaram paradas."
                                    className="w-full rounded-xl border bg-white px-4 py-3 text-[16px] leading-relaxed outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--lp-blue)] focus:shadow-[0_0_0_3px_rgba(21,86,192,0.18)]"
                                    style={{ borderColor: "var(--lp-line)" }}
                                />
                            </Campo>

                            {erro && (
                                <p role="alert" className="text-[15px] font-medium" style={{ color: "#b42318" }}>
                                    {erro}
                                </p>
                            )}

                            <button type="submit" className="vs-btn w-full sm:w-auto" disabled={enviando}>
                                {enviando ? "Enviando" : "Falar com um especialista"}
                            </button>
                            <p className="text-[14px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                                Usamos esses dados só para conversar sobre o seu plano.
                            </p>
                        </form>
                    </>
                )}
            </main>
        </div>
    );
}

function Campo({ rotulo, id, children }: { rotulo: string; id: string; children: ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-[15px] font-semibold">
                {rotulo}
            </label>
            {children}
        </div>
    );
}

function Escolha({ legenda, nome, opcoes, valor, onChange }: { legenda: string; nome: string; opcoes: string[]; valor: string; onChange: (v: string) => void }) {
    return (
        <fieldset>
            <legend className="mb-3 text-[15px] font-semibold">{legenda}</legend>
            <div className="flex flex-wrap gap-2">
                {opcoes.map((o) => {
                    const ativo = valor === o;
                    return (
                        <label
                            key={o}
                            className="cursor-pointer rounded-full border px-4 py-2.5 text-[15px] font-medium transition-[background-color,border-color,color] duration-150 has-[:focus-visible]:shadow-[0_0_0_3px_rgba(21,86,192,0.25)]"
                            style={{
                                borderColor: ativo ? "var(--lp-ink)" : "var(--lp-line)",
                                background: ativo ? "var(--lp-ink)" : "var(--lp-white)",
                                color: ativo ? "var(--lp-white)" : "var(--lp-ink)",
                            }}
                        >
                            <input type="radio" name={nome} value={o} checked={ativo} onChange={() => onChange(o)} className="sr-only" />
                            {o}
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
