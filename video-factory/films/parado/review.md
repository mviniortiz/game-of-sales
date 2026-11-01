# Review · parado

Data: 2026-10-24 · Revisor: Claude (sessão do Mac) · Arquivo: `parado-final.mp4`
(1080×1920, h264 60 qps + AAC 48 kHz, 24,0 s; render 4K/60 high crf 15 →
Lanczos 1080). Revisão: `parado-rev.mp4`.

## Como foi assistido

- Folha a cada 1,5 s, folha densa a cada 0,75 s com as transições (3,4; 3,6;
  7,7; 8,4; 8,75; 8,9; 9,4; 15,55; 15,75; 17,2; 20,95; 21,1 s) e folha do
  fechamento a cada ~0,6 s (15,7 a 23,6 s).
- `hyperframes check`: 0 erro, 0 aviso; contraste AA em 44/44 textos; "info" de
  `container_overflow` intencionais (rolo da conversa, logo).
- `screening.mjs`: -14,16 LUFS, pico real -2,09 dBTP, LRA 1,3; sem silêncio
  > 0,4 s; sem zona morta > 2 s; 16 efeitos na batida.
- Mix: voz 11,2 dB acima da trilha; nenhuma frase empurrada.
- Transcrição `scribe_v1` das tomadas: idêntica ao roteiro ("R$300.000" e
  "R$ 97" são o scribe escrevendo os números; "Marcos" = "Markus").
- Transcrição do mix final (voz + trilha + efeitos), ElevenLabs Speech to Text
  em 24/10/2026: "[música eletrônica] Quanto dinheiro está parado no seu
  WhatsApp agora? Doze propostas sem resposta, trezentos mil reais parados. No
  segundo dia, a mensagem pra chamar de volta chega pronta no seu WhatsApp.
  Preço de fundador: noventa e sete reais por mês nos três primeiros meses.
  Fale com o Marcos no WhatsApp." Idêntica ao roteiro; a trilha aparece como
  evento, sem cobrir palavra.

## Nota (0–2; † precisa de 2)

| # | Critério | Nota | Por quê |
|---|---|---|---|
| 1 | Hook nos primeiros 3 s † | 2 | "Quanto dinheiro está parado no seu WhatsApp?" no quadro 0, marca-texto em "parado" em 0,5 s, três valores de proposta entrando na batida. |
| 2 | Dor específica do integrador | 2 | Fatura de propostas sem resposta com kWp, dias parados e valor; total conta até R$ 300 mil; carimbo "Parado". |
| 3 | Fidelidade ao produto † | 2 | Conta de 12 × R$ 25 mil igual à copy em produção; aviso, "1" e "Sai em 20 segundos…" do código; preço de `plans.ts` e da home. Linhas da fatura marcadas como ilustrativas na EDL. |
| 4 | Humano aprova visível † | 2 | O "1" do dono e a confirmação com "desfazer" aparecem na tela antes de qualquer envio. A voz deste filme não repete a aprovação (o tempo foi para o preço); a tela carrega. |
| 5 | Identidade Vyzon | 2 | Fatura e conversa como objetos, Barlow nos números, azul no total e no preço, marca-texto uma vez por cena, logo só no fim. |
| 6 | Leitura mobile | 1 | Números grandes e preço muito legíveis; a fatura tem 6 linhas de 38 px que passam em ~5 s e o aviso tem a mesma densidade do `dia-2`. |
| 7 | Ritmo nativo | 2 | 24 s, linhas da fatura em meia batida, contagem sincronizada com "trezentos mil", pulso do preço quando a voz diz o número. |
| 8 | Ausência de sinais de IA genérica † | 2 | Nada de orbe, partícula, gradiente, stock ou promessa de automação. |
| 9 | Som e voz | 2 | Tomadas transcritas sem erro, voz 11 dB acima da trilha, trilha abafada na fatura e aberta na virada. Mix final transcrito sem erro. |
| 10 | Acabamento técnico | 2 | Mesmo padrão do `dia-2`: 60 qps, 4K → Lanczos, -14 LUFS, pico < -1,5 dBTP, safe zones, check limpo. |
| | **Total** | **19/20** | |

Reprovação automática: nenhuma.

## Veredito

**Aprovado (19/20, todos os † com 2).** Serve para anúncio de meio e fundo de
funil e para retargeting de quem já viu o `dia-2`: transforma a dor em número
(R$ 300 mil parados), mostra o mesmo mecanismo do aviso e fecha com o preço de
fundador e a escassez real (10 integradoras). Para público frio, o `dia-2`
explica melhor o produto; este vende melhor para quem já entendeu.

## Correções feitas antes de entregar

1. Quadro 0 em branco e linhas da fatura/carimbo aparecendo antes da hora:
   mesmas correções do molde do `dia-2` (`.depois`, `VF.antes`).
2. Narração longa (6,5 s nas frases da fatura e do preço) estourava 25 s:
   frases reescritas curtas e geradas de novo; a tela completa a condição.
3. "R$ 97" quebrava em duas linhas: corpo 230 px sem quebra.
4. Cartão de preço vazio por 1,5 s e zona morta de 16,6 a 18,9 s: valor entra
   na batida seguinte ao cartão e pulsa quando a voz diz o número.
5. "Depois, R$ 197 por mês. Sem contrato." ficava 0,7 s: condições adiantadas
   e CTA uma batida depois (fica 1,9 s).
6. Legenda a 150 px das laterais e limitador com folga para o AAC.

## Riscos e próximos passos

- O preço de fundador vale para as 10 primeiras integradoras: quando acabar,
  a cena 4 sai ou troca para R$ 197 (só `index.html` da cena 4 e a frase P5).
