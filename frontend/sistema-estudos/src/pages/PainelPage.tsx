import React, { useEffect, useReducer, useState } from "react";
import { Progress } from "../components/ui/progress";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import UserProgressDashboard from "../components/UserProgressDashboard";
import { Calendar } from "../components/ui/calendar";
import ptBR from "date-fns/locale/pt-BR";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

// Tipos e interfaces
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

interface User {
  name: string;
  avatarUrl: string;
  level: number;
  badges: string[];
  xp: number;
  streak: number;
}

interface PlanoEstudo {
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
      completed?: boolean;
      status?: "pendente" | "dificuldade" | "ok";
    }>;
  }>;
}

interface AtividadePendente {
  subject: string;
  topic: string;
  date: string;
  start_time: string;
  end_time: string;
  activity_type: string;
  status: "pendente" | "dificuldade";
  idx: number;
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

// Estado inicial
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

// Reducer
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

// Hook para buscar dados
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

// Componentes reutilizáveis
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
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 group">
    <div className="flex justify-between items-center mb-2">
      <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {materia}
      </span>
      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
        {percent}%
      </span>
    </div>
    <Progress value={percent} className="h-2 bg-gray-100 dark:bg-gray-700" />
    {completed !== undefined && total !== undefined && (
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {completed} de {total} lições concluídas
      </div>
    )}
  </div>
);

const AchievementItem = ({ achievement }: { achievement: Achievement }) => (
  <li className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-start gap-3 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
    <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full">
      <span role="img" aria-label="Troféu" className="text-xl">
        {achievement.icon || "🏆"}
      </span>
    </div>
    <div className="flex-1">
      <div className="font-semibold text-gray-800 dark:text-gray-200">{achievement.title}</div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{achievement.description}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Conquistado em {new Date(achievement.earned_at).toLocaleDateString("pt-BR")}
      </div>
    </div>
  </li>
);

