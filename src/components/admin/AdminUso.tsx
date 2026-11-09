// Uso do app (só super admin): o que cada integradora fez. Lê as views de
// app_events (plano em docs/analytics/plano-de-tagging-app.md): ativação, a
// primeira vez de cada passo, e uso por dia no período. Sessão de super admin
// operando a empresa não conta. Se as views ainda não existem no banco, avisa
// em vez de quebrar a aba.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { montarLinhas, PASSOS, type Ativacao, type UsoDia } from "@/lib/usoApp";
import "./admin.css";

const PERIODOS = [
    { id: 7, rotulo: "7 dias" },
    { id: 30, rotulo: "30 dias" },
    { id: 90, rotulo: "90 dias" },
] as const;
type Periodo = (typeof PERIODOS)[number]["id"];

/** View ausente no banco (migration ainda não aplicada). */
function semTabela(err: unknown): boolean {
    const e = err as { code?: string; message?: string } | null;
    return !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find/i.test(e.message ?? ""));
}

const diaCurto = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
/** "hoje", "ontem" ou "há N dias", contando dias do calendário de Brasília. */
function quandoUsou(dia: string): string {
    const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const n = Math.round((Date.parse(hoje) - Date.parse(dia)) / 86_400_000);
    return n <= 0 ? "Usou hoje" : n === 1 ? "Usou ontem" : `Usou há ${n} dias`;
}

