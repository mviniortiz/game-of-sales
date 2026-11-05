// Gera os modelos de proposta de energia solar baixados no blog
// (/blog/modelo-proposta-comercial-energia-solar), em DOCX, PDF e prévia WEBP:
//   public/modelos/<nome>.docx   editável no Word / Google Docs (Arial)
//   public/modelos/<nome>.pdf    o mesmo conteúdo, desenhado em HTML e impresso pelo Playwright
//   public/modelos/previa/<nome>.webp   1ª página do PDF, ~900px, pra capa do card
//
// Os textos dos 3 modelos vivem em MODELOS (abaixo). Campo a preencher vai entre
// colchetes: "[Nome do cliente]" sai destacado nos dois formatos.
//
// Como rodar (o pacote `docx` fica FORA do repo, pra não virar dependência):
//   mkdir -p /tmp/modelos-build && (cd /tmp/modelos-build && npm init -y && npm i docx)
//   NODE_PATH=/tmp/modelos-build/node_modules node scripts/gen-modelos-proposta.mjs
// Playwright (chromium) e sharp vêm do node_modules do repo.
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
    AlignmentType, BorderStyle, Document, Footer, Packer, Paragraph, ShadingType,
    Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType,
} = require("docx");
const { chromium } = require("playwright");
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "modelos");

// Um acento só. No Word, troque a cor dos estilos "Título 1/2" e das bordas.
const COR = {
    acento: "0F6E56",
    tinta: "14161A",
    suave: "5B616B",
    linha: "DADDE1",
    fundo: "F4F5F3",
    campo: "FFF1B8",
    dica: "F1F7F4",
};
const RODAPE = "Modelo gratuito da Vyzon · vyzon.com.br";

// ─── Conteúdo ────────────────────────────────────────────────────────────────
// Tipos de bloco: cover, kpis, compare, section, p, kv, table, steps, ul, tip,
// note, sign, cta, page (quebra de página).

const residencial = {
    nome: "modelo-proposta-energia-solar",
    titulo: "Proposta de energia solar residencial",
    pagina: "a4",
    blocos: [
        {
            type: "cover",
            num: "01",
            eyebrow: "Proposta de energia solar",
            title: "Sistema de energia solar para [Nome do cliente]",
            meta: [
                ["Endereço da instalação", "[Rua, número, bairro, cidade]"],
                ["Data", "[dd/mm/aaaa]"],
                ["Válida até", "[dd/mm/aaaa]"],
                ["Responsável", "[Seu nome] · [WhatsApp]"],
            ],
        },
        { type: "section", num: "02", title: "Resumo da sua proposta", intro: "Os números entre colchetes são exemplo. Troque pelos do cliente." },
        {
            type: "kpis",
            items: [
                { label: "Sua conta de luz hoje", value: "R$ [480]", unit: "por mês" },
                { label: "Sistema proposto", value: "[6,2] kWp", unit: "[11] módulos de [565] W" },
                { label: "Investimento à vista", value: "R$ [24.900]", unit: "ou financiado" },
                { label: "Retorno do investimento", value: "[4] anos", unit: "aproximadamente" },
            ],
        },
        {
            type: "compare",
            left: { label: "Conta de luz hoje", value: "R$ [480]", unit: "por mês" },
            right: { label: "Parcela do financiamento", value: "R$ [___]", unit: "em [60] vezes" },
            caption: "Depois de quitado, a conta fica perto da taxa mínima da distribuidora.",
        },
        { type: "tip", text: "Esta é a página mais importante. Se o cliente ler só ela, precisa entender quanto paga hoje, quanto vai pagar e em quanto tempo o dinheiro volta." },
        { type: "page" },
        { type: "section", num: "03", title: "Seu consumo e o sistema ideal" },
        { type: "p", text: "Média de consumo dos últimos 12 meses: [___] kWh por mês, conforme a sua conta de luz." },
        {
            type: "kv",
            rows: [
                ["Potência do sistema", "[___] kWp"],
                ["Geração estimada", "[___] kWh por mês"],
                ["Irradiação considerada", "[cidade]"],
                ["Área no telhado", "cerca de [___] m²"],
                ["Tipo de telhado", "[cerâmico / fibrocimento / metálico / laje]"],
            ],
        },
        { type: "tip", text: "Mostre a conta junto com o resultado. O cliente confia mais quando vê de onde veio o número." },
        { type: "section", num: "04", title: "Equipamentos" },
        {
            type: "table",
            head: ["Item", "Especificação", "Garantia"],
            widths: [24, 50, 26],
            rows: [
                ["Módulos", "[Marca e modelo] · [quantidade] unidades", "[__] anos"],
                ["Inversor", "[Marca e modelo]", "[__] anos"],
                ["Estrutura", "[Tipo e marca]", "[__] anos"],
                ["Instalação", "Mão de obra da [sua empresa]", "[__] anos"],
            ],
        },
        { type: "section", num: "05", title: "Investimento e formas de pagamento" },
        {
            type: "table",
            head: ["Forma", "Valor", "Observação"],
            widths: [24, 34, 42],
            rows: [
                ["À vista", "R$ [24.900]", "[desconto, se houver]"],
                ["Cartão de crédito", "[__]x de R$ [___]", "[taxas, se houver]"],
                ["Financiamento", "[60]x de R$ [___]", "Banco: [___] · entrada: R$ [___]"],
            ],
        },
        { type: "tip", text: "No financiamento, coloque a parcela ao lado da conta de luz de hoje. É o argumento mais forte da proposta." },
        { type: "page" },
        { type: "section", num: "06", title: "Retorno do investimento" },
        {
            type: "kv",
            rows: [
                ["Economia por mês", "R$ [___]"],
                ["Economia por ano", "R$ [___]"],
                ["Tempo de retorno", "cerca de [__] anos"],
                ["Depois do retorno", "A conta fica perto da taxa mínima da distribuidora pelo resto da vida útil do sistema."],
            ],
        },
        { type: "note", text: "Valores estimados com base no consumo informado e na tarifa atual. A economia real depende do consumo e dos reajustes da distribuidora." },
        { type: "section", num: "07", title: "Prazos" },
        {
            type: "steps",
            items: [
                ["Projeto e documentação", "[__] dias"],
                ["Aprovação na distribuidora", "[__] dias, depende da [distribuidora]"],
                ["Instalação", "[__] dias"],
                ["Sistema ligado e gerando", "cerca de [__] dias depois da assinatura"],
            ],
        },
        { type: "section", num: "08", title: "Garantias e pós-venda" },
        {
            type: "kv",
            rows: [
                ["Monitoramento", "[Como o cliente acompanha a geração, por exemplo pelo aplicativo do inversor]"],
                ["Suporte", "Se algo parar, fale com [nome] no WhatsApp [número]. Atendimento em até [__] horas úteis."],
                ["Manutenção", "[O que está incluso e com que frequência]"],
            ],
        },
        { type: "section", num: "09", title: "Próximo passo" },
        { type: "cta", text: "Para aprovar, responda esta proposta no WhatsApp ou fale com [Seu nome]. A gente agenda a visita técnica e envia o contrato.", sub: "Esta proposta vale até [dd/mm/aaaa]." },
        { type: "sign", lines: ["Aceite do cliente", "Data"] },
    ],
};

