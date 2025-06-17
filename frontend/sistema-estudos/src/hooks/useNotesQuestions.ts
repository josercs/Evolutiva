import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

// Função auxiliar para obter string do localStorage com segurança
const getLocalStorageString = (key: string, defaultValue: string): string => {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue !== null ? storedValue : defaultValue;
  } catch (error) {
    console.error(`Erro ao ler ${key} do localStorage:`, error);
    return defaultValue;
  }
};

// Função auxiliar para obter array do localStorage com segurança
const getLocalStorageArray = <T,>(key: string, defaultValue: T[]): T[] => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      const parsedValue = JSON.parse(storedValue);
      return Array.isArray(parsedValue) ? parsedValue : defaultValue;
    }
  } catch (error) {
    console.error(`Erro ao ler/parsear ${key} do localStorage:`, error);
    // Opcional: remover item inválido
    // localStorage.removeItem(key);
  }
  return defaultValue;
};

// Função auxiliar para salvar no localStorage com segurança
const setLocalStorage = (key: string, value: any) => {
  try {
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, valueToStore);
  } catch (error) {
    console.error(`Erro ao salvar ${key} no localStorage:`, error);
    toast.error(`Não foi possível salvar ${key === 'notes' ? 'suas notas' : 'suas perguntas'}. O armazenamento local pode estar cheio.`);
  }
};

interface UseNotesQuestionsProps {
  contentId: string | undefined; // ID do conteúdo para chave do localStorage
  initialNotes?: string; // Notas iniciais (se carregadas de outra forma)
  initialQuestions?: string[]; // Perguntas iniciais
}

export const useNotesQuestions = ({ contentId, initialNotes = "", initialQuestions = [] }: UseNotesQuestionsProps) => {
  const notesKey = contentId ? `notes-${contentId}` : null;
  const questionsKey = contentId ? `questions-${contentId}` : null;

  // Estado para as notas do usuário
  const [userNotes, setUserNotes] = useState<string>(() =>
    notesKey ? getLocalStorageString(notesKey, initialNotes) : initialNotes
  );

  // Estado para as perguntas do usuário
  const [questions, setQuestions] = useState<string[]>(() =>
    questionsKey ? getLocalStorageArray<string>(questionsKey, initialQuestions) : initialQuestions
  );

  // Estado para a pergunta sendo digitada
  const [currentQuestion, setCurrentQuestion] = useState<string>("");

  // Efeito para carregar dados quando o contentId mudar (se não foi carregado inicialmente)
  // Isso é mais relevante se o hook for usado em um contexto onde o ID pode mudar dinamicamente
  // sem recarregar o componente principal.
  useEffect(() => {
    if (notesKey) {
      setUserNotes(getLocalStorageString(notesKey, initialNotes));
    }
    if (questionsKey) {
      setQuestions(getLocalStorageArray<string>(questionsKey, initialQuestions));
    }
    setCurrentQuestion("");
    // Remova initialNotes e initialQuestions das dependências!
  }, [contentId, notesKey, questionsKey]);

  // Efeito para salvar notas automaticamente com debounce (evita salvar a cada tecla)
  useEffect(() => {
    if (!notesKey) return;

    const handler = setTimeout(() => {
      if (userNotes !== getLocalStorageString(notesKey, '')) { // Salva apenas se mudou
        setLocalStorage(notesKey, userNotes);
        // console.log('Notas salvas automaticamente'); // Para debug
      }
    }, 800); // Atraso de 800ms

    return () => {
      clearTimeout(handler);
    };
  }, [userNotes, notesKey]);

  // Função para salvar notas manualmente (pode ser usada em um botão "Salvar")
  const saveNotes = useCallback(() => {
    if (notesKey) {
      setLocalStorage(notesKey, userNotes);
      toast.success("Nota salva com sucesso!");
    }
  }, [userNotes, notesKey]);

  // Função para adicionar uma nova pergunta
  const addQuestion = useCallback(() => {
    if (currentQuestion.trim() && questionsKey) {
      const newQuestions = [...questions, currentQuestion.trim()];
      setQuestions(newQuestions);
      setLocalStorage(questionsKey, newQuestions);
      setCurrentQuestion(""); // Limpa o input
      toast.success("Pergunta adicionada!");
    } else if (!currentQuestion.trim()) {
        toast.info("Digite sua pergunta antes de adicionar.");
    } else {
        toast.error("Não foi possível salvar a pergunta (ID do conteúdo ausente).");
    }
  }, [currentQuestion, questions, questionsKey]);

  // Função para remover uma pergunta
  const removeQuestion = useCallback((indexToRemove: number) => {
    if (questionsKey) {
      const newQuestions = questions.filter((_, index) => index !== indexToRemove);
      setQuestions(newQuestions);
      setLocalStorage(questionsKey, newQuestions);
      toast.info("Pergunta removida.");
    } else {
        toast.error("Não foi possível remover a pergunta (ID do conteúdo ausente).");
    }
  }, [questions, questionsKey]);

  return {
    userNotes,
    setUserNotes, // Para binding direto com textarea
    saveNotes, // Para botão de salvar explícito
    questions,
    currentQuestion,
    setCurrentQuestion, // Para binding com input
    addQuestion,
    removeQuestion,
  };
};

