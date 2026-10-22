// DIST.0 — fila interna do time de distribuição. O que importa aqui: o texto
// que chega ao Markus segue a regra de copy, o código D nunca confunde com os
// fluxos da EVA e da prospecção, e aprovar não publica nada.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    parseComandoDistribuicao,
    problemasDeCopy,
    proximoCodigo,
    textoDoAviso,
    validarRascunho,
    DIST_PREFIX,
} from "../../supabase/functions/_shared/distribuicao";
import { avisarPendentes, tratarComandoDistribuicao } from "../../supabase/functions/_shared/distribuicaoAprovacao";
import { parseOwnerCommand } from "../../supabase/functions/_shared/whatsappApproval";

type Validacao = ReturnType<typeof validarRascunho>;
const errosDe = (v: Validacao): string[] => ("erros" in v ? v.erros : []);

const BASE = {
    agente: "conteudo",
    canal: "instagram",
    titulo: "Carrossel: a proposta que ficou no vou ver",
    message_text: "Mandou a proposta na sexta e ele visualizou na segunda sem responder? Veja o que mandar hoje.",
};

describe("validarRascunho", () => {
    it("aceita o rascunho mínimo e põe manual como padrão", () => {
        const v = validarRascunho(BASE);
        expect(v.ok).toBe(true);
        const r = "rascunho" in v ? v.rascunho : null;
        expect(r?.acao_apos_aprovar).toBe("manual");
        expect(r?.texto).toBe(BASE.message_text);
    });

    it("recusa travessão, emoji e frase proibida", () => {
        const v = validarRascunho({ ...BASE, message_text: "Automatize suas vendas — agora mesmo 🚀 com a EVA" });
        expect(v.ok).toBe(false);
        const erros = errosDe(v).join(" | ");
        expect(erros).toContain("travessão");
        expect(erros).toContain("emoji");
        expect(erros).toContain("automatize suas vendas");
        expect(problemasDeCopy("Robô que vende sozinho")).toContain('frase proibida: "robo que vende sozinho"');
        expect(problemasDeCopy("A EVA sugere, seu time aprova.")).toEqual([]);
    });

    it("recusa agente, canal e anexo fora do contrato", () => {
        const v = validarRascunho({ ...BASE, agente: "vendedor", canal: "tiktok", anexo_url: "http://x.com/a.png" });
        expect(v.ok).toBe(false);
        expect(errosDe(v)).toHaveLength(3);
    });

    it("executor só no canal certo e sempre com alvo", () => {
        expect(validarRascunho({ ...BASE, acao_apos_aprovar: "merge_pr", alvo: { pr: 1 } }).ok).toBe(false);
        expect(validarRascunho({ ...BASE, canal: "google_ads", acao_apos_aprovar: "ads_apply" }).ok).toBe(false);
        expect(validarRascunho({ ...BASE, canal: "google_ads", acao_apos_aprovar: "ads_apply", alvo: { campanha: "x" } }).ok).toBe(true);
    });
});

describe("código e comando", () => {
    it("gera D + letra + dígito, pulando o que está em uso", () => {
        expect(proximoCodigo([])).toBe("DA2");
        expect(proximoCodigo(["DA2", "da3"])).toBe("DA4");
    });

    it("lê aprovar, descartar e corrigir só com código D", () => {
        expect(parseComandoDistribuicao("DK4 1")).toEqual({ codigo: "DK4", intent: "aprovar" });
        expect(parseComandoDistribuicao("[dk4] não")).toEqual({ codigo: "DK4", intent: "descartar" });
        expect(parseComandoDistribuicao("DK4: Troca o título por outro melhor")).toEqual({
            codigo: "DK4", intent: "corrigir", texto: "Troca o título por outro melhor",
        });
        expect(parseComandoDistribuicao("DK4")).toEqual({ codigo: "DK4", intent: "ajuda" });
    });

    it("não pega comando da EVA, da prospecção nem conversa solta", () => {
        expect(parseComandoDistribuicao("A2 1")).toBeNull();
        expect(parseComandoDistribuicao("PK4 1")).toBeNull();
        expect(parseComandoDistribuicao("1")).toBeNull();
        expect(parseComandoDistribuicao("DI4 1")).toBeNull();
        expect(parseComandoDistribuicao("Depois eu vejo isso")).toBeNull();
        // E o parser da EVA não lê "DK4 1" como código dela.
        expect(parseOwnerCommand("DK4 1").code).toBeNull();
    });

    it("o aviso começa com o prefixo que o webhook descarta e não tem travessão", () => {
        const t = textoDoAviso({
            codigo: "DK4", canal: "instagram", titulo: "Carrossel", porQue: "variante encaminha respondeu mais",
            texto: "Texto do post", anexoUrl: "https://x.com/a.png",
        });
        expect(t.startsWith(`${DIST_PREFIX} [DK4] Instagram`)).toBe(true);
        expect(t).toContain("Aprovar não publica nada.");
        expect(t).toContain("Ver: https://x.com/a.png");
        expect(problemasDeCopy(t)).toEqual([]);
    });
});

