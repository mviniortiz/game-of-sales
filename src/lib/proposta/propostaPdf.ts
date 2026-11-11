// Proposta de energia solar em PDF, montada no navegador. O documento leva só o
// que a pessoa digitou: nada de economia, geração ou retorno calculado aqui,
// porque esse papel vai para o cliente dela.
//
// O jsPDF entra como parâmetro para a página carregar a biblioteca só no clique
// (import("jspdf")) e para o teste rodar sem navegador.
import type { jsPDF as JsPDF } from "jspdf";

export interface PropostaDados {
    cliente: string;
    consumoKwh: number;
    potenciaKwp: number;
    valor: number;
    pagamento: string;
    empresa?: string;
    contato?: string;
    validadeDias?: number;
    data: Date;
}

// "24.900,50", "24900", "6,2" e "6.2" viram número. Com vírgula, ponto é milhar.
// Sem vírgula, um ponto seguido de exatos 3 dígitos é milhar ("24.900").
export function parseNumeroBR(texto: string): number {
    const t = texto.replace(/[^\d.,]/g, "");
    if (!t) return NaN;
    if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
    return Number(t);
}

const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const DINHEIRO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export interface PropostaTexto {
    empresa: string;
    contato: string;
    titulo: string;
    data: string;
    validade: string; // "" quando não informada
    consumo: string;
    potencia: string;
    valor: string;
    pagamento: string;
    cliente: string;
}

// Os mesmos textos alimentam a prévia na página e o PDF.
export function textoDaProposta(d: PropostaDados): PropostaTexto {
    const validade =
        d.validadeDias && d.validadeDias > 0 ? DATA.format(new Date(d.data.getTime() + d.validadeDias * 86_400_000)) : "";
    return {
        empresa: (d.empresa ?? "").trim(),
        contato: (d.contato ?? "").trim(),
        cliente: d.cliente.trim(),
        titulo: `Sistema de energia solar para ${d.cliente.trim()}`,
        data: DATA.format(d.data),
        validade,
        consumo: `${NUMERO.format(d.consumoKwh)} kWh`,
        potencia: `${NUMERO.format(d.potenciaKwp)} kWp`,
        // O Intl separa "R$" do número com espaço não separável (U+00A0), que a fonte do PDF tem.
        valor: DINHEIRO.format(d.valor),
        pagamento: d.pagamento.trim(),
    };
}

export function nomeDoArquivo(cliente: string): string {
    const slug = cliente
        .normalize("NFD")
        .replace(/[\u0300-\u036F]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    return `proposta-energia-solar${slug ? `-${slug}` : ""}.pdf`;
}

// A Helvetica embutida do PDF só tem Latin-1. Aspas curvas e travessões viram o
// equivalente simples; o que sobrar fora da tabela (emoji, por exemplo) sai.
function latin1(s: string): string {
    return s
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/\u202F/g, "\u00A0")
        .replace(/[^\n -\u00FF]/g, "");
}

const TINTA = [20, 22, 26] as const;
const SUAVE = [91, 97, 107] as const;
const LINHA = [218, 221, 225] as const;
const FUNDO = [244, 245, 243] as const;

