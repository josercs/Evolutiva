import React, { RefObject } from "react";

type NotesAndQuestionsProps = {
  userNotes: string;
  setUserNotes: (v: string) => void;
  handleAddNote: () => void;
  notesRef: RefObject<HTMLTextAreaElement>;
  questions: string[];
  currentQuestion: string;
  setCurrentQuestion: (v: string) => void;
  handleAddQuestion: () => void;
  handleRemoveQuestion: (idx: number) => void;
};

export default function AnotacoesPerguntas({
  userNotes,
  setUserNotes,
  handleAddNote,
  notesRef,
  questions,
  currentQuestion,
  setCurrentQuestion,
  handleAddQuestion,
  handleRemoveQuestion,
}: NotesAndQuestionsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Minhas Anotações
        </h3>
        <textarea
          ref={notesRef}
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddQuestion();
            }
          }}
          placeholder="Escreva aqui suas anotações pessoais sobre este conteúdo..."
        />
        <button
          onClick={handleAddNote}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Salvar Anotações
        </button>
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Minhas Perguntas
        </h3>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Adicione uma pergunta sobre o conteúdo..."
            onKeyPress={(e) => e.key === "Enter" && handleAddQuestion()}
          />
          <button
            onClick={handleAddQuestion}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Adicionar
          </button>
        </div>
        {questions.length > 0 ? (
          <ul className="space-y-3">
            {questions.map((question, idx) => (
              <li
                key={idx}
                className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{question}</span>
                  <button
                    onClick={() => handleRemoveQuestion(idx)}
                    className="text-red-500 hover:text-red-700"
                    title="Remover pergunta"
                    aria-label="Remover pergunta"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
            Nenhuma pergunta adicionada ainda. Escreva dúvidas que surgirem durante seu estudo!
          </div>
        )}
      </div>
    </div>
  );
}