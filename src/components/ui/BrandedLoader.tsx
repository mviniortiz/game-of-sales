import { LEFT_ROTATION, PIECE, RIGHT_ROTATION, RIGHT_X, VYZON_BLUE } from "@/components/brand/VyzonMark";

// Loader da marca: as duas peças do "Encontro" se afastam ao longo do próprio
// eixo e voltam a se cruzar; no encontro, a interseção acende. Ciclo de 1,8s,
// theme-aware (peça esquerda = cor do texto), com reduced-motion parado no
// estado final. Usado no boot, no Suspense das rotas e no ProtectedRoute.
export function BrandedLoader({ label }: { label?: string }) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center gap-5"
            style={{ background: "hsl(var(--background))" }}
        >
            <svg
                className="vz-load"
                width="56"
                height="56"
                viewBox="12 10 76 78"
                role="status"
                aria-label={label ?? "Carregando"}
                style={{ color: "hsl(var(--foreground))", overflow: "visible" }}
            >
                <defs>
                    <clipPath id="vz-load-meet">
                        <rect {...PIECE} transform={LEFT_ROTATION} />
                    </clipPath>
                </defs>
                <g transform={RIGHT_ROTATION}>
                    <rect className="vz-load-r" {...PIECE} x={RIGHT_X} fill={VYZON_BLUE} />
                </g>
                <g transform={LEFT_ROTATION}>
                    <rect className="vz-load-l" {...PIECE} fill="currentColor" />
                </g>
                {/* Interseção fixa no ponto de encontro: só aparece quando as peças chegam. */}
                <g clipPath="url(#vz-load-meet)">
                    <rect className="vz-load-meet" {...PIECE} x={RIGHT_X} transform={RIGHT_ROTATION} fill="#7cb0ff" />
                </g>
            </svg>

            {label && (
                <p className="vz-load-label text-[12.5px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {label}
                </p>
            )}

            <style>{`
                .vz-load { animation: vzLoadIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .vz-load-l, .vz-load-r { transform-box: fill-box; transform-origin: center; }
                .vz-load-l { animation: vzLoadPiece 1.8s infinite; }
                .vz-load-r { animation: vzLoadPiece 1.8s infinite; }
                .vz-load-meet { animation: vzLoadMeet 1.8s infinite; }
                .vz-load-label { animation: vzLoadIn 0.5s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both; }

                /* Eixo local de cada peça: subir (y negativo) afasta as duas do V. */
                @keyframes vzLoadPiece {
                    0%   { transform: translateY(0);    animation-timing-function: cubic-bezier(0.55, 0, 0.75, 0.2); }
                    38%  { transform: translateY(-14px); animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
                    72%  { transform: translateY(0); }
                    100% { transform: translateY(0); }
                }
                @keyframes vzLoadMeet {
                    0%   { opacity: 1; }
                    20%  { opacity: 0; }
                    68%  { opacity: 0; }
                    74%  { opacity: 1; }
                    86%  { opacity: 0.75; }
                    100% { opacity: 1; }
                }
                @keyframes vzLoadIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }

                @media (prefers-reduced-motion: reduce) {
                    .vz-load, .vz-load-l, .vz-load-r, .vz-load-meet, .vz-load-label { animation: none; }
                }
            `}</style>
        </div>
    );
}
