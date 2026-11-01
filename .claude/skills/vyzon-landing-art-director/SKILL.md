---
name: vyzon-landing-art-director
description: Use ao criar, refatorar ou polir a home do Vyzon (src/pages/SolarLanding.tsx) e as páginas por ângulo /raio-x/:angulo. Fixa o público (dono de integradora solar que vende pelo WhatsApp), a ordem das seções, a direção visual do sistema EVA em campo (a EVA como estrela, faixas de sol e noite, Gabarito, fatura e conversa) e o que as páginas brasileiras de referência fazem e o Vyzon não copia.
---

# Diretor de arte da landing do Vyzon

Você cuida da home do Vyzon. A fonte de verdade é o que está em produção:
`src/pages/SolarLanding.tsx`, `index.html` (title, FAQPage e `<noscript>`)
e a classe `.lp-bold` em `src/index.css`. Leia esses arquivos antes de
propor mudança. Se esta skill e o código discordarem, vale o código, e esta
skill deve ser corrigida na mesma entrega.

## Para quem é a página

Dono de integradora de energia solar que vende pelo WhatsApp. Pequena
empresa, vive no celular, está em cima de telhado boa parte do dia,
desconfia de software e já ouviu promessa de CRM antes.

O que ele diz (prospecção de out/2026, palavra por palavra) e a página
responde:

- "Quem visualiza e some não tem interesse."
- "Meu sistema de proposta já avisa quando o cliente abre."
- "Já tenho CRM."
- Falta de tempo pra mais um sistema e medo de robô falar com cliente.

Fale a língua dele: orçamento, proposta, conta de luz, kWp, telhado,
"vou ver em casa", parcela, financiamento. Evite vocabulário do produto no
topo (Raio-X, EVA, placar, rascunho, aprovação A2).

## Ordem das seções (molde de 19/10/2026)

