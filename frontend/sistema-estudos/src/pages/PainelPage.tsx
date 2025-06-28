import React, { useEffect, useReducer } from "react";
import { Progress } from "../components/ui/progress";
import confetti from "canvas-confetti"; // npm install canvas-confetti
import { motion } from "framer-motion"; // npm install framer-motion
import UserProgressDashboard from "../components/UserProgressDashboard";

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

// ProgressoMateriaCard com visual moderno
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
  <div className="bg-gradient-to-br from-white via-indigo-50 to-indigo-100 rounded-2xl p-5 shadow-md hover:shadow-xl transition-shadow duration-200 border border-indigo-100 group">
    <div className="flex justify-between items-center mb-2">
      <span className="font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{materia}</span>
      <span className="text-base font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors">
        {percent}%
      </span>
    </div>
    <Progress value={percent} className="h-2 bg-indigo-100" />
    {completed !== undefined && total !== undefined && (
      <div className="mt-2 text-xs text-gray-500">
        {completed} de {total} lições concluídas
      </div>
    )}
  </div>
);

// AchievementItem com microinteração e visual vibrante
const AchievementItem = ({ achievement }: { achievement: Achievement }) => (
  <li className="bg-gradient-to-r from-indigo-100 via-white to-purple-100 rounded-xl p-4 flex items-start gap-4 shadow hover:scale-[1.025] hover:shadow-lg transition-all duration-200">
    <div className="bg-indigo-200 p-3 rounded-full shadow-inner flex items-center justify-center">
      <span role="img" aria-label="Troféu" className="text-2xl">{achievement.icon || "🏆"}</span>
    </div>
    <div className="flex-1">
      <div className="font-bold text-gray-800">{achievement.title}</div>
      <div className="text-sm text-gray-600 mt-1">{achievement.description}</div>
      <div className="text-xs text-gray-400 mt-2">
        Conquistado em{" "}
        {new Date(achievement.earned_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
    </div>
  </li>
);

// StatCard com ícone
const StatCard = ({ value, label, color }: {
  value: React.ReactNode;
  label: string;
  color: 'indigo' | 'green' | 'yellow';
}) => {
  const colors = {
    indigo: { bg: 'from-indigo-500 via-indigo-400 to-purple-500', text: 'text-white' },
    green: { bg: 'from-emerald-500 via-emerald-400 to-green-500', text: 'text-white' },
    yellow: { bg: 'from-amber-400 via-yellow-300 to-yellow-500', text: 'text-white' },
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`bg-gradient-to-br ${colors[color].bg} rounded-2xl p-6 shadow-lg flex flex-col items-center hover:scale-105 transition-transform duration-200`}
    >
      <span className={`text-4xl font-extrabold mb-1 ${colors[color].text}`}>{value}</span>
      <span className="text-sm font-medium text-white/90">{label}</span>
    </motion.div>
  );
};

// ProgressSection com grid responsivo e animação
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
  <section className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-indigo-100">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Progresso por Matéria</h2>
      <span className="text-sm text-indigo-600 font-medium cursor-pointer hover:underline">Ver todas</span>
    </div>
    {loading ? (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-indigo-100 rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-indigo-50 rounded-full"></div>
          </div>
        ))}
      </div>
    ) : erro ? (
      <div className="text-red-500 bg-red-50 p-3 rounded-lg">{erro}</div>
    ) : materias.length === 0 ? (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">📚</div>
        <p className="text-gray-500">Nenhuma matéria encontrada.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {materias.map((item) => (
          <ProgressoMateriaCard key={item.materia} {...item} />
        ))}
      </div>
    )}
  </section>
);

// AchievementsSection com layout aprimorado
const AchievementsSection = ({ achievements, loading }: {
  achievements: Achievement[];
  loading: boolean;
}) => (
  <section className="bg-white rounded-2xl shadow-sm p-6 border border-indigo-100">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Conquistas</h2>
      <span className="text-sm text-indigo-600 font-medium cursor-pointer hover:underline">Ver todas</span>
    </div>
    {loading ? (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="h-12 w-12 bg-indigo-100 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-indigo-100 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-indigo-50 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    ) : achievements.length === 0 ? (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">🥲</div>
        <p className="text-gray-500">Nenhuma conquista ainda.</p>
        <p className="text-sm text-gray-400 mt-1">Continue estudando para desbloquear!</p>
      </div>
    ) : (
      <ul className="space-y-3">
        {achievements.map((ach) => (
          <AchievementItem key={ach.id} achievement={ach} />
        ))}
      </ul>
    )}
  </section>
);

// MetasSemanaSection com visual moderno
const MetasSemanaSection = ({ metas }: { metas: string[] }) => (
  <section className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-indigo-100">
    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Metas da Semana</h2>
    <ul className="space-y-3">
      {metas.map((meta, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="bg-indigo-200 p-1 rounded-full mt-1">
            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
          </div>
          <span className="text-gray-700">{meta}</span>
        </li>
      ))}
    </ul>
  </section>
);

