import { CalendarBlank, ClipboardText, MapPin, SolarPanel, type Icon } from "@phosphor-icons/react";
import type { TipoEvento } from "@/lib/agenda";

const ICONE_TIPO: Record<TipoEvento, Icon> = {
    visita: MapPin,
    instalacao: SolarPanel,
    vistoria: ClipboardText,
    outro: CalendarBlank,
};

/** O quadradinho do tipo: visita no azul, instalação no sol, vistoria na noite. */
export function TipoTile({ tipo, pequeno = false }: { tipo: TipoEvento; pequeno?: boolean }) {
    const Icone = ICONE_TIPO[tipo];
    return (
        <span className="vp-agenda-tile" data-tipo={tipo} data-pequeno={pequeno || undefined} aria-hidden="true">
            <Icone size={pequeno ? 14 : 18} weight="fill" />
        </span>
    );
}
