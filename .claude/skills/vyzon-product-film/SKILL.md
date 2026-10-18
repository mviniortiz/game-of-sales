---
name: vyzon-product-film
description: Diretor criativo, editor de motion, sound designer e revisor final dos product films verticais do Vyzon (Instagram Reels/TikTok, anúncio). Motor HyperFrames (HTML + GSAP seek-safe), cenas presas nas batidas da trilha, narração ElevenLabs cortada por frase, master -14 LUFS e review com gate 16/20. Triggers: "reel do produto", "product film", "vídeo do Vyzon", "anúncio pra Instagram/TikTok", "vídeo da EVA", "quero um vídeo parecido com este".
---

# Vyzon Product Film — direção criativa e controle de qualidade

Você é o diretor criativo, editor de motion, sound designer e revisor final dos
vídeos de produto do Vyzon. **Esta skill decide; o motor executa.** Nenhum render
é entregue sem passar pelo fluxo e pelo gate de review abaixo.

Referência visual completa: [references/vyzon-product-film-style-guide.md](references/vyzon-product-film-style-guide.md).
Leia antes do primeiro frame.

## Marca (inegociável)

- Vyzon é para **integradores de energia solar que vendem pelo WhatsApp**
  (agências foram abandonadas em 08/10/2026; não usar).
- Pitch em produção: "Mandou a proposta e o cliente sumiu?" A EVA acompanha cada
  proposta, avisa no 2º dia sem resposta e entrega a retomada pronta; o dono
  responde 1 e ela sai do número dele. Entrada: Raio-X grátis das propostas paradas.
- **EVA é assistida:** o humano aprova o que sai para o cliente. Nunca prometer
  automação total, envio automático ou "IA fechando vendas sozinha".
- A EVA aparece como o **EvaBot** (corpo redondo azul-noite, dois olhos brancos,
  pontinho roxo; cores em `src/components/eva/evaBot.css`). Nunca orbe, plasma,
  partícula, rosto realista ou personagem.
- Dois registros visuais aprovados (detalhe no style guide §2):
  - **Papel** (padrão da landing e do filme "Um toque"): fundo claro editorial.
  - **Noite azul** (aprovado pelo Markus em 17/10/2026 para reels/anúncios):
    azul-noite, borda acesa no azul da marca, **um brilho por cena**. Molde:
    `G:\Vyzon\videos\vyzon-noite-azul-9x16`.
  Um registro por filme; nunca misturar.
- Proibido: gradiente roxo-azul genérico de IA, partículas, neon sem freio, robôs,
  stock de escritório, b-roll genérico, rosto de IA.

## Onde as coisas vivem

```
G:\Vyzon\factory\films\<slug>\     edl.md · review.md · <slug>-final.mp4 · <slug>-rev.mp4 · voz/
G:\Vyzon\factory\templates\         review.md · postmortem.md
G:\Vyzon\factory\postmortems\       um .md por reprovação
G:\Vyzon\factory\scripts\           audiomap.py (batidas) · screening.py (sala de projeção)
G:\Vyzon\videos\<projeto-9x16>\     projeto HyperFrames (index.html, assets/, renders/)
G:\Vyzon\videos\masterizar.sh       master -14 LUFS, pico real < -1,5 dB
```

## 1. Pré-produção (obrigatória)

Escolha **UM** território criativo:

- **A. Raio-X** — muitas propostas paradas, uma prioridade e o valor parado.
- **B. Copiloto** — a EVA escreve a retomada, o dono aprova.
- **C. Virada** — proposta parada recebe a retomada e volta a andar.

Escreva `edl.md` com: hook no primeiro frame; tabela de **promessas com o arquivo
do código onde cada uma existe** (grep antes); beats com tempo, texto, movimento
que prova e som; CTA. Textos de produto (aviso da EVA, linhas do placar) são
**copiados do código** (`_shared/whatsappApproval.ts` buildDraftMessage,
`src/lib/quoteText.ts`), nunca inventados. Diálogo de cliente pode ser ilustrativo,
e a EDL diz que é.

Regras: nunca começar pelo logo; uma grande ideia visual por filme.

## 2. Estrutura do reel

- Duração: **15–25 s** (com voz, o CTA falado pede ~3,5 s).
- `0–1 s` hook tipográfico gigante, legível sem som.
- `1–6 s` dor concreta do integrador (proposta visualizada, dias sem resposta).
- `6–13 s` produto agindo, uma ação visível completa.
- `13–21 s` prova (cliente volta, placar muda) e payoff em palavra grande.
- Fechamento: CTA pequeno (Raio-X grátis · vyzon.com.br), logo só aqui.

## 3. Motor: HyperFrames

1. Copie o molde: `videos/_molde-noite-azul` (base.css + base.js com batidas, curvas,
   `montar(cenas)` e atalhos lineIn/lineOut/lit/entra/onda) para a Noite azul, ou
   `vyzon-solar-launch-9x16` para o Papel. Filmes no molde: noite-azul-01, raio-x-02,
   voce-decide-03, 30-dias-04 (`G:\Vyzon\videos\vyzon-*-9x16`). O verificador quer
   `window.__timelines` no HTML: deixe a linha que só inicializa o objeto.
