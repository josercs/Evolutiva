import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "./useAuth";

type ConteudoHtml = {
  id: number;
  titulo: string;
  content_html: string;
  materia: string;
  topic: string;
  difficulty?: "basic" | "intermediate" | "advanced";
  estimated_time?: number;
  related_topics?: string[];
  subtopics?: any;
  is_completed?: boolean;
};

import { API_BASE_URL as BASE } from "../../config";
const API_BASE_URL = BASE; // '/api' por padrão via config.ts

export const useContentLoader = () => {
  const { id } = useParams<{ id: string }>();
  const [conteudo, setConteudo] = useState<ConteudoHtml | null>(null);
  const [loading, setLoading] = useState(true);
  const [userNotes, setUserNotes] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const { userId } = useAuth();

  const markAsCompleted = async () => {
    if (!id || !conteudo || !userId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/conteudos/concluir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          content_id: conteudo.id
        })
      });

      if (response.ok) {
        setConteudo(prev => prev ? { ...prev, is_completed: true } : null);
        toast.success("Conteúdo marcado como concluído!");
        return true;
      } else {
        throw new Error("Falha ao marcar como concluído");
      }
    } catch (error) {
      toast.error("Erro ao marcar conteúdo como concluído");
      console.error(error);
      return false;
    }
  };

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
        // Public endpoint: no credentials to simplify CORS
    const response = await fetch(`${API_BASE_URL}/conteudo_html/${id}`);
        if (!response.ok) throw new Error("Conteúdo não encontrado");
        let data: any;
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error('Resposta não-JSON recebida do backend em /api/conteudo_html:', text?.slice(0, 300));
            throw e;
          }
        }
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
            localStorage.removeItem(`questions-${id}`);
            setQuestions([]);
          }
        } else {
          setQuestions([]);
        }

      } catch (error) {
        toast.error("Erro ao carregar o conteúdo ou dados locais.");
        console.error("Erro em useContentLoader:", error);
        setConteudo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContentAndData();
  }, [id]);

  return { 
    id, 
    conteudo, 
    loading, 
    userNotes, 
    setUserNotes, 
    questions, 
    setQuestions,
    markAsCompleted
  };
};