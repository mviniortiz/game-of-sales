// EVA.STUDIO.3/.4/.5 — useEvaBlueprint
// Carrega o blueprint salvo (singleton por company). Sem salvo, deriva do
// CONTEXTO REAL (eva_business_context, tags, stages, eva_knowledge_gaps); sem
// contexto → fallback demo. Salva via upsert. Aplica blocos low-risk (tags/
// lacunas/regras) de forma granular, sem duplicar, sem service_role e sem tocar
// em deals/contatos/conversas. RLS por company preservada.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeTagName, slugifyTag } from "@/lib/tags";
import {
    type Blueprint,
    type BlueprintOrigin,
    buildSuggestion,
    type EvaContextRow,
} from "@/lib/eva/blueprint";
import { AGENCY_PACK } from "@/lib/agents/qualifier/agencyPack";

export type { Blueprint, BlueprintStatus, BlueprintOrigin } from "@/lib/eva/blueprint";

const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

function rowToBlueprint(r: any): Blueprint {
    const ap = r.applied_sections;
    return {
        agent: r.agent_name ?? "",
        segment: r.segment ?? "",
        goal: r.objective ?? "",
        pipeline: asArr(r.pipeline_stages),
        fields: asArr(r.detected_fields),
        tags: asArr(r.suggested_tags),
        rules: asArr(r.suggested_rules),
        gaps: asArr(r.knowledge_gaps),
        scenarios: Array.isArray(r.simulation_scenarios) ? r.simulation_scenarios : [],
        status: (r.status ?? "draft") as Blueprint["status"],
        applied: ap && typeof ap === "object" && ("tags_applied" in ap || "rules_applied" in ap)
            ? { tags_applied: ap.tags_applied ?? 0, gaps_applied: ap.gaps_applied ?? 0, rules_applied: ap.rules_applied ?? 0 }
            : null,
    };
}

const STAGE_LABEL: Record<string, string> = { lead: "Novo lead", qualification: "Qualificação", proposal: "Proposta", negotiation: "Negociação", closed_won: "Fechado" };
const STAGE_ORDER = ["lead", "qualification", "proposal", "negotiation", "closed_won"];
function stagesToLabels(rows: { stage?: string }[] | null | undefined): string[] {
    const set = new Set((rows ?? []).map((r) => r.stage).filter(Boolean) as string[]);
    return STAGE_ORDER.filter((s) => set.has(s)).map((s) => STAGE_LABEL[s]);
}

function playbooksToRuleStrings(playbooks: unknown): string[] {
    if (!Array.isArray(playbooks)) return [];
    return playbooks
        .map((p: any) => (typeof p?.title === "string" && p.title) || (typeof p?.content === "string" && p.content) || "")
        .filter((s): s is string => !!s);
}

export interface ApplySelections { rules: boolean; gaps: boolean; tags: boolean }
export interface ApplyResult { tagsCreated: number; gapsCreated: number; rulesApplied: number; rulesNote: string }

export interface BlueprintMeta {
    createdAt: string | null;
    updatedAt: string | null;
    appliedAt: string | null;
    appliedByName: string | null;
}

interface Bundle {
    saved: Blueprint | null;
    suggestion: { bp: Blueprint; origin: "context" | "demo" | "seeded" };
    existing: { tags: string[]; gaps: string[]; rules: string[] };
    meta: BlueprintMeta | null;
}

