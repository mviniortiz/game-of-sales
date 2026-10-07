-- EVA lê a conversa, não cada mensagem (07/10/2026).
-- O webhook marca eva_read_due_at = agora + 3 min a cada mensagem recebida que
-- tenha conteúdo; mensagem nova empurra o prazo. Um cron por minuto pega as
-- vencidas e a eva-conversation-read analisa a conversa inteira uma vez.
-- Aditiva: coluna nova, função nova, cron novo.

alter table public.channel_conversations
    add column if not exists eva_read_due_at timestamptz;

create index if not exists channel_conversations_eva_read_due_idx
    on public.channel_conversations (eva_read_due_at)
    where eva_read_due_at is not null;

-- Pega até p_limit conversas vencidas e limpa o prazo na mesma transação, para
-- duas execuções seguidas do cron nunca lerem a mesma conversa.
create or replace function public.claim_eva_reads(p_limit int default 20)
returns table (conversation_id uuid, company_id uuid, contact_id uuid, deal_id uuid, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
    update public.channel_conversations c
       set eva_read_due_at = null
     where c.id in (
         select id from public.channel_conversations
          where eva_read_due_at <= now()
          order by eva_read_due_at
          limit p_limit
          for update skip locked
     )
    returning c.id, c.company_id, c.contact_id, c.deal_id, c.created_at;
$$;

revoke all on function public.claim_eva_reads(int) from public, anon, authenticated;
grant execute on function public.claim_eva_reads(int) to service_role;

create or replace function public.trigger_eva_conversation_read()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_url          text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-conversation-read';
    v_cron_secret  text;
    v_anon_key     text;
    v_request_id   bigint;
begin
    -- Sem conversa vencida, nem chama a edge.
    if not exists (select 1 from public.channel_conversations where eva_read_due_at <= now()) then
        return null;
    end if;

    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_eva_conversation_read: segredo ausente no vault, pulando';
        return null;
    end if;

    select net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'x-cron-secret', v_cron_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
    ) into v_request_id;

    return v_request_id;
end;
$$;

comment on function public.trigger_eva_conversation_read is
'EVA.READ.1: chama a eva-conversation-read quando há conversa com leitura vencida (3 min de silêncio).';

do $$
begin
    perform cron.unschedule('eva-conversation-read-every-1m');
exception when others then null;
end $$;

select cron.schedule(
    'eva-conversation-read-every-1m',
    '* * * * *',
    $$select public.trigger_eva_conversation_read();$$
);
