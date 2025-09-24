import { useState, useCallback } from "react";
import { toast } from "react-toastify";

import { API_BASE_URL } from "../../config";

interface UseFeynmanProps {
  contentHtml: string | undefined | null; // Conteúdo HTML para contexto
}

export const useFeynman = ({ contentHtml }: UseFeynmanProps) => {
  const [feynmanText, setFeynmanText] = useState<string>("");
  const [feynmanFeedback, setFeynmanFeedback] = useState<string>("");
  const [isFetchingFeedback, setIsFetchingFeedback] = useState<boolean>(false);

  // Função para solicitar feedback da IA
  const getFeynmanFeedback = useCallback(async () => {
    if (!feynmanText.trim()) {
      toast.info("Escreva sua explicação antes de pedir feedback.");
      return;
    }
    if (!contentHtml) {
        toast.warn("Contexto do conteúdo não disponível para gerar feedback.");
        // Poderia tentar sem o contexto, mas o feedback pode ser menos preciso
        // return;
    }

    setIsFetchingFeedback(true);
    setFeynmanFeedback("Carregando feedback da IA...");

    try {
  const res = await fetch(`${API_BASE_URL}/gemini_feynman`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: feynmanText, conteudo: contentHtml || "" }), // Envia string vazia se contexto for null/undefined
      });

      if (!res.ok) {
        // Tenta ler a mensagem de erro do corpo da resposta, se houver
        let errorMsg = `Erro ${res.status} ao buscar feedback.`;
        try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Ignora erro no parse do erro */ }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setFeynmanFeedback(data.feedback || "Feedback recebido, mas vazio.");
      toast.success("Feedback da IA recebido!");

    } catch (err: any) {
      console.error("Erro ao obter feedback Feynman:", err);
      setFeynmanFeedback(`Erro ao obter feedback: ${err.message || "Tente novamente."}`);
      toast.error(`Erro ao obter feedback: ${err.message || "Tente novamente."}`);
    } finally {
      setIsFetchingFeedback(false);
    }
  }, [feynmanText, contentHtml]);

  // Função para limpar o texto e o feedback
  const clearFeynman = useCallback(() => {
    setFeynmanText("");
    setFeynmanFeedback("");
    setIsFetchingFeedback(false);
  }, []);

  return {
    feynmanText,
    setFeynmanText, // Para binding com textarea
    feynmanFeedback,
    isFetchingFeedback,
    getFeynmanFeedback,
    clearFeynman,
  };
};

