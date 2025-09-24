import React, { useEffect, useState } from "react";

type QuizModalProps = {
  show: boolean;
  loading: boolean;
  questions: any[];
  currentIdx: number;
  selectedAnswers: { [key: number]: number | boolean | string };
  onSelect: (qIdx: number, oIdx: number | boolean | string) => void;
  onNext: () => void;
  onSubmit: () => void;
  showResults: boolean;
  feedback: string; // feedback da IA (resumo e sugestões)
  onClose: () => void;
};

export function ModalQuiz({
  show,
  loading,
  questions,
  currentIdx,
  selectedAnswers,
  onSelect,
  onNext,
  onSubmit,
  showResults,
  feedback,
  onClose,
}: QuizModalProps) {
  const [progress, setProgress] = useState(0);
  const [iaFeedback, setIaFeedback] = useState<string>("");

  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 100));
      }, 300);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [loading]);

  // Recebe feedback do hook via prop
  useEffect(() => {
    setIaFeedback(feedback || "");
  }, [feedback]);

  if (!show) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-cyan-100 to-emerald-100 bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-blue-300 flex flex-col items-center animate-fade-in">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center shadow-inner">
              <span className="text-4xl">📚</span>
            </div>
            <div className="rainbow-ring-turbo"></div>
          </div>
          <h3 className="text-xl font-bold text-blue-800 mb-2">
            {progress < 50 ? "Preparando seu desafio..." : "Quase lá!"}
          </h3>
          <p className="text-blue-600 mb-2">
            {progress < 30
              ? "Selecionando as melhores questões..."
              : progress < 70
              ? "Organizando seu aprendizado..."
              : "Finalizando os detalhes..."}
          </p>
          <div className="w-full bg-blue-100 rounded-full h-2.5 mt-4 mb-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-400 via-cyan-500 to-emerald-500 h-2.5 rounded-full animate-pulse w-1/2" />
          </div>
          <p className="text-xs text-blue-400 font-medium mb-4">Preparando…</p>
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-blue-300 animate-bounce"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-cyan-100 to-emerald-100 bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl border-4 border-blue-300 relative animate-fade-in flex flex-col items-center justify-center">
          <span className="text-xl text-gray-500">
            Nenhuma pergunta disponível para este quiz.
          </span>
          <button
            onClick={onClose}
    className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow hover:bg-blue-700 transition-all duration-200"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  const correctCount = questions.filter((q, idx) => {
    const sel = selectedAnswers[idx];
    if (q.type === 'mcq' && Array.isArray(q.options) && typeof sel === 'number') {
      return q.options[sel] === q.answer;
    }
    if (q.type === 'tf' && typeof sel === 'boolean') {
      return sel === q.answer;
    }
    if (q.type === 'cloze' && typeof sel === 'string' && typeof q.answer === 'string') {
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
      return norm(sel) === norm(q.answer as string);
    }
    return false;
  }).length;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-cyan-100 to-emerald-100 bg-opacity-90 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-3xl p-6 md:p-10 max-w-3xl w-full shadow-2xl overflow-y-auto border-4 border-blue-300 relative animate-fade-in min-h-[60vh] max-h-[92vh]"
        id="quiz-container"
      >
        <button
          className="absolute top-4 right-6 text-3xl text-gray-400 hover:text-blue-600 font-bold transition-turbo"
          onClick={onClose}
          aria-label="Fechar quiz"
        >
          ×
        </button>
        {showResults ? (
          <div className="mt-8 text-center">
            <p className="text-2xl md:text-3xl font-extrabold text-blue-700 flex items-center justify-center gap-2 animate-fade-in">
              🎉 Resultado:{" "}
              <span className="text-green-500">{correctCount}</span> de{" "}
              <span className="text-blue-500">{questions.length}</span> acertos
            </p>
            <div className="mt-6 text-base text-gray-700 whitespace-pre-line text-left bg-blue-50 border border-blue-200 rounded-2xl p-4 mx-auto max-w-2xl shadow-inner">
              <strong className="block text-blue-800 mb-2 text-lg">
                Resumo da IA:
              </strong>
              {iaFeedback ? (
                <span>{iaFeedback}</span>
              ) : (
                <span className="text-gray-400">
                  Aguardando feedback da IA...
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-8 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 hover-grow"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Barra de progresso */}
            <div className="mb-6 flex items-center gap-2">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                {(() => {
                  const pct = questions.length ? ((currentIdx + 1) / questions.length) * 100 : 0;
                  const step = Math.max(0, Math.min(20, Math.round(pct / 5)));
                  const widths = [
                    "w-0",
                    "w-[5%]",
                    "w-[10%]",
                    "w-[15%]",
                    "w-[20%]",
                    "w-[25%]",
                    "w-[30%]",
                    "w-[35%]",
                    "w-[40%]",
                    "w-[45%]",
                    "w-[50%]",
                    "w-[55%]",
                    "w-[60%]",
                    "w-[65%]",
                    "w-[70%]",
                    "w-[75%]",
                    "w-[80%]",
                    "w-[85%]",
                    "w-[90%]",
                    "w-[95%]",
                    "w-[100%]",
                  ];
                  return (
                    <div className={[
                      "h-3 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all duration-500",
                      widths[step]
                    ].join(" ")} />
                  );
                })()}
              </div>
              <span className="text-xs text-gray-500 ml-2 font-semibold">
                {questions.length ? `${currentIdx + 1}/${questions.length}` : "0/0"}
              </span>
            </div>
            {/* Dica rápida */}
            <div className="mb-3 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-xl p-2">
              Dica: {(() => {
                const q = currentQuestion;
                if (!q) return "Leia a pergunta com atenção.";
                if (q.type === "mcq") return "Tente eliminar uma alternativa claramente genérica (ex.: 'Nenhuma das anteriores').";
                if (q.type === "cloze") return "Se for termo técnico, pense na inicial e no contexto da frase.";
                return "Observe números e palavras como 'sempre', 'nunca', 'aumenta', 'diminui'.";
              })()}
            </div>
            {/* Pergunta atual */}
            <div>
              <div className="font-semibold text-lg md:text-xl mb-4 text-gray-800 flex items-center gap-3">
                <span className="bg-blue-200 text-blue-800 px-4 py-1 rounded-full text-base font-bold shadow">
                  {currentIdx + 1}
                </span>
                <span className="flex-1" dangerouslySetInnerHTML={{ __html: currentQuestion?.question }} />
                {currentQuestion?.difficulty && (
                  <span className={[
                    "text-xxs px-2 py-0.5 rounded-full border",
                    currentQuestion.difficulty === "hard" ? "bg-rose-50 border-rose-200 text-rose-700" :
                    currentQuestion.difficulty === "medium" ? "bg-amber-50 border-amber-200 text-amber-700" :
                    "bg-emerald-50 border-emerald-200 text-emerald-700"
                  ].join(" ")}>{currentQuestion.difficulty}</span>
                )}
                {currentQuestion && (currentQuestion as any).format === "assertion_reason" && (
                  <span className="text-xxs px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-700">Asserção–Razão</span>
                )}
                {currentQuestion && (currentQuestion as any).format === "ordering" && (
                  <span className="text-xxs px-2 py-0.5 rounded-full border bg-cyan-50 border-cyan-200 text-cyan-700">Ordem</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion?.options?.map((opt: string, j: number) => {
                  const isSelected = selectedAnswers[currentIdx] === j;
                  const isCorrect = opt === currentQuestion.answer;
                  const showIcon = selectedAnswers[currentIdx] !== undefined;

                  return (
                    <button
                      key={j}
                      className={`w-full text-left px-5 py-4 rounded-2xl font-semibold text-base shadow-md transition transform hover-grow
                        ${isSelected ? "ring-2 ring-blue-400 scale-105" : ""}
                        ${showIcon && isCorrect ? "bg-green-100 text-green-800" : ""}
                        ${showIcon && isSelected && !isCorrect ? "bg-red-100 text-red-800" : "bg-gray-100 hover:bg-blue-100"}
                      `}
                      onClick={() => onSelect(currentIdx, j)}
                      id={`quiz-btn-${currentIdx}-${j}`}
                      disabled={selectedAnswers[currentIdx] !== undefined}
                    >
                      <span className={(currentQuestion as any)?.format === "ordering" ? "font-mono" : undefined} dangerouslySetInnerHTML={{ __html: opt }} />
                      {showIcon && isCorrect && <span className="ml-2">✔️</span>}
                      {showIcon && isSelected && !isCorrect && <span className="ml-2">❌</span>}
                    </button>
                  );
                })}
                {currentQuestion?.type === 'tf' && (
                  <div className="flex gap-2 md:col-span-2">
                    {[{ v: true, label: 'Verdadeiro' }, { v: false, label: 'Falso' }].map(({ v, label }) => {
                      const selected = selectedAnswers[currentIdx] === v;
                      const isCorrect = currentQuestion.answer === v;
                      return (
                        <button key={String(v)} onClick={() => onSelect(currentIdx, v)} className={`px-6 py-3 rounded-2xl ${selected ? 'ring-2 ring-blue-400' : ''} ${selected && isCorrect ? 'bg-green-100' : ''}`}>{label}</button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Botão próxima/finalizar */}
              <div className="mt-8 flex justify-end">
                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={onNext}
                    disabled={selectedAnswers[currentIdx] === undefined}
                    className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-emerald-600 transition-all duration-200 hover-grow disabled:opacity-60"
                  >
                    Próxima
                  </button>
                ) : (
                  <button
                    onClick={onSubmit}
                    disabled={selectedAnswers[currentIdx] === undefined}
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 hover-grow disabled:opacity-60"
                  >
                    Ver resultado 🚀
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
