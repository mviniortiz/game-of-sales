// ─────────────────────────────────────────────────────────────────────────────
// F4E.3 (2026-05-19) — Configurações > EVA (tabs: Contexto / Serviços / ICP)
//
// Wrapper que carrega eva_business_context (singleton por company_id) e
// distribui pra cada tab. Cada tab tem seu próprio botão de salvar e dispara
// upsert PARCIAL — só envia a chave que ela edita.
//
// Pq parcial e não envio agregado: cada aba tem ciclo de edição independente,
// não queremos perder edição da Contexto quando alguém salva Serviços. O
// trigger trg_eva_business_context_touch incrementa version só se algum dos
// 4 JSONBs mudar, então salvar "agency" sem mudar nada não polui version.
//
// IMPORTANTE: tipos do Supabase ainda não foram regenerados pra F4E.1.
// Por isso o `.from("eva_business_context") as any` nas chamadas. Quando
// rodarmos `supabase gen types`, esses casts somem.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import { formatError } from "@/lib/utils";
import {
  AgencyContext,
  emptyAgencyContext,
  parseAgencyContext,
} from "@/lib/eva/agencyContextSchema";
import { Service, parseServices } from "@/lib/eva/serviceSchema";
import { Icp, emptyIcp, parseIcp } from "@/lib/eva/icpSchema";

import { EvaContextTab } from "@/components/configuracoes/eva/EvaContextTab";
import { EvaServicesTab } from "@/components/configuracoes/eva/EvaServicesTab";
import { EvaIcpTab } from "@/components/configuracoes/eva/EvaIcpTab";
import { EvaKnowledgeBaseTab } from "@/components/configuracoes/eva/EvaKnowledgeBaseTab";

type Tab = "contexto" | "servicos" | "icp" | "conhecimento";
const VALID_TABS: Tab[] = ["contexto", "servicos", "icp", "conhecimento"];

