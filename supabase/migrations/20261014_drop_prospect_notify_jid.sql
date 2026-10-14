-- O grupo da prospecção passou para owner_notify_groups (topic 'prospeccao').
alter table public.prospecting_instances drop column if exists notify_jid;
