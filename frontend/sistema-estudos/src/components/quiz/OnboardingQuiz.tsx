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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e3f2fd 0%, #ffe082 100%)",
      }}
    >
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>
        Quiz de Nivelamento ({current + 1}/{questions.length})
      </h2>
      <div style={{ fontSize: 20, marginBottom: 24, fontWeight: 600 }}>
        {questions[current].question}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: 400,
        }}
      >
        {questions[current].options.map((opt, idx) => (
          <button
            key={opt}
            onClick={() => handleAnswer(idx)}
            style={{
              padding: 16,
              borderRadius: 20,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnboardingQuiz;
