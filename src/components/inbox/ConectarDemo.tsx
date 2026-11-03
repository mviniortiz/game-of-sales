import { useMemo, useRef } from "react";
import { ArrowLeft, Camera, ChevronLeft, CircleDashed, Laptop, MessageCircle, MoreVertical, Phone as PhoneIcon, QrCode, Settings, Users } from "lucide-react";
import { Phone } from "@/vendor/stageshow/phone";
import { Stage } from "@/vendor/stageshow/stage";
import { Collapse } from "@/vendor/stageshow/motion/Collapse";
import { Popover } from "@/vendor/stageshow/motion/Popover";
import { Bar } from "@/vendor/stageshow/window";
import type { Act } from "@/vendor/stageshow/act";
import "./conectarDemo.css";

// O caminho dentro do WhatsApp até conectar o Vyzon, num celular que a pessoa
// acompanha enquanto faz no dela. Feito com o kit Stageshow (Benji Taylor, MIT).
// Android: ⋮ → Aparelhos conectados. iPhone: aba Configurações → Aparelhos
// conectados. Depois Conectar um aparelho e, no modo código, Conectar com
// número de telefone e o código; no modo QR, a câmera lê o código da tela.
// Termina de volta em Aparelhos conectados, com o aparelho novo na lista, e a
// seta de voltar leva ao começo (o loop tem causa).
//
// Palavras de verdade só no que a pessoa toca: WhatsApp, Aparelhos conectados,
// Conectar um aparelho, Conectar com número de telefone, o código e, no iPhone,
// as abas Conversas e Configurações. O resto é barra.
export type Sistema = "android" | "iphone";
export type ModoConexao = "codigo" | "qr";
type Tela = "conversas" | "config" | "aparelhos" | "camera" | "codigo";
type Cena = { tela: Tela; menu: boolean; baixo: boolean; digitado: number; qr: boolean; lido: boolean; conectado: boolean };

// Código de exemplo, no formato do WhatsApp (8 caracteres em dois grupos).
const CODIGO = "K7QM2WXA";

const ORDEM: Record<Sistema, Tela[]> = {
    android: ["conversas", "aparelhos", "camera", "codigo"],
    iphone: ["conversas", "config", "aparelhos", "camera", "codigo"],
};

// Desenho: largura e altura do palco e do celular, wide e compact.
const DESENHO = {
    wide: { w: 380, h: 420, phone: 336, margem: 22 },
    compact: { w: 320, h: 400, phone: 288, margem: 16 },
};
const REPOUSO = {
    wide: { x: DESENHO.wide.w - 36, y: DESENHO.wide.h - 30 },
    compact: { x: DESENHO.compact.w - 30, y: DESENHO.compact.h - 26 },
};

// Altura do celular desenhado (Phone mantém as proporções reais da tela).
function alturaDoCelular(sistema: Sistema, largura: number) {
    const tela = sistema === "android" ? { w: 412, h: 915, borda: 11 } : { w: 402, h: 874, borda: 13 };
    const s = largura / (tela.w + tela.borda * 2);
    return (tela.h + tela.borda * 2) * s;
}

const inicio = (sistema: Sistema): Cena => ({ tela: "conversas", menu: false, baixo: sistema === "iphone", digitado: 0, qr: false, lido: false, conectado: false });
const posterDe = (modo: ModoConexao): Cena =>
    modo === "codigo"
        ? { tela: "codigo", menu: false, baixo: false, digitado: CODIGO.length, qr: false, lido: false, conectado: false }
        : { tela: "camera", menu: false, baixo: false, digitado: 0, qr: true, lido: true, conectado: false };

