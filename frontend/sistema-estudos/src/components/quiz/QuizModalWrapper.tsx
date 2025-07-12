import React from 'react';
import { ModalQuiz } from './ModalQuiz';

interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
}

interface QuizModalWrapperProps {
    showQuiz: boolean;
    quizQuestions: QuizQuestion[];
    quizLoading: boolean;
    selectedAnswers: { [key: number]: number };
    showResults: boolean;
    quizFeedback: string;
    isSubmitting: boolean;
    handleSelectAnswer: (questionIdx: number, optionIdx: number) => void;
    handleSubmitQuiz: () => void;
    closeQuiz: () => void;
    currentQuizIdx: number;
    nextQuestion: () => void;
}

/**
 * A wrapper component that connects the useQuiz hook logic
 * to the ModalQuiz presentation component.
 *
 * This component receives all necessary state and handlers from its parent
 * (which uses the useQuiz hook) and passes them down to ModalQuiz.
 */
export const QuizModalWrapper: React.FC<QuizModalWrapperProps> = ({
    showQuiz,
    quizQuestions,
    quizLoading,
    selectedAnswers,
    showResults,
    quizFeedback,
    isSubmitting,
    handleSelectAnswer,
    handleSubmitQuiz,
    closeQuiz,
    currentQuizIdx,
    nextQuestion,
}) => {
    // If the modal shouldn't be shown, render nothing
    if (!showQuiz) {
        return null;
    }

    // Pass all the props down to the actual modal component
    // Note: The original code used a component named ModalQuiz. We assume it exists
    // or needs to be created/adapted based on the props.
    // If ModalQuiz doesn't exist, we might need to create a basic structure here.

    return (
        <ModalQuiz
            show={showQuiz}
            loading={quizLoading}
            questions={quizQuestions}
            currentIdx={currentQuizIdx}
            selectedAnswers={selectedAnswers}
            onSelect={handleSelectAnswer}
            onNext={nextQuestion}
            onSubmit={handleSubmitQuiz}
            showResults={showResults}
            feedback={quizFeedback}
            onClose={closeQuiz}
        />
    );
};

