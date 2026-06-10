import { ThemeLogo } from "@/components/ui/ThemeLogo";

// LP.4 2026-06-09: footer como banda ink final — labels mono, hairlines
// brancas de baixa opacidade, mesma grade técnica do "Como resolve".
type Props = {
    onNavClick: (id: string) => void;
    onLoginClick: () => void;
    onRegisterClick: () => void;
};

const linkStyle: React.CSSProperties = { color: "rgba(250,249,245,0.55)", fontSize: 14 };
const linkClass = "hover:opacity-100 transition-opacity text-left";

export const LandingFooter = ({ onNavClick, onLoginClick, onRegisterClick }: Props) => (
    <footer className="lp-ink-band py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 md:gap-10 mb-12">
                <div className="col-span-2 md:col-span-2">
                    <ThemeLogo className="h-8 w-auto mb-4" variant="negative" />
                    <p className="text-sm leading-relaxed max-w-[260px]" style={{ color: "rgba(250,249,245,0.55)" }}>
                        Central Comercial com EVA para agências que vendem por conversa.
                    </p>
                    <p className="lp-mono mt-6 inline-flex items-center gap-2" style={{ color: "rgba(250,249,245,0.35)", textTransform: "none", letterSpacing: "0.03em" }}>
                        <span className="lp-live-dot" />
                        a EVA sugere · seu time aprova
                    </p>
                </div>

                <div>
                    <p className="lp-mono mb-4" style={{ color: "rgba(250,249,245,0.4)" }}>Produto</p>
                    <div className="flex flex-col gap-2.5">
                        <button onClick={() => onNavClick("features")} className={linkClass} style={linkStyle}>Funcionalidades</button>
                        <button onClick={() => onNavClick("how-it-works")} className={linkClass} style={linkStyle}>Como funciona</button>
                        <button onClick={() => onNavClick("pricing")} className={linkClass} style={linkStyle}>Preços</button>
                        <button onClick={() => onNavClick("faq")} className={linkClass} style={linkStyle}>FAQ</button>
                        <a href="/changelog" className={linkClass} style={linkStyle}>Changelog</a>
                    </div>
                </div>

                <div>
                    <p className="lp-mono mb-4" style={{ color: "rgba(250,249,245,0.4)" }}>Legal</p>
                    <div className="flex flex-col gap-2.5">
                        <a href="/politica-privacidade" className={linkClass} style={linkStyle}>Privacidade</a>
                        <a href="/termos-de-servico" className={linkClass} style={linkStyle}>Termos de Serviço</a>
                    </div>
                </div>

                <div>
                    <p className="lp-mono mb-4" style={{ color: "rgba(250,249,245,0.4)" }}>Conta</p>
                    <div className="flex flex-col gap-2.5">
                        <button onClick={onLoginClick} className={linkClass} style={linkStyle}>Login</button>
                        <button onClick={onRegisterClick} className={linkClass} style={linkStyle}>Criar conta</button>
                    </div>
                </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(250,249,245,0.14)" }}>
                <p className="text-sm" style={{ color: "rgba(250,249,245,0.4)" }}>
                    © {new Date().getFullYear()} Vyzon. Todos os direitos reservados.
                </p>
                <p className="lp-mono" style={{ color: "rgba(250,249,245,0.3)", textTransform: "none", letterSpacing: "0.03em" }}>
                    vyzon.com.br · feito no Brasil
                </p>
            </div>
        </div>
    </footer>
);
