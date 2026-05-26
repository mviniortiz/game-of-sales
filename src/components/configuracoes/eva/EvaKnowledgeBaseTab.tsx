// ─────────────────────────────────────────────────────────────────────────────
// F4E.5 (2026-05-21) — Base de Conhecimento da EVA (tab)
//
// UI 100% manual e controlada por custo:
//   - Admin cola texto ou faz upload .txt → cria eva_training_documents row
//   - Clique "Gerar sugestões" → chama edge function generate-eva-context-suggestions
//   - Sugestões pendentes em eva_context_suggestions → Admin aprova/rejeita
//   - Aprovação faz merge em eva_business_context (campo apropriado) e marca
//     applied_at. Trigger trg_eva_business_context_touch incrementa version,
//     o que invalida análises antigas (whatsapp-copilot.context_version_used).
//
// Não chama IA automaticamente. Não aplica nada sem clique explícito.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  XCircle,
  Trash2,
  AlertCircle,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatError } from "@/lib/utils";

// ─── F4E.5.3 — Helpers de similaridade ────────────────────────────────────
// Detecta itens já aprovados parecidos com a sugestão pendente.
// Heurística simples: lowercase + remove acentos + tokenize + interseção.

function normalizeText(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(s.split(" ").filter((t) => t.length >= 3));
}

