// O dono vive no celular: as abas do dia ficam embaixo, ao alcance do polegar.
// O resto do menu abre pelo botão do topo.
import { Link, useLocation } from "react-router-dom";
import { ChatCircleText, HardHat, Receipt, SunHorizon, type Icon } from "@phosphor-icons/react";
import { useContagensMenu } from "@/hooks/useContagensMenu";
import "./lateral.css";

type Aba = { nome: string; url: string; Icone: Icon; conta: "hoje" | "orcamentos" | "conversas" | "obras" };

const ABAS: Aba[] = [
    { nome: "Hoje", url: "/inicio", Icone: SunHorizon, conta: "hoje" },
    { nome: "Orçamentos", url: "/orcamentos", Icone: Receipt, conta: "orcamentos" },
    { nome: "Conversas", url: "/inbox", Icone: ChatCircleText, conta: "conversas" },
    { nome: "Obras", url: "/obras", Icone: HardHat, conta: "obras" },
];

export function AbasCelular() {
    const { pathname } = useLocation();
    const contagens = useContagensMenu();

    return (
        <nav className="vz-abas" aria-label="Abas principais">
            {ABAS.map(({ nome, url, Icone, conta }) => {
                const ativa = pathname === url || pathname.startsWith(`${url}/`);
                const numero = contagens[conta];
                return (
                    <Link key={url} to={url} data-ativo={ativa || undefined} aria-current={ativa ? "page" : undefined}>
                        <Icone size={22} weight={ativa ? "fill" : "regular"} aria-hidden />
                        {nome}
                        {numero > 0 && <span className="vz-abas__conta">{numero > 99 ? "99+" : numero}</span>}
                    </Link>
                );
            })}
        </nav>
    );
}
