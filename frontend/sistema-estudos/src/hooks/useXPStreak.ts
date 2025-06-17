import { useState, useEffect, useCallback } from "react";

// Função auxiliar para obter valor do localStorage com segurança
const getLocalStorageNumber = (key: string, defaultValue: number): number => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      const parsedValue = parseInt(storedValue, 10);
      return !isNaN(parsedValue) ? parsedValue : defaultValue;
    }
  } catch (error) {
    console.error(`Erro ao ler ${key} do localStorage:`, error);
  }
  return defaultValue;
};

// Função auxiliar para definir valor no localStorage com segurança
const setLocalStorageNumber = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.error(`Erro ao salvar ${key} no localStorage:`, error);
  }
};

// Props opcionais (nenhuma necessária por enquanto, mas pode ser útil no futuro)
interface UseXPStreakProps {}

export const useXPStreak = (props: UseXPStreakProps = {}) => {
  const [xp, setXp] = useState<number>(() => getLocalStorageNumber("xp", 0));
  const [streak, setStreak] = useState<number>(() => getLocalStorageNumber("streak", 0));

  // Efeito para persistir XP no localStorage sempre que ele mudar
  useEffect(() => {
    setLocalStorageNumber("xp", xp);
  }, [xp]);

  // Efeito para persistir Streak no localStorage sempre que ele mudar
  useEffect(() => {
    setLocalStorageNumber("streak", streak);
  }, [streak]);

  // Função para adicionar XP
  const addXp = useCallback((amount: number) => {
    if (amount > 0) {
      setXp((prevXp) => prevXp + amount);
      // Poderia adicionar um feedback visual aqui, se necessário
      // showXPFloat?.(`+${amount} XP!`); // Exemplo, se showXPFloat for passado como prop ou gerenciado externamente
    }
  }, []);

  // Função para incrementar o streak
  const incrementStreak = useCallback(() => {
    setStreak((prevStreak) => prevStreak + 1);
  }, []);

  // Função para resetar o streak
  const resetStreak = useCallback(() => {
    setStreak(0);
  }, []);

  return {
    xp,
    streak,
    addXp,
    incrementStreak,
    resetStreak,
    setXp, // Exporta setXp caso seja necessário definir diretamente (ex: ao completar Pomodoro)
    setStreak // Exporta setStreak caso seja necessário definir diretamente
  };
};

