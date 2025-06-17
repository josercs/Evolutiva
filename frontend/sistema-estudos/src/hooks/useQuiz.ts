import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

// Tipagem para as perguntas do quiz (ajustar conforme a API real)
interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; // A resposta correta
  // Outros campos que a API possa retornar
}

// Tipagem para o estado das respostas selecionadas
interface SelectedAnswers {
  [key: number]: number; // Mapeia índice da pergunta para índice da opção selecionada
}

const API_BASE_URL = "http://localhost:5000"; // Mover para .env

interface UseQuizProps {
  contentId: string | undefined; // ID do conteúdo para gerar/buscar o quiz
  contentHtml: string | undefined | null; // Conteúdo HTML para contexto do feedback
  onQuizComplete?: (correctCount: number, totalQuestions: number) => void; // Callback ao submeter
}

export const useQuiz = ({ contentId, contentHtml, onQuizComplete }: UseQuizProps) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [showResults, setShowResults] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<string>("");
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0); // Para navegação passo a passo, se necessário
  const [isSubmitting, setIsSubmitting] = useState(false); // Para evitar submissões múltiplas

  // Função para buscar/gerar o quiz
  const generateQuiz = useCallback(async () => {
    if (!contentId) {
      toast.error("ID do conteúdo não disponível para gerar o quiz.");
      return;
    }
    setShowQuiz(true);
    setShowResults(false);
    setSelectedAnswers({});
    setQuizFeedback("");
    setCurrentQuizIdx(0);
    setQuizLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate_quiz/${contentId}`);
      if (!res.ok) throw new Error("Erro ao buscar quiz da API");
      const data = await res.json();
      if (Array.isArray(data?.questions) && data.questions.length > 0) {
        setQuizQuestions(data.questions);
      } else {
        setQuizQuestions([]);
        toast.error("Nenhuma pergunta foi gerada para este conteúdo.");
      }
    } catch (err: any) {
      toast.error(`Erro ao gerar quiz: ${err.message || "Tente novamente."}`);
      setQuizQuestions([]);
      setShowQuiz(false);
    } finally {
      setQuizLoading(false);
    }
  }, [contentId]);

  // Função para selecionar uma resposta
  const handleSelectAnswer = useCallback((questionIdx: number, optionIdx: number) => {
    // Permite alterar a resposta antes de submeter
    if (!showResults) {
        setSelectedAnswers((prev) => ({
          ...prev,
          [questionIdx]: optionIdx,
        }));
    }
  }, [showResults]);

  // Função para submeter o quiz
  const handleSubmitQuiz = useCallback(() => {
    if (isSubmitting) return; // Evita clique duplo

    setIsSubmitting(true);
    setShowResults(true);

    // Calcula acertos
    const correctCount = quizQuestions.filter(
      (q, idx) =>
        q.options &&
        selectedAnswers[idx] !== undefined &&
        q.options[selectedAnswers[idx]] === q.answer
    ).length;

    // Chama o callback com o resultado
    onQuizComplete?.(correctCount, quizQuestions.length);

    // Busca feedback da IA após mostrar resultados (movido para useEffect abaixo)
    setIsSubmitting(false);

  }, [quizQuestions, selectedAnswers, onQuizComplete, isSubmitting]);

  // Efeito para buscar feedback da IA após os resultados serem mostrados
  useEffect(() => {
    if (showResults && quizQuestions.length > 0 && contentHtml) {
      setQuizFeedback("Gerando feedback..."); // Mostra estado de carregamento
      fetch(`${API_BASE_URL}/api/quiz_feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: quizQuestions,
          // Mapeia as respostas selecionadas para o formato esperado pela API
          answers: Object.entries(selectedAnswers).map(([qIdx, oIdx]) => {
              const questionIndex = Number(qIdx);
              if (quizQuestions[questionIndex] && quizQuestions[questionIndex].options) {
                  return quizQuestions[questionIndex].options[oIdx as number] ?? null; // Retorna null se a opção não existir
              }
              return null; // Retorna null se a pergunta não existir
          }).filter(answer => answer !== null), // Filtra respostas nulas
          conteudo: contentHtml,
        }),
      })
        .then(res => {
            if (!res.ok) throw new Error(`Erro ${res.status} ao buscar feedback.`);
            return res.json();
        })
        .then(data => setQuizFeedback(data.feedback || "Não foi possível gerar feedback."))
        .catch((err) => {
            console.error("Erro ao buscar feedback do quiz:", err);
            setQuizFeedback("Erro ao obter feedback da IA.");
        });
    }
  }, [showResults, quizQuestions, selectedAnswers, contentHtml]);

  // Função para fechar e resetar o estado do quiz
  const closeQuiz = useCallback(() => {
    setShowQuiz(false);
    setShowResults(false);
    setQuizQuestions([]);
    setSelectedAnswers({});
    setQuizFeedback("");
    setCurrentQuizIdx(0);
    setQuizLoading(false);
    setIsSubmitting(false);
  }, []);

  // Funções para navegação (opcional, se o quiz for passo a passo)
  const nextQuestion = () => {
    setCurrentQuizIdx(prev => Math.min(prev + 1, quizQuestions.length - 1));
  };
  const prevQuestion = () => {
    setCurrentQuizIdx(prev => Math.max(prev - 1, 0));
  };

  return {
    showQuiz,
    quizQuestions,
    quizLoading,
    selectedAnswers,
    showResults,
    quizFeedback,
    currentQuizIdx,
    isSubmitting,
    generateQuiz,
    handleSelectAnswer,
    handleSubmitQuiz,
    closeQuiz,
    nextQuestion, // Exportar se for usar navegação
    prevQuestion, // Exportar se for usar navegação
    setCurrentQuizIdx // Exportar se for usar navegação
  };
};

