// Junta as views de uso do app (app_events) numa linha por empresa, para a
// aba Uso do app em Resultados. Plano: docs/analytics/plano-de-tagging-app.md.

export type Ativacao = {
    company_id: string;
    empresa: string | null;
    conta_criada: string;
    whatsapp_conectado: string | null;
    raiox_visto: string | null;
    primeira_conversa: string | null;
    primeiro_aviso_aprovado: string | null;
    voltou_depois_de_7_dias: string | null;
};

export type UsoDia = {
    company_id: string;
    empresa: string | null;
    dia: string;
    pessoas: number;
    sessoes: number;
    telas_vistas: number;
    conversas_abertas: number;
    mensagens_enviadas: number;
    interacoes_lume: number;
    negocios_criados: number;
    telas: string[] | null;
};

export const PASSOS = [
    { id: "whatsapp_conectado", rotulo: "WhatsApp", dica: "Conectou o WhatsApp" },
    { id: "raiox_visto", rotulo: "Raio-X", dica: "Viu o Raio-X" },
    { id: "primeira_conversa", rotulo: "Conversa", dica: "Abriu a primeira conversa no app" },
    { id: "primeiro_aviso_aprovado", rotulo: "Aprovou", dica: "Aprovou o primeiro aviso da Lume" },
    { id: "voltou_depois_de_7_dias", rotulo: "Voltou", dica: "Voltou ao app 7 dias depois de criar a conta" },
] as const;

const NOME_TELA: Record<string, string> = {
    inicio: "Início",
    conversas: "Conversas",
    funil: "Funil",
    negocio: "Negócio",
    orcamentos: "Orçamentos",
    obras: "Obras",
    resultados: "Resultados",
    lume: "Lume",
    lume_config: "Config. da Lume",
    agenda: "Agenda",
    config: "Configurações",
    assinatura: "Assinatura",
    ajuda: "Ajuda",
    raio_x: "Raio-X",
};

export type Linha = {
    id: string;
    nome: string;
    criada: string;
    passos: (string | null)[];
    feitos: number;
    dias: number;
    sessoes: number;
    conversas: number;
    mensagens: number;
    lume: number;
    negocios: number;
    ultimo: string | null;
    telas: string[];
};

/** Junta ativação e uso do período numa linha por empresa. Quem usou vem primeiro. */
export function montarLinhas(ativacao: Ativacao[], uso: UsoDia[]): Linha[] {
    const porEmpresa = new Map<string, UsoDia[]>();
    for (const u of uso) {
        const l = porEmpresa.get(u.company_id) ?? [];
        l.push(u);
        porEmpresa.set(u.company_id, l);
    }
    return ativacao
        .map((a) => {
            const dias = porEmpresa.get(a.company_id) ?? [];
            const soma = (k: keyof UsoDia) => dias.reduce((t, d) => t + (Number(d[k]) || 0), 0);
            const contaTela = new Map<string, number>();
            for (const d of dias) for (const t of d.telas ?? []) contaTela.set(t, (contaTela.get(t) ?? 0) + 1);
            const passos = PASSOS.map((p) => a[p.id]);
            return {
                id: a.company_id,
                nome: a.empresa || "Sem nome",
                criada: a.conta_criada,
                passos,
                feitos: passos.filter(Boolean).length,
                dias: dias.length,
                sessoes: soma("sessoes"),
                conversas: soma("conversas_abertas"),
                mensagens: soma("mensagens_enviadas"),
                lume: soma("interacoes_lume"),
                negocios: soma("negocios_criados"),
                ultimo: dias.reduce<string | null>((m, d) => (!m || d.dia > m ? d.dia : m), null),
                telas: [...contaTela.entries()]
                    .sort((x, y) => y[1] - x[1])
                    .slice(0, 3)
                    .map(([t]) => NOME_TELA[t] ?? t),
            };
        })
        .sort((x, y) => y.dias - x.dias || y.feitos - x.feitos || x.nome.localeCompare(y.nome, "pt-BR"));
}
