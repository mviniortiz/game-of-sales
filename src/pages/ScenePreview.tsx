import { useState } from "react";
import { OnboardingScene } from "@/components/onboarding/OnboardingScene";

export default function ScenePreview() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 gap-6">
      <div className="w-full max-w-[900px]">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}
        >
          OnboardingScene — preview
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Troque o step pra ver a cena evoluindo.
        </p>

        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setStep(n)}
              className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
                step === n
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Step {n}
            </button>
          ))}
        </div>

        <div className="w-full aspect-[900/520] rounded-2xl border border-border overflow-hidden bg-background">
          <OnboardingScene currentStep={step} />
        </div>
      </div>
    </div>
  );
}