export function montarPropostaPdf(JsPDFCtor: typeof JsPDF, dados: PropostaDados): JsPDF {
    const t = textoDaProposta(dados);
    const doc = new JsPDFCtor({ unit: "mm", format: "a4" });
    const W = 210;
    const H = 297;
    const M = 20;
    const largura = W - 2 * M;
    let y = 24;

    const cor = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
    const rodape = [t.empresa, t.contato].filter(Boolean).map(latin1).join("  ·  ");
    const fecharPagina = () => {
        if (!rodape) return;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        cor(SUAVE);
        doc.text(rodape, W / 2, H - 12, { align: "center" });
    };
    const garantir = (altura: number) => {
        if (y + altura <= H - 24) return;
        fecharPagina();
        doc.addPage();
        y = 24;
    };

    // Cabeçalho: empresa à esquerda, contato à direita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    cor(TINTA);
    doc.text(latin1(t.empresa || "Proposta comercial"), M, y);
    if (t.contato) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        cor(SUAVE);
        doc.text(latin1(t.contato), W - M, y, { align: "right" });
    }
    y += 5;
    doc.setDrawColor(LINHA[0], LINHA[1], LINHA[2]);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 18;

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    cor(SUAVE);
    doc.text("PROPOSTA DE ENERGIA SOLAR", M, y, { charSpace: 0.5 });
    y += 10;
    doc.setFontSize(22);
    cor(TINTA);
    const titulo = doc.splitTextToSize(latin1(t.titulo), largura) as string[];
    doc.text(titulo, M, y);
    y += titulo.length * 9.5 + 2;

    // Data e validade
    const meta: [string, string][] = [["Data", t.data]];
    if (t.validade) meta.push(["Válida até", t.validade]);
    meta.forEach(([rotulo, valor], i) => {
        const x = M + i * 48;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        cor(SUAVE);
        doc.text(rotulo, x, y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        cor(TINTA);
        doc.text(valor, x, y + 5.5);
    });
    y += 18;

    // Três números: consumo, sistema e investimento
    const vao = 5;
    const caixa = (largura - 2 * vao) / 3;
    const numeros: [string, string, string][] = [
        ["Consumo médio", t.consumo, "por mês"],
        ["Sistema proposto", t.potencia, "de potência"],
        ["Investimento", t.valor, "valor do sistema"],
    ];
    numeros.forEach(([rotulo, valor, unidade], i) => {
        const x = M + i * (caixa + vao);
        doc.setFillColor(FUNDO[0], FUNDO[1], FUNDO[2]);
        doc.roundedRect(x, y, caixa, 31, 2, 2, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        cor(SUAVE);
        doc.text(rotulo, x + 5, y + 8);
        doc.setFont("helvetica", "bold");
        // Valor grande encolhe até caber na caixa (ex.: R$ 1.250.000,00).
        let corpo = 16;
        doc.setFontSize(corpo);
        while (doc.getTextWidth(valor) > caixa - 10 && corpo > 9) {
            corpo -= 0.5;
            doc.setFontSize(corpo);
        }
        cor(TINTA);
        doc.text(valor, x + 5, y + 18.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        cor(SUAVE);
        doc.text(unidade, x + 5, y + 25);
    });
    y += 31 + 16;

    // Condições de pagamento (texto livre, quebra de linha e de página)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    cor(TINTA);
    doc.text("Condições de pagamento", M, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const linhas = latin1(t.pagamento)
        .split("\n")
        .flatMap((par) => (par.trim() ? (doc.splitTextToSize(par, largura) as string[]) : [""]));
    for (const linha of linhas) {
        garantir(6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        cor(TINTA);
        if (linha) doc.text(linha, M, y);
        y += 5.8;
    }

    // Aceite
    garantir(46);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    cor(TINTA);
    doc.text("Aceite", M, y);
    y += 22;
    const meio = (largura - 12) / 2;
    const assinaturas: [string, string][] = [
        [t.cliente, "Cliente"],
        [t.empresa || "Responsável", t.empresa ? "Responsável" : ""],
    ];
    assinaturas.forEach(([nome, papel], i) => {
        const x = M + i * (meio + 12);
        doc.setDrawColor(TINTA[0], TINTA[1], TINTA[2]);
        doc.setLineWidth(0.3);
        doc.line(x, y, x + meio, y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        cor(TINTA);
        doc.text((doc.splitTextToSize(latin1(nome), meio) as string[])[0], x, y + 5.5);
        if (papel) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            cor(SUAVE);
            doc.text(papel, x, y + 10);
        }
    });

    fecharPagina();
    return doc;
}
