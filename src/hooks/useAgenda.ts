// Agenda: carga, time de vendedores, sincronia com o Google e as gravações da tela.
// A consulta e o filtro por empresa são os mesmos da versão anterior da página; o que
// mudou é o período: carrega as semanas inteiras do mês, que cobrem a semana, o dia e
// os pontos do calendário pequeno de uma vez.
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, format, setHours, setMinutes, startOfDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { chaveDia, dentro, gradeDoMes, rotuloDoDia, type Agendamento, type StatusAgenda } from "@/lib/agenda";

type Vendedor = { id: string; nome: string };

/** Linha de agendamentos com o perfil junto (o select usa "*", e tipo ainda não está nos tipos gerados). */
type LinhaAgendamento = Agendamento & {
    profiles?: { nome?: string | null; is_super_admin?: boolean | null; company_id?: string | null } | null;
};

const emPreview = () => import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");

// ── Dados de exemplo (só em dev, com ?preview na URL) ─────────────────────────
const VENDEDORES_EXEMPLO: Vendedor[] = [
    { id: "v1", nome: "Carlos Souza" },
    { id: "v2", nome: "Juliana Prado" },
];

let exemploMemoria: Agendamento[] | null = null;
function exemplo(): Agendamento[] {
    if (exemploMemoria) return exemploMemoria;
    const agora = new Date();
    const hoje = startOfDay(agora);
    const em = (dias: number, h: number, m = 0) => setMinutes(setHours(addDays(hoje, dias), h), m).toISOString();
    const hAntes = Math.max(0, agora.getHours() - 2);
    const hDepois = Math.min(22, agora.getHours() + 2);
    const ag = (
        id: string,
        cliente_nome: string,
        data_agendamento: string,
        tipo: Agendamento["tipo"],
        vend: Vendedor,
        status: StatusAgenda = "agendado",
        observacoes = "",
    ): Agendamento => ({ id, cliente_nome, data_agendamento, tipo, status, observacoes, user_id: vend.id, seller_name: vend.nome });
    const [carlos, juliana] = VENDEDORES_EXEMPLO;
    exemploMemoria = [
        ag("a1", "Rogério Mendes", em(0, hAntes, 30), "visita", carlos, "agendado", "Telhado de fibrocimento, levar escada grande"),
        ag("a2", "Padaria Bom Grão", em(0, hDepois), "instalacao", juliana, "agendado", "22,5 kWp, equipe de 3"),
        ag("a3", "Cláudia Ferreira", em(-1, 14), "vistoria", carlos, "realizado"),
        ag("a4", "Sítio Três Irmãos", em(-1, 10), "visita", juliana, "nao_compareceu", "Ninguém no portão, ligar antes"),
        ag("a5", "Auto Peças Litoral", em(1, 9), "visita", carlos),
        ag("a6", "Marina Costa", em(1, 15, 30), "vistoria", juliana),
        ag("a7", "Condomínio Vila Verde", em(2, 8), "instalacao", carlos, "agendado", "Acesso pela garagem"),
        ag("a8", "Fernanda Alves", em(3, 11), null, juliana, "agendado", "Retorno do orçamento"),
        ag("a9", "Eduardo Lima", em(7, 9, 30), "visita", juliana),
        ag("a10", "Rogério Mendes", em(8, 8), "instalacao", carlos),
        ag("a11", "Mercado Dois Irmãos", em(9, 14), "vistoria", juliana),
    ];
    return exemploMemoria;
}

