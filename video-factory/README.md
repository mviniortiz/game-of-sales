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
  molde-rosto/            index.html, rosto.css, rosto.js (reel com rosto: faixa + legenda)
  scripts/
    rosto/                prepara, importa-palavras, corta, mixa-rosto, render-rosto.sh,
                          gera-bruto-teste (ver "Reel com rosto")
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
    lib/master.mjs        master comum: ganho até -14 LUFS e limitador para pico real < -1,5 dBTP
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
brutos/<slug>.mov                       gravações do Markus para os reels com rosto
```

## Instalação (uma vez por máquina)

O Mac não tem Homebrew, Python de usuário nem ffmpeg completo, e não precisa:

1. Node 22+ via nvm (`~/.nvm`). `env.sh` carrega.
2. `cd video-factory && npm install` instala só o `hyperframes@0.8.92`
   (~120 MB em `node_modules`, inclui sharp e esbuild nativos).
3. ffmpeg: os wrappers em `bin/` preferem `bin/full/` (ffmpeg e ffprobe 9.0.2
   estáticos para Mac arm64 de https://ffmpeg.martin-riedl.de, assinados com
   Developer ID, ~57 MB de zip, baixados com OK do Markus em 24/10/2026; fora
   do git). Para instalar de novo: baixe `macos/arm64/<versão>/ffmpeg.zip` e
   `ffprobe.zip`, confira o `.sha256` publicado e descompacte em `bin/full/`.
   Sem eles, os wrappers caem no ffmpeg 7.1 do Remotion
   (`node_modules/@remotion/compositor-darwin-arm64`), que basta para os filmes
   de produto (mix, ducking, passa-baixa e limitador são em Node) mas **não**
   para vídeo dentro do HyperFrames: a extração de quadros usa os filtros
   `fps`, `format`, `setpts` e `settb`, que essa build não tem.
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

## Reel com rosto (o Markus falando para a câmera)

Formato que mais rende no setor (ver `docs/conteudo/instagram/2026-10-26/reels.md`):
pessoa real, um plano só, a pergunta polêmica numa faixa de 0 a 4 s e legenda
palavra por palavra em caixa alta. Nada de rosto gerado por IA. Molde em
`molde-rosto/` (faixa no marca-texto, legenda com contorno escuro e a palavra
falada acesa no marca-texto, sombra suave em cima e embaixo, sem logo).

1. Grave no celular, vertical. Copie o arquivo para
   `~/Movies/vyzon-film/brutos/<slug>.mov` (pode ser HEVC e girado; o preparo
   aplica a rotação).
2. `films/<slug>/rosto.json` (copie de `films/teste-rosto`): `bruto`, `faixa.texto`,
   `cortar` (vazio na primeira passada), `troca` (grafias que o scribe erra,
   como "Marcos" → "Markus"), `legenda.max_palavras`.
3. `node scripts/rosto/prepara.mjs films/<slug>/rosto.json` → proxy em pé
   1080x1920 com keyframe a cada segundo, WAV para o mix e
   `~/Movies/vyzon-film/transcrever/<slug>-bruto.mp3`.
4. Transcreva o MP3 em https://elevenlabs.io/app/speech-to-text (Claude in
   Chrome, logado): Transcribe files → Upload, abra a transcrição, Export →
   JSON com timestamps. Copie o JSON para `films/<slug>/transcricao/` e rode
   `node scripts/rosto/importa-palavras.mjs films/<slug>/transcricao/<arquivo>.json films/<slug>/palavras.json`.
   (O seletor de arquivo do conector ElevenLabs não sobe arquivo neste app.)
5. `node scripts/rosto/corta.mjs films/<slug>/rosto.json` imprime os trechos
   mantidos e todas as palavras com o tempo do bruto. Erro e frase regravada:
   ponha o intervalo em `cortar` (tempos do bruto) e rode de novo. Silêncio
   maior que `silencio.min` (0,35 s) sai sozinho; nenhum corte cai no meio de
   palavra.
6. `bash scripts/rosto/render-rosto.sh <slug> --rascunho`, olhe a folha, e sem a
   flag para o final (`<slug>-final.mp4`, `<slug>-rev.mp4`). A voz é a do
   próprio bruto, emendada sem clique, passa-alta 80 Hz, master -14 LUFS.
   Trilha só se `rosto.json` tiver `trilha` (baixa, com ducking).

`films/teste-rosto` é a prova do molde com uma gravação sintética
(`scripts/rosto/gera-bruto-teste.mjs`: cartela com cronômetro e frases do
Nassif com pausas e uma frase repetida). 21,1 s de bruto viram 12,2 s.

Armadilha: com `<video>` na composição, os workers paralelos do HyperFrames no
Brave deixavam os 80 px de baixo sem o vídeo. O `render-rosto.sh` usa
`--workers 1` (12 s em 4K/60 renderizam em ~50 s). Os filmes de produto não
têm o problema (o fundo do `#root` cobre a tela toda).

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
- O seletor de arquivo do conector não sobe arquivo neste app (testado em
  24/10/2026: o nó fica "aguardando upload"). Tomadas da ElevenLabs transcrevem
  pela URL da geração; o mix final transcreve pelo Claude in Chrome na página
  Speech to Text da ElevenLabs (logado), subindo os mp3 de
  `~/Movies/vyzon-film/transcrever/`.
- Os moldes antigos (`_molde-noite-azul`, `vyzon-*-9x16`) e os filmes
  noite-azul-01 a trabalhos-eva-06 ficaram no PC antigo. O molde daqui é o do
  registro Vyzon Solar; a Noite azul precisa ser refeita se voltar a ser usada.
