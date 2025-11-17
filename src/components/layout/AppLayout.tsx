import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {showOnboarding && (
        <OnboardingTour
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}
    </SidebarProvider>
  );
};
