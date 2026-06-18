import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavV2 } from "@/components/landing-v2/NavV2";
import { FooterV2 } from "@/components/landing-v2/FooterV2";
import { BlogCover } from "@/components/landing-v2/BlogCover";
import { BLOG_POSTS, BLOG_CATEGORIES, formatBlogDate, type BlogPost } from "@/data/landing/blogPosts";

// Blog da landing (rota /blog) — listagem estilo editorial: título serif, filtro
// por categoria, post em destaque + grade. Reusa o NavV2/FooterV2 da v2.
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
                <h1 className="lp-display" style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", letterSpacing: "-0.04em", lineHeight: 0.95, color: "var(--lp-ink)" }}>
                    Conteúdo
                </h1>
                <p className="mt-4 max-w-xl text-[15px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.55 }}>
                    Ideias sobre vender por conversa, qualificar leads e usar IA sem perder o controle do seu time.
                </p>

                {/* filtros */}
                <div className="mt-9 flex flex-wrap gap-2">
                    {["Todos", ...BLOG_CATEGORIES].map((c) => {
                        const active = c === cat;
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCat(c)}
                                className="rounded-full px-4 py-1.5 text-[13.5px] transition-colors"
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
                    <button
                        type="button"
                        onClick={() => openPost(featured)}
                        className="group mt-12 grid w-full gap-7 text-left lg:grid-cols-[1.15fr_0.85fr] lg:items-center"
                    >
                        <BlogCover post={featured} large />
                        <div>
                            <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                                <span style={{ color: featured.accent, fontWeight: 600 }}>{featured.category}</span>
                                <span>·</span>
                                <span>{formatBlogDate(featured.date)}</span>
                            </div>
                            <h2 className="lp-display mt-3 transition-colors group-hover:opacity-80" style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", letterSpacing: "-0.025em", lineHeight: 1.08, color: "var(--lp-ink)" }}>
                                {featured.title}
                            </h2>
                            <p className="mt-4 max-w-md text-[15px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                                {featured.excerpt}
                            </p>
                        </div>
                    </button>
                )}

                {/* grade */}
                <div className="mt-14 grid gap-x-7 gap-y-12 sm:grid-cols-2">
                    {rest.map((p) => (
                        <button key={p.slug} type="button" onClick={() => openPost(p)} className="group text-left">
                            <BlogCover post={p} />
                            <div className="mt-4 flex items-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                                <span style={{ color: p.accent, fontWeight: 600 }}>{p.category}</span>
                                <span>·</span>
                                <span>{formatBlogDate(p.date)}</span>
                            </div>
                            <h3 className="lp-display mt-2 transition-colors group-hover:opacity-80" style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)", letterSpacing: "-0.02em", lineHeight: 1.12, color: "var(--lp-ink)" }}>
                                {p.title}
                            </h3>
                            <p className="mt-2.5 text-[14px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.5 }}>
                                {p.excerpt}
                            </p>
                        </button>
                    ))}
                </div>
            </main>

            <FooterV2 onNavClick={(a) => goHome(a)} onLoginClick={() => navigate("/auth")} onBlogClick={() => navigate("/blog")} />
        </div>
    );
};

export default BlogV2;
