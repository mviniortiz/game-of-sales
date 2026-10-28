// @vitest-environment node
// Modo atendente: o risco aqui é oferecer horário que não existe (fechado,
// passado, já marcado), falar numa conversa que está com o dono, ou ler o
// próprio eco como resposta do dono e pausar à toa.
import { describe, it, expect } from "vitest";
import {
    configDaLinha,
    decidirResposta,
    ehEcoDoAtendente,
    historicoParaChat,
    horariosLivres,
    intervaloDoHorario,
    limparResposta,
    localParaUtc,
    promptDoAtendente,
    utcParaLocal,
    type AtendenteConfig,
} from "../../supabase/functions/_shared/atendente";

const semana: [string, string][] = [["08:00", "18:00"]];
const cfg: AtendenteConfig = configDaLinha({
    business_name: "Tesoura de Ouro",
    segment: "pet",
    address: "R. Lauro Linhares, 280",
    services: [["banho", "Banho", 60], ["banho-tosa", "Banho e tosa", 90]],
    hours: [semana, semana, semana, semana, semana, [["08:00", "14:00"]], []],
    rules: ["Não informe preço.", "Pergunte o nome e o porte do pet."],
    timezone: "America/Sao_Paulo",
    slot_step_min: 30,
    days_ahead: 30,
    capacity: 1,
});

// Terça, 27/10/2026, 21:30 em Florianópolis (UTC-3) = 28/10 00:30 UTC.
const terçaNoite = new Date("2026-10-28T00:30:00Z");

describe("fuso", () => {
    it("converte hora local de Florianópolis para UTC", () => {
        expect(localParaUtc("2026-10-28", 10 * 60, "America/Sao_Paulo").toISOString()).toBe("2026-10-28T13:00:00.000Z");
        expect(utcParaLocal("2026-10-28T13:00:00Z", "America/Sao_Paulo")).toEqual({ data: "2026-10-28", hora: "10:00", diaSemana: "quarta" });
    });
});

describe("horariosLivres", () => {
    it("amanhã (quarta) devolve a grade de funcionamento inteira quando a agenda está vazia", () => {
        const r = horariosLivres(cfg, "2026-10-28", "banho", [], terçaNoite);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.diaDaSemana).toBe("quarta");
        expect(r.horarios[0]).toBe("08:00");
        // banho de 60 min, passo de 30: 19 inícios, de 08:00 até 17:00
        expect(r.horarios).toHaveLength(19);
        expect(r.horarios.at(-1)).toBe("17:00");
        expect(r.horarios).not.toContain("17:30");
    });

    it("tira o horário marcado e o que se sobrepõe a ele", () => {
        const ocupado = { starts_at: "2026-10-28T13:00:00Z", ends_at: "2026-10-28T14:30:00Z" }; // 10:00 a 11:30
        const r = horariosLivres(cfg, "2026-10-28", "banho", [ocupado], terçaNoite);
        if (r.ok !== true) throw new Error("sem horários");
        expect(r.horarios).toContain("09:00");
        expect(r.horarios).not.toContain("09:30"); // 9:30 a 10:30 bate no marcado
        expect(r.horarios).not.toContain("10:00");
        expect(r.horarios).not.toContain("11:00");
        expect(r.horarios).toContain("11:30");
    });

    it("com capacidade 2, um marcado não bloqueia o horário", () => {
        const ocupado = { starts_at: "2026-10-28T13:00:00Z", ends_at: "2026-10-28T14:00:00Z" };
        const r = horariosLivres({ ...cfg, capacity: 2 }, "2026-10-28", "banho", [ocupado], terçaNoite);
        if (r.ok !== true) throw new Error("sem horários");
        expect(r.horarios).toContain("10:00");
    });

    it("domingo fechado, data passada, além da janela e serviço inexistente dão erro", () => {
        expect(horariosLivres(cfg, "2026-11-01", "banho", [], terçaNoite)).toEqual({ ok: false, erro: "Não abrimos domingo." });
        expect(horariosLivres(cfg, "2026-10-26", "banho", [], terçaNoite).ok).toBe(false);
        expect(horariosLivres(cfg, "2026-12-31", "banho", [], terçaNoite).ok).toBe(false);
        expect(horariosLivres(cfg, "2026-10-28", "unha", [], terçaNoite).ok).toBe(false);
    });

    it("hoje não oferece o que já passou nem o que está a menos de 30 min", () => {
        const quarta1015 = new Date("2026-10-28T13:15:00Z");
        const r = horariosLivres(cfg, "2026-10-28", "banho", [], quarta1015);
        if (r.ok !== true) throw new Error("sem horários");
        expect(r.horarios[0]).toBe("11:00");
    });

    it("sábado fecha às 14h: banho e tosa de 90 min começa no máximo 12:30", () => {
        const r = horariosLivres(cfg, "2026-10-31", "banho-tosa", [], terçaNoite);
        if (r.ok !== true) throw new Error("sem horários");
        expect(r.horarios.at(-1)).toBe("12:30");
    });

    it("o teto vale só para a lista; com limite infinito nada some", () => {
        const curto = { ...cfg, slot_step_min: 15 };
        const r = horariosLivres(curto, "2026-10-28", "banho", [], terçaNoite, Infinity);
        if (r.ok !== true) throw new Error("sem horários");
        expect(r.horarios).toHaveLength(37);
        expect(r.horarios).toContain("17:00");
    });

    it("intervaloDoHorario usa a duração do serviço", () => {
        const i = intervaloDoHorario(cfg, "2026-10-31", "10:00", "banho-tosa");
        expect(i?.startsAt.toISOString()).toBe("2026-10-31T13:00:00.000Z");
        expect(i?.endsAt.toISOString()).toBe("2026-10-31T14:30:00.000Z");
        expect(intervaloDoHorario(cfg, "2026-10-31", "10h", "banho")).toBeNull();
    });
});

