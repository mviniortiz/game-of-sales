// INBOX.PPIC.1 — hook de foto de perfil por avatar.
//
// Usa o cache/fila module-level (profilePicCache). Se já houver uma URL conhecida
// (fallbackUrl vindo de channel_contacts), usa direto. Senão, tenta o cache e,
// se faltar, enfileira a busca no Evolution (throttled). Nunca trava a render:
// começa com o que tem e atualiza quando resolve.
import { useEffect, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { getProfilePic, peekProfilePic } from "@/lib/whatsapp/profilePicCache";

export function useProfilePic(phone: string | null | undefined, fallbackUrl?: string | null): string | undefined {
    const { activeCompanyId } = useTenant();
    const [url, setUrl] = useState<string | undefined>(
        () => fallbackUrl || (phone ? peekProfilePic(phone) || undefined : undefined),
    );

    useEffect(() => {
        // Já temos foto (do banco ou cache) — nada a buscar.
        if (fallbackUrl) {
            setUrl(fallbackUrl);
            return;
        }
        if (!phone) return;
        const cached = peekProfilePic(phone);
        if (cached) {
            setUrl(cached);
            return;
        }
        let alive = true;
        void getProfilePic(phone, activeCompanyId ?? null).then((resolved) => {
            if (alive && resolved) setUrl(resolved);
        });
        return () => {
            alive = false;
        };
    }, [phone, fallbackUrl, activeCompanyId]);

    return url;
}
