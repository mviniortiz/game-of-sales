---
name: pipeline-vyzon
description: Lê e atualiza o pipeline de vendas da empresa Vyzon dentro do próprio Vyzon (cards, etapas, notas) pela edge distribuicao-inbox. Use para ver quem está quente, criar card quando um dono responde de verdade, mover etapa ou anotar o que ele disse.
example-prompt: Quais cards do pipeline do Vyzon estão parados há mais de 2 dias?
---

# Pipeline do Vyzon

O pipeline da empresa Vyzon, dentro do Vyzon, é o CRM das vendas do Vyzon. A
EVA acompanha esses cards: card parado faz ela sugerir a retomada e pedir
aprovação ao Markus no WhatsApp.

## Acesso

A URL e o segredo ficam em `~/.config/vyzon/distribuicao.env`. Carregue e chame
com curl, sempre com o segredo no header (nunca no texto da resposta ao Markus):

```bash
set -a; . ~/.config/vyzon/distribuicao.env; set +a
curl -s -X POST "$DISTRIBUICAO_URL" -H "x-distribuicao-secret: $DISTRIBUICAO_SECRET" \
  -H "Content-Type: application/json" -d '{"action":"vendas_pipeline"}'
```

## Ações

`vendas_pipeline`: cards abertos (deal_id, titulo, empresa, contato, telefone,
etapa, dias_parado, eva_retomada_pendente, notas).

`vendas_criar` com `card`:
```json
{"action":"vendas_criar","card":{"empresa":"Judá Vidros","cidade":"São José","telefone":"(48) 99821-4712","nicho":"vidraçaria","contato":null,"etapa":"qualification","nota":"Disse que esquece de mandar orçamento depois de medir."}}
```
Devolve 409 com o card existente se o telefone já estiver no pipeline: aí use
`vendas_atualizar` nele.

`vendas_atualizar` com `atualizacao`:
```json
{"action":"vendas_atualizar","atualizacao":{"deal_id":"<uuid>","etapa":"proposal","nota":"Pediu o preço; Raio-X marcado para quinta 14h."}}
```
Etapas: `lead`, `qualification`, `proposal`, `negotiation`, `closed_lost`
(exige `motivo_perda`). `closed_won` é recusado: venda ganha só o Markus marca.

## Regras

- Só cria card para quem respondeu com conteúdo. Contato frio fica na tabela
  prospects do banco do OpenBot.
- Toda chamada que muda algo leva uma nota curta do que a pessoa disse.
- Se `eva_retomada_pendente` for true, não escreva outra retomada: avise o
  Markus que a EVA já mandou uma para aprovar.
- Resposta 422 traz a lista de erros: corrija e tente de novo uma vez.
- Nunca mostre o segredo nem a URL completa ao Markus.
