// Loader da marca: logo Vyzon com pulse + barra de progresso indeterminada azul.
// Substitui os spinners genéricos no boot (mais identidade, menos "circulozinho
// inútil"). Theme-aware via CSS vars, respeita prefers-reduced-motion.
import { ThemeLogo } from "@/components/ui/ThemeLogo";

export function BrandedLoader({ label }: { label?: string }) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center gap-5"
            style={{ background: "hsl(var(--background))" }}
        >
            <div className="vz-load-logo">
                <ThemeLogo className="h-8" />
            </div>

            <div className="vz-load-track">
                <div className="vz-load-bar" />
            </div>

            {label && (
                <p className="text-[12.5px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {label}
                </p>
            )}

            <style>{`
                .vz-load-logo { animation: vzLoadPulse 1.5s ease-in-out infinite; }
                @keyframes vzLoadPulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
                .vz-load-track {
                    width: 150px; height: 3px; border-radius: 99px; overflow: hidden;
                    background: rgba(37,99,235,0.12);
                }
                .vz-load-bar {
                    width: 40%; height: 100%; border-radius: 99px;
                    background: linear-gradient(90deg, #2563EB, #4A8CE8);
                    animation: vzLoadSlide 1.1s cubic-bezier(.4,0,.2,1) infinite;
                }
                @keyframes vzLoadSlide {
                    0% { transform: translateX(-130%) }
                    100% { transform: translateX(330%) }
                }
                @media (prefers-reduced-motion: reduce) {
                    .vz-load-logo, .vz-load-bar { animation: none }
                    .vz-load-bar { width: 100% }
                }
            `}</style>
        </div>
    );
}
