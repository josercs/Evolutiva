import React, { useEffect, useState } from "react";
import { Award } from "lucide-react";

// Tipos
type Conteudo = {
  id: number;
  materia: string;
  conteudo: string;
};

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

const TrilhasPage: React.FC = () => {
  // Preferências do usuário
  const [materiasDisponiveis, setMateriasDisponiveis] = useState<string[]>([]);
  const [conteudosPorMateria, setConteudosPorMateria] = useState<Record<string, Conteudo[]>>({});
  const [materiasSelecionadas, setMateriasSelecionadas] = useState<string[]>([]);
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([...DIAS_SEMANA]);
  const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>([...HORARIOS]);

  // Cronograma gerado
  const [trilhas, setTrilhas] = useState<SessaoEstudo[]>([]);
  const [filtroDia, setFiltroDia] = useState<string>("");
  const [filtroMateria, setFiltroMateria] = useState<string>("");

  // Carrega matérias e conteúdos do backend
  useEffect(() => {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        const materias = data.courses.map((c: any) => c.materia);
        setMateriasDisponiveis(materias);
        // Busca conteúdos de cada matéria
        Promise.all(
          materias.map((mat: string) =>
            fetch(`/api/conteudo/${encodeURIComponent(mat)}`)
              .then((res) => res.json())
              .then((data) => ({ materia: mat, conteudos: data.conteudos || [] }))
          )
        ).then((result) => {
          const conteudosMap: Record<string, Conteudo[]> = {};
          result.forEach((item) => {
            conteudosMap[item.materia] = item.conteudos;
          });
          setConteudosPorMateria(conteudosMap);
        });
      });
  }, []);

  // Efeito para carregar plano salvo do backend
  const userEmail = localStorage.getItem('userEmail');
  useEffect(() => {
    if (!userEmail) return;
    fetch(`/api/planos?email=${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => setTrilhas(data.plano || []));
  }, [userEmail]);

  // Função para salvar plano no backend
  const salvarPlano = (novoPlano: SessaoEstudo[]) => {
    if (!userEmail) return;
    fetch('/api/planos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, plano: novoPlano })
    });
  };

  // Gera o plano automaticamente ao clicar
  const gerarPlano = () => {
    let id = 1;
    const plano: SessaoEstudo[] = [];
    let idxHorario = 0;
    let idxDia = 0;
    materiasSelecionadas.forEach((mat) => {
      const conteudos = conteudosPorMateria[mat] || [];
      conteudos.forEach((c) => {
        const dia = diasSelecionados[idxDia % diasSelecionados.length];
        const horario = horariosSelecionados[idxHorario % horariosSelecionados.length];
        plano.push({
          id: id++,
          dia,
          horario,
          materia: mat,
          conteudo: c.conteudo,
          feito: false,
        });
        idxHorario++;
        if (idxHorario % horariosSelecionados.length === 0) idxDia++;
      });
    });
    setTrilhas(plano);
    salvarPlano(plano);
  };

  // Marcar como feito
  const marcarComoFeito = (id: number) => {
    const novoPlano = trilhas.map((t) => (t.id === id ? { ...t, feito: true } : t));
    setTrilhas(novoPlano);
    salvarPlano(novoPlano);
  };

  // Filtros (não exibidos, mas prontos para uso futuro)
  const trilhasFiltradas = trilhas.filter(
    (t) =>
      (!filtroDia || t.dia === filtroDia) &&
      (!filtroMateria || t.materia === filtroMateria)
  );

  // Preferências de exemplo (pode ser dinâmico)
  const preferencias = {
    horario: "Manhã",
    foco: "Matemática e Ciências",
  };

  // Dia atual (exemplo: Quinta)
  const hoje = DIAS_SEMANA[new Date().getDay() - 1] || "Quinta";
  const trilhasHoje = trilhas.filter((t) => t.dia === hoje);

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full max-w-[96vw] mx-auto px-2">
        {/* Título */}
        <h1 className="text-3xl font-extrabold mb-4 text-gray-800 tracking-tight">Plano de Estudos</h1>

        {/* Formulário de preferências para gerar plano */}
        <div className="mb-8 p-6 bg-white rounded-2xl shadow flex flex-col gap-4">
          <div>
            <label className="font-semibold">Matérias:</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {materiasDisponiveis.map((mat) => (
                <label key={mat} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={materiasSelecionadas.includes(mat)}
                    onChange={(e) =>
                      setMateriasSelecionadas((prev) =>
                        e.target.checked
                          ? [...prev, mat]
                          : prev.filter((m) => m !== mat)
                      )
                    }
                  />
                  {mat}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="font-semibold">Dias:</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DIAS_SEMANA.map((dia) => (
                <label key={dia} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={diasSelecionados.includes(dia)}
                    onChange={(e) =>
                      setDiasSelecionados((prev) =>
                        e.target.checked
                          ? [...prev, dia]
                          : prev.filter((d) => d !== dia)
                      )
                    }
                  />
                  {dia}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="font-semibold">Horários:</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {HORARIOS.map((h) => (
                <label key={h} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={horariosSelecionados.includes(h)}
                    onChange={(e) =>
                      setHorariosSelecionados((prev) =>
                        e.target.checked
                          ? [...prev, h]
                          : prev.filter((hh) => hh !== h)
                      )
                    }
                  />
                  {h}
                </label>
              ))}
            </div>
          </div>
          <button
            className="mt-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold shadow hover:bg-indigo-700 transition text-sm"
            onClick={gerarPlano}
            disabled={
              materiasSelecionadas.length === 0 ||
              diasSelecionados.length === 0 ||
              horariosSelecionados.length === 0
            }
          >
            Gerar Plano de Estudos
          </button>
        </div>

        {/* Cards para painel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-500 rounded-xl p-4 shadow-lg text-white">
            {/* Conteúdo do card */}
          </div>
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
            <span className="text-sm text-purple-600 font-semibold mb-2">Recomendação do Tutor IA</span>
            <span className="text-base text-gray-900">Revisar Álgebra e fazer 1 simulado hoje.</span>
          </div>
        </div>

        {/* Cronograma visual */}
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <span className="text-base font-bold text-gray-900 mb-4 block">Cronograma de Hoje</span>
          <div className="flex flex-col gap-4">
            {HORARIOS.map((horario) => {
              const sessao = trilhasHoje.find(t => t.horario === horario);
              return (
                <div key={horario} className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-blue-600 w-16">{horario}</span>
                  <div className="flex-1 h-3 rounded-full bg-blue-100 relative">
                    <div
                      className={`absolute left-0 top-0 h-3 rounded-full transition-all duration-500 ${sessao?.feito ? "bg-green-400" : "bg-blue-500"}`}
                      style={{ width: sessao ? "100%" : "0%" }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 ml-2">
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
                  className="bg-white rounded-xl shadow flex items-center p-3 gap-4 w-full"
                  // Adiciona w-full para ocupar quase toda a largura do container pai
                >
                  <div className="w-16 text-indigo-600 font-bold text-base">{sessao.horario}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 text-sm">{sessao.materia} - {sessao.conteudo}</div>
                    <div className="text-gray-500 text-xs">Revisão de conceitos e exercícios práticos</div>
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
                    <button className="border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-100 font-semibold text-xs">Adiar</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recomendações do Dia */}
        <div className="bg-gradient-rainbow rounded-lg p-2 text-white shadow mb-8">
          <div className="font-sans text-base font-semibold mb-1">Recomendações do Dia</div>
          <ul className="flex gap-2 text-sm">
            <li className="flex items-center gap-1">
              <Award className="text-purple-600 h-4 w-4" /> Química
            </li>
            {/* ... */}
          </ul>
        </div>

        {/* Preferências de Estudo */}
        <div className="bg-white rounded-xl shadow p-6">
          <h4 className="font-bold mb-2 text-gray-700">Preferências de Estudo</h4>
          <div className="text-gray-700">
            <div>Horário preferido: <span className="font-semibold">{preferencias.horario}</span></div>
            <div>Foco: <span className="font-semibold">{preferencias.foco}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrilhasPage;