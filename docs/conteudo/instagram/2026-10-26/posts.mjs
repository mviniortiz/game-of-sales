// Posts do Instagram de 26/10 a 06/11/2026 (@vyzoncrm), no design system
// Vyzon Solar: azul de marca, marca-texto amarelo, números em Barlow
// Condensed, a conversa de WhatsApp e a fatura como objetos.
// Uso: node posts.mjs  → gera <n>.html, render.sh (PNG 1080x1350 via Brave) e
// calendario.md.
//
// Por que estes formatos (pesquisa de 23/10/2026, perfis abertos no Instagram):
// - No nosso perfil, frase curta, meme e POV venceram os carrosséis
//   explicativos (23, 18 e 16 visualizações contra 12 a 15).
// - Canal Solar (210 mil seguidores): o que engaja é pergunta polêmica em
//   faixa e assunto do setor na semana (22 mil visualizações, 422 curtidas).
// - SolarMarket (11 mil) e SolarZ (27 mil): picos de 27 mil visualizações com
//   18 curtidas são alcance pago; o orgânico deles fica em 200 a 800.
// - Criadores que mais geram comentário usam "comenta PALAVRA que eu te mando".
// Por isso: gancho de pergunta, assunto do setor com fonte, peça para salvar e
// pedido de comentário com palavra-chave. Copy sem travessão e sem emoji.

import { mkdirSync, writeFileSync } from "node:fs";

const FONTS =
    "https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Barlow+Condensed:wght@600;700&family=Geist:wght@400;500;600&display=swap";

const css = `
:root{--paper:#f6f7f9;--ink:#0d1421;--muted:#4a5363;--subtle:#5f6776;--line:#d9dde4;--brand:#1556c0;--tint:#e8effb;--marker:#ffd84a;--wa:#25d366;--chat:#efeae2;--out:#d9fdd3;--wait:#a14a07;--ok:#0f7b4f}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px}
body{font-family:Geist,system-ui,sans-serif;color:var(--ink);overflow:hidden}
.c{width:1080px;height:1350px;padding:96px 88px 170px;display:flex;flex-direction:column;justify-content:center;position:relative}
.paper{background:var(--paper)} .blue{background:var(--brand);color:#fff} .dark{background:var(--ink);color:#fff}
.d{font-family:Archivo,sans-serif;font-weight:800;letter-spacing:-.03em;line-height:.98}
.n{font-family:"Barlow Condensed",sans-serif;font-variant-numeric:tabular-nums}
.m{background:linear-gradient(transparent 0 56%,var(--marker) 56% 92%,transparent 92%);-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:0 .05em;color:var(--ink)}
.mb{background:var(--marker);color:var(--ink);padding:0 .1em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.kick{font-size:30px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.75}
.sub{font-size:44px;line-height:1.35;margin-top:56px;max-width:880px}
.foot{position:absolute;left:88px;right:88px;bottom:64px;display:flex;justify-content:space-between;font-size:26px;font-weight:600;opacity:.7}
.chatw{border-radius:22px;overflow:hidden;box-shadow:0 2px 4px rgba(13,20,33,.08),0 40px 80px -40px rgba(13,20,33,.55);border:1px solid var(--line);background:#fff;color:var(--ink)}
.top{display:flex;align-items:center;gap:22px;padding:24px 30px;border-bottom:1px solid var(--line)}
.av{width:70px;height:70px;border-radius:99px;background:var(--subtle);color:#fff;display:flex;align-items:center;justify-content:center;font:800 32px Archivo,sans-serif}
.nm{font-size:32px;font-weight:600} .st{font-size:24px;color:var(--subtle)}
.body{background:var(--chat);padding:30px 26px 34px;display:flex;flex-direction:column;gap:16px}
.day{align-self:center;background:#fff;color:var(--subtle);font-size:24px;padding:6px 16px;border-radius:10px}
.b{max-width:86%;align-self:flex-start;background:#fff;border-radius:16px;padding:16px 20px 10px;font-size:31px;line-height:1.35;box-shadow:0 1px 1px rgba(13,20,33,.12)}
.b.o{align-self:flex-end;background:var(--out)}
.h{display:block;text-align:right;font-size:21px;color:var(--subtle);margin-top:4px}
.pdf{display:inline-block;border:3px solid var(--wait);color:var(--wait);font-weight:700;font-size:22px;letter-spacing:.06em;padding:2px 10px;border-radius:8px;margin-right:12px;vertical-align:middle}
.fat{background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:22px;padding:44px;box-shadow:0 2px 4px rgba(13,20,33,.08),0 40px 80px -40px rgba(13,20,33,.55)}
.row{display:flex;justify-content:space-between;align-items:baseline;font-size:34px;padding:12px 0}
.row span:first-child{color:var(--muted)}
.dash{border-top:3px dashed var(--line);margin:22px 0}
.li{display:flex;gap:28px;align-items:baseline;padding:26px 0;border-top:2px solid rgba(255,255,255,.2)}
.li .k{font-size:84px;font-weight:700;min-width:96px;line-height:.9}
.li .t{font-size:40px;line-height:1.25;font-weight:500}
.li .t small{display:block;font-size:30px;font-weight:400;opacity:.8;margin-top:8px}
.dot{width:84px;height:84px;border-radius:99px;border:5px solid var(--subtle);display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:700;background:var(--paper);flex-shrink:0}
.dot.on{background:var(--brand);border-color:var(--brand);color:#fff}
.tarja{display:inline;background:var(--marker);color:var(--ink);padding:.06em .18em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.bars{display:flex;gap:36px;align-items:flex-end;height:430px;margin-top:60px}
.bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:16px;height:100%}
.bar i{display:block;background:rgba(255,255,255,.22);border-radius:10px 10px 0 0}
.bar.on i{background:var(--marker)}
.bar b{font-size:76px;font-weight:700;line-height:1}
.bar span{font-size:34px;opacity:.8}
`;