export function useEvaBlueprint() {
    const { companyId, user } = useAuth();
    const qc = useQueryClient();

    const query = useQuery({
        queryKey: ["eva-blueprint-bundle", companyId],
        enabled: !!companyId,
        staleTime: 30_000,
        queryFn: async (): Promise<Bundle> => {
            const [savedRes, ctxRes, tagsRes, gapsRes, stagesRes] = await Promise.all([
                supabase.from("eva_blueprints" as any).select("*").eq("company_id", companyId).maybeSingle(),
                supabase.from("eva_business_context" as any).select("agency, services, icp, playbooks").eq("company_id", companyId).maybeSingle(),
                supabase.from("tags" as any).select("name").eq("company_id", companyId).limit(60),
                supabase.from("eva_knowledge_gaps" as any).select("gap_description").eq("company_id", companyId).eq("status", "open").limit(20),
                supabase.from("deals" as any).select("stage").eq("company_id", companyId).limit(300),
            ]);

            const saved = savedRes.data ? rowToBlueprint(savedRes.data) : null;
            const context = (ctxRes.data ?? null) as EvaContextRow | null;
            const companyTags = ((tagsRes.data ?? []) as { name?: string }[]).map((t) => t.name).filter((x): x is string => !!x);
            const openGaps = ((gapsRes.data ?? []) as { gap_description?: string }[]).map((g) => g.gap_description).filter((x): x is string => !!x);
            const dealStages = stagesToLabels(stagesRes.data as { stage?: string }[] | null);
            const existingRules = playbooksToRuleStrings(context?.playbooks);

            let meta: BlueprintMeta | null = null;
            if (savedRes.data) {
                const r: any = savedRes.data;
                let appliedByName: string | null = null;
                if (r.applied_by) {
                    const { data: prof } = await supabase.from("profiles" as any).select("nome").eq("id", r.applied_by).maybeSingle();
                    appliedByName = (prof as any)?.nome ?? null;
                }
                meta = { createdAt: r.created_at ?? null, updatedAt: r.updated_at ?? null, appliedAt: r.applied_at ?? null, appliedByName };
            }

            const suggestion = buildSuggestion({ context, companyTags, dealStages, openGaps });
            return { saved, suggestion, existing: { tags: companyTags, gaps: openGaps, rules: existingRules }, meta };
        },
    });

    const saved = query.data?.saved ?? null;
    const suggestion = query.data?.suggestion ?? { bp: { ...AGENCY_PACK }, origin: "seeded" as const };
    const existing = query.data?.existing ?? { tags: [], gaps: [], rules: [] };
    const ready = !query.isLoading && query.isSuccess;
    const origin: BlueprintOrigin = saved ? "saved" : suggestion.origin;

    const invalidate = () => qc.invalidateQueries({ queryKey: ["eva-blueprint-bundle", companyId] });

    const save = useMutation({
        mutationFn: async (bp: Blueprint) => {
            if (!companyId) throw new Error("Empresa não identificada");
            const payload = {
                company_id: companyId,
                status: bp.status,
                agent_name: bp.agent || null,
                segment: bp.segment || null,
                objective: bp.goal || null,
                pipeline_stages: bp.pipeline,
                detected_fields: bp.fields,
                suggested_tags: bp.tags,
                suggested_rules: bp.rules,
                knowledge_gaps: bp.gaps,
                simulation_scenarios: bp.scenarios,
                created_by: user?.id ?? null,
            };
            const { error } = await supabase.from("eva_blueprints" as any).upsert(payload, { onConflict: "company_id" });
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    const apply = useMutation({
        mutationFn: async ({ bp, sections }: { bp: Blueprint; sections: ApplySelections }): Promise<ApplyResult> => {
            if (!companyId) throw new Error("Empresa não identificada");
            const result: ApplyResult = { tagsCreated: 0, gapsCreated: 0, rulesApplied: 0, rulesNote: "" };

            // ── Tags: cria só as que não existem (dedup por slug). NÃO aplica em deals. ──
            if (sections.tags) {
                const { data: existingTags } = await supabase.from("tags" as any).select("slug").eq("company_id", companyId);
                const seen = new Set(((existingTags ?? []) as { slug?: string }[]).map((t) => t.slug).filter(Boolean) as string[]);
                const toCreate: any[] = [];
                for (const raw of bp.tags) {
                    const name = normalizeTagName(raw);
                    if (!name) continue;
                    const slug = slugifyTag(name);
                    if (!slug || seen.has(slug)) continue;
                    seen.add(slug);
                    toCreate.push({ company_id: companyId, name, slug, color: null, created_by: user?.id ?? null });
                }
                if (toCreate.length) {
                    const { error } = await supabase.from("tags" as any).insert(toCreate);
                    if (error) throw error;
                    result.tagsCreated = toCreate.length;
                }
            }

            // ── Lacunas: insere novas (status open), dedup por descrição normalizada. ──
            if (sections.gaps) {
                const { data: existingGaps } = await supabase.from("eva_knowledge_gaps" as any).select("gap_description").eq("company_id", companyId);
                const seen = new Set(((existingGaps ?? []) as { gap_description?: string }[]).map((g) => norm(g.gap_description)));
                const toCreate: any[] = [];
                for (const raw of bp.gaps) {
                    const t = (raw ?? "").trim();
                    if (!t) continue;
                    const key = norm(t);
                    if (seen.has(key)) continue;
                    seen.add(key);
                    toCreate.push({ company_id: companyId, source_type: "manual", gap_description: t, status: "open", fix_target: "other" });
                }
                if (toCreate.length) {
                    const { error } = await supabase.from("eva_knowledge_gaps" as any).insert(toCreate);
                    if (error) throw error;
                    result.gapsCreated = toCreate.length;
                }
            }

            // ── Regras: append seguro em eva_business_context.playbooks (merge, sem sobrescrever). ──
            if (sections.rules) {
                const { data: ctxRow, error: ctxErr } = await supabase.from("eva_business_context" as any)
                    .select("id, playbooks").eq("company_id", companyId).maybeSingle();
                if (ctxErr) {
                    result.rulesNote = "Contexto da EVA indisponível; regras não aplicadas.";
                } else {
                    const playbooks = Array.isArray(ctxRow?.playbooks) ? ctxRow.playbooks : [];
                    const seen = new Set(playbooks.map((p: any) => norm(p?.title) || norm(p?.content)));
                    const newPbs: any[] = [];
                    for (const raw of bp.rules) {
                        const t = (raw ?? "").trim();
                        if (!t) continue;
                        const key = norm(t);
                        if (seen.has(key)) continue;
                        seen.add(key);
                        newPbs.push({ kind: "playbook", title: t.slice(0, 80), content: t, source: "eva_studio" });
                    }
                    if (newPbs.length) {
                        if (ctxRow?.id) {
                            const { error } = await supabase.from("eva_business_context" as any).update({ playbooks: [...playbooks, ...newPbs] }).eq("id", ctxRow.id);
                            if (error) result.rulesNote = "Não foi possível atualizar as regras com segurança.";
                            else result.rulesApplied = newPbs.length;
                        } else {
                            const { error } = await supabase.from("eva_business_context" as any).insert({ company_id: companyId, playbooks: newPbs });
                            if (error) result.rulesNote = "Sem estrutura segura para regras; preview não aplicado.";
                            else result.rulesApplied = newPbs.length;
                        }
                    }
                }
            }

            // ── Registra aplicação parcial no blueprint (não altera operação). ──
            const { error: bpErr } = await supabase.from("eva_blueprints" as any).upsert({
                company_id: companyId,
                status: "partially_applied",
                agent_name: bp.agent || null,
                segment: bp.segment || null,
                objective: bp.goal || null,
                pipeline_stages: bp.pipeline,
                detected_fields: bp.fields,
                suggested_tags: bp.tags,
                suggested_rules: bp.rules,
                knowledge_gaps: bp.gaps,
                simulation_scenarios: bp.scenarios,
                applied_sections: { tags_applied: result.tagsCreated, gaps_applied: result.gapsCreated, rules_applied: result.rulesApplied },
                applied_at: new Date().toISOString(),
                applied_by: user?.id ?? null,
                created_by: user?.id ?? null,
            }, { onConflict: "company_id" });
            if (bpErr) throw bpErr;

            return result;
        },
        onSuccess: invalidate,
    });

    const approveAssisted = useMutation({
        mutationFn: async (bp: Blueprint) => {
            if (!companyId) throw new Error("Empresa não identificada");
            const { error } = await supabase.from("eva_blueprints" as any).upsert({
                company_id: companyId,
                status: "approved_assisted",
                agent_name: bp.agent || null,
                segment: bp.segment || null,
                objective: bp.goal || null,
                pipeline_stages: bp.pipeline,
                detected_fields: bp.fields,
                suggested_tags: bp.tags,
                suggested_rules: bp.rules,
                knowledge_gaps: bp.gaps,
                simulation_scenarios: bp.scenarios,
                approved_at: new Date().toISOString(),
                approved_by: user?.id ?? null,
                created_by: user?.id ?? null,
            }, { onConflict: "company_id" });
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    return {
        ready,
        loading: query.isLoading,
        saving: save.isPending,
        applying: apply.isPending,
        approving: approveAssisted.isPending,
        approveAssisted: (bp: Blueprint) => approveAssisted.mutateAsync(bp),
        initial: saved ?? suggestion.bp,
        origin,
        suggestion,
        existing,
        meta: query.data?.meta ?? null,
        save: (bp: Blueprint) => save.mutateAsync(bp),
        apply: (bp: Blueprint, sections: ApplySelections) => apply.mutateAsync({ bp, sections }),
    };
}
