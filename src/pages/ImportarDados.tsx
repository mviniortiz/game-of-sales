import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Download,
  Kanban,
  ShoppingCart,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

// ── Types ────────────────────────────────────────────────────────────────────

type ImportType = "deals" | "vendas";
type Step = "select" | "upload" | "map" | "preview" | "importing" | "done";

interface ColumnMapping {
  csvColumn: string;
  dbField: string;
}

interface ImportResult {
  total: number;
  success: number;
  errors: Array<{ row: number; message: string }>;
}

// ── Field definitions ────────────────────────────────────────────────────────

const DEAL_FIELDS = [
  { key: "title", label: "Título da Negociação", required: true },
  { key: "customer_name", label: "Nome do Cliente", required: true },
  { key: "customer_email", label: "Email do Cliente", required: false },
  { key: "customer_phone", label: "Telefone do Cliente", required: false },
  { key: "value", label: "Valor (R$)", required: false },
  { key: "stage", label: "Etapa (lead, qualification, proposal, negotiation, closed_won, closed_lost)", required: false },
  { key: "notes", label: "Observações", required: false },
  { key: "expected_close_date", label: "Data Prevista de Fechamento", required: false },
] as const;

const VENDA_FIELDS = [
  { key: "cliente_nome", label: "Nome do Cliente", required: true },
  { key: "produto_nome", label: "Nome do Produto", required: true },
  { key: "valor", label: "Valor (R$)", required: true },
  { key: "forma_pagamento", label: "Forma de Pagamento (Pix, Cartão de Crédito, Boleto, Dinheiro)", required: false },
  { key: "data_venda", label: "Data da Venda (AAAA-MM-DD)", required: false },
  { key: "status", label: "Status (Aprovado, Pendente, Reembolsado)", required: false },
  { key: "plataforma", label: "Plataforma", required: false },
  { key: "observacoes", label: "Observações", required: false },
] as const;

// ── Auto-mapping heuristics ──────────────────────────────────────────────────

const DEAL_SYNONYMS: Record<string, string[]> = {
  title: ["titulo", "title", "nome da negociacao", "negociacao", "deal", "deal name", "nome negociacao", "oportunidade"],
  customer_name: ["cliente", "customer", "nome do cliente", "customer name", "nome cliente", "contato", "contact", "lead"],
  customer_email: ["email", "e-mail", "customer email", "email do cliente", "email cliente"],
  customer_phone: ["telefone", "phone", "celular", "whatsapp", "tel", "fone", "customer phone", "telefone do cliente"],
  value: ["valor", "value", "amount", "preco", "price", "total", "receita", "revenue"],
  stage: ["etapa", "stage", "fase", "status", "pipeline", "estagio", "funil"],
  notes: ["observacoes", "notes", "obs", "descricao", "description", "comentarios", "notas"],
  expected_close_date: ["data prevista", "expected close", "previsao", "data fechamento", "close date", "forecast"],
};

const VENDA_SYNONYMS: Record<string, string[]> = {
  cliente_nome: ["cliente", "customer", "nome do cliente", "customer name", "nome cliente", "comprador", "buyer"],
  produto_nome: ["produto", "product", "nome do produto", "product name", "item", "servico"],
  valor: ["valor", "value", "amount", "preco", "price", "total", "receita", "revenue"],
  forma_pagamento: ["forma de pagamento", "payment", "pagamento", "metodo", "method", "payment method"],
  data_venda: ["data", "date", "data venda", "data da venda", "sale date", "created"],
  status: ["status", "situacao", "estado"],
  plataforma: ["plataforma", "platform", "origem", "source", "canal"],
  observacoes: ["observacoes", "notes", "obs", "descricao", "description", "comentarios", "notas"],
};

function autoMapColumns(csvHeaders: string[], importType: ImportType): ColumnMapping[] {
  const synonyms = importType === "deals" ? DEAL_SYNONYMS : VENDA_SYNONYMS;
  const mappings: ColumnMapping[] = [];

  for (const header of csvHeaders) {
    const normalized = header.toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "");
    let bestMatch = "_skip";

    for (const [field, syns] of Object.entries(synonyms)) {
      for (const syn of syns) {
        const normalizedSyn = syn.normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (normalized === normalizedSyn || normalized.includes(normalizedSyn) || normalizedSyn.includes(normalized)) {
          bestMatch = field;
          break;
        }
      }
      if (bestMatch !== "_skip") break;
    }

    mappings.push({ csvColumn: header, dbField: bestMatch });
  }

  return mappings;
}

