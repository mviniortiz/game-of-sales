---
name: vyzon-landing-art-director
description: Use ao criar, refatorar ou polir a home do Vyzon (src/pages/SolarLanding.tsx) e as páginas por ângulo /raio-x/:angulo. Fixa o público (dono de integradora solar que vende pelo WhatsApp), a ordem das seções, a direção visual do sistema EVA em campo (a EVA como estrela, creme, faixas de sol e noite, Geist, fatura e conversa) e o que as páginas brasileiras de referência fazem e o Vyzon não copia.
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
topo (Raio-X, placar, rascunho, aprovação A2). A Lume entra no topo já
explicada: "a Lume, assistente do Vyzon".

## Ordem das seções (página curta de 04/11/2026)

Dado de 30 dias (`landing_events`): 665 sessões, 69 passaram do topo, 17
clicaram no botão do topo, 13 criaram a conta. O topo decide quase tudo.

Nomes: Vyzon é o produto, a Lume é quem faz o trabalho. O aviso real no
WhatsApp começa com "Lume" (`EVA_PREFIX`), e o celular do topo também.

Um botão só na página inteira, sempre "Ver minhas propostas paradas", sempre
para `/criar-conta?segmento=energia_solar`. Embaixo do botão do topo:
"Grátis e sem cartão. Você cria a conta, conecta o WhatsApp e em uns 3 minutos
vê as propostas paradas dos últimos 90 dias." (SignupV2 + RaioXAuto).

1. **Topo**: linha de dor, título com promessa e prazo, subtítulo que
   apresenta a Lume como assistente do Vyzon (responde 1, sai do seu número,
   nada vai sem aprovar), o botão e a linha de baixo. À direita (abaixo, no
   celular), o aviso da Lume no WhatsApp do dono (`AvisoDemo`).
2. **Números**: só o 18% da Greener (1º sem. 2026), numa faixa fina.
3. **Como funciona** em 3 passos (manda a proposta, no 2º dia a Lume avisa,
   responde 1 e sai), com a lista de propostas que entram sozinhas ao lado.
   Conectar o WhatsApp vira uma linha de rodapé da seção.
4. **Objeções reais** (as 4 mais fortes), em faixa sol.
5. **Preço**: 3 itens que servem ao objetivo e o cartão noite das 10
   primeiras (R$ 0 para sempre; o time libera e avisa no WhatsApp; da 11ª em
   diante, preço de `plans.ts`; sem contrato). Escala é só um link de texto.
6. **FAQ** curto, espelhado no FAQPage do `index.html`. É o único lugar com
   o nome Raio-X, explicado na mesma frase.
7. **Fim** (`#raio-x`): o mesmo botão. O rodapé tem o suporte no WhatsApp.

Saíram em 04/11/2026: calculadora (o número grande seguido de "nem tudo isso
volta" fazia a pessoa desconfiar), mock repetido do produto, "Conheça a Lume" e
a linha do tempo de 4 dias. Não volte a contar o ciclo mais de uma vez.

## Direção visual: sistema "EVA em campo" (LP.9, 01/11/2026)

A fonte de verdade é o conceito A aprovado pelo Markus:
https://claude.ai/artifact/L2qfp4yTM3RBvSL3yN5mjo. No código, o bloco LP.9 de
`src/index.css` (escopo `.lp-solar`, classes `vs-*`) e
`src/pages/SolarLanding.tsx`. Pesquisa de marcas de 01/11/2026: a categoria no
Brasil é escura com âmbar ou neon (SolarMarket, Solfácil) e nenhum concorrente
tem personagem, então a EVA é a estrela.

- A Lume (`EvaBot`) aparece em toda faixa forte, sentada na borda de cima de um
  cartão (`EvaSentada`).
- A demo do topo (`src/components/landing/AvisoDemo.tsx`) usa o kit Stageshow de
  Benji Taylor (MIT), copiado em `src/vendor/stageshow`, e carrega em pedaço
  separado. Tela de produto ilustrada segue as regras dessa skill.
- Topo em creme com o amarelo só como palco do celular e da EVA (`.vs-topo`).
  Amarelo na tela inteira foi rejeitado pelo Markus em 01/11/2026.
- Ritmo de fundo, sempre em cor chapada: topo, creme, sol `.vs-sol`
  (objeções), creme com o cartão noite do preço, creme. Faixas iguais nunca
  ficam coladas. Cartão branco sem sombra, raio de 22px, volta às cores do papel
  sozinho (`.vs-fatura`, `.vs-conversa`, `.vs-cartao`).
- Geist, a mesma fonte do app, em tudo: 600 com letras fechadas nos títulos
  (`.vs-display`) e nos números grandes (`.vs-num`), regular no texto.
- Marca-texto `.vs-marca` atrás de texto `--lp-ink`, uma vez por tela: branco em
  sol, sol em branco. Azul `.vs-azul` só na segunda metade de título sobre creme,
  em links e no corpo da EVA.
- Objetos gráficos: o celular do topo, a lista de propostas e o carimbo de
  estado, sempre com a palavra.
- Botão principal `.vs-btn`: pill `--lp-ink`, sombra dura azul no hover. Sobre noite, `.vs-btn--sol`.
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
- O link de suporte do rodapé usa `CONTACT.defaultMessage` e não vira lead de
  anúncio. Se um botão de venda pelo WhatsApp voltar, a mensagem precisa conter
  "Quero ver quanto está parado nos meus orçamentos"
  (`20261009_automations_ad_leads.sql`).
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
2. O botão principal aparece na primeira tela do celular (375px)?
3. Toda afirmação de produto existe no código e todo número tem fonte?
4. Algum termo interno (Raio-X, Lume, A2) aparece sem explicação na mesma frase?
   Todo botão tem o mesmo texto e o mesmo destino?
5. `<noscript>` e FAQPage do `index.html` batem com a página?
6. Prints em 375px e 1366px sem rolagem lateral, e `tsc` + `npm run build`
   passando.
