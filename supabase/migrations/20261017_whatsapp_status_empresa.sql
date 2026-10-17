-- Estado real do WhatsApp da empresa para a pílula do topo do app (17/10/2026).
-- channel_connections.status fica 'active' com a sessão caída; o estado de verdade
-- vem do vigia (whatsapp-health, a cada 5 min) em service_health.details, por
-- instância: por_nome (open/closed/...) e desde_por_nome (desde quando).
-- Devolve só a conexão da empresa pedida, e só para quem é dela ou super admin.
create or replace function public.whatsapp_status_empresa(p_company_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  conn record;
  saude record;
  estado text;
begin
  if p_company_id is null or not (p_company_id = get_my_company_id() or is_super_admin()) then
    return null;
  end if;

  select provider, external_id, status, metadata
    into conn
    from channel_connections
   where company_id = p_company_id and channel_type = 'whatsapp'
   order by (status in ('active', 'connected')) desc, updated_at desc
   limit 1;
  if conn is null then
    return jsonb_build_object('estado', 'sem_conexao');
  end if;

  -- API oficial não tem sessão para cair: vale o banco.
  if conn.provider <> 'evolution' then
    return jsonb_build_object(
      'estado', case when conn.status in ('active', 'connected') then 'conectado' else 'desconectado' end,
      'oficial', true);
  end if;

  select details, last_checked_at into saude from service_health where service = 'whatsapp_server';
  estado := saude.details -> 'por_nome' ->> conn.external_id;
  return jsonb_build_object(
    'estado', case
      when estado in ('open', 'connected', 'online') then 'conectado'
      when estado = 'connecting' then 'conectando'
      when estado is not null then 'desconectado'
      when conn.status in ('disconnected', 'inactive') then 'desconectado'
      else 'verificando' end,
    'desde', saude.details -> 'desde_por_nome' ->> conn.external_id,
    'verificado_em', saude.last_checked_at,
    'numero', conn.metadata ->> 'owner_jid');
end;
$$;

revoke all on function public.whatsapp_status_empresa(uuid) from public, anon;
grant execute on function public.whatsapp_status_empresa(uuid) to authenticated, service_role;
