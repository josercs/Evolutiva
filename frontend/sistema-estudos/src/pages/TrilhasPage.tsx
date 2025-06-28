import {
  Award,
  Calendar,
  Clock,
  Target,
  BookOpen,
  CheckCircle,
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
    quiz: <Target className="h-4 w-4 text-blue-600" />,
    default: <Play className="h-4 w-4 text-green-600" />,
  };
  return icons[type] || icons.default;
};

const getActivityColor = (type: string) => {
  const colors: Record<string, string> = {
    review: "from-amber-50 to-amber-100 border-amber-200",
    quiz: "from-blue-50 to-blue-100 border-blue-200",
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
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");
  const cursoId = localStorage.getItem("cursoId");

  useEffect(() => {
    const carregarPlano = async () => {
      setLoadingPlano(true);
      setErro(null);
      try {
        const res = await fetch("/api/planos/me", { credentials: "include" });
        const data = await res.json();
        const plano = data.plano_estudo;
        if (!plano || !Array.isArray(plano.days)) {
          setSemPlano(true);
        } else {
          setPlanoCompleto(plano);
        }
      } catch {
        setErro("Erro ao buscar plano de estudo.");
      } finally {
        setLoadingPlano(false);
      }
    };
    carregarPlano();
  }, []);

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

  const marcarBlocoComoConcluido = (date: string, idx: number) => {
    if (!planoCompleto) return;
    const novoPlano = {
      ...planoCompleto,
      days: planoCompleto.days.map((d) =>
        d.date === date
          ? { ...d, blocks: d.blocks.filter((_, i) => i !== idx) }
          : d
      ),
    };
    setPlanoCompleto(novoPlano);
  };

  const dataHoje = getDataHoje(); // ex: "27/06/2025"
  const atividadesHoje =
    planoCompleto?.days?.find((d) => d.date === dataHoje) || null;

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
  if (semPlano) {
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
                            if (block.id !== undefined && block.id !== null) {
                              navigate(`/conteudo/${block.id}`);
                            } else {
                              alert("Conteúdo não encontrado para este bloco.");
                            }
                          }}
                        >
                          <BookOpen className="h-4 w-4" />
                          <span>Abrir Conteúdo</span>
                        </button>
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
              {planoCompleto.days.map((day) => (
                <div
                  key={day.date}
                  className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-3 py-2">
                    <h3 className="font-semibold text-white text-center text-sm">
                      {day.date}
                    </h3>
                  </div>
                  <div className="p-3">
                    {day.blocks.length === 0 ? (
                      <p className="text-gray-500 text-xs text-center py-3">
                        Sem atividades
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {day.blocks.map((block, idx) => (
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
                              {/* Botão para abrir o conteúdo pelo ID */}
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrilhasPage;
// Sugestão: modularize os blocos visuais em componentes menores futuramente.

