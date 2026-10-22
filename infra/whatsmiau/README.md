# Servidor de WhatsApp (Whatsmiau no Railway)

O Vyzon conecta o WhatsApp do cliente pela [Whatsmiau](https://github.com/verbeux-ai/whatsmiau),
um servidor em Go (biblioteca whatsmeow) que fala as mesmas rotas da Evolution API.
Por isso as edge functions continuam com nome `evolution-*` e os secrets
`EVOLUTION_API_URL` / `EVOLUTION_API_KEY`: eles apontam para a Whatsmiau.

É conexão não oficial (QR code, protocolo do WhatsApp Web). O caminho oficial
segue sendo a Kapso (`kapso-whatsapp`, `kapso-webhook`).

## O que o Vyzon espera do servidor

- Imagem `impedr029/whatsmiau` na versão fixa (hoje `v1.6.0`). Não usar `develop`.
- Postgres (sessões do WhatsApp) e Redis (instâncias). O modelo do Railway já cria os dois.
- Volume em `/app/data`, senão cada redeploy pede QR de novo.
- `API_KEY` forte: é o `EVOLUTION_API_KEY` do Supabase.
- Domínio público HTTPS com `/v1` no fim: é o `EVOLUTION_API_URL` do Supabase.
  Desde a v1 todas as rotas ficam sob `/v1` (a raiz responde 404). A chave vai
  no cabeçalho `apikey`, como na Evolution.

## Subir no Railway

1. Abrir https://railway.com/deploy/whatsmiau-whatsapp-api e clicar em Deploy.
2. No serviço WhatsMiau, em Settings > Source, trocar a imagem do modelo
   (`v0.5.0`) por `impedr029/whatsmiau:v1.6.0`.
3. Em Settings > Networking, gerar o domínio público na porta 8080.
4. Em Variables, copiar o valor de `API_KEY`.
5. Gravar no Supabase (na pasta `game-of-sales`):

   ```bash
   npx supabase secrets set EVOLUTION_API_URL=https://SEU-DOMINIO.up.railway.app/v1 EVOLUTION_API_KEY=VALOR_DA_API_KEY
   ```

6. Conferir: `curl -s https://SEU-DOMINIO.up.railway.app/v1/instance/fetchInstances` sem chave responde 401.

No painel, trocar a imagem pelo lápis do campo Source Image. Conferir em
Details que o valor novo não ficou vazio antes de clicar em Deploy: uma
mudança com valor vazio deixa o serviço sem imagem.

## Como o Vyzon usa

- `evolution-whatsapp` cria a instância `wa_<userId>` com `syncFullHistory` e
  webhook com `base64: true` e eventos `MESSAGES_UPSERT`, `MESSAGES_UPDATE`,
  `MESSAGES_SET`.
- `evolution-message-webhook` recebe: `messages.upsert` (mensagem nova, com o
  arquivo de mídia dentro do evento, guardado no bucket `whatsapp-media`),
  `messages.update` (entregue/lido) e `messages.set` (histórico recente dos
  últimos 90 dias, logo depois de conectar; não abre rastreio de orçamento).
- "Puxar mensagens antigas" no Inbox chama `/chat/syncMessages`, que pede ao
  celular mensagens anteriores à mais antiga já gravada de cada conversa.

## Atualizar a versão

Antes de trocar a imagem, ler as notas da versão nova
(https://github.com/verbeux-ai/whatsmiau/releases) contra o que o Vyzon usa
(seção abaixo). Publicar primeiro a edge que já aguenta a versão nova, depois
trocar a imagem pelo lápis do Source Image e conferir em Details que o valor
não ficou vazio. O volume em `/app/data` mantém as sessões: ninguém precisa
ler QR de novo.

Notas por versão:

- **v1.6.0** (11/10/2026): mensagem editada chega como `messages.upsert` com
  `messageType: editedMessage` e id novo. A `evolution-message-webhook` ignora
  (senão duplica a conversa e a prospecção responde de novo). O caminho some
  numa versão posterior a 04/11/2026, quando edição passa a vir só em
  `messages.edited`, que o Vyzon não assina. Também: leitura feita no próprio
  celular do dono chega como `MESSAGES_UPDATE` `READ` com `fromMe: true` (só
  marca como lida a mensagem recebida; o contador de não lidas não muda) e o
  `messageTimestamp` da resposta de envio vem em segundos (o Vyzon já usa o
  relógio próprio).

## O que a Whatsmiau não tem

- `findChats`, `findMessages`, `getBase64FromMediaMessage` (da Evolution).
- Evento de presença: o "digitando…" do Inbox não aparece.
