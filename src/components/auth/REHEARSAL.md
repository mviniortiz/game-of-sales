# Rehearsal: CenaAprovacao (painel escuro do login)

Gold: `messages` (estrutura de conversa num Phone do kit, Thread com bolhas
que sobem, a bolha do dono nascendo do campo), com o satélite e o celular
saindo pela borda de `device-pair`. Mantido: Phone + Thread + Bubble com
`source`, toque `touch`, cursor parado entre gestos, satélite atravessando a
borda direita do herói sobre margem vazia. Mudado: visual do WhatsApp (fundo
`--lp-chat-bg`, bolha enviada `--lp-chat-out`, sem a cauda do iMessage, hora e
tique dentro da bolha), o topo com a Lume (EvaBot) e o celular cortado pela
borda de baixo da tela, não pelo topo do palco.

Beats (wide, ~16 s em loop):
- abre no resultado (é o poster): aviso, 1, confirmação, conversa do Carlos.
- 2 s: a conversa do Carlos e as três mensagens saem juntas, da última para
  a primeira; a Lume aparece "digitando…".
- o aviso real (`buildDraftMessage`) chega; 2,8 s de leitura.
- toque no campo, "1" digitado, botão verde, toque em enviar: a bolha "1"
  nasce do campo (nada sai antes disso).
- Lume "digitando…" e a confirmação real (`Sai em 20 segundos para Carlos...`).
- a conversa do Carlos volta com a mensagem enviada e o selo "Saiu do seu
  número"; Carlos "digitando…"; a resposta abre a própria altura (Collapse).
- segura 1,3 s e emenda no começo, que é o mesmo quadro.

Compacta (palco < 420 px, ou seja desktop de 1024 a ~1290 e telas baixas): o
satélite cobriria o "1", então a resposta do Carlos chega como banner do iOS
sobre o topo da conversa. Mesmo roteiro, sem os beats do satélite.

Celular (< 1024 px): sem cena. Pelo critério do brief caberia: a compacta
teria ~373 px de altura na faixa de 350 px e o Google desceria de 344 para
~739 px (fundo em ~787, acima da dobra de 844). Omiti porque no celular a
pessoa vem para entrar: a faixa escura passaria a ocupar ~70% da tela antes
do formulário, com email e senha abaixo da dobra. Nem o chunk é baixado
(`useColuna` no LoginV2). Para ligar: tirar o `coluna &&` do LoginV2 e a
media query de `.vz-cena-vaga` no entrada.css (a compacta já existe).

Captured:
- 1440x900 loop (contact sheet), estados (`--states`), poster com movimento
  reduzido; 1280x720, 1024x768 (compacta), 1920x1080, 1440x900 às 20h (frase
  de noite, palco limitado pela altura), 390x844 (sem cena).
- `vz-login--saindo` a 0/80/160/330 ms: a cena fica no desenho wide, não
  reescala, some com o corpo e é cortada pelo painel que encolhe.
- Close-ups a 50/60 ms da chegada do aviso e da confirmação.

Film (gate não passa; cada linha olhada no quadro):
- `kit override` (phone island/status/home/screen): falso positivo. O
  film.mjs só reconhece CSS do kit em caminhos `/kit/`; aqui o kit está
  vendorizado em `src/vendor/stageshow/`. Fora isso, o CSS da cena muda raio,
  padding e largura máxima de `.ss-bubble` de propósito: bolha do WhatsApp.
- `uneven gutters` em `.vz-cena__carlos`: é o satélite atravessando a borda
  do celular (56 px da direita do painel = o gutter do painel). Intencional.
- `uneven padding` no cartão do Carlos e na bolha dele: o cartão tem topo de
  conversa (10 px) e bolhas recuadas como no WhatsApp; a bolha usa 7/9 px.
- `settle snap ... 48px` em tudo (EvaBot do topo, banner, Hoje): todos os
  elementos, inclusive os parados, andam os mesmos 48 px no mesmo quadro:
  é a página rolando no filme, não a cena. Nos close-ups o Hoje desliza liso.
- `jump`/`vanishes` em `ss-swap` ("online"/"digitando…") e no olho da EvaBot:
  peças do kit e do produto, troca curta de status.
- `lopsided` no campo de mensagem: é um campo de texto, ocupa a linha.

Assumptions:
- A conversa é desenhada como diálogo (Lume à esquerda, dono à direita). O
  texto do aviso vem do caminho do chat do dono com ele mesmo
  (`buildDraftMessage`, com o prefixo "Lume [A2]"); nesse caminho a
  confirmação real sai como "Lume Sai em 20 segundos...", porque `replyOwner`
  põe "Lume " na frente. Usei o texto sem prefixo, como no brief e como sai
  pelo número oficial (`sendTextViaEva`).
- A resposta do Carlos e o selo "Saiu do seu número" são ilustrativos.
- Hora da cena = hora do login (`?hora=` em dev).

Not checked:
- Revisão de olho novo por outra pessoa/agente.
- Safari e Firefox (filmado só em Chromium/Brave); `container-type: size` e
  `cqh` precisam de Safari 16+.
- Tela real com toque, e o login de verdade (o servidor de dev rodou com
  Supabase de mentira, só para desenhar a tela).
- Tema escuro do sistema (o login força claro).
