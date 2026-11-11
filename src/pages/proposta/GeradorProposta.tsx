// /gerador-proposta-energia-solar: a pessoa preenche os dados do cliente e baixa
// a proposta em PDF. Roda inteiro no navegador, sem login: o que é digitado não
// vai para servidor nenhum, nem para a medição (o formulário e a prévia ficam
// mascarados no Clarity e os eventos levam só o lugar do clique).
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { BLOG_CTA, BLOG_CTA_HREF, BLOG_CTA_LINHA } from "@/components/blog/BlogChrome";
import { PropostaShell } from "@/components/proposta/PropostaShell";
import { eventoProposta } from "@/lib/proposta/evento";
import { logLandingEvent } from "@/lib/landingFunnel";
import { montarPropostaPdf, nomeDoArquivo, parseNumeroBR, textoDaProposta, type PropostaDados } from "@/lib/proposta/propostaPdf";

const SLUG = "gerador-proposta-energia-solar";

interface Campos {
    cliente: string;
    consumo: string;
    potencia: string;
    valor: string;
    pagamento: string;
    empresa: string;
    contato: string;
    validade: string;
}
type Erros = Partial<Record<keyof Campos, string>>;

const VAZIO: Campos = { cliente: "", consumo: "", potencia: "", valor: "", pagamento: "", empresa: "", contato: "", validade: "" };

const positivo = (texto: string) => {
    const n = parseNumeroBR(texto);
    return Number.isFinite(n) && n > 0 ? n : null;
};

function validar(c: Campos): Erros {
    const e: Erros = {};
    if (!c.cliente.trim()) e.cliente = "Informe o nome do cliente.";
    if (positivo(c.consumo) === null) e.consumo = "Informe o consumo em kWh, só números.";
    if (positivo(c.potencia) === null) e.potencia = "Informe a potência em kWp, só números.";
    if (positivo(c.valor) === null) e.valor = "Informe o valor do sistema em reais.";
    if (!c.pagamento.trim()) e.pagamento = "Escreva como o cliente pode pagar.";
    if (c.validade.trim() && positivo(c.validade) === null) e.validade = "Informe a validade em dias ou deixe em branco.";
    return e;
}

