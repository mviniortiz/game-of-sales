import { ThemeLogo } from "@/components/ui/ThemeLogo";

type Props = {
    onNavClick: (id: string) => void;
    onLoginClick: () => void;
    onRegisterClick: () => void;
};

export const LandingFooter = ({ onNavClick, onLoginClick, onRegisterClick }: Props) => (
    <footer className="py-16 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)", boxShadow: "inset 0 1px 0 var(--vyz-border-subtle)" }}>
        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 md:gap-10 mb-12">
                <div className="col-span-2 md:col-span-1">
                    <ThemeLogo className="h-8 w-auto mb-4" />
                    <p className="text-gray-500 text-sm leading-relaxed max-w-[220px]">
                        CRM gamificado para times de vendas que querem bater meta todo mês.
                    </p>
                </div>

                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-4" style={{ fontWeight: 600 }}>Produto</p>
                    <div className="flex flex-col gap-2.5">
                        <button onClick={() => onNavClick("features")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Funcionalidades</button>
                        <button onClick={() => onNavClick("how-it-works")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Como funciona</button>
                        <button onClick={() => onNavClick("pricing")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Preços</button>
                        <button onClick={() => onNavClick("faq")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">FAQ</button>
                        <a href="/changelog" className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Changelog</a>
                    </div>
                </div>

                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-4" style={{ fontWeight: 600 }}>Alternativas</p>
                    <div className="flex flex-col gap-2.5">
                        <a href="/alternativas" className="text-gray-500 text-sm hover:text-gray-300 transition-colors" style={{ color: "#00E37A99" }}>Ver todos comparativos</a>
                        <a href="/alternativa-hubspot" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Vyzon vs HubSpot</a>
                        <a href="/alternativa-ploomes" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Vyzon vs Ploomes</a>
                        <a href="/alternativa-rd-station" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Vyzon vs RD Station</a>
                        <a href="/alternativa-kommo" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Vyzon vs Kommo</a>
                        <a href="/alternativa-pipedrive" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Vyzon vs Pipedrive</a>
                        <a href="/alternativa-agendor" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Vyzon vs Agendor</a>
                    </div>
                </div>

                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-4" style={{ fontWeight: 600 }}>Legal</p>
                    <div className="flex flex-col gap-2.5">
                        <a href="/politica-privacidade" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Privacidade</a>
                        <a href="/termos-de-servico" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Termos de Serviço</a>
                    </div>
                </div>

                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-4" style={{ fontWeight: 600 }}>Conta</p>
                    <div className="flex flex-col gap-2.5">
                        <button onClick={onLoginClick} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Login</button>
                        <button onClick={onRegisterClick} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Criar conta</button>
                    </div>
                </div>
            </div>

            <div className="pt-8" style={{ borderTop: "1px solid var(--vyz-border)" }}>
                <p className="text-center text-sm text-gray-600">
                    © {new Date().getFullYear()} Vyzon. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </footer>
);