export function AdminUso() {
    const { isSuperAdmin } = useTenant();
    const navigate = useNavigate();
    const [periodo, setPeriodo] = useState<Periodo>(7);
    const [soQuemUsou, setSoQuemUsou] = useState(false);

    const desde = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - (periodo - 1));
        return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    }, [periodo]);

    const { data, isLoading, error } = useQuery({
        queryKey: ["admin-uso-app", desde],
        enabled: isSuperAdmin,
        retry: false,
        queryFn: async () => {
            // Views fora dos tipos gerados.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sb = supabase as any;
            const [at, us] = await Promise.all([
                sb.from("vw_app_ativacao").select("*"),
                sb.from("vw_app_uso_empresa_dia").select("*").gte("dia", desde),
            ]);
            if (at.error) throw at.error;
            if (us.error) throw us.error;
            return montarLinhas(at.data as Ativacao[], us.data as UsoDia[]);
        },
    });

    const linhas = useMemo(() => data ?? [], [data]);
    const lista = soQuemUsou ? linhas.filter((l) => l.dias > 0) : linhas;
    const resumo = useMemo(
        () => ({
            usaram: linhas.filter((l) => l.dias > 0).length,
            whatsapp: linhas.filter((l) => l.passos[0]).length,
            aprovaram: linhas.filter((l) => l.passos[3]).length,
            voltaram: linhas.filter((l) => l.passos[4]).length,
        }),
        [linhas],
    );

    if (!isSuperAdmin) return <div className="vp-vazio">Só o time do Vyzon vê o uso do app.</div>;

    if (error) {
        return (
            <div className="va-vazio">
                <b>{semTabela(error) ? "O registro de uso ainda não está no banco" : "Não deu para carregar o uso"}</b>
                {semTabela(error)
                    ? "Os números aparecem aqui depois que a tabela de uso for criada em produção."
                    : (error as Error).message}
            </div>
        );
    }

    // Empresa | 5 passos | Dias | Sessões | Conversas | Lume | Mais usadas
    const colunas = {
        "--va-cols": "minmax(0,1.4fr) repeat(5, 84px) 56px 64px 76px 56px minmax(0,1fr)",
        "--va-cols-cel": "minmax(0,1fr) auto",
    } as React.CSSProperties;

    return (
        <div className="va">
            <div className="va-numeros" data-quatro aria-label="Resumo">
                <div className="va-numero">
                    <span>Usaram em {periodo} dias</span>
                    <b>{isLoading ? "–" : resumo.usaram}</b>
                </div>
                <div className="va-numero">
                    <span>WhatsApp conectado</span>
                    <b>{isLoading ? "–" : resumo.whatsapp}</b>
                </div>
                <div className="va-numero">
                    <span>Aprovaram aviso da Lume</span>
                    <b>{isLoading ? "–" : resumo.aprovaram}</b>
                </div>
                <div className="va-numero">
                    <span>Voltaram depois de 7 dias</span>
                    <b>{isLoading ? "–" : resumo.voltaram}</b>
                </div>
            </div>

            <div className="va-barra">
                <div role="radiogroup" aria-label="Período" className="contents">
                    {PERIODOS.map((p) => (
                        <button key={p.id} type="button" role="radio" aria-checked={periodo === p.id} className="va-filtro" onClick={() => setPeriodo(p.id)}>
                            {p.rotulo}
                        </button>
                    ))}
                </div>
                <button type="button" role="switch" aria-checked={soQuemUsou} className="va-filtro" onClick={() => setSoQuemUsou((v) => !v)}>
                    Só quem usou
                    <em>{resumo.usaram}</em>
                </button>
                <div className="va-barra__fim">
                    <span>
                        {lista.length} {lista.length === 1 ? "empresa" : "empresas"}
                    </span>
                </div>
            </div>

            <section className="va-tabela" aria-label="Uso por empresa" style={colunas}>
                <div className="va-tabela__cab" aria-hidden>
                    <span>Empresa</span>
                    {PASSOS.map((p) => (
                        <span key={p.id} title={p.dica}>{p.rotulo}</span>
                    ))}
                    <span>Dias</span>
                    <span>Sessões</span>
                    <span>Conversas</span>
                    <span>Lume</span>
                    <span>Mais usadas</span>
                </div>
                {isLoading && <div className="va-vazio">Carregando o uso…</div>}
                {!isLoading && lista.length === 0 && (
                    <div className="va-vazio">
                        <b>Ninguém usou no período</b>
                        {soQuemUsou ? "Desligue o filtro para ver todas as empresas." : "Os eventos aparecem aqui quando alguém entrar no app."}
                    </div>
                )}
                {lista.map((l, i) => (
                    <div
                        key={l.id}
                        role="link"
                        tabIndex={0}
                        data-clicavel
                        className="va-linha va-entra-linha"
                        style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
                        onClick={() => navigate(`/admin/companies/${l.id}`)}
                        onKeyDown={(ev) => ev.key === "Enter" && navigate(`/admin/companies/${l.id}`)}
                        aria-label={`Abrir a ficha de ${l.nome}`}
                    >
                        <span className="va-meio">
                            <b>{l.nome}</b>
                            <span>
                                {l.ultimo
                                    ? quandoUsou(l.ultimo)
                                    : `Sem uso em ${periodo} dias`}
                                <span className="md:hidden"> · {l.feitos} de 5 passos</span>
                            </span>
                        </span>
                        {l.passos.map((quando, k) => (
                            <span
                                key={PASSOS[k].id}
                                className="va-celula va-texto va-texto--cinza"
                                data-some-no-cel
                                title={quando ? `${PASSOS[k].dica} em ${new Date(quando).toLocaleString("pt-BR")}` : `${PASSOS[k].dica}: ainda não`}
                            >
                                <span className="va-ponto" data-tom={quando ? "bom" : undefined} aria-hidden />
                                {quando ? diaCurto(quando) : "não"}
                            </span>
                        ))}
                        <span className="va-texto" data-some-no-cel>{l.dias}</span>
                        <span className="va-texto" data-some-no-cel>{l.sessoes}</span>
                        <span className="va-texto" data-some-no-cel>{l.conversas}</span>
                        <span className="va-texto" data-some-no-cel>{l.lume}</span>
                        <span className="va-texto va-texto--cinza" data-some-no-cel title={l.telas.join(", ")}>
                            {l.telas.length ? l.telas.join(", ") : "–"}
                        </span>
                        <span className="va-texto md:hidden">{l.dias ? `${l.dias} ${l.dias === 1 ? "dia" : "dias"}` : "–"}</span>
                    </div>
                ))}
            </section>
        </div>
    );
}
