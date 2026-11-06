# Lume lê a conta de luz que chega no WhatsApp

Status: construída em 06/11/2026 na branch `claude/conta-de-luz`, ainda não publicada.
Falta aplicar a migration, publicar as edges e testar com fotos reais.

## O que muda pro dono

O cliente manda a foto ou o PDF da conta de luz na conversa. Uns segundos
depois, o painel da Lume naquela conversa mostra:

> Li a conta de luz: 450 kWh/mês, R$ 412, Celesc, Florianópolis, residencial.
> [Confirmar] [Corrigir]

- A Lume passa a usar consumo, valor, cidade e tipo na leitura da conversa.
- A Lume para de sugerir "pedir a conta de luz" naquela conversa.
- Se o cliente já virou obra, "Conta de luz" fica marcada como recebida.
- Nada sai pro cliente. A leitura é interna, então grava sozinha e o dono
  corrige se estiver errada (mesma regra do Raio-X: a Lume lê, o dono confere).

## Por que vale

- O pacote solar da Lume já manda pedir a conta antes de falar de preço
  (`src/lib/agents/qualifier/solarPack.ts`), e a obra já lista "Conta de luz"
  como documento (`useObras.ts`).
- Hoje a conta chega e fica parada: a foto vai pro Storage, mas ninguém lê.
  A leitura da conversa só dispara com texto (`worthReading` em
  `_shared/evaRead.ts`), então foto sem legenda nem acorda a Lume.
- Com consumo e valor em mãos, o dono dimensiona e manda a proposta mais
  rápido. É o momento em que o lead está mais quente.

## Como funciona

1. **Chega a mídia.** O `evolution-message-webhook` já guarda imagem e PDF
   no bucket `whatsapp-media` (`captureMediaToStorage`).
2. **Filtro de custo.** Só segue se for tudo isso:
   - mensagem recebida (inbound), fora de grupo e fora da conversa do próprio dono (`isOwnerChat`);
   - imagem ou PDF;
   - empresa paga (`company_is_paid`);
   - conversa com card ou lead de até 24h (o mesmo corte da `eva-conversation-read`);
   - uma leitura por mensagem, no máximo 3 por conversa.
3. **Edge nova `conta-luz-ler`.** É chamada depois do upload com
   `waitUntil`, no mesmo molde da `quote-pdf-amount` (função separada, pra
   um arquivo pesado derrubar só ela).
   - **PDF:** extrai o texto com `unpdf`. O modelo só pode devolver números
     que aparecem nesse texto, a mesma trava contra número inventado da
     `quote-pdf-amount`.
   - **Foto:** vai pra um modelo que lê imagem. Volta `e_conta_de_luz`, os
     campos e uma confiança. Abaixo do mínimo, ou se não for conta de luz, não grava nada.
4. **Grava** em tabela nova (abaixo). O valor do card (`deals.value`) fica
   como está: ele é o preço da proposta, e a conta é outro número.
5. **Próxima leitura da conversa** é marcada pra 1 minuto depois e recebe
   esses dados no contexto (`knownFacts` da `whatsapp-copilot`, só no modo
   serviço), então `info_coletada` e `info_faltante` já saem certos.

## O que a Lume tira da conta

| Campo | Pra quê |
| --- | --- |
| Consumo médio em kWh/mês | dimensionar o sistema |
| Valor da conta em R$ | "Valor da conta de luz" do pacote solar |
| Distribuidora | prazo de homologação, regra da região |
| Cidade e UF | "Cidade" do pacote solar |
| Classe (residencial, comercial, rural) | "Residencial ou comercial" |
| Mês de referência | saber se a conta é recente |

Fica de fora de propósito: CPF, endereço completo, número da unidade
consumidora e nome do titular. Os dados servem só pra venda daquele cliente
(LGPD: mínimo necessário). A foto continua no bucket privado, como qualquer
mídia da conversa.

## Onde guardar

Tabela nova `conta_luz_leituras`. A coluna `qualification` em
`conversation_summaries` não serve: cada leitura da conversa reescreve ela
inteira e apagaria o que veio da conta.

- `id`, `company_id`, `conversation_id`, `contact_id`, `deal_id` (nullable)
- `message_id`, `storage_path`
- `consumo_kwh`, `valor_reais`, `distribuidora`, `cidade`, `uf`, `classe`, `mes_referencia`
- `confianca`, `fonte` (`pdf` ou `foto`)
- `status`: `lida`, `confirmada`, `corrigida`, `descartada`
- Migration aditiva, GRANT pra `authenticated` e `service_role` antes do RLS,
  com as 4 policies por `get_my_company_id()`.

Obra: quando o contato já tem obra, marcar `obra_documentos.recebido = true`
no item "Conta de luz". Sem coluna nova nesta versão.

## Onde aparece

- **Painel da Lume na conversa** (`EvaPanel.tsx`): a linha "Li a conta de luz"
  com Confirmar e Corrigir. Corrigir abre os campos pra editar.
- **Obra:** documento marcado como recebido.
- Fica de fora desta versão: dados da conta na tela do card, aviso no
  WhatsApp do dono e cálculo de kWp sugerido.

## Dúvidas antes de construir

1. **Modelo que lê imagem.** Resolvido: o `llm.ts` ganhou a opção `only`, e
   a foto vai só pra Anthropic, Gemini ou OpenAI, na ordem de
   `LLM_PROVIDERS`. O tradutor da Anthropic aprendeu a mandar imagem. A
   DeepSeek fica de fora porque não lê imagem.
2. **Foto ruim.** Conta amassada, torta ou cortada. Precisa testar com umas
   20 fotos reais antes de ligar, e calibrar a confiança mínima.
3. **Custo por foto.** Medir no teste. O filtro do passo 2 segura o volume.

## Como publicar

1. `npx supabase db query --linked -f supabase/migrations/20261106_conta_luz_leituras.sql`
2. Deploy das edges `conta-luz-ler`, `evolution-message-webhook`,
   `eva-conversation-read` e `whatsapp-copilot`, a partir da branch em dia
   com a `main`.
3. Merge na `main` pro front (cartão no painel).
4. Mandar fotos de contas reais numa conversa de teste e conferir a leitura.