const shell = (cls, inner, light = false) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}"><style>${css}</style></head><body>
<div class="c ${cls}">${inner}
<div class="foot" style="color:${light ? "var(--ink)" : "#fff"}"><span>@vyzoncrm</span><span>vyzon.com.br</span></div>
</div></body></html>`;

const wa = (head, bubbles) => `<div class="chatw"><div class="top">${head}</div><div class="body">${bubbles}</div></div>`;
const cliente = (nome, st) => `<span class="av">${nome[0]}</span><div><div class="nm">${nome}</div><div class="st">${st}</div></div>`;

const TAGS = "#energiasolar #integradorsolar #vendasnowhatsapp #energiafotovoltaica";
const TAGS_GERAL = "#vendasnowhatsapp #vendas #orcamento #pequenosnegocios #energiasolar";

export const POSTS = [
    {
        dia: "seg 26/10", hora: "11:30", formato: "Pergunta polêmica (molde Canal Solar)",
        html: shell("blue", `
<p class="kick">Pergunta sincera</p>
<h1 class="d" style="font-size:112px;margin-top:40px;line-height:1.02">O cliente que visualizou e não respondeu:</h1>
<h2 class="d" style="font-size:112px;margin-top:40px;line-height:1.12"><span class="tarja">desistiu ou só esqueceu?</span></h2>
<p class="sub">Comenta aqui o que você acha.</p>`),
        legenda: `Visualizou às 14h. Até agora, nada.

Muito dono de integradora já respondeu isso pra gente: "quem visualiza e some não tem interesse".

Mas ele mandou a conta de luz e pediu orçamento. Interesse tinha. O que muda tudo é se alguém chama de volta, e quando.

E aí, desistiu ou esqueceu? Comenta sua opinião.

${TAGS}`,
    },
    {
        dia: "ter 27/10", hora: "18:30", formato: "Meme Ninguém: (molde do nosso 2º melhor post)",
        html: shell("paper", `
<h1 class="d" style="font-size:76px">Ninguém:</h1>
<h2 class="d" style="font-size:62px;margin-top:22px;line-height:1.05">O cliente 3 minutos depois de receber a proposta de <span class="n" style="font-weight:700">R$ 32 mil</span>:</h2>
<div style="margin-top:56px">${wa(cliente("Rafael", "visto por último hoje às 14:02"), `
<span class="day">Hoje</span>
<div class="b o"><span class="pdf">PDF</span>Proposta_Rafael_7kWp.pdf<span class="h">13:58 ✓✓</span></div>
<div class="b o">Rafael, segue a proposta. Qualquer dúvida me chama.<span class="h">13:58 ✓✓</span></div>`)}</div>`, true),
        legenda: `Ele abriu. Viu o valor. Fechou o WhatsApp e foi jantar.

Não é que ele não quer. É que R$ 32 mil não se decide em 3 minutos: tem a parcela, tem a conversa em casa, tem o outro orçamento que ele pediu.

Marca aqui o vendedor que viveu isso hoje.

${TAGS}`,
    },
    {
        dia: "qua 28/10", hora: "11:30", formato: "Número do setor com fonte + comentário com palavra",
        html: shell("dark", `
<p class="kick">Greener, 1º semestre de 2026</p>
<h1 class="d" style="font-size:104px;margin-top:40px">De cada 5 orçamentos de energia solar,</h1>
<p class="n" style="font-size:300px;font-weight:700;line-height:1;margin-top:30px"><span class="mb">4</span></p>
<h2 class="d" style="font-size:80px;margin-top:24px">não viram venda.</h2>`),
        legenda: `A integradora típica faz uns 25 orçamentos por mês e fecha 18% deles (Greener, Estudo Estratégico de Geração Distribuída, 1º semestre de 2026).

Ou seja: 20 clientes por mês que já mandaram a conta de luz, já viram o valor e ficaram pelo caminho.

Antes de pagar por lead novo, vale olhar esses 20. Quantos você chamou de volta essa semana? Comenta o número.

