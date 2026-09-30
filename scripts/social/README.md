# Canal de distribuição (X + Instagram)

Publica um post no X (`@vyzonapp`) e no Instagram (`@vyzoncrm`) a partir de um
manifesto versionado em `distribution/posts/<id>.json`.

**Regra do canal:** nada sai sem aprovação humana. O comando simula por padrão.
Com `--publish`, mostra o post e exige digitar `publicar`. Mesma lógica da EVA
("a EVA sugere, seu time aprova"), aplicada ao nosso próprio marketing.

## Uso

```bash
npm run social:post -- distribution/posts/<id>.json              # simula, não publica
npm run social:post -- distribution/posts/<id>.json --publish    # publica (pede "publicar")
npm run social:post -- distribution/posts/<id>.json --publish --only x
npm run social:test                                              # testes do canal
```

A simulação checa, sem rede e sem credencial:

- copy: sem travessão, sem emoji, sem expressão proibida (CLAUDE.md regra 4 e
  checklist anti-"cara de IA" do style guide do product film);
- X: até 280 caracteres na contagem do X (URL vale 23), até 4 imagens ou 1
  vídeo/GIF, imagem até 5 MB, vídeo até 140s;
- Instagram: legenda até 2.200 caracteres e 30 hashtags, 1 a 10 itens, imagem
  só JPEG, Reels em 9:16 e 3 a 90s (duração/proporção só com `ffprobe` instalado).

Depois de publicar, o comando grava em `published` o id e a URL de cada rede e
salva o manifesto na hora. Rodar de novo pula o que já saiu, então uma falha no
Instagram não duplica o post do X. Commite o manifesto: ele é o histórico.

## Manifesto

```json
{
  "id": "2026-10-01-copiloto-01",
  "media": ["factory/films/copiloto-01/copiloto-01-final.mp4"],
  "x": { "text": "Texto do X." },
  "instagram": { "caption": "Legenda do Instagram.", "share_to_feed": true }
}
```

- `media`: caminhos relativos à raiz do repo (ou URL `https://` pública, só no
  Instagram). 1 vídeo vira Reels; 1 imagem vira post; 2 a 10 itens viram carrossel.
- `x.media` / `instagram.media`: sobrescrevem `media` naquela rede (ex.: o X
  com 4 das 8 imagens de um carrossel).
- Sem o bloco `x` ou `instagram`, a rede fica de fora.
- A mídia de `factory/` não é versionada; o comando roda na máquina onde o
  render está.

## Setup (uma vez)

Credenciais vão no `.env.local` da raiz (já ignorado pelo git). Nunca commitar.

### X

1. Em developer.x.com, crie um app no projeto da conta `@vyzonapp`.
2. Em *User authentication settings*, permissão **Read and write**.
3. Em *Keys and tokens*, gere API Key/Secret e Access Token/Secret (o access
   token precisa ser gerado **depois** de ligar Read and write).
4. Confira no portal o plano de acesso da API: escrita (postar) pode ser paga
   ou ter cota. Não verificamos o preço atual.

```
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

### Instagram

1. A conta `@vyzoncrm` precisa ser **Business ou Creator**.
2. Em developers.facebook.com, crie um app com o produto **Instagram API with
   Instagram Login**, permissões `instagram_business_basic` e
   `instagram_business_content_publish`. Com o app em modo de desenvolvimento
   e a conta `@vyzoncrm` adicionada como testadora do app, dá pra publicar sem
   App Review (é o nosso próprio perfil, não de terceiros).
3. Gere o token da conta no painel do app (token longo, 60 dias) e anote o id
   do usuário do Instagram.
4. Renove antes de vencer: `npm run social:post -- --ig-refresh-token`.

```
IG_USER_ID=
IG_ACCESS_TOKEN=
# IG_GRAPH_VERSION=v23.0
```

### Hospedagem da mídia (só Instagram)

O Instagram baixa a mídia de uma URL pública; não aceita upload direto com
Instagram Login. Arquivo local sobe pro Supabase Storage antes do post:

1. Supabase Dashboard > Storage > New bucket `social-media`, marcado como
   **Public**.
2. No `.env.local`:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# SOCIAL_BUCKET=social-media
```

## O que ainda não foi testado

Os fluxos do X e do Instagram estão cobertos por testes com `fetch` simulado
e a assinatura OAuth bate com o exemplo oficial do X, mas o primeiro post real
é o teste de verdade. Faça o primeiro com `--only x` ou `--only instagram`
separado, pra isolar problema de credencial.

Limites das APIs: Instagram publica até 100 posts via API por 24h.