const whatsapp = {
    nome: "resumo-proposta-energia-solar-whatsapp",
    titulo: "Resumo da proposta para o WhatsApp",
    pagina: "celular",
    blocos: [
        { type: "cover", compact: true, eyebrow: "Resumo da proposta", title: "Energia solar para [Nome do cliente]", meta: [["Válida até", "[dd/mm/aaaa]"]] },
        {
            type: "compare",
            left: { label: "Sua conta de luz hoje", value: "R$ [480]", unit: "por mês" },
            right: { label: "Parcela do solar", value: "R$ [___]", unit: "em [60]x" },
            caption: "Quitou, a conta cai para perto da taxa mínima.",
        },
        {
            type: "kpis",
            items: [
                { label: "Sistema", value: "[6,2] kWp", unit: "[11] módulos" },
                { label: "À vista", value: "R$ [24.900]", unit: "" },
                { label: "Economia", value: "R$ [___]", unit: "por mês" },
                { label: "Retorno", value: "[4] anos", unit: "aproximadamente" },
            ],
        },
        { type: "cta", text: "Para aprovar, responda “quero” aqui no WhatsApp. A gente agenda a visita técnica.", sub: "[Seu nome] · [Nome da sua empresa] · [WhatsApp]" },
        { type: "tip", text: "Mande esta página junto com a proposta completa, no mesmo envio." },
    ],
};

