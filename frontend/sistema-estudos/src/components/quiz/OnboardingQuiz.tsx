import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { enviarOnboarding } from "../../services/onboardingService";

const questions = [
  {
    question: "Qual é o resultado de 2 + 2?",
    options: ["3", "4", "5", "6"],
    answer: 1,
  },
  {
    question: "O que é uma célula?",
    options: [
      "Unidade básica da vida",
      "Tipo de energia",
      "Parte de um computador",
      "Elemento químico",
    ],
    answer: 0,
  },
  {
    question: "Qual destas é uma capital do Brasil?",
    options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
    answer: 2,
  },
];

const OnboardingQuiz: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [respostas, setRespostas] = useState<number[]>([]);
  const { user } = useUser();
  const { setAnswers, answers } = useOnboarding();
  const navigate = useNavigate();

  const handleAnswer = async (idx: number) => {
    const novasRespostas = [...respostas, idx];
    setRespostas(novasRespostas);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      const acertos = novasRespostas.filter(
        (resp, i) => resp === questions[i].answer
      ).length;
      const allAnswers = { ...answers, quiz: { acertos, respostas: novasRespostas } };
      setAnswers(allAnswers);

      if (!user?.id) {
        alert("Usuário não autenticado. Faça login novamente.");
        navigate("/login");
        return;
      }

      await enviarOnboarding({ ...allAnswers, user_id: user.id });
      navigate("/onboarding/summary");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[linear-gradient(135deg,#e0f2fe_0%,#d1fae5_100%)] px-4">
      <h2 className="text-2xl mb-4 font-semibold text-slate-800">
        Quiz de Nivelamento ({current + 1}/{questions.length})
      </h2>
      <div className="text-xl mb-6 font-semibold text-slate-900">
        {questions[current].question}
      </div>
      <div className="flex flex-col gap-4 w-full max-w-md">
        {questions[current].options.map((opt, idx) => (
          <button
            key={opt}
            onClick={() => handleAnswer(idx)}
            className="px-5 py-4 rounded-2xl border border-slate-200 bg-white font-semibold text-base hover:bg-blue-50 transition"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnboardingQuiz;