// PainelPage com layout e microinterações modernas
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

  const [plano, setPlano] = React.useState<{
    plano_diario?: any;
    metas_semanais?: string[];
    weekly_goals?: string[];
    coverage?: Record<string, number>;
    days?: Array<{
      date: string;
      blocks: Array<{
        start_time: string;
        end_time: string;
        subject: string;
        topic: string;
        activity_type: string;
        duration: number;
      }>;
    }>;
  } | null>(null);

  useEffect(() => {
    const fetchPlano = async () => {
      const res = await fetch("/api/planos/me", { credentials: "include" });
      const data = await res.json();
      const plano = data.plano_estudo; // WeeklyPlan
      setPlano(plano);
    };

    fetchPlano();
  }, []);

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

  const [materiaFiltro, setMateriaFiltro] = React.useState("");
  const [tipoFiltro, setTipoFiltro] = React.useState("");

  const atividadesFiltradas = React.useMemo(() => {
    return plano?.days?.flatMap(day => day.blocks).filter(block => {
      const matchesMateria = materiaFiltro ? block.subject === materiaFiltro : true;
      const matchesTipo = tipoFiltro ? block.activity_type === tipoFiltro : true;
      return matchesMateria && matchesTipo;
    }) || [];
  }, [plano, materiaFiltro, tipoFiltro]);

  if (!userId || !cursoId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-2 mt-8">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
          <div className="text-red-600">Usuário não autenticado</div>
        </div>
      </div>
    );
  }

  async function marcarBlocoComoConcluido(date: string, idx: number): Promise<void> {
    if (!plano || !plano.days) return;
    try {
      // Encontra o bloco correspondente
      const day = plano.days.find(d => d.date === date);
      if (!day) return;
      const block = day.blocks[idx];
      if (!block) return;

      // Chama a API para marcar como concluído
      await fetch("/api/planos/concluir-bloco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date,
          blockIndex: idx,
        }),
      });

      // Atualiza o estado local removendo o bloco concluído
      setPlano(prev => {
        if (!prev || !prev.days) return prev;
        return {
          ...prev,
          days: prev.days.map(d =>
            d.date === date
              ? { ...d, blocks: d.blocks.filter((_, i) => i !== idx) }
              : d
          ),
        };
      });
    } catch (error) {
      alert("Erro ao marcar bloco como concluído.");
    }
  }

  async function marcarAtividadeComoConcluida(atividade: { start_time: string; end_time: string; subject: string; topic: string; activity_type: string; duration: number; }): Promise<void> {
    if (!plano || !plano.days) return;
    try {
      // Encontra o dia e o bloco correspondente
      const dayIdx = plano.days.findIndex(day =>
        day.blocks.some(block =>
          block.start_time === atividade.start_time &&
          block.end_time === atividade.end_time &&
          block.subject === atividade.subject &&
          block.topic === atividade.topic &&
          block.activity_type === atividade.activity_type &&
          block.duration === atividade.duration
        )
      );
      if (dayIdx === -1) return;
      const blockIdx = plano.days[dayIdx].blocks.findIndex(block =>
        block.start_time === atividade.start_time &&
        block.end_time === atividade.end_time &&
        block.subject === atividade.subject &&
        block.topic === atividade.topic &&
        block.activity_type === atividade.activity_type &&
        block.duration === atividade.duration
      );
      if (blockIdx === -1) return;

      // Chama a API para marcar como concluído
      await fetch("/api/planos/concluir-bloco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: plano.days[dayIdx].date,
          blockIndex: blockIdx,
        }),
      });

      // Atualiza o estado local removendo o bloco concluído
      setPlano(prev => {
        if (!prev || !prev.days) return prev;
        return {
          ...prev,
          days: prev.days.map((d, i) =>
            i === dayIdx
              ? { ...d, blocks: d.blocks.filter((_, idx) => idx !== blockIdx) }
              : d
          ),
        };
      });

      // 🎉 Confete visual
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (error) {
      alert("Erro ao marcar atividade como concluída.");
    }
  }

  // Dados para o dashboard centralizado
  const [user, setUser] = React.useState({
    name: "",
    avatarUrl: "",
    level: 1,
    badges: [],
    xp: 0,
    streak: 0,
  });

  useEffect(() => {
    // Exemplo: buscar dados do usuário autenticado
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser({
            name: data.nome || "Usuário",
            avatarUrl: data.avatar || "",
            level: data.level || 1,
            badges: data.badges || [],
            xp: data.xp || xp,
            streak: data.streak || streak,
          });
        } else {
          setUser(prev => ({ ...prev, xp, streak }));
        }
      } catch {
        setUser(prev => ({ ...prev, xp, streak }));
      }
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp, streak]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-2 mt-8">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <header className="mb-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm"
          >
            🚀 Meu Progresso
          </motion.h1>
          {curso && (
            <p className="text-lg text-gray-600">
              Curso atual: <span className="font-semibold text-indigo-600">{curso}</span>
            </p>
          )}
        </header>

        {/* DASHBOARD CENTRALIZADO */}
        <div className="mb-12">
          <UserProgressDashboard
            user={user}
            progresso={materiasComProgresso.map(m => ({
              materia: m.materia,
              percent: m.percent
            }))}
            achievements={achievements.map(a => ({
              id: a.id,
              title: a.title,
              description: a.description,
              date: a.earned_at,
            }))}
            studyTime="2h15min"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <StatCard value={<><span className="mr-1">🏅</span>{xp}</>} label="XP Acumulado" color="indigo" />
          <StatCard value={<><span className="mr-1">🔥</span>{streak}</>} label="Dias consecutivos" color="green" />
          <StatCard value={<><span className="mr-1">📈</span>{percentGeral}%</>} label="Progresso Geral" color="yellow" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
          <div className="lg:col-span-3 flex flex-col gap-8">
            <ProgressSection loading={loading} erro={erro} materias={materiasComProgresso} />
            {plano?.metas_semanais && <MetasSemanaSection metas={plano.metas_semanais} />}
            {plano && plano.coverage && (
              <motion.section
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-gradient-to-br from-white via-indigo-50 to-purple-50 rounded-3xl shadow-xl p-10 mb-12 border border-indigo-100"
              >
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8 flex items-center gap-2">
                  <span className="inline-block text-3xl">📊</span>
                  Cobertura por Matéria
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {Object.entries(plano.coverage).map(([subject, percent]) => (
                    <motion.div
                      key={subject}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white/90 rounded-xl p-5 shadow group hover:shadow-lg transition-all border border-indigo-100 flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                          📚 {subject}
                        </span>
                        <span className="text-lg font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors">
                          {Number(percent)}%
                        </span>
                      </div>
                      <Progress value={Number(percent)} className="h-2 bg-indigo-100" />
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full transition-colors duration-300"
                          style={{
                            background:
                              Number(percent) >= 100
                                ? "#22c55e"
                                : Number(percent) >= 60
                                ? "#facc15"
                                : "#f87171",
                            boxShadow:
                              Number(percent) >= 100
                                ? "0 0 0 2px #bbf7d0"
                                : Number(percent) >= 60
                                ? "0 0 0 2px #fef9c3"
                                : "0 0 0 2px #fee2e2",
                          }}
                        />
                        <span className="text-xs font-medium text-gray-600">
                          {Number(percent) >= 100
                            ? "Completo"
                            : Number(percent) >= 60
                            ? "Bom progresso"
                            : "Em andamento"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>
          <div>
            <AchievementsSection achievements={achievements} loading={loading} />
          </div>
        </div>

        {/* Seção de Atividades moderna */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm p-8 mb-12 border border-indigo-100"
        >
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
            📅 Atividades Pendentes
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label htmlFor="materia-filter" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="mr-1">📖</span>Matéria
              </label>
              <select
                id="materia-filter"
                onChange={e => setMateriaFiltro(e.target.value)}
                className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm hover:shadow-md"
              >
                <option value="">Todas as matérias</option>
                {(plano?.coverage ? Object.keys(plano.coverage) : []).map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="tipo-filter" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="mr-1">🏷️</span>Tipo
              </label>
              <select
                id="tipo-filter"
                onChange={e => setTipoFiltro(e.target.value)}
                className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm hover:shadow-md"
              >
                <option value="">Todos os tipos</option>
                <option value="teoria">Teoria</option>
                <option value="prática">Prática</option>
                <option value="revisão">Revisão</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {atividadesFiltradas.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-10 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl"
              >
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-lg text-gray-700 font-semibold">Nenhuma atividade pendente!</p>
                <p className="text-sm text-gray-400 mt-1">Você está em dia com seus estudos</p>
              </motion.div>
            ) : (
              atividadesFiltradas.map((atividade, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-5 bg-gradient-to-br from-white via-indigo-50 to-indigo-100 rounded-xl border border-indigo-100 flex justify-between items-center hover:bg-white hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      <span className="text-indigo-600">📚 {atividade.subject}</span> - {atividade.topic}
                    </p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full capitalize">
                        {atividade.activity_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {atividade.duration} min • {atividade.start_time}-{atividade.end_time}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => marcarAtividadeComoConcluida(atividade)}
                    className="text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2 rounded-lg shadow transition-all duration-200 font-semibold"
                  >
                    Concluir
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default PainelPage;

