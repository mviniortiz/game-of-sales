import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

// LP.8 (v2) — rota de entrada da demo embutida (iframe). Pega uma sessão do
// ambiente demo dedicado (edge demo-session, senha só no servidor), seta a
// sessão (na storageKey isolada do embed) e RECARREGA pro /inicio. O reload
// completo é de propósito: o AuthContext boota já com a sessão persistida no
// storage (fluxo idêntico ao de um usuário logado voltando), sem a corrida que
// fazia o ProtectedRoute chutar pro /auth.
const EmbedDemo = () => {
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data, error: fnErr } = await supabase.functions.invoke("demo-session", { body: {} });
                if (fnErr || !data?.ok || !data.access_token) { if (!cancelled) setError(true); return; }
                const { error: sErr } = await supabase.auth.setSession({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                });
                if (sErr) { if (!cancelled) setError(true); return; }
                if (!cancelled) window.location.replace("/inicio");
            } catch {
                if (!cancelled) setError(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
                <p className="text-[14px] text-[#64748B]">Não foi possível abrir a demo agora. Tente recarregar.</p>
            </div>
        );
    }
    return <BrandedLoader label="Abrindo a Vyzon…" />;
};

export default EmbedDemo;
