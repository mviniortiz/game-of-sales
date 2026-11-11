// Gera a planilha de proposta de energia solar baixada em
// /planilha-proposta-energia-solar:
//   public/modelos/planilha-proposta-energia-solar.xlsx   3 abas: Cálculo, Ano a ano, Resumo
//   src/data/landing/planilhaExemplo.json                 os números do exemplo, mostrados na página
//
// Cada fórmula vai com o valor já calculado ao lado (o `result`), porque prévia
// de celular e de WhatsApp não recalcula a planilha ao abrir. O valor sai do
// mesmo modelo em JS (calcular, abaixo), então fórmula e número não divergem.
//
// Como rodar (o pacote `exceljs` fica FORA do repo, igual ao `docx` dos modelos):
//   mkdir -p /tmp/planilha-build && (cd /tmp/planilha-build && npm init -y && npm i exceljs)
//   NODE_PATH=/tmp/planilha-build/node_modules node scripts/gen-planilha-proposta.mjs
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SAIDA = path.join(ROOT, "public", "modelos", "planilha-proposta-energia-solar.xlsx");
const EXEMPLO = path.join(ROOT, "src", "data", "landing", "planilhaExemplo.json");

const ANOS = 25;
const RODAPE = "Planilha gratuita da Vyzon · vyzon.com.br";
const COR = { campo: "FFFFF1B8", faixa: "FFF4F5F3", tinta: "FF14161A", suave: "FF5B616B", linha: "FFDADDE1" };

// Exemplo que vem preenchido. Tudo aqui é campo amarelo, para a pessoa trocar.
const ENTRADA = {
    cliente: "[Nome do cliente]",
    consumo: 650, // kWh por mês
    tarifa: 0.95, // R$ por kWh
    taxaMinima: 47.5, // R$ por mês
    potencia: 5.5, // kWp
    geracaoPorKwp: 120, // kWh por kWp por mês
    valor: 24900, // R$
    reajuste: 0.05, // ao ano
    perda: 0.005, // ao ano
    desconto: 0, // parte da energia compensada que a distribuidora não abate
    entrada: 4900, // R$
    parcelas: 60,
    juros: 0.015, // ao mês
};

// O mesmo cálculo das fórmulas, em JS. É daqui que saem os valores gravados.
function calcular(e) {
    const contaHoje = e.consumo * e.tarifa;
    const geracao = e.potencia * e.geracaoPorKwp;
    const compensada = Math.min(geracao, e.consumo);
    const contaDepois = Math.max(e.taxaMinima, contaHoje - compensada * e.tarifa * (1 - e.desconto));
    const economiaMes = contaHoje - contaDepois;
    const economiaAno1 = economiaMes * 12;
    const financiado = e.valor - e.entrada;
    const parcela =
        e.parcelas > 0
            ? e.juros > 0
                ? (financiado * e.juros) / (1 - (1 + e.juros) ** -e.parcelas)
                : financiado / e.parcelas
            : 0;
    const anos = [];
    let acumulado = 0;
    for (let ano = 1; ano <= ANOS; ano++) {
        const tarifa = e.tarifa * (1 + e.reajuste) ** (ano - 1);
        const geracaoAno = geracao * 12 * (1 - e.perda) ** (ano - 1);
        const semSistema = e.consumo * 12 * tarifa;
        const minimo = e.taxaMinima * 12 * (1 + e.reajuste) ** (ano - 1);
        const comSistema = Math.max(minimo, semSistema - Math.min(geracaoAno, e.consumo * 12) * tarifa * (1 - e.desconto));
        const economia = semSistema - comSistema;
        acumulado += economia;
        anos.push({ ano, tarifa, geracaoAno, semSistema, comSistema, economia, acumulado, saldo: acumulado - e.valor });
    }
    const negativos = anos.filter((a) => a.saldo < 0).length;
    return {
        contaHoje,
        geracao,
        compensada,
        contaDepois,
        economiaMes,
        economiaAno1,
        paybackSimples: economiaAno1 > 0 ? e.valor / economiaAno1 : "sem economia",
        paybackReajuste: negativos === ANOS ? "mais de 25 anos" : negativos + 1,
        parcela,
        parcelaMenosConta: parcela - contaHoje,
        economia25: acumulado,
        anos,
    };
}

