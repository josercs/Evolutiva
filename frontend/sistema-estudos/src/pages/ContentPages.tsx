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

export default function ContentPages() {
  const [conteudos, setConteudos] = useState<ConteudosPorMateria>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conteudos")
      .then((res) => res.json())
      .then((data) => {
        setConteudos(data.conteudos || {});
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
  <main className="relative ml-sidebar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 py-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">
          Conteúdos Salvos por Matéria
        </h1>
        {Object.keys(conteudos).length === 0 ? (
          <div>Nenhum conteúdo salvo.</div>
        ) : (
          Object.entries(conteudos).map(([materia, lista], idx) => (
            <div key={materia} className="mb-8">
              <div className="subject-title font-semibold text-blue-700 text-lg mb-2">
                {materia}{" "}
                <span className="ml-2 text-sm text-gray-500">
                  ({lista.length})
                </span>
              </div>
              <ul className="cards-list">
                {lista.length === 0 ? (
                  <li className="empty">
                    Nenhum conteúdo salvo para esta matéria.
                  </li>
                ) : (
                  lista.map((c) => (
                    <li key={c.id} className="card mb-2">
                      <div className="card-header flex gap-2 items-center">
                        <span className="font-bold">
                          {c.subject} - {c.topic}
                        </span>
                        <span className="date text-xs text-gray-400">
                          {c.created_at}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))
        )}
      </div>
    </main>
  );
}