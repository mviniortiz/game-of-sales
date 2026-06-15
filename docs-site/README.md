# docs-site — Portal de documentação (Mintlify)

Site de documentação da API do Vyzon, gerado com [Mintlify](https://mintlify.com).
Gera automaticamente a API Reference (a partir do OpenAPI) e um **servidor MCP** em
`<url-do-site>/mcp`, que a EVA / Claude / Cursor podem consumir.

## Preview local

```bash
cd docs-site
npx mint dev      # abre em http://localhost:3000
```

## Deploy (passo manual, uma vez)

O deploy do Mintlify é por integração com o GitHub, não por CI próprio:

1. Crie a conta em [mintlify.com](https://mintlify.com) e instale o app do Mintlify no repositório `game-of-sales`.
2. No dashboard do Mintlify, aponte o diretório de docs para **`docs-site/`**.
3. A cada push na branch configurada, o Mintlify publica. O MCP fica disponível em `<seu-dominio>/mcp`.
4. (Opcional) Aponte um subdomínio `docs.vyzon.com.br` para o site.

## Estrutura

```
docs-site/
  docs.json                  # config: tema, cores da marca, navegação
  introduction.mdx           # visão geral
  authentication.mdx         # modelos de auth
  guides/webhooks.mdx        # webhooks de venda
  api-reference/openapi.json # spec OpenAPI → gera as páginas de endpoint + MCP
```

## Como expandir

- **Novos endpoints**: adicione o path em `api-reference/openapi.json`. As páginas e o
  MCP se atualizam sozinhos. O catálogo completo das 52 functions está em
  [`../docs/api/edge-functions.md`](../docs/api/edge-functions.md) como fonte.
- **Novas páginas de produto** (Inbox, Pipeline, EVA, Agentes): crie um `.mdx` e
  referencie em `docs.json` → `navigation`.
