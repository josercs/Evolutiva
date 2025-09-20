import React from "react";

type ConteudoMapa = {
  topic: string;
  related_topics: string[];
  subtopics: Record<string, string[]>;
};

export const MapaMental: React.FC<{ conteudo: ConteudoMapa | null | undefined }> = ({ conteudo }) => {
  if (!conteudo) return null;

  return (
    <div className="flex flex-col items-center my-8 w-full overflow-x-auto">
      {/* Nó central */}
      <div className="bg-sky-600 text-white rounded-xl font-bold text-2xl px-8 py-4 mb-8 shadow">
        {conteudo.topic}
      </div>
      {/* Ramificações */}
      <div className="flex flex-row gap-10 w-full justify-center">
  {conteudo.related_topics.map((topic: string) => (
          <div key={topic} className="flex flex-col items-center min-w-[180px] max-w-[220px]">
            <div className="bg-sky-100 text-sky-800 rounded-lg font-bold px-4 py-2 mb-2 text-base shadow text-center">
              {topic}
            </div>
            <ul className="list-none p-0 m-0">
              {(conteudo.subtopics[topic] || [])
                .slice(0, 7)
                .map((sub: string, i: number) => (
                  <li key={i} className="bg-yellow-100 text-amber-700 my-1 rounded-md px-2.5 py-1 text-sm text-center shadow-sm overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
                    {sub.length > 40 ? sub.slice(0, 37) + "..." : sub}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};