const FMT = {
    reais: '"R$" #,##0.00',
    kwh: "#,##0",
    kwp: "#,##0.00",
    pct: "0.0%",
    anos: "0.0",
    inteiro: "0",
    tarifa: '"R$" #,##0.000',
};

const r = calcular(ENTRADA);
const wb = new ExcelJS.Workbook();
wb.creator = "Vyzon";
wb.calcProperties.fullCalcOnLoad = true;

// ─── Aba Cálculo ─────────────────────────────────────────────────────────────
const calc = wb.addWorksheet("Cálculo", { views: [{ showGridLines: false }] });
calc.columns = [{ width: 52 }, { width: 20 }, { width: 78 }];
const fonte = (extra = {}) => ({ name: "Arial", size: 11, color: { argb: COR.tinta }, ...extra });

let linha = 1;
const titulo = (texto, tamanho = 16) => {
    const c = calc.getCell(`A${linha}`);
    c.value = texto;
    c.font = fonte({ size: tamanho, bold: true });
    linha++;
};
const faixa = (texto) => {
    linha++;
    for (const col of ["A", "B", "C"]) {
        const c = calc.getCell(`${col}${linha}`);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.faixa } };
        c.font = fonte({ bold: true, size: 10 });
    }
    calc.getCell(`A${linha}`).value = texto;
    linha++;
};
// Guarda em que linha cada campo ficou, para as fórmulas apontarem pelo nome.
const ref = {};
const campo = (chave, rotulo, valor, fmt, nota) => {
    ref[chave] = `B${linha}`;
    calc.getCell(`A${linha}`).value = rotulo;
    calc.getCell(`A${linha}`).font = fonte();
    const b = calc.getCell(`B${linha}`);
    b.value = valor;
    b.font = fonte({ bold: true });
    b.alignment = { horizontal: "right" };
    b.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.campo } };
    b.border = { bottom: { style: "thin", color: { argb: COR.linha } } };
    if (fmt) b.numFmt = fmt;
    if (nota) {
        const c = calc.getCell(`C${linha}`);
        c.value = nota;
        c.font = fonte({ size: 10, color: { argb: COR.suave } });
        c.alignment = { wrapText: true, vertical: "top" };
    }
    linha++;
};
const resultado = (chave, rotulo, formula, valor, fmt, nota) => {
    ref[chave] = `B${linha}`;
    calc.getCell(`A${linha}`).value = rotulo;
    calc.getCell(`A${linha}`).font = fonte();
    const b = calc.getCell(`B${linha}`);
    b.value = { formula, result: valor };
    b.font = fonte({ bold: true });
    b.alignment = { horizontal: "right" };
    b.border = { bottom: { style: "thin", color: { argb: COR.linha } } };
    if (fmt) b.numFmt = fmt;
    if (nota) {
        const c = calc.getCell(`C${linha}`);
        c.value = nota;
        c.font = fonte({ size: 10, color: { argb: COR.suave } });
        c.alignment = { wrapText: true, vertical: "top" };
    }
    linha++;
};

titulo("Planilha de proposta de energia solar");
calc.getCell(`A${linha}`).value = "Troque os valores em amarelo pelos dados do cliente. O resto é calculado sozinho.";
calc.getCell(`A${linha}`).font = fonte({ color: { argb: COR.suave } });
linha++;