// ── Banco em memória ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;
function bancoFalso(tabelas: Record<string, Linha[]>) {
    const from = (nome: string) => {
        const filtros: Array<(r: Linha) => boolean> = [];
        let patch: Linha | null = null;
        let contar = false;
        let limite = Infinity;
        const linhas = () => (tabelas[nome] ||= []).filter((r) => filtros.every((f) => f(r))).slice(0, limite);
        const fim = () => {
            const rs = linhas();
            if (patch) rs.forEach((r) => Object.assign(r, patch));
            return rs;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = {
            select: (_c?: string, o?: { count?: string }) => ((contar = !!o?.count), q),
            update: (p: Linha) => ((patch = p), q),
            eq: (c: string, v: unknown) => (filtros.push((r) => r[c] === v), q),
            in: (c: string, vs: unknown[]) => (filtros.push((r) => vs.includes(r[c])), q),
            is: (c: string, v: unknown) => (filtros.push((r) => (r[c] ?? null) === v), q),
            not: (c: string, _op: string, v: unknown) => (filtros.push((r) => (r[c] ?? null) !== v), q),
            gte: (c: string, v: string) => (filtros.push((r) => r[c] != null && r[c] >= v), q),
            lt: (c: string, v: string | number) => (filtros.push((r) => r[c] != null && r[c] < v), q),
            order: () => q,
            limit: (n: number) => ((limite = n), q),
            maybeSingle: async () => ({ data: fim()[0] ?? null }),
            then: (ok: (v: unknown) => void) => {
                const rs = fim();
                return ok(contar ? { count: rs.length, data: null } : { data: rs });
            },
        };
        return q;
    };
    return { from };
}

const DONO = "11111111-2222-3333-4444-555555555555";
const INSTANCIA = "wa_11111111222233334444555555555555";
const enviados: Array<{ number: string; text: string }> = [];

beforeEach(() => {
    enviados.length = 0;
    vi.stubGlobal("Deno", {
        env: { get: (k: string) => ({ EVOLUTION_API_URL: "https://wa.teste", EVOLUTION_API_KEY: "k" } as Record<string, string>)[k] },
    });
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
        const corpo = JSON.parse(String(init?.body || "{}"));
        enviados.push({ number: corpo.number, text: corpo.text });
        return new Response(JSON.stringify({ key: { id: `msg${enviados.length}` } }), { status: 200 });
    }));
});
afterEach(() => vi.unstubAllGlobals());

function rascunho(id: string, extra: Linha = {}): Linha {
    return {
        id, canal: "instagram", titulo: `Post ${id}`, texto: `Texto do post ${id}`, por_que_agora: null,
        anexo_url: null, acao_apos_aprovar: "manual", status: "pendente", codigo: null, notificado_em: null,
        tentativas: 0, created_at: new Date().toISOString(), ...extra,
    };
}

function conexao(): Linha[] {
    return [{ provider: "evolution", external_id: INSTANCIA, status: "active", metadata: { owner_jid: "5548999990000" } }];
}

