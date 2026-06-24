// Loader da marca: anel fino girando com cauda que desvanece (conic-gradient + mask),
// um único elemento, sem logo. Theme-aware via CSS vars do shadcn, respeita
// prefers-reduced-motion. Substitui spinners genéricos no boot/Suspense.
export function BrandedLoader({ label }: { label?: string }) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center gap-5"
            style={{ background: "hsl(var(--background))" }}
        >
            <div className="vz-ring" role="status" aria-label={label ?? "Carregando"} />

            {label && (
                <p className="text-[12.5px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {label}
                </p>
            )}

            <style>{`
                .vz-ring {
                    width: 38px;
                    aspect-ratio: 1;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, transparent 6%, #2563EB);
                    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
                            mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
                    animation: vzRingSpin 0.9s linear infinite, vzRingIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes vzRingSpin { to { transform: rotate(1turn) } }
                @keyframes vzRingIn { from { opacity: 0 } to { opacity: 1 } }
                @media (prefers-reduced-motion: reduce) {
                    .vz-ring { animation: none; opacity: 1; }
                }
            `}</style>
        </div>
    );
}
