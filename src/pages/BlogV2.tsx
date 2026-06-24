import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavV2 } from "@/components/landing-v2/NavV2";
import { FooterV2 } from "@/components/landing-v2/FooterV2";
import { BlogCover } from "@/components/landing-v2/BlogCover";
import { Rise } from "@/components/landing/animation/Rise";
import { BLOG_POSTS, BLOG_CATEGORIES, formatBlogDate, readMinutes, type BlogPost } from "@/data/landing/blogPosts";

// Blog da landing (rota /blog) — listagem editorial: título serif, filtro por
// categoria, post em destaque + grade. Reveal-on-scroll (Rise, transform-only) e
// microinterações de hover (lift + zoom da capa), tudo com fallback de
// prefers-reduced-motion. Reusa NavV2/FooterV2 da v2.
const BlogV2 = () => {
    const navigate = useNavigate();
    const [cat, setCat] = useState<string>("Todos");

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        window.scrollTo(0, 0);
        return () => { if (wasDark) html.classList.add("dark"); };
    }, []);

    const goHome = (anchor?: string) => navigate(anchor ? `/?go=${anchor}` : "/");
    const openPost = (p: BlogPost) => navigate(`/blog/${p.slug}`);

    const filtered = cat === "Todos" ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.category === cat);
    const featured = cat === "Todos" ? (BLOG_POSTS.find((p) => p.featured) ?? BLOG_POSTS[0]) : null;
    const rest = featured ? filtered.filter((p) => p.slug !== featured.slug) : filtered;

    return (
        <div className="lp-v2 min-h-screen w-full" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <NavV2
                onCTAClick={() => goHome()}
                onLoginClick={() => navigate("/auth")}
                onNavClick={(a) => goHome(a)}
                onBlogClick={() => navigate("/blog")}
            />

            <main className="mx-auto max-w-6xl px-5 pb-24 pt-20 sm:pt-28">
                <Rise>
                    <h1 className="lp-display" style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", letterSpacing: "-0.04em", lineHeight: 0.95, color: "var(--lp-ink)" }}>
                        Conteúdo
                    </h1>
                    <p className="mt-4 max-w-xl text-[15px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.55 }}>
                        Ideias sobre vender por conversa, qualificar leads e usar IA sem perder o controle do seu time.
                    </p>
                </Rise>

                {/* filtros */}
                <div className="mt-9 flex flex-wrap gap-2">
                    {["Todos", ...BLOG_CATEGORIES].map((c) => {
                        const active = c === cat;
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCat(c)}
                                className="vz-blog-filter rounded-full px-4 py-1.5 text-[13.5px]"
                                style={active
                                    ? { background: "var(--lp-ink)", color: "#fff", fontWeight: 600 }
                                    : { background: "transparent", color: "var(--lp-ink-90)", border: "1px solid var(--lp-line)" }}
                            >
                                {c}
                            </button>
                        );
                    })}
                </div>

                {/* destaque */}
                {featured && (
                    <Rise delay={0.05}>
                        <button
                            type="button"
                            onClick={() => openPost(featured)}
                            className="vz-blog-card group mt-12 grid w-full gap-7 text-left lg:grid-cols-[1.15fr_0.85fr] lg:items-center"
                        >
                            <div className="vz-cover-zoom">
                                <BlogCover post={featured} large />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                                    <span style={{ color: featured.accent, fontWeight: 600 }}>{featured.category}</span>
                                    <span>·</span>
                                    <span>{formatBlogDate(featured.date)}</span>
                                    <span>·</span>
                                    <span>{readMinutes(featured)} min</span>
                                </div>
                                <h2 className="lp-display vz-blog-title mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", letterSpacing: "-0.025em", lineHeight: 1.08, color: "var(--lp-ink)" }}>
                                    {featured.title}
                                </h2>
                                <p className="mt-4 max-w-md text-[15px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                                    {featured.excerpt}
                                </p>
                                <span className="vz-blog-readmore mt-5 inline-flex items-center gap-1.5 text-[14px]" style={{ color: featured.accent, fontWeight: 600 }}>
                                    Ler artigo <span className="vz-blog-readmore__arrow">→</span>
                                </span>
                            </div>
                        </button>
                    </Rise>
                )}

                {/* grade */}
                <div className="mt-14 grid gap-x-7 gap-y-12 sm:grid-cols-2">
                    {rest.map((p, i) => (
                        <Rise key={p.slug} delay={(i % 2) * 0.06}>
                            <button type="button" onClick={() => openPost(p)} className="vz-blog-card group w-full text-left">
                                <div className="vz-cover-zoom">
                                    <BlogCover post={p} />
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                                    <span style={{ color: p.accent, fontWeight: 600 }}>{p.category}</span>
                                    <span>·</span>
                                    <span>{formatBlogDate(p.date)}</span>
                                    <span>·</span>
                                    <span>{readMinutes(p)} min</span>
                                </div>
                                <h3 className="lp-display vz-blog-title mt-2" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", lineHeight: 1.12, color: "var(--lp-ink)" }}>
                                    {p.title}
                                </h3>
                                <p className="mt-2.5 text-[14px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.5 }}>
                                    {p.excerpt}
                                </p>
                            </button>
                        </Rise>
                    ))}
                </div>
            </main>

            <FooterV2 onNavClick={(a) => goHome(a)} onLoginClick={() => navigate("/auth")} onBlogClick={() => navigate("/blog")} />
        </div>
    );
};

export default BlogV2;
