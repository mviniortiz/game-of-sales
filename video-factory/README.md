# video-factory

Pipeline dos product films verticais do Vyzon (Reels/TikTok 1080×1920, anúncio),
montado no Mac em 23–24/10/2026 para substituir o que vivia no PC Windows
(`G:\Vyzon\factory` e `G:\Vyzon\videos`). Processo e régua de qualidade:
skill `.claude/skills/vyzon-product-film` (leia antes de mexer aqui).

Fora do app: nada aqui entra no build do Vite nem no `package.json` da raiz.

## O que tem aqui

```
video-factory/
  env.sh                  source antes de tudo: Node (nvm), ffmpeg no PATH, Brave no HyperFrames
  bin/ffmpeg, bin/ffprobe ffmpeg do Remotion (já vem em node_modules da raiz)
  package.json            só o hyperframes@0.8.92
  molde-vyzon-solar/      base.css (tokens LP.8, conversa, fatura, preço, EvaBot, legenda)
                          base.js (batidas, curvas, atalhos de movimento seek-safe)
  scripts/
    audiomap.mjs          batidas e energia por compasso da trilha (era audiomap.py)
    apara-frases.mjs      corta o silêncio das pontas de cada frase de voz
    analisa-sfx.mjs       mede ataque, cauda e brilho dos efeitos para escolher variação
    gera-legendas.mjs     roteiro.json → legendas.js (faixa de legenda da tela)
    mixa-frases.mjs       mix (voz na batida, ducking, passa-baixa na trilha, efeitos) + master -14 LUFS
                          (era mixa-frases.py + masterizar.sh)
    folha.mjs             folha de quadros do filme renderizado
    screening.mjs         loudness, silêncios, zonas mortas, efeitos na batida (era screening.py)
    render-filme.sh       faz tudo de um filme, do render à folha
    lib/audio.mjs         decodificar/gravar WAV, envelope, medição de loudness
    lib/roteiro.mjs       lê roteiro.json e posiciona as frases (empurrão de +80 ms, nunca acelera)
  films/<slug>/           index.html (projeto HyperFrames), roteiro.json, legendas.js,
                          base.css/base.js (cópia do molde), edl.md, review.md
                          <slug>-final.mp4 e <slug>-rev.mp4 (ignorados pelo git)
                          renders/ (4K, vídeo mudo, master.wav, folhas, screening; ignorado)
  templates/              review.md, postmortem.md
  postmortems/            um .md por reprovação
```

Mídia fica fora do repo, em `~/Movies/vyzon-film/`:

```
trilha/house-02-lily-j-mixkit-744.mp3   House 02 (Lily J), Mixkit, licença Mixkit Stock Music Free
trilha/house-02.audiomap.json           saída do audiomap (122,99 BPM, 1ª batida em 0,017 s)
sfx/<nome>-v1|v2.mp3                    paleta gerada na ElevenLabs (Sound Effects v2), variacoes.json
voz/<frase>-t1|t2.mp3                   tomadas da ElevenLabs, tomadas.json (texto, duração, URL)
voz/aparadas/*.wav + duracoes.json      frases aparadas que o mix usa
transcrever/<slug>-final-mix.mp3        áudio final para a transcrição de checagem
```

## Instalação (uma vez por máquina)

O Mac não tem Homebrew, Python de usuário nem ffmpeg completo, e não precisa:

1. Node 22+ via nvm (`~/.nvm`). `env.sh` carrega.
2. `cd video-factory && npm install` instala só o `hyperframes@0.8.92`
   (~120 MB em `node_modules`, inclui sharp e esbuild nativos).
3. ffmpeg: os wrappers em `bin/` usam o ffmpeg 7.1 do Remotion
   (`node_modules/@remotion/compositor-darwin-arm64`, já instalado pelo app).
   Ele é enxuto: tem libx264, aac, mp3, `scale` (Lanczos) e `loudnorm`; **não**
   tem drawtext, sidechaincompress, lowpass, ebur128 nem o muxer f32le. Por isso
   mix, ducking, passa-baixa, limitador e tempo queimado são feitos em Node e
   no HTML. O HyperFrames avisa que o "fast capture" fica desligado sem o filtro
   psnr; o render cai para screenshot e funciona (~1,5 min por filme em 4K/60).
4. Navegador: `HYPERFRAMES_BROWSER_PATH` aponta para o Brave
   (`/Applications/Brave Browser.app`). Não foi preciso baixar o
   chrome-headless-shell.
5. `hyperframes telemetry disable` (feito).

`hyperframes doctor` deve mostrar FFmpeg, FFprobe e Chrome com ✓.

