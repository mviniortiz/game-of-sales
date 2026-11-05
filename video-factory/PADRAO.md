# Padrão dos posts do Vyzon (reels e carrosséis)

Vale desde 04/11/2026 para todo post do @vyzoncrm: reel, carrossel, imagem
única e capa. Um sistema só, o mesmo da home (bloco "Lume em campo", LP.9 de
`src/index.css`). Quem abre o perfil precisa reconhecer o Vyzon pela grade,
sem ler o nome.

## 1. A Lume é a protagonista

- Nome: **Lume**, assistente do Vyzon. Vyzon é o produto, a Lume é quem faz o
  trabalho. O aviso real no WhatsApp começa com "Lume"
  (`EVA_PREFIX` em `supabase/functions/_shared/whatsappApproval.ts`). Nunca
  "EVA" em post novo.
- Desenho: o bot de `src/components/eva/` (cápsula azul, visor noite, olhos
  âmbar, placa solar). Em vídeo e carrossel ele vem do `molde-vyzon-solar/base.js`
  (`.eva`), nunca redesenhado. Proibido orbe, partícula, rosto, corpo humano.
- Ela aparece em **todo** post: grande (60 a 75% da largura) na capa e no
  fechamento; sentada na borda de cima dos cartões no meio.
- Os estados dela contam a história, sem legenda explicando:
  `olho` (de olho na conversa), `lendo` (olhos em barra), `alerta` (achou a
  proposta parada, placa acesa), `escrevendo` (três pontos), `saiu` (sorriso,
  a mensagem foi).

## 2. A história é sempre a mesma, em 3 tempos

1. **Dor, com as palavras do dono:** "Mandou a proposta e o cliente sumiu?",
   "Vou pensar", "visualizou e não respondeu". Uma dor por post.
2. **A Lume resolve, numa ação que se vê:** ela lê, avisa no 2º dia, entrega a
   mensagem pronta no WhatsApp do dono.
3. **O dono decide:** responde 1 e sai do número dele. A aprovação aparece
   sempre (o "1", a janela de 20 s para desfazer ou o selo "Saiu do seu
   número"). Nada de "a IA responde por você".

Simples: uma ideia por slide, no máximo 12 palavras no título, um número por
cena. Se precisa de legenda para entender, está complicado.

## 3. Cores (tokens da home, nada fora disso)

| Token | Hex | Uso |
|---|---|---|
| sol | `#FFC933` | capa e payoff; marca-texto branco por cima |
| noite | `#0F1730` | a virada (a Lume age) e o fechamento; texto branco |
| creme | `#F3EFE4` | conversas e listas |
| tinta | `#0F1730` | texto em fundo claro; secundário `#3B4560`, `#566079` |
| azul | `#1556C0` | o número que importa, o "2º dia" |
| conversa | `#EFEAE2` fundo, `#D9FDD3` saída, branco entrada, ✓✓ `#53BDEB` | o WhatsApp como objeto |
| carimbos | espera `#A14A07`, ok `#0F7B4F` | estado, sempre com a palavra |

Fundo chapado por slide ou cena, sem gradiente, sem brilho, sem textura.
Alternância padrão: sol → creme → noite → creme → sol → noite.

## 4. Tipo

Geist em tudo (600 títulos, 500 UI, 400 corpo). Títulos com tracking -0,04em.
- Reel 1080×1920: título 130 a 150 px; UI ≥ 34 px; piso absoluto 28 px.
- Carrossel 1080×1350: título 96 a 120 px; corpo 40 a 46 px; rodapé 28 px.
Marca-texto atrás de **uma** expressão por slide, desenhado da esquerda: `sol`
em fundo creme, branco em fundo sol. Em fundo noite não tem marca-texto: a
expressão vai em `sol` (o marca-texto some contra o escuro e reprova no contraste).

## 5. Grade e margens

- Carrossel 1080×1350 (4:5), margem 90 px. Título no terço de cima. Rodapé fixo
  em todo slide: "vyzon" à esquerda e o número do slide (`2/7`) à direita, 28 px.
- Reel 1080×1920: nada crítico acima de 220 px nem abaixo de 1600 px; legenda a
  150 px das laterais.
- Capa do reel = o primeiro quadro: o gancho já inteiro, legível sem som.

## 6. Estrutura do carrossel (6 a 8 slides)

1. Capa (sol): a dor em pergunta + a Lume grande olhando para o texto.
2. A dor concreta (creme): a conversa parada, com hora e ✓✓.
3. O custo (creme ou noite): dias sem resposta ou o valor parado.
4. A Lume age (noite): o aviso dela no WhatsApp, texto copiado do código.
5. O dono decide (creme): o "1" e "Sai em 20 segundos…".
6. Prova (creme): a mensagem saiu do número dele; resposta do cliente
   ilustrativa, marcada como exemplo no rodapé.
7. Fechamento (noite, ou sol se o slide anterior for noite): "A Lume sugere. Você aprova." + "Ver minhas propostas
   paradas · grátis · vyzon.com.br".

## 7. Texto

- Sem travessão, emoji, "revolucione", "turbine", "o futuro de", "não é X, é Y".
- Claim só com código: textos de produto copiados de
  `_shared/whatsappApproval.ts`; números e promessas da home
  (`src/pages/SolarLanding.tsx`). Exemplo com nome e valor é ilustrativo e diz
  isso no rodapé quando parecer dado real.
- CTA único: "Ver minhas propostas paradas", grátis e sem cartão
  (`CTA` e `CTA_DEPOIS` da home). Preço só se o post for sobre preço
  (`src/config/plans.ts`).
- Legenda do post passa pela skill `humanizer`.

## 8. Onde vive

- Reels: `video-factory/films/<slug>/` (skill `vyzon-product-film`).
- Carrosséis: `video-factory/carrosseis/<slug>/index.html`, renderizados em PNG
  com `node scripts/carrossel.mjs <slug>`; saída em
  `~/Movies/vyzon-film/entregas/carrosseis/<slug>/`.