faixa("DADOS DO CLIENTE");
campo("cliente", "Cliente", ENTRADA.cliente);
campo("consumo", "Consumo médio (kWh por mês)", ENTRADA.consumo, FMT.kwh, "Média dos últimos 12 meses da conta de luz.");
campo("tarifa", "Tarifa de energia com impostos (R$ por kWh)", ENTRADA.tarifa, FMT.tarifa, "Valor da energia na conta dividido pelos kWh, sem a iluminação pública.");
campo("taxaMinima", "Taxa mínima da distribuidora (R$ por mês)", ENTRADA.taxaMinima, FMT.reais, "O que a conta cobra mesmo com o sistema gerando tudo (custo de disponibilidade).");

faixa("SISTEMA");
campo("potencia", "Potência do sistema (kWp)", ENTRADA.potencia, FMT.kwp);
campo("geracaoPorKwp", "Geração por kWp (kWh por mês)", ENTRADA.geracaoPorKwp, FMT.kwh, "Estimativa. Muda com a cidade, a inclinação e a sombra. Use o número do seu dimensionamento.");
campo("valor", "Valor do sistema (R$)", ENTRADA.valor, FMT.reais);

faixa("PREMISSAS (ESTIMATIVAS)");
campo("reajuste", "Reajuste anual da tarifa", ENTRADA.reajuste, FMT.pct, "Estimativa. Ajuste pelo histórico da distribuidora do cliente.");
campo("perda", "Perda anual de geração dos módulos", ENTRADA.perda, FMT.pct, "Veja a garantia de desempenho do fabricante.");
campo("desconto", "Parte da energia compensada que a distribuidora não abate", ENTRADA.desconto, FMT.pct, "Exemplo: Fio B. Confira a regra da distribuidora e o ano de conexão do sistema.");

faixa("FINANCIAMENTO (OPCIONAL)");
campo("entrada", "Entrada (R$)", ENTRADA.entrada, FMT.reais);
campo("parcelas", "Número de parcelas", ENTRADA.parcelas, FMT.inteiro, "Deixe 0 se a venda for à vista.");
campo("juros", "Juros ao mês", ENTRADA.juros, FMT.pct, "Use a taxa da simulação do banco.");

faixa("RESULTADO");
// A tabela ano a ano fica em outra aba; as linhas 2 a 26 são os anos 1 a 25.
const SALDO = `'Ano a ano'!$H$2:$H$${ANOS + 1}`;
const ECONOMIA = `'Ano a ano'!$F$2:$F$${ANOS + 1}`;
resultado("contaHoje", "Conta de luz hoje (R$ por mês)", `${ref.consumo}*${ref.tarifa}`, r.contaHoje, FMT.reais);
resultado("geracao", "Geração estimada (kWh por mês)", `${ref.potencia}*${ref.geracaoPorKwp}`, r.geracao, FMT.kwh);
resultado("compensada", "Energia compensada (kWh por mês)", `MIN(${ref.geracao},${ref.consumo})`, r.compensada, FMT.kwh, "O que passa do consumo vira crédito e não entra nesta conta.");
resultado(
    "contaDepois",
    "Conta estimada com o sistema (R$ por mês)",
    `MAX(${ref.taxaMinima},${ref.contaHoje}-${ref.compensada}*${ref.tarifa}*(1-${ref.desconto}))`,
    r.contaDepois,
    FMT.reais,
);
resultado("economiaMes", "Economia por mês (R$)", `${ref.contaHoje}-${ref.contaDepois}`, r.economiaMes, FMT.reais);
resultado("economiaAno1", "Economia no 1º ano (R$)", `${ref.economiaMes}*12`, r.economiaAno1, FMT.reais);
resultado(
    "paybackSimples",
    "Payback simples (anos)",
    `IF(${ref.economiaAno1}>0,${ref.valor}/${ref.economiaAno1},"sem economia")`,
    r.paybackSimples,
    FMT.anos,
    "Valor do sistema dividido pela economia do 1º ano.",
);
resultado(
    "paybackReajuste",
    "Payback com reajuste (ano em que o sistema se paga)",
    `IF(COUNTIF(${SALDO},"<0")=${ANOS},"mais de 25 anos",COUNTIF(${SALDO},"<0")+1)`,
    r.paybackReajuste,
    FMT.inteiro,
    "Primeiro ano em que a economia acumulada passa o valor do sistema. Veja a aba Ano a ano.",
);
resultado(
    "parcela",
    "Parcela do financiamento (R$ por mês)",
    `IF(${ref.parcelas}>0,IF(${ref.juros}>0,PMT(${ref.juros},${ref.parcelas},-(${ref.valor}-${ref.entrada})),(${ref.valor}-${ref.entrada})/${ref.parcelas}),0)`,
    r.parcela,
    FMT.reais,
);
resultado(
    "parcelaMenosConta",
    "Parcela menos a conta de hoje (R$ por mês)",
    `${ref.parcela}-${ref.contaHoje}`,
    r.parcelaMenosConta,
    FMT.reais,
    "Negativo quer dizer que a parcela é menor do que a conta de luz de hoje.",
);
resultado("economia25", "Economia acumulada em 25 anos (R$)", `SUM(${ECONOMIA})`, r.economia25, FMT.reais);

