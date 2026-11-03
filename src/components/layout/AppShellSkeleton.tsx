import "./entrada.css";
import { ThemeLogo } from "@/components/ui/ThemeLogo";

// A "mesa" do app sem dados: lateral escura do mesmo tamanho da AppSidebar e a
// tela de Orçamentos em blocos. O login fica por cima dela e o ProtectedRoute
// usa a mesma peça enquanto carrega, então entrar no app não troca de fundo
// nem pisca um loader de tela cheia: os blocos só dão lugar aos dados.
const NAV = [62, 78, 54, 70, 48];
const LINHAS = [0, 1, 2, 3, 4, 5];

export function AppShellSkeleton({ carregando = false, children }: { carregando?: boolean; children?: React.ReactNode }) {
    return (
        <div
            className={`vz-mesa ${carregando ? "vz-mesa--carregando" : ""}`}
            role={carregando ? "status" : undefined}
            aria-label={carregando ? "Carregando" : undefined}
        >
            <aside className="vz-mesa__lateral" aria-hidden>
                <div className="vz-mesa__logo">
                    <ThemeLogo variant="inverse" className="h-[22px] w-auto" />
                </div>
                <div className="vz-mesa__busca" />
                <div className="vz-mesa__nav">
                    {NAV.map((w, i) => (
                        <span key={i} className={`vz-mesa__item ${i === 1 ? "vz-mesa__item--ativo" : ""}`}>
                            <i />
                            <b style={{ width: `${w}%` }} />
                        </span>
                    ))}
                </div>
            </aside>

            <main className="vz-mesa__tela" aria-hidden={!carregando || undefined}>
                <div className="vz-mesa__topo">
                    <span className="vz-mesa__bloco" style={{ width: 260, height: 30 }} />
                    <span className="vz-mesa__bloco" style={{ width: 180, height: 12 }} />
                </div>
                <div className="vz-mesa__cartoes">
                    {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="vz-mesa__cartao">
                            <span className="vz-mesa__bloco" style={{ width: "55%", height: 10 }} />
                            <span className="vz-mesa__bloco" style={{ width: 22, height: 16 }} />
                        </span>
                    ))}
                </div>
                <div className="vz-mesa__lista">
                    {LINHAS.map((i) => (
                        <span key={i} className="vz-mesa__linha">
                            <span className="vz-mesa__bloco" style={{ width: `${30 - (i % 3) * 5}%`, height: 11 }} />
                            <span className="vz-mesa__bloco" style={{ width: 92, height: 18, borderRadius: 999 }} />
                            <span className="vz-mesa__bloco vz-mesa__bloco--fim" style={{ width: 64, height: 11 }} />
                        </span>
                    ))}
                </div>
            </main>

            {children}
        </div>
    );
}
