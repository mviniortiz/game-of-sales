// ─────────────────────────────────────────────────────────────────────────────
// EVA.STUDIO.F2 (2026-06-09) — useEvaContextSuggestions
//
// Liga o GuidedContextBuilder (F2) aos dados reais. É a fundação da migração da
// construção guiada do preview pra aba Studio.
//
//   LÊ  → eva_context_suggestions (status=pending) mapeadas pro tipo
//         ContextSuggestion do F2 (statement←title, evidence←content.evidence,
//         source←documento de origem, effect←derivado por tipo) + lacunas reais
//         de eva_knowledge_gaps (status=open).
//
//   GRAVA → as resoluções, com a PONTE pro eva_business_context (é de lá que o
//           whatsapp-copilot lê; sem isso, aprovar não muda nada na EVA):
//             confirm  → suggestion.status=approved + merge no contexto
//             correct  → idem, com o texto corrigido (sinal de aprendizado)
//             dismiss  → suggestion.status=rejected
//             defineGap→ gap.status=resolved + resposta vai pro slot (fix_target)
//             submitText→ insert eva_training_documents + dispara a edge
//
// "as any" nas tabelas fora dos types gerados = padrão do projeto.
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
    ContextGap,
    ContextSuggestion,
    ContextSuggestionType,
    SuggestionResolution,
} from "@/components/eva-studio/GuidedContextBuilder";

// ── Mapeamentos de apresentação ──────────────────────────────────────────────

// "O que muda ao confirmar" — causa e efeito por tipo (o DB não guarda isso).
const EFFECT_BY_TYPE: Record<ContextSuggestionType, string> = {
    agency: "A EVA passa a conhecer esse fato da sua agência.",
    service: "As respostas sobre esse serviço param de ser genéricas.",
    icp: "A lista do Inbox passa a separar fit bom de fit fraco.",
    playbook: "A EVA passa a seguir esse passo na hora de vender.",
    tone: "A EVA passa a falar no seu tom.",
    forbidden_promise: "A EVA fica proibida de prometer isso nas sugestões.",
    faq: "Essa pergunta passa a ter resposta pronta.",
    objection: "Essa objeção ganha uma resposta sua, não inventada.",
};

// O que fica travado sem a lacuna, derivado do alvo do conserto.
const GAP_BLOCKS_BY_TARGET: Record<string, string> = {
    agency: "o que a EVA sabe da sua agência",
    services: "respostas sobre serviço e preço",
    icp: "qualificação de fit",
    playbooks: "o passo a passo da venda",
    other: "respostas sobre isso",
};

interface SuggestionRow {
    id: string;
    suggestion_type: ContextSuggestionType;
    title: string;
    content: Record<string, unknown> | null;
    confidence: number | null;
    document_id: string | null;
}

interface GapRow {
    id: string;
    gap_description: string;
    suggested_fix: string | null;
    fix_target: string | null;
    occurrence_count: number;
}

interface BusinessContext {
    id: string | null;
    agency: Record<string, unknown>;
    services: unknown[];
    icp: Record<string, unknown>;
    playbooks: unknown[];
}

function evidenceOf(content: Record<string, unknown> | null): string {
    if (!content) return "";
    const e = content.evidence ?? content.trecho ?? content.description;
    return typeof e === "string" ? e : "";
}

function mapSuggestion(r: SuggestionRow, sourceLabel: string): ContextSuggestion {
    return {
        id: r.id,
        type: r.suggestion_type,
        confidence: typeof r.confidence === "number" ? r.confidence : 0.7,
        statement: r.title,
        evidence: evidenceOf(r.content),
        source: sourceLabel,
        effect: EFFECT_BY_TYPE[r.suggestion_type],
    };
}

function mapGap(r: GapRow): ContextGap {
    return {
        id: r.id,
        question: r.gap_description,
        blocks: r.suggested_fix?.trim() || GAP_BLOCKS_BY_TARGET[r.fix_target ?? "other"] || "respostas sobre isso",
        occurrenceCount: r.occurrence_count ?? 0,
        target: r.fix_target ?? "other",
    };
}

