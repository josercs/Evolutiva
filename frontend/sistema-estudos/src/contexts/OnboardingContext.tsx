import React, { createContext, useContext, useState } from "react";

type OnboardingAnswers = {
  objetivo?: string;
  disponibilidade?: string;
  preferencia?: string;
  quiz?: { acertos: number; respostas: number[] };
};

interface OnboardingContextType {
  answers: OnboardingAnswers;
  setAnswers: (a: Partial<OnboardingAnswers>) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [answers, setAnswersState] = useState<OnboardingAnswers>({});

  const setAnswers = (a: Partial<OnboardingAnswers>) =>
    setAnswersState((prev) => ({ ...prev, ...a }));

  const reset = () => setAnswersState({});

  return (
    <OnboardingContext.Provider value={{ answers, setAnswers, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding precisa estar dentro do OnboardingProvider");
  return ctx;
}