// O histórico do WhatsApp chega em lotes logo depois da conexão. Isto conta as
// conversas da empresa a cada 3 s e devolve quando a contagem para de subir
// (ou em 75 s). Usado pelo Raio-X automático e pelos primeiros passos.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useLeituraHistorico(companyId: string | null) {
    const [conversas, setConversas] = useState(0);
    const vivo = useRef(true);
    useEffect(() => {
        vivo.current = true;
        return () => {
            vivo.current = false;
        };
    }, []);

    const contar = useCallback(async () => {
        if (!companyId) return 0;
        const { count } = await supabase.from("channel_conversations").select("id", { count: "exact", head: true }).eq("company_id", companyId);
        return count ?? 0;
    }, [companyId]);

    /** Espera o histórico parar de chegar. Devolve o total de conversas. */
    const aguardar = useCallback(async () => {
        const inicio = Date.now();
        let anterior = -1;
        let parado = 0;
        while (vivo.current && Date.now() - inicio < 75_000) {
            await espera(3000);
            const n = await contar();
            if (vivo.current) setConversas(n);
            parado = n > 0 && n === anterior ? parado + 1 : 0;
            anterior = n;
            if (parado >= 3 && Date.now() - inicio > 9000) break;
        }
        return Math.max(anterior, 0);
    }, [contar]);

    return { conversas, aguardar, vivo, espera };
}
