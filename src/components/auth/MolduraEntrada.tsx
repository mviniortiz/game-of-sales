import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import "@/components/layout/entrada.css";

// Moldura das telas de entrada fora do login (recuperar e escolher senha): o
// mesmo painel azul da marca e o formulário claro do LoginV2, sem a cena. No
// celular o painel vira a faixa do topo, igual ao login.
export function MolduraEntrada({ kick, frase, destaque, children }: { kick: string; frase: string; destaque: string; children: ReactNode }) {
    const navigate = useNavigate();
    return (
        <div className="vz-auth-claro vz-login vz-login--senha">
            <section className="vz-login__painel">
                <button type="button" onClick={() => navigate("/")} className="vz-toque vz-login__logo self-start" aria-label="Vyzon, voltar ao site">
                    <ThemeLogo variant="inverse" className="h-[26px] w-auto" />
                </button>
                <div className="vz-login__painel-corpo">
                    <div>
                        <p className="vz-login__kick">{kick}</p>
                        <p className="vz-login__frase">
                            {frase}
                            <br />
                            <span>{destaque}</span>
                        </p>
                    </div>
                </div>
            </section>
            <section className="vz-login__form">
                <div className="vz-login__caixa">{children}</div>
            </section>
        </div>
    );
}

/** Ícone redondo no topo dos estados de fim (enviado, salvo, link vencido). */
export function SeloEntrada({ tom = "neutro", children }: { tom?: "neutro" | "bom" | "alerta"; children: ReactNode }) {
    return (
        <span className="vz-senha__selo" data-tom={tom} aria-hidden>
            {children}
        </span>
    );
}
