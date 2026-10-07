// INBOX.PPIC.1 — hook de foto de perfil por avatar.
//
// Usa o cache/fila module-level (profilePicCache). Se já houver uma URL conhecida
// (fallbackUrl vindo de channel_contacts), usa direto. Senão, tenta o cache e,
// se faltar, enfileira a busca no servidor de WhatsApp (throttled). Nunca trava
// a render: começa com o que tem e atualiza quando resolve. A foto fica presa ao
// contato que a pediu: ao trocar de contato, a anterior some na hora.
import { useEffect, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { getProfilePic, peekProfilePic } from "@/lib/whatsapp/profilePicCache";

export function useProfilePic(jid: string | null | undefined, fallbackUrl?: string | null): string | undefined {
    const { activeCompanyId } = useTenant();
    const [resolved, setResolved] = useState<{ jid: string; url: string } | null>(null);

    useEffect(() => {
        if (fallbackUrl || !jid || peekProfilePic(jid)) return;
        let alive = true;
        void getProfilePic(jid, activeCompanyId ?? null).then((url) => {
            if (alive && url) setResolved({ jid, url });
        });
        return () => {
            alive = false;
        };
    }, [jid, fallbackUrl, activeCompanyId]);

    if (fallbackUrl) return fallbackUrl;
    if (!jid) return undefined;
    return peekProfilePic(jid) || (resolved?.jid === jid ? resolved.url : undefined);
}
