import brandLogoDark from "@/assets/logo-dark.png";

type Props = { plan: string | null };

export const NavigatingOverlay = ({ plan }: Props) => (
    <div
        className="fixed inset-0 z-[100] flex items-center justify-center landing-fade-in"
        style={{ background: "var(--vyz-bg)" }}
    >
        <div className="flex flex-col items-center gap-8 px-4">
            <img
                src={brandLogoDark}
                alt="Vyzon"
                width={320}
                height={60}
                className="h-10 w-auto landing-fade-in"
            />
            <div className="text-center landing-fade-in-up landing-delay-150">
                <p
                    className="font-heading text-lg mb-1"
                    style={{ color: "var(--vyz-text-primary)", fontWeight: 600, letterSpacing: "-0.02em" }}
                >
                    Preparando seu plano {plan?.charAt(0).toUpperCase()}{plan?.slice(1)}
                </p>
                <p className="text-sm" style={{ color: "var(--vyz-text-dim)" }}>
                    Isso leva apenas alguns segundos
                </p>
            </div>
            <div
                className="w-48 h-0.5 rounded-full overflow-hidden landing-fade-in landing-delay-300"
                style={{ background: "var(--vyz-border-strong)" }}
            >
                <div className="h-full rounded-full bg-emerald-500 loader-progress" style={{ width: "100%" }} />
            </div>
        </div>
    </div>
);
