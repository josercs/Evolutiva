import React from 'react';

export interface PomodoroTimerProps {
    pomodoro: {
        isBreak: boolean;
        time: number;
        running: boolean;
        mode: 'work' | 'break';
    };
    toggleTimer: () => void;
    resetTimer: () => void;
    switchToBreak: () => void;
    switchToWork: () => void;
    compact?: boolean;
}

// Função para formatar o tempo (segundos) em MM:SS
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
    pomodoro, toggleTimer, resetTimer, switchToBreak, switchToWork, compact
}) => {
    const { time, running, mode, isBreak } = pomodoro;
    return (
        <div className={`rounded text-center ${isBreak ? 'bg-green-50' : 'bg-blue-50'} border p-1`}>
            <div className="text-xs font-bold">{isBreak ? 'Pausa' : 'Foco'} {isBreak ? '☕' : '🍅'}</div>
            <div className="text-2xl font-mono font-bold">{formatTime(time)}</div>
            <div className="flex justify-center gap-1 mt-1">
                <button
                    onClick={toggleTimer}
                    className={`px-2 py-1 rounded text-xs font-semibold text-white ${running ? 'bg-yellow-500' : (isBreak ? 'bg-green-600' : 'bg-blue-600')}`}
                >
                    {running ? 'Pausar' : 'Iniciar'}
                </button>
                <button
                    onClick={resetTimer}
                    disabled={running}
                    className="px-2 py-1 rounded text-xs bg-gray-300 text-gray-700 disabled:opacity-50"
                >
                    ↺
                </button>
            </div>
            <div className="flex justify-center gap-1 mt-1">
                <button
                    onClick={switchToWork}
                    disabled={running || mode === 'work'}
                    className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 disabled:opacity-40"
                >Foco</button>
                <button
                    onClick={switchToBreak}
                    disabled={running || mode === 'break'}
                    className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-600 disabled:opacity-40"
                >Pausa</button>
            </div>
        </div>
    );
};

// Custom hook para gerenciar o estado do Pomodoro
export const usePomodoro = () => {
    const [time, setTime] = React.useState(1500); // 25 minutos
    const [running, setRunning] = React.useState(false);
    const [mode, setMode] = React.useState<'work' | 'break'>('work');

    // Alterna o estado do timer (iniciado/parado)
    const toggleTimer = () => {
        setRunning(prev => !prev);
    };

    // Reseta o timer para o estado inicial
    const resetTimer = () => {
        setRunning(false);
        setTime(1500);
        setMode('work');
    };

    // Inicia o período de trabalho
    const switchToWork = () => {
        setMode('work');
        setTime(1500);
    };

    // Inicia o período de descanso
    const switchToBreak = () => {
        setMode('break');
        setTime(300); // 5 minutos de pausa
    };

    // Efeito para gerenciar a contagem regressiva do timer
    React.useEffect(() => {
        let interval: NodeJS.Timeout;

        if (running) {
            interval = setInterval(() => {
                setTime(prev => {
                    if (prev <= 1) {
                        // Ao terminar o tempo, alterna para o outro modo
                        const newMode = mode === 'work' ? 'break' : 'work';
                        setMode(newMode);
                        return newMode === 'work' ? 1500 : 300; // Reseta o tempo para 25 min ou 5 min
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [running, mode]);

    return {
        pomodoro: {
            time,
            running,
            mode,
            isBreak: mode === 'break', // Add this line to ensure isBreak is present
        },
        toggleTimer,
        resetTimer,
        switchToBreak,
        switchToWork,
    };
};

