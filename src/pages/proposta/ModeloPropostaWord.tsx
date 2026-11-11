// /modelo-proposta-energia-solar-word: download dos modelos .docx (os mesmos
// arquivos de public/modelos, gerados por scripts/gen-modelos-proposta.mjs) com
// o passo a passo de como preencher.
import { Download } from "lucide-react";
import { PropostaShell } from "@/components/proposta/PropostaShell";
import { eventoProposta } from "@/lib/proposta/evento";
import { getPropostaLanding } from "@/data/landing/propostaLandings";

const SLUG = "modelo-proposta-energia-solar-word";

export default function ModeloPropostaWord() {
    const landing = getPropostaLanding(SLUG);
    const [principal, ...outros] = landing.arquivos ?? [];
    return (
        <PropostaShell slug={SLUG}>
            <div className="vpr-baixa">
                <div className="vpr-baixa__caixa">
                    <p className="vpr-baixa__titulo">Proposta completa residencial, em Word</p>
                    <p className="vpr-baixa__texto">
                        Nove partes na ordem em que o cliente lê, com os campos a preencher em amarelo. Abre no Word e no Google Docs.
                    </p>
                    <div className="vpr-baixa__botoes">
                        {principal && (
                            <a href={principal.href} download className="vs-btn" onClick={() => eventoProposta(SLUG, "download", { arquivo: principal.label })}>
                                <Download aria-hidden="true" />
                                {principal.label}
                            </a>
                        )}
                    </div>
                    {outros.length > 0 && (
                        <>
                            <p className="vpr-baixa__linha">Outros modelos em Word:</p>
                            <div className="vb-baixar__lista">
                                {outros.map((a) => (
                                    <a key={a.href} href={a.href} download className="vb-file" onClick={() => eventoProposta(SLUG, "download", { arquivo: a.label })}>
                                        <Download aria-hidden="true" />
                                        {a.label}
                                    </a>
                                ))}
                            </div>
                        </>
                    )}
                    <p className="vpr-baixa__linha">Grátis e sem cadastro.</p>
                </div>

                {landing.previa && (
                    <div className="vpr-previa">
                        <img src={landing.previa.src} alt={landing.previa.alt} width={900} height={1273} decoding="async" />
                    </div>
                )}
            </div>
        </PropostaShell>
    );
}
