import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NavV2 } from "@/components/landing-v2/NavV2";
import { FooterV2 } from "@/components/landing-v2/FooterV2";
import { BlogCover } from "@/components/landing-v2/BlogCover";
import { ButtonV2 } from "@/components/landing-v2/ButtonV2";
import { Rise } from "@/components/landing/animation/Rise";
import { getBlogPost, formatBlogDate, readMinutes, type BlogBlock } from "@/data/landing/blogPosts";

// Post individual do blog (rota /blog/:slug). Conteúdo em blocos (h2/p/ul/quote),
// barra de progresso de leitura, reveal-on-scroll por bloco (transform-only, com
// fallback de reduced-motion via Rise). Crawlers recebem o HTML prerenderizado
// (scripts/prerender-seo.mjs); aqui setamos title/meta no client pra navegação SPA.

// Barra fina no topo que acompanha o progresso da leitura. scaleX (compositado),
// atualizado num rAF pra não custar no scroll.
function ReadingProgress({ accent }: { accent: string }) {
    const barRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let raf = 0;
        const update = () => {
            const el = document.documentElement;
            const max = el.scrollHeight - el.clientHeight;
            const pct = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
            if (barRef.current) barRef.current.style.transform = `scaleX(${pct})`;
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
        <div className="vz-readbar" aria-hidden="true">
            <div ref={barRef} className="vz-readbar__fill" style={{ background: accent }} />
        </div>
    );
}

function Block({ block, accent }: { block: BlogBlock; accent: string }) {
    const markerStyle = { "--vz-marker": accent } as React.CSSProperties;
    switch (block.type) {
        case "h2":
            return (
                <h2 className="lp-display" style={{ fontSize: "clamp(1.4rem, 2.7vw, 1.85rem)", letterSpacing: "-0.02em", lineHeight: 1.18, color: "var(--lp-ink)", marginTop: "0.6rem" }}>
                    {block.text}
                </h2>
            );
        case "h3":
            return (
                <h3 className="vz-post-h3" style={{ color: "var(--lp-ink)" }}>
                    {block.text}
                </h3>
            );
        case "ul":
            return (
                <ul className="vz-post-ul">
                    {block.items.map((it, i) => (
                        <li key={i} style={markerStyle}>{it}</li>
                    ))}
                </ul>
            );
        case "ol":
            return (
                <ol className="vz-post-ol" style={markerStyle}>
                    {block.items.map((it, i) => (
                        <li key={i}>{it}</li>
                    ))}
                </ol>
            );
        case "quote":
            return (
                <blockquote className="lp-serif vz-post-quote" style={{ borderColor: accent, color: "var(--lp-ink)" }}>
                    {block.text}
                </blockquote>
            );
        case "example":
            return (
                <aside className="vz-post-example" style={markerStyle}>
                    <p className="vz-post-example__label">Exemplo</p>
                    <p className="vz-post-example__title">{block.title}</p>
                    {block.body.map((t, i) => (
                        <p key={i} className="vz-post-example__p">{t}</p>
                    ))}
                </aside>
            );
        default:
            return (
                <p className="text-[17px]" style={{ color: "rgba(5,5,5,0.82)", lineHeight: 1.75 }}>
                    {block.text}
                </p>
            );
    }
}

const BlogPostV2 = () => {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? getBlogPost(slug) : undefined;

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        window.scrollTo(0, 0);
        return () => { if (wasDark) html.classList.add("dark"); };
    }, [slug]);

    // title/meta no client (faltava) — UX de navegação SPA. Crawlers já recebem
    // do prerender. Restaura ao sair pra não vazar pra outra rota.
    useEffect(() => {
        if (!post) return;
        const prevTitle = document.title;
        document.title = `${post.title} · Vyzon`;
        const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const prevDesc = metaDesc?.content;
        if (metaDesc) metaDesc.content = post.excerpt;
        return () => {
            document.title = prevTitle;
            if (metaDesc && prevDesc != null) metaDesc.content = prevDesc;
        };
    }, [post]);

    useEffect(() => {
        if (slug && !post) navigate("/blog", { replace: true });
    }, [slug, post, navigate]);

    if (!post) return null;
    const goHome = (anchor?: string) => navigate(anchor ? `/?go=${anchor}` : "/");

    return (
        <div className="lp-v2 min-h-screen w-full" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <ReadingProgress accent={post.accent} />
            <NavV2
                onCTAClick={() => navigate("/?demo=1")}
                onLoginClick={() => navigate("/auth")}
                onNavClick={(a) => goHome(a)}
                onBlogClick={() => navigate("/blog")}
            />

            <article className="mx-auto max-w-[720px] px-5 pb-20 pt-16 sm:pt-24">
                <button type="button" onClick={() => navigate("/blog")} className="vz-backlink text-[13.5px]" style={{ color: "var(--lp-ink-55)" }}>
                    <span className="vz-backlink__arrow">←</span> Voltar para o blog
                </button>

                <Rise>
                    <div className="mt-7 flex items-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                        <span style={{ color: post.accent, fontWeight: 600 }}>{post.category}</span>
                        <span>·</span>
                        <span>{formatBlogDate(post.date)}</span>
                        <span>·</span>
                        <span>{readMinutes(post)} min de leitura</span>
                    </div>
                    <h1 className="lp-display mt-3" style={{ fontSize: "clamp(2rem, 4.5vw, 3.1rem)", letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--lp-ink)" }}>
                        {post.title}
                    </h1>
                    <p className="mt-5 text-[17px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.55 }}>
                        {post.excerpt}
                    </p>
                </Rise>

                <Rise delay={0.05}>
                    <div className="mt-9 vz-post-cover">
                        <BlogCover post={post} large />
                    </div>
                </Rise>

                <div className="mt-10 flex flex-col gap-5">
                    {post.content.map((block, i) => (
                        <Rise key={i}>
                            <Block block={block} accent={post.accent} />
                        </Rise>
                    ))}
                </div>

                {/* CTA pra demo */}
                <Rise>
                    <div className="mt-14 vz-post-cta rounded-2xl px-7 py-9 text-center" style={{ background: "#fff", border: "1px solid var(--lp-line)" }}>
                        <h2 className="lp-display" style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", letterSpacing: "-0.025em", color: "var(--lp-ink)" }}>
                            Veja a EVA trabalhando em uma conversa
                        </h2>
                        <p className="mx-auto mt-2.5 max-w-md text-[14.5px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.55 }}>
                            Em poucos minutos, entenda como ela lê o atendimento e sugere o próximo passo.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <ButtonV2 variant="primary" showArrow onClick={() => navigate("/?demo=1")}>
                                Ver a EVA em ação
                            </ButtonV2>
                        </div>
                    </div>
                </Rise>
            </article>

            <FooterV2 onNavClick={(a) => goHome(a)} onLoginClick={() => navigate("/auth")} onBlogClick={() => navigate("/blog")} />
        </div>
    );
};

export default BlogPostV2;
