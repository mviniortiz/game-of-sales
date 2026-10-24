# EDL · parado

Reel vertical 1080×1920, 60 qps, 24 s. Registro **Vyzon Solar** (mesmos tokens
do `dia-2`). Território **A · Raio-X**: muitas propostas paradas, o valor parado
somado, uma prioridade (Carlos, 2º dia) e o preço de fundador. Uma grande ideia
visual: **a fatura do dinheiro parado**, no molde da conta de luz.

Público: dono de integradora solar que vende pelo WhatsApp. Uso: anúncio de
meio/fundo de funil (traz o preço) e post fixado.

## Promessas (todas conferidas no código em 23/10/2026)

| Promessa na tela ou na voz | Onde existe |
|---|---|
| "Quanto dinheiro está parado no seu WhatsApp agora?" | Ângulo "parado" da home: `src/pages/SolarLanding.tsx` `ANGLES.parado` |
| "12 propostas sem resposta: R$ 300 mil parados" (12 × R$ 25 mil) | Mesma conta da copy em produção: `ANGLES.parado.sub` ("Doze propostas de R$ 25 mil sem resposta são R$ 300 mil…"). Linhas da fatura são **ilustrativas** e somam R$ 300.000 |
| Fatura "Propostas sem resposta" com valor e "há N dias" | `src/config/plans.ts` (feature "Placar de propostas: quanto está parado e há quantos dias"; "Valor da proposta lido direto do PDF"); formato "há 2 dias" de `src/lib/quoteText.ts` `ago()`. A fatura é o objeto gráfico do design system, não print de tela do app |
| Aviso no 2º dia, texto do aviso, "1", "Sai em 20 segundos…" | Igual ao `dia-2` (ver EDL de lá): `eva-quote-followup`, `_shared/whatsappApproval.ts` |
| "Preço de fundador: R$ 97/mês nos 3 primeiros meses para as 10 primeiras integradoras. Depois, R$ 197 por mês. Sem contrato." | `src/config/plans.ts` (comentário de cabeçalho e `monthlyPrice: 197`) + `SolarLanding.tsx` `PriceLine` |
| CTA "Fale com o Markus no WhatsApp · vyzon.com.br" | `SolarLanding.tsx` `WhatsappCta` + `src/config/contact.ts` |

## Batidas e cenas

`B(k) = 0,017 + k × 0,4879 s` (House 02, 122,99 BPM). Tempos em `roteiro.json`.

| Batida | Tempo | Tela | Movimento que prova | Voz (Nassif) | Som |
|---|---|---|---|---|---|
| B0 | 0,02 | Gancho: "Quanto dinheiro está **parado** no seu WhatsApp?" (quadro 0) | marca-texto (B1); três fichas de valor aparecem uma por batida (B3–B5) | "Quanto dinheiro está parado no seu WhatsApp agora?" | hook-thud; pop-light B3–B5 |
| B7 | 3,43 | Fatura "Propostas sem resposta · Outubro" | uma linha por meia batida (B8–B10,5); total conta 0 → R$ 300 mil (B12–B14); carimbo "Parado" (B15,5) | "Doze propostas sem resposta: trezentos mil reais parados." | trilha abafada (1,1 kHz); zoom-air; tick B8–B10; thud no carimbo |
| B17 | 8,31 | A linha do Carlos (2 dias) acende, o resto apaga | barra azul na linha | | |
| B18 | 8,80 | Virada: "Aviso do Vyzon"; aviso nasce em B19 | câmera 1,03; EvaBot lê e acende | "No segundo dia, a mensagem pra chamar de volta chega pronta no seu WhatsApp." | trilha abre; riser até B19; notify |
| B28 | 13,68 | Dono responde "1"; EVA: "Sai em 20 segundos…" (B29,5) | rolo da conversa acompanha | | approve-click; pop-light |
| B32 | 15,63 | Cartão "Preço de fundador": R$ 97/mês (B33) | número fica azul com pulso quando a voz diz "noventa e sete" (B35); condições entram B37,5–B39,5 | "Preço de fundador: noventa e sete reais por mês nos três primeiros meses." | zoom-air; payoff B35 |
| B44 | 21,48 | CTA: logo, frase do público, botão, vyzon.com.br | duas batidas | "Fale com o Markus no WhatsApp." | zoom-air; trilha sai em 1,2 s |

Legenda da narração só na fatura e no aviso; no gancho, no preço e no CTA a
tela já diz o mesmo.

## Voz

Nassif, `eleven_v4`, uma frase por geração, duas tomadas. Tomadas: P1-t2,
P2b-t2, L3-t1, P5b-t1, L6-t1. As versões longas (P2, P5, 6,5 s cada) estouravam
os 25 s e foram reescritas curtas; o preço falado diz só "nos três primeiros
meses" e a tela completa a condição (10 primeiras integradoras, depois R$ 197).

## Variação

Nenhuma nesta rodada. Próximo teste declarado: gancho com o número
("R$ 300 mil parados no WhatsApp?") no lugar da pergunta.
