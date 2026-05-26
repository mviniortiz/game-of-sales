# Roteiro de Demo — Vyzon (DEMO.1)

Apresentação comercial do CRM Vyzon para possível cliente. Ambiente: company **Vyzon Demo**
(workspace apresentado como **Agência Metria Growth**). Login: conta admin da Vyzon Demo.

> Dados do seed (`supabase/seed/demo_metria_growth.sql`): 5 contatos, 5 conversas, 3 deals, 5 análises da EVA.
> Reaplicar: `npx supabase db query --linked -f supabase/seed/demo_metria_growth.sql`

## Contatos do roteiro (use SÓ estes)
| Contato | Origem | Contexto | Estado |
|---|---|---|---|
| **Carla Ribeiro** | Meta Ads | Clínica de estética, quer tráfego pago | Lead quente, sem resposta · deal em Qualificação (vinculado) |
| **Mayara Sampaio** | WhatsApp | Quer diagnóstico comercial | Aguardando resposta |
| **Jean Spinola** | Indicação | Tráfego para negócio local | Follow-up · deal em Proposta (vinculado) |
| **Fernanda Paiva** | Meta Ads | Objeção de preço | Deal parado há ~9 dias (Negociação) |
| **Pedro Almeida** | WhatsApp | Quer site, não tráfego | Sem fit (frio) |

## Ordem da apresentação (≈8 min)

### 1. Central de Comando — "abra e saiba o que resolver primeiro" (`/inicio`)
- **Fala:** "Quando seu vendedor abre o Vyzon de manhã, a primeira tela já diz o que resolver primeiro, sem ele caçar nada."
- Mostre **Prioridades do dia**: a Carla aparece no topo ("Responda Carla agora" — lead quente sem resposta) e a Fernanda como oportunidade parada.
- Mostre os **KPIs** (conversas ativas, leads quentes, aguardando resposta, oportunidades abertas).
- No card da **EVA**, digite/clique **"O que preciso resolver agora?"** → a EVA responde com base nos dados reais e dá botões de ação.
- **Fala:** "A EVA é assistida: ela sugere e prioriza, o time decide. Nada é enviado sozinho."

### 2. Inbox + EVA — "do WhatsApp ao próximo passo" (`/inbox`)
- Abra a conversa da **Carla Ribeiro**.
- Mostre o card de conexão no topo da lista: **"WhatsApp conectado"**.
- Na coluna da direita (EvaPanel), mostre a análise salva: **Resumo, Qualificação (quente, fit bom), Próxima ação e Resposta sugerida**.
- **Fala:** "A EVA leu a conversa, qualificou o lead e já sugere a resposta. O vendedor usa, edita ou ignora."

### 3. Criar/Vincular oportunidade — "conversa vira pipeline"
- Na conversa da Carla, mostre o banner **"Oportunidade vinculada"** → **Abrir oportunidade**.
- Abra a **Mayara** (sem deal) pra mostrar o **"Criar oportunidade no pipeline"** e o **"Vincular existente"**.
- **Fala:** "Em um clique a conversa vira oportunidade no funil, sem planilha paralela."

### 4. Pipeline — "tudo conectado" (`/pipeline`)
- Mostre os deals nas etapas: **Carla (Qualificação)**, **Jean (Proposta)**, **Fernanda (Negociação, parada)**.
- Aponte o **badge WhatsApp** e o **"Abrir conversa"** no card.
- **Fala:** "Cada card carrega a conversa e a leitura da EVA. O gestor vê onde está travando."

### 5. Deal com contexto (`/deals/<id>` — abra pelo card)
- Abra o deal da **Carla** → mostre a **conversa vinculada** e o **"Abrir conversa"** (volta pra Inbox certa).
- **Fala:** "Da oportunidade você volta pra conversa em um clique. Contexto sempre junto."

## Falas de fechamento
- "Menos lead perdido, menos cobrança no grupo, mais oportunidade andando."
- "Tudo isso com a EVA assistida: ela sugere, seu time aprova."

## O que EVITAR mostrar
- ❌ **Não clicar em "Reanalisar" na EVA** — a análise já está pronta na tela (vinda do seed). Reanalisar chama a IA de verdade, consome cota e pode trocar o texto curado. (Se acontecer, re-rode o seed pra restaurar.) Logado como **admin**, o tenant guard passa e não dá erro; como outro usuário, pode dar `TENANT_MISMATCH`.
- ❌ **Não clicar em "Sincronizar histórico"** ao vivo — isso importa o WhatsApp real conectado (contatos pessoais aparecem na tela).
- ❌ **Não enviar mensagem real** pela Inbox — a Evolution está ligada a um WhatsApp real.
- ❌ **Não abrir conversas/contatos fora da lista do roteiro** — pode haver dados de teste antigos com nomes inconsistentes.
- ❌ **Não abrir Configurações → Integrações** com credenciais/telefone reais à mostra.
- ❌ Evitar a aba de planos/preço se o foco da conversa não for comercial ainda.

## Reset rápido antes de apresentar
1. Reaplique o seed (garante o estado limpo dos 5 contatos):
   `npx supabase db query --linked -f supabase/seed/demo_metria_growth.sql`
2. Em `/inicio`, clique **Atualizar** pra recarregar prioridades.
3. Confirme que a Carla aparece como prioridade e que o WhatsApp está "conectado".
