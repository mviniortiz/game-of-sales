import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { ButtonV2 } from "./ButtonV2";

// LP.6 (v2) — header próprio da landing v2: limpo, baixo, editorial. Botão
// "Agendar demo" em pill preto (sm); "Entrar" como link simples. Não toca no
// LandingNav da landing de produção.
interface NavV2Props {
    onLoginClick: () => void;
    onCTAClick: () => void;
}

const LINKS = [
    { label: "Como funciona", anchor: "how-it-works" },
    { label: "EVA", anchor: "eva" },
];

const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const NavV2 = ({ onLoginClick, onCTAClick }: NavV2Props) => {
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

                <nav className="hidden items-center gap-7 md:flex">
                    {LINKS.map((l) => (
                        <button key={l.anchor} className="vz-navlink" onClick={() => scrollToId(l.anchor)}>
                            {l.label}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-3 sm:gap-4">
                    <button className="vz-navlink hidden sm:inline" onClick={onLoginClick}>
                        Entrar
                    </button>
                    <ButtonV2 size="sm" onClick={onCTAClick}>
                        Agendar demo
                    </ButtonV2>
                </div>
            </div>
        </header>
    );
};
