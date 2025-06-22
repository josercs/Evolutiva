import { useState, useEffect } from "react";

export function useProgressByMateria(userId: string, courseId: string) {
  const [progresso, setProgresso] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/progress/materias/${userId}/${courseId}`)
      .then(res => res.json())
      .then(data => {
        setProgresso(data.progresso || []);
        setErro(null);
      })
      .catch(() => setErro("Erro ao buscar progresso"))
      .finally(() => setLoading(false));
  }, [userId, courseId]);

  return { progresso, loading, erro };
}