# Bots do Vyzon no OpenBot

Ferramenta interna do Markus para gerir e crescer o Vyzon, não feature de
cliente. Começa com um bot e cresce para dois:

| Ordem | Bot | Função | Arquivo |
|---|---|---|---|
| 1º | Assistente de marketing | Ajudar a criar conteúdo do Vyzon (posts, carrosséis, roteiros de reel, artigos) e usar o conteúdo para puxar conversa com quem sente a dor | `01-assistente-de-marketing.md` |
| 2º | Especialista de produto | Entender como melhorar o Vyzon e para onde ir: qual problema, qual nicho, o que construir e o que parar | `02-especialista-de-produto.md` |

Nenhum dos dois publica, envia mensagem ou fala com ninguém. Eles entregam
rascunho e recomendação; quem publica, envia e decide é o Markus.

O desenho maior, com seis bots de distribuição, está em
`docs/distribuicao/time-de-bots.md` e fica para quando houver clientes.

## Passo a passo

1. **Licença.** O OpenBot declara licença PolyForm Noncommercial. Conferir em
   Settings → Billing a licença para uso em empresa antes de usar no Vyzon.
2. **Criar o agente**, provedor Claude. Assistente de marketing: Sonnet.
   Especialista de produto: Opus. Permissão: **Ask first**.
3. **Instruções:** colar `00-regras-comuns.md` inteiro e, logo abaixo, o
   arquivo do papel do bot.
4. **Workspace:** apontar o agente para a pasta do repositório do Vyzon. Os
   dois só leem o código, para não afirmar nada que o produto não faz.
5. **Banco compartilhado:** no chat do primeiro bot, colar `tabelas.sql` e
   pedir: "Crie estas tabelas no banco compartilhado, uma instrução por vez,
   e depois insira os dados iniciais." O banco do OpenBot aceita uma
   instrução SQL por chamada.
6. **Rotina semanal** com o horário indicado no arquivo do bot. Entrega no
   próprio OpenBot, com aviso no celular, ou num grupo do Telegram.
7. **Primeira rodada à mão:** pedir a primeira entrega pelo chat e conferir
   antes de ligar a rotina.

### Só para o Especialista de produto (2º bot)

- **Skills:** pedir "Registre como skill a pasta
  `docs/distribuicao/openbot/skills/ler-avaliacoes-maps`" e o mesmo para
  `skills/classificar-respostas`.
- **Login do Google** no navegador do OpenBot, feito pelo Markus. Sem login o
  Maps mostra só 3 avaliações por empresa.
- **Painel do Vyzon (opcional):** números da prospecção e da landing pela
  edge `distribuicao-inbox`, ação `painel`, com a URL e o segredo de
  `~/.config/vyzon/distribuicao.env`. Só agregados, sem dado pessoal.

## O que já está no banco ao começar

`tabelas.sql` traz o que foi levantado até 24/10/2026: o teste de energia
solar, a pesquisa de avaliações de vidraçaria, planejados e buffet, as
hipóteses abertas e as duas conversas pendentes de solar.
