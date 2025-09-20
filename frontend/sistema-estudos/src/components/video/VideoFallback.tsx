import React, { useMemo } from 'react';
import { extractH2HeadingsFromHtml, extractTopicFromHtml } from '../../utils/extractTopics';

type Props = {
  topic?: string;
  materia?: string;
  contentHtml?: string;
  perSection?: number;   // quantos botões por seção
  maxSections?: number;  // limite de seções
  flat?: boolean;        // se true, mostra uma grade única (sem seções)
};

function buildQuery(mainTopic: string, materia?: string, h2?: string) {
  const generic = ['revisão','review','exercícios','exercicios','atividade','atividades','simulado','introdução','introducao','geral'];
  const low = (h2 || '').toLowerCase();
  const isGeneric = generic.some(t => low.includes(t));
  const parts = isGeneric
    ? [mainTopic, materia]
    : [h2, materia, mainTopic];
  return parts.filter(Boolean).join(' ').trim();
}

function ytResultsUrl(q: string) {
  // sp=EgIQAQ%3D%3D ~ filtra por vídeos “longos”/relevantes; pode remover se quiser.
  const sp = 'EgIQAQ%3D%3D';
  const usp = new URLSearchParams({ search_query: q, sp });
  return `https://www.youtube.com/results?${usp.toString()}`;
}

export const VideoFallback: React.FC<Props> = ({
  topic, materia, contentHtml, perSection = 3, maxSections = 8, flat = false
}) => {
  const mainTopic = useMemo(
    () => (topic && topic.trim() ? topic.trim() : extractTopicFromHtml(contentHtml) || 'Aula'),
    [topic, contentHtml]
  );

  const sections = useMemo(() => {
    const h2 = extractH2HeadingsFromHtml(contentHtml, maxSections) || [];
    const uniq = Array.from(new Set(h2.map(s => (s || '').trim()).filter(Boolean)));
    return uniq.length ? uniq.slice(0, maxSections) : [mainTopic];
  }, [contentHtml, mainTopic, maxSections]);

  // lista “plana” (sem seções)
  if (flat) {
    const queries = sections.slice(0, maxSections).map(h => buildQuery(mainTopic, materia, h));
    // remove duplicados
    const seen = new Set<string>();
    const uniq = queries.filter(q => (seen.has(q) ? false : (seen.add(q), true))).slice(0, perSection * Math.max(1, sections.length));

    return (
      <div className="p-4 bg-white/90 dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Vídeos relacionados (modo reserva)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uniq.map((q, i) => (
            <a
              key={i}
              href={ytResultsUrl(q)}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow bg-white/95 dark:bg-gray-900"
            >
              <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 grid place-items-center">
                <span className="text-xs text-indigo-700/80 dark:text-indigo-200/80">Abrir resultados no YouTube</span>
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:underline">
                  {q}
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-red-600 text-white">
                    Ver no YouTube
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // agrupado por seção (cada seção vira um bloco com botões)
  return (
    <div className="p-4 bg-white/90 dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Vídeos por seção (modo reserva)</h3>
      <div className="space-y-6">
        {sections.map((h, idx) => {
          const q = buildQuery(mainTopic, materia, h);
          // cria pequenas variações pra preencher perSection
          const qs = Array.from({ length: Math.max(1, perSection) }).map((_, i) =>
            i === 0 ? q : `${q} ${i + 1}`
          );
          return (
            <div key={`${h}-${idx}`}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{h}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {qs.map((qq, i) => (
                  <a
                    key={i}
                    href={ytResultsUrl(qq)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow bg-white/95 dark:bg-gray-900"
                  >
                    <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 grid place-items-center">
                      <span className="text-xs text-indigo-700/80 dark:text-indigo-200/80">Abrir resultados no YouTube</span>
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:underline">
                        {qq}
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-red-600 text-white">
                          Ver no YouTube
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
