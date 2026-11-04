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

/** Dias que a empresa espera em cada etapa (obra_prazos). Passou disso, a obra
 *  conta como travada e o dono recebe aviso no WhatsApp (edge pos-venda-aviso).
 *  O padrão é sugestão, não prazo da concessionária; mesmos números da edge. */
export type EtapaComPrazo = Exclude<EtapaObra, "ligada">;
export type PrazosObra = Partial<Record<EtapaComPrazo, number>>;
export const PRAZO_PADRAO: Record<EtapaComPrazo, number> = {
    documentos: 5, protocolo: 5, parecer: 15, instalacao: 10, vistoria: 7, medidor: 7,
};
export const prazoDa = (etapa: EtapaObra, prazos?: PrazosObra | null): number | null => {
    if (etapa === "ligada") return null;
    const n = Number(prazos?.[etapa]);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : PRAZO_PADRAO[etapa];
};

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
/** Passou do prazo que a empresa espera nesta etapa. */
export const travada = (o: Pick<Obra, "etapa" | "etapa_desde">, prazos?: PrazosObra | null) => {
    const p = prazoDa(o.etapa, prazos);
    return p != null && diasNaEtapa(o) > p;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const docs = (id: string, recebidos: number): DocumentoObra[] =>
    ["RG e CPF", "Conta de luz", "Procuração"].map((nome, i) => ({ id: `${id}-${i}`, obra_id: id, nome, recebido: i < recebidos, ordem: i }));
/** Só em dev, com ?preview na URL: obras de exemplo, sem login. */
const OBRAS_EXEMPLO: Obra[] = [
    { id: "o1", deal_id: null, cliente: "Rogério Mendes", system_kwp: 8.2, valor: 28400, etapa: "parecer", com_quem: "concessionaria", etapa_desde: diasAtras(19), nota: "Aguardando parecer de acesso", documentos: docs("o1", 3) },
    { id: "o2", deal_id: null, cliente: "Padaria Bom Grão", system_kwp: 22.5, valor: 61200, etapa: "vistoria", com_quem: "concessionaria", etapa_desde: diasAtras(9), nota: null, documentos: docs("o2", 3) },
    { id: "o3", deal_id: null, cliente: "Cláudia Ferreira", system_kwp: 5.4, valor: 19900, etapa: "instalacao", com_quem: "instalador", etapa_desde: diasAtras(4), nota: "Equipe marcada para sexta", documentos: docs("o3", 3) },
    { id: "o4", deal_id: null, cliente: "Sítio Três Irmãos", system_kwp: 14.0, valor: 44750, etapa: "documentos", com_quem: "cliente", etapa_desde: diasAtras(6), nota: "Falta a procuração com firma", documentos: docs("o4", 1) },
    { id: "o5", deal_id: null, cliente: "Auto Peças Litoral", system_kwp: 11.3, valor: 37800, etapa: "ligada", com_quem: "voce", etapa_desde: diasAtras(3), nota: null, documentos: docs("o5", 3) },
];
const emPreview = () => import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");

export function useObras() {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const empresa = activeCompanyId || companyId;
    const qc = useQueryClient();
    const queryKey = ["obras", empresa];

    const query = useQuery({
        queryKey,
        enabled: !!empresa || emPreview(),
        staleTime: 30_000,
        queryFn: async (): Promise<Obra[]> => {
            if (emPreview()) return OBRAS_EXEMPLO;
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

    // Prazo é opcional: sem linha ou com erro, vale o padrão.
    const prazos = useQuery({
        queryKey: ["obra-prazos", empresa],
        enabled: !!empresa && !emPreview(),
        staleTime: 5 * 60_000,
        queryFn: async (): Promise<PrazosObra | null> => {
            const { data, error } = await db.from("obra_prazos").select("prazos").eq("company_id", empresa).maybeSingle();
            if (error) {
                console.warn("obras: prazos indisponíveis:", error.message);
                return null;
            }
            return (data?.prazos as PrazosObra | undefined) ?? null;
        },
    });

    const salvarPrazos = useMutation({
        mutationFn: async (novos: PrazosObra) => {
            const { error } = await db.from("obra_prazos").upsert({ company_id: empresa, prazos: novos });
            if (error) throw error;
        },
        onSuccess: (_d, novos) => {
            qc.setQueryData(["obra-prazos", empresa], novos);
            toast.success("Prazos salvos.");
        },
        onError: () => toast.error("Não consegui salvar os prazos. Tente de novo."),
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

    return { query, alterar, marcarDocumento, prazos: prazos.data ?? null, salvarPrazos };
}