// ── A PONTE: aplica um fato confirmado no slot certo do eva_business_context ──
// Casa com o que o buildContextBlock do whatsapp-copilot lê (agency.*, services[],
// icp.descricao, playbooks[]). Texto corrigido sobrescreve o statement.
function mergeIntoContext(
    ctx: BusinessContext,
    type: ContextSuggestionType,
    statement: string,
    content: Record<string, unknown> | null,
    text: string | null,
): BusinessContext {
    const value = (text?.trim() || statement).trim();
    const agency = { ...ctx.agency };
    const icp = { ...ctx.icp };
    const services = [...ctx.services];
    const playbooks = [...ctx.playbooks];
    const pushList = (obj: Record<string, unknown>, key: string, item: string) => {
        const cur = Array.isArray(obj[key]) ? (obj[key] as unknown[]) : [];
        if (!cur.some((x) => typeof x === "string" && x.trim().toLowerCase() === item.toLowerCase())) {
            obj[key] = [...cur, item];
        }
    };
    const appendText = (obj: Record<string, unknown>, key: string, t: string) => {
        const cur = typeof obj[key] === "string" ? (obj[key] as string) : "";
        obj[key] = cur ? `${cur}\n${t}` : t;
    };

    switch (type) {
        case "service": {
            const c = content ?? {};
            services.push({
                nome: typeof c.name === "string" ? c.name : value.slice(0, 80),
                descricao: typeof c.description === "string" ? c.description : value,
                preco_min: typeof c.preco_min === "number" ? c.preco_min : null,
                preco_max: typeof c.preco_max === "number" ? c.preco_max : null,
                modelo_cobranca: typeof c.modelo_cobranca === "string" ? c.modelo_cobranca : null,
                source: "eva_studio_f2",
            });
            break;
        }
        case "icp":
            appendText(icp, "descricao", value);
            break;
        case "tone":
            appendText(agency, "tom_de_voz", value);
            break;
        case "forbidden_promise":
            pushList(agency, "promessas_proibidas", value);
            break;
        case "agency":
            appendText(agency, "observacoes", value);
            break;
        case "playbook":
        case "faq":
        case "objection":
            playbooks.push({ kind: type, title: value.slice(0, 80), content: value, source: "eva_studio_f2" });
            break;
    }
    return { ...ctx, agency, icp, services, playbooks };
}

