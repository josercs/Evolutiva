import React from "react";

export function PomodoroWidget({ pomodoro, setPomodoro }: { pomodoro: any, setPomodoro: any }) {
  return (
    <div className="fixed bottom-6 left-6 z-50 bg-white rounded-xl shadow-xl p-4 flex flex-col items-center border-2 border-indigo-100">
      <span className="font-bold text-lg">{pomodoro.mode === "work" ? "Foco" : "Descanso"}</span>
      <span className="text-2xl font-mono animate-pulse">
        {String(Math.floor(pomodoro.time / 60)).padStart(2, "0")}:
        {String(pomodoro.time % 60).padStart(2, "0")}
      </span>
      <button
        onClick={() => setPomodoro((p: any) => ({ ...p, running: !p.running }))}
        className="mt-2 px-3 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-sm font-semibold transition-all duration-200"
      >
        {pomodoro.running ? "Pausar" : "Iniciar"}
      </button>
    </div>
  );
}