const empresa = {
    nome: "proposta-energia-solar-empresa",
    titulo: "Proposta de energia solar para empresa e comércio",
    pagina: "a4",
    blocos: [
        {
            type: "cover",
            num: "01",
            eyebrow: "Proposta de energia solar para empresas",
            title: "Energia solar para [Razão social]",
            meta: [
                ["CNPJ", "[00.000.000/0000-00]"],
                ["Endereço da unidade", "[Rua, número, bairro, cidade]"],
                ["Unidade consumidora", "[número da UC na conta]"],
                ["A/C", "[Nome e cargo de quem decide]"],
                ["Data", "[dd/mm/aaaa]"],
                ["Válida até", "[dd/mm/aaaa]"],
            ],
        },
        { type: "section", num: "02", title: "Resumo da proposta", intro: "Os números entre colchetes são exemplo. Troque pelos da empresa." },
        { type: "kpis", big: true, items: [{ label: "Economia estimada por ano", value: "R$ [___]", unit: "a partir do primeiro ano com o sistema ligado" }] },
        {
            type: "kpis",
            items: [
                { label: "Conta de energia hoje", value: "R$ [3.800]", unit: "por mês" },
                { label: "Sistema proposto", value: "[40] kWp", unit: "[70] módulos de [575] W" },
                { label: "Investimento", value: "R$ [___]", unit: "à vista ou financiado" },
                { label: "Retorno", value: "[__] anos", unit: "aproximadamente" },
            ],
        },
        { type: "tip", text: "Para empresa, o número que decide é a economia por ano. Deixe ele maior que todos os outros." },
        { type: "page" },
        { type: "section", num: "03", title: "Consumo da empresa e o sistema ideal" },
        { type: "p", text: "Média de consumo dos últimos 12 meses: [___] kWh por mês. Mês de maior consumo: [mês], com [___] kWh." },
        {
            type: "kv",
            rows: [
                ["Horário de maior uso", "[comercial / dia todo / noturno]"],
                ["Potência do sistema", "[___] kWp"],
                ["Geração estimada", "[___] kWh por mês, com a irradiação de [cidade]"],
                ["Onde vai o sistema", "[telhado / solo / estacionamento], cerca de [___] m²"],
                ["Tipo de estrutura", "[___]"],
            ],
        },
        { type: "tip", text: "Use as 12 últimas contas. Empresa costuma ter mês de pico, e quem decide quer ver que você levou isso em conta." },
        { type: "section", num: "04", title: "Equipamentos" },
        {
            type: "table",
            head: ["Item", "Especificação", "Garantia"],
            widths: [24, 50, 26],
            rows: [
                ["Módulos", "[Marca e modelo] · [quantidade] unidades", "[__] anos"],
                ["Inversor", "[Marca e modelo] · [quantidade]", "[__] anos"],
                ["Estrutura", "[Tipo e marca]", "[__] anos"],
                ["Instalação", "Mão de obra da [sua empresa]", "[__] anos"],
            ],
        },
        { type: "section", num: "05", title: "Investimento e formas de pagamento" },
        {
            type: "table",
            head: ["Forma", "Valor", "Observação"],
            widths: [26, 32, 42],
            rows: [
                ["À vista", "R$ [___]", "[desconto, se houver]"],
                ["Financiamento PJ", "[__]x de R$ [___]", "Banco ou linha: [___] · carência: [__] meses"],
                ["Entrada + parcelas", "R$ [___] + [__]x de R$ [___]", "[boleto / cartão]"],
            ],
        },
        { type: "compare", left: { label: "Conta de energia hoje", value: "R$ [3.800]", unit: "por mês" }, right: { label: "Parcela do financiamento", value: "R$ [___]", unit: "em [__] vezes" }, caption: "A parcela ao lado da conta de hoje mostra o caixa da empresa mês a mês." },
        { type: "page" },
        { type: "section", num: "06", title: "Retorno do investimento" },
        {
            type: "kv",
            rows: [
                ["Economia por mês", "R$ [___]"],
                ["Economia no primeiro ano", "R$ [___]"],
                ["Economia acumulada em 5 anos", "R$ [___]"],
                ["Economia acumulada em 10 anos", "R$ [___]"],
                ["Tempo de retorno", "cerca de [__] anos"],
            ],
        },
        { type: "note", text: "Valores estimados com base no consumo informado e na tarifa atual. A economia real depende do consumo da empresa e dos reajustes da distribuidora." },
        { type: "section", num: "07", title: "Prazos" },
        {
            type: "steps",
            items: [
                ["Projeto e documentação", "[__] dias"],
                ["Aprovação na distribuidora", "[__] dias, depende da [distribuidora]"],
                ["Instalação", "[__] dias, combinada para [não parar a operação / fim de semana]"],
                ["Sistema ligado e gerando", "cerca de [__] dias depois da assinatura"],
            ],
        },
        { type: "section", num: "08", title: "Documentos para fechar" },
        {
            type: "ul",
            items: [
                "Contrato social ou requerimento de empresário",
                "Cartão CNPJ",
                "As 12 últimas contas de energia da unidade",
                "Documento de identidade de quem assina",
            ],
        },
        { type: "page" },
        { type: "section", num: "09", title: "Garantias e pós-venda" },
        {
            type: "kv",
            rows: [
                ["Monitoramento", "[Aplicativo do inversor / relatório mensal por e-mail]"],
                ["Suporte", "[Nome] no WhatsApp [número], atendimento em até [__] horas úteis"],
                ["Manutenção", "[Limpeza e revisão incluídas, com que frequência]"],
            ],
        },
        { type: "section", num: "10", title: "Aprovação" },
        { type: "cta", text: "Para aprovar, responda esta proposta ou fale com [Seu nome] no [WhatsApp]. A gente agenda a visita técnica e envia o contrato.", sub: "Esta proposta vale até [dd/mm/aaaa]." },
        {
            type: "kv",
            rows: [
                ["Nome de quem assina", "[___]"],
                ["Cargo", "[___]"],
                ["CPF", "[___]"],
            ],
        },
        { type: "sign", lines: ["Assinatura", "Data"] },
    ],
};

const MODELOS = [residencial, whatsapp, empresa];

// ─── HTML (PDF) ──────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const campos = (s) => esc(s).replace(/\[([^\]]*)\]/g, '<span class="f">$1</span>');

