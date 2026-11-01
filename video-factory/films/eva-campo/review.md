# Review · eva-campo

Data: 2026-11-01 · Revisor: Claude (sessão do Mac) · Arquivo: `eva-campo-final.mp4`
(1080×1920, h264 60 qps + AAC, 23,0 s; render 4K/60 high crf 15 → Lanczos 1080).
Revisão: `eva-campo-rev.mp4` (tempo e batida no canto).

## Como foi assistido

- Folha a cada 1,5 s e folha densa com as transições (2,85; 3,0; 6,8; 7,0; 7,2;
  7,5; 7,7; 11,75; 12,0; 14,6; 14,75; 15,3; 15,6; 17,8; 18,1; 18,5; 18,7; 20,05;
  20,3; 20,9 s) e quadro cheio do aviso em 9,2 s para nitidez.
- `hyperframes check`: 0 erro, 0 aviso; contraste AA em 38/38 textos.
- `screening.mjs`: -14,12 LUFS, pico real -1,99 dBTP, LRA 2,1; sem silêncio
  > 0,4 s; sem zona morta de imagem > 2 s; 14 efeitos na batida (ataque medido
  entre -120 e +133 ms da âncora; o detector marca ~150 ms depois).
- Voz: mesmas tomadas, trilha e `roteiro.json` do `dia-2`, cujo mix final foi
  transcrito sem erro em 24/10/2026. Este mix não foi transcrito de novo: subtraído
  do master do `dia-2`, sobra -91 dB de média e -44,7 dB de pico, inaudível.

## Nota (0–2; † precisa de 2)

| # | Critério | Nota | Por quê |
|---|---|---|---|
| 1 † | Hook nos primeiros 3 s | 2 | Pergunta inteira no quadro 0, em sol chapado, com a EVA grande |
| 2 | Dor específica do integrador | 2 | Proposta em PDF, visualizada, contador de dias |
| 3 † | Fidelidade ao produto | 2 | Aviso igual ao `buildDraftMessage` do commit `ef547f8`; depende do deploy |
| 4 † | Humano aprova visível | 2 | O "1" do dono e a janela de 20 s aparecem antes de sair |
| 5 | Identidade Vyzon | 1 | A EVA é a do app, mas o site segue no Vyzon Solar: quem clica vê outro visual |
| 6 | Leitura mobile | 2 | Menor texto de 33 px, legenda na faixa segura |
| 7 | Ritmo nativo | 2 | Corte em toda virada, EVA reage nas batidas |
| 8 † | Ausência de sinais de IA genérica | 2 | Cor chapada, sem orbe, brilho ou gradiente |
| 9 | Som e voz | 2 | Mesmo mix do `dia-2`, conferido por subtração; voz 11 dB acima da trilha |
| 10 | Acabamento técnico | 2 | -14 LUFS, pico abaixo de -1,5 dBTP, 60 qps |

**Total 19/20, todos os † com 2: aprovado.**

Serve para orgânico agora que o aviso em produção diga "Responda 1". Para anúncio,
falta alinhar o destino: o clique cai numa home de outro registro visual.