export default function EvaContexto() {
  const { isAdmin, companyId, user } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab: Tab = (VALID_TABS as string[]).includes(rawTab ?? "")
    ? (rawTab as Tab)
    : "contexto";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<AgencyContext>(emptyAgencyContext());
  const [services, setServices] = useState<Service[]>([]);
  const [icp, setIcp] = useState<Icp>(emptyIcp());
  const [version, setVersion] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveCompanyId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCompanyId]);

  const handleTabChange = (next: string) => {
    if (!(VALID_TABS as string[]).includes(next)) return;
    setTab(next as Tab);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  const load = async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("eva_business_context")
        .select("agency, services, icp, version, updated_at")
        .eq("company_id", effectiveCompanyId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setAgency(parseAgencyContext(data.agency));
        setServices(parseServices(data.services));
        setIcp(parseIcp(data.icp));
        setVersion(typeof data.version === "number" ? data.version : null);
        setUpdatedAt(data.updated_at ?? null);
      } else {
        setAgency(emptyAgencyContext());
        setServices([]);
        setIcp(emptyIcp());
        setVersion(null);
        setUpdatedAt(null);
      }
    } catch (err) {
      // F4E.2.1: trata permission denied com mensagem amigável; log técnico fica
      // só no console pra debug
      console.error("[EvaContexto] failed to load eva_business_context:", err);
      const raw = err as { message?: string; code?: string };
      const msg = (raw?.message || "").toLowerCase();
      const code = raw?.code || "";
      const isPermission =
        msg.includes("permission denied") ||
        msg.includes("row-level security") ||
        msg.includes("rls") ||
        code === "42501" ||
        code === "PGRST301";
      if (isPermission) {
        toast.error(
          "Não foi possível carregar o contexto da EVA. Verifique se sua conta tem acesso à empresa.",
        );
      } else {
        toast.error(`Erro ao carregar contexto: ${formatError(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Upsert parcial. Envia só a chave editada (agency | services | icp)
  // junto com company_id. UNIQUE em company_id resolve o conflito; trigger
  // incrementa version apenas se o JSONB mudou de verdade.
  const upsertPartial = async (
    patch: { agency?: AgencyContext; services?: Service[]; icp?: Icp },
    successLabel: string,
  ) => {
    if (!effectiveCompanyId) {
      toast.error("Sem empresa selecionada.");
      throw new Error("no_company");
    }
    if (!isAdmin) {
      toast.error("Apenas admins podem editar o contexto da EVA.");
      throw new Error("not_admin");
    }
    try {
      const payload: Record<string, unknown> = {
        company_id: effectiveCompanyId,
        last_edited_by: user?.id ?? null,
        ...patch,
      };
      const { data, error } = await (supabase as any)
        .from("eva_business_context")
        .upsert(payload, { onConflict: "company_id" })
        .select("agency, services, icp, version, updated_at")
        .single();
      if (error) throw error;

      if (data) {
        if (patch.agency !== undefined) setAgency(parseAgencyContext(data.agency));
        if (patch.services !== undefined) setServices(parseServices(data.services));
        if (patch.icp !== undefined) setIcp(parseIcp(data.icp));
        setVersion(typeof data.version === "number" ? data.version : null);
        setUpdatedAt(data.updated_at ?? null);
      }
      toast.success(successLabel);
    } catch (err) {
      toast.error(`Erro ao salvar: ${formatError(err)}`);
      throw err;
    }
  };

  const updatedAtLabel = useMemo(() => {
    if (!updatedAt) return null;
    try {
      const d = new Date(updatedAt);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [updatedAt]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const readOnly = !isAdmin;

  return (
    // F4E.2.3: limita o wrapper inteiro a 1280px pra alinhar header com body
    // e impedir o "vão" em ultrawide entre main e sidebar do tab Contexto.
    <div className="space-y-5 max-w-[1280px]">
      {/* Header premium F4E.2.2: bloco hero com gradient azul/lilás sutil,
          inspirado na Central da Operação. Mais presença vertical, título
          maior e topline de cor pra ancorar. */}
      <div
        className="rounded-2xl px-6 sm:px-8 py-6 sm:py-8 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(124,58,237,0.05) 100%), #FFFFFF",
          border: "1px solid rgba(148,163,184,0.26)",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
        }}
      >
        {/* Topline degradê azul→lilás */}
        <div
          className="absolute top-0 inset-x-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(37,99,235,0.40) 30%, rgba(124,58,237,0.35) 70%, transparent)",
          }}
          aria-hidden
        />
        {/* Glow lilás sutil no canto direito */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none opacity-40 hidden sm:block"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex items-start gap-5">
          <EvaPhotoAvatar size="lg" ring="glow" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[24px] sm:text-[28px] font-bold text-foreground leading-tight tracking-tight">
                Contexto da EVA
              </h2>
              <Badge
                variant="outline"
                className="h-5 px-2 text-[10px] font-semibold border-[#2563EB]/25 text-[#1D4FD8] bg-[#2563EB]/5"
              >
                IA Comercial
              </Badge>
              <Badge
                variant="outline"
                className="h-5 px-2 text-[10px] font-medium border-[#7C3AED]/30 text-[#7C3AED] bg-[#7C3AED]/5"
              >
                Preview
              </Badge>
            </div>
            <p className="text-[14.5px] text-muted-foreground mt-2 leading-relaxed max-w-[640px]">
              Ensine a EVA como sua agência vende. Esse contexto será usado
              para analisar conversas, qualificar leads e sugerir próximos
              passos.
            </p>
            <p className="text-[12.5px] text-muted-foreground/85 mt-2 leading-relaxed">
              A EVA continua{" "}
              <span className="font-medium text-foreground">assistida</span>:
              ela sugere, e seu time aprova antes de qualquer ação.
            </p>
            {(version !== null || updatedAtLabel) && (
              <div className="flex items-center gap-3 mt-3.5 text-[11.5px] text-muted-foreground">
                {version !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-white border border-[#D9E2EC] text-foreground font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      v{version}
                    </span>
                  </span>
                )}
                {updatedAtLabel && (
                  <>
                    {version !== null && (
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    )}
                    <span>Última edição em {updatedAtLabel}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="contexto" className="text-sm">
            Contexto
          </TabsTrigger>
          <TabsTrigger value="servicos" className="text-sm">
            Serviços
            {services.length > 0 && (
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                ({services.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="icp" className="text-sm">
            ICP
          </TabsTrigger>
          <TabsTrigger value="conhecimento" className="text-sm">
            Base de Conhecimento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contexto" className="mt-0">
          <EvaContextTab
            value={agency}
            readOnly={readOnly}
            version={version}
            updatedAtLabel={updatedAtLabel}
            onSave={async (next) => {
              await upsertPartial({ agency: next }, "Contexto da agência salvo");
            }}
          />
        </TabsContent>

        <TabsContent value="servicos" className="mt-0">
          <EvaServicesTab
            value={services}
            readOnly={readOnly}
            onSave={async (next) => {
              await upsertPartial({ services: next }, "Serviços salvos");
            }}
          />
        </TabsContent>

        <TabsContent value="icp" className="mt-0">
          <EvaIcpTab
            value={icp}
            readOnly={readOnly}
            onSave={async (next) => {
              await upsertPartial({ icp: next }, "ICP salvo");
            }}
          />
        </TabsContent>

        <TabsContent value="conhecimento" className="mt-0">
          {effectiveCompanyId ? (
            <EvaKnowledgeBaseTab
              companyId={effectiveCompanyId}
              isAdmin={isAdmin}
              userId={user?.id}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
