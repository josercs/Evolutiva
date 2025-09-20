// Importação de hooks, componentes de UI, animações e contexto
import React, { useEffect, useReducer, useState } from "react";
import { Progress } from "./components/ui/progress";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { usePlano } from "./contexts/PlanoContext";

// Tipagem para progresso de cada matéria
interface ProgressoMateria {
  materia: string;
  percent: number;
  total_lessons: number;
  completed_lessons: number;
}

// Tipagem para cada matéria cadastrada
interface Materia {
  id: number;
  nome: string;
}

// Tipagem para conquistas do usuário
interface Achievement {
  id: number;
  title: string;
  description: string;
  earned_at: string;
  icon?: string;
}

// Tipagem para atividades pendentes
interface Pendencia {
  subject: string;
  topic: string;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  activity_type: string;
  duration: number;
  idx: number;
}

// Estado global do painel
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

// Ações possíveis no reducer do painel
type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_DATA"; payload: Partial<State> }
  | { type: "SET_ERROR"; payload: string };

// Estado inicial do painel
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

// Função reducer para atualizar o estado do painel
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

// Hook customizado para buscar dados do backend
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

        // Busca dados de progresso, matérias, conquistas, XP e curso em paralelo
        const [progresso, materias, achievements, xpData, cursoData] = await Promise.all([
          fetch(`/api/progresso/materias/${userId}/${cursoId}`, { credentials: "include" }).then(res => res.json()),
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

// Card visual para mostrar progresso em uma matéria
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
  <div className="bg-gradient-to-br from-white via-sky-50 to-cyan-50 rounded-2xl p-5 shadow-md hover:shadow-xl transition-shadow duration-200 border border-sky-100 group">
    <div className="flex justify-between items-center mb-2">
      <span className="font-semibold text-gray-800 group-hover:text-sky-700 transition-colors">{materia}</span>
      <span className="text-base font-bold text-sky-600 group-hover:text-blue-700 transition-colors">
        {percent}%
      </span>
    </div>
    <Progress value={percent} className="h-2 bg-sky-100" />
    {completed !== undefined && total !== undefined && (
      <div className="mt-2 text-xs text-gray-500">
        {completed} de {total} lições concluídas
      </div>
    )}
  </div>
);

// Item visual para mostrar uma conquista do usuário
const AchievementItem = ({ achievement }: { achievement: Achievement }) => (
  <li className="bg-gradient-to-r from-sky-100 via-white to-cyan-100 rounded-xl p-4 flex items-start gap-4 shadow hover:scale-[1.025] hover:shadow-lg transition-all duration-200">
    <div className="bg-sky-200 p-3 rounded-full shadow-inner flex items-center justify-center">
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

// Card para mostrar estatísticas rápidas (XP, streak, progresso geral)
const StatCard = ({ value, label, color }: {
  value: React.ReactNode;
  label: string;
  color: 'blue' | 'green' | 'yellow';
}) => {
  const colors = {
    blue: { bg: 'from-sky-600 via-sky-500 to-blue-600', text: 'text-white' },
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

// Seção para mostrar progresso por matéria
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
  <section className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-sky-100">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Progresso por Matéria</h2>
      <span className="text-sm text-sky-600 font-medium cursor-pointer hover:underline">Ver todas</span>
    </div>
    {loading ? (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-sky-100 rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-sky-50 rounded-full"></div>
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
    <span className="text-gray-500 text-sm">
      {materias.length} matérias cadastradas
    </span>
  </section>
);

// Seção para mostrar conquistas do usuário
const AchievementsSection = ({ achievements, loading }: {
  achievements: Achievement[];
  loading: boolean;
}) => (
  <section className="bg-white rounded-2xl shadow-sm p-6 border border-sky-100">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Conquistas</h2>
      <span className="text-sm text-sky-600 font-medium cursor-pointer hover:underline">Ver todas</span>
    </div>
    {loading ? (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="h-12 w-12 bg-sky-100 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-sky-100 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-sky-50 rounded w-full"></div>
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

// Seção para mostrar metas semanais do plano de estudo
const MetasSemanaSection = ({ metas }: { metas: string[] }) => (
  <section className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-sky-100">
    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-6">Metas da Semana</h2>
    <ul className="space-y-3">
      {metas.map((meta, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="bg-sky-200 p-1 rounded-full mt-1">
            <div className="w-2 h-2 bg-sky-600 rounded-full"></div>
          </div>
          <span className="text-gray-700">{meta}</span>
        </li>
      ))}
    </ul>
  </section>
);

// Componente principal do painel de estudos
const PainelPage: React.FC = () => {
  // Busca userId e cursoId do localStorage
  const userId = localStorage.getItem("userId");
  const cursoId = localStorage.getItem("cursoId");
  // Busca dados principais do painel
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

  // Estado para o plano de estudos
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
        status?: string; // Adiciona status como opcional
        idx?: number;    // Adiciona idx como opcional, se necessário em outros lugares
      }>;
    }>;
  } | null>(null);

  // Busca o plano de estudos ao montar o componente
  useEffect(() => {
    const fetchPlano = async () => {
      const res = await fetch("/api/planos/me", { credentials: "include" });
      const data = await res.json();
      const plano = data.plano_estudo;
      setPlano(plano);
    };
    fetchPlano();
  }, []);

  // PROGRESSO POR MATÉRIA - INTEGRAÇÃO
  // Mapeia o progresso para o formato esperado pelos componentes e IA
  const materiasComProgresso = React.useMemo(() =>
    materias
      .filter(mat => progresso.some(p => p.materia === mat.nome))
      .map(mat => {
        const prog = progresso.find(p => p.materia === mat.nome);
        let percent = 0;
        if (prog) {
          if (typeof prog.percent === "number") {
            percent = prog.percent;
          } else if (
            typeof prog.completed_lessons === "number" &&
            typeof prog.total_lessons === "number" &&
            prog.total_lessons > 0
          ) {
            percent = Math.round((prog.completed_lessons / prog.total_lessons) * 100);
          }
        }
        return {
          materia: mat.nome,
          percent,
          total: prog?.total_lessons,
          completed: prog?.completed_lessons
        };
      }),
    [materias, progresso]
  );

  // Calcula progresso geral
  const { percentGeral, totalLessons, totalDone } = React.useMemo(() => {
    const materiasValidas = materiasComProgresso.filter(m => m.total && m.total > 0);
    const totalLessons = materiasValidas.reduce((acc, m) => acc + (m.total || 0), 0);
    const totalDone = materiasValidas.reduce((acc, m) => acc + (m.completed || 0), 0);
    return {
      percentGeral: totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0,
      totalLessons,
      totalDone
    };
  }, [materiasComProgresso]);

  // Filtros para atividades pendentes
  const [materiaFiltro, setMateriaFiltro] = React.useState("");
  const [tipoFiltro, setTipoFiltro] = React.useState("");

  // Filtra atividades pendentes do plano
  const atividadesFiltradas = React.useMemo(() => {
    return plano?.days?.flatMap(day =>
      day.blocks
        .map((b, idx) => ({ ...b, idx, date: day.date }))
        .filter(block => {
          const matchesMateria = materiaFiltro ? block.subject === materiaFiltro : true;
          const matchesTipo = tipoFiltro ? block.activity_type === tipoFiltro : true;
          const matchesStatus = !block.status || block.status === "pendente";
          return matchesMateria && matchesTipo && matchesStatus;
        })
    ) || [];
  }, [plano, materiaFiltro, tipoFiltro]);

  // Estado do usuário para exibir nome, avatar, etc
  const [user, setUser] = React.useState({
    name: "",
    avatarUrl: "",
    level: 1,
    badges: [],
    xp: 0,
    streak: 0,
  });

  // Busca dados do usuário ao mudar XP ou streak
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser({
            name: data.name || data.nome || "Usuário",
            avatarUrl: data.avatar_url || data.avatar || "",
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

  // Sugestão da IA baseada no progresso e pendências
  const [iaSugestao, setIaSugestao] = React.useState<string | null>(null);

  useEffect(() => {
    async function fetchIaSugestao() {
      try {
        if (!materiasComProgresso.length) return;
        const pendencias = plano?.days?.flatMap(day =>
          day.blocks.filter(b => b.status === "dificuldade" || b.status === "pendente")
        ) || [];
        const duvidas = pendencias.filter(b => b.status === "dificuldade");
        const res = await fetch("/api/ia/sugestao-estudo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progresso: materiasComProgresso,
            pendencias,
            duvidas,
          }),
        });
        if (!res.ok) throw new Error("Erro ao buscar sugestão");
        const data = await res.json();
        setIaSugestao(data.sugestao);
      } catch (error) {
        setIaSugestao("Não foi possível carregar sugestões no momento");
      }
    }
    fetchIaSugestao();
  }, [materiasComProgresso, plano]);

  // Se não houver usuário ou curso, mostra mensagem de erro
  if (!userId || !cursoId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-2 mt-8">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
          <div className="text-red-600">Usuário não autenticado</div>
        </div>
      </div>
    );
  }

  // Função para marcar atividade como concluída
  async function marcarAtividadeComoConcluida(atividade: {
    start_time: string;
    end_time: string;
    subject: string;
    topic: string;
    activity_type: string;
    duration: number;
  }): Promise<void> {
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

      // Atualiza o contexto global
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await atualizarPlano(user.email);

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
  // Card genérico para exibir informações
  const Card: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white rounded-2xl shadow p-5 border border-indigo-100 flex flex-col min-h-[80px]">
      <div className="font-bold text-indigo-700 mb-2">{title}</div>
      <div className="text-gray-700 text-sm">{children || <span className="text-gray-400">Nenhum dado</span>}</div>
    </div>
  );

  // Função para atualizar o plano de estudos
  async function atualizarPlano(email: string) {
    try {
      const res = await fetch("/api/planos/me", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Erro ao atualizar plano de estudos");
      const data = await res.json();
      setPlano(data.plano_estudo);
    } catch (error) {
      // Opcional: mostrar erro ao usuário
      // console.error("Erro ao atualizar plano:", error);
    }
  }

  // Calcula pendências do plano para exibir na tela
  const pendencias = React.useMemo(() => {
    return plano?.days?.flatMap(day =>
      day.blocks
        .map((b, idx) => ({ ...b, idx, date: day.date }))
        .filter(b => b.status === "dificuldade" || b.status === "pendente")
    ) || [];
  }, [plano]);

  // Renderização principal do painel
  return (
    <div className="max-w-3xl mx-auto py-8 px-2 mt-8">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <header className="mb-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm"
          >
            🚀 Meu Progresso
          </motion.h1>
          {curso && (
            <p className="text-lg text-gray-600">
              Curso atual: <span className="font-semibold text-sky-600">{curso}</span>
            </p>
          )}
        </header>

        {/* Adicione cards/seções para foco principal, tarefas rápidas e básicas*/}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* ...seus outros cards... */}
        </div>

        {/* Card de Sugestão Inteligente da IA */}
        <div className="mb-12">
          <Card title="Sugestão Inteligente (IA)">
            {iaSugestao
              ? <span>{iaSugestao}</span>
              : <span className="text-gray-400">Carregando sugestão...</span>}
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <StatCard value={<><span className="mr-1">🏅</span>{xp}</>} label="XP Acumulado" color="blue" />
          <StatCard value={<><span className="mr-1">🔥</span>{streak}</>} label="Dias consecutivos" color="green" />
          <StatCard value={<><span className="mr-1">📈</span>{percentGeral}%</>} label="Progresso Geral" color="yellow" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
          <div className="lg:col-span-3 flex flex-col gap-8">
            <ProgressSection loading={loading} erro={erro} materias={materiasComProgresso} />
            {plano?.metas_semanais && <MetasSemanaSection metas={plano.metas_semanais} />}
            {plano?.coverage && (
              <motion.section
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-gradient-to-br from-white via-sky-50 to-cyan-50 rounded-3xl shadow-xl p-10 mb-12 border border-sky-100"
              >
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-8 flex items-center gap-2">
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
                      className="bg-white/90 rounded-xl p-5 shadow group hover:shadow-lg transition-all border border-sky-100 flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-800 group-hover:text-sky-700 transition-colors">
                          📚 {subject}
                        </span>
                        <span className="text-lg font-bold text-sky-600 group-hover:text-blue-700 transition-colors">
                          {Number(percent)}%
                        </span>
                      </div>
                      <Progress value={Number(percent)} className="h-2 bg-sky-100" />
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          className={[
                            "w-3 h-3 rounded-full transition-all duration-300",
                            Number(percent) >= 100
                              ? "bg-green-500 ring-2 ring-green-200"
                              : Number(percent) >= 60
                              ? "bg-yellow-400 ring-2 ring-yellow-100"
                              : "bg-red-400 ring-2 ring-red-200",
                          ].join(" ")}
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
            {/* AchievementsSection com animação e layout aprimorado*/}
            {/* <div>
            <AchievementsSection achievements={achievements} loading={loading} />
            </div> */}
        </div>

        {/* Seção de Atividades moderna */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm p-8 mb-12 border border-sky-100"
        >
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
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
                className="w-full border border-sky-200 rounded-xl px-4 py-2 text-sm bg-sky-50 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all shadow-sm hover:shadow-md"
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
                className="w-full border border-sky-200 rounded-xl px-4 py-2 text-sm bg-sky-50 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all shadow-sm hover:shadow-md"
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
                className="text-center py-10 bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl"
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
                  className="p-5 bg-gradient-to-br from-white via-sky-50 to-cyan-50 rounded-xl border border-sky-100 flex justify-between items-center hover:bg-white hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      <span className="text-sky-600">📚 {atividade.subject}</span> - {atividade.topic}
                    </p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs px-2 py-1 bg-sky-100 text-sky-800 rounded-full capitalize">
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

        {pendencias.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-red-200">
            <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <span className="inline-block text-2xl">⚠️</span>
              Atividades Pendentes ou com Dificuldade
            </h2>
            <ul className="space-y-3">
              {pendencias.map((block, i) => (
                <li key={i} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg p-3">
                  <div>
                    <div className="font-semibold text-gray-800">{block.subject} - {block.topic}</div>
                    <div className="text-xs text-gray-500">
                      {block.date} • {block.start_time}-{block.end_time} • {block.activity_type}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Status: {block.status === "pendente" ? "Não estudado" : "Com dúvida"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs px-3 py-1 bg-sky-600 hover:bg-blue-600 text-white rounded transition"
                      onClick={() => {
                        alert("Função de agendar revisão ainda não implementada.");
                      }}
                    >
                      Agendar Revisão
                    </button>
                    <button
                      className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition"
                      onClick={async () => {
                        const user = JSON.parse(localStorage.getItem("user") || "{}");
                        if (!user.email) {
                          alert("Usuário não autenticado.");
                          return;
                        }
                        await fetch("/api/planos/atualizar-status-bloco", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            email: user.email,
                            date: block.date,
                            blockIndex: block.idx,
                            status: "ok"
                          }),
                        });
                        await atualizarPlano(user.email);
                      }}
                    >
                      Marcar como resolvido
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default PainelPage;
