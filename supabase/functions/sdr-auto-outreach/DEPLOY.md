# SDR Auto-Outreach — Deploy

Fluxo: lead preenche form → `demo_requests` insert → trigger `trg_sdr_auto_outreach` → `pg_net` chama edge function → OpenAI (gpt-4o-mini) gera mensagem → WhatsApp (Evolution) + Email (Resend) enviados em paralelo → `demo_requests.notes` atualizado.

## 1. Configurar secrets da edge function

```bash
# Já existentes (reutilizados):
#   OPENAI_API_KEY
#   EVOLUTION_API_URL, EVOLUTION_API_KEY
#   RESEND_API_KEY, RESEND_FROM_EMAIL

# Novos (precisam ser setados):
npx supabase secrets set SDR_EVOLUTION_INSTANCE=nome-da-instancia-wpp
npx supabase secrets set SDR_NAME=Markus
npx supabase secrets set CALENDLY_URL=https://calendly.com/mviniciusortiz48/demo-vyzon-com-br
```

## 2. Deploy da edge function

```bash
npx supabase functions deploy sdr-auto-outreach --no-verify-jwt
```

> `--no-verify-jwt` porque o trigger chama via service_role bearer, não JWT de usuário.

## 3. Configurar settings do DB (para o trigger pg_net)

Rode no SQL Editor do Supabase (uma única vez por projeto):

```sql
alter database postgres set "app.settings.supabase_url" = 'https://SEU-PROJECT-REF.supabase.co';
alter database postgres set "app.settings.service_role_key" = 'eyJ... (service_role key)';
```

> Pegue `SUPABASE_URL` e `SERVICE_ROLE_KEY` em: Supabase Dashboard → Settings → API.

## 4. Rodar a migration do trigger

```bash
npx supabase db push
```

Ou rode manualmente no SQL Editor: `20260415_sdr_auto_outreach_trigger.sql`.

## 5. Testar

Insira um lead de teste pelo landing (ou via SQL):

```sql
insert into demo_requests (name, email, phone, company)
values ('Teste', 'seu-email@example.com', '11999999999', 'Empresa Teste');
```

Verifique:
- `demo_requests.notes` deve ser preenchido em alguns segundos com `SDR outreach: WhatsApp=✓, Email=✓ at ...`
- Logs da edge function: `npx supabase functions logs sdr-auto-outreach`
- Chamadas pg_net: `select * from net._http_response order by created desc limit 10;`

## Rollback

```sql
drop trigger if exists trg_sdr_auto_outreach on public.demo_requests;
drop function if exists public.trigger_sdr_outreach();
```
