# Vyzon Product Film — Style Guide

Referência visual e sonora dos product films verticais (Reels/TikTok, anúncio).
Complementa a SKILL.md: aqui vive o "como fica bonito"; lá vive o processo.

## 1. Direção

O vídeo é uma **peça de design de produto em movimento**. Régua de qualidade:
parecer que saiu do estúdio interno de uma empresa de design (Linear, Vercel,
ElevenLabs), não de um gerador de anúncios. Se um frame qualquer não funcionaria
como print da marca, o frame está errado.

A tela do produto é a heroína. Tipografia é a coadjuvante. O resto desaparece.

## 2. Registros visuais (um por filme)

### Papel (padrão da landing; filme "Um toque", `videos/vyzon-solar-launch-9x16`)

| Papel | Cor | Uso |
|---|---|---|
| Fundo | `#FAF9F5` | todas as cenas editoriais |
| Texto | `#0D1421` | headlines e corpo |
| Primário | `#1556C0` | destaque de palavra |
| EVA | `#6D28D9` | micro-acento, nunca área grande |

### Noite azul (aprovado em 17/10/2026; `videos/vyzon-noite-azul-9x16`)

Estrutura e ritmo de reel da ElevenLabs com a pele do Vyzon.

| Papel | Valor |
|---|---|
| Fundo | gradiente `#070D1A → #04070F` com halo `#0E1D3D` no terço de cima |
| Texto | `#F3F6FB`; secundário `#9FB0C8` |
| Cartão (vidro) | `linear-gradient(rgba(22,38,72,.78), rgba(10,18,38,.82))`, raio 40 px, borda `rgba(96,165,250,.22)` |
| Cartão aceso | borda `rgba(96,165,250,.62)` + `0 0 70px rgba(37,99,235,.38)` |
| Halo | radial `rgba(37,99,235,.46)` que viaja até o elemento da cena |
| Semânticos | âmbar `#F5B454`, verde `#34C98B`, roxo `#A78BFA` (só pontinho da EVA e linha da EVA) |

Regras da Noite azul: **um cartão aceso por vez**; o halo acompanha o que importa;
cartões vizinhos só como borda nas laterais (ecoa o carrossel da referência);
nada de neon, partícula ou orbe.

## 3. Tipografia

- **Headlines:** Satoshi 900, tracking -0.045em, line-height ~1.02, 112–128 px.
  Máx ~6 palavras por beat. Entram por máscara (linha sobe de baixo).
- **Kicker:** Satoshi 700, 64 px, com a palavra que importa em 900.
- **UI dos cartões:** Inter 500/600, 42–50 px no texto de mensagem, ≥ 34 px no
  resto. Linha que corta no celular é defeito: quebre em duas.
- Nada de fonte nova por vídeo.

## 4. Produto em cena

- Fidelidade: o que aparece tem que existir no código. Copie os textos:
  - aviso da EVA no WhatsApp do dono: `_shared/whatsappApproval.ts`
    buildDraftMessage ("rascunho pronto", "Lead:", "Por que agora:", texto,
    "Responda 1 para enviar");
  - linhas do placar: `src/lib/quoteText.ts` stateLine/evaLine ("Nunca respondeu ·
    orçamento em PDF enviado há 2 dias", "Em conversa · cliente falou hoje",
    "Retomada pronta no seu WhatsApp, esperando o seu ok", "Retomada enviada hoje").
- "Recuperado pela EVA" é número da tela Resultados, não selo de orçamento.
- No registro Papel, cenas de produto usam os tokens do APP (`--vyz-*`, `--ibx-*`,
  azul `#2563EB → #4A8CE8`), nunca a paleta da landing dentro do mockup.
- Dados fictícios coerentes de integrador: cliente pessoa física, proposta em PDF
  ("Proposta_8,4kWp.pdf", R$ 38.400), conversa curta.

## 5. A EVA em cena

EvaBot em HTML (mesmas cores do app): bola com gradiente `#34508A → #1B2B4E →
#0B1220`, dois olhos brancos em pílula, pontinho `#A78BFA` no canto (âmbar quando
acha algo). Estados por GSAP: lendo = olhos achatados (scaleY .3) varrendo de um
lado ao outro; alerta = olhos abertos e pontinho âmbar. Ao lado dela, a pílula
"Lendo as conversas" (grade 3×3 em onda pela diagonal), igual ao `EvaThinking` do app.

## 6. Motion

