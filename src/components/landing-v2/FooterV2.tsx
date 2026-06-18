import { Link } from "react-router-dom";
import { ThemeLogo } from "@/components/ui/ThemeLogo";

// LP.6 (v2) — rodapé: logo + frase + navegação + legal + aviso (disclaimer no
// estilo do Handhold, adaptado pro Vyzon). Borda fina, espaçamento generoso.
interface FooterV2Props {
    onNavClick: (id: string) => void;
    onLoginClick: () => void;
    onBlogClick?: () => void;
}

export const FooterV2 = ({ onNavClick, onLoginClick, onBlogClick }: FooterV2Props) => {
    return (
        <footer className="px-5 pb-12 pt-16" style={{ backgroundColor: "var(--lp-paper)", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            <div className="mx-auto flex max-w-[1080px] flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-sm">
                    <ThemeLogo className="h-6 w-auto" />
                    <p className="mt-4 text-[14px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.55 }}>
                        Central comercial com EVA para agências que vendem por conversa.
                    </p>
                </div>
                <div className="flex flex-wrap gap-x-14 gap-y-8">
                    <nav className="flex flex-col gap-3">
                        <span className="text-[12px] uppercase tracking-wider" style={{ color: "var(--lp-ink-40)", fontWeight: 600 }}>Vyzon</span>
                        <button className="vz-navlink text-left" onClick={() => onNavClick("how-it-works")}>Como funciona</button>
                        <button className="vz-navlink text-left" onClick={() => onNavClick("eva")}>EVA</button>
                        {onBlogClick && <button className="vz-navlink text-left" onClick={onBlogClick}>Blog</button>}
                        <button className="vz-navlink text-left" onClick={onLoginClick}>Entrar</button>
                    </nav>
                    <nav className="flex flex-col gap-3">
                        <span className="text-[12px] uppercase tracking-wider" style={{ color: "var(--lp-ink-40)", fontWeight: 600 }}>Legal</span>
                        <Link className="vz-navlink" to="/politica-privacidade">Política de Privacidade</Link>
                        <Link className="vz-navlink" to="/termos-de-servico">Termos de Serviço</Link>
                    </nav>
                </div>
            </div>

            {/* Aviso (disclaimer) — escopo da plataforma e responsabilidade */}
            <div className="mx-auto mt-12 max-w-[1080px] border-t pt-7" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                <div className="flex flex-col gap-3 sm:max-w-[680px]">
                    <p className="text-[12.5px]" style={{ color: "rgba(5,5,5,0.42)", lineHeight: 1.6 }}>
                        A Vyzon fornece tecnologia e agentes com IA (a EVA) para ajudar agências a engajar contatos, qualificar leads que chegam, organizar o atendimento e conduzir o time pelo processo comercial. A Vyzon é uma plataforma de software e não presta serviços de vendas, marketing, jurídicos ou de consultoria.
                    </p>
                    <p className="text-[12.5px]" style={{ color: "rgba(5,5,5,0.42)", lineHeight: 1.6 }}>
                        Quaisquer interações, informações ou sugestões geradas pelos agentes da Vyzon são baseadas na configuração e nos dados fornecidos pelo cliente, e as mensagens de saída passam por aprovação humana. A Vyzon não controla, verifica nem garante a exatidão, integridade ou adequação de qualquer informação apresentada por meio da plataforma. Ao usar este site ou a plataforma Vyzon, você reconhece que todo o conteúdo é fornecido para fins informativos e operacionais e concorda com nossos Termos de Serviço e Política de Privacidade.
                    </p>
                </div>
                <p className="mt-7 text-[13px]" style={{ color: "rgba(5,5,5,0.42)" }}>
                    © 2026 Vyzon. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
};