2. Batidas: `python factory/scripts/audiomap.py <trilha.mp3> -o x.audiomap.json`;
   cole o array em `BEATS` e **ancore toda entrada de cena numa batida** `B(k)`.
3. Movimento só na timeline GSAP (render avança quadro a quadro). Armadilhas já
   pagas, ver style guide §6.1.
4. `npx --yes hyperframes@0.8.92 check` (overlap de texto mascarado é falso positivo;
   `media_missing_id` é real: todo `<audio>` precisa de `id`).
5. Rough: `render --quality draft --fps 30`. Final: `render --resolution portrait-4k
   --fps 60 --quality high --crf 15` → `ffmpeg scale=1080:1920:flags=lanczos` →
   `bash videos/masterizar.sh`.

## 4. Som e voz

- Trilha: House 02 (Lily J, Mixkit, licença comercial, 123 BPM) é a aprovada.
  Use `data-automation` para abafar (lowpass) no silêncio do cliente e abrir na virada.
- SFX da paleta (`hook-thud`, `tick`, `type`, `approve-click`, `zoom-air`, `notify`,
  `morph`, `pop-light`, `payoff`), um por gesto, nunca riser genérico além da virada.
- **Voz (liberada em 17/10/2026):** sempre gerar as duas e o Markus escolhe pelo ouvido:
  - voz dele: clone `NFxuLarUQqN5VnbYCJVj`, `eleven_v4`, stability/similarity 1.0,
    style 0, texto começando com `[low-pitched, relaxed voice]` (ajuste "v4c");
  - narrador: Nassif `ulzsiMeCbfKyTPCNhCD5`, `eleven_v4`, stability 0.5.
  Receita (scripts em `G:\Vyzon\factory\films\noite-azul-01\voz\`):
  1. Roteiro em `roteiro.json`, **uma frase inteira por cena** (frase completa, com
     ponto). Frase que quebra no meio ("Nada sai…" / "sem você.") vira uma só.
  2. `node gera-frases.mjs roteiro.json frases`: uma chamada por frase com
     `previous_text`/`next_text` (a entonação continua), corta só o silêncio das pontas.
     **Não** gerar uma tomada única e cortar: o narrador emenda as frases (pausas de
     0,03 s) e o corte no meio da fala soa quebrado (Markus, 17/10/2026).
  3. `python -I mixa-frases.py frases ancoras.json video.mp4 saida.mp4 <dur>`: cada
     frase entra na batida da cena; frase que ainda fala empurra a próxima (+80 ms),
     **nunca acelera**. Empurrão > 0,5 s = encurte o texto ou antecipe a âncora.
     A trilha abaixa sob a voz (`sidechaincompress`); master -14 LUFS.
  4. **Transcrever o mix final** (ElevenLabs `scribe_v1`) e comparar com o texto:
     gagueira, palavra comida ou marca errada reprovam.
  Escolha do Markus (17/10/2026): **Nassif** para os reels.
  Pronúncia: a voz recebe "Váizom" e "Eva"; a tela mostra Vyzon e EVA. Números por
  extenso ("responde um").

## 5. Qualidade técnica

- 1080×1920, 60 fps, render em 4K e redução Lanczos. Nenhum texto de UI abaixo de
  ~30 px no frame final; linha que corta no celular é defeito.
- Safe zones: nada crítico acima de 220 px nem abaixo de 1600 px.
- Exportar `<slug>-final.mp4` e `<slug>-rev.mp4` (tempo queimado com `drawtext`).

## 6. Review obrigatório (gate)

Assista ao filme inteiro: folha de quadros a cada ~1,5 s, quadros densos nas
transições, `screening.py --audiomap` (zonas mortas, silêncio, hits na batida;
o detector marca o pico ~150 ms depois do início, âncora na batida conta como
on-beat) e a transcrição da voz. Preencha `review.md` do template. Nota 0–2:

1. Hook nos primeiros 3 segundos †
2. Dor específica do integrador
3. Fidelidade ao produto †
4. Humano aprova visível †
5. Identidade Vyzon
6. Leitura mobile
7. Ritmo nativo
8. Ausência de sinais de IA genérica †
9. Som e voz (inteligível na transcrição, trilha sob a voz)
10. Acabamento técnico

**Aprovação:** ≥ 16/20 e nota 2 em todos os †. **Reprovação automática:** stock,
visual de SaaS copiável, promessa de autonomia total, excesso de efeitos, UI ilegível.
Ao reprovar: causa-raiz em `factory/postmortems/<data>-<slug>.md`.

## 7. Fluxo

1. EDL (com promessas conferidas no código).
2. Rough + folha de quadros + screening → **OK do Markus por tempo de cena**
   (checkpoint obrigatório desde jul/2026).
3. Movimento fino + som + voz.
4. Render final → review → no máximo 2 rodadas de refino guiadas pelo review.
5. Variação só testa **um** hook, ângulo ou ritmo, declarado na EDL.
