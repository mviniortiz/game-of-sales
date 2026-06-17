import rdstationLogo from "@/assets/integrations/rdstation.svg";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import zapierLogo from "@/assets/integrations/zapier.svg";
import asaasLogo from "@/assets/integrations/asaas.svg";

// LP.6 (v2) — faixa de integrações REAIS (logos de @/assets/integrations). No
// lugar dos "logos de clientes" da handhold (que não podemos inventar): prova
// de ecossistema verdadeira. Altura ÓPTICA individual por logo (cada asset tem
// proporção/padding próprio) pra todos terem o mesmo peso visual na faixa.
const LOGOS = [
    { src: rdstationLogo, alt: "RD Station", h: 24 },
    { src: mercadopagoLogo, alt: "Mercado Pago", h: 40 },
    { src: hotmartLogo, alt: "Hotmart", h: 34 },
    { src: kiwifyLogo, alt: "Kiwify", h: 32 },
    { src: asaasLogo, alt: "Asaas", h: 18 },
    { src: zapierLogo, alt: "Zapier", h: 25 },
];

export const IntegrationsStripV2 = () => {
    return (
        <section className="px-5 py-16 sm:py-20" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="mx-auto max-w-5xl">
                <p className="lp-mono text-center" style={{ color: "var(--lp-ink-40)" }}>
                    Conecta com as ferramentas que sua agência já usa
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
                    {LOGOS.map((logo) => (
                        <img
                            key={logo.alt}
                            src={logo.src}
                            alt={logo.alt}
                            loading="lazy"
                            className="vz-logo w-auto object-contain"
                            style={{ height: logo.h }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
