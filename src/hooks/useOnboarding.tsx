import { useState, useEffect } from "react";

const ONBOARDING_KEY = "onboarding_completed";

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário já completou o onboarding
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    
    if (!hasCompletedOnboarding) {
      // Pequeno delay para garantir que a UI carregou
      setTimeout(() => {
        setShowOnboarding(true);
        setIsLoading(false);
      }, 1000);
    } else {
      setIsLoading(false);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
};