describe("avisarPendentes", () => {
    it("avisa o Markus com código D, respeita o teto e expira o velho", async () => {
        const velho = rascunho("v", { created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString() });
        const fila = [rascunho("a"), rascunho("b"), rascunho("c")];
        const admin = bancoFalso({ distribuicao_rascunhos: [velho, ...fila], channel_connections: conexao() });

        const r = await avisarPendentes(admin, { donoUserId: DONO, tetoDia: 2 });

        expect(r.expirados).toBe(1);
        expect(velho.status).toBe("expirado");
        expect(r.avisados).toBe(2);
        expect(fila.map((f) => f.codigo)).toEqual(["DA2", "DA3", null]);
        expect(r.pulados).toEqual([{ id: "c", motivo: "teto diario de avisos atingido" }]);
        expect(enviados).toHaveLength(2);
        expect(enviados.every((e) => e.number === "5548999990000")).toBe(true);
        expect(enviados[0].text.startsWith(`${DIST_PREFIX} [DA2]`)).toBe(true);
    });

    it("número desconectado não gasta tentativa nem manda nada", async () => {
        const admin = bancoFalso({
            distribuicao_rascunhos: [rascunho("a")],
            channel_connections: [{ ...conexao()[0], status: "disconnected" }],
        });
        const r = await avisarPendentes(admin, { donoUserId: DONO, tetoDia: 3 });
        expect(r.avisados).toBe(0);
        expect(r.pulados[0].motivo).toBe("whatsapp do Markus desconectado");
        expect(enviados).toHaveLength(0);
    });
});

describe("tratarComandoDistribuicao", () => {
    function cenario(extra: Linha = {}) {
        const r = rascunho("a", { codigo: "DK4", notificado_em: new Date().toISOString(), ...extra });
        const admin = bancoFalso({ distribuicao_rascunhos: [r] });
        const respostas: string[] = [];
        const base = {
            userId: DONO, donoUserId: DONO, instanceName: INSTANCIA, ownerNumber: "5548999990000",
            responder: async (t: string) => { respostas.push(t); },
        };
        return { r, admin, respostas, base };
    }

    it("1 aprova sem publicar nada", async () => {
        const { r, admin, respostas, base } = cenario();
        expect(await tratarComandoDistribuicao(admin, { ...base, text: "DK4 1" })).toBe(true);
        expect(r.status).toBe("aprovado");
        expect(r.texto_final).toBe("Texto do post a");
        expect(r.codigo).toBeNull();
        expect(respostas[0]).toContain("Nada foi publicado");
        expect(enviados).toHaveLength(0);
    });

    it("texto corrigido vira o texto final", async () => {
        const { r, admin, base } = cenario({ acao_apos_aprovar: "merge_pr" });
        await tratarComandoDistribuicao(admin, { ...base, text: "DK4 Texto novo do artigo, mais curto" });
        expect(r.status).toBe("corrigido");
        expect(r.texto_final).toBe("Texto novo do artigo, mais curto");
    });

    it("2 descarta", async () => {
        const { r, admin, base } = cenario();
        await tratarComandoDistribuicao(admin, { ...base, text: "DK4 2" });
        expect(r.status).toBe("descartado");
    });

    it("ignora quem não é o Markus e texto que não é comando D", async () => {
        const { r, admin, base } = cenario();
        expect(await tratarComandoDistribuicao(admin, { ...base, userId: "outra-pessoa", text: "DK4 1" })).toBe(false);
        expect(await tratarComandoDistribuicao(admin, { ...base, text: "A2 1" })).toBe(false);
        expect(await tratarComandoDistribuicao(admin, { ...base, donoUserId: null, text: "DK4 1" })).toBe(false);
        expect(r.status).toBe("pendente");
    });

    it("código que não existe responde sem mudar nada", async () => {
        const { r, admin, respostas, base } = cenario();
        expect(await tratarComandoDistribuicao(admin, { ...base, text: "DM5 1" })).toBe(true);
        expect(respostas[0]).toContain("Não achei o rascunho DM5");
        expect(r.status).toBe("pendente");
    });
});