linha++;
calc.getCell(`A${linha}`).value = "Os resultados são estimativas e dependem das premissas acima. Confira antes de mostrar ao cliente.";
calc.getCell(`A${linha}`).font = fonte({ size: 10, color: { argb: COR.suave } });
linha += 2;
calc.getCell(`A${linha}`).value = RODAPE;
calc.getCell(`A${linha}`).font = fonte({ size: 9, color: { argb: COR.suave } });

// ─── Aba Ano a ano ───────────────────────────────────────────────────────────
const anual = wb.addWorksheet("Ano a ano", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
const C = (chave) => `'Cálculo'!$B$${ref[chave].slice(1)}`;
const colunas = [
    ["Ano", 8, FMT.inteiro],
    ["Tarifa (R$ por kWh)", 20, FMT.tarifa],
    ["Geração (kWh no ano)", 22, FMT.kwh],
    ["Conta sem o sistema (R$)", 26, FMT.reais],
    ["Conta com o sistema (R$)", 26, FMT.reais],
    ["Economia do ano (R$)", 22, FMT.reais],
    ["Economia acumulada (R$)", 26, FMT.reais],
    ["Acumulado menos o investimento (R$)", 36, FMT.reais],
];
anual.columns = colunas.map(([, width]) => ({ width }));
colunas.forEach(([nome], i) => {
    const c = anual.getCell(1, i + 1);
    c.value = nome;
    c.font = fonte({ bold: true, size: 10 });
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.faixa } };
    c.alignment = { horizontal: i === 0 ? "left" : "right", wrapText: true };
});
r.anos.forEach((a, i) => {
    const n = i + 2;
    const fator = `(1+${C("reajuste")})^(A${n}-1)`;
    const celulas = [
        a.ano,
        { formula: `${C("tarifa")}*${fator}`, result: a.tarifa },
        { formula: `${C("geracao")}*12*(1-${C("perda")})^(A${n}-1)`, result: a.geracaoAno },
        { formula: `${C("consumo")}*12*B${n}`, result: a.semSistema },
        {
            formula: `MAX(${C("taxaMinima")}*12*${fator},D${n}-MIN(C${n},${C("consumo")}*12)*B${n}*(1-${C("desconto")}))`,
            result: a.comSistema,
        },
        { formula: `D${n}-E${n}`, result: a.economia },
        { formula: i === 0 ? `F${n}` : `G${n - 1}+F${n}`, result: a.acumulado },
        { formula: `G${n}-${C("valor")}`, result: a.saldo },
    ];
    celulas.forEach((valor, j) => {
        const c = anual.getCell(n, j + 1);
        c.value = valor;
        c.font = fonte();
        c.numFmt = colunas[j][2];
        c.alignment = { horizontal: j === 0 ? "left" : "right" };
        c.border = { bottom: { style: "hair", color: { argb: COR.linha } } };
    });
});

