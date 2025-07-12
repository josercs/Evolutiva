import React, { createContext, useContext, useState } from "react";

type PlanoType = any; // Substitua pelo tipo real do seu plano se desejar

interface PlanoContextProps {
  plano: PlanoType | null;
  setPlano: (plano: PlanoType) => void;
  atualizarPlano: (email: string) => Promise<void>;
}

const PlanoContext = createContext<PlanoContextProps>({
  plano: null,
  setPlano: () => {},
  atualizarPlano: async () => {},
});

export const PlanoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plano, setPlano] = useState<PlanoType | null>(null);

  // Função para buscar o plano do backend
  const atualizarPlano = async (email: string) => {
    const res = await fetch(`/api/planos/me?email=${email}`, { credentials: "include" });
    const data = await res.json();
    let plano = data.plano_estudo;
    if (typeof plano === "string") {
      plano = JSON.parse(plano);
    }
    console.log("Plano recebido do backend:", plano); // <-- Adicione esta linha
    setPlano(plano);
  };

  return (
    <PlanoContext.Provider value={{ plano, setPlano, atualizarPlano }}>
      {children}
    </PlanoContext.Provider>
  );
};

export const usePlano = () => useContext(PlanoContext);