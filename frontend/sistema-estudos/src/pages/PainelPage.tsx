import React from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Calculator, BookOpen } from "lucide-react";

const progressoExemplo = [
  { materia: "Matemática", percent: 70 },
  { materia: "Português", percent: 55 },
  { materia: "Ciências", percent: 85 },
];

const notificacoes = [
  { tipo: "conquista", texto: "Nova conquista desbloqueada: Mestre da Álgebra!" },
  { tipo: "lembrete", texto: "Lembrete: Revisão de História amanhã às 10h." },
];

const PainelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Painel</h1>

      {/* Resumo do Dia */}
      <div className="flex gap-3 mb-6">
        <div className="bg-white rounded shadow p-3 flex-1">
          <div className="font-semibold mb-1 text-sm">Aulas de Hoje</div>
          <div className="text-gray-600 text-xs">Matemática, Português</div>
        </div>
        <div className="bg-white rounded shadow p-3 flex-1">
          <div className="font-semibold mb-1 text-sm">Tarefas Pendentes</div>
          <div className="text-gray-600 text-xs">3 tarefas</div>
        </div>
        <div className="bg-white rounded shadow p-3 flex-1">
          <div className="font-semibold mb-1 text-sm">Tempo de Estudo</div>
          <div className="text-gray-600 text-xs">Recomendado: 1h 30m</div>
        </div>
      </div>

      {/* Progresso Geral */}
      <div className="mb-6">
        <div className="font-semibold mb-2 text-sm">Progresso Geral</div>
        {progressoExemplo.map((p) => (
          <div key={p.materia} className="mb-2">
            <div className="flex justify-between text-xs">
              <span>{p.materia}:</span>
              <span>{p.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div
                className="bg-blue-600 h-2 rounded"
                style={{ width: `${p.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Botão de ação */}
      <div className="mb-6">
        <button
          className="bg-orange-500 text-white px-4 py-1.5 rounded font-bold text-sm"
          onClick={() => navigate("/trilhas")}
        >
          Estudar Agora!
        </button>
      </div>

      {/* Notificações */}
      <div>
        <div className="font-semibold mb-2 text-sm">Notificações</div>
        <div className="space-y-2">
          {notificacoes.map((n, idx) => (
            <div
              key={idx}
              className="bg-white rounded shadow p-2 flex items-center gap-2 text-xs"
            >
              {n.tipo === "conquista" ? (
                <span role="img" aria-label="troféu">🏆</span>
              ) : (
                <span role="img" aria-label="lembrete">📍</span>
              )}
              <span>{n.texto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Novas Aulas */}
      <div className="mt-6">
        <div className="font-semibold mb-2 text-sm">Novas Aulas Disponíveis</div>
        <ul className="flex gap-3 text-xs">
          <li className="flex items-center gap-1">
            <FlaskConical className="text-purple-600 h-4 w-4" /> Química
          </li>
          <li className="flex items-center gap-1">
            <Calculator className="text-blue-600 h-4 w-4" /> Matemática
          </li>
          <li className="flex items-center gap-1">
            <BookOpen className="text-green-500 h-4 w-4" /> Português
          </li>
        </ul>
      </div>

      {/* Card com Gradiente */}
      <div className="bg-gradient-rainbow rounded-xl p-4 text-white shadow-lg mt-6 text-sm">
        {/* Conteúdo do card */}
      </div>
    </div>
  );
};

export default PainelPage;