describe("decidirResposta", () => {
    const base = { enabled: true, isGroup: false, temTelefone: true, mensagemEm: terçaNoite.toISOString(), conversa: null, retomarAposHoras: 24, agora: terçaNoite };

    it("responde conversa nova de quem escreveu", () => {
        expect(decidirResposta(base)).toEqual({ responder: true, retomar: false });
    });

    it("não responde com a flag desligada, em grupo, sem telefone ou mensagem velha", () => {
        expect(decidirResposta({ ...base, enabled: false })).toMatchObject({ responder: false, motivo: "desligado" });
        expect(decidirResposta({ ...base, isGroup: true })).toMatchObject({ motivo: "grupo" });
        expect(decidirResposta({ ...base, temTelefone: false })).toMatchObject({ motivo: "sem_telefone" });
        expect(decidirResposta({ ...base, mensagemEm: "2026-10-27T20:00:00Z" })).toMatchObject({ motivo: "atrasada" });
    });

    it("fica em silêncio com o dono e volta depois da janela", () => {
        const comDono = { estado: "com_dono" as const, pausado_em: "2026-10-27T23:00:00Z", dono_respondeu_em: null };
        expect(decidirResposta({ ...base, conversa: comDono })).toMatchObject({ responder: false, motivo: "com_dono" });
        const antiga = { ...comDono, pausado_em: "2026-10-26T20:00:00Z" };
        expect(decidirResposta({ ...base, conversa: antiga })).toEqual({ responder: true, retomar: true });
    });

    it("dono respondendo à mão recentemente segura o atendente mesmo sem pausa formal", () => {
        const c = { estado: "ativo" as const, pausado_em: null, dono_respondeu_em: "2026-10-27T22:00:00Z" };
        expect(decidirResposta({ ...base, conversa: c })).toMatchObject({ motivo: "dono_conversando" });
    });
});

describe("ehEcoDoAtendente", () => {
    const agora = new Date("2026-10-28T12:00:00Z");
    it("id enviado pelo atendente é eco", () => {
        expect(ehEcoDoAtendente({ providerMessageId: "wamid.A", botMessageIds: ["wamid.A"], enviandoAte: null, origin: "cloud_api", agora })).toBe(true);
    });
    it("envio em andamento cobre o eco que chega antes do id", () => {
        expect(ehEcoDoAtendente({ providerMessageId: "wamid.B", botMessageIds: [], enviandoAte: "2026-10-28T12:00:20Z", origin: "cloud_api", agora })).toBe(true);
    });
    it("mensagem do app do WhatsApp Business é sempre do dono", () => {
        expect(ehEcoDoAtendente({ providerMessageId: "wamid.C", botMessageIds: [], enviandoAte: "2026-10-28T12:00:20Z", origin: "business_app", agora })).toBe(false);
    });
    it("sem envio em andamento, outbound desconhecido é do dono", () => {
        expect(ehEcoDoAtendente({ providerMessageId: "wamid.D", botMessageIds: [], enviandoAte: "2026-10-28T11:59:00Z", origin: null, agora })).toBe(false);
    });
});

describe("prompt e texto", () => {
    it("o prompt leva serviços, horários, regras, a trava veterinária e a data de hoje", () => {
        const p = promptDoAtendente(cfg, { agora: terçaNoite });
        expect(p).toContain("Banho e tosa (90 min) [id: banho-tosa]");
        expect(p).toContain("Sábado: 08:00 às 14:00");
        expect(p).toContain("Domingo: fechado");
        expect(p).toContain("- Não informe preço.");
        expect(p).toContain("orientação veterinária");
        expect(p).toContain("Hoje é terça, 2026-10-27, 21:30");
    });

    it("o prompt leva o que a pessoa já marcou, para não marcar de novo", () => {
        const p = promptDoAtendente(cfg, { agora: terçaNoite, agendados: [{ id: "abc", servico: "Banho", data: "2026-10-29", diaDaSemana: "quinta", hora: "09:00" }] });
        expect(p).toContain("JÁ TEM marcados");
        expect(p).toContain("- Banho, quinta 2026-10-29 às 09:00 [id: abc]");
        expect(promptDoAtendente(cfg, { agora: terçaNoite })).toContain("Esta pessoa não tem horário marcado.");
    });

    it("limparResposta tira markdown e HTML", () => {
        expect(limparResposta("Tenho <b>10:00</b>.<br/>**Reservado**")).toBe("Tenho 10:00.\nReservado");
    });

    it("histórico começa pelo cliente e mídia vira marcador", () => {
        const h = historicoParaChat([
            { direction: "outbound", body: "Oi!", message_type: "text" },
            { direction: "inbound", body: null, message_type: "audio" },
            { direction: "inbound", body: "tem horário amanhã?", message_type: "text" },
        ]);
        expect(h).toEqual([{ role: "user", content: "[audio]" }, { role: "user", content: "tem horário amanhã?" }]);
    });

    it("configDaLinha descarta faixa e serviço malformados", () => {
        const c = configDaLinha({ services: [["x", "X", 0], ["ok", "Ok", 30]], hours: [[["10:00", "09:00"], ["08:00", "12:00"]]] });
        expect(c.services).toEqual([["ok", "Ok", 30]]);
        expect(c.hours[0]).toEqual([["08:00", "12:00"]]);
        expect(c.hours).toHaveLength(7);
    });
});