function blocoHtml(b) {
    switch (b.type) {
        case "cover":
            return `<header class="cover${b.compact ? " compact" : ""}">
  <div class="cover-top"><div class="logo">LOGO DA SUA EMPRESA</div>${b.compact ? "" : `<div class="empresa">${campos("[Nome da sua empresa]")}<br>${campos("[WhatsApp] · [e-mail]")}</div>`}</div>
  <p class="eyebrow">${b.num ? `<span class="num">${esc(b.num)}</span>&nbsp;&nbsp;&nbsp;` : ""}${esc(b.eyebrow)}</p>
  <h1>${campos(b.title)}</h1>
  ${b.compact ? `<p class="validade">${b.meta.map(([k, v]) => `${esc(k)} ${campos(v)}`).join(" · ")}</p>` : `<dl class="meta">${b.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${campos(v)}</dd></div>`).join("")}</dl>`}
</header>`;
        case "section":
            return `<div class="section"><span class="num">${esc(b.num)}</span><h2>${esc(b.title)}</h2>${b.intro ? `<p class="intro">${esc(b.intro)}</p>` : ""}</div>`;
        case "kpis":
            return `<div class="kpis${b.big ? " big" : ""} n${b.items.length}">${b.items
                .map((k) => `<div class="kpi"><span class="kl">${esc(k.label)}</span><span class="kv">${campos(k.value)}</span>${k.unit ? `<span class="ku">${campos(k.unit)}</span>` : ""}</div>`)
                .join("")}</div>`;
        case "compare":
            return `<div class="compare"><div class="side"><span class="kl">${esc(b.left.label)}</span><span class="kv">${campos(b.left.value)}</span><span class="ku">${campos(b.left.unit)}</span></div><div class="vs">ao lado de</div><div class="side on"><span class="kl">${esc(b.right.label)}</span><span class="kv">${campos(b.right.value)}</span><span class="ku">${campos(b.right.unit)}</span></div><p class="cap">${campos(b.caption)}</p></div>`;
        case "p":
            return `<p class="p">${campos(b.text)}</p>`;
        case "kv":
            return `<table class="kvt">${b.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${campos(v)}</td></tr>`).join("")}</table>`;
        case "table":
            return `<table class="tb"><colgroup>${b.widths.map((w) => `<col style="width:${w}%">`).join("")}</colgroup><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
                .map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="first"' : ""}>${campos(c)}</td>`).join("")}</tr>`)
                .join("")}</tbody></table>`;
        case "steps":
            return `<ol class="steps">${b.items.map(([k, v], i) => `<li><span class="sn">${i + 1}</span><span class="sk">${esc(k)}</span><span class="sv">${campos(v)}</span></li>`).join("")}</ol>`;
        case "ul":
            return `<ul class="ul">${b.items.map((t) => `<li>${campos(t)}</li>`).join("")}</ul>`;
        case "tip":
            return `<aside class="tip"><b>Dica</b> ${campos(b.text)} <i>Apague esta caixa antes de enviar.</i></aside>`;
        case "note":
            return `<p class="note">${campos(b.text)}</p>`;
        case "cta":
            return `<div class="cta"><p>${campos(b.text)}</p><p class="sub">${campos(b.sub)}</p></div>`;
        case "sign":
            return `<div class="sign">${b.lines.map((l) => `<div><span></span>${esc(l)}</div>`).join("")}</div>`;
        default:
            return "";
    }
}

