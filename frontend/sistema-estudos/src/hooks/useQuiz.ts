import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

// Tipagem para as perguntas do quiz (ajustar conforme a API real)
interface QuizQuestion {
  id?: string;
  type: 'mcq' | 'tf' | 'cloze';
  question: string;
  options?: string[];
  answer?: number | boolean | string; // number for mcq index OR boolean for tf OR string for cloze
  explanation?: string;
  difficulty?: string;
  format?: string;
}

// Tipagem para o estado das respostas selecionadas
interface SelectedAnswers {
  // Para MCQ: number (index da opção)
  // Para TF: boolean
  // Para Cloze: string
  [key: number]: number | boolean | string;
}

import { API_BASE_URL } from "../../config";

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
  console.log('generateQuiz called', { contentId });
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
      // Preferir endpoint do backend que retorna o quiz pronto (Gemini pipeline)
  const res = await fetch(`${API_BASE_URL}/me/weekly-quiz`, { credentials: 'include' });
      if (!res.ok) throw new Error("Erro ao buscar quiz da API");
      const data = await res.json();
      // backend returns { status, items: [...] } or similar
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.questions) ? data.questions : []);
      if (items.length > 0) {
        // Map to local QuizQuestion shape (keep original fields from backend)
  setQuizQuestions(items.map((it: any) => ({
          id: it.id,
          type: it.type || 'mcq',
          question: it.question || it.prompt || '',
          options: Array.isArray(it.options) ? it.options : undefined,
          answer: it.answer,
          explanation: it.explanation,
          difficulty: it.difficulty,
          format: it.format,
        })));
      } else {
        setQuizQuestions([]);
        toast.error("Nenhuma pergunta foi gerada para este conteúdo.");
      }
    } catch (err: any) {
      toast.error(`Erro ao gerar quiz: ${err?.message || "Tente novamente."}`);
      setQuizQuestions([]);
      setShowQuiz(false);
    } finally {
      setQuizLoading(false);
    }
  }, [contentId]);

  // Função para selecionar uma resposta
  const handleSelectAnswer = useCallback((questionIdx: number, optionIdx: number | boolean | string) => {
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

    // Calcula acertos considerando tipos
    const correctCount = quizQuestions.filter((q, idx) => {
      const sel = selectedAnswers[idx];
      if (q.type === 'mcq' && Array.isArray(q.options) && typeof sel === 'number') {
        return q.options[sel] === q.answer;
      }
      if (q.type === 'tf' && typeof sel === 'boolean') {
        return sel === q.answer;
      }
      if (q.type === 'cloze' && typeof sel === 'string' && typeof q.answer === 'string') {
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
        return norm(sel) === norm(q.answer as string);
      }
      return false;
    }).length;

    // Chama o callback com o resultado
    onQuizComplete?.(correctCount, quizQuestions.length);

    // Busca feedback da IA após mostrar resultados (movido para useEffect abaixo)
    setIsSubmitting(false);

  }, [quizQuestions, selectedAnswers, onQuizComplete, isSubmitting]);

  // Efeito para buscar feedback da IA após os resultados serem mostrados
  useEffect(() => {
    if (showResults && quizQuestions.length > 0 && contentHtml) {
      setQuizFeedback("Gerando feedback...");
      // Constrói o array de respostas no formato que o backend espera (strings/boolean coerentes)
      const answersForApi = quizQuestions.map((q, idx) => {
        const sel = selectedAnswers[idx];
        if (q.type === 'mcq' && Array.isArray(q.options) && typeof sel === 'number') {
          return q.options[sel] ?? null;
        }
        if (q.type === 'tf' && typeof sel === 'boolean') {
          return sel;
        }
        if (q.type === 'cloze' && typeof sel === 'string') {
          return sel;
        }
        return null;
      });
  fetch(`${API_BASE_URL}/quiz_feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: quizQuestions,
          answers: answersForApi,
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

  // Permite abrir modal sem re-gerar (quando já temos perguntas carregadas)
  const openQuiz = useCallback(() => {
    if (quizQuestions.length > 0) {
      setShowQuiz(true);
    }
  }, [quizQuestions.length]);

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
  openQuiz,
    handleSelectAnswer,
    handleSubmitQuiz,
    closeQuiz,
    nextQuestion, // Exportar se for usar navegação
    prevQuestion, // Exportar se for usar navegação
    setCurrentQuizIdx // Exportar se for usar navegação
  };
};

