import { useState } from "react";
import type { BlogPost } from "@/data/landing/blogPosts";

// Capa do post: imagem editorial gerada em public/blog-covers/<slug>.webp
// (+ <slug>.jpg como OG). Lazy + object-cover, borda hairline e raio da marca.
// Fallback: post sem capa ainda não cai em imagem quebrada — o onError esconde
// o <img> e um fundo editorial em CSS assume (accent do post).
export const BlogCover = ({ post, large }: { post: BlogPost; large?: boolean }) => {
    const [missing, setMissing] = useState(false);

    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{
                aspectRatio: large ? "16 / 10" : "16 / 9",
                border: "1px solid var(--lp-line)",
                background: missing
                    ? `linear-gradient(135deg, ${post.accent}14, ${post.accent}05 55%, transparent), var(--lp-white)`
                    : "var(--lp-white)",
            }}
        >
            {!missing && (
                <img
                    src={`/blog-covers/${post.slug}.webp`}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    onError={() => setMissing(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
        </div>
    );
};
