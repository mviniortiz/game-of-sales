import { ThemeLogo } from "@/components/ui/ThemeLogo";

// LP.6 (v2) — rodapé simples e confiável. Logo + frase + links + legal. Borda
// superior fina, espaçamento generoso. Sem newsletter/redes fake, sem colunas
// em excesso.
interface FooterV2Props {
    onNavClick: (id: string) => void;
    onLoginClick: () => void;
}

export const FooterV2 = ({ onNavClick, onLoginClick }: FooterV2Props) => {
    return (
        <footer className="px-5 pb-12 pt-16" style={{ backgroundColor: "var(--lp-paper)", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            <div className="mx-auto flex max-w-[1080px] flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-sm">
                    <ThemeLogo className="h-6 w-auto" />
                    <p className="mt-4 text-[14px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.55 }}>
                        Central comercial com EVA para agências que vendem por conversa.
                    </p>
                </div>
                <nav className="flex flex-wrap gap-x-8 gap-y-3">
                    <button className="vz-navlink" onClick={() => onNavClick("how-it-works")}>
                        Como funciona
                    </button>
                    <button className="vz-navlink" onClick={() => onNavClick("eva")}>
                        EVA
                    </button>
                    <button className="vz-navlink" onClick={onLoginClick}>
                        Entrar
                    </button>
                </nav>
            </div>
            <div
                className="mx-auto mt-12 max-w-[1080px] border-t pt-6"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
            >
                <p className="text-[13px]" style={{ color: "rgba(5,5,5,0.42)" }}>
                    © 2026 Vyzon. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
};
