---
name: vyzon-landing-art-director
description: Use ao criar, refatorar ou polir a home do Vyzon (src/pages/SolarLanding.tsx) e as páginas por ângulo /raio-x/:angulo. Fixa o público (dono de integradora solar que vende pelo WhatsApp), a ordem das seções, a direção visual direta (Satoshi 900, botão preto com WhatsApp) e o que as páginas brasileiras de referência fazem e o Vyzon não copia.
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
   Depois vêm o botão principal "Falar com o Markus no WhatsApp" e quem
   responde ("Quem responde é o Markus, que criou o Vyzon. Sem compromisso").
   Logo abaixo, a linha de preço de fundador e, por último, um link discreto
   para o Raio-X automático.
   À direita (abaixo, no celular), a **proposta de exemplo**: capa com módulos
   sobre telhado de cerâmica, dados de sistema, carimbo "2 dias sem resposta"
   e o aviso que chega no WhatsApp.
2. **Números de mercado com fonte** (Greener, Opinion Box e Mobile Time) no
   lugar de depoimento, porque ainda não há cliente pagante para citar. Só
   número de fora: afirmação do Vyzon não entra vestida de estatística.
3. **Calculadora**: o dono informa quantos orçamentos ficaram sem resposta
   no último mês e o valor médio. A conta vai na mensagem do WhatsApp para o
   Markus. É a pergunta que valida o ICP. Evento `calc_use`. O resultado tem
   cara de fatura ("Sua conta do último mês").
4. **Mock do produto**: lista de propostas e a aprovação no WhatsApp, no
   formato real de `_shared/whatsappApproval.ts`.
5. **Como funciona como linha do tempo da proposta**: uma vez (conecta o
   WhatsApp), dia 0 (manda orçamento como sempre), dia 1 (cliente visualiza
   e não responde), dia 2 (chega o aviso, único marcador amarelo).
6. **Incluso + cartão de preço**: só o que existe no app. Preço de fundador
   R$ 97/mês nos 3 primeiros meses para as 10 primeiras integradoras, depois
   R$ 197/mês. Sem contrato (confirmado pelo Markus em 19/10/2026).
7. **Objeções reais**, com as frases acima e a resposta de cada uma.
8. **FAQ**, espelhado no FAQPage do `index.html`.
9. **Bloco final do Markus**: "20 minutos comigo pelo WhatsApp", a
   apresentação dele, o botão do WhatsApp e o formulário "Quero que o Markus
   me chame" (`demo_requests`, source `orcamento_teste`).

O botão principal da página inteira é a conversa com o Markus no WhatsApp.
Conectar o WhatsApp num site recém-conhecido é pedir demais para o primeiro
contato: na campanha de out/2026 foram 115 visitas, 9 cliques no botão e 0
cadastros.

## Direção visual: "do telhado ao WhatsApp" (LP.7, 22/10/2026)

A página fala a língua do integrador. A personalidade vem de objetos do dia a
dia dele, não de enfeite de SaaS: a **proposta de energia solar** (com capa
de módulos e carimbo de estado), a **fatura** e o **sol**. Bloco LP.7 em
`src/index.css`.

- Títulos em Satoshi 900 (`.lp-bold`), sans direta e grande. Sem serifa nos
  títulos. A serifa itálica só aparece nas falas da seção de objeções, com as
  aspas em amarelo.
- Corpo em Geist/Inter, 15 a 19px, cor `--lp-ink-70`.
- Botão principal: pill preto, texto branco, ícone do WhatsApp
  (`WhatsAppIcon`) à esquerda. Fundo escuro pede botão claro.
- Amarelo de sol (`--lp-sun` #f5b400) só como PREENCHIMENTO: marca-texto no
  fim do título (`.lp-mark`, `.lp-mark--draw` no topo), no total da
  calculadora, carimbos (`.lp-stamp`), etiqueta "Fundador", célula que marca
  cada seção (`.lp-cell` dentro do `Eyebrow`) e faixa da calculadora
  (`--lp-sun-soft`). Texto amarelo sobre papel não passa em contraste: para
  texto use `--lp-sun-deep`.
- Verde `--lp-live` só nos checks do incluso. Roxo `#6d28d9` só como
  micro-acento da EVA. O azul `--lp-blue` saiu do título.
- Módulo fotovoltaico desenhado em CSS (`.lp-panel`). Sem foto de banco de
  telhado ou de "equipe": foto de cliente que não existe é depoimento
  inventado. Foto real (do Markus, de integradora parceira com autorização)
  entra quando existir.
- Todas as seções na mesma grade: `max-w-[1120px]`, `px-4 sm:px-5 md:px-8`,
  título alinhado à esquerda. Nada de coluna estreita centralizada.
- Ritmo de fundo: papel, faixa amarela (calculadora), escuro (mock), papel,
  escuro (objeções), papel. Nunca dois blocos escuros colados.
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
