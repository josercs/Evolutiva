// src/types/quizTypes.ts
export interface QuizOption {
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  answer: string; // Campo obrigatório para o QuizModalWrapper
  explanation?: string;
}

export interface QuizAnswer {
  questionIdx: number;
  optionIdx: number;
  isCorrect: boolean;
}

export interface QuizFeedback {
  general: string;
  questionSpecific: Record<string, string>;
}

export interface QuizState {
  showQuiz: boolean;
  quizQuestions: QuizQuestion[];
  isLoading: boolean;
  selectedAnswers: Record<number, number>; // Mapeia índice da pergunta para índice da resposta
  showResults: boolean;
  feedback: QuizFeedback;
  currentQuestionIndex: number; // Nome consistente corrigido
  isSubmitting: boolean;
}