function roteiro(sistema: Sistema, modo: ModoConexao, passo: (i: number) => void) {
    return async (a: Act<Cena>) => {
        passo(0);
        await a.wait(800);
        if (sistema === "android") {
            await a.click("mais");
            await a.set({ menu: true });
            passo(1);
            await a.wait(800);
            await a.click("aparelhos");
            await a.set({ menu: false, tela: "aparelhos" });
        } else {
            await a.click("aba-config");
            await a.set({ tela: "config", baixo: false });
            passo(1);
            await a.wait(1000);
            await a.click("aparelhos");
            await a.set({ tela: "aparelhos" });
        }
        await a.wait(1000);
        passo(2);
        await a.click("conectar");
        await a.set({ tela: "camera" });
        passo(3);
        await a.wait(1100);
        if (modo === "codigo") {
            await a.click("com-numero");
            await a.set({ tela: "codigo" });
            await a.wait(600);
            for (let i = 1; i <= CODIGO.length; i++) {
                a.put({ digitado: i });
                await a.wait(i === 4 ? 260 : 130);
            }
            await a.wait(800);
        } else {
            await a.set({ qr: true });
            await a.wait(1300);
            await a.set({ lido: true });
            await a.wait(700);
        }
        await a.set({ tela: "aparelhos", conectado: true });
        passo(4);
        await a.wait(2600);
        await a.click("voltar");
        if (sistema === "android") {
            await a.set({ tela: "conversas" });
            passo(0);
            await a.wait(450);
        } else {
            await a.set({ tela: "config" });
            await a.wait(700);
            await a.set({ baixo: true });
            await a.wait(600);
            await a.click("aba-conversas");
            await a.set({ tela: "conversas" });
            passo(0);
            await a.wait(450);
        }
        // Fora de vista: a lista e o código voltam ao começo sem ninguém ver.
        await a.snap({ conectado: false, digitado: 0, qr: false, lido: false });
        // O dedo sai da tela; o estilo touch não mostra nada entre toques.
        await a.move(REPOUSO[a.layout === "compact" ? "compact" : "wide"]);
        await a.wait(400);
    };
}

const LINHAS = [
    { nome: 128, msg: 176, hora: 30 },
    { nome: 96, msg: 150, hora: 34 },
    { nome: 150, msg: 120, hora: 28 },
    { nome: 110, msg: 164, hora: 32 },
    { nome: 136, msg: 140, hora: 30 },
    { nome: 104, msg: 158, hora: 34 },
    { nome: 142, msg: 126, hora: 28 },
    { nome: 118, msg: 170, hora: 32 },
    { nome: 98, msg: 144, hora: 30 },
    { nome: 132, msg: 152, hora: 34 },
];

function Conversas({ sistema }: { sistema: Sistema }) {
    return (
        <>
            {sistema === "android" ? (
                <div className="cd-topo cd-topo--wa">
                    <span className="cd-marca">WhatsApp</span>
                    <span className="cd-icones">
                        <Camera size={24} strokeWidth={2} aria-hidden />
                        <span className="cd-toque" data-target="mais">
                            <MoreVertical size={24} strokeWidth={2} aria-hidden />
                        </span>
                    </span>
                </div>
            ) : (
                <div className="cd-titulo-grande">
                    <Bar w={34} h={14} r={7} tone={2} />
                    <span>Conversas</span>
                </div>
            )}
            <div className="cd-busca">
                <Bar w={150} h={10} r={5} tone={2} />
            </div>
            <div className="cd-lista">
                {LINHAS.slice(0, sistema === "android" ? 5 : LINHAS.length).map((l, i) => (
                    <div key={i} className="cd-linha">
                        <span className="cd-avatar" data-i={i} />
                        <span className="cd-linha__texto">
                            <Bar w={l.nome} h={12} r={6} tone={4} />
                            <Bar w={l.msg} h={9} r={5} tone={2} />
                        </span>
                        <Bar w={l.hora} h={8} r={4} tone={2} />
                    </div>
                ))}
            </div>
        </>
    );
}

function Config() {
    return (
        <>
            <div className="cd-titulo-grande">
                <span>Configurações</span>
            </div>
            <div className="cd-perfil">
                <span className="cd-avatar cd-avatar--grande" />
                <span className="cd-linha__texto">
                    <Bar w={120} h={13} r={6} tone={4} />
                    <Bar w={170} h={9} r={5} tone={2} />
                </span>
            </div>
            <div className="cd-grupo">
                <div className="cd-item">
                    <span className="cd-item__icone" data-cor="1" />
                    <Bar w={110} h={11} r={5} tone={3} />
                </div>
                <div className="cd-item" data-target="aparelhos">
                    <span className="cd-item__icone" data-cor="wa">
                        <Laptop size={17} strokeWidth={2.2} aria-hidden />
                    </span>
                    <span className="cd-item__texto">Aparelhos conectados</span>
                </div>
                <div className="cd-item">
                    <span className="cd-item__icone" data-cor="2" />
                    <Bar w={90} h={11} r={5} tone={3} />
                </div>
            </div>
            <div className="cd-grupo">
                {[130, 96, 116, 104].map((w, i) => (
                    <div key={i} className="cd-item">
                        <span className="cd-item__icone" data-cor={String(3 + (i % 3))} />
                        <Bar w={w} h={11} r={5} tone={3} />
                    </div>
                ))}
            </div>
            <div className="cd-grupo">
                {[88, 124, 100, 136].map((w, i) => (
                    <div key={i} className="cd-item">
                        <span className="cd-item__icone" data-cor={String(1 + (i % 5))} />
                        <Bar w={w} h={11} r={5} tone={3} />
                    </div>
                ))}
            </div>
        </>
    );
}

