import React from "react";

export function CaixaFeynman({
  feynmanText, setFeynmanText, onCheck, feedback
}: {
  feynmanText: string;
  setFeynmanText: (v: string) => void;
  onCheck: (texto: string) => void;
  feedback: string;
}) {
  return (
    <div className="mt-8 p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold mb-2">Explique com suas palavras (Técnica Feynman)</h3>
      <div className="flex flex-col md:flex-row gap-2 items-start">
        <textarea
          className="w-full p-2 rounded border border-blue-200"
          placeholder="Explique este conteúdo como se estivesse ensinando alguém..."
          value={feynmanText}
          onChange={e => setFeynmanText(e.target.value)}
          rows={4}
        />
        <button
          onClick={() => onCheck(feynmanText)}
          className="mt-2 md:mt-0 md:ml-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          disabled={!feynmanText.trim()}
          title="Enviar explicação para análise da IA"
        >
          Verificar Explicação
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Escreva sua explicação e clique em <b>Verificar Explicação</b> para receber um feedback automático!
      </div>
      {feedback && (
        <div className="mt-4 p-3 bg-white border border-blue-200 rounded text-sm text-blue-900 whitespace-pre-line">
          <strong>Feedback IA:</strong><br />
          {feedback}
        </div>
      )}
    </div>
  );
}