${TAGS}`,
    },
    {
        dia: "qui 29/10", hora: "18:30", formato: "Peça pra salvar + comenta MENSAGEM",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">Copia e cola amanhã</p>
<h1 class="d" style="font-size:84px;margin-top:22px">A mensagem do 2º dia que <span class="m">reabre a conversa</span></h1>
<div style="margin-top:56px">${wa(cliente("Carlos", "online"), `
<span class="day">Quarta</span>
<div class="b o">Oi, Carlos, tudo bem? Conseguiu olhar a proposta? Se ajudar, te mando a simulação com financiamento pra comparar com a sua conta de luz de hoje.<span class="h">09:03 ✓✓</span></div>
<div class="b">Oi! Consegui sim, pode mandar a simulação.<span class="h">09:05</span></div>`)}</div>`, true),
        legenda: `Sem "e aí, fechamos?". Sem cobrança.

Uma pergunta simples e uma ajuda concreta: a simulação com financiamento do lado da conta de luz que ele paga hoje. Ele compara parcela com conta, não preço com preço.

Salva pra usar no próximo orçamento parado.

Quer as 10 mensagens que mais reabrem conversa? Comenta MENSAGEM que eu te mando.

${TAGS}`,
    },
    {
        dia: "sex 30/10", hora: "11:30", formato: "Lista curta (tradução do integrador)",
        html: shell("blue", `
<p class="kick">Tradução do integrador</p>
<h1 class="d" style="font-size:100px;margin-top:30px;line-height:1.02">Quando o cliente diz "vou pensar", ele quer dizer:</h1>
<div style="margin-top:46px">
<div class="li"><span class="k n">1</span><span class="t">A parcela não coube.<small>Pergunte qual valor fica confortável.</small></span></div>
<div class="li"><span class="k n">2</span><span class="t">Precisa conversar em casa.<small>Ofereça mandar um resumo pra família.</small></span></div>
<div class="li"><span class="k n">3</span><span class="t">Tem outro orçamento na mesa.<small>Pergunte o que pesou no outro.</small></span></div>
</div>`),
        legenda: `"Vou pensar" quase nunca é um não. É uma dúvida que o cliente não falou.

Parcela, família ou outro orçamento: cada uma pede uma mensagem diferente. Mandar "e aí, pensou?" pra todas é o jeito mais rápido de perder as três.

Qual dessas você mais escuta? Comenta 1, 2 ou 3.

${TAGS}`,
    },
    {
        dia: "seg 02/11", hora: "11:30", formato: "Assunto do setor (Fio B) com fonte",
        html: shell("dark", `
<p class="kick">Lei 14.300, Fio B</p>
<h1 class="d" style="font-size:96px;margin-top:30px;line-height:1.02">O Fio B sobe todo ano. <span class="mb">Seu cliente sabe?</span></h1>
<div class="bars">
<div class="bar"><b class="n">60%</b><i style="height:56%"></i><span>2026</span></div>
<div class="bar on"><b class="n">75%</b><i style="height:70%"></i><span>2027</span></div>
<div class="bar"><b class="n">90%</b><i style="height:84%"></i><span>2028</span></div>
</div>`),
        legenda: `Pela Lei 14.300, a parte do Fio B cobrada de quem gera a própria energia sobe todo ano: 60% em 2026, 75% em 2027 e 90% em 2028. E cada mês que o cliente passa pensando é mais uma conta de luz cheia.

Isso não é argumento de pressão. É informação que o seu cliente provavelmente não tem, e que ajuda ele a decidir no tempo dele.

Uma boa retomada pode ser só isso: "Lembrei de você porque o Fio B sobe de novo em janeiro. Quer que eu te mostre o que muda na sua conta?"

${TAGS}`,
    },
    {
        dia: "ter 03/11", hora: "18:30", formato: "POV com a fatura",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">POV</p>
<h1 class="d" style="font-size:86px;margin-top:22px">Você somou os orçamentos da semana que <span class="m">ninguém respondeu</span>.</h1>
<div class="fat" style="margin-top:56px">
<div class="row"><span>Orçamentos sem resposta</span><b class="n" style="font-size:46px">8</b></div>
<div class="row"><span>Valor médio</span><b class="n" style="font-size:46px">R$ 25.000</b></div>
<div class="dash"></div>
<div class="row"><span>Esperando alguém chamar</span></div>
<p class="n" style="font-size:150px;font-weight:700;line-height:1"><span class="m">R$ 200.000</span></p>
</div>`, true),
        legenda: `Faz essa conta com os seus números: orçamentos sem resposta vezes o valor médio.

A gente fez com 8 orçamentos de R$ 25 mil, que é um mês comum pra muita integradora. Deu R$ 200 mil esperando alguém chamar de volta.

Qual foi o seu número? Se quiser, o link da bio faz a conta com você.

${TAGS}`,
    },
    {
        dia: "qua 04/11", hora: "11:30", formato: "Frase de impacto (molde Mandou. Viu. Sumiu.)",
        html: shell("dark", `
<p class="kick">Seu software de proposta avisa:</p>
<h1 class="d" style="font-size:118px;margin-top:40px">"O cliente<br>abriu a proposta."</h1>
<h2 class="d" style="font-size:150px;line-height:1.1;margin-top:70px"><span class="mb">E aí?</span></h2>`),
        legenda: `Saber que abriu é metade.

A outra metade é chamar de volta no dia certo, com a mensagem certa, no meio de duzentas conversas do WhatsApp. É essa metade que vira venda, e é a que quase ninguém faz com constância.

Você chama de volta quem abriu e não respondeu? Comenta SIM ou NÃO.

${TAGS}`,
    },
    {
        dia: "qui 05/11", hora: "18:30", formato: "Linha do tempo (salvável)",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">A vida de um orçamento</p>
<h1 class="d" style="font-size:90px;margin-top:22px">Proposta não morre num dia. <span class="m">Ela esfria.</span></h1>
<div style="margin-top:70px;display:flex;flex-direction:column;gap:44px">
<div style="display:flex;gap:34px;align-items:center"><span class="dot n">0</span><span style="font-size:40px"><b>Dia 0.</b> A proposta sai pelo WhatsApp.</span></div>
<div style="display:flex;gap:34px;align-items:center"><span class="dot n">1</span><span style="font-size:40px"><b>Dia 1.</b> Visualizou. Não respondeu.</span></div>
<div style="display:flex;gap:34px;align-items:center"><span class="dot n on">2</span><span style="font-size:40px"><b>Dia 2.</b> Hora de chamar de volta, com uma pergunta.</span></div>
</div>`, true),
        legenda: `No dia 1 o cliente ainda está pensando. Se ninguém chama, cada dia que passa a proposta esfria um pouco: ele esquece o valor, recebe outro orçamento, a conversa em casa não acontece.

O 2º dia é um bom momento pra chamar de volta: ainda é recente e não parece cobrança.

Salva pra lembrar.

${TAGS}`,
    },
    {
        dia: "sex 06/11", hora: "11:30", formato: "Produto (molde do nosso melhor post)",
        html: shell("paper", `
<h1 class="d" style="font-size:180px;line-height:.92">Mandou.<br>Viu.<br><span class="m">Sumiu.</span></h1>
<p class="sub" style="color:var(--muted)">No 2º dia sem resposta, a mensagem pra chamar de volta chega pronta no seu WhatsApp. Você responde 1 e ela sai do seu número.</p>`, true),
        legenda: `É isso que o Vyzon faz.

Acompanha cada orçamento que sai do seu WhatsApp. No 2º dia sem resposta, a mensagem pra chamar de volta chega pronta, no seu tom. Você responde 1 e ela sai do seu número, com o seu nome. Nada vai sem você aprovar.

R$ 97 por mês, tudo liberado para até 10 pessoas. Sem contrato.

Quer ver funcionando? Link na bio.

${TAGS}`,
    },
    // Extras para qualquer ramo (pedido de 24/10): "cliente sumiu depois do
    // orçamento" aparece em confeitaria, beleza, segurança e vendas no TikTok,
    // e ninguém do solar fala disso em vídeo. Traz alcance de fora sem mudar a
    // oferta: o solar continua no exemplo e nas hashtags.
    {
        dia: "qua 28/10", hora: "18:30", formato: "Extra qualquer ramo: identificação (comenta seu ramo)",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">Toda profissão tem</p>
<h1 class="d" style="font-size:96px;margin-top:22px">O cliente que <span class="m">visualizou e sumiu.</span></h1>
<div style="margin-top:60px;display:flex;flex-direction:column;gap:30px">
${[["Móveis planejados", "Segue o projeto da cozinha com os valores."], ["Estética", "Segue a tabela dos pacotes."], ["Energia solar", "Segue a proposta do sistema de 7 kWp."]].map(([ramo, msg]) => `
<div style="background:var(--chat);border-radius:22px;padding:22px 26px 26px;display:flex;flex-direction:column;gap:12px;border:1px solid var(--line)">
<span style="font-size:26px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--subtle)">${ramo}</span>
<div class="b o" style="max-width:92%">${msg}<span class="h">14:02 <span style="color:#53bdeb">✓✓</span></span></div>
</div>`).join("")}
</div>`, true),
        legenda: `Muda o ramo, muda o valor, a cena é a mesma: o orçamento sai, o cliente visualiza e a conversa para.

E quase sempre ele não disse não. Ele só não respondeu ainda.

Qual é o seu ramo? Comenta aí pra gente ver quantas profissões passam por isso.

${TAGS_GERAL}`,
    },
    {
        dia: "seg 02/11", hora: "18:30", formato: "Extra qualquer ramo: lista salvável",
        html: shell("blue", `
<p class="kick">Cliente sumiu depois do orçamento?</p>
<h1 class="d" style="font-size:96px;margin-top:30px;line-height:1.1">3 motivos que <span class="tarja">não são o preço</span></h1>
<div style="margin-top:50px">
<div class="li"><span class="k n">1</span><span class="t">Esqueceu.<small>Sua mensagem ficou lá embaixo, depois de 40 conversas.</small></span></div>
<div class="li"><span class="k n">2</span><span class="t">Precisa de outra opinião.<small>Sócio, marido, esposa: alguém que não viu o orçamento.</small></span></div>
<div class="li"><span class="k n">3</span><span class="t">Está comparando.<small>Pediu mais de um orçamento e ainda não decidiu.</small></span></div>
</div>`),
        legenda: `Quando o cliente some, a primeira reação é achar que foi o preço e já oferecer desconto.

Muitas vezes ele só esqueceu, precisa conversar com alguém ou está comparando. Nenhum desses se resolve com desconto. Se resolve chamando de volta com uma pergunta.

Salva pra lembrar no próximo orçamento parado.

${TAGS_GERAL}`,
    },
    {
        dia: "qua 04/11", hora: "18:30", formato: "Extra qualquer ramo: modelo de mensagem (comenta seu ramo)",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">Serve pra qualquer ramo</p>
<h1 class="d" style="font-size:84px;margin-top:22px">A mensagem pra quem <span class="m">sumiu depois do orçamento</span></h1>
<div style="margin-top:60px">${wa(cliente("Ana", "visto por último ontem às 19:40"), `
<span class="day">Hoje</span>
<div class="b o" style="max-width:94%">Oi, <span class="mb">[nome]</span>, conseguiu olhar o orçamento? Se ajudar, te mando <span class="mb">[algo que facilite a decisão]</span>.<span class="h">09:03 ✓✓</span></div>`)}</div>`, true),
        legenda: `Uma pergunta e uma ajuda. Sem "e aí, fechamos?".

O que vai no colchete muda com o ramo:
Móveis planejados: a foto de uma cozinha parecida que você já entregou.
Estética: os dois horários livres da semana.
Energia solar: a simulação com financiamento do lado da conta de luz de hoje.

Manda no 2º dia sem resposta: ainda é recente e não parece cobrança.

Comenta o seu ramo que a gente te diz o que colocar no colchete.

${TAGS_GERAL}`,
    },
    // 3 por dia (pedido de 24/10): 07:30 leve (frase, meme, pergunta), 11:30
    // útil (lista, conta, produto), 18:30 conversa. Os reels de produto ocupam
    // dois horários de 11:30 (ver REELS).
    {
        dia: "seg 26/10", hora: "07:30", formato: "Frase curta",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">Antes de pagar por lead novo</p>
<h1 class="d" style="font-size:104px;margin-top:30px;line-height:1.04">O orçamento mais barato é o que <span class="m">já está no seu WhatsApp.</span></h1>`, true),
        legenda: `Lead novo custa anúncio, tempo e paciência. O cliente que já mandou a conta de luz e recebeu a proposta já passou por tudo isso.

Antes de aumentar o anúncio, abre o WhatsApp e procura quem recebeu orçamento e não respondeu. É o lead mais barato que você vai ter essa semana.

${TAGS}`,
    },
    {
        dia: "seg 26/10", hora: "18:30", formato: "Pergunta polêmica",
        html: shell("blue", `
<p class="kick">Pergunta sincera</p>
<h1 class="d" style="font-size:124px;margin-top:40px">Desconto pra fechar:</h1>
<h2 class="d" style="font-size:112px;margin-top:40px;line-height:1.12"><span class="tarja">estratégia ou desespero?</span></h2>`),
        legenda: `Tem integrador que dá desconto pra todo cliente que demora. Tem integrador que nunca mexe no preço.

O problema do desconto automático: o cliente aprende que esperar compensa. E muitas vezes ele nem estava pensando no preço, só não tinha decidido ainda.

E você, dá desconto pra fechar? Comenta ESTRATÉGIA ou DESESPERO.

${TAGS}`,
    },
    {
        dia: "ter 27/10", hora: "07:30", formato: "POV com a lista de conversas",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">POV</p>
<h1 class="d" style="font-size:76px;margin-top:22px">Você abriu o WhatsApp de manhã e o orçamento de sexta <span class="m">ficou lá embaixo.</span></h1>
<div class="chatw" style="margin-top:50px">
${[["F", "Fornecedor de kits", "Segue a tabela atualizada", "07:12", "3"], ["G", "Obra Centro", "Foto do telhado", "07:05", "12"], ["M", "Dona Marta", "Bom dia! Pode vir hoje?", "06:58", "1"], ["B", "Banco", "Seu boleto vence hoje", "06:30", "1"]].map(([a, n, t, h, u]) => `
<div style="display:flex;align-items:center;gap:22px;padding:20px 28px;border-bottom:1px solid var(--line)"><span class="av" style="background:var(--brand)">${a}</span><div style="flex:1;min-width:0"><div class="nm">${n}</div><div style="font-size:26px;color:var(--subtle);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</div></div><div style="text-align:right"><div style="font-size:22px;color:var(--ok);font-weight:600">${h}</div><span style="display:inline-block;margin-top:6px;background:var(--wa);color:#fff;font-size:22px;font-weight:700;border-radius:99px;min-width:36px;padding:2px 10px;text-align:center">${u}</span></div></div>`).join("")}
<div style="display:flex;align-items:center;gap:22px;padding:20px 28px;background:#fff8d6"><span class="av">R</span><div style="flex:1"><div class="nm">Rafael</div><div style="font-size:26px;color:var(--subtle)"><span style="color:#53bdeb">✓✓</span> Proposta_Rafael_7kWp.pdf</div></div><div style="font-size:22px;color:var(--subtle)">sexta</div></div>
</div>`, true),
        legenda: `Fornecedor, grupo da obra, cliente pedindo visita, banco. Quando você chega no orçamento de sexta, ele já está lá embaixo.

Não é falta de interesse seu. É que o WhatsApp mostra primeiro quem falou por último, e quem recebeu proposta e ficou quieto vai descendo.

Também acontece aí? Comenta EU.

${TAGS}`,
    },
    {
        dia: "ter 27/10", hora: "11:30", formato: "Checklist salvável",
        html: shell("dark", `
<p class="kick">Salva pra próxima proposta</p>
<h1 class="d" style="font-size:80px;margin-top:26px">Antes de mandar a proposta pelo WhatsApp</h1>
<div style="margin-top:36px">
<div class="li"><span class="k n">1</span><span class="t">Escreva 3 linhas no texto.<small>Valor, parcela e economia na conta. Nem todo mundo abre o PDF.</small></span></div>
<div class="li"><span class="k n">2</span><span class="t">Pergunte quem mais decide.<small>Se a família decide junto, mande algo que dê pra mostrar em casa.</small></span></div>
<div class="li"><span class="k n">3</span><span class="t">Combine o próximo contato.<small>"Posso te chamar quinta pra tirar dúvida?"</small></span></div>
<div class="li"><span class="k n">4</span><span class="t">Anote o dia que mandou.<small>No 2º dia sem resposta, você chama de volta.</small></span></div>
</div>`),
        legenda: `Boa parte do follow-up acontece antes de mandar a proposta.

Quem combina o próximo contato na hora de mandar não precisa inventar desculpa pra chamar de volta: só cumpre o combinado.

Salva e usa na próxima proposta.

${TAGS}`,
    },
    {
        dia: "qua 28/10", hora: "07:30", formato: "Extra qualquer ramo: meme expectativa e realidade",
        html: shell("paper", `
<h1 class="d" style="font-size:64px">Expectativa:</h1>
<div style="margin-top:22px;background:var(--chat);border-radius:22px;padding:24px 26px;display:flex;flex-direction:column;gap:14px;border:1px solid var(--line)">
<div class="b o">Segue o orçamento!<span class="h">10:00 ✓✓</span></div>
<div class="b">Fechado! Quando a gente começa?<span class="h">10:04</span></div>
</div>
<h1 class="d" style="font-size:64px;margin-top:56px">Realidade:</h1>
<div style="margin-top:22px;background:var(--chat);border-radius:22px;padding:24px 26px;display:flex;flex-direction:column;gap:14px;border:1px solid var(--line)">
<div class="b o">Segue o orçamento!<span class="h">10:00 <span style="color:#53bdeb">✓✓</span></span></div>
<span class="day">3 dias depois</span>
<p style="align-self:center;font-size:30px;color:var(--subtle);padding:10px 0 4px">(silêncio)</p>
</div>`, true),
        legenda: `Ninguém manda orçamento esperando silêncio. Mas é o que mais acontece, em qualquer ramo.

Muitas vezes a diferença entre quem vende mais e quem vende menos não está no orçamento. Está no que acontece depois do silêncio.

Marca alguém que vive a realidade.

${TAGS_GERAL}`,
    },
    {
        dia: "qui 29/10", hora: "07:30", formato: "Mito ou verdade",
        html: shell("blue", `
<p class="kick">Mito</p>
<h1 class="d" style="font-size:96px;margin-top:20px;opacity:.75"><s style="text-decoration-thickness:8px">Chamar de volta é ser chato.</s></h1>
<p class="kick" style="margin-top:80px">Verdade</p>
<h2 class="d" style="font-size:96px;margin-top:20px;line-height:1.14"><span class="tarja">Chato é cobrar. Chamar com uma ajuda é atendimento.</span></h2>`),
        legenda: `"E aí, fechamos?" é cobrança. "Conseguiu olhar? Te mando a simulação com financiamento pra comparar com a sua conta" é atendimento.

O cliente sente a diferença.

Concorda? Comenta MITO ou VERDADE.

${TAGS}`,
    },
    {
        dia: "sex 30/10", hora: "07:30", formato: "Enquete nos comentários",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">Enquete</p>
<h1 class="d" style="font-size:150px;margin-top:30px;line-height:.98">Áudio <span class="m">ou texto?</span></h1>
<p class="sub" style="color:var(--muted)">Pra chamar de volta o cliente que sumiu depois do orçamento.</p>`, true),
        legenda: `Tem quem jure que áudio aproxima. Tem quem diga que ninguém escuta áudio de vendedor.

No seu caso, o que o cliente responde mais? Comenta ÁUDIO ou TEXTO.

${TAGS}`,
    },
    {
        dia: "sex 30/10", hora: "18:30", formato: "Fechamento da semana",
        html: shell("dark", `
<p class="kick">Sexta, fim do dia</p>
<h1 class="d" style="font-size:100px;margin-top:30px;line-height:1.06">Quantos orçamentos ficaram <span class="mb">sem resposta</span> essa semana?</h1>
<p class="sub" style="opacity:.85">Anota o número. Segunda você começa por eles.</p>`),
        legenda: `Antes de fechar a semana, abre o WhatsApp e conta: quantos clientes receberam orçamento e não responderam?

Não precisa chamar ninguém hoje. Só anota. Segunda de manhã, antes de qualquer lead novo, você começa por essa lista.

Comenta o seu número.

${TAGS}`,
    },
    {
        dia: "seg 02/11", hora: "07:30", formato: "Extra qualquer ramo: o que não mandar",
        html: shell("blue", `
<p class="kick">Pra quem sumiu depois do orçamento</p>
<h1 class="d" style="font-size:96px;margin-top:30px;line-height:1.1">3 mensagens que <span class="tarja">não funcionam</span></h1>
<div style="margin-top:46px">
<div class="li"><span class="k n">1</span><span class="t">"E aí, fechamos?"<small>Soa como cobrança.</small></span></div>
<div class="li"><span class="k n">2</span><span class="t">"Só passando pra lembrar."<small>Não dá motivo pra responder.</small></span></div>
<div class="li"><span class="k n">3</span><span class="t">"Consegue me dar um retorno?"<small>Pede trabalho pro cliente.</small></span></div>
</div>`),
        legenda: `As três têm o mesmo problema: pedem algo do cliente e não oferecem nada.

No lugar, manda uma pergunta e uma ajuda: "Conseguiu olhar o orçamento? Se ajudar, te mando [algo que facilite a decisão]."

Qual dessas você já mandou? Comenta 1, 2 ou 3.

${TAGS_GERAL}`,
    },
    {
        dia: "ter 03/11", hora: "07:30", formato: "Fatura contra parcela (exemplo)",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">Exemplo</p>
<h1 class="d" style="font-size:80px;margin-top:22px">Ele não compara preço com preço. <span class="m">Compara parcela com conta.</span></h1>
<div class="fat" style="margin-top:50px">
<div class="row"><span>Conta de luz hoje</span><b class="n" style="font-size:52px">R$ 680/mês</b></div>
<div class="row"><span>Parcela do sistema</span><b class="n" style="font-size:52px;color:var(--brand)">R$ 610/mês</b></div>
<div class="dash"></div>
<p style="font-size:26px;color:var(--subtle)">Valores de exemplo. Faça com os números do seu cliente.</p>
</div>`, true),
        legenda: `R$ 32 mil assusta. R$ 610 por mês no lugar de uma conta de R$ 680 é outra conversa.

Quando o cliente some depois da proposta, uma boa retomada é mandar essa comparação com os números dele. Ele entende sem precisar abrir o PDF de novo.

Valores de exemplo. Faça com os números do seu cliente.

${TAGS}`,
    },
    {
        dia: "qua 04/11", hora: "07:30", formato: "Extra qualquer ramo: dica",
        html: shell("dark", `
<p class="kick">Dica pra qualquer ramo</p>
<h1 class="d" style="font-size:120px;margin-top:30px;line-height:1.04">Orçamento bom <span class="mb">tem validade.</span></h1>
<p class="sub" style="opacity:.85">"Valores válidos até sexta" dá um motivo real pra voltar a conversa.</p>`),
        legenda: `Sem validade, o orçamento pode esperar pra sempre. Com validade, você tem um motivo honesto pra chamar de volta: "Oi, a proposta vale até sexta. Quer que eu segure esse valor pra você?"

Só vale se for verdade. Prazo inventado o cliente percebe.

${TAGS_GERAL}`,
    },
    {
        dia: "qui 05/11", hora: "07:30", formato: "Extra qualquer ramo: a pergunta que falta",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">A pergunta que falta no orçamento</p>
<h1 class="d" style="font-size:112px;margin-top:30px;line-height:1.04">Quem mais vai <span class="m">decidir com você?</span></h1>
<p class="sub" style="color:var(--muted)">Muito orçamento para porque quem pediu não decide sozinho.</p>`, true),
        legenda: `Sócio, marido, esposa, pai. Muitas vezes quem pede o orçamento não decide sozinho, e quem decide nunca viu a sua proposta.

Pergunta antes de mandar. Se tiver mais alguém, manda um resumo curto que dê pra mostrar em casa.

Você costuma perguntar isso? Comenta SIM ou NÃO.

${TAGS_GERAL}`,
    },
    {
        dia: "qui 05/11", hora: "11:30", formato: "Faz a conta (exemplo)",
        html: shell("blue", `
<p class="kick">Faz a conta</p>
<h1 class="d" style="font-size:92px;margin-top:26px">Uma venda a mais por mês <span class="tarja">muda o ano.</span></h1>
<div class="fat" style="margin-top:56px">
<div class="row"><span>Orçamento parado recuperado</span><b class="n" style="font-size:46px">1 por mês</b></div>
<div class="row"><span>Valor médio (exemplo)</span><b class="n" style="font-size:46px">R$ 25.000</b></div>
<div class="dash"></div>
<div class="row"><span>Em 12 meses</span></div>
<p class="n" style="font-size:150px;font-weight:700;line-height:1"><span class="m">R$ 300.000</span></p>
</div>`),
        legenda: `Não precisa recuperar todos os orçamentos parados. Um por mês já muda o ano.

Com valor médio de R$ 25 mil, são R$ 300 mil em 12 meses que vieram de clientes que já tinham pedido orçamento.

Faz com o seu valor médio e comenta o resultado.

${TAGS}`,
    },
    {
        dia: "sex 06/11", hora: "07:30", formato: "Convite para o Raio-X",
        html: shell("dark", `
<p class="kick">Raio-X grátis</p>
<h1 class="d" style="font-size:96px;margin-top:30px;line-height:1.06">Quantos orçamentos estão <span class="mb">parados</span> no seu WhatsApp agora?</h1>
<p class="sub" style="opacity:.85">O Raio-X mostra cada um, há quantos dias está parado e quanto eles somam.</p>`),
        legenda: `Você não precisa contar na mão.

O Raio-X do Vyzon lista os orçamentos que você mandou pelo WhatsApp nos últimos 90 dias e que ficaram sem resposta: há quantos dias cada um está parado, quanto eles somam e a mensagem pronta pra chamar cada cliente de novo. Nada é enviado pros seus clientes.

É grátis. Link na bio.

${TAGS}`,
    },
    {
        dia: "sex 06/11", hora: "18:30", formato: "Produto: como a aprovação funciona",
        html: shell("paper", `
<p class="kick" style="color:var(--brand);opacity:1">Como a aprovação funciona</p>
<h1 class="d" style="font-size:72px;margin-top:20px">A mensagem chega no seu WhatsApp. <span class="m">Você responde 1.</span></h1>
<div style="margin-top:40px">${wa(cliente("EVA", "Vyzon"), `
<div class="b" style="font-size:27px;max-width:94%">EVA [A2] rascunho pronto<br><br>Lead: Rafael<br>Por que agora: 2 dias sem resposta depois da proposta<br><br>Oi, Rafael, conseguiu olhar a proposta? Se ajudar, te mando a simulação com financiamento.<br><br>Responda A2 1 para enviar, A2 2 para descartar, ou escreva o texto corrigido.<span class="h">09:00</span></div>
<div class="b o" style="font-size:27px">1<span class="h">09:02 ✓✓</span></div>`)}</div>`, true),
        legenda: `Funciona assim: no 2º dia sem resposta, a EVA manda no seu WhatsApp o rascunho pra chamar o cliente de volta, com o motivo.

Você responde 1 e a mensagem sai do seu número. Responde 2 e ela é descartada. Ou escreve o texto do seu jeito no lugar. Mudou de ideia logo depois do 1? Manda "desfazer" em até 20 segundos.

Nada vai pro cliente sem você aprovar.

R$ 97 por mês, tudo liberado para até 10 pessoas. Link na bio.

${TAGS}`,
    },
];

