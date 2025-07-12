import {
  Award,
  Calendar,
  Clock,
  Target,
  BookOpen,
  Play,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Tipos para o novo formato do plano avançado
interface StudyBlock {
  id: string | number;
  start_time: string;
  end_time: string;
  activity_type: string;
  subject: string;
  topic: string;
  duration: number;
  priority?: number;
  status?: string;
}

interface DailyPlan {
  date: string;
  blocks: StudyBlock[];
  total_study_time: number;
  focus_area?: string | null;
}

interface WeeklyPlan {
  week_number: number;
  days: DailyPlan[];
  weekly_goals: string[];
  total_hours: number;
  coverage: Record<string, number>;
}

const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const getActivityIcon = (type: string) => {
  const icons: Record<string, JSX.Element> = {
    review: <BookOpen className="h-4 w-4 text-amber-600" />,
    revisão: <BookOpen className="h-4 w-4 text-amber-600" />,
    quiz: <Target className="h-4 w-4 text-blue-600" />,
    simulado: <Target className="h-4 w-4 text-blue-600" />,
    default: <Play className="h-4 w-4 text-green-600" />,
  };
  return icons[type] || icons.default;
};

const getActivityColor = (type: string) => {
  const colors: Record<string, string> = {
    review: "from-amber-50 to-amber-100 border-amber-200",
    revisão: "from-amber-50 to-amber-100 border-amber-200",
    quiz: "from-blue-50 to-blue-100 border-blue-200",
    simulado: "from-blue-50 to-blue-100 border-blue-200",
    default: "from-green-50 to-green-100 border-green-200",
  };
  return colors[type] || colors.default;
};

const getDataHoje = () =>
  new Date().toLocaleDateString("pt-BR"); // "25/06/2025"

const diasMap: Record<string, string> = {
  domingo: "Domingo",
  "segunda-feira": "Segunda",
  "terça-feira": "Terça",
  "quarta-feira": "Quarta",
  "quinta-feira": "Quinta",
  "sexta-feira": "Sexta",
  sábado: "Sábado",
};
const getDiaSemanaHoje = () => {
  const dia = new Date().toLocaleDateString("pt-BR", { weekday: "long" }).toLowerCase();
  return diasMap[dia] || capitalize(dia);
};

const TrilhasPage: React.FC = () => {
  const [planoCompleto, setPlanoCompleto] = useState<WeeklyPlan | null>(null);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [semPlano, setSemPlano] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const navigate = useNavigate();

  // Carregar plano ao montar
  useEffect(() => {
    carregarPlano();
    // eslint-disable-next-line
  }, []);

  const carregarPlano = async () => {
    setLoadingPlano(true);
    setErro(null);
    try {
      const res = await fetch("/api/planos/me", { credentials: "include" });
      const data = await res.json();

      // Garante que o plano é um objeto válido
      let plano = data.plano_estudo;
      if (typeof plano === "string") {
        try {
          plano = JSON.parse(plano);
        } catch (e) {
          console.error("Erro ao parsear plano:", e);
        }
      }

      if (!plano || !Array.isArray(plano.days) || plano.days.length === 0) {
        setPlanoCompleto(null);
        setSemPlano(true);
      } else {
        setPlanoCompleto(plano);
        setSemPlano(false);
      }
    } catch (err) {
      console.error("Erro ao carregar plano:", err);
      setErro("Erro ao buscar plano de estudo.");
      setPlanoCompleto(null);
      setSemPlano(true);
    } finally {
      setLoadingPlano(false);
    }
  };

  const tentarGerarPlano = async () => {
    setGerandoPlano(true);
    setErro(null);
    try {
      const res = await fetch("/api/plano-estudo/gerar", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      const plano = data.plano_estudo;
      if (!plano || !Array.isArray(plano.days)) {
        throw new Error("Plano gerado não contém estrutura esperada");
      }
      setPlanoCompleto(plano);
      setSemPlano(false);
    } catch (e: any) {
      setErro(
        "Falha ao gerar plano: " +
          (e instanceof Error ? e.message : "Erro desconhecido")
      );
    } finally {
      setGerandoPlano(false);
    }
  };

  async function atualizarStatusBloco(date: string, blockIndex: number, blockId: string | number, status: string) {
    setAtualizandoStatus(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await fetch("/api/planos/atualizar-status-bloco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: user.email,
          date,
          blockIndex,
          id: blockId,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar status");
      }

      setPlanoCompleto(prev => {
        if (!prev) return null;
        const updatedDays = prev.days.map(day => {
          if (day.date === date) {
            const updatedBlocks = [...day.blocks];
            if (updatedBlocks[blockIndex]) {
              updatedBlocks[blockIndex] = {
                ...updatedBlocks[blockIndex],
                status
              };
            }
            return { ...day, blocks: updatedBlocks };
          }
          return day;
        });
        return { ...prev, days: updatedDays };
      });

      await carregarPlano();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setErro("Erro ao atualizar status do bloco. Recarregando...");
      await carregarPlano();
    } finally {
      setAtualizandoStatus(false);
    }
  }

  const handleOpenContentSafe = (id: string | number) => {
    try {
      if (id === undefined || id === null || id === '') {
        alert("ID do conteúdo inválido ou não disponível");
        return;
      }
      const contentId = typeof id === 'number' ? id.toString() : id;
      if (!String(contentId).match(/^[a-zA-Z0-9-_]+$/)) {
        alert("Formato de ID inválido");
        return;
      }
      navigate(`/conteudo/${contentId}`);
    } catch (error) {
      console.error("Erro ao abrir conteúdo:", error);
      alert("Ocorreu um erro ao tentar abrir o conteúdo");
    }
  };

  const dataHoje = getDataHoje();
  const atividadesHoje =
    planoCompleto?.days?.find((d) => d.date === dataHoje) || null;

  console.log("Atividades de hoje:", atividadesHoje);
  // Função para pegar os conteúdos da semana para o simulado
  function getConteudosParaSimulado(weekDays: DailyPlan[]) {
    return weekDays
      .flatMap(day =>
        day.blocks.filter(
          block =>
            block.activity_type !== "simulado" &&
            block.activity_type !== "revisão" &&
            block.activity_type !== "review"
        )
      )
      .map(block => block.id);
  }

  // === LOADING ===
  if (loadingPlano) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">
            Carregando seu plano de estudo...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Preparando sua jornada de aprendizado
          </p>
        </div>
      </div>
    );
  }

  // === SEM PLANO ===
  if (!planoCompleto || !Array.isArray(planoCompleto.days) || planoCompleto.days.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Award className="h-10 w-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Vamos começar sua jornada!
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Ainda não encontramos seu plano de estudo personalizado. Que tal
              criarmos um agora mesmo?
            </p>
            <button
              onClick={tentarGerarPlano}
              disabled={gerandoPlano}
              className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                gerandoPlano
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl"
              }`}
            >
              {gerandoPlano ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Gerando seu plano...
                </div>
              ) : (
                "Gerar Plano de Estudo"
              )}
            </button>
            {erro && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{erro}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === PLANO EXISTENTE ===
  return (
    <div className="max-w-3xl mx-auto py-8 px-2">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-3 shadow">
            <Calendar className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
            Seu Plano de Estudos
          </h1>
          <p className="text-gray-600 text-base">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </header>

        {/* Card único de Revisões Agendadas para a semana */}
        

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna Principal - Cronograma do Dia */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Cronograma de Hoje
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                {!atividadesHoje || atividadesHoje.blocks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <Calendar className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-base">
                      Nenhuma atividade programada para hoje
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Aproveite para descansar ou revisar conteúdos anteriores
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {atividadesHoje.blocks.map((block, idx) => (
                      <div
                        key={idx}
                        className={`bg-gradient-to-r ${getActivityColor(
                          block.activity_type
                        )} border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 hover:shadow`}
                      >
                        <div className="flex items-center space-x-2 flex-1 w-full">
                          {getActivityIcon(block.activity_type)}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded">
                                {block.start_time} - {block.end_time}
                              </span>
                              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                {block.duration}min
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {block.subject}
                            </h3>
                            <p className="text-gray-700 text-xs">
                              {block.topic}
                            </p>
                            <span className="inline-block mt-1 text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                              {block.activity_type}
                            </span>
                          </div>
                        </div>
                        {/* Botão para abrir o conteúdo pelo ID */}
                        <button
                          className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 font-medium text-xs"
                          onClick={() => {
                            // Checagem reforçada para revisões
                            if (
                              (block.activity_type === "revisão" || block.activity_type === "review") &&
                              (!block.id || block.id === "" || block.id === null)
                            ) {
                              alert("Este bloco de revisão não possui conteúdo vinculado corretamente.");
                              return;
                            }
                            if (block.id !== undefined && block.id !== null && block.id !== "") {
                              navigate(`/conteudo/${block.id}`);
                            } else {
                              alert("Conteúdo não encontrado para este bloco.");
                            }
                          }}
                        >
                          <BookOpen className="h-4 w-4" />
                          <span>Abrir Conteúdo</span>
                        </button>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => atualizarStatusBloco(dataHoje, idx, block.id, "ok")}>✅ Fácil</button>
                          <button
                            onClick={() => atualizarStatusBloco(dataHoje, idx, block.id, "dificuldade")}
                            disabled={atualizandoStatus}
                            className={atualizandoStatus ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            {atualizandoStatus ? "Atualizando..." : "⚠️ Dúvida"}
                          </button>
                          <button onClick={() => atualizarStatusBloco(dataHoje, idx, block.id, "pendente")}>❌ Não consegui</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Metas da Semana */}
          <div className="flex flex-col gap-4">
            {planoCompleto?.weekly_goals && (
              <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
                  <h2 className="text-base font-semibold text-white flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Metas da Semana
                  </h2>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {planoCompleto.weekly_goals.map((goal, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <div className="bg-green-100 rounded-full p-1 mt-0.5">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        </div>
                        <p className="text-gray-700 text-xs leading-relaxed">
                          {goal}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cronograma Semanal */}
        {planoCompleto?.days && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-indigo-600" />
              Cronograma Semanal Completo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {planoCompleto.days.map((day, idx) => {
                // Simulados marcados pelo usuário
                const simulados = day.blocks.filter(
                  (block) =>
                    block.activity_type === "simulado" &&
                    typeof block.id === "number" && block.id > 0
                );
                // Outros blocos (não revisão nem simulado marcado pelo usuário)
                const outros = day.blocks.filter(
                  (block) =>
                    !(
                      ((block.activity_type === "revisão" || block.activity_type === "review") && typeof block.id === "number" && block.id > 0) ||
                      (block.activity_type === "simulado" && typeof block.id === "number" && block.id > 0)
                    )
                );

                const isLastDay = idx === planoCompleto.days.length - 1;

                return (
                  <div key={day.date} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-3 py-2">
                      <h3 className="font-semibold text-white text-center text-sm">
                        {day.date}
                      </h3>
                    </div>
                    <div className="p-3">
                      {/* Card de Simulados Agendados */}
                      {simulados.length > 0 && (
                        <div className="mb-3 border-2 border-blue-400 bg-gradient-to-br from-blue-100 to-white rounded-xl p-3 shadow-lg relative">
                          <div className="absolute -top-3 left-3 bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow">
                            Simulado
                          </div>
                          <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center">
                            <Target className="h-4 w-4 mr-1" /> Simulados Agendados
                          </h4>
                          <div className="space-y-2">
                            {simulados.map((block, idx) => (
                              <div
                                key={`sim-${idx}`}
                                className={`bg-gradient-to-r ${getActivityColor(
                                  block.activity_type
                                )} border rounded p-2`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-2">
                                    {getActivityIcon(block.activity_type)}
                                    <span className="font-mono text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded">
                                      {block.start_time}-{block.end_time}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                    {block.duration}min
                                  </span>
                                </div>
                                <h4 className="font-semibold text-gray-900 text-xs">
                                  {block.subject}
                                </h4>
                                <p className="text-gray-700 text-xs mb-1">
                                  {block.topic}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                                    {block.activity_type}
                                  </span>
                                  <button
                                    className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-1"
                                    onClick={() => {
                                      if (block.id !== undefined && block.id !== null) {
                                        navigate(`/conteudo/${block.id}`);
                                      } else {
                                        alert("Conteúdo não encontrado para este bloco.");
                                      }
                                    }}
                                  >
                                    <BookOpen className="h-3 w-3" />
                                    <span>Abrir Conteúdo</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Botão para criar simulado */}
                          <button
                            className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
                            onClick={() => {
                              // Gera simulado com os conteúdos da semana
                              const conteudosSemana = getConteudosParaSimulado(planoCompleto.days);
                              if (conteudosSemana.length === 0) {
                                alert("Não há conteúdos suficientes para gerar um simulado esta semana.");
                                return;
                              }
                              // Redireciona para a tela de simulado, passando os IDs dos conteúdos
                              navigate('/simulados/criar', { state: { conteudos: conteudosSemana } });
                            }}
                          >
                            + Criar Novo Simulado da Semana
                          </button>
                        </div>
                      )}

                      {/* Outros blocos */}
                      {outros.length === 0 && simulados.length === 0 ? (
                        <>
                          <p className="text-gray-500 text-xs text-center py-3">
                            Sem atividades
                          </p>
                          {/* Botão de simulado só no último dia da semana e se estiver vazio */}
                          {isLastDay && (
                            <button
                              className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
                              onClick={() => {
                                const conteudosSemana = getConteudosParaSimulado(planoCompleto.days);
                                if (conteudosSemana.length === 0) {
                                  alert("Não há conteúdos suficientes para gerar um simulado esta semana.");
                                  return;
                                }
                                navigate('/simulados/criar', { state: { conteudos: conteudosSemana } });
                              }}
                            >
                              Criar Simulado 
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          {outros.map((block, idx) => (
                            <div
                              key={idx}
                              className={`bg-gradient-to-r ${getActivityColor(
                                block.activity_type
                              )} border rounded p-2`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  {getActivityIcon(block.activity_type)}
                                  <span className="font-mono text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded">
                                    {block.start_time}-{block.end_time}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                  {block.duration}min
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 text-xs">
                                {block.subject}
                              </h4>
                              <p className="text-gray-700 text-xs mb-1">
                                {block.topic}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                                  {block.activity_type}
                                </span>
                                <button
                                  className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-1"
                                  onClick={() => {
                                    if (block.id !== undefined && block.id !== null) {
                                      navigate(`/conteudo/${block.id}`);
                                    } else {
                                      alert("Conteúdo não encontrado para este bloco.");
                                    }
                                  }}
                                >
                                  <BookOpen className="h-3 w-3" />
                                  <span>Abrir Conteúdo</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Botão de simulado só no último dia da semana */}
                    {isLastDay && (
                      <button
                        className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
                        onClick={() => {
                          const conteudosSemana = getConteudosParaSimulado(planoCompleto.days);
                          if (conteudosSemana.length === 0) {
                            alert("Não há conteúdos suficientes para gerar um simulado esta semana.");
                            return;
                          }
                          navigate('/simulados/criar', { state: { conteudos: conteudosSemana } });
                        }}
                      >
                        Criar Simulado 
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrilhasPage;
// Sugestão: modularize os blocos visuais em componentes menores futuramente.



