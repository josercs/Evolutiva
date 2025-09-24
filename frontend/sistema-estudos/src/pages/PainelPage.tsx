import React, { useEffect, useReducer, useState } from "react";
import { Progress } from "../components/ui/progress";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Calendar } from "../components/ui/calendar";
import ptBR from "date-fns/locale/pt-BR";
import { Button } from "../components/ui/button";
import { useLocation } from "react-router-dom";
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
  id?: string | number;
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
  <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {materia}
      </span>
  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
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
  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
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
  <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-[0_8px_20px_-12px_rgba(0,0,0,.25)] p-4">
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center justify-center rounded-full bg-[var(--brand-50)] text-[color:var(--brand-700)] w-9 h-9">
        <span aria-hidden className="text-base">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        <div className="text-sm text-slate-600">{label}</div>
      </div>
    </div>
  </div>
);

// Componente principal
const PainelPage: React.FC = () => {
  const location = useLocation();
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

  // Helpers para semana corrente (início na segunda)
  const startOfWeekMon = (d: Date) => {
    const base = new Date(d);
    base.setHours(0, 0, 0, 0);
    const day = base.getDay(); // 0..6 (dom..sáb)
    const diff = (day + 6) % 7; // deslocamento até segunda
    base.setDate(base.getDate() - diff);
    return base;
  };
  const endOfWeekMon = (d: Date) => {
    const s = startOfWeekMon(d);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  };
  const parseDateBRToLocal = (s: string) => {
    const [dd, mm, yyyy] = (s || '').split('/').map(Number);
    if (!dd || !mm || !yyyy) return new Date('Invalid');
    return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
  };
  const planoSemanaDays = React.useMemo(() => {
    const all = plano?.days || [];
    const today = new Date();
    const start = startOfWeekMon(today);
    const end = endOfWeekMon(today);
    return all.filter(d => {
      const dt = parseDateBRToLocal(d.date);
      return dt >= start && dt <= end;
    });
  }, [plano]);

  // Snapshot semanal dinâmico (blocos, concluidos e duração total em minutos)
  const semana = React.useMemo(() => {
    const days = planoSemanaDays;
    const totalBlocks = days.reduce((acc, d) => acc + (d.blocks?.length || 0), 0);
    const concl = days.reduce((acc, d) => acc + (d.blocks || []).filter(b => b.status === "ok" || b.completed).length, 0);
    const minutes = days.reduce((acc, d) => acc + (d.blocks || []).reduce((s, b) => s + (b.duration || 0), 0), 0);
    return {
      daysStudied: days.filter(d => d.blocks?.length).length,
      totalBlocks,
      concl,
      minutes,
    };
  }, [planoSemanaDays]);

  // Buscar dados do plano de estudo
  useEffect(() => {
    const fetchPlano = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const email = storedUser ? JSON.parse(storedUser).email : undefined;
        if (!email) return;
        const res = await fetch(`/api/planos/por-email?email=${encodeURIComponent(email)}`, { credentials: "include" });
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

  // Scroll to weekly quiz when hash is present
  useEffect(() => {
    if (location.hash === '#revisao-semanal') {
      // small delay to ensure the element exists after render
      const t = setTimeout(() => {
        document.getElementById('revisao-semanal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

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
      const matchesTipo = tipoFiltro ? normalize(block.activity_type) === normalize(tipoFiltro) : true;
      return matchesMateria && matchesTipo && !block.completed;
    })) || [];
  }, [plano, materiaFiltro, tipoFiltro]);

  // Função para marcar atividade como concluída
  const marcarAtividadeComoConcluida = async (atividade: any) => {
    try {
      const storedUser = localStorage.getItem("user");
      const email = storedUser ? JSON.parse(storedUser).email : undefined;
      await fetch("/api/planos/concluir-bloco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
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
      const res = await fetch(`/api/planos/por-email?email=${encodeURIComponent(email)}`, { credentials: "include" });
      const data = await res.json();
      setPlano(data.plano_estudo);
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
    }
  };

  const agendarRevisao = async (block: AtividadePendente, dataRevisao: Date | null) => {
    if (!dataRevisao) return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.email) {
      alert("Usuário não autenticado.");
      return;
    }

    if (!block.id && block.id !== 0) {
      alert("Este bloco não possui ID de conteúdo para revisão.");
      return;
    }

    // Formata dd/MM/YYYY para o backend
    const dia = String(dataRevisao.getDate()).padStart(2, '0');
    const mes = String(dataRevisao.getMonth() + 1).padStart(2, '0');
    const ano = dataRevisao.getFullYear();
    const dataStr = `${dia}/${mes}/${ano}`;

    try {
      const resp = await fetch('/api/planos/marcar-revisao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email,
          conteudo_id: block.id,
          date: dataStr,
          start_time: block.start_time || '19:00',
          duration: 45,
        })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || 'Falha ao marcar revisão');
      }
      alert("Revisão agendada para " + dataStr + "!");
      await atualizarPlano(user.email);
      await fetchPendencias();
    } catch (e:any) {
      console.error(e);
      alert(e.message || 'Erro ao marcar revisão');
    }
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
  <div className="ml-sidebar pt-20 max-w-6xl mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  return (
  <main className="relative ml-sidebar pt-20 max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.06),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.05),transparent)]" />

      {/* HERO / Cabeçalho premium */}
      <header className="rounded-3xl overflow-hidden bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 border border-blue-100/60">
        <div className="px-6 py-8 md:px-10 md:py-10 text-center">
          <p className="text-sm text-slate-600">Meu Progresso</p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-2xl md:text-[2rem] font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">Olá!</span>{" "}
            bem-vindo de volta ao seu painel
          </motion.h1>
          {curso && (
            <p className="mt-3 text-slate-600">
              Curso atual: <span className="font-semibold text-sky-700">{curso}</span>
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700">Continuar estudando</Button>
            <Button variant="outline" className="border-blue-200">Ver trilha da semana</Button>
          </div>
        </div>
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
          <div className="space-y-3" role="list">
            {pendencias.map((block, i) => (
              <motion.div
                role="listitem"
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
                        className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
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
        </motion.div>
            ))}
      </div>
        </motion.section>
      )}

  {/* Dashboard do usuário */}
  <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
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

      {/* Snapshot semanal + Revisão */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="col-span-1 lg:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Cronograma da Semana</h2>
            <p className="text-sm text-slate-500">Resumo do que está planejado</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
              <p className="text-xs text-slate-600 mb-1">Dias estudados</p>
              <p className="text-2xl font-semibold text-sky-700">{semana.daysStudied}/7</p>
            </div>
            <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4">
              <p className="text-xs text-slate-600 mb-1">Blocos desta semana</p>
              <p className="text-2xl font-semibold text-cyan-700">{semana.concl}/{semana.totalBlocks}</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs text-slate-600 mb-1">Horas somadas</p>
              <p className="text-2xl font-semibold text-blue-700">{Math.floor(semana.minutes/60)}h {semana.minutes%60}min</p>
            </div>
          </div>
        </div>

  {/* Revisão da semana foi movida para a página "/questoes" */}
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
                day: "flex items-center justify-center w-12 h-12 rounded-lg transition-colors text-base font-medium select-none cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30",
                day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                day_today: "border border-blue-400 font-bold",
                day_outside: "text-gray-300 dark:text-gray-600",
                day_disabled: "opacity-40 pointer-events-none",
                nav_button: "rounded-full p-2 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors",
              }}
              showOutsideDays
            />
          </div>
        </div>
      </section>

      {/* Cards de Atividades e Resumo Semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
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
              const dia = plano?.days?.find(d => d.date === formatDateBR(date));
              const blocos = dia?.blocks?.filter(block => {
                const matchesMateria = materiaFiltro ? block.subject === materiaFiltro : true;
                const matchesTipo = tipoFiltro ? normalize(block.activity_type) === normalize(tipoFiltro) : true;
                return matchesMateria && matchesTipo && !block.completed;
              }) || [];

              if (blocos.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p>Nenhuma atividade planejada para este dia</p>
                    <Button
                      variant="link"
                      className="mt-2 text-blue-600 dark:text-blue-400 gap-1"
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
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
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
                          className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50"
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
        </div>
        {/* Card: Resumo Semanal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumo Semanal</h3>
          <div className="grid grid-cols-1 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dias estudados</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{semana.daysStudied}/7</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Horas esta semana</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.floor(semana.minutes/60)}h {semana.minutes%60}min</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tarefas concluídas</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{semana.concl}/{semana.totalBlocks}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

function getProximoSabado(fromDate?: Date) {
  const date = fromDate ? new Date(fromDate) : new Date();
  const day = date.getDay();
  const diff = (6 - day + 7) % 7 || 7; // 6 = sábado
  date.setDate(date.getDate() + diff);
  return date;
}

const normalize = (s: string) => (s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const formatDateBR = (d?: Date) => {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default PainelPage;