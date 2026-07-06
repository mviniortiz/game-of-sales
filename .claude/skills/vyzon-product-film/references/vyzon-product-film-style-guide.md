# Vyzon Product Film — Style Guide

Referência visual e sonora dos product films verticais (Reels/TikTok).
Complementa a SKILL.md — aqui vive o "como fica bonito"; lá vive o processo.

## 1. Direção

O vídeo é uma **peça de design de produto em movimento**. Régua de qualidade:
parecer que saiu do estúdio interno de uma empresa de design (Linear, Vercel,
Handhold), não de um gerador de anúncios. Se um frame qualquer não funcionaria
como print no dribbble da marca, o frame está errado.

A tela do produto é a heroína. Tipografia é a coadjuvante. Todo o resto é
figuração e deve desaparecer.

## 2. Paleta

| Papel | Cor | Uso |
|---|---|---|
| Fundo | `#FAF9F5` (warm paper) | fundo padrão de TODAS as cenas |
| Texto | `#0D1421` (navy) | headlines e corpo |
| Primário | `#1556C0` (azul Vyzon) | destaques de palavra, kickers |
| Profundo | `#0E3E8A` | hover/sombra do azul, nunca área grande |
| EVA | `#6D28D9` | **micro-acento**: um badge, um sublinhado, o EVA Signal. Nunca área grande, nunca gradiente dominante |
| Semânticos da UI | verde `#008A52`, âmbar `#B45309`, vermelho `#B42318` | só dentro de mockups do produto (chips Quente/Esfriando/Frio etc.) |

Proibido: gradiente roxo-azul "de IA", neon, glow, dark mode gratuito,
qualquer cor fora desta tabela em área grande.

## 3. Tipografia

- **Headlines:** Satoshi 900, tracking -0.02em a -0.03em, line-height ~1.02.
  Tamanho MÍNIMO de headline em 1080×1920: 84px. Poucas palavras por beat
  (máx ~6), hierarquia extrema.
- **Voz humana/ênfase:** Sentient itálica 500 — uma ou duas palavras por
  headline, nunca a frase inteira.
- **Kicker/telemetria:** JetBrains Mono 700, uppercase, tracking .2em+,
  tamanho pequeno mas ≥20px.
- **UI dos mockups:** Sora, como no app.
- Nada de fonte nova por vídeo. Estas quatro, sempre.

## 4. Mockups do produto

- Reproduzir a UI real (Inbox, EVA Panel, Pipeline) com dados fictícios
  consistentes (personas Marina Costa, Rafael Souza, Júlia Mendes...).
- Fidelidade: o que aparece no vídeo tem que existir no produto. Confira no
  código antes de desenhar a cena (Claims Policy do CLAUDE.md).
- **Dois design systems, cada um no seu lugar (regra da rodada 3 do
  copiloto-01, feedback do Markus):** cenas editoriais (hook, dor, fecho)
  usam os tokens da LANDING (tabela da seção 2). Cenas de PRODUTO usam os
  tokens do APP, copiados do código — nunca a paleta editorial dentro do
  mockup. Fonte da verdade: `src/index.css` (`--vyz-*`, `--ibx-*`),
  `InboxConversation.tsx`, `EvaPanel.tsx`. Escala de referência: ~2.4×
  (12.5px do app → ~30px no frame 1080×1920).

| Elemento do app | Valor real (copiar do código, não inventar) |
|---|---|
| Papel do Inbox | `--ibx-paper #F6F4EF`, hairline `--ibx-line #E7E1D5` |
| Azul do app | gradiente `#2563EB → #4A8CE8` (bolha enviada, botão, avatar) — NÃO usar o `#1556C0` da landing |
| Bolha recebida | branca, borda `#E7E1D5`, radius 16px c/ rabinho 5–6px, texto `#0B1220`, hora `#94A3B8` |
| Bolha enviada | gradiente azul, radius 16 c/ rabinho à direita, meta `rgba(255,255,255,.7)`, checks lidos `#7DD3FC` (lucide Check/CheckCheck) |
| Sugestão da EVA | card `#F7F5FE`, borda `rgba(124,58,237,.18)`, rabinho à esquerda; label "Sugestão da EVA" uppercase `#6D28D9` + EvaNode (anel + núcleo) |
| Botão "Usar resposta" | gradiente azul, `rounded-lg` (8px), ícone ArrowRight, texto branco semibold; hint "você revisa antes de enviar" ao lado — NÃO é o pill preto da landing |
- Nitidez absoluta: renderizar em 1440×2560+ e reduzir; nunca escalar pra
  cima; nenhum texto de UI abaixo de ~17px no frame final.
- Perspectiva 3D é permitida com moderação (rotateY ≤ 14°) e sempre a
  serviço de foco, não de decoração.

## 5. EVA Signal (motivo gráfico reutilizável)

