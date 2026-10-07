# Servidor de WhatsApp (Whatsmiau no Railway)

O Vyzon conecta o WhatsApp do cliente pela [Whatsmiau](https://github.com/verbeux-ai/whatsmiau),
um servidor em Go (biblioteca whatsmeow) que fala as mesmas rotas da Evolution API.
Por isso as edge functions continuam com nome `evolution-*` e os secrets
`EVOLUTION_API_URL` / `EVOLUTION_API_KEY`: eles apontam para a Whatsmiau.

É conexão não oficial (QR code, protocolo do WhatsApp Web). O caminho oficial
segue sendo a Kapso (`kapso-whatsapp`, `kapso-webhook`).

## O que o Vyzon espera do servidor

- Imagem `impedr029/whatsmiau` na versão fixa (hoje `v1.5.0`). Não usar `develop`.
- Postgres (sessões do WhatsApp) e Redis (instâncias). O modelo do Railway já cria os dois.
- Volume em `/app/data`, senão cada redeploy pede QR de novo.
- `API_KEY` forte: é o `EVOLUTION_API_KEY` do Supabase.
- Domínio público HTTPS com `/v1` no fim: é o `EVOLUTION_API_URL` do Supabase.
  Desde a v1 todas as rotas ficam sob `/v1` (a raiz responde 404). A chave vai
  no cabeçalho `apikey`, como na Evolution.

## Subir no Railway

1. Abrir https://railway.com/deploy/whatsmiau-whatsapp-api e clicar em Deploy.
2. No serviço WhatsMiau, em Settings > Source, trocar a imagem do modelo
   (`v0.5.0`) por `impedr029/whatsmiau:v1.5.0`.
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

## O que a Whatsmiau não tem

- `findChats`, `findMessages`, `getBase64FromMediaMessage` (da Evolution).
- Evento de presença: o "digitando…" do Inbox não aparece.
