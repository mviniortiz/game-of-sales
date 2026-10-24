// Roda no console da ficha de uma empresa no Google Maps, já logado.
// Abre a aba Avaliações, rola até carregar tudo (até ~40 s), expande os textos
// e devolve contagens e os trechos que parecem reclamação de orçamento.
// As classes do Maps (jftiEf, wiI7pd, kvMYJc, m6QErb, w8nwRe) mudam de tempos
// em tempos: se voltar zero avaliações, leia pela página.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const aba = [...document.querySelectorAll("button[role=tab]")]
    .find((b) => /^Avalia/.test(b.getAttribute("aria-label") || ""));
  if (aba && !/!9m1!1b1/.test(location.href)) { aba.click(); await sleep(3000); }

  const painel = () => [...document.querySelectorAll("div.m6QErb.DxyBCb")]
    .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
  let ultimo = -1, igual = 0;
  const fim = Date.now() + 40000;
  while (Date.now() < fim) {
    const p = painel(); if (p) p.scrollTop = p.scrollHeight;
    await sleep(700);
    const n = document.querySelectorAll("div.jftiEf").length;
    if (n === ultimo) { if (++igual >= 5) break; } else { igual = 0; ultimo = n; }
  }
  document.querySelectorAll("button.w8nwRe").forEach((b) => b.click());
  await sleep(800);

  const avaliacoes = [...document.querySelectorAll("div.jftiEf")].map((d) => ({
    estrelas: parseInt(d.querySelector("span.kvMYJc")?.getAttribute("aria-label") || "0"),
    quando: d.querySelector("span.rsqaWe")?.innerText || "",
    texto: (d.querySelector("span.wiI7pd")?.innerText || "").replace(/\n+/g, " "),
  }));

  const semRetorno = /(n[aã]o|nunca|sem|nem|nenhum)\s+(me\s+|nos\s+)?(obtive\s+|tive\s+|deram\s+|dar\s+|teve\s+|houve\s+)?(retorn|respond|resposta)|sem\s+retorno|v[aá]cuo|ignora|deixaram\s+de\s+responder|parou\s+de\s+responder|sumiu|sumiram|demor\w*\s+(muito\s+)?(pra|para|a)\s+(responder|retornar|enviar|mandar)/i;
  const orcamento = /or[cç]amento/i;

  // Os trechos ainda precisam de leitura humana: o filtro separa candidatos,
  // quem decide se é pré-venda ou pós-venda é quem lê.
  return {
    empresa: document.querySelector("h1")?.innerText,
    carregadas: avaliacoes.length,
    comTexto: avaliacoes.filter((a) => a.texto).length,
    citamOrcamento: avaliacoes.filter((a) => orcamento.test(a.texto)).length,
    candidatasSemRetorno: avaliacoes.filter((a) => semRetorno.test(a.texto))
      .map((a) => `${a.estrelas}* ${a.quando} | ${a.texto.slice(0, 350)}`),
    orcamentoNegativas: avaliacoes
      .filter((a) => orcamento.test(a.texto) && a.estrelas <= 3 && !semRetorno.test(a.texto))
      .map((a) => `${a.estrelas}* ${a.quando} | ${a.texto.slice(0, 250)}`),
  };
})();
