import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { ButtonV2 } from "./ButtonV2";

// Header das páginas de conteúdo (blog): logo, Blog, Entrar e o convite para o
// Raio-X em pill preto. Sem links de seção porque a home solar é uma página só,
// com o formulário em /#raio-x.
interface NavV2Props {
    onLoginClick: () => void;
    onCTAClick: () => void;
    onBlogClick?: () => void;
}

export const NavV2 = ({ onLoginClick, onCTAClick, onBlogClick }: NavV2Props) => {
    return (
        <header
            className="sticky top-0 z-50 border-b"
            style={{
                borderColor: "var(--lp-line-soft)",
                background: "rgba(250,249,245,0.82)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
            }}
        >
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="flex items-center"
                    aria-label="Vyzon"
                >
                    <ThemeLogo className="h-6 w-auto" />
                </button>

                <div className="flex items-center gap-3 sm:gap-4">
                    {onBlogClick && (
                        <button className="vz-navlink" onClick={onBlogClick}>
                            Blog
                        </button>
                    )}
                    <button className="vz-navlink" onClick={onLoginClick}>
                        Entrar
                    </button>
                    <ButtonV2 size="sm" onClick={onCTAClick}>
                        Raio-X grátis
                    </ButtonV2>
                </div>
            </div>
        </header>
    );
};
