import React, { useEffect, useReducer } from "react";
import { Progress } from "../components/ui/progress"; // ajuste o caminho se necessário

interface ProgressoMateria {
  materia: string;
  percent: number;
  total_lessons: number;
  completed_lessons: number;
}

interface Materia {
  id: number;
  nome: string;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  earned_at: string;
  icon?: string;
}

type State = {
  progresso: ProgressoMateria[];
  materias: Materia[];
  achievements: Achievement[];
  xp: number;
  streak: number;
  loading: boolean;
  erro: string | null;
  curso: string | null;
};

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_DATA"; payload: Partial<State> }
  | { type: "SET_ERROR"; payload: string };

const initialState: State = {
  progresso: [],
  materias: [],
  achievements: [],
  xp: 0,
  streak: 0,
  loading: true,
  erro: null,
  curso: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_DATA":
      return { ...state, ...action.payload };
    case "SET_ERROR":
      return { ...state, erro: action.payload };
    default:
      return state;
  }
}

const useFetchData = (userId: string | null, cursoId: string | null) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || !cursoId) {
        dispatch({ type: "SET_ERROR", payload: "Usuário não autenticado" });
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      try {
        dispatch({ type: "SET_LOADING", payload: true });

        const [progresso, materias, achievements, xpData, cursoData] = await Promise.all([
          fetch(`/api/progress/materias/${userId}/${cursoId}`).then(res => res.json()),
          fetch(`/api/materias?course_id=${cursoId}`).then(res => res.json()),
          fetch(`/api/progress/achievements/${userId}`).then(res => res.json()),
          fetch(`/api/progress/user/${userId}/xp`).then(res => res.json()).catch(() => ({ xp: 0, streak: 0 })),
          fetch(`/api/progress/user/${userId}/curso`).then(res => res.json())
        ]);

        if (cursoData.error) {
          throw new Error(cursoData.error);
        }

        dispatch({
          type: "SET_DATA",
          payload: {
            progresso: progresso?.progresso || [],
            materias: materias?.materias || [],
            achievements: achievements?.achievements || [],
            xp: xpData.xp || 0,
            streak: xpData.streak || 0,
            curso: cursoData.nome || "Curso não definido",
            loading: false,
            erro: null
          }
        });

      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          payload: error instanceof Error ? error.message : "Erro ao carregar dados"
        });
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    fetchData();
  }, [userId, cursoId]);

  return state;
};

const ProgressoMateriaCard = ({
  materia,
  percent,
  total,
  completed,
}: {
  materia: string;
  percent: number;
  total?: number;
  completed?: number;
}) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="font-medium">{materia}</span>
      <span className="text-sm text-gray-500">
        {completed !== undefined && total !== undefined
          ? `${completed}/${total} lições • `
          : ""}
        {percent}%
      </span>
    </div>
    <Progress value={percent} />
  </div>
);

const AchievementItem = ({ achievement }: { achievement: Achievement }) => (
  <li className="border-b pb-2 flex items-center gap-3">
    <span role="img" aria-label="Troféu" className="text-xl">
      {achievement.icon || "🏆"}
    </span>
    <div>
      <div className="font-medium">{achievement.title}</div>
      <div className="text-sm text-gray-600">{achievement.description}</div>
      <div className="text-xs text-gray-400">
        {new Date(achievement.earned_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
    </div>
  </li>
);

const StatCard = ({ value, label, color }: {
  value: React.ReactNode;
  label: string;
  color: 'indigo' | 'green' | 'yellow';
}) => {
  const colors = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    green: { bg: 'bg-green-50', text: 'text-green-700' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700' }
  };

  return (
    <div className={`flex-1 min-w-[140px] ${colors[color].bg} rounded-xl p-4 flex flex-col items-center shadow`}>
      <span className={`text-3xl font-bold ${colors[color].text}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
};

const ProgressSection = ({ loading, erro, materias }: {
  loading: boolean;
  erro: string | null;
  materias: Array<{
    materia: string;
    percent: number;
    total?: number;
    completed?: number;
  }>;
}) => (
  <div className="bg-white rounded-xl shadow p-6 mb-8">
    <h2 className="text-lg font-semibold mb-4">Progresso por Matéria</h2>
    {loading ? (
      <div>Carregando progresso...</div>
    ) : erro ? (
      <div className="text-red-600">{erro}</div>
    ) : materias.length === 0 ? (
      <div className="text-gray-500">Nenhuma matéria encontrada.</div>
    ) : (
      <div className="space-y-4">
        {materias.map((item) => (
          <ProgressoMateriaCard key={item.materia} {...item} />
        ))}
      </div>
    )}
  </div>
);

const AchievementsSection = ({ achievements, loading }: {
  achievements: Achievement[];
  loading: boolean;
}) => (
  <div className="bg-white rounded-xl shadow p-6">
    <h2 className="text-lg font-semibold mb-4">Conquistas</h2>
    {loading ? (
      <div>Carregando conquistas...</div>
    ) : achievements.length === 0 ? (
      <div className="text-gray-500 flex items-center gap-2">
        <span role="img" aria-label="Sem conquistas">🥲</span>
        Nenhuma conquista ainda.
      </div>
    ) : (
      <ul className="space-y-2">
        {achievements.map((ach) => (
          <AchievementItem key={ach.id} achievement={ach} />
        ))}
      </ul>
    )}
  </div>
);

const PainelPage: React.FC = () => {
  const userId = localStorage.getItem("userId");
  const cursoId = localStorage.getItem("cursoId");
  const {
    progresso,
    materias,
    achievements,
    xp,
    streak,
    loading,
    erro,
    curso
  } = useFetchData(userId, cursoId);

  const materiasComProgresso = React.useMemo(() =>
    materias
      .filter(mat => progresso.some(p => p.materia === mat.nome))
      .map(mat => {
        const prog = progresso.find(p => p.materia === mat.nome);
        return {
          materia: mat.nome,
          percent: prog?.percent || 0,
          total: prog?.total_lessons,
          completed: prog?.completed_lessons
        };
      }),
    [materias, progresso]
  );

  const { percentGeral } = React.useMemo(() => {
    const totalLessons = materiasComProgresso.reduce((acc, m) => acc + (m.total || 0), 0);
    const totalDone = materiasComProgresso.reduce((acc, m) => acc + (m.completed || 0), 0);
    return {
      percentGeral: totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0,
      totalLessons,
      totalDone
    };
  }, [materiasComProgresso]);

  if (!userId || !cursoId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-2">
        <div className="text-red-600">Usuário não autenticado</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-2">
      <h1 className="text-2xl font-bold mb-6">Painel do Aluno</h1>

      {curso && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow">
          <span className="text-lg font-semibold">Curso atual:</span>
          <p className="text-gray-700">{curso}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-8">
        <StatCard value={xp} label="XP" color="indigo" />
        <StatCard value={`${streak} 🔥`} label="Dias de sequência" color="green" />
        <StatCard value={`${percentGeral}%`} label="Progresso Geral" color="yellow" />
      </div>

      <ProgressSection loading={loading} erro={erro} materias={materiasComProgresso} />
      <AchievementsSection achievements={achievements} loading={loading} />
    </div>
  );
};

export default PainelPage;

