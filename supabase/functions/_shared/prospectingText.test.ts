import { assert, assertEquals } from "jsr:@std/assert@1";
import { dividirMensagens, firstMessage, MARCA_IMAGEM, RESPOSTA_PORTA, respostaPorta, followupMessage, nextVariant, pausaEntreMensagens, primeiroNome, tempoDigitando, chipAquecendo, tetoDoChip, tetoComSinal, VARIANTS, portaJaFoi } from "./prospectingText.ts";

const ALVO = { agency_name: "Sol do Vale", city: "Blumenau", rating_count: 42 };

Deno.test("versões em teste usam o nome da integradora, sem travessão e sem link", () => {
  for (const v of VARIANTS) {
    const texto = firstMessage(ALVO, v);
    assert(texto.includes("Sol do Vale"), v);
    assert(!/[—–]/.test(texto), `${v} tem travessão`);
    assert(!texto.includes("http"), `${v} manda link na primeira mensagem`);
  }
});

Deno.test("a próxima versão é a em teste menos usada, ignorando as aposentadas", () => {
  assertEquals(nextVariant({ pergunta: 0, curta: 3, encaminha: 1, time: 1, aberta: 0, raiox: 2 }), "aberta");
  assertEquals(nextVariant({ encaminha: 0, time: 2, aberta: 1 }), "encaminha");
  assertEquals(nextVariant({}), "encaminha");
});

Deno.test("teste de dores: time e aberta respondem no próprio assunto, sem print", () => {
  assert(respostaPorta(null, "encaminha").includes(MARCA_IMAGEM));
  for (const v of ["time", "aberta"]) {
    const porta = respostaPorta(null, v);
    assert(!porta.includes(MARCA_IMAGEM), `${v} manda print`);
    assert(!/[—–]/.test(porta), `${v} tem travessão`);
    assert(portaJaFoi(`Eles: pode falar
Markus: ${porta}`, null, v), `${v} não reconhece a própria resposta`);
    assert(!portaJaFoi("Eles: pode falar", null, v));
  }
  assert(respostaPorta(null, "time").includes("vendedor"));
  assert(respostaPorta(null, "aberta").includes("perder venda"));
  assert(followupMessage({ variant: "time" }).includes("vendedor"));
  assert(followupMessage({ variant: "aberta" }).includes("perder venda"));
  assert(followupMessage({ variant: "encaminha" }).includes("visualiza a proposta"));
});

Deno.test("com o sócio do CNPJ, todas as versões abrem pelo primeiro nome", () => {
  const comDono = { ...ALVO, metadata: { socio: "PAULO HENRIQUE KEEN CHAVES" } };
  for (const v of VARIANTS) {
    const texto = firstMessage(comDono, v);
    assert(texto.startsWith("Oi, Paulo"), v);
    assert(texto.includes("Sol do Vale"), v);
    assert(!/quem cuida do comercial|Consegue me passar|Pode me passar/.test(texto), `${v} pede o dono para o próprio dono`);
  }
});

Deno.test("seguimento do dia 4 faz a pergunta da dor e não pede reunião", () => {
  const semDono = followupMessage();
  assert(semDono.startsWith("Oi, tudo bem?"));
  assert(semDono.includes("quando o cliente visualiza a proposta e some"));
  assert(!/20 minutos|reunião|chamada/.test(semDono));
  assert(!/[—–]/.test(semDono));
  assert(followupMessage({ metadata: { socio: "ANNA LUIZA SOUZA" } }).startsWith("Oi, Anna, tudo bem?"));
});

Deno.test("digitando dura como gente no celular, entre 3,4 e 17,25 segundos", () => {
  assertEquals(tempoDigitando("Oi", 0.5), 4000);
  assertEquals(tempoDigitando("x".repeat(100), 0.5), 9000);
  assertEquals(tempoDigitando("x".repeat(500), 0.5), 15000);
  assert(tempoDigitando("Oi", 0) >= 3400 && tempoDigitando("x".repeat(500), 1) <= 17250);
  assert(pausaEntreMensagens(0) === 1500 && pausaEntreMensagens(1) === 4000);
});

Deno.test("rascunho com linha em branco vira duas mensagens", () => {
  assertEquals(dividirMensagens("Que bom.\n\nComo vocês controlam isso?"), ["Que bom.", "Como vocês controlam isso?"]);
  assertEquals(dividirMensagens("Uma linha só.\nContinua a mesma mensagem."), ["Uma linha só.\nContinua a mesma mensagem."]);
  assertEquals(dividirMensagens("  \n\nTexto\n \n"), ["Texto"]);
});

Deno.test("parágrafo [imagem] vira uma parte sozinha", () => {
  assertEquals(dividirMensagens("Estamos montando isso.\n\n[imagem]\n\nVocês fazem algo assim?"), ["Estamos montando isso.", "[imagem]", "Vocês fazem algo assim?"]);
});

