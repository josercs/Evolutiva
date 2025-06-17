import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

// Interface para o estado do Pomodoro
interface PomodoroState {
  time: number; // Tempo restante em segundos
  running: boolean; // Se o timer está rodando
  mode: "work" | "break"; // Modo atual (trabalho ou pausa)
}

// Props opcionais para o hook, como callbacks para efeitos externos
interface UsePomodoroProps {
  workDuration?: number; // Duração do período de trabalho em segundos (padrão: 25 min)
  breakDuration?: number; // Duração da pausa em segundos (padrão: 5 min)
  onWorkComplete?: () => void; // Callback quando um ciclo de trabalho termina
  onBreakComplete?: () => void; // Callback quando uma pausa termina
  playSound?: (isFocusDone: boolean) => void; // Função para tocar som
}

const DEFAULT_WORK_DURATION = 1500; // 25 minutos
const DEFAULT_BREAK_DURATION = 300; // 5 minutos

export const usePomodoro = ({
  workDuration = DEFAULT_WORK_DURATION,
  breakDuration = DEFAULT_BREAK_DURATION,
  onWorkComplete,
  onBreakComplete,
  playSound,
}: UsePomodoroProps = {}) => {
  const [pomodoro, setPomodoro] = useState<PomodoroState>({
    time: workDuration,
    running: false,
    mode: "work",
  });

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined = undefined;

    if (pomodoro.running && pomodoro.time > 0) {
      timer = setTimeout(() => {
        setPomodoro(p => ({ ...p, time: p.time - 1 }));
      }, 1000);
    } else if (pomodoro.running && pomodoro.time === 0) {
      const isWorkMode = pomodoro.mode === "work";
      const nextMode = isWorkMode ? "break" : "work";
      const nextTime = isWorkMode ? breakDuration : workDuration;

      setPomodoro({
        time: nextTime,
        running: false, // Pausa automaticamente ao fim do ciclo
        mode: nextMode,
      });

      toast.info(isWorkMode ? "Hora do descanso! 🧘‍♂️" : "Hora de voltar ao foco! 💪");

      // Toca o som, se a função foi fornecida
      playSound?.(isWorkMode);

      // Executa callbacks
      if (isWorkMode) {
        onWorkComplete?.();
      } else {
        onBreakComplete?.();
      }
    }

    // Limpa o timer ao desmontar ou quando as dependências mudam
    return () => clearTimeout(timer);

  }, [pomodoro.running, pomodoro.time, pomodoro.mode, workDuration, breakDuration, onWorkComplete, onBreakComplete, playSound]);

  const startTimer = useCallback(() => {
    setPomodoro(p => ({ ...p, running: true }));
  }, []);

  const pauseTimer = useCallback(() => {
    setPomodoro(p => ({ ...p, running: false }));
  }, []);

  const resetTimer = useCallback(() => {
    setPomodoro({
      time: workDuration,
      running: false,
      mode: "work",
    });
  }, [workDuration]);

  const toggleTimer = useCallback(() => {
    setPomodoro(p => ({ ...p, running: !p.running }));
  }, []);

  // Função para alternar manualmente para o modo de pausa
  const switchToBreak = useCallback(() => {
    setPomodoro({
        time: breakDuration,
        running: false,
        mode: "break",
    });
  }, [breakDuration]);

  // Função para alternar manualmente para o modo de trabalho
  const switchToWork = useCallback(() => {
    setPomodoro({
        time: workDuration,
        running: false,
        mode: "work",
    });
  }, [workDuration]);


  return {
    pomodoro,
    startTimer,
    pauseTimer,
    resetTimer,
    toggleTimer,
    switchToBreak,
    switchToWork,
  };
};