function Aparelhos({ sistema, conectado }: { sistema: Sistema; conectado: boolean }) {
    return (
        <>
            <div className={`cd-barra cd-barra--${sistema}`}>
                <span className="cd-toque" data-target="voltar">
                    {sistema === "android" ? <ArrowLeft size={24} strokeWidth={2} aria-hidden /> : <ChevronLeft size={28} strokeWidth={2.2} aria-hidden />}
                </span>
                <span className="cd-barra__titulo">Aparelhos conectados</span>
            </div>
            <div className="cd-arte">
                <Laptop size={56} strokeWidth={1.6} aria-hidden />
            </div>
            <div className="cd-centro">
                <Bar w={240} h={10} r={5} tone={2} />
            </div>
            <span className="cd-botao" data-target="conectar">
                Conectar um aparelho
            </span>
            <div className="cd-secao">
                <Bar w={120} h={9} r={5} tone={3} />
            </div>
            <Collapse open={conectado} reveal="drop">
                <div className="cd-aparelho" data-novo={conectado || undefined}>
                    <span className="cd-aparelho__icone">
                        <Laptop size={20} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="cd-linha__texto">
                        <Bar w={140} h={12} r={6} tone={4} />
                        <Bar w={96} h={9} r={5} tone={2} />
                    </span>
                </div>
            </Collapse>
            <div className="cd-centro cd-centro--rodape">
                <Bar w={230} h={9} r={5} tone={2} />
                <Bar w={170} h={9} r={5} tone={2} />
            </div>
        </>
    );
}

function CameraTela({ qr, lido }: { qr: boolean; lido: boolean }) {
    return (
        <div className="cd-camera">
            <div className="cd-camera__topo">
                <Bar w={170} h={11} r={5} tone={1} className="cd-claro" />
            </div>
            <div className="cd-visor" data-lido={lido || undefined}>
                {["tl", "tr", "bl", "br"].map((c) => (
                    <span key={c} className={`cd-canto cd-canto--${c}`} />
                ))}
                <span className="cd-qr" data-show={qr || undefined}>
                    <QrCode size={150} strokeWidth={1.4} aria-hidden />
                </span>
            </div>
            <span className="cd-link" data-target="com-numero">
                Conectar com número de telefone
            </span>
        </div>
    );
}

function CodigoTela({ sistema, digitado }: { sistema: Sistema; digitado: number }) {
    return (
        <>
            <div className={`cd-barra cd-barra--${sistema}`}>
                <span className="cd-toque">
                    {sistema === "android" ? <ArrowLeft size={24} strokeWidth={2} aria-hidden /> : <ChevronLeft size={28} strokeWidth={2.2} aria-hidden />}
                </span>
                <Bar w={150} h={13} r={6} tone={4} />
            </div>
            <div className="cd-centro cd-centro--codigo">
                <Bar w={270} h={10} r={5} tone={2} />
                <Bar w={210} h={10} r={5} tone={2} />
            </div>
            <div className="cd-codigo" aria-label="Exemplo de código">
                {CODIGO.split("").map((c, i) => (
                    <span key={i} className="cd-casa" data-meio={i === 4 || undefined} data-cheia={i < digitado || undefined} data-agora={i === digitado || undefined}>
                        <span className="cd-casa__letra">{c}</span>
                    </span>
                ))}
            </div>
            <div className="cd-centro cd-centro--rodape">
                <Bar w={180} h={10} r={5} tone={2} />
                <Bar w={120} h={10} r={5} tone={3} />
            </div>
        </>
    );
}