Deno.test("resposta padrão sai em três partes, com o print no meio e sem travessão", () => {
  const partes = dividirMensagens(RESPOSTA_PORTA);
  assertEquals(partes.length, 3);
  assertEquals(partes[1], MARCA_IMAGEM);
  assert(!/[—–]/.test(RESPOSTA_PORTA));
});

Deno.test("primeiro nome ignora sócio inválido", () => {
  assertEquals(primeiroNome("ALISON NILDO DE JESUS"), "Alison");
  assertEquals(primeiroNome("12.345.678 JOAO"), null);
  assertEquals(primeiroNome(""), null);
  assertEquals(primeiroNome(null), null);
});

Deno.test("chip novo: zero frias no dia da troca e sobe por dia útil até o teto", () => {
  const troca = "2026-10-16T13:00:00.000Z"; // sexta, 10h de Brasília
  const em = (dias: number, hora = "15:00") => new Date(new Date(`2026-10-16T${hora}:00.000Z`).getTime() + dias * 86400000);
  assertEquals(tetoDoChip(troca, em(0), 50), 0);
  assertEquals(tetoDoChip(troca, em(0, "23:30"), 50), 0); // 20h30 de Brasília, ainda o mesmo dia
  assertEquals(tetoDoChip(troca, em(1), 50), 0); // sábado não conta
  assertEquals(tetoDoChip(troca, em(3), 50), 3); // segunda, 1º dia útil
  assertEquals(tetoDoChip(troca, em(4), 50), 5);
  assertEquals(tetoDoChip(troca, em(6), 50), 10); // quinta, 4º dia útil
  assertEquals(tetoDoChip(troca, em(7), 50), 12); // sexta seguinte, 5º dia útil
  assertEquals(tetoDoChip(troca, em(10), 50), 15); // segunda seguinte
  assertEquals(tetoDoChip(troca, em(60), 50), 50);
  assertEquals(tetoDoChip(null, em(0), 50), 50);
  assert(chipAquecendo(troca, em(13)));
  assert(!chipAquecendo(troca, em(14)));
  assert(!chipAquecendo(null, em(0)));
});

Deno.test("distribuidora recebe abordagem de cotação e integrador, nos três textos fixos", () => {
  const dist = { ...ALVO, agency_name: "Sul Solar Distribuidora", niche: "distribuidora solar", metadata: { socio: "ANA PAULA SOUZA" } };
  const primeira = firstMessage(dist, "encaminha");
  assert(primeira.startsWith("Oi, Ana"), primeira);
  assert(primeira.includes("distribuidora") && primeira.includes("integrador"), primeira);
  assert(!primeira.includes("integradora solar"), primeira);
  assert(followupMessage(dist).includes("o integrador visualiza a cotação"));
  const porta = respostaPorta("distribuidora solar");
  assert(porta.includes("cotação") && porta.includes(MARCA_IMAGEM), porta);
  assertEquals(respostaPorta(null), RESPOSTA_PORTA);
  assertEquals(respostaPorta("integradorasolar"), RESPOSTA_PORTA);
  for (const t of [primeira, followupMessage(dist), porta]) assert(!/[—–]/.test(t), "travessão");
});

Deno.test("primeira mensagem varia entre empresas, mas é fixa para a mesma empresa", () => {
  const nomes = ["Sol do Vale", "Ross Energia Solar", "Teg Solar", "Ponto Solar", "Marsol", "Ecosolar", "Solarbox", "Reserva Solar"];
  for (const niche of [null, "distribuidora solar"]) {
    for (const socio of [null, "ANA PAULA SOUZA"]) {
      const textos = nomes.map((n) => firstMessage({ ...ALVO, agency_name: n, niche, metadata: { socio } }, "encaminha"));
      assert(new Set(textos.map((t, i) => t.replace(nomes[i], "X"))).size >= 2, `sem variação ${niche} ${socio}`);
      textos.forEach((t, i) => {
        assert(t.includes(nomes[i]) && /voc(ê|e)s|integrador/.test(t) && !/[—–]/.test(t) && !t.includes("http"), t);
        assertEquals(t, firstMessage({ ...ALVO, agency_name: nomes[i], niche, metadata: { socio } }, "encaminha"));
      });
    }
  }
});

Deno.test("teto só sobe com resposta de pessoa nas últimas frias", () => {
  const seco = Array.from({ length: 8 }, (_, i) => ({ dia: i < 3 ? "2026-10-20" : "2026-10-19", pessoa: false }));
  assertEquals(tetoComSinal(10, seco, "2026-10-21"), 3); // segura no que saiu no último dia
  assertEquals(tetoComSinal(10, [...seco.slice(1), { dia: "2026-10-19", pessoa: true }], "2026-10-21"), 10);
  assertEquals(tetoComSinal(10, seco.slice(0, 5), "2026-10-21"), 10); // amostra pequena não trava
});
