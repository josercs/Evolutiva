import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

// Define o tipo ConteudoHtml (pode ser movido para um arquivo de tipos separado posteriormente)
type ConteudoHtml = {
  id: number; // <-- Adicione esta linha!
  titulo?: string;
  html?: string;
  concluido?: boolean;
  tarefasPendentes: number;
  tempoEstudo: string;
  progresso: any;
  subject: string;
  topic: string;
  content_html: string;
  materia: string;
  related_topics?: string[];
  difficulty?: "basic" | "intermediate" | "advanced";
  estimated_time?: number;
  subtopics?: any;
};

const API_BASE_URL = "http://localhost:5000"; // Considerar mover para .env

export const useContentLoader = () => {
  const { id } = useParams<{ id: string }>();
  const [conteudo, setConteudo] = useState<ConteudoHtml | null>(null);
  const [loading, setLoading] = useState(true);
  const [userNotes, setUserNotes] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    const fetchContentAndData = async () => {
      if (!id) {
        toast.error("ID do conteúdo não encontrado na URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Busca o conteúdo principal
        const response = await fetch(`http://192.168.0.109:5000/api/conteudo_html/${id}`);
        if (!response.ok) throw new Error("Conteúdo não encontrado");
        const data = await response.json();
        setConteudo(data);

        // Carrega notas salvas localmente
        const savedNotes = localStorage.getItem(`notes-${id}`);
        if (savedNotes) setUserNotes(savedNotes);

        // Carrega perguntas salvas
        const savedQuestions = localStorage.getItem(`questions-${id}`);
        if (savedQuestions) {
          try {
            setQuestions(JSON.parse(savedQuestions));
          } catch (parseError) {
            console.error("Erro ao parsear perguntas salvas:", parseError);
            localStorage.removeItem(`questions-${id}`); // Remove dados inválidos
            setQuestions([]);
          }
        } else {
          setQuestions([]);
        }

      } catch (error) {
        toast.error("Erro ao carregar o conteúdo ou dados locais.");
        console.error("Erro em useContentLoader:", error);
        setConteudo(null); // Reseta o conteúdo em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchContentAndData();

    // Cleanup não é estritamente necessário aqui, pois a busca ocorre uma vez por ID
    // Mas é bom ter em mente se a lógica mudar.

  }, [id]); // Dependência apenas no ID

  return { id, conteudo, loading, userNotes, setUserNotes, questions, setQuestions };
};

