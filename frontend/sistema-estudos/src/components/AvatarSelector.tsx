import React, { useState } from "react";
import Confetti from "react-confetti";

const AvatarSelector: React.FC = () => {
  const [goalCompleted, setGoalCompleted] = useState(false);

  function handleCompleteGoal(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    setGoalCompleted(true);
  }

  return (
    <>
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow hover:bg-blue-700 transition hover:scale-105"
        onClick={handleCompleteGoal}
      >
        Iniciar agora
      </button>
      {goalCompleted && <Confetti />}
    </>
  );
};

export default AvatarSelector;

