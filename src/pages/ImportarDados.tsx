import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
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
  { key: "title", label: "Titulo da Negociacao", required: true },
  { key: "customer_name", label: "Nome do Cliente", required: true },
  { key: "customer_email", label: "Email do Cliente", required: false },
  { key: "customer_phone", label: "Telefone do Cliente", required: false },
  { key: "value", label: "Valor (R$)", required: false },
  { key: "stage", label: "Etapa (lead, qualification, proposal, negotiation, closed_won, closed_lost)", required: false },
  { key: "notes", label: "Observacoes", required: false },
  { key: "expected_close_date", label: "Data Prevista de Fechamento", required: false },
] as const;

const VENDA_FIELDS = [
  { key: "cliente_nome", label: "Nome do Cliente", required: true },
  { key: "produto_nome", label: "Nome do Produto", required: true },
  { key: "valor", label: "Valor (R$)", required: true },
  { key: "forma_pagamento", label: "Forma de Pagamento (Pix, Cartao de Credito, Boleto, Dinheiro)", required: false },
  { key: "data_venda", label: "Data da Venda (YYYY-MM-DD)", required: false },
  { key: "status", label: "Status (Aprovado, Pendente, Reembolsado)", required: false },
  { key: "plataforma", label: "Plataforma", required: false },
  { key: "observacoes", label: "Observacoes", required: false },
] as const;