1. **Topo**: linha de dor ("Mandou o orçamento de energia solar e o cliente
   sumiu?"), título com promessa e prazo ("No 2º dia sem resposta, a
   mensagem pra chamar de volta chega pronta no seu WhatsApp"), subtítulo
   com o mecanismo (responde 1, sai do seu número, nada vai sem aprovar).
   Depois vêm o botão principal "Me mostra quanto tá parado" e a linha "Abre no
   seu WhatsApp. Quem responde é o Markus, que criou o Vyzon."
   Logo abaixo, a linha de preço de fundador e, por último, um link discreto
   para a calculadora, que não pede conexão.
   À direita (abaixo, no celular), o **aviso no WhatsApp do dono** (objeto
   Conversa): mensagem pronta para o Carlos, "Responda 1", o 1 e "Enviada".
2. **Números de mercado com fonte** (NumeroComFonte): 18% de conversão e 25
   orçamentos por mês, Greener 1º semestre de 2026, no lugar de depoimento.
   Só número de fora, com estudo e período.
3. **Calculadora** em faixa noite (`#conta`), o caminho sem conectar nada: o dono
   informa quantos orçamentos manda por mês, quantos viram venda e o valor médio,
   números que ele sabe de cabeça. Começa na média da Greener e o resultado sai na
   Fatura. A conta vai na mensagem do WhatsApp para o Markus. Evento `calc_use`.
4. **Mock do produto**, claro: lista de propostas com carimbos de estado e a
   conversa do Carlos depois da aprovação.
5. **Conheça a EVA**: cartão noite largo, bot grande cortado pela borda, passando
   pelos estados com legenda. É aqui que o nome EVA é apresentado.
6. **Como funciona como linha do tempo da proposta**: uma vez (conecta o
   WhatsApp), dia 0 (manda orçamento como sempre), dia 1 (cliente visualiza
   e não responde), dia 2 (chega o aviso, único cartão noite).
7. **Incluso + cartão de preço**: só o que existe no app. Preço de fundador
   R$ 97/mês nos 3 primeiros meses para as 10 primeiras integradoras, depois
   R$ 197/mês. Sem contrato (confirmado pelo Markus em 19/10/2026).
8. **Objeções reais**, com as frases acima e a resposta de cada uma.
9. **FAQ**, espelhado no FAQPage do `index.html`.
10. **Bloco final do Markus**: "20 minutos comigo pelo WhatsApp", a
   apresentação dele, o botão do WhatsApp e o formulário "Quero que o Markus
   me chame" (`demo_requests`, source `orcamento_teste`).

O botão principal da página inteira é a conversa com o Markus no WhatsApp.
Conectar o WhatsApp num site recém-conhecido é pedir demais para o primeiro
contato: na campanha de out/2026 foram 115 visitas, 9 cliques no botão e 0
cadastros.

## Direção visual: sistema "EVA em campo" (LP.9, 01/11/2026)

A fonte de verdade é o conceito A aprovado pelo Markus:
https://claude.ai/artifact/L2qfp4yTM3RBvSL3yN5mjo. No código, o bloco LP.9 de
`src/index.css` (escopo `.lp-solar`, classes `vs-*`) e
`src/pages/SolarLanding.tsx`. Pesquisa de marcas de 01/11/2026: a categoria no
Brasil é escura com âmbar ou neon (SolarMarket, Solfácil) e nenhum concorrente
tem personagem, então a EVA é a estrela.

- A EVA (`EvaBot`) aparece em toda faixa forte, sentada na borda de cima de um
  cartão (`EvaSentada`). A seção `ConhecaEva` a apresenta de perto.
- A demo do topo (`src/components/landing/AvisoDemo.tsx`) usa o kit Stageshow de
  Benji Taylor (MIT), copiado em `src/vendor/stageshow`, e carrega em pedaço
  separado. Tela de produto ilustrada segue as regras dessa skill.
- Ritmo de fundo, sempre em cor chapada: sol `.vs-sol` (topo), creme, noite
  `.vs-noite` (calculadora), creme, sol (objeções), creme. Faixas iguais nunca
  ficam coladas. Cartão branco sem sombra, raio de 22px, volta às cores do papel
  sozinho (`.vs-fatura`, `.vs-conversa`, `.vs-cartao`).
- Gabarito é a família única: 900 nos títulos (`.vs-display`) e nos números
  grandes (`.vs-num`), regular no texto.
- Marca-texto `.vs-marca` atrás de texto `--lp-ink`, uma vez por tela: branco em
  sol, sol em branco. Azul `.vs-azul` só na segunda metade de título sobre creme,
  em links e no corpo da EVA.
- Objetos gráficos: Fatura, Conversa, LinhaDoTempo com a EVA em cada dia (só o
  Dia 2 em noite) e carimbo de estado, sempre com a palavra.
- Botão principal `.vs-btn`: pill `--lp-ink`, ícone do WhatsApp em círculo verde,
  sombra dura azul no hover. Sobre noite, `.vs-btn--sol`.
- Foto real (do Markus, de integradora parceira com autorização) entra quando
  existir. A EVA ocupa esse lugar até lá; banco de imagem e telhado com painel
  ficam de fora, porque foto de cliente que não existe é depoimento inventado.
- Todas as seções na mesma grade: `max-w-[1120px]`, `px-4 sm:px-5 md:px-8`,
  título alinhado à esquerda.
- Mobile primeiro: CTA visível na primeira tela, nada de rolagem lateral,
  inputs com 16px ou mais, botão que não cabe vira largura total.

## Regras duras (do game-of-sales/CLAUDE.md)

- Sem travessão, sem emoji, sem ícones Sparkles/Zap, sem orbe ou glow de IA.
- Claims Policy: só feature que existe no código, só número com fonte.
  Antes de escrever copy de produto, grep.
- EVA assistida: interno automático, saída pro lead sempre aprovada pelo
  dono. Nunca "automatize suas vendas" nem "robô que vende sozinho".
- Toda mensagem de WhatsApp da página precisa conter o prefill da automação
  de leads, "Quero ver quanto está parado nos meus orçamentos"
  (`20261009_automations_ad_leads.sql`). Sem isso a conversa não vira lead.
- Mudou texto da página: atualize o `<noscript>` e o FAQPage do
  `index.html` na mesma entrega.
- Preço vem de `src/config/plans.ts`. Contato vem de `src/config/contact.ts`.

## Referências brasileiras (levantadas em 19/10/2026)

Não existe taxa de conversão pública. O sinal é o anúncio que segue rodando
na Meta Ads Library, porque ninguém paga meses por página que não vende.

| Página | Sinal | O que o Vyzon pegou |
|---|---|---|
| Heliux, grupoheliux.com/botstark/lp | 4 anúncios ativos desde 05/10/2026 | Promessa com prazo no título, preço no topo, "pelo WhatsApp mesmo", lista do incluso, sem contrato |
| Pacote de Leonardo Moura, site.educacaoexemplar.com | Anúncio ativo desde 22/08/2026, o mais antigo do nicho | Lista concreta do que a pessoa recebe |
| Azume, assineazume.com.br | 4 anúncios para a mesma página | Pergunta interativa logo no começo |
| InfinitePay, infinitepay.io | Escala (6 milhões de clientes declarados) | Números grandes com fonte, título direto em letra forte |

O que essas páginas fazem e o Vyzon não copia: contagem regressiva falsa,
"oferta só hoje", emoji, pilha de bônus com valor inventado e depoimento sem
cliente real.

## Conferência antes de entregar

1. Em 5 segundos dá para entender para quem é, o que faz e quanto custa?
2. O botão do WhatsApp aparece na primeira tela do celular (375px)?
3. Toda afirmação de produto existe no código e todo número tem fonte?
4. Algum termo interno (Raio-X, EVA, A2) aparece antes da metade da página
   sem explicação?
5. `<noscript>` e FAQPage do `index.html` batem com a página?
6. Prints em 375px e 1366px sem rolagem lateral, e `tsc` + `npm run build`
   passando.
