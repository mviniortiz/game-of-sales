// Painel ao lado do cadastro e do login. No cadastro, mostra o caminho inteiro
// antes de a pessoa começar (o passo 1 é este, já em andamento) e um exemplo do
// placar que ela vai ver, marcado como exemplo. No login, a EVA esperando.
import { EvaBot } from "@/components/eva/EvaBot";
import { EncontroProgress } from "@/components/brand/EncontroProgress";

const PASSOS = [
    { titulo: "Criar a conta", texto: "Você está aqui. 14 dias grátis, sem cartão." },
    { titulo: "Contar para a EVA como vocês vendem", texto: "Ela lê seu site e pergunta só o que faltou." },
    { titulo: "Conectar o WhatsApp", texto: "Um QR Code, como no WhatsApp Web." },
    { titulo: "Ver suas propostas paradas", texto: "O valor parado e quem chamar primeiro." },
];

const EXEMPLO = [
    { nome: "Padaria Trigo Bom", valor: "R$ 61.200", situacao: "sem resposta há 8 dias" },
    { nome: "Carlos", valor: "R$ 23.900", situacao: "sem resposta há 5 dias" },
];

export function AuthPreview({ modo }: { modo: "cadastro" | "login" }) {
    if (modo === "login") {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-6 rounded-[28px] border border-[#E6EDF5] bg-white p-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_-32px_rgba(15,23,42,0.25)]">
                <EvaBot size={96} state="happy" />
                <div className="max-w-sm">
                    <p className="font-satoshi text-[26px] font-black leading-tight tracking-[-0.02em] text-[#0B1220]">Suas propostas continuam onde você deixou.</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-[#475569]">A EVA acompanha cada uma. O que sai para o cliente, você aprova.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col justify-center gap-8 rounded-[28px] border border-[#E6EDF5] bg-white p-10 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_-32px_rgba(15,23,42,0.25)] xl:p-14">
            <div className="flex items-center gap-4">
                <EncontroProgress step={0} total={4} size={52} />
                <p className="font-satoshi text-[26px] font-black leading-tight tracking-[-0.02em] text-[#0B1220] xl:text-[30px]">
                    Em 4 minutos você vê quanto está parado no seu WhatsApp.
                </p>
            </div>

            <ol className="flex flex-col gap-4">
                {PASSOS.map((p, i) => (
                    <li key={p.titulo} className="flex items-start gap-3.5">
                        <span
                            aria-hidden
                            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${i === 0 ? "bg-[#0B1220] text-white" : "border border-[#D7DEE9] text-[#64748B]"}`}
                        >
                            {i + 1}
                        </span>
                        <span>
                            <span className="block text-[15px] font-semibold text-[#0B1220]">{p.titulo}</span>
                            <span className="block text-[14px] text-[#64748B]">{p.texto}</span>
                        </span>
                    </li>
                ))}
            </ol>

            <div className="rounded-2xl border border-[#E6EDF5] bg-[#F8FAFC] p-5">
                <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B]">Parado no WhatsApp</p>
                    <span className="rounded-full bg-[#E6EDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">Exemplo</span>
                </div>
                <p className="mt-1 font-satoshi text-[34px] font-black leading-none tracking-[-0.03em] text-[#0B1220]">R$ 85.100</p>
                <ul className="mt-3 flex flex-col divide-y divide-[#EEF2F7]">
                    {EXEMPLO.map((e) => (
                        <li key={e.nome} className="flex items-center justify-between gap-3 py-2">
                            <span>
                                <span className="block text-[14px] font-semibold text-[#1F2A3B]">{e.nome}</span>
                                <span className="block text-[13px] text-[#64748B]">{e.situacao}</span>
                            </span>
                            <span className="text-[14px] font-semibold tabular-nums text-[#1F2A3B]">{e.valor}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <p className="text-[13px] text-[#64748B]">Nada sai para o seu cliente sem você aprovar.</p>
        </div>
    );
}