async function html(modelo) {
    const fonte = (await readFile(path.join(ROOT, "public/fonts/inter/inter-variable-latin.woff2"))).toString("base64");
    const celular = modelo.pagina === "celular";
    const paginas = [[]];
    for (const b of modelo.blocos) {
        if (b.type === "page") paginas.push([]);
        else paginas[paginas.length - 1].push(b);
    }
    const W = celular ? "120mm" : "210mm";
    const H = celular ? "213mm" : "297mm";
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url(data:font/woff2;base64,${fonte}) format("woff2"); font-weight: 100 900; }
@page { size: ${W} ${H}; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --a: #${COR.acento}; --t: #${COR.tinta}; --s: #${COR.suave}; --l: #${COR.linha}; --bg: #${COR.fundo}; --f: #${COR.campo}; --d: #${COR.dica}; }
body { font-family: Inter, system-ui, sans-serif; color: var(--t); font-size: ${celular ? "10.5pt" : "10pt"}; line-height: 1.5; -webkit-font-smoothing: antialiased; }
.kv { font-variant-numeric: tabular-nums; }
.page { width: ${W}; height: ${H}; padding: ${celular ? "11mm 9mm 12mm" : "17mm 18mm 18mm"}; position: relative; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; gap: ${celular ? "4.2mm" : "5mm"}; }
.page:last-child { page-break-after: auto; }
.foot { position: absolute; left: ${celular ? "9mm" : "18mm"}; right: ${celular ? "9mm" : "18mm"}; bottom: ${celular ? "5mm" : "8mm"}; display: flex; justify-content: space-between; font-size: 7pt; color: var(--s); border-top: 0.5pt solid var(--l); padding-top: 2mm; }
.f { background: var(--f); border-radius: 2px; padding: 0 2px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.cover { display: flex; flex-direction: column; gap: 3mm; padding-bottom: ${celular ? "1mm" : "4mm"}; }
.cover-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${celular ? "3mm" : "9mm"}; }
.logo { border: 1pt dashed #b6bbc2; color: var(--s); font-size: 7.5pt; font-weight: 600; letter-spacing: .08em; padding: ${celular ? "3mm 4mm" : "5mm 7mm"}; border-radius: 3px; }
.empresa { text-align: right; font-size: 8.5pt; color: var(--s); line-height: 1.6; }
.eyebrow { color: var(--a); font-weight: 650; font-size: ${celular ? "9pt" : "9.5pt"}; letter-spacing: .02em; }
h1 { font-size: ${celular ? "19pt" : "27pt"}; line-height: 1.12; letter-spacing: -0.025em; font-weight: 700; max-width: 150mm; }
h1 .f { padding: 0 3px; }
.meta { display: grid; grid-template-columns: ${celular ? "1fr" : "1fr 1fr"}; gap: 2.4mm 8mm; margin-top: ${celular ? "1mm" : "5mm"}; border-top: 0.75pt solid var(--t); padding-top: 3.5mm; }
.validade { font-size: 9pt; color: var(--s); }
.meta dt { font-size: 7.5pt; color: var(--s); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
.meta dd { font-size: 9.5pt; font-weight: 500; }
.section { display: grid; grid-template-columns: auto 1fr; column-gap: 3mm; align-items: baseline; margin-top: 3mm; }
.section .num { color: var(--a); font-weight: 700; font-size: 10pt; }
h2 { font-size: 15pt; letter-spacing: -0.015em; font-weight: 700; line-height: 1.2; }
.intro { grid-column: 2; color: var(--s); font-size: 8.5pt; margin-top: 1mm; }
.kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
.kpis.n1 { grid-template-columns: 1fr; }
.kpi { background: var(--bg); border-radius: 4px; padding: ${celular ? "3mm 3.5mm" : "4mm 5mm"}; display: flex; flex-direction: column; gap: .6mm; }
.kl { font-size: 8pt; color: var(--s); font-weight: 550; }
.kv { font-size: ${celular ? "15pt" : "19pt"}; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; }
.ku { font-size: 8pt; color: var(--s); }
.kpis.big .kpi { background: var(--t); color: #fff; padding: ${celular ? "4.5mm 4.5mm" : "6mm 6mm"}; }
.kpis.big .kl, .kpis.big .ku { color: rgba(255,255,255,.72); }
.kpis.big .kv { font-size: ${celular ? "28pt" : "34pt"}; }
.kpis.big .f, .cta .f { background: rgba(255,241,184,.14); color: #ffe9a0; }
.compare { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 3mm; border: 0.75pt solid var(--l); border-radius: 4px; padding: ${celular ? "3.5mm" : "4.5mm 5mm"}; }
.compare .side { display: flex; flex-direction: column; gap: .6mm; }
.compare .side.on .kv { color: var(--a); }
.compare .vs { font-size: 7.5pt; color: var(--s); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; ${celular ? "writing-mode: horizontal-tb;" : ""} }
.compare .cap { grid-column: 1 / -1; font-size: 8.5pt; color: var(--s); border-top: 0.5pt solid var(--l); padding-top: 2.5mm; }
.p { font-size: 10pt; }
table { width: 100%; border-collapse: collapse; }
.kvt th { text-align: left; font-weight: 600; width: 38%; padding: 2.1mm 4mm 2.1mm 0; vertical-align: top; font-size: 9.5pt; }
.kvt td { padding: 2.1mm 0; vertical-align: top; }
.kvt tr { border-bottom: 0.5pt solid var(--l); }
.kvt tr:first-child { border-top: 0.5pt solid var(--l); }
.tb th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: var(--s); font-weight: 600; padding: 0 3mm 2mm 0; border-bottom: 1pt solid var(--a); }
.tb td { padding: 2.3mm 3mm 2.3mm 0; border-bottom: 0.5pt solid var(--l); vertical-align: top; }
.tb td.first { font-weight: 600; }
.steps { list-style: none; display: flex; flex-direction: column; }
.steps li { display: grid; grid-template-columns: 7mm 42% 1fr; align-items: baseline; padding: 2.1mm 0; border-bottom: 0.5pt solid var(--l); }
.steps li:first-child { border-top: 0.5pt solid var(--l); }
.sn { color: var(--a); font-weight: 700; }
.sk { font-weight: 600; font-size: 9.5pt; }
.ul { padding-left: 5mm; display: flex; flex-direction: column; gap: 1.4mm; }
.ul li::marker { color: var(--a); }
.tip { background: var(--d); border-left: 2pt solid var(--a); padding: 2.6mm 4mm; font-size: 8.5pt; color: #2d3b35; border-radius: 0 3px 3px 0; }
.tip b { color: var(--a); margin-right: 1mm; }
.tip i { color: var(--s); }
.note { font-size: 8pt; color: var(--s); }
.cta { background: var(--t); color: #fff; border-radius: 4px; padding: ${celular ? "4.5mm" : "6mm 7mm"}; display: flex; flex-direction: column; gap: 2mm; }
.cta p { font-size: ${celular ? "11pt" : "12pt"}; font-weight: 600; line-height: 1.4; }
.cta .sub { font-size: 8.5pt; font-weight: 400; color: rgba(255,255,255,.75); }
.sign { display: grid; grid-template-columns: 2fr 1fr; gap: 10mm; margin-top: 7mm; }
.sign div { display: flex; flex-direction: column; gap: 1.5mm; font-size: 8pt; color: var(--s); }
.sign span { border-top: 0.75pt solid var(--t); }
</style></head><body>
${paginas
    .map((blocos, i) => `<section class="page">${blocos.map(blocoHtml).join("\n")}<div class="foot"><span>${RODAPE}</span><span>${celular ? "" : `${i + 1} / ${paginas.length}`}</span></div></section>`)
    .join("\n")}
</body></html>`;
}

// ─── DOCX ────────────────────────────────────────────────────────────────────

const FONTE = "Arial";
let LARG = 9865; // largura útil da página em twips (A4 menos as margens)
const pt = (n) => n * 2; // docx usa meio ponto
const SEM_BORDA = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const SEM_BORDAS = { top: SEM_BORDA, bottom: SEM_BORDA, left: SEM_BORDA, right: SEM_BORDA, insideHorizontal: SEM_BORDA, insideVertical: SEM_BORDA };
const linha = (cor = COR.linha, size = 4) => ({ style: BorderStyle.SINGLE, size, color: cor });

function runs(text, opts = {}) {
    const partes = String(text).split(/(\[[^\]]*\])/).filter(Boolean);
    return partes.map((p) => {
        const campo = p.startsWith("[") && p.endsWith("]");
        return new TextRun({
            text: campo ? p.slice(1, -1) : p,
            font: FONTE,
            color: opts.color ?? COR.tinta,
            size: pt(opts.size ?? 10),
            bold: opts.bold,
            italics: opts.italics,
            ...(campo && !opts.semCampo ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: opts.campoFill ?? COR.campo } } : {}),
        });
    });
}
const para = (text, opts = {}, pOpts = {}) => new Paragraph({ children: runs(text, opts), spacing: { after: opts.after ?? 0, before: opts.before ?? 0, line: opts.line ?? 276 }, ...pOpts });
const espaco = (after = 160) => new Paragraph({ children: [], spacing: { after } });

function celula(children, opts = {}) {
    return new TableCell({
        children,
        width: opts.width ? { size: Math.round((LARG * opts.width) / 100), type: WidthType.DXA } : undefined,
        shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
        borders: opts.borders ?? { top: SEM_BORDA, bottom: SEM_BORDA, left: SEM_BORDA, right: SEM_BORDA },
        margins: opts.margins ?? { top: 100, bottom: 100, left: 0, right: 120 },
        verticalAlign: opts.valign ?? VerticalAlign.TOP,
        columnSpan: opts.span,
    });
}
const tabela = (rows, pcts, extra = {}) =>
    new Table({ rows, width: { size: LARG, type: WidthType.DXA }, columnWidths: pcts.map((p) => Math.round((LARG * p) / 100)), layout: TableLayoutType.FIXED, borders: SEM_BORDAS, ...extra });

function kpiCell(k, { big, width, celular }) {
    const fill = big ? COR.tinta : COR.fundo;
    const claro = big ? "C9CCD1" : COR.suave;
    const cor = big ? "FFFFFF" : COR.tinta;
    const campoFill = big ? "3A3F47" : COR.campo;
    return celula(
        [
            para(k.label, { size: 8, color: claro, after: 40 }),
            para(k.value, { size: big ? (celular ? 26 : 30) : celular ? 15 : 18, bold: true, color: cor, campoFill, after: 30, line: 240 }),
            ...(k.unit ? [para(k.unit, { size: 8, color: claro, campoFill })] : []),
        ],
        { fill, width, margins: { top: 160, bottom: 160, left: 200, right: 200 } },
    );
}

function blocoDocx(b, celular) {
    switch (b.type) {
        case "cover": {
            const topo = tabela([
                new TableRow({
                    children: [
                        celula([para("LOGO DA SUA EMPRESA", { size: 7.5, bold: true, color: COR.suave })], {
                            width: 45,
                            borders: { top: linha("B6BBC2", 6), bottom: linha("B6BBC2", 6), left: linha("B6BBC2", 6), right: linha("B6BBC2", 6) },
                            margins: { top: 200, bottom: 200, left: 240, right: 240 },
                        }),
                        celula(b.compact ? [para("")] : [para("[Nome da sua empresa]", { size: 8.5, color: COR.suave }, { alignment: AlignmentType.RIGHT }), para("[WhatsApp] · [e-mail]", { size: 8.5, color: COR.suave }, { alignment: AlignmentType.RIGHT })], { width: 55 }),
                    ],
                }),
            ], [45, 55]);
            const meta = [];
            const porLinha = celular ? 1 : 2;
            for (let i = 0; i < b.meta.length; i += porLinha) {
                meta.push(
                    new TableRow({
                        children: b.meta.slice(i, i + porLinha).map(([k, v]) =>
                            celula([para(k.toUpperCase(), { size: 7.5, bold: true, color: COR.suave, after: 20 }), para(v, { size: 9.5 })], { width: 100 / porLinha, margins: { top: 80, bottom: 80, left: 0, right: 200 } }),
                        ),
                    }),
                );
            }
            return [
                topo,
                espaco(celular ? 240 : 600),
                para(b.num ? `${b.num}   ${b.eyebrow}` : b.eyebrow, { size: 9.5, bold: true, color: COR.acento, after: 80 }),
                para(b.title, { size: celular ? 19 : 26, bold: true, after: 200, line: 260 }),
                new Paragraph({ children: [], border: { top: linha(COR.tinta, 8) }, spacing: { after: 60 } }),
                tabela(meta, porLinha === 1 ? [100] : [50, 50]),
                espaco(120),
            ];
        }
        case "section":
            return [
                new Paragraph({
                    heading: "Heading2",
                    children: [new TextRun({ text: `${b.num}   `, font: FONTE, bold: true, color: COR.acento, size: pt(11) }), new TextRun({ text: b.title, font: FONTE, bold: true, color: COR.tinta, size: pt(15) })],
                    spacing: { before: b.quebra ? 0 : 280, after: b.intro ? 40 : 140 },
                    keepNext: true,
                    pageBreakBefore: Boolean(b.quebra),
                }),
                ...(b.intro ? [para(b.intro, { size: 8.5, color: COR.suave, after: 140 })] : []),
            ];
        case "kpis": {
            const porLinha = b.items.length === 1 ? 1 : 2;
            const rows = [];
            for (let i = 0; i < b.items.length; i += porLinha) {
                const cells = [];
                b.items.slice(i, i + porLinha).forEach((k, j) => {
                    if (j > 0) cells.push(celula([para("")], { width: 2 }));
                    cells.push(kpiCell(k, { big: b.big, width: porLinha === 1 ? 100 : 49, celular }));
                });
                rows.push(new TableRow({ children: cells, cantSplit: true }));
                if (i + porLinha < b.items.length) rows.push(new TableRow({ children: [celula([para("", { size: 4 })], { span: porLinha === 1 ? 1 : 3, margins: { top: 0, bottom: 0, left: 0, right: 0 } })], height: { value: 100, rule: "exact" } }));
            }
            return [tabela(rows, porLinha === 1 ? [100] : [49, 2, 49]), espaco(140)];
        }
        case "compare": {
            const lado = (s, on) => celula([para(s.label, { size: 8, color: COR.suave, after: 40 }), para(s.value, { size: celular ? 15 : 18, bold: true, color: on ? COR.acento : COR.tinta, after: 20 }), para(s.unit, { size: 8, color: COR.suave })], { width: 42, margins: { top: 160, bottom: 120, left: 200, right: 120 } });
            return [
                new Table({
                    width: { size: LARG, type: WidthType.DXA },
                    columnWidths: [42, 16, 42].map((p) => Math.round((LARG * p) / 100)),
                    layout: TableLayoutType.FIXED,
                    borders: { ...SEM_BORDAS, top: linha(), bottom: linha(), left: linha(), right: linha() },
                    rows: [
                        new TableRow({ cantSplit: true, children: [lado(b.left, false), celula([para("AO LADO DE", { size: 7.5, bold: true, color: COR.suave }, { alignment: AlignmentType.CENTER })], { width: 16, valign: VerticalAlign.CENTER, margins: { top: 0, bottom: 0, left: 0, right: 0 } }), lado(b.right, true)] }),
                        new TableRow({ cantSplit: true, children: [celula([para(b.caption, { size: 8.5, color: COR.suave })], { span: 3, borders: { top: linha(), bottom: SEM_BORDA, left: SEM_BORDA, right: SEM_BORDA }, margins: { top: 120, bottom: 140, left: 200, right: 200 } })] }),
                    ],
                }),
                espaco(140),
            ];
        }
        case "p":
            return [para(b.text, { after: 140 })];
        case "kv":
            return [
                tabela(
                    b.rows.map(([k, v], i) =>
                        new TableRow({
                            cantSplit: true,
                            children: [
                                celula([para(k, { bold: true, size: 9.5 })], { width: 38, borders: { top: i === 0 ? linha() : SEM_BORDA, bottom: linha(), left: SEM_BORDA, right: SEM_BORDA } }),
                                celula([para(v, { size: 10 })], { width: 62, borders: { top: i === 0 ? linha() : SEM_BORDA, bottom: linha(), left: SEM_BORDA, right: SEM_BORDA } }),
                            ],
                        }),
                    ),
                    [38, 62],
                ),
                espaco(140),
            ];
        case "table":
            return [
                tabela([
                    new TableRow({
                        tableHeader: true,
                        children: b.head.map((h, i) => celula([para(h.toUpperCase(), { size: 7.5, bold: true, color: COR.suave })], { width: b.widths[i], borders: { top: SEM_BORDA, bottom: linha(COR.acento, 8), left: SEM_BORDA, right: SEM_BORDA }, margins: { top: 0, bottom: 80, left: 0, right: 120 } })),
                    }),
                    ...b.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => celula([para(c, { bold: i === 0, size: 9.5 })], { width: b.widths[i], borders: { top: SEM_BORDA, bottom: linha(), left: SEM_BORDA, right: SEM_BORDA } })) })),
                ], b.widths),
                espaco(140),
            ];
        case "steps":
            return [
                tabela(
                    b.items.map(([k, v], i) =>
                        new TableRow({
                            cantSplit: true,
                            children: [
                                celula([para(String(i + 1), { bold: true, color: COR.acento })], { width: 6, borders: { top: i === 0 ? linha() : SEM_BORDA, bottom: linha(), left: SEM_BORDA, right: SEM_BORDA } }),
                                celula([para(k, { bold: true, size: 9.5 })], { width: 38, borders: { top: i === 0 ? linha() : SEM_BORDA, bottom: linha(), left: SEM_BORDA, right: SEM_BORDA } }),
                                celula([para(v)], { width: 56, borders: { top: i === 0 ? linha() : SEM_BORDA, bottom: linha(), left: SEM_BORDA, right: SEM_BORDA } }),
                            ],
                        }),
                    ),
                    [6, 38, 56],
                ),
                espaco(140),
            ];
        case "ul":
            return [...b.items.map((t) => new Paragraph({ children: runs(t), bullet: { level: 0 }, spacing: { after: 60 } })), espaco(100)];
        case "tip":
            return [
                tabela([
                    new TableRow({
                        cantSplit: true,
                        children: [
                            celula(
                                [new Paragraph({ children: [new TextRun({ text: "Dica  ", bold: true, color: COR.acento, font: FONTE, size: pt(8.5) }), ...runs(b.text, { size: 8.5, color: "2D3B35" }), new TextRun({ text: " Apague esta caixa antes de enviar.", italics: true, color: COR.suave, font: FONTE, size: pt(8.5) })] })],
                                { fill: COR.dica, borders: { top: SEM_BORDA, bottom: SEM_BORDA, right: SEM_BORDA, left: linha(COR.acento, 16) }, margins: { top: 120, bottom: 120, left: 200, right: 200 } },
                            ),
                        ],
                    }),
                ], [100]),
                espaco(140),
            ];
        case "note":
            return [para(b.text, { size: 8, color: COR.suave, after: 140 })];
        case "cta":
            return [
                tabela([
                    new TableRow({
                        cantSplit: true,
                        children: [celula([para(b.text, { size: celular ? 11 : 12, bold: true, color: "FFFFFF", campoFill: "3A3F47", after: 100 }), para(b.sub, { size: 8.5, color: "C9CCD1", campoFill: "3A3F47" })], { fill: COR.tinta, margins: { top: 220, bottom: 220, left: 260, right: 260 } })],
                    }),
                ], [100]),
                espaco(160),
            ];
        case "sign":
            return [
                espaco(500),
                tabela([
                    new TableRow({
                        children: b.lines.flatMap((l, i) => [
                            ...(i > 0 ? [celula([para("")], { width: 8 })] : []),
                            celula([para(l, { size: 8, color: COR.suave })], { width: i === 0 ? 60 : 32, borders: { top: linha(COR.tinta, 6), bottom: SEM_BORDA, left: SEM_BORDA, right: SEM_BORDA } }),
                        ]),
                    }),
                ], b.lines.length === 2 ? [60, 8, 32] : [100]),
            ];
        case "page":
            return []; // vira pageBreakBefore no título seguinte (ver docx())
        default:
            return [];
    }
}

async function docx(modelo) {
    const celular = modelo.pagina === "celular";
    const mm = (n) => Math.round(n * 56.7);
    LARG = celular ? mm(120) - 2 * mm(9) : 11906 - 2 * mm(18);
    const doc = new Document({
        creator: "Vyzon",
        title: modelo.titulo,
        description: "Modelo gratuito da Vyzon · vyzon.com.br",
        styles: {
            default: { document: { run: { font: FONTE, size: pt(10), color: COR.tinta } } },
            paragraphStyles: [{ id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONTE, bold: true, size: pt(15), color: COR.tinta } }],
        },
        sections: [
            {
                properties: {
                    page: {
                        size: celular ? { width: mm(120), height: mm(213) } : { width: 11906, height: 16838 },
                        margin: celular ? { top: mm(11), bottom: mm(12), left: mm(9), right: mm(9), footer: mm(5) } : { top: mm(17), bottom: mm(18), left: mm(18), right: mm(18), footer: mm(8) },
                    },
                },
                footers: { default: new Footer({ children: [para(RODAPE, { size: 7, color: COR.suave })] }) },
                children: modelo.blocos.flatMap((b, i, todos) => blocoDocx(todos[i - 1]?.type === "page" ? { ...b, quebra: true } : b, celular)),
            },
        ],
    });
    return Packer.toBuffer(doc);
}

// ─── Saída ───────────────────────────────────────────────────────────────────

await mkdir(path.join(OUT, "previa"), { recursive: true });
// Usa o chromium do Playwright; se a versão instalada não bater, cai no
// chrome-headless-shell que estiver no cache (~/Library/Caches/ms-playwright).
async function abrirNavegador() {
    try {
        return await chromium.launch();
    } catch {
        const { readdirSync, existsSync } = await import("node:fs");
        const os = await import("node:os");
        const cache = path.join(os.homedir(), "Library/Caches/ms-playwright");
        for (const d of readdirSync(cache).filter((n) => n.startsWith("chromium_headless_shell")).sort().reverse()) {
            for (const sub of ["chrome-headless-shell-mac-arm64", "chrome-mac", "chrome-headless-shell-linux64"]) {
                const exe = path.join(cache, d, sub, "chrome-headless-shell");
                if (existsSync(exe)) return chromium.launch({ executablePath: exe });
            }
        }
        throw new Error("Chromium não encontrado. Rode: npx playwright install chromium");
    }
}
const browser = await abrirNavegador();
try {
    for (const m of MODELOS) {
        await writeFile(path.join(OUT, `${m.nome}.docx`), await docx(m));
        const page = await browser.newPage();
        await page.setContent(await html(m), { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const celular = m.pagina === "celular";
        await page.pdf({ path: path.join(OUT, `${m.nome}.pdf`), preferCSSPageSize: true, printBackground: true });
        await page.close();
        // Prévia: a 1ª página renderizada em 2x e reduzida pra ~900px.
        const ctx = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: celular ? 454 : 794, height: celular ? 805 : 1123 } });
        const p2 = await ctx.newPage();
        await p2.setContent(await html(m), { waitUntil: "load" });
        await p2.evaluate(() => document.fonts.ready);
        // Conteúdo que invade o rodapé vira erro: melhor falhar do que sair torto.
        const estouros = await p2.evaluate(() =>
            [...document.querySelectorAll(".page")].flatMap((pg, i) => {
                const limite = pg.querySelector(".foot").getBoundingClientRect().top - 4;
                const fundo = Math.max(...[...pg.children].filter((c) => !c.classList.contains("foot")).map((c) => c.getBoundingClientRect().bottom));
                return fundo > limite ? [`página ${i + 1} passa ${Math.round(fundo - limite)}px do rodapé`] : [];
            }),
        );
        if (estouros.length) console.warn(`! ${m.nome}: ${estouros.join("; ")}`);
        const hi = await p2.locator(".page").first().screenshot();
        await ctx.close();
        await sharp(hi).resize(celular ? 600 : 900).webp({ quality: 80 }).toFile(path.join(OUT, "previa", `${m.nome}.webp`));
        console.log(`✓ ${m.nome} (.docx, .pdf, previa/.webp)`);
    }
} finally {
    await browser.close();
}
