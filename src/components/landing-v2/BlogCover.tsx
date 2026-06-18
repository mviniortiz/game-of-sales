import type { BlogPost } from "@/data/landing/blogPosts";

// Capa do post em CSS (sem assets): wash da cor de acento + grade de pontos da
// marca + a frase-capa em serif. Mesma DNA da hero/EVA.
function rgba(hex: string, a: number): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}

export const BlogCover = ({ post, large }: { post: BlogPost; large?: boolean }) => {
    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{
                aspectRatio: large ? "16 / 10" : "16 / 9",
                background: `linear-gradient(150deg, ${rgba(post.accent, 0.12)}, ${rgba(post.accent, 0.02)})`,
                border: "1px solid var(--lp-line)",
            }}
        >
            <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(circle, ${rgba(post.accent, 0.4)} 1.3px, transparent 1.4px)`,
                    backgroundSize: "16px 16px",
                    WebkitMaskImage: "radial-gradient(ellipse 75% 80% at 78% 75%, #000 0%, transparent 72%)",
                    maskImage: "radial-gradient(ellipse 75% 80% at 78% 75%, #000 0%, transparent 72%)",
                }}
            />
            <div className="absolute inset-0 flex items-center p-6 sm:p-8">
                <p
                    className="lp-serif"
                    style={{
                        fontStyle: "italic",
                        color: post.accent,
                        lineHeight: 1.08,
                        letterSpacing: "-0.01em",
                        fontSize: large ? "clamp(1.7rem, 3.2vw, 2.6rem)" : "clamp(1.25rem, 2.4vw, 1.6rem)",
                        maxWidth: large ? "70%" : "85%",
                    }}
                >
                    {post.coverText}
                </p>
            </div>
        </div>
    );
};
