-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp media — bucket PRIVADO pra guardar mídia de conversa (imagem/vídeo/
-- sticker/áudio/documento) baixada na entrada (webhook) e servida via edge.
--
-- PRIVADO de propósito (LGPD): mídia de conversa é dado pessoal. O acesso é só
-- via service_role (webhook grava; edge evolution-whatsapp lê e devolve base64).
-- Nada de policy pra anon/authenticated — service_role bypassa RLS.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-media',
  'whatsapp-media',
  false,
  26214400, -- 25MB, teto prático de mídia do WhatsApp
  null
)
on conflict (id) do nothing;
