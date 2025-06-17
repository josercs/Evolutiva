import React from "react";

export function DicasEstudo({ tips, onClose }: { tips: string[], onClose: () => void }) {
  return (
    <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg text-yellow-800 flex items-center gap-2">
          <span>💡</span> Como estudar este conteúdo
        </h3>
        <button onClick={onClose} className="text-yellow-600 hover:text-yellow-800">×</button>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tips.map((tip, idx) => (
          <li key={idx} className="flex items-start gap-2 p-2 bg-white rounded-lg shadow-sm">
            <span className="flex-shrink-0 mt-1 text-yellow-500">✔️</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-sm text-yellow-700">
        <strong>Dica extra:</strong> Experimente diferentes técnicas para descobrir quais funcionam melhor para você!
      </div>
    </div>
  );
}