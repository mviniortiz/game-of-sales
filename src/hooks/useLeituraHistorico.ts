// O histórico do WhatsApp chega em lotes logo depois da conexão: no número do
// Markus, 25 mil mensagens em uns 3 minutos (07/10/2026), com as conversas
// criadas bem antes das mensagens terminarem. Por isso a espera olha as
// MENSAGENS: conta a cada 3 s e devolve quando param de subir (ou em 3 min).
// Também expõe o que dá para mostrar ao vivo enquanto a EVA lê: conversas,
// mensagens, PDFs que a empresa mandou e os nomes dos contatos que chegaram.
// Usado pelo Raio-X automático e pelos primeiros passos.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LIMITE_MS = 180_000;

export type Leitura = { conversas: number; mensagens: number; pdfs: number; nomes: string[] };
const VAZIA: Leitura = { conversas: 0, mensagens: 0, pdfs: 0, nomes: [] };

export function useLeituraHistorico(companyId: string | null) {
    const [leitura, setLeitura] = useState<Leitura>(VAZIA);
    const vivo = useRef(true);
    useEffect(() => {
        vivo.current = true;
        return () => {
            vivo.current = false;
        };
    }, []);

    const contar = useCallback(async (): Promise<Leitura> => {
        if (!companyId) return VAZIA;
        const head = { count: "exact" as const, head: true };
        const [c, m, p, n] = await Promise.all([
            supabase.from("channel_conversations").select("id", head).eq("company_id", companyId),
            supabase.from("channel_messages").select("id", head).eq("company_id", companyId),
            supabase.from("channel_messages").select("id", head).eq("company_id", companyId).eq("direction", "outbound").eq("message_type", "document"),
            supabase.from("channel_contacts").select("name").eq("company_id", companyId).eq("is_group", false).not("name", "is", null).order("created_at", { ascending: false }).limit(6),
        ]);
        const nomes = ((n.data ?? []) as { name: string | null }[])
            .map((x) => (x.name || "").trim().split(/\s+/)[0])
            .filter((x) => x && !/^\+?\d/.test(x));
        return { conversas: c.count ?? 0, mensagens: m.count ?? 0, pdfs: p.count ?? 0, nomes: [...new Set(nomes)].slice(0, 4) };
    }, [companyId]);

    /** Espera o histórico parar de chegar. Devolve a última leitura. */
    const aguardar = useCallback(async () => {
        const inicio = Date.now();
        let ultima = VAZIA;
        let anterior = -1;
        let parado = 0;
        while (vivo.current && Date.now() - inicio < LIMITE_MS) {
            await espera(3000);
            const l = await contar();
            ultima = l;
            if (vivo.current) setLeitura(l);
            parado = l.mensagens > 0 && l.mensagens === anterior ? parado + 1 : 0;
            anterior = l.mensagens;
            if (parado >= 4 && Date.now() - inicio > 15_000) break;
        }
        return ultima;
    }, [contar]);

    return { leitura, conversas: leitura.conversas, aguardar, vivo, espera };
}