A presença da EVA em vídeo NÃO é um orbe/plasma/partícula. É um sinal
gráfico editorial, em 3 estados, sempre pequeno e preciso:

- **scan** — uma linha fina `#6D28D9` (1.5–2px) que varre o elemento sendo
  lido (ex.: percorre as linhas da conversa de cima pra baixo, 600–900ms,
  easing linear). Opcional: leve trilha de opacidade.
- **lock** — a linha se fecha num sublinhado/colchete no achado (ex.: embaixo
  de "pediu proposta"), com um tick de 2 frames de espessura maior. É o
  "entendi".
- **resolve** — o sublinhado se converte no artefato de UI real: o badge
  Quente, o score, a sugestão. O sinal DESAPARECE quando a UI assume.

Regras: nunca mais de um EVA Signal simultâneo; roxo apenas; sem blur, sem
glow, sem partícula; duração total scan→resolve ≤ 2s.

## 6. Motion

- Easing padrão: `cubic-bezier(.22,1,.36,1)` (soft out). Overshoot elástico
  só em micro-elementos (chips, badges), nunca em painéis ou texto grande.
- Cortes secos > crossfades. Match cut entre estados da UI (mesma posição,
  conteúdo muda) vale mais que qualquer transição.
- Zoom editorial: scale 1.3–1.6 com origem no elemento-alvo, 450–700ms,
  segurar ≥ 900ms no destino, voltar ou cortar.
- Câmera: Ken Burns sutil (≤ 1.06) permitido como respiração; punch de corte
  (1.12→1.0 em ~400ms) nas viradas.
- Proibido: wipe genérico, glitch, shake, bounce em texto, partículas,
  qualquer preset que a CapCut tenha.

## 7. Ritmo (referência de beats)

| Janela | Conteúdo | Regra |
|---|---|---|
| 0.0–1.0s | Hook tipográfico gigante | legível SEM áudio, sem logo |
| 1.0–4.0s | Dor concreta de agência | específica ("lead esperando há 3h"), não abstrata ("perca menos vendas") |
| 4.0–12.0s | Produto agindo | uma ação visível completa, não tour |
| 12.0–17.0s | Insight/aprovação | zoom no achado OU clique humano em "Usar resposta" |
| final | CTA pequeno | não interrompe o ritmo; sem tela de logo longa |

## 8. Sound design (paleta fixa)

Local: `factory/sfx/`. A paleta é GERADA por `factory/sfx/design-sfx.mjs`
(Web Audio API via Playwright: pitch-drop, sweep de filtro, camadas
transiente+corpo+cauda, reverb por convolução) — regenerável e sem licença de
terceiros. Upgrade futuro: substituir os 6 .wav por biblioteca gravada
(Artlist/Epidemic) mantendo os mesmos nomes; o mix não muda.

**Padrão-base da factory:** `factory/films/copiloto-01/` (versão-mãe,
2026-07-02). Novos filmes não copiam a história, mas mantêm a lógica dela:
uma dor visual, uma única prova de produto, um gesto humano como clímax,
acabamento editorial.

| Som | Spec | Quando |
|---|---|---|
| `hook-thud` | impacto grave suave, 50–60Hz, decay ~1s, sem cauda longa | primeiro frame do hook |
| `tick` | click curto seco 2–4ms, banda 1.5–3kHz | cada incremento de score/contador |
| `type` | digitação controlada, 3–5 teclas suaves | texto sendo escrito na UI |
| `approve-click` | click tátil com corpo (mais grave que o tick) | cursor clicando "Usar resposta" |
| `zoom-air` | whoosh curto (≤400ms), filtrado, sem cauda | zooms editoriais |
| `payoff` | resolução suave (2 notas, sem sino de "achievement") | badge/insight final |

Trilha: minimal/moderna (não corporativa), -18 a -14 LUFS abaixo dos SFX,
sem drop, sem riser genérico. Mix final: pico ≤ -1dB, voz (quando existir em
experimento) sempre acima da trilha.

**Padrão: sem voz.** Legendas tipográficas carregam a mensagem.

## 9. Safe zones (1080×1920)

- Topo: 220px livres de texto crítico (UI do IG: nome/menu).
- Base: 320px livres (CTA/caption/barra do TikTok).
- Laterais: 60px de margem mínima; ícones de interação do TikTok cobrem
  ~140px da direita no terço inferior — nada crítico ali.
- Headline principal: centro vertical entre 25% e 65% da altura.

## 10. Checklist anti-"cara de IA"

Antes do review formal, reprove sozinho se aparecer qualquer um:

- gradiente roxo/azul genérico, glow, lens flare;
- partículas, plexus, rede neural, órbitas;
- robô, cérebro, chip, rosto sintético, avatar falando;
- stock de escritório/pessoas apontando pra tela;
- headline com "revolucione", "turbine", "potencialize", "o futuro de";
- promessa de autonomia ("a IA responde por você", "vende sozinho");
- UI inventada que o produto não tem.