function Abas({ visivel }: { visivel: boolean }) {
    const abas = [
        { icone: CircleDashed, rotulo: null },
        { icone: PhoneIcon, rotulo: null },
        { icone: Users, rotulo: null },
        { icone: MessageCircle, rotulo: "Conversas", alvo: "aba-conversas" },
        { icone: Settings, rotulo: "Configurações", alvo: "aba-config" },
    ];
    return (
        <nav className="cd-abas" data-show={visivel || undefined} aria-hidden>
            {abas.map(({ icone: I, rotulo, alvo }, i) => (
                <span key={i} className="cd-aba" data-target={alvo}>
                    <I size={24} strokeWidth={2} />
                    {rotulo ? <span className="cd-aba__rotulo">{rotulo}</span> : <Bar w={44} h={7} r={4} tone={2} />}
                </span>
            ))}
        </nav>
    );
}

export default function ConectarDemo({ sistema, modo, onPasso }: { sistema: Sistema; modo: ModoConexao; onPasso?: (i: number) => void }) {
    const passoRef = useRef(onPasso);
    passoRef.current = onPasso;
    const ordem = ORDEM[sistema];
    // Estáveis entre renders: o modal re-renderiza a cada passo, e um roteiro
    // novo reiniciaria o palco.
    const comeco = useMemo(() => inicio(sistema), [sistema]);
    const poster = useMemo(() => posterDe(modo), [modo]);
    const script = useMemo(() => roteiro(sistema, modo, (i) => passoRef.current?.(i)), [sistema, modo]);

    return (
        <Stage<Cena>
            key={`${sistema}-${modo}`}
            width={DESENHO.wide.w}
            height={DESENHO.wide.h}
            compact={{ below: DESENHO.wide.w, width: DESENHO.compact.w, height: DESENHO.compact.h }}
            initial={comeco}
            poster={poster}
            script={script}
            cursor={{ at: REPOUSO, style: "touch" }}
            className="cd"
        >
            {(s, _rect, layout) => {
                const d = DESENHO[layout === "compact" ? "compact" : "wide"];
                const alto = alturaDoCelular(sistema, d.phone);
                const desce = s.baixo ? d.h - d.margem * 2 - alto : 0;
                const atual = ordem.indexOf(s.tela);
                const pos = (t: Tela) => {
                    const i = ordem.indexOf(t);
                    // No iPhone, Conversas e Configurações são abas: trocam no lugar.
                    if (sistema === "iphone" && (t === "conversas" || t === "config") && (s.tela === "conversas" || s.tela === "config")) return t === s.tela ? "agora" : "aba";
                    return i < atual ? "antes" : i === atual ? "agora" : "depois";
                };
                return (
                    <div className="cd-cena" data-baixo={s.baixo || undefined}>
                        <div className="cd-trilho" style={{ left: (d.w - d.phone) / 2, top: d.margem, transform: `translateY(${desce}px)` }}>
                            <Phone width={d.phone} frame={sistema === "android" ? "android" : "pro"} dark={s.tela === "camera"} time="9:41" className={`cd-phone cd-phone--${sistema}`}>
                                <div className="cd-telas">
                                    <section className="cd-tela" data-pos={pos("conversas")}>
                                        <Conversas sistema={sistema} />
                                    </section>
                                    {sistema === "iphone" && (
                                        <section className="cd-tela" data-pos={pos("config")}>
                                            <Config />
                                        </section>
                                    )}
                                    <section className="cd-tela" data-pos={pos("aparelhos")}>
                                        <Aparelhos sistema={sistema} conectado={s.conectado} />
                                    </section>
                                    <section className="cd-tela cd-tela--escura" data-pos={pos("camera")}>
                                        <CameraTela qr={s.qr} lido={s.lido} />
                                    </section>
                                    <section className="cd-tela" data-pos={pos("codigo")}>
                                        <CodigoTela sistema={sistema} digitado={s.digitado} />
                                    </section>
                                    {sistema === "android" && (
                                        <Popover show={s.menu} origin="top right" className="cd-menu">
                                            {[118, 140, 96].map((w, i) => (
                                                <span key={i} className="cd-menu__item">
                                                    <Bar w={w} h={11} r={5} tone={3} />
                                                </span>
                                            ))}
                                            <span className="cd-menu__item cd-menu__item--real" data-target="aparelhos">
                                                <span>Aparelhos conectados</span>
                                            </span>
                                            {[150, 112].map((w, i) => (
                                                <span key={i} className="cd-menu__item">
                                                    <Bar w={w} h={11} r={5} tone={3} />
                                                </span>
                                            ))}
                                        </Popover>
                                    )}
                                </div>
                                {sistema === "iphone" && <Abas visivel={s.tela === "conversas" || s.tela === "config"} />}
                            </Phone>
                        </div>
                    </div>
                );
            }}
        </Stage>
    );
}
