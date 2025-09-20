// src/components/quiz/QuizOption.tsx
import React from 'react';

interface QuizOptionProps {
  text: string;
  isCorrect: boolean;
  optionIndex: number;
  questionIdx: number; // Mudou para number
  onSelect: (questionIdx: number, optionIndex: number) => void;
  disabled: boolean;
  selected?: boolean;
}

export const QuizOption: React.FC<QuizOptionProps> = ({
  text,
  isCorrect,
  optionIndex,
  questionIdx,
  onSelect,
  disabled,
  selected = false
}) => {
  return (
    <button
      onClick={() => onSelect(questionIdx, optionIndex)}
      disabled={disabled}
      className={`quiz-option ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}
      data-correct={isCorrect}
    >
      {text}
    </button>
  );
};