// Reels de produto feitos na sessão de vídeos (~/Movies/vyzon-film/entregas).
export const REELS = [
    {
        dia: "qui 29/10", hora: "11:30", arquivo: "dia-2-final.mp4",
        legenda: `Mandou a proposta e o cliente sumiu?

No 2º dia sem resposta, a mensagem pra chamar de volta chega pronta no seu WhatsApp. Você responde 1 e ela sai do seu número. Nada vai pro cliente sem você aprovar.

A EVA sugere. Você aprova.

${TAGS}`,
    },
    // Fora da agenda de 03/11: voz e cartão ainda citam o preço de fundador,
    // que acabou em 01/11. Refazer o vídeo antes de publicar.
    {
        dia: "ter 10/11", hora: "11:30", arquivo: "parado-final.mp4",
        legenda: `Quanto dinheiro está parado no seu WhatsApp agora?

Cada proposta sem resposta é um cliente que já pediu orçamento. No 2º dia, a mensagem pra chamar de volta chega pronta no seu WhatsApp, e você aprova com 1.

Preço de fundador: R$ 97 por mês nos 3 primeiros meses para as 10 primeiras integradoras. Fale com o Markus pelo link da bio.

${TAGS}`,
    },
];

// Stories: 3 por dia útil. 08:00 dica, 12:00 aviso do post do dia, 19:30
// pergunta respondida por mensagem (o agendamento pode não aceitar enquete).
const story = (cls, inner, light = false) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}"><style>${css}html,body{width:1080px;height:1920px}.s{width:1080px;height:1920px;padding:260px 90px 340px;display:flex;flex-direction:column;justify-content:center;position:relative}</style></head><body>
<div class="s ${cls}">${inner}
<div class="foot" style="bottom:200px;color:${light ? "var(--ink)" : "#fff"}"><span>@vyzoncrm</span><span>vyzon.com.br</span></div>
</div></body></html>`;
const dica = (t) => story("blue", `<p class="kick">Dica do dia</p><h1 class="d" style="font-size:96px;margin-top:36px;line-height:1.08">${t}</h1>`);
const aviso = (n, t) => story("paper", `<p class="kick" style="color:var(--brand);opacity:1">Post novo no perfil</p>
<img src="../${n}.png" style="width:760px;margin-top:40px;border-radius:24px;box-shadow:0 2px 4px rgba(13,20,33,.08),0 40px 80px -40px rgba(13,20,33,.55);align-self:center">
<h2 class="d" style="font-size:64px;margin-top:56px">${t}</h2>`, true);
const pergunta = (t) => story("dark", `<p class="kick">Responde aqui</p><h1 class="d" style="font-size:96px;margin-top:36px;line-height:1.08">${t}</h1>
<p class="sub" style="opacity:.8;font-size:40px">Manda a resposta por mensagem neste story.</p>`);

const DIAS = ["seg 26/10", "ter 27/10", "qua 28/10", "qui 29/10", "sex 30/10", "seg 02/11", "ter 03/11", "qua 04/11", "qui 05/11", "sex 06/11"];
const DICAS = [
    "Mandou proposta hoje? Anota o dia. <span class=\"tarja\">Daqui 2 dias você chama de volta.</span>",
    "Junto do PDF, manda 3 linhas no texto: <span class=\"tarja\">valor, parcela e economia na conta.</span>",
    "Antes de mandar a proposta, pergunta: <span class=\"tarja\">quem mais vai decidir com você?</span>",
    "Visualizou e não respondeu <span class=\"tarja\">ainda não é um não.</span>",
    "Chamar de volta com uma ajuda <span class=\"tarja\">não é cobrança. É atendimento.</span>",
    "Segunda de manhã: <span class=\"tarja\">começa pelos orçamentos parados</span> antes de buscar lead novo.",
    "Troca \"e aí, fechamos?\" por <span class=\"tarja\">\"conseguiu olhar a proposta?\"</span>",
    "Na hora de mandar, combina: <span class=\"tarja\">\"posso te chamar quinta?\"</span>",
    "Orçamento com validade <span class=\"tarja\">dá motivo pra voltar a conversa.</span>",
    "Sexta é dia de olhar <span class=\"tarja\">quem ficou sem resposta na semana.</span>",
];
// Post do dia que o aviso mostra: o das 11:30, ou o das 07:30 quando 11:30 é reel.
const AVISOS = [
    ["01", "Desistiu ou só esqueceu?"], ["17", "Antes de mandar a proposta pelo WhatsApp"], ["03", "De cada 5 orçamentos, 4 não viram venda"],
    ["19", "Mito ou verdade?"], ["05", "O que o cliente quer dizer com \"vou pensar\""], ["06", "O Fio B sobe todo ano"],
    ["23", "Parcela contra conta de luz"], ["08", "O cliente abriu a proposta. E aí?"], ["26", "Uma venda a mais por mês muda o ano"],
    ["10", "Mandou. Viu. Sumiu."],
];
const PERGUNTAS = [
    "Quantos orçamentos estão sem resposta no seu WhatsApp hoje?",
    "Você chama de volta no dia seguinte, depois de uma semana ou nunca?",
    "Qual você mais escuta: \"vou pensar\", \"tá caro\" ou \"vou ver em casa\"?",
    "Você manda áudio ou texto pra chamar o cliente de volta?",
    "Já perdeu venda por esquecer de chamar de volta? Conta aqui.",
    "Quantas conversas abertas tem no seu WhatsApp agora?",
    "Quem cuida do follow-up aí: você ou o vendedor?",
    "Você dá desconto pra fechar? Sim ou não.",
    "Qual o valor médio dos seus orçamentos?",
    "Quantos orçamentos você chamou de volta essa semana?",
];
export const STORIES = DIAS.flatMap((dia, i) => [
    { dia, hora: "08:00", tipo: "Dica", html: dica(DICAS[i]) },
    { dia, hora: "12:00", tipo: `Aviso do post ${AVISOS[i][0]}`, html: aviso(...AVISOS[i]) },
    { dia, hora: "19:30", tipo: "Pergunta", html: pergunta(PERGUNTAS[i]) },
]);

mkdirSync(new URL("./stories/", import.meta.url), { recursive: true });

const shot = (w, h, png, html) =>
    `"$B" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=${w},${h} --screenshot="$PWD/${png}" "file://$PWD/${html}" >/dev/null 2>&1`;
const sh = ["#!/bin/zsh", 'cd "$(dirname "$0")"', 'B="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"'];
POSTS.forEach((p, i) => {
    const n = String(i + 1).padStart(2, "0");
    writeFileSync(new URL(`./${n}.html`, import.meta.url), p.html);
    sh.push(shot(1080, 1350, `${n}.png`, `${n}.html`));
});
STORIES.forEach((s, i) => {
    const n = `s${String(i + 1).padStart(2, "0")}`;
    writeFileSync(new URL(`./stories/${n}.html`, import.meta.url), s.html);
    sh.push(shot(1080, 1920, `stories/${n}.png`, `stories/${n}.html`));
});
writeFileSync(new URL("./render.sh", import.meta.url), sh.join("\n") + "\n");

// Ordem de publicação: dia e hora ("seg 26/10" + "07:30").
const chave = (d, h) => d.slice(7, 9) + d.slice(4, 6) + h;
const agenda = [
    ...POSTS.map((p, i) => ({ ...p, id: String(i + 1).padStart(2, "0"), tipo: "Post" })),
    ...REELS.map((r, i) => ({ ...r, id: `R${i + 1}`, tipo: "Reel" })),
].sort((a, b) => chave(a.dia, a.hora).localeCompare(chave(b.dia, b.hora)));

const md = [
    "# Instagram @vyzoncrm: 26/10 a 06/11/2026",
    "",
    "Três posts por dia útil, às 07:30 (antes da obra), 11:30 (almoço) e 18:30 (fim do dia), e três stories, às 08:00, 12:00 e 19:30.",
    "Os posts 11, 12, 13, 18, 22, 24 e 25 são para qualquer ramo; a oferta continua sendo para integradora solar.",
    "",
    "## Agenda",
    "",
    "| Dia | Hora | Peça | Formato |",
    "|---|---|---|---|",
    ...agenda.map((a) => `| ${a.dia} | ${a.hora} | ${a.tipo} ${a.id} | ${a.formato ?? a.arquivo} |`),
    "",
    "## Stories",
    "",
    "| Dia | Hora | Arquivo | Tipo |",
    "|---|---|---|---|",
    ...STORIES.map((s, i) => `| ${s.dia} | ${s.hora} | stories/s${String(i + 1).padStart(2, "0")}.png | ${s.tipo} |`),
    "",
    "## Reels",
    "",
];
REELS.forEach((r, i) => md.push(`### R${i + 1} · ${r.dia}, ${r.hora}`, "", `Arquivo: ~/Movies/vyzon-film/entregas/${r.arquivo}`, "", "```", r.legenda, "```", ""));
md.push("## Posts", "");
POSTS.forEach((p, i) => {
    const n = String(i + 1).padStart(2, "0");
    md.push(`### ${n} · ${p.dia}, ${p.hora}`, "", `Formato: ${p.formato}`, "", `![](${n}.png)`, "", "```", p.legenda, "```", "");
});
writeFileSync(new URL("./calendario.md", import.meta.url), md.join("\n"));
console.log(`${POSTS.length} posts, ${REELS.length} reels e ${STORIES.length} stories gerados`);
