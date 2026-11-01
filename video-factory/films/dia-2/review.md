# Review · dia-2

Data: 2026-10-24 · Revisor: Claude (sessão do Mac) · Arquivo: `dia-2-final.mp4`
(1080×1920, h264 60 qps + AAC 48 kHz, 23,0 s; render 4K/60 high crf 15 →
Lanczos 1080). Revisão: `dia-2-rev.mp4` (tempo e batida no canto).

## Como foi assistido

- Folha a cada 1,5 s, folha densa a cada 0,75 s com as transições (2,85; 3,05;
  6,75; 6,95; 7,45; 11,8; 14,55; 14,75; 18,0; 20,1 s) e quadro cheio em 1080
  do aviso (9,0 s) para nitidez.
- `hyperframes check`: 0 erro, 0 aviso; contraste AA em 37/37 textos; 7 "info"
  de `container_overflow` (rolo da conversa, intencional; retângulos do logo).
- `screening.mjs`: -14,14 LUFS, pico real -2,06 dBTP, LRA 2,1; sem silêncio
  > 0,4 s; sem zona morta de imagem > 2 s; 14 efeitos, todos na batida
  (ataque medido entre -120 e +133 ms da âncora; o detector marca ~150 ms depois).
- Mix: voz 11,3 dB acima da trilha durante a fala; nenhuma frase empurrada.
- Transcrição ElevenLabs `scribe_v1` de cada tomada usada: texto idêntico ao
  roteiro nas 6 frases ("Marcos" no lugar de "Markus" é o mesmo som em
  português, a tela mostra Markus).
- Transcrição do mix final (voz + trilha + efeitos), ElevenLabs Speech to Text
  em 24/10/2026: "Mandou a proposta e o cliente sumiu? Ele visualizou e não
  respondeu. No segundo dia, a mensagem pra chamar de volta chega pronta no seu
  WhatsApp. Você responde um e ela sai do seu número. Nada vai pro cliente sem
  você aprovar. Fale com o Marcos no WhatsApp." Idêntica ao roteiro; nenhuma
  palavra perdida sob a trilha.

## Nota (0–2; † precisa de 2)

| # | Critério | Nota | Por quê |
|---|---|---|---|
| 1 | Hook nos primeiros 3 s † | 2 | Pergunta da dor legível no quadro 0, sem logo; marca-texto em "sumiu?" em 0,5 s; "Visualizado às 14:03 ✓✓" em 1,5 s; voz diz a mesma pergunta. |
| 2 | Dor específica do integrador | 2 | Proposta em PDF de 8,4 kWp e R$ 24.900, tique azul, contador de dias sem resposta subindo até 2. |
| 3 | Fidelidade ao produto † | 2 | Texto do aviso, o "1", "Sai em 20 segundos… desfazer" e o envio pelo número do dono copiados do código (tabela na EDL). Ilustrativo marcado: resposta do cliente e UI do WhatsApp. |
| 4 | Humano aprova visível † | 2 | O dono digita "1"; a EVA confirma com janela de 20 s para desfazer; voz "Nada vai pro cliente sem você aprovar"; payoff "A EVA sugere. Você aprova." |
| 5 | Identidade Vyzon | 2 | Tokens LP.8, Archivo/Barlow, marca-texto atrás de tinta uma vez por cena, conversa como objeto, EvaBot nos estados lendo/alerta, logo só no fechamento. |
| 6 | Leitura mobile | 1 | Todo texto ≥ 30 px no 1080 e legenda da narração na faixa segura; mas o aviso tem 9 linhas para ler em ~4 s. Quem para lê o título e o rascunho; o resto é textura de prova. |
| 7 | Ritmo nativo | 2 | 23 s, troca de cena a cada 3–4 s, tudo na batida, câmera empurra uma vez na virada, um overshoot só (entrada do aviso). |
| 8 | Ausência de sinais de IA genérica † | 2 | Sem orbe, partícula, gradiente, rosto ou stock; nenhuma promessa de envio automático. |
| 9 | Som e voz | 2 | Voz inteligível (tomadas transcritas sem erro), trilha 11 dB abaixo da voz, abafada no silêncio do cliente e aberta na virada; um efeito por gesto. Mix final transcrito sem erro. |
| 10 | Acabamento técnico | 2 | 1080×1920, 60 qps, 4K → Lanczos, -14 LUFS, pico real < -1,5 dBTP, safe zones (nada acima de 220 px nem abaixo de 1600 px; legenda a 150 px das laterais), check limpo. |
| | **Total** | **19/20** | |

Reprovação automática: nenhuma (sem stock, sem SaaS genérico, sem autonomia
total, sem excesso de efeitos, UI legível).

## Veredito

**Aprovado (19/20, todos os † com 2).** Serve para anúncio de topo e meio de
funil: abre na dor exata do público (proposta visualizada e sem resposta), mostra
o produto funcionando dentro do WhatsApp que o dono já usa e deixa claro que
nada sai sem o "1" dele. Para anúncio frio, testar também a versão de 15 s
cortando a cena 4 (prova) se o custo por visualização completa ficar alto.

## Correções feitas antes de entregar

1. Quadro 0 em branco (o gancho entrava animado): título passou a existir no
   quadro 0; o que entra depois na cena 1 usa `.depois`.
2. Elementos apareciam antes da hora (estado do CSS até o tween começar):
   estado inicial gravado no tempo 0 em todos os atalhos (`VF.antes`).
3. Zona morta de 0,7 a 2,8 s no gancho: chip "Visualizado às 14:03" e tique
   azul na batida.
4. Aviso ficava 2 s como balão vazio: nasce inteiro na batida da notificação.
5. Rolagem da conversa escondia o aviso: altura e subida medidas no DOM.
6. Voz só 7,8 dB acima da trilha: trilha -2 dB e ducking -12 dB (11,3 dB).
7. Payoff legível só 1,1 s: uma batida a mais (filme de 22,5 para 23 s).
8. Legenda podia encostar nos ícones laterais do Reels: faixa a 150 px.
9. Pico real -1,57 dBTP depois do AAC: limitador com 0,9 dB de folga.

## Riscos e próximos passos

- O "1" sem código só vale com um rascunho aberto; com vários, a EVA pede "A2 1".
  O filme mostra o caso de um rascunho, que é o do aviso no 2º dia.
