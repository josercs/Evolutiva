import { Award } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type SessaoEstudo = {
  id: number;
  dia: string;
  horario: string;
  materia: string;
  conteudo: string;
  feito: boolean;
};

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const HORARIOS = ["09:00", "10:30", "14:00"];

const diasSemanaMap: { [key: number]: string } = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sabado",
};
const hoje = diasSemanaMap[new Date().getDay()];

// Função para converter o plano em trilhas
function converterPlanoParaTrilhas(plano: any): SessaoEstudo[] {
  let id = 1;
  const novoPlano: SessaoEstudo[] = [];
  Object.entries(plano).forEach(([dia, atividades]: [string, any]) => {
    (atividades as any[]).forEach((atividade: any, idx) => {
      let conteudo = "";
      let materia = "";
      let horario = "";
      if (typeof atividade === "string") {
        conteudo = atividade;
        materia = atividade.split(" - ")[0] || "";
        horario = HORARIOS[idx % HORARIOS.length];
      } else {
        conteudo = atividade.atividade || "";
        materia = atividade.atividade?.split(" - ")[0] || "";
        horario = atividade.horario || HORARIOS[idx % HORARIOS.length];
      }
      novoPlano.push({
        id: id++,
        dia: dia.charAt(0).toUpperCase() + dia.slice(1),
        horario,
        materia,
        conteudo,
        feito: false,
      });
    });
  });
  return novoPlano;
}

const TrilhasPage: React.FC = () => {
  const [trilhas, setTrilhas] = useState<SessaoEstudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [semPlano, setSemPlano] = useState(false);
  const navigate = useNavigate();

  // Função para tentar gerar o plano novamente
  const tentarGerarPlano = async () => {
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch("/api/plano-estudo/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (data.plano_estudo) {
        setTrilhas(converterPlanoParaTrilhas(data.plano_estudo));
        setSemPlano(false);
      } else {
        setErro("Não foi possível gerar o plano de estudo.");
      }
    } catch (e) {
      setErro("Erro ao tentar gerar o plano de estudo.");
    }
    setLoading(false);
  };

  // Carrega plano salvo do backend ao abrir a página
  useEffect(() => {
    const fetchPlano = async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await fetch("/api/planos/me", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (!data.plano_estudo) {
          setSemPlano(true);
          setLoading(false);
          return;
        }
        setTrilhas(converterPlanoParaTrilhas(data.plano_estudo));
        setSemPlano(false);
      } catch (e) {
        setErro("Erro ao buscar plano de estudo.");
      }
      setLoading(false);
    };
    fetchPlano();
  }, []);

  // Marcar como feito (opcional: pode salvar no backend se quiser)
  const marcarComoFeito = (id: number) => {
    setTrilhas((prev) => prev.map((t) => (t.id === id ? { ...t, feito: true } : t)));
  };

  const trilhasHoje = trilhas.filter((t) => t.dia === hoje);
  const horariosHoje = Array.from(new Set(trilhasHoje.map(t => t.horario)));

  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Carregando plano de estudo...</div>;

  if (semPlano) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-lg text-gray-700 mb-4">
          Nenhum plano de estudo foi encontrado para sua conta.
        </div>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-indigo-700 transition"
          onClick={tentarGerarPlano}
        >
          Tentar gerar plano de estudo novamente
        </button>
        {erro && <div className="text-red-600 mt-2">{erro}</div>}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full max-w-3xl mx-auto px-2">
        <h1 className="text-3xl font-extrabold mb-6 text-gray-800 tracking-tight text-center">Plano de Estudos</h1>

        {/* Cronograma visual */}
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <span className="text-base font-bold text-gray-900 mb-4 block">Cronograma de Hoje</span>
          <div className="flex flex-col gap-4">
            {horariosHoje.length === 0 ? (
              <div className="text-gray-500">Nenhuma atividade programada para hoje.</div>
            ) : horariosHoje.map((horario) => {
              const sessao = trilhasHoje.find(t => t.horario === horario);
              return (
                <div key={horario} className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-blue-600 w-20">{horario}</span>
                  <div className="flex-1 h-3 rounded-full bg-blue-100 relative overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-500 ${sessao?.feito ? "bg-green-400" : "bg-blue-500"}`}
                      style={{ width: sessao ? "100%" : "0%" }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 ml-2 truncate max-w-[120px]">
                    {sessao ? sessao.materia : "Livre"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plano para Hoje */}
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-3 text-gray-700">Plano para Hoje</h3>
          <div className="space-y-4">
            {trilhasHoje.length === 0 ? (
              <div className="text-gray-500">Nenhuma atividade programada para hoje.</div>
            ) : 
              trilhasHoje.map((sessao) => (
                <div
                  key={sessao.id}
                  className="bg-white rounded-xl shadow flex flex-col md:flex-row items-start md:items-center p-4 gap-4 w-full"
                >
                  <div className="w-20 text-indigo-600 font-bold text-base">{sessao.horario}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 text-sm mb-1">{sessao.materia}</div>
                    <div className="text-gray-600 text-xs mb-1">{sessao.conteudo}</div>
                    <div className="text-gray-400 text-xs">Revisão de conceitos e exercícios práticos</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`border px-3 py-1 rounded font-semibold text-xs
                        ${
                          sessao.feito
                            ? "border-green-600 text-green-600 bg-green-50 cursor-default"
                            : "border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                        }`}
                      disabled={sessao.feito}
                      onClick={() => marcarComoFeito(sessao.id)}
                    >
                      {sessao.feito ? "Feito" : "Iniciar"}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recomendações do Dia */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-4 text-white shadow mb-8">
          <div className="font-sans text-base font-semibold mb-1">Recomendações do Dia</div>
          <ul className="flex gap-4 text-sm flex-wrap">
            <li className="flex items-center gap-1">
              <Award className="text-yellow-300 h-4 w-4" /> Química
            </li>
            {/* Adicione mais recomendações conforme necessário */}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TrilhasPage;