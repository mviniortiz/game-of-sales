import type { BlogPost } from "@/data/landing/blogPosts";

// Capa do post: imagem editorial gerada (abstrata, sem texto) em
// public/blog-covers/<slug>.webp. Lazy + object-cover, borda hairline e raio da
// marca. A frase (coverText) não vai mais sobreposta — a arte fala sozinha; o
// título do post aparece logo abaixo. Gerada por scripts/gen-blog-covers.mjs.
export const BlogCover = ({ post, large }: { post: BlogPost; large?: boolean }) => {
    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{
                aspectRatio: large ? "16 / 10" : "16 / 9",
                border: "1px solid var(--lp-line)",
                background: "var(--lp-white)",
            }}
        >
            <img
                src={`/blog-covers/${post.slug}.webp`}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
            />
        </div>
    );
};