- Easing por massa (função `bez` do molde): `settle (.22,1,.36,1)` texto e UI,
  `heavy (.16,1,.3,1)` objetos grandes e câmera, `snap` chips, `throw` saídas,
  `drift` ambiente. **Um overshoot por filme**, no gesto da virada.
- Cursor faz arco (x e y com curvas diferentes), recua 7 px antes do clique, o
  botão afunda e solta uma onda.
- Transformação de objeto (aviso vira mensagem enviada) é **em sequência**: o
  primeiro some em ~0,14 s e o segundo nasce no lugar do texto dele e sobe. Dois
  textos na tela ao mesmo tempo é defeito.
- Antes de uma resposta do cliente, "digitando…" por uma batida.
- Câmera: respiração ≤ 1,04 e um empurrão na virada.
- Proibido: wipe genérico, glitch, shake, bounce em texto, preset de CapCut.

### 6.1 Armadilhas já pagas (HyperFrames + GSAP 3)

- Animação CSS não acompanha o render quadro a quadro: tudo na timeline.
- GSAP 3 não troca classe por `className`: use `attr: { class: "..." }`.
- `fromTo` aplica o estado inicial na hora: em elemento que só aparece depois,
  passe `immediateRender: false`.
- Máscara de linha: deslocamento por `yPercent` definido no GSAP (não no CSS) e
  saída em -130, senão sobram pontinhos das letras de baixo.
- Saída de elemento já posicionado usa valor relativo (`y: "+=40"`), não absoluto.
- `filter` em transição de cartão pode render preto: escureça por opacidade.

## 7. Ritmo (referência)

| Janela | Conteúdo |
|---|---|
| 0–1 s | hook tipográfico, sem logo |
| 1–6 s | dor do integrador (visualizou, dias sem resposta, sumiu) |
| 6–13 s | EVA lê, avisa, humano responde 1, sai do número dele |
| 13–21 s | cliente volta, placar muda, payoff "A EVA lembra. Você fecha." |
| final | CTA pequeno e falado |

## 8. Som

| Som | Quando |
|---|---|
| `hook-thud` | primeiro frame |
| `tick` | ✓✓ azul, linha do placar mudando |
| `zoom-air` | cada dia que acende, entrada do CTA |
| `riser-chargeup` | só antes da virada |
| `notify` | aviso da EVA na virada |
| `type` / `approve-click` | o "1" e o clique |
| `morph` | aviso vira mensagem |
| `pop-light` | "digitando…" e resposta do cliente |
| `payoff` | palavra grande final |

Trilha sob a voz (automação de volume + sidechain), abafada no silêncio do cliente.
Master: -14 LUFS, pico real < -1,5 dB (`videos/masterizar.sh`). Receita da voz na SKILL §4.

## 9. Safe zones (1080×1920)

- Topo: 220 px livres. Base: 320 px livres.
- Laterais: 60 px; o terço inferior direito (~140 px) é coberto pelos ícones do TikTok.
- Headline principal entre 20% e 65% da altura.

## 10. Checklist anti-"cara de IA"

Reprove sozinho se aparecer: gradiente roxo/azul genérico, lens flare, mais de um
brilho por cena; partícula, rede neural, órbita, orbe; robô, cérebro, rosto
sintético; stock de escritório; "revolucione", "turbine", "o futuro de"; promessa
de autonomia ("a IA responde por você"); UI que o produto não tem.

## 11. Referências que o Markus mandou (out/2026)

| Reel | O que é | O que virou |
|---|---|---|
| ElevenLabs instagram.com/p/Deg8jqcMpEL | agentes: escuro, cartões com borda acesa, cursor, conversa, palavra com halo | registro **Noite azul** (noite-azul-01, raio-x-02, voce-decide-03, 30-dias-04) |
| ElevenLabs instagram.com/reel/DeUn6q0AVrR | ditado por voz: claro, celular branco em close, interface flutuando | **dia-claro-05** (par claro do noite-azul-01, mesma história/voz/trilha para teste escuro x claro). A história de voz NÃO foi usada: transcrição só roda em lead de anúncio e prospecção |
| ElevenLabs instagram.com/reel/DeSCaQegvdu | pessoa falando para a câmera + capítulos numerados em cartão preto + lista final | **só referência** (decisão de 18/10/2026). Exige rosto real do Markus; rosto de IA é proibido |
| kallaway instagram.com/p/DcRZjTLsusp | criador falando + tela dividida; conteúdo: lista de bots especialistas | **trabalhos-eva-06** sem rosto: os 5 trabalhos reais da EVA em lista que acende e abre painel |