export function useEvaContextSuggestions() {
    const { companyId, user } = useAuth();
    const qc = useQueryClient();

    const bundle = useQuery({
        queryKey: ["eva-context-suggestions", companyId],
        enabled: !!companyId,
        staleTime: 30_000,
        queryFn: async (): Promise<{ suggestions: ContextSuggestion[]; gaps: ContextGap[] }> => {
            const [sugRes, gapRes, docRes] = await Promise.all([
                supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                    .from("eva_context_suggestions" as any)
                    .select("id, suggestion_type, title, content, confidence, document_id")
                    .eq("company_id", companyId)
                    .eq("status", "pending")
                    .order("confidence", { ascending: false }),
                supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                    .from("eva_knowledge_gaps" as any)
                    .select("id, gap_description, suggested_fix, fix_target, occurrence_count")
                    .eq("company_id", companyId)
                    .eq("status", "open")
                    .order("occurrence_count", { ascending: false }),
                supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                    .from("eva_training_documents" as any)
                    .select("id, file_name")
                    .eq("company_id", companyId),
            ]);

            const docNames = new Map<string, string>(
                // Tabela fora dos types gerados (from(... as any)); select() é tipado como
                // SelectQueryError, então o cast direto falha. Passa por unknown primeiro.
                ((docRes.data ?? []) as unknown as { id: string; file_name: string }[]).map((d) => [d.id, d.file_name]),
            );
            const sourceLabel = (docId: string | null): string =>
                docId && docNames.has(docId)
                    ? `do documento "${docNames.get(docId)}"`
                    : "do texto que você colou";

            const suggestions = ((sugRes.data ?? []) as unknown as SuggestionRow[]).map((r) =>
                mapSuggestion(r, sourceLabel(r.document_id)),
            );
            const gaps = ((gapRes.data ?? []) as unknown as GapRow[]).map(mapGap);
            return { suggestions, gaps };
        },
    });

    // Lê o contexto atual (pra a ponte fazer merge, não overwrite)
    const fetchContext = async (): Promise<BusinessContext> => {
        const { data } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
            .from("eva_business_context" as any)
            .select("id, agency, services, icp, playbooks")
            .eq("company_id", companyId)
            .maybeSingle();
        // Tabela fora dos types gerados; select() é tipado como SelectQueryError.
        const d = (data ?? null) as unknown as Record<string, unknown> | null;
        return {
            id: (d?.id as string) ?? null,
            agency: (d?.agency as Record<string, unknown>) ?? {},
            services: Array.isArray(d?.services) ? (d!.services as unknown[]) : [],
            icp: (d?.icp as Record<string, unknown>) ?? {},
            playbooks: Array.isArray(d?.playbooks) ? (d!.playbooks as unknown[]) : [],
        };
    };

    const saveContext = async (ctx: BusinessContext) => {
        const payload = {
            company_id: companyId,
            agency: ctx.agency,
            services: ctx.services,
            icp: ctx.icp,
            playbooks: ctx.playbooks,
            last_edited_by: user?.id ?? null,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
        const { error } = await supabase.from("eva_business_context" as any).upsert(payload, { onConflict: "company_id" });
        if (error) throw error;
    };

    const setSuggestionStatus = async (id: string, status: "approved" | "rejected") => {
        const patch: Record<string, unknown> = { status };
        if (status === "approved") {
            patch.applied_at = new Date().toISOString();
            patch.applied_by = user?.id ?? null;
        }
        const { error } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
            .from("eva_context_suggestions" as any)
            .update(patch)
            .eq("id", id);
        if (error) throw error;
    };

    // Aprova (uma ou várias) sugestões: status + ponte pro contexto numa só leitura
    const approveSuggestions = async (
        items: { id: string; type: ContextSuggestionType; statement: string; content: Record<string, unknown> | null; text: string | null }[],
    ) => {
        if (!items.length) return;
        let ctx = await fetchContext();
        for (const it of items) {
            ctx = mergeIntoContext(ctx, it.type, it.statement, it.content, it.text);
        }
        await saveContext(ctx);
        for (const it of items) await setSuggestionStatus(it.id, "approved");
    };

    const resolve = useMutation({
        mutationFn: async ({ suggestion, resolution }: { suggestion: ContextSuggestion; resolution: SuggestionResolution }) => {
            if (!companyId) throw new Error("Empresa não identificada");
            if (resolution.action === "dismiss") {
                await setSuggestionStatus(suggestion.id, "rejected");
                return;
            }
            const text = resolution.action === "correct" ? resolution.correctedText : null;
            await approveSuggestions([
                { id: suggestion.id, type: suggestion.type, statement: suggestion.statement, content: null, text },
            ]);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["eva-context-suggestions", companyId] }),
    });

    const confirmBatch = useMutation({
        mutationFn: async (items: ContextSuggestion[]) => {
            if (!companyId) throw new Error("Empresa não identificada");
            await approveSuggestions(
                items.map((s) => ({ id: s.id, type: s.type, statement: s.statement, content: null, text: null })),
            );
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["eva-context-suggestions", companyId] }),
    });

    const defineGap = useMutation({
        mutationFn: async ({ gap, answer }: { gap: ContextGap; answer: string }) => {
            if (!companyId) throw new Error("Empresa não identificada");
            // Busca o slot-alvo da lacuna (fix_target) pra rotear a resposta certo
            const { data: gapRow } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                .from("eva_knowledge_gaps" as any)
                .select("fix_target")
                .eq("id", gap.id)
                .maybeSingle();
            // Tabela fora dos types gerados; select() é tipado como SelectQueryError.
            const fixTarget = (gapRow as unknown as { fix_target: string | null } | null)?.fix_target ?? null;
            // Resposta entra no slot certo do contexto (fix_target) como playbook/nota
            let ctx = await fetchContext();
            const targetType: ContextSuggestionType =
                fixTarget === "services" ? "service"
                : fixTarget === "icp" ? "icp"
                : fixTarget === "agency" ? "agency"
                : "playbook";
            ctx = mergeIntoContext(ctx, targetType, `${gap.question} ${answer}`, null, answer);
            await saveContext(ctx);
            const { error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                .from("eva_knowledge_gaps" as any)
                .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
                .eq("id", gap.id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["eva-context-suggestions", companyId] }),
    });

    const submitText = useMutation({
        mutationFn: async (text: string): Promise<{ documentId: string }> => {
            if (!companyId) throw new Error("Empresa não identificada");
            const { data, error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                .from("eva_training_documents" as any)
                .insert({
                    company_id: companyId,
                    uploaded_by: user?.id ?? null,
                    file_name: `Texto colado ${new Date().toLocaleDateString("pt-BR")}`,
                    file_type: "text/plain",
                    raw_text: text,
                    status: "uploaded",
                })
                .select("id")
                .single();
            if (error) throw error;
            // Tabela fora dos types gerados; select() é tipado como SelectQueryError.
            const documentId = (data as unknown as { id: string }).id;
            const { error: fnErr } = await supabase.functions.invoke("generate-eva-context-suggestions", {
                body: { documentId },
            });
            if (fnErr) throw fnErr;
            return { documentId };
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["eva-context-suggestions", companyId] }),
    });

    return {
        suggestions: bundle.data?.suggestions ?? [],
        gaps: bundle.data?.gaps ?? [],
        loading: bundle.isLoading,
        resolve: (suggestion: ContextSuggestion, resolution: SuggestionResolution) =>
            resolve.mutateAsync({ suggestion, resolution }),
        confirmBatch: (items: ContextSuggestion[]) => confirmBatch.mutateAsync(items),
        defineGap: (gap: ContextGap, answer: string) =>
            defineGap.mutateAsync({ gap, answer }),
        submitText: (text: string) => submitText.mutateAsync(text),
        submitting: submitText.isPending,
    };
}
