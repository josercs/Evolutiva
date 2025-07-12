import React, { useEffect, useState } from "react";

type QuizModalProps = {
  show: boolean;
  loading: boolean;
  questions: any[];
  currentIdx: number;
  selectedAnswers: { [key: number]: number };
  onSelect: (qIdx: number, oIdx: number) => void;
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

  // Chame a IA ao submeter o quiz
  useEffect(() => {
    if (showResults && questions.length && Object.keys(selectedAnswers).length) {
      async function fetchFeedback() {
        const res = await fetch("/api/ia/quiz-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions,
            answers: selectedAnswers,
          }),
        });
        const data = await res.json();
        setIaFeedback(data.feedback);
      }
      fetchFeedback();
    }
  }, [showResults, questions, selectedAnswers]);

  if (!show) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-100 via-blue-100 to-pink-100 bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-indigo-300 flex flex-col items-center animate-fade-in">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center shadow-inner">
              <span className="text-4xl">📚</span>
            </div>
            <div className="rainbow-ring-turbo"></div>
          </div>
          <h3 className="text-xl font-bold text-indigo-800 mb-2">
            {progress < 50 ? "Preparando seu desafio..." : "Quase lá!"}
          </h3>
          <p className="text-indigo-600 mb-2">
            {progress < 30
              ? "Selecionando as melhores questões..."
              : progress < 70
              ? "Organizando seu aprendizado..."
              : "Finalizando os detalhes..."}
          </p>
          <div className="w-full bg-indigo-100 rounded-full h-2.5 mt-4 mb-2">
            <div
              className="bg-gradient-to-r from-indigo-400 to-purple-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-indigo-400 font-medium mb-4">
            {Math.round(progress)}% completo
          </p>
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-100 via-blue-100 to-pink-100 bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl border-4 border-indigo-300 relative animate-fade-in flex flex-col items-center justify-center">
          <span className="text-xl text-gray-500">
            Nenhuma pergunta disponível para este quiz.
          </span>
          <button
            onClick={onClose}
            className="mt-8 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow hover:bg-indigo-700 transition-all duration-200"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  const correctCount = questions.filter(
    (q, idx) =>
      q.options &&
      selectedAnswers[idx] !== undefined &&
      q.options[selectedAnswers[idx]] === q.answer
  ).length;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-100 via-blue-100 to-pink-100 bg-opacity-90 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-3xl p-6 md:p-10 max-w-3xl w-full shadow-2xl overflow-y-auto border-4 border-indigo-300 relative animate-fade-in"
        style={{
          maxHeight: "92vh",
          minHeight: "60vh",
        }}
        id="quiz-container"
      >
        <button
          className="absolute top-4 right-6 text-3xl text-gray-400 hover:text-indigo-600 font-bold transition-turbo"
          onClick={onClose}
          aria-label="Fechar quiz"
        >
          ×
        </button>
        {showResults ? (
          <div className="mt-8 text-center">
            <p className="text-2xl md:text-3xl font-extrabold text-indigo-700 flex items-center justify-center gap-2 animate-fade-in">
              🎉 Resultado:{" "}
              <span className="text-green-500">{correctCount}</span> de{" "}
              <span className="text-indigo-500">{questions.length}</span> acertos
            </p>
            <div className="mt-6 text-base text-gray-700 whitespace-pre-line text-left bg-blue-50 border border-blue-200 rounded-2xl p-4 mx-auto max-w-2xl shadow-inner">
              <strong className="block text-indigo-800 mb-2 text-lg">
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
              className="mt-8 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all duration-200 hover-grow"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Barra de progresso */}
            <div className="mb-6 flex items-center gap-2">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-yellow-400 transition-all duration-500"
                  style={{
                    width: `${
                      questions.length
                        ? ((currentIdx + 1) / questions.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 ml-2 font-semibold">
                {questions.length ? `${currentIdx + 1}/${questions.length}` : "0/0"}
              </span>
            </div>
            {/* Pergunta atual */}
            <div>
              <div className="font-semibold text-lg md:text-xl mb-4 text-gray-800 flex items-center gap-3">
                <span className="bg-indigo-200 text-indigo-800 px-4 py-1 rounded-full text-base font-bold shadow">
                  {currentIdx + 1}
                </span>
                <span className="flex-1">{currentQuestion?.question}</span>
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
                        ${isSelected ? "ring-2 ring-indigo-400 scale-105" : ""}
                        ${showIcon && isCorrect ? "bg-green-100 text-green-800" : ""}
                        ${showIcon && isSelected && !isCorrect ? "bg-red-100 text-red-800" : "bg-gray-100 hover:bg-indigo-100"}
                      `}
                      onClick={() => onSelect(currentIdx, j)}
                      id={`quiz-btn-${currentIdx}-${j}`}
                      disabled={selectedAnswers[currentIdx] !== undefined}
                    >
                      {opt}
                      {showIcon && isCorrect && <span className="ml-2">✔️</span>}
                      {showIcon && isSelected && !isCorrect && <span className="ml-2">❌</span>}
                    </button>
                  );
                })}
              </div>
              {/* Botão próxima/finalizar */}
              <div className="mt-8 flex justify-end">
                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={onNext}
                    disabled={selectedAnswers[currentIdx] === undefined}
                    className="px-8 py-3 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-green-600 transition-all duration-200 hover-grow disabled:opacity-60"
                  >
                    Próxima
                  </button>
                ) : (
                  <button
                    onClick={onSubmit}
                    disabled={selectedAnswers[currentIdx] === undefined}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all duration-200 hover-grow disabled:opacity-60"
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
