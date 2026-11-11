// /planilha-proposta-energia-solar: download da planilha .xlsx que calcula
// economia, parcela e payback. O arquivo e os números do exemplo saem de
// scripts/gen-planilha-proposta.mjs.
import { Download } from "lucide-react";
import { PropostaShell } from "@/components/proposta/PropostaShell";
import { eventoProposta } from "@/lib/proposta/evento";
import { getPropostaLanding } from "@/data/landing/propostaLandings";
import exemplo from "@/data/landing/planilhaExemplo.json";

const SLUG = "planilha-proposta-energia-solar";

export default function PlanilhaProposta() {
    const landing = getPropostaLanding(SLUG);
    return (
        <PropostaShell slug={SLUG}>
            <div className="vpr-baixa">
                <div className="vpr-baixa__caixa">
                    <p className="vpr-baixa__titulo">Planilha em Excel, com 3 abas</p>
                    <p className="vpr-baixa__texto">
                        A aba Cálculo tem os campos em amarelo para você trocar, a Ano a ano mostra a economia acumulada em 25 anos e a Resumo traz os números prontos para a proposta.
                    </p>
                    <div className="vpr-baixa__botoes">
                        {landing.arquivos?.map((a) => (
                            <a key={a.href} href={a.href} download className="vs-btn" onClick={() => eventoProposta(SLUG, "download", { arquivo: a.label })}>
                                <Download aria-hidden="true" />
                                {a.label}
                            </a>
                        ))}
                    </div>
                    <p className="vpr-baixa__linha">Grátis e sem cadastro.</p>
                </div>

                <div className="vpr-grade">
                    <table>
                        <caption>{exemplo.legenda}</caption>
                        <tbody>
                            {exemplo.linhas.map(([rotulo, valor]) => (
                                <tr key={rotulo}>
                                    <th scope="row">{rotulo}</th>
                                    <td>{valor}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PropostaShell>
    );
}