export function useAgenda({ data, vendedor }: { data: Date; vendedor: string }) {
    const { user, isAdmin, isSuperAdmin, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const qc = useQueryClient();
    const preview = emPreview();
    const [googleSynced, setGoogleSynced] = useState(false);
    const [googleConnected, setGoogleConnected] = useState(false);

    const canSeeTeam = preview || isAdmin || isSuperAdmin;
    const showingTeam = canSeeTeam && vendedor === "all";
    const periodo = gradeDoMes(data);
    const queryKey = ["agenda", chaveDia(periodo.inicio), vendedor, user?.id, activeCompanyId, companyId, isAdmin, isSuperAdmin, preview];

    // Vendedores do filtro
    const { data: sellers = [] } = useQuery({
        queryKey: ["sellers-list-cal", isSuperAdmin ? activeCompanyId : companyId, isSuperAdmin, preview],
        queryFn: async (): Promise<Vendedor[]> => {
            if (preview) return VENDEDORES_EXEMPLO;
            let q = supabase.from("profiles").select("id, nome").eq("is_super_admin", false).order("nome");
            if (isSuperAdmin && activeCompanyId) q = q.eq("company_id", activeCompanyId);
            else if (companyId) q = q.eq("company_id", companyId);
            const { data } = await q;
            return (data || []) as Vendedor[];
        },
        enabled: canSeeTeam,
    });

    const query = useQuery({
        queryKey,
        enabled: !!user || preview,
        staleTime: 15_000,
        queryFn: async (): Promise<Agendamento[]> => {
            if (preview) {
                return exemplo()
                    .filter((ag) => dentro(ag, periodo) && (vendedor === "all" || ag.user_id === vendedor))
                    .map((ag) => ({ ...ag }));
            }
            if (!user) return [];

            let q = supabase
                .from("agendamentos")
                .select("*, profiles!agendamentos_user_id_fkey(nome, is_super_admin, company_id)")
                .gte("data_agendamento", periodo.inicio.toISOString())
                .lte("data_agendamento", periodo.fim.toISOString());

            if (isSuperAdmin) {
                if (vendedor !== "all") q = q.eq("user_id", vendedor);
                else if (activeCompanyId) q = q.eq("profiles.company_id", activeCompanyId);
            } else if (isAdmin) {
                if (vendedor !== "all") q = q.eq("user_id", vendedor);
                if (companyId) q = q.eq("profiles.company_id", companyId);
            } else {
                q = q.eq("user_id", user.id);
            }
            q = q.order("data_agendamento");

            const { data, error } = await q;
            if (error) {
                toast.error("Erro ao carregar agendamentos");
                throw error;
            }
            const linhas = (data || []) as unknown as LinhaAgendamento[];
            return linhas
                .filter((ag) => {
                    if (ag.user_id === user.id) return true;
                    if (ag.profiles?.is_super_admin) return false;
                    if (activeCompanyId && ag.profiles?.company_id !== activeCompanyId) return false;
                    if (isAdmin && !isSuperAdmin && companyId && ag.profiles?.company_id !== companyId) return false;
                    return true;
                })
                .map(({ profiles, ...ag }) => ({ ...ag, seller_name: profiles?.nome || "" }));
        },
    });

    const recarregar = useCallback(() => qc.invalidateQueries({ queryKey: ["agenda"] }), [qc]);

    // Sincronia automática com o Google Calendar, uma vez por abertura da tela
    useEffect(() => {
        if (preview) return;
        const syncGoogle = async () => {
            if (!user || googleSynced) return;
            try {
                const { data: profile } = await supabase.from("profiles").select("google_access_token").eq("id", user.id).single();
                if (profile?.google_access_token) {
                    setGoogleConnected(true);
                    const res = await supabase.functions.invoke("google-calendar-sync", { body: { action: "sync_all", userId: user.id } });
                    if (res.data?.inserted > 0) recarregar();
                }
            } catch {
                /* silencioso */
            } finally {
                setGoogleSynced(true);
            }
        };
        syncGoogle();
    }, [user, googleSynced, preview, recarregar]);

    // Muda a linha em todo cache da agenda na hora; o banco vem depois.
    const mudarLocal = useCallback(
        (id: string, patch: Partial<Agendamento>) => {
            qc.setQueriesData<Agendamento[]>({ queryKey: ["agenda"] }, (antes) => antes?.map((a) => (a.id === id ? { ...a, ...patch } : a)));
            if (preview) exemploMemoria = exemplo().map((a) => (a.id === id ? { ...a, ...patch } : a));
        },
        [qc, preview],
    );

    const gravar = useCallback(
        async (id: string, patch: { status?: StatusAgenda; data_agendamento?: string }) => {
            if (preview) return true;
            // "nao_compareceu" existe no banco, mas o enum appointment_status gerado em types.ts está defasado
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase.from("agendamentos").update(patch as any).eq("id", id);
            return !error;
        },
        [preview],
    );

    /** Aconteceu ou não foi: muda na hora, com Desfazer no aviso. */
    const marcar = useCallback(
        (ag: Agendamento, status: StatusAgenda) => {
            const antes = ag.status;
            mudarLocal(ag.id, { status });
            const desfazer = () => {
                mudarLocal(ag.id, { status: antes });
                gravar(ag.id, { status: antes as StatusAgenda }).then((ok) => {
                    if (!ok) {
                        toast.error("Não consegui desfazer. Tente de novo.");
                        recarregar();
                    }
                });
            };
            toast.success(`${ag.cliente_nome}: ${status === "realizado" ? "aconteceu" : "não foi"}.`, {
                action: { label: "Desfazer", onClick: desfazer },
            });
            gravar(ag.id, { status }).then((ok) => {
                if (!ok) {
                    mudarLocal(ag.id, { status: antes });
                    toast.error("Não consegui salvar. Tente de novo.");
                }
            });
        },
        [mudarLocal, gravar, recarregar],
    );

    /** Arrastar no mês: mesmo horário, outro dia. */
    const remarcar = useCallback(
        (ag: Agendamento, novaData: Date) => {
            const antes = ag.data_agendamento;
            const depois = novaData.toISOString();
            if (antes === depois) return;
            mudarLocal(ag.id, { data_agendamento: depois });
            gravar(ag.id, { data_agendamento: depois }).then((ok) => {
                if (!ok) {
                    mudarLocal(ag.id, { data_agendamento: antes });
                    toast.error("Erro ao atualizar agendamento");
                    return;
                }
                toast.success(`${ag.cliente_nome}: remarcado para ${rotuloDoDia(novaData)}, ${format(novaData, "HH:mm")}.`);
                if (!preview) recarregar();
            });
        },
        [mudarLocal, gravar, recarregar, preview],
    );

    return {
        agendamentos: query.data ?? [],
        carregando: query.isLoading,
        erro: query.isError,
        sellers,
        canSeeTeam,
        showingTeam,
        googleConnected,
        setGoogleConnected,
        recarregar,
        marcar,
        remarcar,
    };
}