// ─── Aba Resumo ──────────────────────────────────────────────────────────────
const resumo = wb.addWorksheet("Resumo", { views: [{ showGridLines: false }] });
resumo.columns = [{ width: 44 }, { width: 22 }];
resumo.getCell("A1").value = "Resumo para a proposta";
resumo.getCell("A1").font = fonte({ size: 16, bold: true });
resumo.getCell("A2").value = "Copie estes números para a proposta do cliente.";
resumo.getCell("A2").font = fonte({ color: { argb: COR.suave } });
const linhasResumo = [
    ["Cliente", "cliente", ENTRADA.cliente, null],
    ["Conta de luz hoje (por mês)", "contaHoje", r.contaHoje, FMT.reais],
    ["Sistema proposto (kWp)", "potencia", ENTRADA.potencia, FMT.kwp],
    ["Investimento", "valor", ENTRADA.valor, FMT.reais],
    ["Economia estimada por mês", "economiaMes", r.economiaMes, FMT.reais],
    ["Parcela do financiamento", "parcela", r.parcela, FMT.reais],
    ["Payback simples estimado (anos)", "paybackSimples", r.paybackSimples, FMT.anos],
    ["Ano em que o sistema se paga (com reajuste)", "paybackReajuste", r.paybackReajuste, FMT.inteiro],
];
linhasResumo.forEach(([rotulo, chave, valor, fmt], i) => {
    const n = i + 4;
    resumo.getCell(`A${n}`).value = rotulo;
    resumo.getCell(`A${n}`).font = fonte();
    const b = resumo.getCell(`B${n}`);
    b.value = { formula: C(chave), result: valor };
    b.font = fonte({ bold: true });
    b.alignment = { horizontal: "right" };
    b.border = { bottom: { style: "thin", color: { argb: COR.linha } } };
    if (fmt) b.numFmt = fmt;
});
const fim = linhasResumo.length + 5;
resumo.getCell(`A${fim}`).value = "Estimativas com base nas premissas da aba Cálculo.";
resumo.getCell(`A${fim}`).font = fonte({ size: 10, color: { argb: COR.suave } });
resumo.getCell(`A${fim + 2}`).value = RODAPE;
resumo.getCell(`A${fim + 2}`).font = fonte({ size: 9, color: { argb: COR.suave } });

await mkdir(path.dirname(SAIDA), { recursive: true });
await wb.xlsx.writeFile(SAIDA);

// Os números do exemplo, para a página mostrar o que a planilha entrega.
const reais = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v).replace(/\u00A0/g, " ");
const numero = (v, casas = 1) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);
const exemplo = {
    legenda: `Exemplo que vem preenchido: sistema de ${numero(ENTRADA.potencia)} kWp por ${reais(ENTRADA.valor)}, consumo de ${ENTRADA.consumo} kWh por mês.`,
    linhas: [
        ["Conta de luz hoje", `${reais(r.contaHoje)} por mês`],
        ["Conta estimada com o sistema", `${reais(r.contaDepois)} por mês`],
        ["Economia por mês", reais(r.economiaMes)],
        ["Parcela do financiamento", `${reais(r.parcela)} em ${ENTRADA.parcelas} vezes`],
        ["Payback simples", `${numero(r.paybackSimples)} anos`],
    ],
};
await writeFile(EXEMPLO, `${JSON.stringify(exemplo, null, 2)}\n`, "utf8");

console.log(`✓ ${path.relative(ROOT, SAIDA)}`);
console.log(`✓ ${path.relative(ROOT, EXEMPLO)}`);
console.log(exemplo.linhas.map((l) => `  ${l[0]}: ${l[1]}`).join("\n"));