## Fazer um filme

```bash
source video-factory/env.sh
```

1. **EDL primeiro** (`films/<slug>/edl.md`): território, hook, tabela de
   promessas com o arquivo do código onde cada uma existe, batidas, CTA.
2. **Projeto**: copie `molde-vyzon-solar/base.css` e `base.js` para
   `films/<slug>/` e escreva `index.html` (veja `films/dia-2`). Toda entrada em
   `B(k)`. O que entra depois dentro da 1ª cena (`#c1`) leva a classe `.depois`.
   Deixe a linha `window.__timelines = window.__timelines || {};` no HTML (o
   lint procura por ela).
3. **Voz**: no conector ElevenLabs, um nó TTS por frase (Nassif
   `ulzsiMeCbfKyTPCNhCD5`, `eleven_v4`, `language_code: pt`), 2 tomadas. Baixe
   para `~/Movies/vyzon-film/voz/` e rode
   `node scripts/apara-frases.mjs ~/Movies/vyzon-film/voz ~/Movies/vyzon-film/voz/aparadas`.
   Transcreva as tomadas escolhidas (anexe a URL da geração no fluxo e rode
   speech-to-text) e copie os tempos de palavra para `legenda` no roteiro.
4. **roteiro.json**: trilha (arquivo, BPM, fase, ganho, ducking, automação de
   passa-baixa), falas (arquivo, batida, offset, legenda), efeitos (arquivo,
   batida, ganho) e master (-14 LUFS, -1,5 dBTP). É a fonte única: o mix e a
   legenda da tela leem dele.
5. **Rascunho**: `bash scripts/render-filme.sh <slug> --rascunho` (30 qps, ~15 s).
   Olhe `renders/<slug>-folha.jpg` e `renders/<slug>-screening.txt`.
   Para quadros soltos: `cd films/<slug> && hyperframes snapshot . --at 0,3.2,7.1`.
6. **Final**: `bash scripts/render-filme.sh <slug>` → `<slug>-final.mp4`
   (4K/60 high crf 15 → Lanczos 1080 → mix/master) e `<slug>-rev.mp4` (tempo e
   batida queimados no canto).
7. **Gate**: `hyperframes check` no projeto, folha densa
   (`node scripts/folha.mjs <final> <saida.jpg> --cada 0.75 --extra <transições>`),
   screening, transcrição do mix final (`~/Movies/vyzon-film/transcrever/`), e
   `review.md` a partir de `templates/review.md`. Aprovado com ≥ 16/20 e 2 em
   todos os critérios †.

## Batidas da trilha

`node scripts/audiomap.mjs <trilha.mp3> -o <saida.json>` busca BPM e fase
juntos (passo de 0,01 BPM) e lista a energia por compasso. House 02: 122,99 BPM,
fase 0,017 s, energia sobe no compasso 4 (~7,8 s). O `hyperframes beats` marca
o chimbal nessa faixa (dá 160 BPM); não use.

## Armadilhas já pagas (além das do style guide §6.1)

- Com `immediateRender: false` o elemento fica no estado do CSS até o tween
  começar, ou seja, aparece antes da hora. Os atalhos do molde gravam o estado
  inicial no tempo 0 (`VF.antes`). Em `fromTo` escrito à mão, chame `VF.antes`.
- O quadro 0 não aplica os `set` do tempo 0: a cena 1 é visível pelo CSS.
- Texto que muda com o tempo usa `tl.set(el, { textContent })` ou tween de
  `textContent` com `snap`; `onUpdate` também roda no seek do HyperFrames.
- Medir layout no script (alturas da conversa) funciona: as fontes já
  carregaram quando o script da composição roda.
- O AAC sobe o pico real em ~0,15 dB: o limitador usa teto de amostra 0,9 dB
  abaixo do alvo.

## Limitações conhecidas

- O conector ElevenLabs não expõe stability nem `previous_text`/`next_text`:
  cada frase sai com o padrão da voz e sem contexto das vizinhas. Com uma
  `ELEVENLABS_API_KEY` no ambiente dá para voltar à receita completa da skill.
- A transcrição de arquivo local pelo conector exige o seletor (alguém escolhe
  o arquivo). Tomadas da ElevenLabs transcrevem sozinhas pela URL da geração.
- Os moldes antigos (`_molde-noite-azul`, `vyzon-*-9x16`) e os filmes
  noite-azul-01 a trabalhos-eva-06 ficaram no PC antigo. O molde daqui é o do
  registro Vyzon Solar; a Noite azul precisa ser refeita se voltar a ser usada.