export default function GeradorProposta() {
    const [campos, setCampos] = useState<Campos>(VAZIO);
    const [erros, setErros] = useState<Erros>({});
    const [gerando, setGerando] = useState(false);
    const [falha, setFalha] = useState(false);
    const [baixado, setBaixado] = useState(false);
    const depoisRef = useRef<HTMLDivElement>(null);
    const comecou = useRef(false);
    const hoje = useMemo(() => new Date(), []);

    const mudar = (campo: keyof Campos) => (e: { target: { value: string } }) => {
        if (!comecou.current) {
            comecou.current = true;
            logLandingEvent("proposta", SLUG, "form_start");
        }
        setCampos((c) => ({ ...c, [campo]: e.target.value }));
        if (erros[campo]) setErros((x) => ({ ...x, [campo]: undefined }));
    };

    // Prévia: os mesmos textos que vão para o PDF. Campo vazio mostra o que falta.
    const previa = textoDaProposta({
        cliente: campos.cliente,
        consumoKwh: positivo(campos.consumo) ?? 0,
        potenciaKwp: positivo(campos.potencia) ?? 0,
        valor: positivo(campos.valor) ?? 0,
        pagamento: campos.pagamento,
        empresa: campos.empresa,
        contato: campos.contato,
        validadeDias: positivo(campos.validade) ?? undefined,
        data: hoje,
    });

    useEffect(() => {
        if (baixado) depoisRef.current?.focus();
    }, [baixado]);

    const gerar = async (e: FormEvent) => {
        e.preventDefault();
        setFalha(false);
        const achados = validar(campos);
        setErros(achados);
        const primeiro = (Object.keys(achados) as (keyof Campos)[])[0];
        if (primeiro) {
            document.getElementById(`gp-${primeiro}`)?.focus();
            logLandingEvent("proposta", SLUG, "form_error", { campo: primeiro });
            return;
        }
        const dados: PropostaDados = {
            cliente: campos.cliente,
            consumoKwh: positivo(campos.consumo)!,
            potenciaKwp: positivo(campos.potencia)!,
            valor: positivo(campos.valor)!,
            pagamento: campos.pagamento,
            empresa: campos.empresa,
            contato: campos.contato,
            validadeDias: positivo(campos.validade) ?? undefined,
            data: new Date(),
        };
        setGerando(true);
        try {
            // A biblioteca de PDF só é baixada aqui, no clique.
            const { jsPDF } = await import("jspdf");
            montarPropostaPdf(jsPDF, dados).save(nomeDoArquivo(dados.cliente));
            // cta_click, e não form_submit: o painel de origem soma form_submit de todas as páginas como cadastro.
            eventoProposta(SLUG, "baixar_pdf");
            setBaixado(true);
        } catch {
            setFalha(true);
        } finally {
            setGerando(false);
        }
    };

    const campo = (id: keyof Campos) => ({
        id: `gp-${id}`,
        value: campos[id],
        onChange: mudar(id),
        className: "vpr-campo",
        "aria-invalid": erros[id] ? (true as const) : undefined,
        "aria-describedby": erros[id] ? `gp-${id}-erro` : undefined,
    });
    const erro = (id: keyof Campos) =>
        erros[id] ? (
            <p id={`gp-${id}-erro`} className="vpr-erro">
                {erros[id]}
            </p>
        ) : null;

    return (
        <PropostaShell slug={SLUG}>
            <div className="vpr-gerador" data-clarity-mask="true">
                <div className="grid gap-5">
                    <form className="vpr-form" onSubmit={gerar} noValidate aria-label="Dados da proposta">
                        <div>
                            <label htmlFor="gp-cliente" className="vpr-rotulo">Nome do cliente</label>
                            <input {...campo("cliente")} autoComplete="off" maxLength={80} />
                            {erro("cliente")}
                        </div>

                        <div className="vpr-form__linha">
                            <div>
                                <label htmlFor="gp-consumo" className="vpr-rotulo">Consumo médio (kWh por mês)</label>
                                <input {...campo("consumo")} inputMode="decimal" autoComplete="off" placeholder="650" maxLength={12} />
                                {erro("consumo")}
                            </div>
                            <div>
                                <label htmlFor="gp-potencia" className="vpr-rotulo">Potência do sistema (kWp)</label>
                                <input {...campo("potencia")} inputMode="decimal" autoComplete="off" placeholder="5,5" maxLength={12} />
                                {erro("potencia")}
                            </div>
                            <div>
                                <label htmlFor="gp-valor" className="vpr-rotulo">Valor do sistema (R$)</label>
                                <input {...campo("valor")} inputMode="decimal" autoComplete="off" placeholder="24.900" maxLength={16} />
                                {erro("valor")}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="gp-pagamento" className="vpr-rotulo">Condições de pagamento</label>
                            <textarea
                                {...campo("pagamento")}
                                rows={4}
                                maxLength={1200}
                                placeholder="À vista no Pix com 5% de desconto, ou entrada de R$ 4.900 e o restante em 60 vezes."
                            />
                            {erro("pagamento")}
                        </div>

                        <fieldset>
                            <legend>
                                Seus dados <span>(opcional, aparecem no topo da proposta)</span>
                            </legend>
                            <div className="vpr-form__dupla">
                                <div>
                                    <label htmlFor="gp-empresa" className="vpr-rotulo">Nome da sua empresa</label>
                                    <input {...campo("empresa")} autoComplete="organization" maxLength={60} />
                                </div>
                                <div>
                                    <label htmlFor="gp-contato" className="vpr-rotulo">WhatsApp ou e-mail</label>
                                    <input {...campo("contato")} autoComplete="off" maxLength={60} />
                                </div>
                            </div>
                            <div className="vpr-form__dupla">
                                <div>
                                    <label htmlFor="gp-validade" className="vpr-rotulo">Validade da proposta (dias)</label>
                                    <input {...campo("validade")} inputMode="numeric" autoComplete="off" placeholder="10" maxLength={3} />
                                    {erro("validade")}
                                </div>
                            </div>
                        </fieldset>

                        {falha && (
                            <p role="alert" className="vpr-erro">
                                Não deu para gerar o PDF agora. Tente de novo.
                            </p>
                        )}

                        <button type="submit" className="vs-btn" disabled={gerando}>
                            <Download aria-hidden="true" />
                            {gerando ? "Gerando o PDF" : baixado ? "Baixar de novo" : "Baixar a proposta em PDF"}
                        </button>
                        <p className="vpr-form__nota">Grátis e sem cadastro. O PDF é montado no seu navegador e o que você digita não é enviado nem guardado.</p>
                    </form>

                    {baixado && (
                        <div ref={depoisRef} tabIndex={-1} className="vpr-depois vs-sol" role="status">
                            <h2 className="vs-display vpr-depois__titulo">Mande essa proposta e acompanhe a resposta pelo WhatsApp no Vyzon</h2>
                            <p className="vpr-depois__texto">
                                No 2º dia sem resposta do cliente, a Lume, assistente do Vyzon, te manda a mensagem de retomada pronta. Você responde 1 e ela sai do seu número.
                            </p>
                            <div className="mt-5 flex flex-col items-start gap-3">
                                <Link to={BLOG_CTA_HREF} className="vs-btn" onClick={() => eventoProposta(SLUG, "depois_do_download")}>
                                    {BLOG_CTA}
                                </Link>
                                <p className="vpr-depois__linha">{BLOG_CTA_LINHA}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="vpr-folha-caixa">
                    <p className="vpr-folha-rotulo" id="gp-previa">Prévia da proposta</p>
                    <div className="vpr-folha" role="img" aria-labelledby="gp-previa">
                        <div className="vpr-folha__topo">
                            <strong>{previa.empresa || <span className="vpr-vazio">Sua empresa</span>}</strong>
                            <span>{previa.contato}</span>
                        </div>
                        <p className="vpr-folha__sobre">PROPOSTA DE ENERGIA SOLAR</p>
                        <p className="vpr-folha__titulo">
                            Sistema de energia solar para {previa.cliente || <span className="vpr-vazio">nome do cliente</span>}
                        </p>
                        <dl className="vpr-folha__meta">
                            <div>
                                <dt>Data</dt>
                                <dd>{previa.data}</dd>
                            </div>
                            {previa.validade && (
                                <div>
                                    <dt>Válida até</dt>
                                    <dd>{previa.validade}</dd>
                                </div>
                            )}
                        </dl>
                        <dl className="vpr-folha__nums">
                            <div className="vpr-folha__num">
                                <dt>Consumo médio</dt>
                                <dd>
                                    {positivo(campos.consumo) ? previa.consumo : <span className="vpr-vazio">kWh</span>}
                                    <small>por mês</small>
                                </dd>
                            </div>
                            <div className="vpr-folha__num">
                                <dt>Sistema proposto</dt>
                                <dd>
                                    {positivo(campos.potencia) ? previa.potencia : <span className="vpr-vazio">kWp</span>}
                                    <small>de potência</small>
                                </dd>
                            </div>
                            <div className="vpr-folha__num">
                                <dt>Investimento</dt>
                                <dd>
                                    {positivo(campos.valor) ? previa.valor : <span className="vpr-vazio">R$</span>}
                                    <small>valor do sistema</small>
                                </dd>
                            </div>
                        </dl>
                        <p className="vpr-folha__h">Condições de pagamento</p>
                        <p className="vpr-folha__pag">{previa.pagamento || <span className="vpr-vazio">Como o cliente pode pagar.</span>}</p>
                        <div className="vpr-folha__aceite">
                            <div>
                                {previa.cliente || <span className="vpr-vazio">Cliente</span>}
                                <small>Cliente</small>
                            </div>
                            <div>
                                {previa.empresa || "Responsável"}
                                {previa.empresa && <small>Responsável</small>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PropostaShell>
    );
}
