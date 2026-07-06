import { useEffect, useRef } from "react";

// LP.10 (v2) — "cloud wave": substituto WebGL do AnimatedMeshAsset nos usos
// GRANDES (hero/demo/tiles/login). Um fragment shader (fbm com domain warp)
// gera o fluido de nuvem nas cores da marca — sem imagem, sem filtro SVG
// (a fonte do crash no iOS; WebGL roda liso lá, então aqui ANIMA no iOS).
// Fallback: o container tem um radial-gradient CSS na mesma paleta; se WebGL
// faltar (ou contexto for perdido), o canvas nunca desenha e o gradiente fica.
// prefers-reduced-motion: renderiza UM frame estático. IntersectionObserver
// pausa o raf fora da viewport. Orbs pequenos (<90px) seguem no mesh de
// imagem — WebGL context por instância estouraria o limite do browser (~16).

export type CloudWavePalette = "blue" | "aqua" | "violet" | "warm" | "login";

// Cores lidas dos meshes .webp originais (papel da landing como base).
const PALETTES: Record<CloudWavePalette, { base: string; low: string; mid: string; high: string }> = {
    blue: { base: "#f2efe6", low: "#cfe0ff", mid: "#2563eb", high: "#1d3fbd" },
    aqua: { base: "#f2efe6", low: "#bdf0e6", mid: "#22b8c9", high: "#37b578" },
    violet: { base: "#f4f1ec", low: "#bfe3fb", mid: "#29a8f0", high: "#8b5cf6" },
    warm: { base: "#f6f0e2", low: "#9fd8f7", mid: "#2fa7ea", high: "#f59321" },
    login: { base: "#eef3f8", low: "#9ceef2", mid: "#1d4ed8", high: "#1f9d67" },
};

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision mediump float;
uniform vec2 u_res;uniform float u_t;
uniform vec3 u_base,u_low,u_mid,u_high;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
void main(){
vec2 uv=gl_FragCoord.xy/u_res;
vec2 p=uv*vec2(u_res.x/u_res.y,1.);
float t=u_t*.05;
vec2 q=vec2(fbm(p*1.6+t),fbm(p*1.6+vec2(5.2,1.3)-t*.7));
float n=fbm(p*2.2+q*1.6+vec2(0.,t*.6));
vec3 col=mix(u_base,u_low,smoothstep(.28,.5,n));
col=mix(col,u_mid,smoothstep(.45,.68,n));
col=mix(col,u_high,smoothstep(.62,.85,n));
col+=vec3(.10)*smoothstep(.55,.92,fbm(p*3.5+q*2.+t));
gl_FragColor=vec4(col,1.);
}`;

const hexToRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

interface CloudWaveOrbProps {
    palette?: CloudWavePalette;
    className?: string;
}

export const CloudWaveOrb = ({ palette = "login", className = "" }: CloudWaveOrbProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
        if (!gl) return; // fallback: gradiente CSS do container fica visível

        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!;
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        };
        const prog = gl.createProgram()!;
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "a");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const pal = PALETTES[palette];
        gl.uniform3fv(gl.getUniformLocation(prog, "u_base"), hexToRgb(pal.base));
        gl.uniform3fv(gl.getUniformLocation(prog, "u_low"), hexToRgb(pal.low));
        gl.uniform3fv(gl.getUniformLocation(prog, "u_mid"), hexToRgb(pal.mid));
        gl.uniform3fv(gl.getUniformLocation(prog, "u_high"), hexToRgb(pal.high));
        const uRes = gl.getUniformLocation(prog, "u_res");
        const uT = gl.getUniformLocation(prog, "u_t");

        // Nuvem é suave: render em resolução reduzida (DPR ≤ 1.5, lado ≤ 640) e
        // o CSS estica — indistinguível e muito mais barato.
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const w = Math.min(640, Math.max(1, Math.round(canvas.clientWidth * dpr)));
            const h = Math.min(640, Math.max(1, Math.round(canvas.clientHeight * dpr)));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                gl.viewport(0, 0, w, h);
            }
            gl.uniform2f(uRes, canvas.width, canvas.height);
        };

        const draw = (t: number) => {
            resize();
            gl.uniform1f(uT, t / 1000);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const reduced =
            typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
            draw(12000); // um frame parado num ponto bonito do noise
            return;
        }

        let raf = 0;
        let running = false;
        const loop = (t: number) => {
            draw(t);
            raf = requestAnimationFrame(loop);
        };
        const start = () => {
            if (!running && !gl.isContextLost()) {
                running = true;
                raf = requestAnimationFrame(loop);
            }
        };
        const stop = () => {
            running = false;
            cancelAnimationFrame(raf);
        };

        const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "80px" });
        io.observe(canvas);
        const onLost = (e: Event) => {
            e.preventDefault();
            stop();
        };
        canvas.addEventListener("webglcontextlost", onLost);

        // NÃO chamar loseContext() aqui: StrictMode remonta o effect e o mesmo
        // canvas devolve o MESMO contexto (já perdido) — ficaria branco pra
        // sempre. O browser recicla o contexto junto com o canvas.
        return () => {
            stop();
            io.disconnect();
            canvas.removeEventListener("webglcontextlost", onLost);
        };
    }, [palette]);

    const pal = PALETTES[palette];
    return (
        <div
            className={`relative overflow-hidden ${className}`.trim()}
            aria-hidden="true"
            style={{
                background: `radial-gradient(120% 120% at 30% 25%, ${pal.low}, ${pal.mid} 55%, ${pal.high} 100%)`,
            }}
        >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        </div>
    );
};
