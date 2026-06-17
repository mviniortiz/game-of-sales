import { useEffect, useId, useRef } from "react";

// LP.6 (v2) — painel visual a partir de UMA imagem (não recria o mesh). O mesh
// da PRÓPRIA imagem é animado por um filtro de distorção SVG (feTurbulence +
// feDisplacementMap) cujos parâmetros são animados via requestAnimationFrame
// (SMIL não re-renderiza img+CSS-filter de forma confiável). A imagem ondula/
// flui sem zoom e sem mover o painel. prefers-reduced-motion: estático.
interface AnimatedMeshAssetProps {
    src: string;
    className?: string;
}

export const AnimatedMeshAsset = ({ src, className = "" }: AnimatedMeshAssetProps) => {
    // id único por instância — senão múltiplos meshes na página (tiles + login)
    // colidem no mesmo filtro (url(#id) resolve pro 1º) e só um anima.
    const FID = "vzMesh-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const turbRef = useRef<SVGFETurbulenceElement>(null);
    const dispRef = useRef<SVGFEDisplacementMapElement>(null);

    useEffect(() => {
        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;

        let raf = 0;
        let t = 0;
        const loop = () => {
            t += 1;
            const bfx = (0.013 + Math.sin(t * 0.0065) * 0.005).toFixed(4);
            const bfy = (0.016 + Math.cos(t * 0.0052) * 0.005).toFixed(4);
            turbRef.current?.setAttribute("baseFrequency", `${bfx} ${bfy}`);
            const sc = (18 + Math.sin(t * 0.009) * 6).toFixed(1);
            dispRef.current?.setAttribute("scale", sc);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div className={`vz-mesh-asset ${className}`.trim()} aria-hidden="true">
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
                <defs>
                    <filter id={FID} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                        <feTurbulence
                            ref={turbRef}
                            type="fractalNoise"
                            baseFrequency="0.013 0.016"
                            numOctaves="2"
                            seed="7"
                            result="noise"
                        />
                        <feDisplacementMap
                            ref={dispRef}
                            in="SourceGraphic"
                            in2="noise"
                            scale="18"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>
            <img src={src} alt="" style={{ filter: `url(#${FID})` }} />
        </div>
    );
};
