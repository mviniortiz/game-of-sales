// deno test supabase/functions/_shared/quoteDetection.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { detectQuote, parseBRL, pickProposalAmount } from "./quoteDetection.ts";

const text = (body: string) => detectQuote({ type: "text", body });

Deno.test("parseBRL lê formatos pt-BR", () => {
    assertEquals(parseBRL("1.234,56"), 1234.56);
    assertEquals(parseBRL("1500"), 1500);
    assertEquals(parseBRL("1.500"), 1500);
    assertEquals(parseBRL("1.500,00"), 1500);
    assertEquals(parseBRL("99,9"), 99.9);
    assertEquals(parseBRL("0"), null);
});

Deno.test("texto com valor e palavra-chave é orçamento", () => {
    assertEquals(text("Segue o orçamento: R$ 1.234,56"), { isQuote: true, detectedBy: "text", amount: 1234.56 });
    assertEquals(text("A proposta fica R$1500 por mês"), { isQuote: true, detectedBy: "text", amount: 1500 });
    assertEquals(text("O investimento é de 1.500,00 reais"), { isQuote: true, detectedBy: "text", amount: 1500 });
    assertEquals(text("Fica em R$ 890"), { isQuote: true, detectedBy: "text", amount: 890 });
    assertEquals(text("Sai por r$ 2.000"), { isQuote: true, detectedBy: "text", amount: 2000 });
    assertEquals(text("ORCAMENTO R$ 300,00"), { isQuote: true, detectedBy: "text", amount: 300 });
});

Deno.test("amount é o maior valor da mensagem", () => {
    const r = text("Orçamento: setup R$ 500 + mensal R$ 1.200,00. Valor total R$ 1.700,00");
    assertEquals(r, { isQuote: true, detectedBy: "text", amount: 1700 });
});

Deno.test("sem palavra-chave ou sem valor não é orçamento", () => {
    const nao = { isQuote: false, detectedBy: null, amount: null };
    assertEquals(text("bom dia"), nao);
    assertEquals(text("R$ 50 de desconto no pix?"), nao);
    assertEquals(text("Te mando o orçamento amanhã"), nao);
    assertEquals(text("Sua proposta foi aprovada, parabéns"), nao);
    assertEquals(text("Chego em 15 minutos, valor total do estacionamento eu vejo lá"), nao);
    assertEquals(text("Proposta número 1500"), nao);
    assertEquals(detectQuote({ type: "text", body: "" }), nao);
});

Deno.test("PDF enviado é orçamento, com valor da legenda quando houver", () => {
    assertEquals(
        detectQuote({ type: "document", mimetype: "application/pdf", fileName: "arquivo.pdf" }),
        { isQuote: true, detectedBy: "pdf", amount: null },
    );
    assertEquals(
        detectQuote({ type: "document", mimetype: "application/pdf", fileName: "Proposta.pdf", caption: "Total R$ 3.450,00" }),
        { isQuote: true, detectedBy: "pdf", amount: 3450 },
    );
    assertEquals(
        detectQuote({ type: "document", mimetype: null, fileName: "ORCAMENTO_ACME.PDF" }),
        { isQuote: true, detectedBy: "pdf", amount: null },
    );
});

Deno.test("PDF de boleto, comprovante, recibo, nota fiscal ou contrato não é orçamento", () => {
    for (const fileName of ["boleto-junho.pdf", "Comprovante_pix.pdf", "recibo.pdf", "Nota Fiscal 123.pdf", "NFe_4455.pdf", "contrato_assinado.pdf"]) {
        assertEquals(detectQuote({ type: "document", mimetype: "application/pdf", fileName }).isQuote, false, fileName);
    }
});

Deno.test("documento que não é PDF só conta pela legenda", () => {
    assertEquals(
        detectQuote({ type: "document", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName: "orcamento.docx" }).isQuote,
        false,
    );
    assertEquals(
        detectQuote({ type: "document", mimetype: "application/msword", fileName: "x.doc", caption: "Orçamento R$ 700" }),
        { isQuote: true, detectedBy: "text", amount: 700 },
    );
});

Deno.test("imagem com legenda de orçamento conta como texto", () => {
    assertEquals(
        detectQuote({ type: "image", mimetype: "image/jpeg", caption: "Segue a proposta, R$ 2.500" }),
        { isQuote: true, detectedBy: "text", amount: 2500 },
    );
    assertEquals(detectQuote({ type: "image", mimetype: "image/jpeg", caption: "foto do local" }).isQuote, false);
});

// Texto como sai do pdf.js: itens da página emendados por espaço.
const PROPOSTA_SOLAR = `PROPOSTA COMERCIAL Nº 2291 Solar Rio Energia Cliente: Ana Paula Ribeiro
Consumo médio mensal 650 kWh Valor médio da conta de luz R$ 780,00
Potência do sistema 5,45 kWp Geração estimada 702 kWh/mês Tarifa R$ 0,98/kWh
Economia mensal estimada R$ 690,00 Economia em 25 anos R$ 412.500,00
Retorno do investimento 3,4 anos VPL R$ 151.300,00 TIR 31%
INVESTIMENTO Valor total do sistema R$ 23.900,00 À vista no Pix R$ 22.705,00
Financiamento em 60x de R$ 612,00 Entrada R$ 0,00 Preço por Wp R$ 4,38/Wp`;

Deno.test("proposta solar: pega o investimento, não economia, conta, parcela ou VPL", () => {
    assertEquals(pickProposalAmount(PROPOSTA_SOLAR), 23900);
});

Deno.test("rótulo em cima do valor, sem outro rótulo embaixo", () => {
    assertEquals(pickProposalAmount("Investimento total\nR$ 31.450,00\nObrigado pela preferência"), 31450);
});

Deno.test("cartões empilhados: rótulo de cima e de baixo discordam, fica de fora", () => {
    // Não dá para saber se 31.450 é o investimento (rótulo em cima) ou a economia (embaixo).
    assertEquals(pickProposalAmount("Investimento total\nR$ 31.450,00\nEconomia anual\nR$ 9.600,00"), null);
    // Legenda embaixo: 27.800 é investimento; 398.000 tem "investimento" em cima e "economia" embaixo.
    assertEquals(
        pickProposalAmount("Sua proposta\nR$ 27.800,00\ninvestimento no seu sistema\nR$ 398.000,00\neconomia em 25 anos"),
        27800,
    );
});

Deno.test("orçamento itemizado: fica o total, não o item", () => {
    const t = "Orçamento 88 Painel 550W x 10 R$ 8.000,00 Inversor 5kW R$ 5.000,00 Instalação R$ 3.000,00 Total R$ 16.000,00";
    assertEquals(pickProposalAmount(t), 16000);
});

Deno.test("total financiado não é o preço", () => {
    assertEquals(pickProposalAmount("Valor à vista R$ 18.000,00 Total financiado R$ 27.400,00"), 18000);
});

Deno.test("proposta sem rótulo de preço devolve null em vez de chutar", () => {
    assertEquals(pickProposalAmount("Economia mensal R$ 540,00 Conta atual R$ 610,00 Parcela R$ 499,00"), null);
    assertEquals(pickProposalAmount("Relatório técnico do telhado, sem valores"), null);
});

Deno.test("valor com legenda embaixo, sem rótulo antes", () => {
    assertEquals(pickProposalAmount("R$ 27.800,00\ninvestimento no seu sistema"), 27800);
});
