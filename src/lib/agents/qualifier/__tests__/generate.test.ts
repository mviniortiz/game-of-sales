// VYZON.AGENTS.2 — Testes do gerador determinístico do Qualificador.
// Cobre os cenários críticos do spec (q_fora_icp, q_preco_de_cara) + casos base.
import { describe, it, expect } from "vitest";
import { qualifierGenerate, buildOutboundDraft } from "../generate";
import type { QualifierInput } from "../types";

const baseCtx = {
  segment: "Agência de tráfego pago",
  knownFields: {},
  existingTags: [],
  blueprintFields: ["orcamento", "servico", "urgencia", "decisor", "prazo"],
  blueprintTags: ["lead-quente", "lead-morno", "fora-do-icp", "indicacao", "sem-orcamento", "precisa-followup"],
  rules: ["Tom consultivo", "sem emoji"],
};

function input(messages: string[], source: QualifierInput["source"] = "whatsapp"): QualifierInput {
  return {
    companyId: "c1",
    agentKey: "qualifier",
    source,
    conversation: { messages: messages.map((text) => ({ role: "lead" as const, text })) },
    context: { ...baseCtx },
  };
}

describe("qualifierGenerate", () => {
  it("é puro: nunca aplica nada (isPreview + needsConfirmation)", () => {
    const s = qualifierGenerate(input(["oi, quero entender os planos"]));
    expect(s.isPreview).toBe(true);
    s.detectedFields.forEach((f) => expect(f.needsConfirmation).toBe(true));
  });

  it("ICP completo → green + handoff para closer", () => {
    const s = qualifierGenerate(
      input([
        "Tenho uma agência e quero gestão de tráfego pago",
        "Invisto uns R$ 5.000 por mês e sou o dono, decido eu",
        "Preciso começar essa semana",
      ])
    );
    expect(s.score).toBe("green");
    expect(s.handoff.required).toBe(true);
    expect(s.detectedFields.map((f) => f.key)).toEqual(
      expect.arrayContaining(["servico", "orcamento", "decisor"])
    );
  });

  it("sem orçamento → yellow + pergunta de orçamento + tag sem-orcamento", () => {
    const s = qualifierGenerate(input(["Quero ajuda com social media pra minha agência"]));
    expect(s.score).toBe("yellow");
    expect(s.missingFields.some((m) => /orcamento/i.test(m))).toBe(true);
    expect(s.suggestedTags.map((t) => t.name)).toContain("sem-orcamento");
    expect(s.recommendedQuestions.join(" ")).toMatch(/investe|investimento/i);
  });

  it("CRÍTICO: fora do ICP → red, não marca como quente", () => {
    const s = qualifierGenerate(input(["oi, é só uma pesquisa pra faculdade, não tenho empresa"]));
    expect(s.score).toBe("red");
    expect(s.suggestedTags.map((t) => t.name)).toContain("fora-do-icp");
    expect(s.suggestedTags.map((t) => t.name)).not.toContain("lead-quente");
  });

  it("CRÍTICO: preço de cara → handoff humano, sem prometer/descontar", () => {
    const s = qualifierGenerate(input(["Quanto custa?"]));
    expect(s.handoff.required).toBe(true);
    expect(s.handoff.reason).toMatch(/pre[çc]o/i);
    expect(s.nextAction.toLowerCase()).toContain("handoff");
  });

  it("indicação → tag indicacao", () => {
    const s = qualifierGenerate(
      input(["Fulano me indicou vocês, quero tráfego pago, invisto R$ 3.000/mês"], "indicacao")
    );
    expect(s.suggestedTags.map((t) => t.name)).toContain("indicacao");
  });
});

describe("buildOutboundDraft", () => {
  it("rascunho SEMPRE exige aprovação (requiresApproval=true)", () => {
    const inp = input(["quero social media"]);
    const draft = buildOutboundDraft(inp, qualifierGenerate(inp));
    expect(draft.requiresApproval).toBe(true);
    expect(typeof draft.body).toBe("string");
    expect(draft.body.length).toBeGreaterThan(0);
  });
});
