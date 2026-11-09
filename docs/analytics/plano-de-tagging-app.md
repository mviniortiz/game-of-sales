# Plano de tagging do app (como as integradoras usam o Vyzon)

Versão 1, 08/11/2026. Vale para o app logado. O site e o blog seguem `landing_events` e `src/lib/landingFunnel.ts`.

## Perguntas que o plano responde

1. **Ativação:** a integradora conectou o WhatsApp, viu o Raio-X, abriu uma conversa com a Lume e aprovou o primeiro aviso?
2. **Hábito:** em quantos dias da semana ela entra? Quais telas usa e quais ignora?
3. **Valor:** quantos avisos da Lume ela aprova, corrige ou descarta? Quantos orçamentos voltaram?
4. **Atrito:** onde ela trava? Erro de conexão, busca sem resultado, tela que abre e fecha em segundos.

Com poucas integradoras, a pergunta é sempre "o que **esta** integradora fez". Por isso o evento é gravado com empresa e pessoa.

## Duas camadas

| Camada | Para quê | Onde ver |
| --- | --- | --- |
| `app_events` (banco, nosso) | Uso por empresa e por pessoa, funil de ativação, dias ativos. Fonte de verdade. | Resultados → aba **Uso do app** (só super admin), ou SQL nas views `vw_app_uso_empresa_dia` e `vw_app_ativacao` |
| GA4 + Clarity (`trackBehavior`) | Funil agregado e gravação das sessões para ver onde travou | GA4 DebugView e Clarity, filtro por evento ou tag |

Tudo passa por um helper só, `trackApp(evento, props)` em `src/lib/appAnalytics.ts`. Ele grava nas duas camadas e nunca quebra a tela: se o banco ou o GA4 falharem, o app segue.

- Os eventos entram numa fila e vão ao banco em lote, a cada 5 segundos e quando a aba fecha ou some.
- No banco, a RPC `log_app_events` pega a pessoa pelo login (`auth.uid()`) e a empresa pelo perfil dela. Ela não confia em empresa mandada pelo navegador.
- Sessão de super admin dentro de outra empresa grava `como_admin = true`, para não sujar o uso da integradora.
- Sessão de demo (iframe ou flag de demo) não grava no banco.

## Convenções

- **Nome:** `objeto_acao` em snake_case, no passado quando o fato já aconteceu (`whatsapp_connected`, `deal_created`). Todos os nomes ficam em `APP_EVENTS`; nada de texto solto no componente.
- **Tela:** toda linha leva `tela`, o nome curto da rota (`inicio`, `conversas`, `funil`, `orcamentos`, `obras`, `resultados`, `lume`, `agenda`, `config`, `negocio`), e `aba` quando a tela tem abas (Resultados e Orçamentos).
- **Props:** só texto, número ou sim/não, sem objeto aninhado (o GA4 não aceita). Nunca nome, telefone, e-mail ou texto de mensagem do cliente. Valor em reais pode, porque é o que a integradora quer medir.
- **Origem:** quando a mesma ação acontece em lugares diferentes, a prop `origem` diz de onde veio (ex.: negócio criado pela conversa, pelo funil ou pelo aviso da Lume).

## Propriedades da sessão (Clarity e GA4)

| Propriedade | Valor | Para quê |
| --- | --- | --- |
| `clarityIdentify` | id do usuário | Juntar as sessões da mesma pessoa |
| `empresa` (tag) | id da empresa | Filtrar as gravações de uma integradora |
| `plano` (tag) | `pago`, `fundadora` ou `free` | Comparar quem paga com quem não paga |
| `papel` (tag) | `admin` ou `vendedor` | Separar dono de vendedor |
| `whatsapp` (tag) | `conectado` ou `desconectado` | Ver o uso sem conexão |

## Dicionário de eventos (versão 1)

### Navegação

| Evento | Quando | Props |
| --- | --- | --- |
| `app_session_started` | Primeira tela da sessão (uma vez por aba aberta) | `tela` |
| `screen_viewed` | Toda troca de rota ou de aba interna | `tela`, `aba`, `de` (tela anterior) |
| `search_used` | Busca de cliente (⌘K) fechada depois de digitar | `resultados`, `abriu` (sim/não) |
| `list_more_shown` | Clique em "Mostrar mais" | `tela`, `ja_visiveis`, `total` |

### Ativação

| Evento | Quando | Props |
| --- | --- | --- |
| `whatsapp_connect_started` | Abriu o QR Code | `tela` |
| `whatsapp_connected` | A conexão confirmou | `segundos` (do QR até conectar) |
| `whatsapp_connect_failed` | Deu erro ou expirou | `motivo` |
| `raiox_viewed` | Abriu o relatório do Raio-X | `itens`, `valor_parado` |

### Conversas e Lume

| Evento | Quando | Props |
| --- | --- | --- |
| `conversation_opened` | Abriu uma conversa | `tem_negocio`, `tem_orcamento`, `nao_lidas` |
| `message_sent` | Mandou mensagem pelo app | `tipo` (texto, audio, midia), `origem` (manual, lume) |
| `lume_analysis_requested` | Pediu a leitura da Lume | `origem` (auto, manual, reanalisar) |
| `eva_suggestion_shown` / `_accepted` / `_adjusted` | Já existem: resposta sugerida mostrada, usada como está ou corrigida | |

### Funil, orçamentos e obras

| Evento | Quando | Props |
| --- | --- | --- |
| `deal_created` | Negócio novo | `origem` (funil, conversa, lume) |
| `deal_stage_changed` | Mudou de etapa | `para_tipo` (aberta, ganho, perdido), `origem` (arrastar, menu) |
| `quote_outcome_set` | Marcou resultado no Orçamentos | `resultado` |
| `filter_applied` | Trocou filtro ou aba de lista | `tela`, `filtro` |

### Lembretes e equipe

| Evento | Quando | Props |
| --- | --- | --- |
| `reminder_completed` | Concluiu lembrete | `atrasado` (sim/não) |
| `reminder_snoozed` | Adiou lembrete | |
| `team_invite_sent` | Já existe em `FUNNEL_EVENTS` | |

O que já acontece no servidor não vira evento de tela. Aprovação do aviso da Lume pelo WhatsApp (1, 2 ou texto), orçamento que voltou e obra criada pelo negócio ganho já estão nas tabelas `agent_suggestions`, `quote_tracking` e `obras`. As views juntam esses dados com `app_events`.

## Funil de ativação (view `vw_app_ativacao`)

Para cada empresa, a data da primeira vez de:

1. conta criada (`companies.created_at`)
2. WhatsApp conectado (`whatsapp_connected` ou `channel_connections`)
3. Raio-X visto (`raiox_viewed`)
4. primeira conversa aberta no app (`conversation_opened`)
5. primeiro aviso da Lume aprovado (`agent_suggestions` aprovada)
6. voltou depois de 7 dias (`app_session_started` 7 ou mais dias depois da conta)

## Como validar um evento novo

1. No localhost (`npm run dev`), logado, o painel "Analytics ao vivo" no canto da tela mostra cada evento na hora, com tela, props e se o lote gravou no banco. Ele não vai pro build de produção.
2. Dispare na tela e confira no GA4 DebugView e no Clarity (o evento aparece na sessão).
3. Confira a linha em `app_events`, com `empresa`, `pessoa`, `tela` e `props` certos.
4. Acrescente o evento a este documento e a `APP_EVENTS`.
