import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NavV2 } from "@/components/landing-v2/NavV2";
import { FooterV2 } from "@/components/landing-v2/FooterV2";
import { BlogCover } from "@/components/landing-v2/BlogCover";
import { ButtonV2 } from "@/components/landing-v2/ButtonV2";
import { getBlogPost, formatBlogDate } from "@/data/landing/blogPosts";

// Post individual do blog (rota /blog/:slug).
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

    useEffect(() => {
        if (slug && !post) navigate("/blog", { replace: true });
    }, [slug, post, navigate]);

    if (!post) return null;
    const goHome = (anchor?: string) => navigate(anchor ? `/?go=${anchor}` : "/");

    return (
        <div className="lp-v2 min-h-screen w-full" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <NavV2
                onCTAClick={() => navigate("/?demo=1")}
                onLoginClick={() => navigate("/auth")}
                onNavClick={(a) => goHome(a)}
                onBlogClick={() => navigate("/blog")}
            />

            <article className="mx-auto max-w-[720px] px-5 pb-20 pt-16 sm:pt-24">
                <button type="button" onClick={() => navigate("/blog")} className="vz-navlink text-[13.5px]" style={{ color: "var(--lp-ink-55)" }}>
                    ← Voltar para o blog
                </button>

                <div className="mt-7 flex items-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                    <span style={{ color: post.accent, fontWeight: 600 }}>{post.category}</span>
                    <span>·</span>
                    <span>{formatBlogDate(post.date)}</span>
                </div>
                <h1 className="lp-display mt-3" style={{ fontSize: "clamp(2rem, 4.5vw, 3.1rem)", letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--lp-ink)" }}>
                    {post.title}
                </h1>
                <p className="mt-5 text-[17px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.55 }}>
                    {post.excerpt}
                </p>

                <div className="mt-9">
                    <BlogCover post={post} large />
                </div>

                <div className="mt-10 flex flex-col gap-5">
                    {post.body.map((para, i) => (
                        <p key={i} className="text-[17px]" style={{ color: "rgba(5,5,5,0.82)", lineHeight: 1.7 }}>
                            {para}
                        </p>
                    ))}
                </div>

                {/* CTA pra demo */}
                <div className="mt-14 rounded-2xl px-7 py-9 text-center" style={{ background: "#fff", border: "1px solid var(--lp-line)" }}>
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
            </article>

            <FooterV2 onNavClick={(a) => goHome(a)} onLoginClick={() => navigate("/auth")} onBlogClick={() => navigate("/blog")} />
        </div>
    );
};

export default BlogPostV2;
