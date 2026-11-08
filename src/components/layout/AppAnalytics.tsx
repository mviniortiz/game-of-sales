// Liga o analytics do app à sessão: empresa efetiva, início de sessão, cada
// troca de tela e as tags do Clarity (empresa, plano, papel). Não desenha nada.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlano } from "@/hooks/usePlano";
import { clarityIdentify, claritySet } from "@/lib/analytics";
import { APP_EVENTS, setAppContext, telaDaRota, trackApp } from "@/lib/appAnalytics";

const INICIO_KEY = "vyz_app_sessao_iniciada";

export function AppAnalytics() {
    const { pathname, search } = useLocation();
    const { user, companyId, isAdmin, isSuperAdmin } = useAuth();
    const { activeCompanyId } = useTenant();
    const { pago, carregando } = usePlano();
    const empresa = activeCompanyId || companyId;
    const anterior = useRef<string>("");

    useEffect(() => {
        setAppContext({ empresa });
    }, [empresa]);

    useEffect(() => {
        if (!user) return;
        try {
            clarityIdentify(user.id);
            if (empresa) claritySet("empresa", empresa);
            claritySet("papel", isSuperAdmin ? "super_admin" : isAdmin ? "admin" : "vendedor");
            if (!carregando) claritySet("plano", pago ? "pago" : "free");
        } catch {
            // analytics nunca quebra a tela
        }
    }, [user, empresa, isAdmin, isSuperAdmin, pago, carregando]);

    useEffect(() => {
        if (!user) return;
        const tela = telaDaRota(pathname);
        // Telas com abas internas guardam a aba na URL (?aba=).
        const aba = new URLSearchParams(search).get("aba") ?? "";
        setAppContext({ tela, aba });
        let primeira = false;
        try {
            primeira = !sessionStorage.getItem(INICIO_KEY);
            if (primeira) sessionStorage.setItem(INICIO_KEY, "1");
        } catch {
            primeira = !anterior.current;
        }
        if (primeira) trackApp(APP_EVENTS.SESSION_STARTED, { tela });
        const chave = `${tela}|${aba}`;
        if (chave !== anterior.current) {
            trackApp(APP_EVENTS.SCREEN_VIEWED, { tela, ...(aba ? { aba } : {}), de: anterior.current.split("|")[0] || "entrada" });
            anterior.current = chave;
        }
    }, [pathname, search, user]);

    return null;
}