const StatCard = ({
  value,
  label,
  icon,
}: {
  value: React.ReactNode;
  label: string;
  icon: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-3">
      <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  </div>
);

// Componente principal
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

  const [plano, setPlano] = useState<PlanoEstudo | null>(null);
  const [user, setUser] = useState<User>({
    name: "",
    avatarUrl: "",
    level: 1,
    badges: [],
    xp: 0,
    streak: 0,
  });
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [materiaFiltro, setMateriaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [pendencias, setPendencias] = useState<AtividadePendente[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [dataRevisaoSelecionada, setDataRevisaoSelecionada] = useState<Date | undefined>(undefined);

  // Buscar dados do plano de estudo
  useEffect(() => {
    const fetchPlano = async () => {
      try {
        const res = await fetch("/api/planos/me", { credentials: "include" });
        const data = await res.json();
        setPlano(data.plano_estudo);
      } catch (error) {
        console.error("Erro ao buscar plano de estudo:", error);
      }
    };
    fetchPlano();
  }, []);

  // Buscar dados do usuário
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me", { credentials: "include" });
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
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
      }
    };
    fetchUser();
  }, [xp, streak]);

  // Buscar pendências
  const fetchPendencias = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const email = user.email;
      const res = await fetch(`/api/planos/pendencias?email=${email}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar pendências");
      const data = await res.json();
      setPendencias(data.pendencias || []);
    } catch (error) {
      console.error("Erro ao buscar pendências:", error);
    }
  };

  useEffect(() => {
    fetchPendencias();
  }, [plano]); // <-- assim, sempre que o plano mudar, recarrega as pendências

  // Gerenciar loading global
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([
          // Aguarda os dados principais serem carregados
          new Promise(resolve => {
            if (!loading) resolve(null);
          }),
          // Outras chamadas podem ser adicionadas aqui
        ]);
      } finally {
        setGlobalLoading(false);
      }
    };

    if (!loading) {
      fetchAllData();
    }
  }, [loading]);

  // Calcular progresso geral
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

  // Filtrar atividades
  const atividadesFiltradas = React.useMemo(() => {
    return plano?.days?.flatMap(day => day.blocks.filter(block => {
      const matchesMateria = materiaFiltro ? block.subject === materiaFiltro : true;
      const matchesTipo = tipoFiltro ? block.activity_type === tipoFiltro : true;
      return matchesMateria && matchesTipo && !block.completed;
    })) || [];
  }, [plano, materiaFiltro, tipoFiltro]);

  // Função para marcar atividade como concluída
  const marcarAtividadeComoConcluida = async (atividade: any) => {
    try {
      await fetch("/api/planos/concluir-bloco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          atividadeId: atividade.id
        }),
      });

      setPlano(prev => {
        if (!prev || !prev.days) return prev;
        return {
          ...prev,
          days: prev.days.map(day => ({
            ...day,
            blocks: day.blocks.map(block => 
              block === atividade ? { ...block, completed: true } : block
            )
          }))
        };
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (error) {
      console.error("Erro ao marcar atividade:", error);
    }
  };

  // Atualizar plano de estudos
  const atualizarPlano = async (email: string) => {
    try {
      const res = await fetch(`/api/planos/me?email=${email}`, { credentials: "include" });
      const data = await res.json();
      setPlano(data.plano_estudo);
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
    }
  };

  const agendarRevisao = async (block: AtividadePendente, dataRevisao: Date | null) => {
    if (!plano || !dataRevisao) return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.email) {
      alert("Usuário não autenticado.");
      return;
    }

    const revisaoDateStr = dataRevisao.toISOString().split("T")[0];

    let diaRevisao = plano.days?.find(d => d.date === revisaoDateStr);
    if (!diaRevisao) {
      diaRevisao = { date: revisaoDateStr, blocks: [] };
      plano.days = [...(plano.days || []), diaRevisao];
    }

    diaRevisao.blocks.push({
      start_time: block.start_time,
      end_time: block.end_time,
      subject: block.subject,
      topic: block.topic,
      activity_type: "revisão",
      duration: 30,
      completed: false,
      status: "pendente"
    });

    await fetch("/api/planos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: user.email, plano }),
    });

    alert("Revisão agendada para " + revisaoDateStr + "!");
    setPlano({ ...plano });
  };

  // Se não estiver autenticado
  if (!userId || !cursoId) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
          <p className="font-medium">Usuário não autenticado</p>
          <p className="text-sm mt-1">Por favor, faça login e selecione um curso</p>
        </div>
      </div>
    );
  }

  // Tela de loading
  if (globalLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 flex justify-center items-center h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      {/* Cabeçalho */}
      <header className="text-center space-y-2">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 dark:text-white"
        >
          Meu Progresso
        </motion.h1>
        {curso && (
          <p className="text-gray-600 dark:text-gray-400">
            Curso atual: <span className="font-medium text-indigo-600 dark:text-indigo-400">{curso}</span>
          </p>
        )}
      </header>

      {/* Seção de Pendências */}
      {pendencias.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-red-200 dark:border-red-900/50"
        >
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            Atividades Pendentes ou com Dificuldade
          </h2>
          <ul className="space-y-3">
            {pendencias.map((block, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg p-3 gap-3"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {block.subject} - {block.topic}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {block.date} • {block.start_time}-{block.end_time} • {block.activity_type}
                  </div>
                  <div className="text-xs mt-1">
                    <span className={`px-2 py-1 rounded-full ${
                      block.status === "pendente" 
                        ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200" 
                        : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200"
                    }`}>
                      {block.status === "pendente" ? "Não estudado" : "Com dúvida"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700"
                      >
                        Agendar Revisão
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4">
                      <div className="space-y-2">
                        <Calendar
                          mode="single"
                          selected={dataRevisaoSelecionada}
                          onSelect={setDataRevisaoSelecionada}
                          locale={ptBR}
                        />
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => agendarRevisao(block, dataRevisaoSelecionada ?? null)}
                        >
                          Agendar para data escolhida
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const proximoSabado = getProximoSabado();
                            agendarRevisao(block, proximoSabado);
                          }}
                        >
                          Agendar para sábado
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isResolving}
                    onClick={async () => {
                      const user = JSON.parse(localStorage.getItem("user") || "{}");
                      if (!user.email) {
                        alert("Usuário não autenticado.");
                        return;
                      }
                      try {
                        setIsResolving(true);
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
                        await fetchPendencias(); // <-- recarrega do backend
                        setPendencias(prev => prev.filter(p => p.idx !== block.idx));
                      } catch (error) {
                        console.error("Erro ao marcar como resolvido:", error);
                      } finally {
                        setIsResolving(false);
                      }
                    }}
                  >
                    {isResolving ? "Processando..." : "Resolvido"}
                  </Button>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Dashboard do usuário */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          value={xp} 
          label="XP Acumulado" 
          icon="🏅" 
        />
        <StatCard 
          value={streak} 
          label="Dias consecutivos" 
          icon="🔥" 
        />
        <StatCard 
          value={`${percentGeral}%`} 
          label="Progresso Geral" 
          icon="📈" 
        />
      </section>

      {/* Seção de progresso por matéria */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Progresso por Matéria</h2>
          <Button variant="ghost" size="sm">
            Ver todas
          </Button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : erro ? (
          <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {erro}
          </div>
        ) : materiasComProgresso.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhuma matéria encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiasComProgresso.map((item) => (
              <ProgressoMateriaCard key={item.materia} {...item} />
            ))}
          </div>
        )}
      </section>

      {/* Calendário em um card/section separado */}
      <section className="flex justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-md border border-gray-200 dark:border-gray-700 w-full max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
            Selecione a data
          </h2>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ptBR}
              className="max-w-md w-full" // Limita a largura do calendário e centraliza
              classNames={{
                table: "mx-auto", // Centraliza a tabela
                head_row: "grid grid-cols-7 mb-2",
                head_cell: "text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2",
                row: "grid grid-cols-7 gap-y-2",
                cell: "flex items-center justify-center h-14",
                day: "flex items-center justify-center w-12 h-12 rounded-lg transition-colors text-base font-medium select-none cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30",
                day_selected: "bg-indigo-600 text-white hover:bg-indigo-700",
                day_today: "border border-indigo-400 font-bold",
                day_outside: "text-gray-300 dark:text-gray-600",
                day_disabled: "opacity-40 pointer-events-none",
                nav_button: "rounded-full p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors",
              }}
              showOutsideDays
            />
          </div>
        </div>
      </section>

      {/* Cards de Atividades e Resumo Semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Atividades */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-medium text-lg text-gray-700 dark:text-gray-300">
              Atividades para {date?.toLocaleDateString("pt-BR") || 'hoje'}
            </h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select onValueChange={setMateriaFiltro}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Filtrar matéria" />
                </SelectTrigger>
                <SelectContent>
                  {materias.map((materia) => (
                    <SelectItem key={materia.id} value={materia.nome}>
                      {materia.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={setTipoFiltro}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Filtrar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estudo">Estudo</SelectItem>
                  <SelectItem value="exercicio">Exercício</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Lista de atividades */}
          <div className="space-y-3">
            {(() => {
              const dia = plano?.days?.find(d => d.date === date?.toISOString().split('T')[0]);
              const blocos = dia?.blocks?.filter(block => {
                const matchesMateria = materiaFiltro ? block.subject === materiaFiltro : true;
                const matchesTipo = tipoFiltro ? block.activity_type === tipoFiltro : true;
                return matchesMateria && matchesTipo && !block.completed;
              }) || [];
              
              if (blocos.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p>Nenhuma atividade planejada para este dia</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-indigo-600 dark:text-indigo-400 gap-1"
                      onClick={() => setIsAddingActivity(true)}
                    >
                      Planejar atividade
                    </Button>
                  </div>
                );
              }
              
              return (
                <ul className="space-y-3">
                  {blocos.map((block, idx) => (
                    <li key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center border border-gray-200 dark:border-gray-600 hover:shadow-xs transition-all">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={block.completed}
                          onCheckedChange={() => marcarAtividadeComoConcluida(block)}
                          className="mt-1 border-gray-300 dark:border-gray-500"
                        />
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {block.subject} - {block.topic}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span>{block.start_time} - {block.end_time}</span>
                            <span>•</span>
                            <span>{block.duration} min</span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                              {block.activity_type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50"
                          onClick={() => marcarAtividadeComoConcluida(block)}
                        >
                          Concluir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        {/* Card: Resumo Semanal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumo Semanal</h3>
          <div className="grid grid-cols-1 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dias estudados</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">5/7</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Horas esta semana</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">12h 45min</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tarefas concluídas</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">18/25</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

function getProximoSabado(fromDate?: Date) {
  const date = fromDate ? new Date(fromDate) : new Date();
  const day = date.getDay();
  const diff = (6 - day + 7) % 7 || 7; // 6 = sábado
  date.setDate(date.getDate() + diff);
  return date;
}

export default PainelPage;