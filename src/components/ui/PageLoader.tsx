// Espera de rota e de sessão, sem logo. Carregamento rápido não mostra nada:
// a barra fina no topo só aparece depois de 400ms, e a página nova entra no
// lugar do fundo vazio, sem a troca brusca de uma tela de marca por outra.
// Usado no Suspense das rotas, no ProtectedRoute e no boot do cadastro.
export function PageLoader({ label }: { label?: string }) {
    return (
        <div className="vz-pl" role="status" aria-live="polite">
            <span className="vz-pl__barra" aria-hidden />
            {label ? <p className="vz-pl__label">{label}</p> : <span className="sr-only">Carregando</span>}

            <style>{`
                .vz-pl { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: hsl(var(--background)); }
                .vz-pl__barra {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 60; height: 2px; overflow: hidden;
                    opacity: 0; animation: vzPlIn 200ms ease-out 400ms forwards;
                }
                .vz-pl__barra::before {
                    content: ""; position: absolute; inset: 0; width: 40%;
                    background: hsl(var(--primary));
                    transform: translateX(-100%);
                    animation: vzPlCorre 1.1s cubic-bezier(0.65, 0, 0.35, 1) 400ms infinite;
                }
                .vz-pl__label {
                    font-size: 13px; color: hsl(var(--muted-foreground));
                    opacity: 0; animation: vzPlIn 200ms ease-out 400ms forwards;
                }
                @keyframes vzPlIn { to { opacity: 1; } }
                @keyframes vzPlCorre { to { transform: translateX(250%); } }
                @media (prefers-reduced-motion: reduce) {
                    .vz-pl__barra::before { animation: none; transform: none; width: 100%; opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
