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

### EVA em campo (padrão desde 01/11/2026; `molde-vyzon-solar` + `molde-eva-campo/tema.css`)

O mesmo sistema da home (bloco LP.9 de `src/index.css`). Fundos chapados por cena:
sol `#FFC933` no gancho e no payoff, noite `#0F1730` na virada e no CTA, creme
`#F3EFE4` nas conversas. Geist, a fonte do app e da home, em tudo, marca-texto branco em fundo
sol. A EVA é a estrela: grande no gancho e no payoff, sentada nos cartões no meio.
Exemplo: `films/eva-campo`.

### Vyzon Solar (home até 01/11/2026; `video-factory/molde-vyzon-solar`)

Usado em `dia-2` e `parado`.

| Papel | Valor | Uso |
|---|---|---|
| Fundo | `#F6F7F9` (papel frio) | todas as cenas |
| Texto | `#0D1421`; secundário `#4A5363`, `#5F6776` | títulos e corpo |
| Azul dono | `#1556C0` | número que importa, dia 2, barra do rascunho |
| Marca-texto | `#FFD84A` | só atrás de texto `#0D1421`, uma vez por cena, desenhado da esquerda |
| Conversa | `#EFEAE2` fundo, `#D9FDD3` saída, branco entrada, ✓✓ `#53BDEB` | o WhatsApp como objeto |
| Carimbos | espera `#A14A07`, ok `#0F7B4F` | estado, sempre com a palavra |
| EVA | EvaBot (cores de `src/components/eva/evaBot.css`) | avatar e apoio; grande só no registro EVA em campo |

Fontes: Archivo 800 nos títulos (118–132 px, tracking -0.035em), Barlow
Condensed 700 nos números, Geist na UI e no corpo. Objetos: a conversa de
WhatsApp (`.conversa`) e a fatura (`.fatura`, no molde da conta de luz). Sem
gradiente, sem brilho, sombra suave de papel.

### Noite azul (aprovado em 17/10/2026; molde ficou no PC antigo)

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

- **Headlines:** Archivo 800 (Vyzon Solar; Satoshi 900 só na Noite azul),
  tracking -0.035em, line-height ~1.02, 118–132 px. Máx ~6 palavras por beat.
  Entram por máscara (linha sobe de baixo); o gancho já está na tela no quadro 0.
- **Kicker:** Geist 600, 34 px, caixa alta, tracking .08em.
- **Números:** Barlow Condensed 700 (valores, dias, preço).
- **UI dos cartões:** Geist 400/600, 37–46 px no texto de mensagem, ≥ 30 px no
  resto. Linha que corta no celular é defeito: quebre em duas.
- **Legenda da narração:** Archivo 800, 54 px, centrada, faixa 1460–1600 px.
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
- No registro Vyzon Solar o produto aparece onde o dono o vê de verdade: no
  WhatsApp dele (aviso "Aviso do Vyzon · no seu WhatsApp", como na home). A
  fatura é objeto gráfico do design system, não print do app.
- Dados fictícios coerentes de integrador: cliente pessoa física, proposta em PDF
  ("Proposta_8,4kWp.pdf", R$ 38.400), conversa curta.

## 5. A EVA em cena

EvaBot em HTML, mesmo desenho do app: cápsula azul, visor azul-noite, olhos âmbar
e placa solar. Basta um `<div class="eva">` com `--s` no CSS: `VF.montar()` desenha.
Movimento só por GSAP, com os estados do app em `VF.evaEstado`: `olho`, `lendo`
(olhos em barra varrendo, via `evaLendo`), `alerta` (pulinho, células acesas),
`escrevendo` (pontos, via `evaDigita`) e `saiu` (olhos em arco, painel aceso). Entre
eles, `evaVive`, `evaPisca` e `evaOlhar`. Em fundo escuro use `.eva--noite`. No
registro EVA em campo ela senta na borda de cima dos cartões (`.sentada`).

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
