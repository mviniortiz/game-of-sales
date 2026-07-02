-- ─────────────────────────────────────────────────────────────────────────────
-- 20260701c — Leitura de mídia do WhatsApp direto do Storage pelo app
--
-- Contexto (INBOX.PERF.2): o bucket whatsapp-media é privado e até agora só o
-- service_role lia — o front baixava TODA mídia via edge getMedia, que devolve
-- o arquivo inteiro em base64 (lento, caro e pesado em memória no mobile).
--
-- Esta policy permite que o app gere signed URLs client-side
-- (supabase.storage.createSignedUrl) e renderize <img>/<video>/<audio> direto
-- do Storage, mantendo a edge getMedia só como fallback pra mídia ainda não
-- capturada (sem storage_path).
--
-- Escopo: o path é `<company_id>/<message_id>.<ext>` (captureMediaToStorage,
-- evolution-message-webhook), então o SELECT é restrito à pasta da própria
-- company. super_admin bypassa (padrão do projeto).
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "whatsapp_media_select_company" on storage.objects;

create policy "whatsapp_media_select_company"
on storage.objects for select to authenticated
using (
  bucket_id = 'whatsapp-media'
  and (
    (storage.foldername(name))[1] = public.get_my_company_id()::text
    or public.is_super_admin()
  )
);

do $$
begin
  raise notice '20260701c aplicado: SELECT em whatsapp-media pra authenticated (escopo company).';
end $$;