// ── Parse helpers ────────────────────────────────────────────────────────────

function parseFileToRows(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

        if (!jsonData.length) {
          reject(new Error("O arquivo está vazio ou não tem nenhuma linha de dados abaixo do cabeçalho."));
          return;
        }

        const headers = Object.keys(jsonData[0]);
        resolve({ headers, rows: jsonData.map(r => {
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) {
            cleaned[k] = String(v ?? "").trim();
          }
          return cleaned;
        }) });
      } catch (err) {
        reject(new Error("Não consegui ler o arquivo. Confira se é um .csv, .xlsx ou .xls válido e tente de novo."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao abrir o arquivo. Tente selecioná-lo novamente."));
    reader.readAsArrayBuffer(file);
  });
}

function parseNumber(val: string): number {
  if (!val) return 0;
  let cleaned = val.replace(/[R$\s]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: string): string | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const brMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const usMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (usMatch) return `${usMatch[3]}-${usMatch[1]}-${usMatch[2]}`;
  return null;
}

function normalizeStage(val: string): string {
  const map: Record<string, string> = {
    lead: "lead", "novo": "lead", "new": "lead",
    qualification: "qualification", "qualificacao": "qualification", "qualificação": "qualification", "qualified": "qualification",
    proposal: "proposal", "proposta": "proposal",
    negotiation: "negotiation", "negociacao": "negotiation", "negociação": "negotiation",
    closed_won: "closed_won", "ganho": "closed_won", "won": "closed_won", "fechado": "closed_won", "venda": "closed_won",
    closed_lost: "closed_lost", "perdido": "closed_lost", "lost": "closed_lost",
  };
  return map[val.toLowerCase().trim()] || "lead";
}

function normalizePayment(val: string): string {
  const lower = val.toLowerCase().trim();
  if (lower.includes("pix")) return "Pix";
  if (lower.includes("cart") || lower.includes("credit") || lower.includes("crédito") || lower.includes("credito")) return "Cartão de Crédito";
  if (lower.includes("boleto")) return "Boleto";
  if (lower.includes("dinheiro") || lower.includes("cash")) return "Dinheiro";
  return "Pix";
}

function normalizeStatus(val: string): string {
  const lower = val.toLowerCase().trim();
  if (lower.includes("aprov") || lower === "approved" || lower === "ok") return "Aprovado";
  if (lower.includes("pend") || lower === "pending") return "Pendente";
  if (lower.includes("reemb") || lower.includes("refund") || lower.includes("cancelado")) return "Reembolsado";
  return "Aprovado";
}

// ── Mensagens de erro humanizadas ──────────────────────────────────────────────
// Traduz erros crus do Postgres/Supabase em algo que o usuário entende.

function humanizeError(raw: string | null | undefined): string {
  const m = (raw || "").toLowerCase();
  if (!m) return "Erro desconhecido ao importar esta linha.";
  if (m.includes("row-level security") || m.includes("rls") || m.includes("permission") || m.includes("not authorized"))
    return "Sem permissão para importar nesta empresa. Saia e entre de novo, ou peça ao administrador.";
  if (m.includes("not-null") || m.includes("null value"))
    return "Um campo obrigatório ficou vazio nesta linha.";
  if (m.includes("invalid input syntax for type numeric") || m.includes("numeric") || m.includes("out of range for type"))
    return "O valor não é um número válido (ex: use 1500 ou 1.500,00).";
  if (m.includes("invalid input value for enum") || m.includes("enum"))
    return "Valor fora das opções aceitas (forma de pagamento, status ou etapa).";
  if (m.includes("date") || m.includes("timestamp"))
    return "Data em formato inválido. Use AAAA-MM-DD ou DD/MM/AAAA.";
  if (m.includes("duplicate key") || m.includes("unique"))
    return "Este registro parece duplicado (já existe um igual).";
  if (m.includes("foreign key"))
    return "Referência inválida para um registro relacionado.";
  if (m.includes("value too long"))
    return "Um texto excedeu o tamanho máximo permitido.";
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to"))
    return "Falha de conexão durante a importação. Verifique a internet e tente de novo.";
  return `Não foi possível importar: ${raw}`;
}