const VALID_STAGES = ["lead", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"];
const VALID_PAYMENT = ["Pix", "Cartão de Crédito", "Boleto", "Dinheiro"];
const VALID_STATUS = ["Aprovado", "Pendente", "Reembolsado"];

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
    const normalized = header.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let bestMatch = "_skip";

    for (const [field, syns] of Object.entries(synonyms)) {
      for (const syn of syns) {
        const normalizedSyn = syn.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
          reject(new Error("Arquivo vazio ou sem dados"));
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
        reject(new Error("Erro ao ler o arquivo. Verifique se e um CSV ou Excel valido."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

function parseNumber(val: string): number {
  if (!val) return 0;
  // Handle "R$ 1.234,56" or "1234.56" or "1234,56"
  let cleaned = val.replace(/[R$\s]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // 1.234,56 → 1234.56
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: string): string | null {
  if (!val) return null;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // Try DD/MM/YYYY
  const brMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  // Try MM/DD/YYYY
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

  const fields = importType === "deals" ? DEAL_FIELDS : VENDA_FIELDS;
  const requiredFields = fields.filter(f => f.required).map(f => f.key);

  // Check if all required fields are mapped
  const mappedDbFields = useMemo(() => mappings.map(m => m.dbField), [mappings]);
  const missingRequired = requiredFields.filter(f => !mappedDbFields.includes(f));

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    try {
      const { headers: h, rows: r } = await parseFileToRows(selectedFile);
      setFile(selectedFile);
      setHeaders(h);
      setRows(r);
      const autoMapped = autoMapColumns(h, importType!);
      setMappings(autoMapped);
      setStep("map");
    } catch (err: any) {
      toast.error(err.message || "Erro ao ler arquivo");
    }
  }, [importType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const updateMapping = (csvColumn: string, dbField: string) => {
    setMappings(prev => prev.map(m => m.csvColumn === csvColumn ? { ...m, dbField } : m));
  };

  const previewRows = useMemo(() => {
    return rows.slice(0, 5).map(row => {
      const mapped: Record<string, string> = {};
      for (const m of mappings) {
        if (m.dbField !== "_skip") {
          mapped[m.dbField] = row[m.csvColumn] || "";
        }
      }
      return mapped;
    });
  }, [rows, mappings]);

  const handleImport = async () => {
    if (!user?.id || !activeCompanyId) {
      toast.error("Usuario nao autenticado");
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
        const rowIndex = i + j + 2; // +2 for 1-indexed + header row

        try {
          const mapped: Record<string, any> = {};
          for (const m of mappings) {
            if (m.dbField !== "_skip") {
              mapped[m.dbField] = row[m.csvColumn] || "";
            }
          }

          if (importType === "deals") {
            if (!mapped.title && !mapped.customer_name) {
              importResult.errors.push({ row: rowIndex, message: "Titulo e Nome do Cliente vazios" });
              continue;
            }

            records.push({
              title: mapped.title || mapped.customer_name || "Sem titulo",
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
              importResult.errors.push({ row: rowIndex, message: "Nome do Cliente e Produto vazios" });
              continue;
            }

            records.push({
              cliente_nome: mapped.cliente_nome || "Cliente",
              produto_nome: mapped.produto_nome || "Produto",
              valor: parseNumber(mapped.valor),
              forma_pagamento: mapped.forma_pagamento ? normalizePayment(mapped.forma_pagamento) : "Pix",
              data_venda: mapped.data_venda ? (parseDate(mapped.data_venda) || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
              status: mapped.status ? normalizeStatus(mapped.status) : "Aprovado",
              plataforma: mapped.plataforma || "Importacao",
              observacoes: mapped.observacoes || "Importado via CSV",
              user_id: user.id,
              company_id: activeCompanyId,
            });
          }
        } catch (err: any) {
          importResult.errors.push({ row: rowIndex, message: err.message || "Erro desconhecido" });
        }
      }

      if (records.length > 0) {
        const table = importType === "deals" ? "deals" : "vendas";
        const { error } = await supabase.from(table as any).insert(records);

        if (error) {
          for (let j = 0; j < records.length; j++) {
            importResult.errors.push({ row: i + j + 2, message: error.message });
          }
        } else {
          importResult.success += records.length;
        }
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / rows.length) * 100)));
    }

    setResult(importResult);
    setStep("done");

    if (importResult.success > 0) {
      toast.success(`${importResult.success} registros importados com sucesso!`);
    }
    if (importResult.errors.length > 0) {
      toast.error(`${importResult.errors.length} erros encontrados`);
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
    toast.success("Template baixado!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importar Dados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importe negociacoes ou vendas a partir de um arquivo CSV ou Excel
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {[
            { id: "select", label: "Tipo" },
            { id: "upload", label: "Arquivo" },
            { id: "map", label: "Mapear" },
            { id: "preview", label: "Revisar" },
            { id: "done", label: "Concluido" },
          ].map((s, i, arr) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors ${
                step === s.id || (step === "importing" && s.id === "done")
                  ? "bg-emerald-500/15 text-emerald-500 font-medium"
                  : arr.findIndex(x => x.id === step) > i || step === "done"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-muted/50 text-muted-foreground"
              }`}>
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">
                  {arr.findIndex(x => x.id === step) > i || step === "done" ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </span>
                {s.label}
              </div>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/30" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Select type ─────────────────────────────── */}
        {step === "select" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { type: "deals" as ImportType, icon: Kanban, title: "Negociacoes (Deals)", desc: "Leads, oportunidades e negociacoes do CRM", color: "emerald" },
              { type: "vendas" as ImportType, icon: ShoppingCart, title: "Vendas", desc: "Historico de vendas realizadas", color: "blue" },
            ].map(({ type, icon: Icon, title, desc, color }) => (
              <Card
                key={type}
                className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-2 ${
                  importType === type ? `border-${color}-500` : "border-transparent hover:border-muted-foreground/20"
                }`}
                onClick={() => { setImportType(type); setStep("upload"); }}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div className={`p-3 rounded-xl bg-${color}-500/10`}>
                    <Icon className={`w-6 h-6 text-${color}-500`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Step 2: Upload ──────────────────────────────────── */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Enviar Arquivo - {importType === "deals" ? "Negociacoes" : "Vendas"}
              </CardTitle>
              <CardDescription>
                Aceita arquivos .csv, .xlsx ou .xls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center hover:border-emerald-500/40 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Arraste um arquivo aqui ou <span className="text-emerald-500 font-medium">clique para selecionar</span>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">CSV, XLSX ou XLS</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => { setStep("select"); setImportType(null); }}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1" /> Baixar Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Map columns ─────────────────────────────── */}
        {step === "map" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Mapear Colunas</CardTitle>
                  <CardDescription>
                    <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                    {file?.name} - {rows.length} linhas encontradas
                  </CardDescription>
                </div>
                {missingRequired.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {missingRequired.length} campo(s) obrigatorio(s) faltando
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mappings.map((m) => {
                const firstValue = rows[0]?.[m.csvColumn] || "";
                return (
                  <div key={m.csvColumn} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.csvColumn}</p>
                      <p className="text-xs text-muted-foreground truncate">ex: {firstValue || "(vazio)"}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    <Select value={m.dbField} onValueChange={(val) => updateMapping(m.csvColumn, val)}>
                      <SelectTrigger className="w-[240px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_skip">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <X className="w-3 h-3" /> Ignorar
                          </span>
                        </SelectItem>
                        {fields.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            <span className="flex items-center gap-1.5">
                              {f.label}
                              {f.required && <span className="text-rose-500 text-xs">*</span>}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  onClick={() => setStep("preview")}
                  disabled={missingRequired.length > 0}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Revisar Dados <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Preview ─────────────────────────────────── */}
        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revisar Importacao</CardTitle>
              <CardDescription>
                Primeiras 5 linhas de {rows.length} total. Verifique se os dados estao corretos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">#</th>
                      {fields.filter(f => mappedDbFields.includes(f.key)).map(f => (
                        <th key={f.key} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                          {f.label.split(" (")[0]}
                          {f.required && <span className="text-rose-500 ml-0.5">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        {fields.filter(f => mappedDbFields.includes(f.key)).map(f => (
                          <td key={f.key} className="py-2 px-3 max-w-[200px] truncate">
                            {row[f.key] || <span className="text-muted-foreground/40">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 inline mr-1.5" />
                Serao importados <strong>{rows.length}</strong> registros como{" "}
                <strong>{importType === "deals" ? "Negociacoes" : "Vendas"}</strong>.
                Esta acao nao pode ser desfeita facilmente.
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("map")}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-500">
                  Importar {rows.length} Registros <Upload className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 5: Importing ───────────────────────────────── */}
        {step === "importing" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <div className="text-center">
                <p className="font-medium text-foreground">Importando dados...</p>
                <p className="text-sm text-muted-foreground mt-1">Nao feche esta pagina</p>
              </div>
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground mt-2">{progress}%</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 6: Done ────────────────────────────────────── */}
        {step === "done" && result && (
          <Card>
            <CardContent className="py-12 space-y-6">
              <div className="text-center">
                {result.success > 0 ? (
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                ) : (
                  <AlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
                )}
                <h2 className="text-xl font-bold text-foreground">Importacao Concluida</h2>
              </div>

              <div className="flex justify-center gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-500">{result.success}</p>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </div>
                <div className="w-px bg-border" />
                <div>
                  <p className="text-2xl font-bold text-rose-500">{result.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
                <div className="w-px bg-border" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{result.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 space-y-1">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-xs text-rose-400">
                      Linha {err.row}: {err.message}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-xs text-muted-foreground">... e mais {result.errors.length - 20} erros</p>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-3 pt-4">
                <Button variant="outline" onClick={reset}>
                  Nova Importacao
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => window.location.href = importType === "deals" ? "/crm" : "/dashboard"}>
                  Ver {importType === "deals" ? "CRM" : "Dashboard"} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ImportarDados;
