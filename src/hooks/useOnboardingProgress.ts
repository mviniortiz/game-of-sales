// useOnboardingProgress — estado de ativação do "Primeiros passos" no /inicio.
// Marcos DERIVADOS dos dados reais (auto-marca sozinho; nunca um checkbox manual
// que mente). Tudo escopado por company_id (RLS). 4 queries leves em paralelo.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export type OnboardingStepKey = "whatsapp" | "eva" | "leads" | "deal";

export interface OnboardingProgress {
    whatsapp: boolean;   // canal de WhatsApp conectado
    eva: boolean;        // contexto da EVA preenchido (serviços/ICP/agência)
    leads: boolean;      // ao menos uma conversa recebida
    deal: boolean;       // ao menos uma oportunidade criada
}

const EMPTY: OnboardingProgress = { whatsapp: false, eva: false, leads: false, deal: false };

const CONNECTED_STATUSES = new Set(["active", "connected"]);

function nonEmpty(v: unknown): boolean {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v as object).length > 0;
    return String(v).trim().length > 0;
}

async function fetchProgress(companyId: string): Promise<OnboardingProgress> {
    const [conn, convs, deals, eva] = await Promise.all([
        supabase.from("channel_connections").select("status").eq("company_id", companyId),
        supabase.from("channel_conversations").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("eva_business_context").select("agency, services, icp").eq("company_id", companyId).maybeSingle(),
    ]);

    const whatsapp = (conn.data ?? []).some((c) => CONNECTED_STATUSES.has((c.status ?? "").toLowerCase()));
    const leads = (convs.count ?? 0) > 0;
    const deal = (deals.count ?? 0) > 0;
    const ev = eva.data as { agency?: unknown; services?: unknown; icp?: unknown } | null;
    const evaDone = !!ev && (nonEmpty(ev.services) || nonEmpty(ev.icp) || nonEmpty(ev.agency));

    return { whatsapp, eva: evaDone, leads, deal };
}

export interface OnboardingState {
    progress: OnboardingProgress;
    /** marcos concluídos (0–4) */
    doneCount: number;
    total: number;
    /** tudo pronto → esconde o checklist */
    allDone: boolean;
    /** primeira etapa pendente (pro nudge da EVA) — null se tudo pronto */
    nextStep: OnboardingStepKey | null;
    loading: boolean;
    refetch: () => void;
}

const ORDER: OnboardingStepKey[] = ["whatsapp", "eva", "leads", "deal"];

export function useOnboardingProgress(): OnboardingState {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    const query = useQuery({
        queryKey: ["onboarding-progress", effectiveCompanyId],
        enabled: !!effectiveCompanyId,
        staleTime: 30_000,
        queryFn: () => fetchProgress(effectiveCompanyId!),
    });

    const progress = query.data ?? EMPTY;
    const doneCount = ORDER.reduce((n, k) => n + (progress[k] ? 1 : 0), 0);
    const nextStep = ORDER.find((k) => !progress[k]) ?? null;

    return {
        progress,
        doneCount,
        total: ORDER.length,
        allDone: doneCount === ORDER.length,
        nextStep,
        loading: query.isLoading,
        refetch: query.refetch,
    };
}