/** Jaccard simples sobre tokens >= 3 chars. Threshold conservador. */
function similarityScore(a: string, b: string): number {
  const A = tokens(normalizeText(a));
  const B = tokens(normalizeText(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}

interface SimilarMatch {
  label: string;       // "Playbook (tone): Tom WhatsApp..."
  score: number;       // 0-1
  reason: string;      // explicação curta
}

/** Encontra itens já em eva_business_context parecidos com a sugestão. */
function findSimilarInContext(
  s: { suggestion_type: string; title: string; content: Record<string, unknown> },
  ctx: {
    agency: Record<string, unknown>;
    services: unknown[];
    icp: Record<string, unknown>;
    playbooks: unknown[];
  },
): SimilarMatch[] {
  const matches: SimilarMatch[] = [];
  const THRESHOLD = 0.6;
  const titleNorm = normalizeText(s.title);
  const contentText = normalizeText(
    Object.values(s.content)
      .filter((v) => typeof v === "string")
      .join(" "),
  );

  // Comparação com services existentes (.name + .description)
  if (s.suggestion_type === "service") {
    for (const svc of ctx.services) {
      const o = (svc as Record<string, unknown>) || {};
      const name = typeof o.name === "string" ? o.name : (typeof o.nome === "string" ? o.nome : "");
      const desc = typeof o.description === "string" ? o.description : (typeof o.descricao === "string" ? o.descricao : "");
      const score = Math.max(
        similarityScore(titleNorm, normalizeText(name)),
        similarityScore(contentText, normalizeText(`${name} ${desc}`)),
      );
      if (score >= THRESHOLD) {
        matches.push({
          label: `Serviço: ${name || "(sem nome)"}`,
          score,
          reason: "Nome/descrição parecido",
        });
      }
    }
  }

  // Comparação com playbooks (mesmo kind + title/content)
  if (
    s.suggestion_type === "playbook" ||
    s.suggestion_type === "tone" ||
    s.suggestion_type === "faq" ||
    s.suggestion_type === "objection" ||
    s.suggestion_type === "forbidden_promise"
  ) {
    for (const pb of ctx.playbooks) {
      const o = (pb as Record<string, unknown>) || {};
      const kind = typeof o.kind === "string" ? o.kind : null;
      if (kind && kind !== s.suggestion_type) continue;
      const pbTitle = typeof o.title === "string" ? o.title : "";
      const pbContent = normalizeText(
        Object.values((o.content as Record<string, unknown>) || {})
          .filter((v) => typeof v === "string")
          .join(" "),
      );
      const score = Math.max(
        similarityScore(titleNorm, normalizeText(pbTitle)),
        similarityScore(contentText, pbContent),
      );
      if (score >= THRESHOLD) {
        matches.push({
          label: `${kind ?? "Playbook"}: ${pbTitle || "(sem título)"}`,
          score,
          reason: "Texto/conteúdo parecido",
        });
      }
    }
  }

  // agency/icp comparam por keys do JSONB
  if (s.suggestion_type === "agency") {
    const keys = Object.keys(s.content);
    const overlap = keys.filter((k) => ctx.agency[k] !== undefined && ctx.agency[k] !== null && ctx.agency[k] !== "");
    if (overlap.length > 0) {
      matches.push({
        label: `Agência (sobrescreve ${overlap.length} campo${overlap.length > 1 ? "s" : ""})`,
        score: 0.8,
        reason: `Vai sobrescrever: ${overlap.join(", ")}`,
      });
    }
  }
  if (s.suggestion_type === "icp") {
    const keys = Object.keys(s.content);
    const overlap = keys.filter((k) => ctx.icp[k] !== undefined && ctx.icp[k] !== null && ctx.icp[k] !== "");
    if (overlap.length > 0) {
      matches.push({
        label: `ICP (sobrescreve ${overlap.length} campo${overlap.length > 1 ? "s" : ""})`,
        score: 0.8,
        reason: `Vai sobrescrever: ${overlap.join(", ")}`,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

type Priority = "high" | "medium" | "low";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface TrainingDoc {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  raw_text: string | null;
  status: "uploaded" | "processing" | "processed" | "failed" | "archived";
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
}

interface ContextSuggestion {
  id: string;
  document_id: string | null;
  suggestion_type: string;
  title: string;
  content: Record<string, unknown>;
  confidence: number | null;
  status: "pending" | "approved" | "rejected" | "archived";
  created_at: string;
}

const SUGGESTION_TYPE_LABEL: Record<string, string> = {
  agency: "Agência",
  service: "Serviço",
  icp: "ICP",
  playbook: "Playbook",
  tone: "Tom de voz",
  forbidden_promise: "Promessa proibida",
  faq: "FAQ",
  objection: "Objeção",
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface EvaKnowledgeBaseTabProps {
  companyId: string;
  isAdmin: boolean;
  userId: string | undefined;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EvaKnowledgeBaseTab({ companyId, isAdmin, userId }: EvaKnowledgeBaseTabProps) {
  const [docs, setDocs] = useState<TrainingDoc[]>([]);
  const [suggestions, setSuggestions] = useState<ContextSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastedText, setPastedText] = useState("");
  const [pastedName, setPastedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingForDoc, setGeneratingForDoc] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  // F4E.5.3 — viewer (detalhes) + confirm modal (similaridade) + priority
  const [viewingSuggestion, setViewingSuggestion] = useState<ContextSuggestion | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    suggestion: ContextSuggestion;
    similar: SimilarMatch[];
    priority: Priority;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, sugRes] = await Promise.all([
        supabase
          .from("eva_training_documents")
          .select("id, file_name, file_type, file_size, raw_text, status, error_message, metadata, created_at, processed_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("eva_context_suggestions")
          .select("id, document_id, suggestion_type, title, content, confidence, status, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (docsRes.error) throw docsRes.error;
      if (sugRes.error) throw sugRes.error;
      setDocs((docsRes.data ?? []) as TrainingDoc[]);
      setSuggestions((sugRes.data ?? []) as ContextSuggestion[]);
    } catch (err) {
      toast.error(`Erro ao carregar: ${formatError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void loadAll();
  }, [companyId, loadAll]);

  const pendingSuggestions = useMemo(
    () => suggestions.filter((s) => s.status === "pending"),
    [suggestions],
  );

  // ── Adicionar material ────────────────────────────────────────────────
  const handleAdd = async (input: { fileName: string; fileType: string; rawText: string; size: number }) => {
    if (!isAdmin) {
      toast.error("Apenas admins podem adicionar materiais.");
      return;
    }
    if (input.rawText.trim().length < 30) {
      toast.error("Texto muito curto. Adicione pelo menos 30 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("eva_training_documents")
        .insert({
          company_id: companyId,
          uploaded_by: userId ?? null,
          file_name: input.fileName.slice(0, 140) || "material.txt",
          file_type: input.fileType,
          file_size: input.size,
          raw_text: input.rawText,
          status: "uploaded",
        });
      if (error) throw error;
      toast.success("Material adicionado. Clique em 'Gerar sugestões' quando estiver pronto.");
      setPastedText("");
      setPastedName("");
      await loadAll();
    } catch (err) {
      toast.error(`Erro ao adicionar: ${formatError(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasteSubmit = async () => {
    const text = pastedText.trim();
    if (!text) {
      toast.error("Cole algum texto antes de adicionar.");
      return;
    }
    await handleAdd({
      fileName: pastedName.trim() || "Texto colado",
      fileType: "text/plain",
      rawText: text,
      size: text.length,
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      toast.error("Por enquanto, apenas arquivos .txt. PDF/DOCX em breve.");
      return;
    }
    if (file.size > 500_000) {
      toast.error("Arquivo muito grande. Limite 500 KB nesta versão.");
      return;
    }
    try {
      const text = await file.text();
      await handleAdd({
        fileName: file.name,
        fileType: file.type || "text/plain",
        rawText: text,
        size: file.size,
      });
    } catch (err) {
      toast.error(`Erro ao ler arquivo: ${formatError(err)}`);
    }
  };

  // ── Gerar sugestões (edge function) ──────────────────────────────────
  const handleGenerate = async (docId: string) => {
    setGeneratingForDoc(docId);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        suggestions_generated?: number;
        error?: string;
      }>("generate-eva-context-suggestions", {
        body: { documentId: docId },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "Falha ao gerar sugestões");
      toast.success(
        `${data.suggestions_generated ?? 0} sugest${(data.suggestions_generated ?? 0) === 1 ? "ão gerada" : "ões geradas"}. Revise abaixo.`,
      );
      await loadAll();
    } catch (err) {
      toast.error(`Erro: ${formatError(err)}`);
      await loadAll(); // pra refletir status='failed' atualizado
    } finally {
      setGeneratingForDoc(null);
    }
  };

  // ── Aprovar sugestão (F4E.5.3: 2 etapas — check + confirm) ──────────
  /** Etapa 1: lê contexto, checa similaridade. Se houver match, abre modal
   *  de confirmação. Senão, abre modal só pra escolher priority e confirmar. */
  const requestApprove = async (s: ContextSuggestion) => {
    if (!isAdmin) {
      toast.error("Apenas admins podem aplicar sugestões.");
      return;
    }
    setApplyingId(s.id);
    try {
      const { data: ctxRow, error: e1 } = await supabase
        .from("eva_business_context")
        .select("agency, services, icp, playbooks")
        .eq("company_id", companyId)
        .maybeSingle();
      if (e1) throw e1;

      const ctx = {
        agency:    (ctxRow?.agency    as Record<string, unknown> | null) || {},
        services:  Array.isArray(ctxRow?.services)  ? (ctxRow.services  as unknown[]) : [],
        icp:       (ctxRow?.icp       as Record<string, unknown> | null) || {},
        playbooks: Array.isArray(ctxRow?.playbooks) ? (ctxRow.playbooks as unknown[]) : [],
      };

      const similar = findSimilarInContext(
        { suggestion_type: s.suggestion_type, title: s.title, content: s.content },
        ctx,
      );

      setConfirmModal({
        suggestion: s,
        similar,
        priority: "medium",
      });
    } catch (err) {
      toast.error(`Erro ao preparar aprovação: ${formatError(err)}`);
    } finally {
      setApplyingId(null);
    }
  };

  /** Etapa 2: aplica patch real. Chamado pelo modal de confirmação. */
  const confirmApprove = async (s: ContextSuggestion, priority: Priority) => {
    if (!isAdmin) return;
    setApplyingId(s.id);
    try {
      const { data: ctxRow, error: e1 } = await supabase
        .from("eva_business_context")
        .select("agency, services, icp, playbooks")
        .eq("company_id", companyId)
        .maybeSingle();
      if (e1) throw e1;

      const currentAgency    = (ctxRow?.agency    as Record<string, unknown> | null) || {};
      const currentServices  = Array.isArray(ctxRow?.services)  ? (ctxRow.services  as unknown[]) : [];
      const currentIcp       = (ctxRow?.icp       as Record<string, unknown> | null) || {};
      const currentPlaybooks = Array.isArray(ctxRow?.playbooks) ? (ctxRow.playbooks as unknown[]) : [];

      const patch: Record<string, unknown> = { company_id: companyId };
      const c = s.content || {};
      switch (s.suggestion_type) {
        case "agency":
          patch.agency = { ...currentAgency, ...c };
          break;
        case "service":
          patch.services = [
            ...currentServices,
            {
              name: c.name ?? s.title,
              description: c.description ?? null,
              price: c.price ?? null,
              evidence: c.evidence ?? null,
              source: "knowledge_base",
              suggestion_id: s.id,
              priority,   // F4E.5.3
            },
          ];
          break;
        case "icp":
          patch.icp = { ...currentIcp, ...c };
          break;
        case "playbook":
        case "tone":
        case "forbidden_promise":
        case "faq":
        case "objection":
          patch.playbooks = [
            ...currentPlaybooks,
            {
              kind: s.suggestion_type,
              title: s.title,
              content: c,
              source: "knowledge_base",
              suggestion_id: s.id,
              applied_at: new Date().toISOString(),
              priority,   // F4E.5.3
            },
          ];
          break;
        default:
          throw new Error(`unknown_type:${s.suggestion_type}`);
      }
      patch.last_edited_by = userId ?? null;

      const { error: e2 } = await supabase
        .from("eva_business_context")
        .upsert(patch, { onConflict: "company_id" });
      if (e2) throw e2;

      const { error: e3 } = await supabase
        .from("eva_context_suggestions")
        .update({
          status: "approved",
          applied_at: new Date().toISOString(),
          applied_by: userId ?? null,
        })
        .eq("id", s.id);
      if (e3) throw e3;

      toast.success("Sugestão aplicada ao contexto da EVA.");
      setConfirmModal(null);
      await loadAll();
    } catch (err) {
      toast.error(`Erro ao aplicar: ${formatError(err)}`);
    } finally {
      setApplyingId(null);
    }
  };

  // ── Rejeitar sugestão ────────────────────────────────────────────────
  const handleReject = async (s: ContextSuggestion) => {
    if (!isAdmin) return;
    setApplyingId(s.id);
    try {
      const { error } = await supabase
        .from("eva_context_suggestions")
        .update({ status: "rejected" })
        .eq("id", s.id);
      if (error) throw error;
      toast.success("Sugestão descartada.");
      await loadAll();
    } catch (err) {
      toast.error(`Erro: ${formatError(err)}`);
    } finally {
      setApplyingId(null);
    }
  };

  // ── Arquivar documento ───────────────────────────────────────────────
  const handleArchiveDoc = async (docId: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Arquivar este material? Sugestões pendentes serão mantidas.")) return;
    try {
      const { error } = await supabase
        .from("eva_training_documents")
        .update({ status: "archived" })
        .eq("id", docId);
      if (error) throw error;
      await loadAll();
    } catch (err) {
      toast.error(`Erro: ${formatError(err)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header / instruções */}
      <div className="rounded-2xl p-5 border border-border bg-card/40">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(124,58,237,0.10)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "#6D28D9" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: "#0B1220" }}>
              Adicione materiais para a EVA usar como contexto
            </h3>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "#64748B" }}>
              Envie materiais da sua agência para a EVA sugerir serviços, objeções, playbooks e regras de atendimento. Nada é aplicado sem sua aprovação.
            </p>
          </div>
        </div>
      </div>

      {/* Adicionar texto colado */}
      <div className="rounded-2xl p-5 border border-border bg-card/40 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-semibold uppercase tracking-widest"
              style={{ color: "#475569", letterSpacing: "0.08em" }}>
            Colar texto
          </h4>
          <label
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors hover:bg-accent"
            style={{ background: "rgba(37,99,235,0.08)", color: "#1D4ED8", border: "1px solid rgba(37,99,235,0.20)" }}
          >
            <Upload className="h-3 w-3" />
            Upload .txt
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <input
          type="text"
          value={pastedName}
          onChange={(e) => setPastedName(e.target.value)}
          placeholder="Nome do material (opcional)"
          className="w-full h-9 px-3 rounded-md text-[13px] bg-background border border-border"
          disabled={submitting}
        />
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Cole aqui o briefing, playbook, lista de serviços ou qualquer texto que a EVA deva conhecer…"
          rows={6}
          className="w-full px-3 py-2 rounded-md text-[13px] bg-background border border-border resize-y leading-relaxed"
          disabled={submitting}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {pastedText.length} caracteres · mínimo 30
          </span>
          <button
            type="button"
            onClick={handlePasteSubmit}
            disabled={submitting || pastedText.trim().length < 30}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Adicionar material
          </button>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="space-y-3">
        <h4 className="text-[13px] font-semibold uppercase tracking-widest px-1"
            style={{ color: "#475569", letterSpacing: "0.08em" }}>
          Materiais enviados
        </h4>
        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-[12.5px]" style={{ color: "#64748B" }}>
              Nenhum material enviado ainda.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id}
                  className="rounded-xl p-4 border border-border bg-card/30 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: "rgba(37,99,235,0.08)" }}>
                  <FileText className="h-3.5 w-3.5" style={{ color: "#2563EB" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#0B1220" }}>
                      {d.file_name}
                    </p>
                    <DocStatusBadge status={d.status} />
                  </div>
                  <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                    {d.raw_text?.length ?? 0} caracteres · {new Date(d.created_at).toLocaleString("pt-BR")}
                  </p>
                  {d.error_message && (
                    <p className="text-[11.5px] mt-1" style={{ color: "#DC2626" }}>
                      Erro: {d.error_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {d.status !== "archived" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleGenerate(d.id)}
                        disabled={
                          generatingForDoc === d.id ||
                          d.status === "processing" ||
                          !isAdmin
                        }
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11.5px] font-semibold transition-colors disabled:opacity-50"
                        style={{
                          background: "rgba(124,58,237,0.08)",
                          color: "#6D28D9",
                          border: "1px solid rgba(124,58,237,0.20)",
                        }}
                      >
                        {generatingForDoc === d.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Sparkles className="h-3 w-3" />}
                        Gerar sugestões
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveDoc(d.id)}
                        disabled={!isAdmin}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                        title="Arquivar"
                      >
                        <Trash2 className="h-3 w-3" style={{ color: "#64748B" }} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sugestões pendentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[13px] font-semibold uppercase tracking-widest"
              style={{ color: "#475569", letterSpacing: "0.08em" }}>
            Sugestões pendentes
          </h4>
          {pendingSuggestions.length > 0 && (
            <span className="text-[11px]" style={{ color: "#94A3B8" }}>
              {pendingSuggestions.length} pendente{pendingSuggestions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {pendingSuggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-[12.5px]" style={{ color: "#64748B" }}>
              Nenhuma sugestão pendente. Gere sugestões a partir dos materiais acima.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pendingSuggestions.map((s) => (
              <li key={s.id}
                  className="rounded-xl p-4 border border-border bg-card/30">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(124,58,237,0.10)", color: "#6D28D9", letterSpacing: "0.04em" }}>
                        {SUGGESTION_TYPE_LABEL[s.suggestion_type] ?? s.suggestion_type}
                      </span>
                      {typeof s.confidence === "number" && (
                        <span className="text-[10px]" style={{ color: "#94A3B8" }}>
                          confiança {(s.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] font-semibold mb-1" style={{ color: "#0B1220" }}>
                      {s.title}
                    </p>
                    <SuggestionContentPreview content={s.content} />
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingSuggestion(s)}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold transition-colors hover:bg-accent"
                    style={{ background: "transparent", color: "#475569", border: "1px solid #E2E8F0" }}
                  >
                    <Eye className="h-3 w-3" />
                    Ver detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(s)}
                    disabled={applyingId === s.id || !isAdmin}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold transition-colors disabled:opacity-50"
                    style={{ background: "transparent", color: "#64748B", border: "1px solid #E2E8F0" }}
                  >
                    <XCircle className="h-3 w-3" />
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => requestApprove(s)}
                    disabled={applyingId === s.id || !isAdmin}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                  >
                    {applyingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Aprovar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Aviso anti-alucinação */}
      <div className="rounded-xl p-3 flex items-start gap-2"
           style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.20)" }}>
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#B45309" }} />
        <p className="text-[11.5px] leading-relaxed" style={{ color: "#64748B" }}>
          A EVA só sugere o que estiver explícito no material. Revise cada sugestão antes de aprovar. Aprovações atualizam o contexto da EVA e invalidam análises antigas de conversas para serem refeitas quando você clicar.
        </p>
      </div>

      {/* F4E.5.3 — Modal de visualização */}
      {viewingSuggestion && (
        <SuggestionViewerModal
          suggestion={viewingSuggestion}
          onClose={() => setViewingSuggestion(null)}
          onApprove={() => {
            const s = viewingSuggestion;
            setViewingSuggestion(null);
            void requestApprove(s);
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* F4E.5.3 — Modal de confirmação (similaridade + priority) */}
      {confirmModal && (
        <ApprovalConfirmModal
          state={confirmModal}
          setPriority={(p) => setConfirmModal((prev) => prev ? { ...prev, priority: p } : prev)}
          onCancel={() => setConfirmModal(null)}
          onConfirm={() => confirmApprove(confirmModal.suggestion, confirmModal.priority)}
          applying={applyingId === confirmModal.suggestion.id}
        />
      )}
    </div>
  );
}

// ─── F4E.5.3 — Modal de visualização ─────────────────────────────────────

function SuggestionViewerModal({
  suggestion,
  onClose,
  onApprove,
  isAdmin,
}: {
  suggestion: ContextSuggestion;
  onClose: () => void;
  onApprove: () => void;
  isAdmin: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,18,32,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[80vh] overflow-y-auto"
        style={{ border: "1px solid #D9E2EC", boxShadow: "0 24px 60px -12px rgba(15,23,42,0.30)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(124,58,237,0.10)", color: "#6D28D9", letterSpacing: "0.04em" }}>
                {SUGGESTION_TYPE_LABEL[suggestion.suggestion_type] ?? suggestion.suggestion_type}
              </span>
              {typeof suggestion.confidence === "number" && (
                <span className="text-[10px]" style={{ color: "#94A3B8" }}>
                  confiança {(suggestion.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <h3 className="text-[14.5px] font-semibold" style={{ color: "#0B1220" }}>
              {suggestion.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" style={{ color: "#64748B" }} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {Object.entries(suggestion.content).map(([k, v]) => {
            const text = typeof v === "string" ? v
              : typeof v === "number" ? String(v)
              : JSON.stringify(v, null, 2);
            return (
              <div key={k}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#475569", letterSpacing: "0.06em" }}>
                  {k}
                </p>
                <p className="text-[12.5px] whitespace-pre-wrap leading-relaxed" style={{ color: "#0B1220" }}>
                  {text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold"
            style={{ background: "transparent", color: "#64748B", border: "1px solid #E2E8F0" }}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={!isAdmin}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Aprovar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── F4E.5.3 — Modal de confirmação (similaridade + priority) ────────────

function ApprovalConfirmModal({
  state,
  setPriority,
  onCancel,
  onConfirm,
  applying,
}: {
  state: { suggestion: ContextSuggestion; similar: SimilarMatch[]; priority: Priority };
  setPriority: (p: Priority) => void;
  onCancel: () => void;
  onConfirm: () => void;
  applying: boolean;
}) {
  const { suggestion, similar, priority } = state;
  const hasSimilar = similar.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,18,32,0.55)" }}
      onClick={applying ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-5"
        style={{ border: "1px solid #D9E2EC", boxShadow: "0 24px 60px -12px rgba(15,23,42,0.30)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          {hasSimilar ? (
            <>
              <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "#B45309" }} />
              <h3 className="text-[14px] font-semibold" style={{ color: "#0B1220" }}>
                Já existe um item parecido aprovado
              </h3>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#047857" }} />
              <h3 className="text-[14px] font-semibold" style={{ color: "#0B1220" }}>
                Aprovar sugestão
              </h3>
            </>
          )}
        </div>

        <div className="mb-3">
          <p className="text-[12.5px] mb-2" style={{ color: "#475569" }}>
            <strong>{SUGGESTION_TYPE_LABEL[suggestion.suggestion_type] ?? suggestion.suggestion_type}:</strong>{" "}
            {suggestion.title}
          </p>
        </div>

        {hasSimilar && (
          <div className="rounded-lg p-3 mb-4"
               style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)" }}>
            <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#B45309", letterSpacing: "0.06em" }}>
              {similar.length === 1 ? "Item similar encontrado" : `${similar.length} itens similares encontrados`}
            </p>
            <ul className="space-y-1.5">
              {similar.map((m, i) => (
                <li key={i} className="text-[11.5px] leading-snug" style={{ color: "#475569" }}>
                  · <strong>{m.label}</strong>
                  <span className="ml-1" style={{ color: "#94A3B8" }}>
                    ({(m.score * 100).toFixed(0)}% match — {m.reason})
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] mt-2" style={{ color: "#64748B" }}>
              Aprovar mesmo assim vai adicionar mais um item ao contexto da EVA.
            </p>
          </div>
        )}

        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: "#475569", letterSpacing: "0.06em" }}>
            Prioridade
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {(["high", "medium", "low"] as Priority[]).map((p) => {
              const active = priority === p;
              const labels: Record<Priority, string> = { high: "Alta", medium: "Média", low: "Baixa" };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className="h-8 rounded-md text-[11.5px] font-semibold transition-colors"
                  style={{
                    background: active ? "rgba(37,99,235,0.10)" : "transparent",
                    color: active ? "#1D4ED8" : "#64748B",
                    border: `1px solid ${active ? "rgba(37,99,235,0.30)" : "#E2E8F0"}`,
                  }}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
          <p className="text-[10.5px] mt-1.5" style={{ color: "#94A3B8" }}>
            Itens de prioridade alta aparecem primeiro no contexto da EVA.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold disabled:opacity-50"
            style={{ background: "transparent", color: "#64748B", border: "1px solid #E2E8F0" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={applying}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
          >
            {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {hasSimilar ? "Aprovar mesmo assim" : "Aprovar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: TrainingDoc["status"] }) {
  const tone =
    status === "processed" ? { bg: "rgba(16,185,129,0.10)", c: "#047857", label: "Processado" } :
    status === "processing" ? { bg: "rgba(37,99,235,0.10)", c: "#1D4ED8", label: "Processando" } :
    status === "failed" ? { bg: "rgba(220,38,38,0.10)", c: "#B91C1C", label: "Falhou" } :
    status === "archived" ? { bg: "rgba(148,163,184,0.15)", c: "#64748B", label: "Arquivado" } :
    { bg: "rgba(245,158,11,0.10)", c: "#B45309", label: "Aguardando análise" };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: tone.bg, color: tone.c, fontWeight: 700, letterSpacing: "0.04em" }}>
      {tone.label.toUpperCase()}
    </span>
  );
}

function SuggestionContentPreview({ content }: { content: Record<string, unknown> }) {
  const keys = Object.keys(content);
  if (keys.length === 0) return null;
  return (
    <div className="space-y-1 mt-2">
      {keys.slice(0, 4).map((k) => {
        const v = content[k];
        const display =
          typeof v === "string" ? v :
          typeof v === "number" ? String(v) :
          JSON.stringify(v);
        const truncated = display.length > 160 ? display.slice(0, 160) + "…" : display;
        return (
          <div key={k} className="text-[12px]">
            <span className="font-semibold" style={{ color: "#475569" }}>{k}:</span>{" "}
            <span style={{ color: "#64748B" }}>{truncated}</span>
          </div>
        );
      })}
    </div>
  );
}
