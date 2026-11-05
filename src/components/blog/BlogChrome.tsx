import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot } from "@/components/eva/EvaBot";
import { CONTACT, whatsappUrl } from "@/config/contact";

// Moldura do blog no sistema Lume em campo (LP.9): o mesmo cabeçalho da home,
// a barra de leitura em sol, o convite final em cartão noite com a Lume sentada
// e o rodapé. Um botão só, com o mesmo texto e destino da home.
export const BLOG_CTA = "Ver minhas propostas paradas";
export const BLOG_CTA_HREF = "/criar-conta?segmento=energia_solar";
export const BLOG_CTA_LINHA =
    "Grátis e sem cartão. Você cria a conta, conecta o WhatsApp e em uns 3 minutos vê as propostas paradas dos últimos 90 dias.";

export function BlogHeader({ onCta }: { onCta: () => void }) {
    return (
        <header className="vb-header">
            <div className="vb-wrap flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-5">
                    <Link to="/" aria-label="Vyzon, início" className="shrink-0">
                        <ThemeLogo className="h-[22px] w-auto" />
                    </Link>
                    <Link to="/blog" className="vb-navlink">
                        Blog
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/auth" className="vb-navlink">
                        Entrar
                    </Link>
                    <Link to={BLOG_CTA_HREF} className="vs-btn vb-btn-sm !hidden sm:!inline-flex" onClick={onCta}>
                        {BLOG_CTA}
                    </Link>
                </div>
            </div>
        </header>
    );
}

// Barra fina embaixo do cabeçalho que acompanha a leitura. scaleX num rAF,
// só transform, então não custa no scroll.
export function ReadingBar() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let raf = 0;
        const update = () => {
            const el = document.documentElement;
            const max = el.scrollHeight - el.clientHeight;
            const pct = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
            if (ref.current) ref.current.style.transform = `scaleX(${pct})`;
        };
        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(update);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        update();
        return () => {
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(raf);
        };
    }, []);
    return (
        <div className="vb-readbar" aria-hidden="true">
            <div ref={ref} className="vb-readbar__fill" />
        </div>
    );
}

// Convite final: cartão noite, a Lume sentada na borda, botão sol.
export function BlogCtaCard({ titulo, texto, onCta }: { titulo: ReactNode; texto?: ReactNode; onCta: () => void }) {
    return (
        <section className="vb-cta vs-noite" aria-label="Ver propostas paradas">
            <span className="vs-sentada" style={{ ["--s-eva" as string]: "112px" }}>
                <EvaBot size={112} state="idle" label="Lume" />
            </span>
            <h2 className="vs-display vb-cta__titulo">{titulo}</h2>
            <p className="vb-cta__texto">{texto ?? "A Lume, assistente do Vyzon, lê o seu WhatsApp e mostra cada orçamento que ficou sem resposta, com o valor e há quantos dias. Nada é enviado para cliente nenhum."}</p>
            <div className="mt-6 flex flex-col items-start gap-3">
                <Link to={BLOG_CTA_HREF} className="vs-btn vs-btn--sol" onClick={onCta}>
                    {BLOG_CTA}
                </Link>
                <p className="vb-cta__linha">{BLOG_CTA_LINHA}</p>
            </div>
        </section>
    );
}

export function BlogFooter({ onSuporte }: { onSuporte?: () => void }) {
    return (
        <footer className="vb-wrap flex flex-wrap items-center justify-between gap-3 py-8 text-sm" style={{ color: "var(--lp-ink-subtle)" }}>
            <span>Vyzon</span>
            <nav className="flex flex-wrap gap-5" aria-label="Rodapé">
                <Link to="/" className="vb-navlink">Início</Link>
                <Link to="/blog" className="vb-navlink">Blog</Link>
                <a href={whatsappUrl(CONTACT.defaultMessage)} target="_blank" rel="noopener noreferrer" className="vb-navlink" onClick={onSuporte}>
                    Suporte no WhatsApp
                </a>
                <Link to="/politica-privacidade" className="vb-navlink">Privacidade</Link>
                <Link to="/termos-de-servico" className="vb-navlink">Termos</Link>
            </nav>
        </footer>
    );
}
