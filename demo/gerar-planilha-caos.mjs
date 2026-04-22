import XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const wb = XLSX.utils.book_new();

const vendas = [
  ["Vendas Março/Abril 2026", "", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["Cliente", "VENDEDOR", "valor", "Data", "status", "obs", "prev. fechamento", "origem", "fone"],
  ["João da Silva", "marina", "R$ 1.500,00", "10/04/2026", "FECHADO", "pagou hj", "", "indicação", "11 98765-4321"],
  ["Ana Costa", "Rafael", 2300, "10-abr", "fechou", "", "", "site", "11987654322"],
  ["", "MARINA", "R$ 890,00", "11/4", "ganhou", "cliente chato", "", "", ""],
  ["Tech Solutions LTDA", "rafael", "15.000", "abril", "GANHO", "", "10/4", "instagram", "(11) 3456-7890"],
  ["nome cliente", "vendedor", "VALOR", "", "", "", "", "", ""],
  ["Pedro Henrique", "Marina", "R$ 3.200,00", "12/04", "perdeu", "foi pro concorrente", "12/04", "google", "11 9 9876 5432"],
  ["Mariana Santos", "RAFAEL", "4,5k", "12-abr", "fechado", "", "", "indicação", ""],
  ["Construtora ABC", "marina", "R$ 8.900", "13/4/26", "", "falta assinar", "15/04", "evento", "11988887777"],
  ["", "", "", "", "", "", "", "", ""],
  ["Empresa XYZ", "Rafael", 12500, "14/04/2026", "FECHOU", "", "", "linkedin", "11-98888-7777"],
  ["joão pereira", "marina", "R$ 670,00", "", "fechado", "", "", "", ""],
  ["Carla Menezes", "MARINA", "R$ 1.200,00", "15/04", "em negociação", "vai decidir sem que vem", "22/04", "site", "11977776666"],
  ["", "Rafael", "R$ 5.600", "15-04-2026", "ganhou", "", "", "indicação", ""],
  ["Distribuidora Lima", "rafael", "R$ 22.000,00", "16/4", "FECHADO", "parcelou em 3x", "", "google", "(11)3333-4444"],
  ["Fernanda Oliveira", "marina", "890", "17/04/26", "fechou", "", "", "instagram", "11966665555"],
  ["", "", "", "", "", "", "", "", ""],
  ["Cliente novo???", "Marina", "R$ 2.100,00", "18/04", "FECHADO", "indicação - ver nome depois", "", "", "quem tem?"],
  ["João da Silva", "RAFAEL", 1500, "19/4", "", "", "", "", "11 98765-4321"],
  ["Empresa ACME", "marina", "7.800", "20/04/2026", "GANHOU", "", "", "site", ""],
  ["", "rafael", "R$ 450,00", "20-abr", "fechou", "", "", "", ""],
  ["Roberto Dias", "Marina", "R$ 3.400", "", "em aberto", "esperando proposta", "25/04", "linkedin", "11955554444"],
  ["Amanda Souza", "marina", "R$ 980,00", "21/4", "fechado", "", "", "google", "11944443333"],
  ["Lucas Ferreira", "RAFAEL", "R$ 6.700", "22/04", "negociando", "pedir desconto", "30/4", "indicação", ""],
  ["Beatriz Lima", "marina", "1280", "22-abr", "fechou", "", "", "site", "11933332222"],
  ["Empresa Gamma", "Rafael", "R$ 18.500,00", "23/04/26", "FECHOU", "contrato anual", "", "evento", "(11) 2222-3333"],
  ["", "", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["TOTAL", "", "=SOMA(C4:C29)", "", "", "", "", "", ""],
  ["META MÊS", "", "R$ 120.000,00", "", "", "", "", "", ""],
  ["ATINGIDO", "", "???", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
  ["anotações:", "", "", "", "", "", "", "", ""],
  ["- ligar pro joão de novo", "", "", "", "", "", "", "", ""],
  ["- cobrar rafael sobre a XYZ", "", "", "", "", "", "", "", ""],
  ["- quem ta com o lead da construtora??", "", "", "", "", "", "", "", ""],
  ["- refazer relatório pra diretoria até sexta", "", "", "", "", "", "", "", ""],
  ["- cliente da marina reclamou q ngm respondeu no whats", "", "", "", "", "", "", "", ""],
  ["- pedro ta de férias semana que vem??", "", "", "", "", "", "", "", ""],
];
const wsVendas = XLSX.utils.aoa_to_sheet(vendas);
wsVendas["!cols"] = [{ wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas");

const comissoes = [
  ["COMISSÕES - ABRIL (NÃO MEXER!!!)", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["vendedor", "total vendido", "%", "comissao", "pago?", "obs"],
  ["marina", "R$ 28.930,00", "5%", "=B4*0.05", "não", ""],
  ["Rafael", "R$ 85.050", "5%", "4252,5", "parcial", "paguei 2000 dia 15"],
  ["Marina (bonus)", "", "", "R$ 500", "SIM", "bateu meta março"],
  ["", "", "", "", "", ""],
  ["MARÇO (conferir depois)", "", "", "", "", ""],
  ["marina", "45000", "5", "2250", "sim", ""],
  ["rafael", "R$ 62.300,00", "5%", "3115", "sim", ""],
  ["", "", "", "", "", ""],
  ["regra comissao:", "", "", "", "", ""],
  ["até 30k = 4%", "", "", "", "", ""],
  ["30-60k = 5%", "", "", "", "", ""],
  ["acima 60k = 6% + bonus", "", "", "", "", ""],
  ["(ou era 7%??? perguntar p/ diretor)", "", "", "", "", ""],
];
const wsCom = XLSX.utils.aoa_to_sheet(comissoes);
wsCom["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 30 }];
XLSX.utils.book_append_sheet(wb, wsCom, "Comissões");

const metas = [
  ["METAS 2026", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["mes", "meta", "realizado", "%", "status", "obs"],
  ["jan", "R$ 80.000", "R$ 72.400", "90,5%", "quase", ""],
  ["fev", "80.000", "85200", "106%", "bateu", "bônus pago"],
  ["mar", "R$ 100.000,00", "107.300", "107%", "BATEU", ""],
  ["abril", "R$ 120.000,00", "???", "", "", "falta 1 semana"],
  ["maio", "120000", "", "", "", ""],
  ["jun", "R$ 150.000", "", "", "", "reunião dia 2"],
  ["", "", "", "", "", ""],
  ["individual:", "", "", "", "", ""],
  ["marina", "R$ 50.000", "28930", "57%", "atrasada", ""],
  ["rafael", "R$ 70.000,00", "85050", "121%", "ótimo", ""],
  ["pedro (novo)", "30000", "0", "0", "só começou dia 15", ""],
];
const wsMetas = XLSX.utils.aoa_to_sheet(metas);
wsMetas["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 24 }];
XLSX.utils.book_append_sheet(wb, wsMetas, "Metas");

const pipeline = [
  ["PIPELINE / leads em aberto", "", "", "", "", "", ""],
  ["", "", "", "", "", "", ""],
  ["cliente", "vendedor", "valor estimado", "fase", "prob.", "prox passo", "ult contato"],
  ["Construtora ABC", "marina", "R$ 8.900", "proposta enviada", "70%", "follow up", "segunda"],
  ["Roberto Dias", "Marina", "R$ 3.400", "diagnostico", "50%", "agendar call", "15/04"],
  ["Lucas Ferreira", "RAFAEL", "R$ 6.700", "negociação", "80%", "fechar preço", "ontem"],
  ["Empresa Beta", "rafael", "30000", "qualificando", "20%", "ligar", "?"],
  ["Loja do Zé", "marina", "R$ 1.500", "proposta", "60%", "", ""],
  ["TechCorp", "", "R$ 45.000,00", "reunião marcada", "?", "amanhã 14h", ""],
  ["cliente do instagram", "marina", "", "primeiro contato", "", "mandar apresentação", ""],
  ["João (indicação carlos)", "Rafael", "R$ 2.200", "diagnóstico", "40%", "", "14/04"],
  ["Distribuidora Sul", "", "R$ 12.000", "???", "", "descobrir quem ta com isso", ""],
  ["", "", "", "", "", "", ""],
  ["perdidos abril (ver motivo):", "", "", "", "", "", ""],
  ["Pedro Henrique", "Marina", "R$ 3.200,00", "perdido", "", "concorrente mais barato", ""],
  ["Empresa XPTO", "rafael", "R$ 8.000", "perdido", "", "não respondeu mais", ""],
  ["Maria F.", "marina", "R$ 1.800", "perdido", "", "sem orçamento", ""],
];
const wsPipe = XLSX.utils.aoa_to_sheet(pipeline);
wsPipe["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 8 }, { wch: 24 }, { wch: 14 }];
XLSX.utils.book_append_sheet(wb, wsPipe, "Pipeline");

const atividades = [
  ["ATIVIDADES - preencher diariamente (ngm preenche)", "", "", "", "", ""],
  ["", "", "", "", "", ""],
  ["data", "vendedor", "tipo", "cliente", "resultado", "obs"],
  ["01/04", "marina", "ligação", "João Silva", "atendeu", "marcou reunião"],
  ["01/04", "Rafael", "whats", "Ana Costa", "respondeu", ""],
  ["02/04", "marina", "email", "diversos", "", "disparou 30 emails"],
  ["02/04", "rafael", "reunião", "Tech Solutions", "fechou", "!!!"],
  ["03/04", "", "", "", "", ""],
  ["04/04", "marina", "ligação", "Construtora", "caixa postal", ""],
  ["08/04", "RAFAEL", "whats", "XYZ", "", ""],
  ["10/04", "marina", "email", "", "", "?"],
  ["12/04", "rafael", "reunião", "Empresa Gamma", "fechou", "contrato anual"],
  ["15/04", "pedro (novo)", "treinamento", "-", "-", "primeiro dia"],
  ["17/04", "marina", "?", "?", "?", "ela não preencheu"],
  ["20/04", "Rafael", "ligação", "Roberto Dias", "atendeu", "follow-up"],
  ["", "", "", "", "", ""],
  ["OBSERVAÇÃO: ninguém tá atualizando direito.", "", "", "", "", ""],
  ["Já pedi no grupo do whats 5x essa semana.", "", "", "", "", ""],
];
const wsAtiv = XLSX.utils.aoa_to_sheet(atividades);
wsAtiv["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 28 }];
XLSX.utils.book_append_sheet(wb, wsAtiv, "Atividades");

const ranking = [
  ["RANKING DO MÊS", "", "", ""],
  ["", "", "", ""],
  ["pos", "vendedor", "valor", "obs"],
  ["1", "Rafael", "R$ 85.050,00", ""],
  ["2", "marina", "R$ 28.930", ""],
  ["3", "pedro", "0", "começou dia 15"],
  ["", "", "", ""],
  ["no mês passado tava assim:", "", "", ""],
  ["1 marina 45k", "", "", ""],
  ["2 rafael 62k (??? conferir)", "", "", ""],
  ["", "", "", ""],
  ["quem tá ganhando bônus esse mês:", "", "", ""],
  ["Rafael (bateu meta individual)", "", "", ""],
  ["marina?? (não bateu ainda)", "", "", ""],
];
const wsRank = XLSX.utils.aoa_to_sheet(ranking);
wsRank["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 30 }];
XLSX.utils.book_append_sheet(wb, wsRank, "Ranking");

const recados = [
  ["RECADOS / TODO / PENDÊNCIAS", ""],
  ["", ""],
  ["- falar com marina sobre a meta dela (tá muito atrás)", ""],
  ["- pagar comissão pendente rafael", ""],
  ["- cliente construtora reclamou que rafael sumiu", ""],
  ["- COBRAR ATUALIZAÇÃO DA PLANILHA", ""],
  ["- reunião dia 30 com diretoria - preparar apresentação", ""],
  ["- descobrir quem ta com o lead da distribuidora sul", ""],
  ["- ver se marina atendeu o pessoal do instagram", ""],
  ["- rafael pediu aumento - responder", ""],
  ["- pedro precisa de acesso ao google drive", ""],
  ["- backup dessa planilha???? (última vez: março)", ""],
  ["- treinamento marcado pro dia 28 - confirmar", ""],
  ["- fechar contrato anual Tech Solutions - onde tá o PDF?", ""],
  ["- arthur (TI) pediu pra migrar pra um sistema de CRM", ""],
  ["  ele mandou 3 opções ver depois", ""],
  ["", ""],
  ["coisas que eu anotei no papel e vou esquecer:", ""],
  ["joão novo cliente - voltar contato", ""],
  ["empresa que veio por indicação - ligar", ""],
  ["aquele cara do evento de março", ""],
  ["", ""],
  ["SENHAS (apagar depois!!):", ""],
  ["email: vendas2024", ""],
  ["drive: planilhas@123", ""],
];
const wsRec = XLSX.utils.aoa_to_sheet(recados);
wsRec["!cols"] = [{ wch: 60 }, { wch: 10 }];
XLSX.utils.book_append_sheet(wb, wsRec, "Recados");

const outPath = path.join(__dirname, "planilha-vendas-caos.xlsx");
XLSX.writeFile(wb, outPath);
console.log("Gerado:", outPath);
