# Rehearsal: ConectarDemo

Gold: `phone-touch` (mantido: celular do kit, toque com estilo `touch`, telas como
um objeto só que empurra e volta, loop que fecha com a causa visível; trocado:
o app fitness pelo caminho dentro do WhatsApp, Android e iPhone, código e QR).

Beats (código): Conversas → ⋮ ou aba Configurações → Aparelhos conectados →
Conectar um aparelho → Conectar com número de telefone → código digitado →
volta em Aparelhos conectados com o aparelho novo (payoff) → seta de voltar
leva ao começo. QR: igual até a câmera, que lê o código e volta. Loop ~17 s.

Captured: wide 380 (desktop no modal) e compact 320 (modal a 390), Android
código, Android QR (no modal), iPhone código, iPhone QR, poster com movimento
reduzido (código digitado; QR lido).

Film:
- payoff abaixo do corte → telas de Aparelhos e Câmera encurtadas, palco 420.
- menu do ⋮ por cima da barra de status → menu desce para 54 pt.
- vazio sob a lista no iPhone ao descer até as abas → mais conversas e grupos.
- passos do modal travados no 1 → roteiro, initial e poster memoizados (o
  modal re-renderiza a cada passo).
- `kit override` de `.ss-phone__*`: vem do phone.css já copiado no Vyzon, não
  desta cena; fica.
- `uneven padding` em `.cd-abas`: é a barra de abas do iOS, não um cartão; fica.
- `touching` no menu: barras do menu por cima das da lista, o menu é opaco; fica.

Assumptions: textos do WhatsApp em pt-BR (Aparelhos conectados, Conectar um
aparelho, Conectar com número de telefone, Configurações, Conversas). Código
de exemplo K7QM-2WXA. O nome do aparelho na lista fica em barra: o WhatsApp
mostra o nome que a Whatsmiau manda, que não está no código.

Not checked: tema escuro do app (o modal é claro); um celular de verdade com a
conexão real (sem conta de teste aqui); o botão "Copiar e abrir o WhatsApp"
abrindo o app no aparelho.
