import React, { useState } from 'react';

// Assuming components DicasEstudo, CaixaFeynman, AnotacoesPerguntas exist or will be created/adapted
// Placeholder components for demonstration:
const DicasEstudoPlaceholder: React.FC<{ tips: string[], showTips: boolean, onToggle: () => void }> = ({ tips, showTips, onToggle }) => (
    <div className="mb-6 p-4 border rounded-lg bg-sky-50 border-sky-200">
        <button onClick={onToggle} className="font-semibold text-sky-800 hover:text-sky-600 mb-2">
            {showTips ? 'Esconder Dicas de Estudo 💡' : 'Mostrar Dicas de Estudo 💡'}
        </button>
        {showTips && (
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {tips.map((tip, index) => <li key={index}>{tip}</li>)}
            </ul>
        )}
    </div>
);

const CaixaFeynmanPlaceholder: React.FC<{ text: string, setText: (t: string) => void, feedback: string, onGetFeedback: () => void, isFetching: boolean }> = ({ text, setText, feedback, onGetFeedback, isFetching }) => (
    <div className="mb-6 p-4 border rounded-lg bg-orange-50 border-orange-200">
        <h4 className="font-semibold text-orange-800 mb-2">Técnica Feynman: Explique com Suas Palavras</h4>
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua explicação aqui..."
            rows={4}
            className="w-full p-2 border rounded focus:ring-1 focus:ring-orange-400 focus:border-orange-400 mb-2"
        />
        <button
            onClick={onGetFeedback}
            disabled={isFetching || !text.trim()}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded disabled:opacity-50 disabled:cursor-wait"
        >
            {isFetching ? 'Analisando...' : 'Pedir Feedback da IA'}
        </button>
        {feedback && (
            <div className="mt-3 p-3 border rounded bg-white border-orange-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback}</p>
            </div>
        )}
    </div>
);

const AnotacoesPerguntasPlaceholder: React.FC<{ notes: string, setNotes: (n: string) => void, questions: string[], currentQuestion: string, setCurrentQuestion: (q: string) => void, addQuestion: () => void, removeQuestion: (idx: number) => void }> = ({ notes, setNotes, questions, currentQuestion, setCurrentQuestion, addQuestion, removeQuestion }) => (
    <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-2">Suas Anotações</h4>
        <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Digite suas anotações aqui... Elas são salvas automaticamente."
            rows={6}
            className="w-full p-2 border rounded focus:ring-1 focus:ring-purple-400 focus:border-purple-400 mb-4"
        />
        <h4 className="font-semibold text-purple-800 mb-2">Suas Perguntas</h4>
        <div className="flex mb-3">
            <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="Digite uma pergunta sobre o conteúdo..."
                className="flex-grow p-2 border rounded-l focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
            />
            <button onClick={addQuestion} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-r">
                Adicionar
            </button>
        </div>
        {questions.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {questions.map((q, index) => (
                    <li key={index} className="flex justify-between items-center group">
                        <span>{q}</span>
                        <button onClick={() => removeQuestion(index)} className="text-red-500 opacity-0 group-hover:opacity-100 text-xs ml-2">Remover</button>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

// Props for the main StudyAids component
interface StudyAidsProps {
    // Props for DicasEstudo
    studyTips: string[];
    showTips: boolean;
    toggleTips: () => void;

    // Props for CaixaFeynman
    feynmanText: string;
    setFeynmanText: (text: string) => void;
    feynmanFeedback: string;
    getFeynmanFeedback: () => void;
    isFetchingFeynmanFeedback: boolean;

    // Props for AnotacoesPerguntas
    userNotes: string;
    setUserNotes: (notes: string) => void;
    questions: string[];
    currentQuestion: string;
    setCurrentQuestion: (question: string) => void;
    addQuestion: () => void;
    removeQuestion: (index: number) => void;
}

/**
 * Component that groups together various study aid tools:
 * Study Tips, Feynman Technique Box, and User Notes/Questions.
 */
export const StudyAids: React.FC<StudyAidsProps> = ({
    studyTips,
    showTips,
    toggleTips,
    feynmanText,
    setFeynmanText,
    feynmanFeedback,
    getFeynmanFeedback,
    isFetchingFeynmanFeedback,
    userNotes,
    setUserNotes,
    questions,
    currentQuestion,
    setCurrentQuestion,
    addQuestion,
    removeQuestion,
}) => {
    return (
        <div className="space-y-6">
            <DicasEstudoPlaceholder
                tips={studyTips}
                showTips={showTips}
                onToggle={toggleTips}
            />
            <CaixaFeynmanPlaceholder
                text={feynmanText}
                setText={setFeynmanText}
                feedback={feynmanFeedback}
                onGetFeedback={getFeynmanFeedback}
                isFetching={isFetchingFeynmanFeedback}
            />
            <AnotacoesPerguntasPlaceholder
                notes={userNotes}
                setNotes={setUserNotes}
                questions={questions}
                currentQuestion={currentQuestion}
                setCurrentQuestion={setCurrentQuestion}
                addQuestion={addQuestion}
                removeQuestion={removeQuestion}
            />
        </div>
    );
};
