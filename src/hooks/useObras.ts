// Obras: o que vem depois da venda. A etapa é manual nesta versão; a venda fechada
// vira obra sozinha pelo trigger deal_ganho_vira_obra. As tabelas ainda não estão
// nos tipos gerados, daí o cast local.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

export const ETAPAS_OBRA = ["documentos", "protocolo", "parecer", "instalacao", "vistoria", "medidor", "ligada"] as const;
export type EtapaObra = (typeof ETAPAS_OBRA)[number];
export type ComQuem = "cliente" | "concessionaria" | "voce" | "instalador";

export const NOME_ETAPA: Record<EtapaObra, string> = {
    documentos: "Documentos",
    protocolo: "Protocolo",
    parecer: "Parecer",
    instalacao: "Instalação",
    vistoria: "Vistoria",
    medidor: "Medidor",
    ligada: "Ligada",
};

export const NOME_COM_QUEM: Record<ComQuem, string> = {
    cliente: "o cliente",
    concessionaria: "a concessionária",
    voce: "você",
    instalador: "o instalador",
};

/** Dias parada na mesma etapa a partir dos quais a obra conta como travada. */
export const DIAS_TRAVADA = 5;

export type DocumentoObra = { id: string; obra_id: string; nome: string; recebido: boolean; ordem: number };

export type Obra = {
    id: string;
    deal_id: string | null;
    cliente: string;
    system_kwp: number | null;
    valor: number | null;
    etapa: EtapaObra;
    com_quem: ComQuem;
    etapa_desde: string;
    nota: string | null;
    documentos: DocumentoObra[];
};

export const diasNaEtapa = (o: Pick<Obra, "etapa_desde">) => Math.max(0, Math.floor((Date.now() - new Date(o.etapa_desde).getTime()) / 86_400_000));
export const travada = (o: Pick<Obra, "etapa" | "etapa_desde">) => o.etapa !== "ligada" && diasNaEtapa(o) >= DIAS_TRAVADA;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useObras() {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const empresa = activeCompanyId || companyId;
    const qc = useQueryClient();
    const queryKey = ["obras", empresa];

    const query = useQuery({
        queryKey,
        enabled: !!empresa,
        staleTime: 30_000,
        queryFn: async (): Promise<Obra[]> => {
            const [obras, docs] = await Promise.all([
                db.from("obras").select("id, deal_id, cliente, system_kwp, valor, etapa, com_quem, etapa_desde, nota").eq("company_id", empresa).order("etapa_desde"),
                db.from("obra_documentos").select("id, obra_id, nome, recebido, ordem").eq("company_id", empresa).order("ordem"),
            ]);
            if (obras.error) throw obras.error;
            if (docs.error) throw docs.error;
            return ((obras.data ?? []) as Omit<Obra, "documentos">[]).map((o) => ({
                ...o,
                documentos: ((docs.data ?? []) as DocumentoObra[]).filter((d) => d.obra_id === o.id),
            }));
        },
    });

    const aoFalhar = () => toast.error("Não consegui salvar. Tente de novo.");
    const atualizar = () => qc.invalidateQueries({ queryKey });

    const alterar = useMutation({
        mutationFn: async ({ id, ...campos }: { id: string; etapa?: EtapaObra; com_quem?: ComQuem; nota?: string | null }) => {
            const patch = campos.etapa ? { ...campos, etapa_desde: new Date().toISOString() } : campos;
            const { error } = await db.from("obras").update(patch).eq("id", id);
            if (error) throw error;
        },
        onError: aoFalhar,
        onSettled: atualizar,
    });

    const marcarDocumento = useMutation({
        mutationFn: async ({ id, recebido }: { id: string; recebido: boolean }) => {
            const { error } = await db.from("obra_documentos").update({ recebido }).eq("id", id);
            if (error) throw error;
        },
        onError: aoFalhar,
        onSettled: atualizar,
    });

    return { query, alterar, marcarDocumento };
}
