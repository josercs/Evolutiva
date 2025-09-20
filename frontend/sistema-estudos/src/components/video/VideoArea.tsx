import React, { useEffect, useMemo, useState } from 'react';
import { useYouTubeSearch } from '../../hooks/useYouTubeSearch';
import { extractTopicFromHtml, extractSubtopicsFromHtml } from '../../utils/extractTopics';

export type VideoAreaProps = {
  topic?: string;
  contentHtml?: string;
  materia?: string;
  apiKey?: string; // kept for compatibility but not required now
};

export const VideoArea: React.FC<VideoAreaProps> = ({ topic, contentHtml, materia }) => {
  // Descobre tópico principal
  const mainTopic = useMemo(() => {
    if (topic && topic.trim()) return topic.trim();
    const t = extractTopicFromHtml(contentHtml);
    return t || 'Aula';
  }, [topic, contentHtml]);

  // Subtópicos do HTML
  const subtopics = useMemo(() => extractSubtopicsFromHtml(contentHtml, 6), [contentHtml]);

  const { loading, error, video, openResultsPage, query } = useYouTubeSearch({
    topic: mainTopic,
    materia,
    keywords: subtopics,
  });

  // Overlay: estado e helpers
  const [overlayOpen, setOverlayOpen] = useState(false);

  const extractVideoId = (url?: string) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      // formatos: https://www.youtube.com/watch?v=ID ou https://youtu.be/ID
      if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '') || null;
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      // fallback simples: tenta pegar últimos 11 chars se padrão
      const m = url.match(/[a-zA-Z0-9_-]{11}/g);
      return m ? m[m.length - 1] : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOverlayOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [overlayOpen]);

  const openOverlay = () => {
    const id = extractVideoId(video?.url);
    if (!id) {
      // Sem ID, abre no YouTube como fallback
      window.open(video?.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setOverlayOpen(true);
  };

  return (
    <div className="p-4 bg-white/90 dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Vídeos relacionados</h3>
        {error && <span className="text-xs text-gray-500">{error}</span>}
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Buscando vídeo…</p>
      ) : video ? (
        <div className="flex gap-3 items-start">
          <img src={video.thumbnail} alt={video.title} className="w-40 h-24 object-cover rounded" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{video.title}</h4>
            <p className="text-xs text-gray-500">{video.channel}</p>
            {/* Alterado: abrir em overlay na mesma página */}
            <button
              type="button"
              onClick={openOverlay}
              className="inline-block mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs"
            >
              Assistir agora
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-300">Buscar no YouTube por: <strong>{query}</strong></p>
          <button
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs"
            onClick={openResultsPage}
          >
            Abrir resultados
          </button>
        </div>
      )}

      {/* Overlay de vídeo */}
      {overlayOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={video?.title || 'Reprodução de vídeo'}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => setOverlayOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative mx-4 w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setOverlayOpen(false)}
              className="absolute top-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              ✕
            </button>
            <iframe
              title={video?.title || 'YouTube video'}
              src={
                (() => {
                  const id = extractVideoId(video?.url);
                  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : undefined;
                })()
              }
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};
