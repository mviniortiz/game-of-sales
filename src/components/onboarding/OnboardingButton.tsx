import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";

export const OnboardingButton = () => {
  const { resetOnboarding } = useOnboarding();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={resetOnboarding}
      className="gap-2"
      title="Assistir tutorial novamente"
    >
      <HelpCircle className="h-4 w-4" />
      <span className="hidden md:inline">Tutorial</span>
    </Button>
  );
};