// ── Component ────────────────────────────────────────────────────────────────

const ImportarDados = () => {
  const { user } = useAuth();
  const { activeCompanyId } = useTenant();
  const [step, setStep] = useState<Step>("select");
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fields = importType === "deals" ? DEAL_FIELDS : VENDA_FIELDS;
  const requiredFields = fields.filter(f => f.required).map(f => f.key);
  const labelOf = (key: string) => fields.find(f => f.key === key)?.label.split(" (")[0] || key;

  const mappedDbFields = useMemo(() => mappings.map(m => m.dbField), [mappings]);
  const missingRequired = requiredFields.filter(f => !mappedDbFields.includes(f));

  const mapRow = useCallback((row: Record<string, string>) => {
    const mapped: Record<string, string> = {};
    for (const m of mappings) {
      if (m.dbField !== "_skip") mapped[m.dbField] = row[m.csvColumn] || "";
    }
    return mapped;
  }, [mappings]);

  // Detecta problemas numa linha (antes de importar) pra explicar pro usuário
  const rowIssues = useCallback((mapped: Record<string, string>): { blocking: string[]; warnings: string[] } => {
    const blocking: string[] = [];
    const warnings: string[] = [];
    const isVenda = importType === "vendas";

    // Obrigatórios vazios = linha será pulada
    for (const rf of requiredFields) {
      if (!mapped[rf]?.trim()) blocking.push(`${labelOf(rf)} vazio`);
    }

    // Valor não numérico = entra como 0
    const valorKey = isVenda ? "valor" : "value";
    const rawValor = mapped[valorKey];
    if (rawValor && parseNumber(rawValor) === 0 && !/^0+([.,]0+)?$/.test(rawValor.replace(/[R$\s]/g, "")))
      warnings.push("valor não reconhecido como número (entra como R$ 0)");

    // Data inválida = entra com data de hoje (venda) ou vazia (deal)
    const dateKey = isVenda ? "data_venda" : "expected_close_date";
    const rawDate = mapped[dateKey];
    if (rawDate && !parseDate(rawDate))
      warnings.push("data não reconhecida (use AAAA-MM-DD ou DD/MM/AAAA)");

    // Email inválido (deals)
    if (!isVenda && mapped.customer_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mapped.customer_email))
      warnings.push("email com formato inválido");

    return { blocking, warnings };
  }, [importType, mappings, requiredFields]);

  // Resumo de problemas em TODAS as linhas
  const analysis = useMemo(() => {
    const byMsg: Record<string, number> = {};
    const blockingByMsg: Record<string, number> = {};
    let blockingRows = 0;
    let warningRows = 0;
    if (!importType) return { byMsg, blockingByMsg, blockingRows, warningRows };

    for (const row of rows) {
      const { blocking, warnings } = rowIssues(mapRow(row));
      if (blocking.length) {
        blockingRows++;
        blocking.forEach(b => { blockingByMsg[b] = (blockingByMsg[b] || 0) + 1; });
      }
      if (warnings.length) {
        warningRows++;
        warnings.forEach(w => { byMsg[w] = (byMsg[w] || 0) + 1; });
      }
    }
    return { byMsg, blockingByMsg, blockingRows, warningRows };
  }, [rows, mapRow, rowIssues, importType]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Formato não suportado. Envie um arquivo .csv, .xlsx ou .xls.");
      return;
    }
    try {
      const { headers: h, rows: r } = await parseFileToRows(selectedFile);
      setFile(selectedFile);
      setHeaders(h);
      setRows(r);
      setMappings(autoMapColumns(h, importType!));
      setStep("map");
    } catch (err: any) {
      toast.error(err.message || "Erro ao ler o arquivo.");
    }
  }, [importType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const updateMapping = (csvColumn: string, dbField: string) => {
    setMappings(prev => prev.map(m => m.csvColumn === csvColumn ? { ...m, dbField } : m));
  };

  const previewRows = useMemo(() => rows.slice(0, 5).map(mapRow), [rows, mapRow]);

  const handleImport = async () => {
    if (!user?.id || !activeCompanyId) {
      toast.error("Sua sessão expirou. Saia e entre novamente para importar.");
      return;
    }

    setStep("importing");
    setProgress(0);

    const importResult: ImportResult = { total: rows.length, success: 0, errors: [] };
    const BATCH_SIZE = 50;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const records: any[] = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowIndex = i + j + 2; // +2: 1-indexed + linha de cabeçalho

        try {
          const mapped = mapRow(row);

          if (importType === "deals") {
            if (!mapped.title && !mapped.customer_name) {
              importResult.errors.push({ row: rowIndex, message: "Título e Nome do Cliente estão vazios." });
              continue;
            }
            records.push({
              title: mapped.title || mapped.customer_name || "Sem título",
              customer_name: mapped.customer_name || mapped.title || "Cliente",
              customer_email: mapped.customer_email || null,
              customer_phone: mapped.customer_phone || null,
              value: parseNumber(mapped.value),
              stage: mapped.stage ? normalizeStage(mapped.stage) : "lead",
              probability: (() => {
                const s = mapped.stage ? normalizeStage(mapped.stage) : "lead";
                const probMap: Record<string, number> = { lead: 10, qualification: 25, proposal: 55, negotiation: 80, closed_won: 100, closed_lost: 0 };
                return probMap[s] ?? 10;
              })(),
              notes: mapped.notes || null,
              expected_close_date: mapped.expected_close_date ? parseDate(mapped.expected_close_date) : null,
              user_id: user.id,
              company_id: activeCompanyId,
              source: "import",
            });
          } else {
            if (!mapped.cliente_nome && !mapped.produto_nome) {
              importResult.errors.push({ row: rowIndex, message: "Nome do Cliente e Produto estão vazios." });
              continue;
            }
            records.push({
              cliente_nome: mapped.cliente_nome || "Cliente",
              produto_nome: mapped.produto_nome || "Produto",
              valor: parseNumber(mapped.valor),
              forma_pagamento: mapped.forma_pagamento ? normalizePayment(mapped.forma_pagamento) : "Pix",
              data_venda: mapped.data_venda ? (parseDate(mapped.data_venda) || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
              status: mapped.status ? normalizeStatus(mapped.status) : "Aprovado",
              plataforma: mapped.plataforma || "Importação",
              observacoes: mapped.observacoes || "Importado via planilha",
              user_id: user.id,
              company_id: activeCompanyId,
            });
          }
        } catch (err: any) {
          importResult.errors.push({ row: rowIndex, message: humanizeError(err?.message) });
        }
      }

      if (records.length > 0) {
        const table = importType === "deals" ? "deals" : "vendas";
        try {
          const { error } = await supabase.from(table as any).insert(records);
          if (error) {
            // Bulk falhou: tenta linha a linha pra identificar exatamente quais falharam
            const perRow = await Promise.all(
              records.map(async (rec, j) => {
                const { error: rowErr } = await supabase.from(table as any).insert(rec);
                return { row: i + j + 2, error: rowErr };
              })
            );
            for (const r of perRow) {
              if (r.error) importResult.errors.push({ row: r.row, message: humanizeError(r.error.message) });
              else importResult.success += 1;
            }
          } else {
            importResult.success += records.length;
          }
        } catch (netErr: any) {
          // Falha de rede no batch inteiro
          records.forEach((_, j) => importResult.errors.push({ row: i + j + 2, message: humanizeError(netErr?.message) }));
        }
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / rows.length) * 100)));
    }

    setResult(importResult);
    setStep("done");

    const total = importResult.success + importResult.errors.length;
    if (importResult.success > 0 && importResult.errors.length === 0) {
      toast.success(`${importResult.success} de ${total} registros importados com sucesso.`);
    } else if (importResult.success > 0) {
      toast.warning(`${importResult.success} de ${total} importados. ${importResult.errors.length} falharam, veja os detalhes abaixo.`);
    } else {
      toast.error(`Nenhum registro importado. Confira o mapeamento e o formato dos dados.`);
    }
  };

  const reset = () => {
    setStep("select");
    setImportType(null);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setResult(null);
    setProgress(0);
  };

  const downloadTemplate = () => {
    const fieldDefs = importType === "deals" ? DEAL_FIELDS : VENDA_FIELDS;
    const ws = XLSX.utils.aoa_to_sheet([fieldDefs.map(f => f.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `template_${importType}.xlsx`);
    toast.success("Modelo baixado. Preencha e envie de volta.");
  };

  // Estilos reutilizáveis
  const cardStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04)" };
  const primaryBtn = "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const ghostBtn = "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors hover:bg-[#F1F5F9]";

  const stepsOrder: Step[] = ["select", "upload", "map", "preview", "done"];
  const currentIdx = step === "importing" ? stepsOrder.indexOf("done") : stepsOrder.indexOf(step);

  return (
    <div className="space-y-5">
      {/* Passos */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        {[
          { id: "select", label: "Tipo" },
          { id: "upload", label: "Arquivo" },
          { id: "map", label: "Mapear" },
          { id: "preview", label: "Revisar" },
          { id: "done", label: "Concluído" },
        ].map((s, i, arr) => {
          const done = currentIdx > i;
          const active = currentIdx === i;
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors"
                style={active
                  ? { background: "rgba(37,99,235,0.10)", color: "#2563EB" }
                  : done
                    ? { background: "#ECFDF3", color: "#16A34A" }
                    : { background: "#F1F5F9", color: "#94A3B8" }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: active ? "rgba(37,99,235,0.18)" : done ? "rgba(22,163,74,0.18)" : "rgba(148,163,184,0.25)" }}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </span>
                {s.label}
              </span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3" style={{ color: "#CBD5E1" }} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Tipo ─────────────────────────────── */}
      {step === "select" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { type: "deals" as ImportType, icon: Kanban, title: "Negociações", desc: "Leads, oportunidades e negociações do pipeline", color: "#2563EB", bg: "rgba(37,99,235,0.08)" },
            { type: "vendas" as ImportType, icon: ShoppingCart, title: "Vendas", desc: "Histórico de vendas já realizadas", color: "#16A34A", bg: "#ECFDF3" },
          ].map(({ type, icon: Icon, title, desc, color, bg }) => (
            <button
              key={type}
              className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5"
              style={cardStyle}
              onClick={() => { setImportType(type); setStep("upload"); }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[15px]" style={{ color: "#0B1220" }}>{title}</h3>
                  <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "#64748B" }}>{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 mt-1 shrink-0" style={{ color: "#CBD5E1" }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: Upload ─────────────────────────────── */}
      {step === "upload" && (
        <div className="rounded-2xl p-5 sm:p-6 space-y-4" style={cardStyle}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#0B1220" }}>
              Enviar arquivo de {importType === "deals" ? "negociações" : "vendas"}
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
              Aceita .csv, .xlsx ou .xls. Não sabe como montar? Baixe o modelo abaixo, ele já vem com as colunas certas.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="rounded-xl p-10 text-center cursor-pointer transition-colors"
            style={{ border: `2px dashed ${isDragging ? "#2563EB" : "#D8E2F0"}`, background: isDragging ? "rgba(37,99,235,0.04)" : "#F8FAFC" }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(37,99,235,0.08)" }}>
              <Upload className="w-6 h-6" style={{ color: "#2563EB" }} />
            </div>
            <p className="text-sm" style={{ color: "#334155" }}>
              Arraste o arquivo aqui ou <span className="font-semibold" style={{ color: "#2563EB" }}>clique para selecionar</span>
            </p>
            <p className="text-xs mt-1.5" style={{ color: "#94A3B8" }}>CSV, XLSX ou XLS, com a primeira linha sendo o cabeçalho</p>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button className={ghostBtn} style={{ color: "#64748B" }} onClick={() => { setStep("select"); setImportType(null); }}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button className={ghostBtn} style={{ color: "#2563EB", border: "1px solid #E6EDF5" }} onClick={downloadTemplate}>
              <Download className="w-4 h-4" /> Baixar modelo
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Mapear ─────────────────────────────── */}
      {step === "map" && (
        <div className="rounded-2xl p-5 sm:p-6 space-y-4" style={cardStyle}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: "#0B1220" }}>Mapear colunas</h2>
              <p className="text-[13px] mt-0.5 flex items-center gap-1.5" style={{ color: "#64748B" }}>
                <FileSpreadsheet className="w-4 h-4" style={{ color: "#94A3B8" }} />
                {file?.name} · {rows.length} {rows.length === 1 ? "linha" : "linhas"}
              </p>
            </div>
            {missingRequired.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                <AlertCircle className="w-3.5 h-3.5" />
                Falta mapear: {missingRequired.map(labelOf).join(", ")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "#ECFDF3", color: "#16A34A" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tudo certo para revisar
              </span>
            )}
          </div>

          <p className="text-xs" style={{ color: "#94A3B8" }}>
            Já tentamos casar suas colunas automaticamente. Ajuste o que precisar. Campos com <span style={{ color: "#DC2626" }}>*</span> são obrigatórios.
          </p>

          <div className="space-y-2">
            {mappings.map((m) => {
              const firstValue = rows[0]?.[m.csvColumn] || "";
              return (
                <div key={m.csvColumn} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #EEF2F7" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0B1220" }}>{m.csvColumn}</p>
                    <p className="text-xs truncate" style={{ color: "#94A3B8" }}>ex: {firstValue || "(vazio)"}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "#CBD5E1" }} />
                  <Select value={m.dbField} onValueChange={(val) => updateMapping(m.csvColumn, val)}>
                    <SelectTrigger className="w-full sm:w-[260px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">
                        <span className="flex items-center gap-1.5" style={{ color: "#94A3B8" }}>
                          <X className="w-3 h-3" /> Ignorar esta coluna
                        </span>
                      </SelectItem>
                      {fields.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          <span className="flex items-center gap-1.5">
                            {f.label.split(" (")[0]}
                            {f.required && <span style={{ color: "#DC2626" }} className="text-xs">*</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button className={ghostBtn} style={{ color: "#64748B" }} onClick={() => setStep("upload")}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button className={primaryBtn} onClick={() => setStep("preview")} disabled={missingRequired.length > 0}>
              Revisar dados <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Revisar ─────────────────────────────── */}
      {step === "preview" && (
        <div className="rounded-2xl p-5 sm:p-6 space-y-4" style={cardStyle}>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "#0B1220" }}>Revisar antes de importar</h2>
            <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
              Primeiras 5 linhas de {rows.length}. Confira se as colunas caíram nos campos certos.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #EEF2F7" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th className="text-left py-2.5 px-3 text-[10.5px] font-semibold uppercase" style={{ color: "#94A3B8", letterSpacing: "0.04em" }}>#</th>
                  {fields.filter(f => mappedDbFields.includes(f.key)).map(f => (
                    <th key={f.key} className="text-left py-2.5 px-3 text-[10.5px] font-semibold uppercase whitespace-nowrap" style={{ color: "#94A3B8", letterSpacing: "0.04em" }}>
                      {f.label.split(" (")[0]}
                      {f.required && <span style={{ color: "#DC2626" }} className="ml-0.5">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => {
                  const { warnings, blocking } = rowIssues(row);
                  return (
                    <tr key={i} style={{ borderTop: "1px solid #EEF2F7" }}>
                      <td className="py-2.5 px-3" style={{ color: "#94A3B8" }}>{i + 1}</td>
                      {fields.filter(f => mappedDbFields.includes(f.key)).map(f => {
                        const empty = !row[f.key];
                        const badRequired = f.required && empty;
                        return (
                          <td key={f.key} className="py-2.5 px-3 max-w-[200px] truncate" style={{ color: badRequired ? "#DC2626" : "#334155" }}>
                            {row[f.key] || <span style={{ color: "#CBD5E1" }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Linhas que serão puladas (bloqueio) */}
          {analysis.blockingRows > 0 && (
            <div className="rounded-xl p-3.5 text-sm" style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.18)" }}>
              <p className="font-semibold flex items-center gap-1.5" style={{ color: "#DC2626" }}>
                <AlertCircle className="w-4 h-4" />
                {analysis.blockingRows} {analysis.blockingRows === 1 ? "linha será pulada" : "linhas serão puladas"}
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[13px]" style={{ color: "#B91C1C" }}>
                {Object.entries(analysis.blockingByMsg).map(([msg, n]) => (
                  <li key={msg}>• {msg} ({n})</li>
                ))}
              </ul>
              <p className="text-[12px] mt-1.5" style={{ color: "#94A3B8" }}>Volte e ajuste o arquivo se quiser importar essas linhas.</p>
            </div>
          )}

          {/* Avisos (importadas com valor padrão) */}
          {analysis.warningRows > 0 && (
            <div className="rounded-xl p-3.5 text-sm" style={{ background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.18)" }}>
              <p className="font-semibold flex items-center gap-1.5" style={{ color: "#B45309" }}>
                <AlertTriangle className="w-4 h-4" />
                {analysis.warningRows} {analysis.warningRows === 1 ? "linha tem aviso" : "linhas têm avisos"}
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[13px]" style={{ color: "#92660A" }}>
                {Object.entries(analysis.byMsg).map(([msg, n]) => (
                  <li key={msg}>• {msg} ({n})</li>
                ))}
              </ul>
              <p className="text-[12px] mt-1.5" style={{ color: "#94A3B8" }}>Essas linhas entram mesmo assim, com um valor padrão. Dá pra corrigir depois.</p>
            </div>
          )}

          <div className="rounded-xl p-3.5 text-sm flex items-start gap-2" style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.12)" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#2563EB" }} />
            <span style={{ color: "#334155" }}>
              Vamos importar <strong>{rows.length - analysis.blockingRows}</strong> de {rows.length} {importType === "deals" ? "negociações" : "vendas"}. Esta ação não é desfeita automaticamente.
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button className={ghostBtn} style={{ color: "#64748B" }} onClick={() => setStep("map")}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button className={primaryBtn} onClick={handleImport}>
              Importar {rows.length - analysis.blockingRows} {(rows.length - analysis.blockingRows) === 1 ? "registro" : "registros"} <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Importando ─────────────────────────────── */}
      {step === "importing" && (
        <div className="rounded-2xl py-16 flex flex-col items-center justify-center gap-5" style={cardStyle}>
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#2563EB" }} />
          <div className="text-center">
            <p className="font-semibold" style={{ color: "#0B1220" }}>Importando seus dados...</p>
            <p className="text-sm mt-1" style={{ color: "#64748B" }}>Não feche esta página até terminar.</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#2563EB" }} />
            </div>
            <p className="text-xs text-center mt-2 tabular-nums" style={{ color: "#94A3B8" }}>{progress}%</p>
          </div>
        </div>
      )}

      {/* ── Step 6: Concluído ─────────────────────────────── */}
      {step === "done" && result && (
        <div className="rounded-2xl p-6 sm:p-8 space-y-6" style={cardStyle}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: result.success > 0 ? "#ECFDF3" : "#FEF2F2" }}>
              {result.success > 0
                ? <CheckCircle2 className="w-8 h-8" style={{ color: "#16A34A" }} />
                : <AlertCircle className="w-8 h-8" style={{ color: "#DC2626" }} />}
            </div>
            <h2 className="text-xl font-bold" style={{ color: "#0B1220" }}>
              {result.success > 0 ? "Importação concluída" : "Não deu para importar"}
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "#64748B" }}>
              {result.success > 0
                ? "Seus dados já estão disponíveis na plataforma."
                : "Confira os erros abaixo, ajuste o arquivo e tente de novo."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Importados", value: result.success, color: "#16A34A" },
              { label: "Com erro", value: result.errors.length, color: "#DC2626" },
              { label: "Total", value: result.total, color: "#0B1220" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: "#F8FAFC", border: "1px solid #EEF2F7" }}>
                <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: "#94A3B8", letterSpacing: "0.06em" }}>O que deu errado</p>
              <div className="max-h-52 overflow-y-auto rounded-xl divide-y" style={{ border: "1px solid #EEF2F7" }}>
                {result.errors.slice(0, 30).map((err, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2" style={{ borderColor: "#EEF2F7" }}>
                    <span className="text-[11px] font-semibold tabular-nums shrink-0 mt-0.5" style={{ color: "#94A3B8" }}>Linha {err.row}</span>
                    <span className="text-[13px]" style={{ color: "#B91C1C" }}>{err.message}</span>
                  </div>
                ))}
                {result.errors.length > 30 && (
                  <p className="text-xs px-3 py-2" style={{ color: "#94A3B8" }}>e mais {result.errors.length - 30} erros do mesmo tipo</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 pt-1">
            <button className={ghostBtn} style={{ color: "#475569", border: "1px solid #E6EDF5", height: "40px" }} onClick={reset}>
              Nova importação
            </button>
            <button className={primaryBtn} onClick={() => window.location.href = importType === "deals" ? "/crm" : "/dashboard"}>
              Ver {importType === "deals" ? "pipeline" : "dashboard"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarDados;
