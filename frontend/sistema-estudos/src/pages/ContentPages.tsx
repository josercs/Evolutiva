import { useEffect, useState } from "react";

type Conteudo = {
  id: number;
  subject: string;
  topic: string;
  created_at: string;
};

type ConteudosPorMateria = {
  [materia: string]: Conteudo[];
};

const ConteudosPage = () => {
  const [conteudos, setConteudos] = useState<ConteudosPorMateria>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Troque 'localhost' pelo IP da sua máquina na rede local
    fetch("http://192.168.0.109:5000/api/conteudos")
      .then((res) => res.json())
      .then((data) => {
        setConteudos(data.conteudos || {});
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Conteúdos Salvos por Matéria</h1>
      {Object.keys(conteudos).length === 0 ? (
        <div>Nenhum conteúdo salvo.</div>
      ) : (
        Object.entries(conteudos).map(([materia, lista], idx) => (
          <div key={materia} className="mb-8">
            <div className="subject-title font-semibold text-indigo-700 text-lg mb-2">
              {materia} <span className="ml-2 text-sm text-gray-500">({lista.length})</span>
            </div>
            <ul className="cards-list">
              {lista.length === 0 ? (
                <li className="empty">Nenhum conteúdo salvo para esta matéria.</li>
              ) : (
                lista.map((c) => (
                  <li key={c.id} className="card mb-2">
                    <div className="card-header flex gap-2 items-center">
                      <span className="font-bold">{c.subject} - {c.topic}</span>
                      <span className="date text-xs text-gray-400">{c.created_at}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default ConteudosPage;