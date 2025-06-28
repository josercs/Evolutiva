import React from "react";
import { Progress } from "./ui/progress";
import { usePlano } from "../contexts/usePlanoContext";

const ProgressoMateriaSection: React.FC = () => {
  const { plano, loading, erro } = usePlano();

  const materiasComProgresso = plano?.coverage
    ? Object.entries(plano.coverage).map(([materia, percent]) => ({
        materia,
        percent,
      }))
    : [];

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-3">
        <h2 className="text-base font-semibold text-white flex items-center">
          <span className="mr-2">📖</span>
          Progresso por Matéria
        </h2>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-gray-500">Carregando...</div>
        ) : erro ? (
          <div className="text-red-500">{erro}</div>
        ) : materiasComProgresso.length === 0 ? (
          <div className="text-gray-500">Nenhuma matéria encontrada.</div>
        ) : (
          <div className="space-y-3">
            {materiasComProgresso.map((item) => (
              <div key={item.materia}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    {item.materia}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">
                    {item.percent}%
                  </span>
                </div>
                <Progress value={item.percent} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressoMateriaSection;
