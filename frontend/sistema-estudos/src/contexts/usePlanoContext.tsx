// usePlanoContext.tsx - Compartilhamento global do plano e progresso
import React, { createContext, useContext, useEffect, useState } from "react";

interface Bloco {
  subject: string;
  topic: string;
  activity_type: string;
  start_time: string;
  end_time: string;
  duration: number;
}

interface DiaPlano {
  date: string;
  blocks: Bloco[];
}

interface PlanoEstudo {
  days: DiaPlano[];
  weekly_goals: string[];
  coverage: Record<string, number>;
}

interface PlanoContextData {
  plano: PlanoEstudo | null;
  loading: boolean;
  erro: string | null;
  recarregarPlano: () => void;
}

const PlanoContext = createContext<PlanoContextData>({} as PlanoContextData);

export const PlanoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plano, setPlano] = useState<PlanoEstudo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/planos/me", { credentials: "include" });
      const data = await res.json();
      setPlano(data.plano_estudo);
      setErro(null);
    } catch (e) {
      setErro("Erro ao carregar plano de estudo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  return (
    <PlanoContext.Provider value={{ plano, loading, erro, recarregarPlano: carregar }}>
      {children}
    </PlanoContext.Provider>
  );
};

export const usePlano = () => useContext(PlanoContext);
