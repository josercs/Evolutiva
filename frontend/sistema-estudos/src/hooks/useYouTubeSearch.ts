import { useCallback, useEffect, useMemo, useState } from 'react';

export type YTVideo = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
};

function buildQuery(topic?: string, materia?: string, keywords?: string[]) {
  const parts = [topic, materia, ...(keywords || [])].filter(Boolean) as string[];
  const q = parts.join(' ').trim();
  return q.length > 0 ? q : 'aula explicativa';
}

export function useYouTubeSearch(params: { apiKey?: string; topic?: string; materia?: string; keywords?: string[] }) {
  const { topic, materia, keywords } = params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<YTVideo | null>(null);

  const query = useMemo(() => buildQuery(topic, materia, keywords), [topic, materia, keywords]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        setVideo(null);
        const res = await fetch(`/api/videos?q=${encodeURIComponent(query)}&maxResults=6`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Falha ao buscar vídeos');
        const data: { videos?: Array<{ id: string; title?: string; channelTitle?: string; thumbnail?: string }>; error?: string } = await res.json();
        if (data.error && !data.videos?.length) {
          if (!cancelled) setError(data.error);
          return;
        }
        const first = data.videos && data.videos[0];
        if (!first) {
          if (!cancelled) setVideo(null);
        } else {
          const v: YTVideo = {
            id: first.id,
            title: first.title || 'Vídeo',
            channel: first.channelTitle || '',
            thumbnail: first.thumbnail || '',
            url: `https://www.youtube.com/watch?v=${first.id}`,
          };
          if (!cancelled) setVideo(v);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Erro na busca');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [query]);

  const openResultsPage = useCallback(() => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener');
  }, [query]);

  return { loading, error, video, query, openResultsPage };
}
