// filepath: d:\Projetos\sistema_estudos_core\frontend\sistema-estudos\src\components\video\VideoGridArea.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { extractH2HeadingsFromHtml, extractTopicFromHtml } from '../../utils/extractTopics';

type VideoItem = {
  id: string;
  title?: string;
  channelTitle?: string;
  thumbnail?: string;
};

// Cache simples por sessão (15 min)
const CACHE_TTL_MS = 15 * 60 * 1000;
const _vidCache = new Map<string, { ts: number; items: VideoItem[] }>();
const getCache = (q: string, max: number) => {
  const k = `${q}|${max}`;
  const c = _vidCache.get(k);
  if (c && Date.now() - c.ts < CACHE_TTL_MS) return c.items;
  return null;
};
const setCache = (q: string, max: number, items: VideoItem[]) => {
  _vidCache.set(`${q}|${max}`, { ts: Date.now(), items });
};

// Preferência de UI
const COMPACT_STORAGE_KEY = 'se_videos_compact_v1';

// Adiciona chave de persistência de vídeos vistos
const WATCHED_STORAGE_KEY = 'se_videos_watched_v1';

type Props = {
  topic?: string;
  materia?: string;
  contentHtml?: string;
  
  fallbackLink?: string;
  /** se true, mostra uma única grade com todos os vídeos (sem agrupar por seção) */
  flatGrid?: boolean;
  /** quantos vídeos por seção (ou total, se flatGrid=true) */
  perSection?: number;
  /** inicia em modo compacto (menos informação visual) */
  compactDefault?: boolean;
};

export function VideoGridArea({ topic, materia, contentHtml, flatGrid = false, perSection = 3, fallbackLink, compactDefault = true }: Props) {
  // Tópico principal
  const mainTopic = useMemo(
    () => (topic && topic.trim() ? topic.trim() : extractTopicFromHtml(contentHtml) || 'Aula'),
    [topic, contentHtml]
  );

  // Seções (H2) normalizadas; se vazio, usa o tópico principal
  const rawHeadings = useMemo(() => extractH2HeadingsFromHtml(contentHtml, 8) || [], [contentHtml]);
  const sections = useMemo(() => {
    const uniq = Array.from(new Set(rawHeadings.map(h => (h || '').trim()).filter(Boolean)));
    return (uniq.length ? uniq.slice(0, 8) : [mainTopic]).map(s => s || mainTopic);
  }, [rawHeadings, mainTopic]);

  // Estados chaveados pelo NOME da seção (estável), não pelo índice
  const [results, setResults] = useState<Record<string, VideoItem[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [showCountMap, setShowCountMap] = useState<Record<string, number>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});

  // NOVO: controle de "vistos"
  const [watched, setWatched] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHED_STORAGE_KEY);
      if (raw) setWatched(JSON.parse(raw));
    } catch {}
  }, []);
  const toggleWatched = useCallback((id: string) => {
    setWatched(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // NOVO: estado do player (iframe)
  const [player, setPlayer] = useState<{ id: string; title?: string } | null>(null);
  const modalStateRef = useRef(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Fechar player (ESC, overlay, botÃ£o, voltar do navegador)
  const closePlayer = useCallback(() => {
    setPlayer(null);
    try {
      if (modalStateRef.current) {
        modalStateRef.current = false;
        // volta um passo do histÃ³rico criado ao abrir
        if (window.history.state?.player) {
          window.history.back();
        }
      }
    } catch {}
  }, []);

  // Abrir player e criar um estado no histÃ³rico
  const openPlayer = useCallback((v: VideoItem) => {
    setPlayer({ id: v.id, title: v.title });
    try {
      window.history.pushState({ player: true }, '', window.location.href); // cria entrada para permitir "Voltar"
      modalStateRef.current = true;
    } catch {}
  }, []);

  // Fechar com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePlayer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePlayer]);

  // Fechar ao usar o botÃ£o "Voltar" do navegador
  useEffect(() => {
    const onPop = () => { if (player) setPlayer(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [player]);

  // Bloquear scroll enquanto o modal estÃ¡ aberto
  useEffect(() => {
    if (!player) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [player]);

  // Foca no botÃ£o fechar ao abrir o modal (acessibilidade)
  useEffect(() => {
    if (player) setTimeout(() => closeBtnRef.current?.focus(), 0);
  }, [player]);

  // PreferÃªncia: modo compacto (persistido)
  const [compact, setCompact] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(COMPACT_STORAGE_KEY);
      if (raw === '0' || raw === '1') return raw === '1';
    } catch {}
    return !!compactDefault;
  });
  useEffect(() => {
    try { localStorage.setItem(COMPACT_STORAGE_KEY, compact ? '1' : '0'); } catch {}
  }, [compact]);

  // Fallback: chave cliente (opcional)
  const CLIENT_YT_KEY: string | undefined = (import.meta as any)?.env?.VITE_YT_API_KEY;

  // Monta query evitando termos genÃ©ricos e reduzindo ruÃ­do/tamanho
  const genericTerms = ['revisão','review','exercícios','exercicios','atividade','atividades','simulado','introdução','introducao','geral'];
  const buildQuery = (h: string) => {
    const normalized = (h || '')
      .replace(/^[a-z]\s+/iu, '')             // NOVO: remove prefixo alfabÃ©tico "a ", "b ", ...
      .replace(/\b\d+\s*[\.\)]?/g, '')        // remove enumeraÃ§Ãµes "1.", "2)"
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')      // remove pontuaÃ§Ã£o
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const isGeneric = genericTerms.some(t => normalized.includes(t));
    const parts = isGeneric ? [mainTopic, materia] : [normalized, materia, mainTopic];
    return parts.filter(Boolean).join(' ').slice(0, 100);
  };

  // Helper para formatar cabeçalho da seção (prefixo + título limpo)
  const formatSectionHeader = (raw: string, idx: number) => {
    const s = (raw || '').trim();

    // 1) tenta extrair prefixo alfabÃ©tico "a TÃ­tulo"
    const mAlpha = s.match(/^\s*([a-zA-Z])\s+(.+)$/);
    if (mAlpha) {
      return { prefix: mAlpha[1].toLowerCase(), title: mAlpha[2].trim() };
    }

    // 2) tenta extrair prefixo numÃ©rico "1. TÃ­tulo" ou "2) TÃ­tulo"
    const mNum = s.match(/^\s*(\d+)[\.\)]\s*(.+)$/);
    if (mNum) {
      const n = Number(mNum[1]);
      const letter = String.fromCharCode(97 + ((Number.isFinite(n) ? n - 1 : idx) % 26));
      return { prefix: letter, title: (mNum[2] || '').trim() || s };
    }

    // 3) fallback: gera letra pelo Ã­ndice
    const letter = String.fromCharCode(97 + (idx % 26));
    return { prefix: letter, title: s };
  };

  async function fetchJSON(input: RequestInfo, init?: RequestInit) {
    try {
      const res = await fetch(input, init);
      const json = await res.json().catch(() => null);
      return { ok: res.ok, json };
    } catch {
      return { ok: false, json: null as any };
    }
  }

  // Helper com timeout para evitar ficar preso em requisiÃ§Ãµes lentas
  async function fetchJSONWithTimeout(input: RequestInfo, init?: RequestInit, timeoutMs = 3500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      const json = await res.json().catch(() => null);
      return { ok: res.ok, json };
    } catch {
      return { ok: false, json: null as any };
    } finally {
      clearTimeout(id);
    }
  }

  // Preferir YouTube direto (se VITE_YT_API_KEY estiver definida); backend vira fallback.
  async function fetchFromYouTube(q: string, maxResults = 3): Promise<VideoItem[]> {
    if (!CLIENT_YT_KEY) return [];
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    u.searchParams.set('key', CLIENT_YT_KEY);
    u.searchParams.set('part', 'snippet');
    u.searchParams.set('type', 'video');
    u.searchParams.set('q', q);
    u.searchParams.set('maxResults', String(Math.max(1, Math.min(maxResults, 6))));
    u.searchParams.set('regionCode', 'BR');
    u.searchParams.set('relevanceLanguage', 'pt');
    const resp = await fetchJSON(u.toString());
    if (!resp.ok) return []; // 403/forbidden: ignora e deixa o backend responder
    const items = Array.isArray(resp.json?.items) ? (resp.json.items as any[]) : [];
    return items.map((it) => {
      const vid = it?.id?.videoId;
      const sn = it?.snippet || {};
      const thumb = sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || '';
      return vid ? ({ id: vid, title: sn.title, channelTitle: sn.channelTitle, thumbnail: thumb } as VideoItem) : null;
    }).filter(Boolean) as VideoItem[];
  }

  // Fallback YouTube direto com timeout curto
  async function fetchYouTubeDirect(q: string, maxResults = 3, timeoutMs = 3500): Promise<VideoItem[]> {
    if (!CLIENT_YT_KEY) return [];
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    u.searchParams.set('key', CLIENT_YT_KEY);
    u.searchParams.set('part', 'snippet');
    u.searchParams.set('type', 'video');
    u.searchParams.set('q', q);
    u.searchParams.set('maxResults', String(Math.max(1, Math.min(maxResults, 6))));
    u.searchParams.set('regionCode', 'BR');
    u.searchParams.set('relevanceLanguage', 'pt');
    const resp = await fetchJSONWithTimeout(u.toString(), undefined, timeoutMs);
    if (!resp.ok || !Array.isArray(resp.json?.items)) return [];
    return (resp.json.items as any[]).map((it) => {
      const vid = it?.id?.videoId;
      const sn = it?.snippet || {};
      const thumb = sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || '';
      return vid ? ({ id: vid, title: sn.title, channelTitle: sn.channelTitle, thumbnail: thumb } as VideoItem) : null;
    }).filter(Boolean) as VideoItem[];
  }

  // Backend robusto: tenta duas rotas e mÃºltiplos formatos de resposta
  async function fetchFromBackend(q: string, maxResults = 3): Promise<VideoItem[]> {
    const qs = `q=${encodeURIComponent(q)}&maxResults=${encodeURIComponent(String(maxResults))}`;

    let resp = await fetchJSON(`/api/videos?${qs}`, { credentials: 'include' });
    if (!resp.ok || !resp.json) {
      resp = await fetchJSON(`/api/videos/search?${qs}`, { credentials: 'include' });
    }
    if (!resp.ok || !resp.json) return [];

    const j = resp.json;
    const arr = Array.isArray(j) ? j
      : Array.isArray(j.videos) ? j.videos
      : Array.isArray(j.results) ? j.results
      : Array.isArray(j.items) ? j.items
      : null;

    if (arr) {
      const mapped = (arr as any[]).map((it) => {
        // aceita: id string, id.videoId, id.video_id, videoId, video_id, url (v= ou youtu.be)
        const fromString = typeof it?.id === 'string' ? (it.id.match(/[a-zA-Z0-9_-]{11}/)?.[0] || it.id) : '';
        const id =
          fromString ||
          it?.id?.videoId ||
          it?.id?.video_id ||
          it?.videoId ||
          it?.video_id ||
          it?.url?.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1] ||
          it?.url?.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1];

        const sn = it?.snippet || {};
        const title = (it?.title ?? sn?.title ?? it?.name) as string | undefined;
        const channelTitle = (it?.channelTitle ?? sn?.channelTitle ?? it?.channel) as string | undefined;

        let thumbnail =
          it?.thumbnail ??
          it?.thumb ??
          sn?.thumbnails?.high?.url ??
          sn?.thumbnails?.medium?.url ??
          sn?.thumbnails?.default?.url ??
          undefined;

        if (!thumbnail && id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
          // fallback gerado pelo prÃ³prio YouTube
          thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        }

        return id ? ({ id, title, channelTitle, thumbnail } as VideoItem) : null;
      }).filter(Boolean) as VideoItem[];

      if (mapped.length === 0 && (import.meta as any)?.env?.DEV) {
        // ajuda a identificar o formato real retornado pelo backend
        // eslint-disable-next-line no-console
        console.debug('api/videos sem itens parseÃ¡veis. Resposta:', j);
      }
      return mapped;
    }

    if (j?.id) {
      const id =
        (typeof j.id === 'string' ? (j.id.match(/[a-zA-Z0-9_-]{11}/)?.[0] || j.id) : (j.id?.videoId || j.id?.video_id)) || '';
      const sn = j?.snippet || {};
      let thumbnail = j.thumb || j.thumbnail || sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url;
      if (!thumbnail && id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
        thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      }
      return [{ id, title: j.title || sn?.title, channelTitle: j.channelTitle || sn?.channelTitle, thumbnail }].filter(v => v.id);
    }
    return [];
  }

  // Backend em lote com fallback para cliente por seÃ§Ã£o vazia (com cache em memÃ³ria)
  async function fetchBatchFromBackend(queries: Array<{ key: string; q: string; maxResults: number }>, timeoutMs = 3500) {
    // 1) cache local
    const results: Record<string, VideoItem[]> = {};
    const toFetch: Array<{ key: string; q: string; maxResults: number }> = [];
    for (const q of queries) {
      const c = getCache(q.q, q.maxResults);
      if (c) results[q.key] = c;
      else toFetch.push(q);
    }

    // 2) chama backend apenas para o que faltou
    if (toFetch.length) {
      const resp = await fetchJSONWithTimeout(
        '/api/videos/batch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ queries: toFetch }),
        },
        timeoutMs
      );
      if (resp.ok && resp.json?.results) {
        for (const q of toFetch) {
          const arr = (resp.json.results[q.key] || []) as VideoItem[];
          results[q.key] = arr;
          setCache(q.q, q.maxResults, arr);
        }
      } else {
        for (const q of toFetch) results[q.key] = [];
      }
    }

    // 3) fallback cliente para vazios
    const empties = CLIENT_YT_KEY
      ? queries.filter(q => (results[q.key] || []).length === 0)
      : [];
    if (empties.length) {
      const chunk = await Promise.all(empties.map(async q => {
        const items = await fetchYouTubeDirect(q.q, q.maxResults, timeoutMs);
        return { key: q.key, q: q.q, max: q.maxResults, items };
      }));
      for (const c of chunk) {
        results[c.key] = c.items;
        setCache(c.q, c.max, c.items);
      }
    }

    return results;
  }

  // chave das seÃ§Ãµes para dependÃªncia estÃ¡vel
  const sectionsKey = useMemo(() => sections.join('||'), [sections]);

  useEffect(() => {
    let cancelled = false;

    // Inicializa estados por seÃ§Ã£o
    const initLoad: Record<string, boolean> = {};
    const initRes: Record<string, VideoItem[]> = {};
    const initErr: Record<string, string> = {};
    const initShow: Record<string, number> = {};
    const initMore: Record<string, boolean> = {};
    sections.forEach((sec) => {
      initLoad[sec] = true;
      initRes[sec] = [];
      initErr[sec] = '';
      initShow[sec] = Math.max(1, perSection);
      initMore[sec] = false;
    });
    setLoadingMap(initLoad);
    setResults(initRes);
    setErrorMap(initErr);
    setShowCountMap(initShow);
    setLoadingMore(initMore);

    const MAX_RESULTS = Math.max(1, perSection);
    const queries = sections.map((sec) => ({
      key: sec,
      q: buildQuery(sec),
      maxResults: MAX_RESULTS,
    }));

    (async () => {
      const CHUNK_SIZE = 3;
      let firstPaint = false;

      for (let i = 0; i < queries.length; i += CHUNK_SIZE) {
        if (cancelled) break;
        const chunk = queries.slice(i, i + CHUNK_SIZE);

        try {
          const batch = await fetchBatchFromBackend(chunk, 3000);
          if (cancelled) break;

          setResults(prev => ({ ...prev, ...batch }));
          setLoadingMap(prev => {
            const next = { ...prev };
            for (const q of chunk) next[q.key] = false;
            return next;
          });
          setErrorMap(prev => {
            const next = { ...prev };
            for (const q of chunk) next[q.key] = (batch[q.key] || []).length ? '' : 'Sem resultados';
            return next;
          });

          if (!firstPaint) {
            firstPaint = true; // primeira pintura parcial jÃ¡ ocorreu
          }
        } catch (e: any) {
          setLoadingMap(prev => {
            const next = { ...prev };
            for (const q of chunk) next[q.key] = false;
            return next;
          });
          setErrorMap(prev => {
            const next = { ...prev };
            for (const q of chunk) next[q.key] = e?.message || 'Erro';
            return next;
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sectionsKey, materia, mainTopic, perSection]);

  // NOVO: buscar mais itens para uma seÃ§Ã£o especÃ­fica (atÃ© 6)
  const showMoreForSection = useCallback(async (sec: string) => {
    const STEP = Math.max(1, perSection);
    const current = showCountMap[sec] ?? STEP;
    const next = Math.min(current + STEP, 6);
    if (next === current) return;

    // se jÃ¡ temos itens suficientes no estado, sÃ³ aumenta o contador
    if ((results[sec]?.length || 0) >= next) {
      setShowCountMap((m) => ({ ...m, [sec]: next }));
      return;
    }

    // precisa buscar mais
    try {
      setLoadingMore((m) => ({ ...m, [sec]: true }));
      const q = buildQuery(sec);
      let items = await fetchFromBackend(q, next);
      if (CLIENT_YT_KEY && items.length < next) {
        const direct = await fetchYouTubeDirect(q, next, 3500);
        if (direct.length > items.length) items = direct;
      }
      setResults((prev) => ({ ...prev, [sec]: items }));
      setShowCountMap((m) => ({ ...m, [sec]: Math.min(items.length, next) }));
    } finally {
      setLoadingMore((m) => ({ ...m, [sec]: false }));
    }
  }, [results, showCountMap, perSection]);

  // Modo grade plana: junta tudo
  const flatList: VideoItem[] = useMemo(() => {
    if (!flatGrid) return [];
    const all: VideoItem[] = [];
    for (const sec of sections) {
      const arr = results[sec] || [];
      for (const v of arr) {
        if (!all.find(x => x.id === v.id)) all.push(v);
      }
    }
    return all.slice(0, perSection * Math.max(1, sections.length));
  }, [flatGrid, results, sections, perSection]);

  // UI
  return (
    <div className="p-4 bg-white/90 dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
      {/* Header global sticky */}
      <div
        className="sticky top-14 z-30 -m-4 px-4 py-2 mb-3
                   bg-white/80 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60
                   border-b border-gray-200 dark:border-gray-700 rounded-t-2xl flex items-center justify-between"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {flatGrid ? 'Vídeos recomendados' : 'Vídeos por seção'}
        </h3>

        <div className="flex items-center gap-2">
          {!flatGrid && (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Pressione ESC para fechar o player
            </span>
          )}
          <button
            type="button"
            onClick={() => setCompact(v => !v)}
            className="text-[11px] sm:text-xs px-2.5 py-1 rounded-md border
                       bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/60 dark:hover:bg-gray-700
                       text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600"
            title="Alternar modo compacto"
          >
            {compact ? 'Modo compacto: on' : 'Modo compacto: off'}
          </button>
        </div>
      </div>

      {flatGrid ? (
        // ---------- GRID PLANA ----------
        (() => {
          const isLoading = sections.some(sec => loadingMap[sec]);
          if (isLoading && flatList.length === 0) {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded mt-3" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded mt-2 w-2/3" />
                  </div>
                ))}
              </div>
            );
          }
          if (flatList.length === 0) {
            return (
              <div className="flex items-center justify-between border rounded-lg p-3 border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Nenhum vídeo encontrado para este conteúdo.
                </p>
                <a
                  className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(mainTopic + ' ' + (materia || ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver no YouTube
                </a>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {flatList.map((v) => (
                <a
                  key={v.id}
                  href={`https://www.youtube.com/watch?v=${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.preventDefault(); openPlayer(v); }}   // NOVO: abre iframe
                  className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow"
                >
                  <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700">
                    {v.thumbnail && <img src={v.thumbnail} alt={v.title || ''} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:underline">
                      {v.title}
                    </div>
                    {v.channelTitle && <div className="text-xs text-gray-500 mt-1">{v.channelTitle}</div>}
                  </div>
                </a>
              ))}
            </div>
          );
        })()
      ) : (
        // ---------- AGRUPADO POR SEÇÃO ----------
        <div className="space-y-6">
          {sections.map((sec, idx) => {
            const vids = results[sec] || [];
            const loading = !!loadingMap[sec];
            const err = errorMap[sec];
            const { prefix, title } = formatSectionHeader(sec, idx);

            // NOVO: progresso por seÃ§Ã£o (considera apenas os visÃ­veis)
            const visibleCount = Math.max(1, showCountMap[sec] ?? perSection);
            const watchedCount = vids.slice(0, visibleCount).reduce((acc, v) => acc + (watched[v.id] ? 1 : 0), 0);

            return (
              <div key={sec} className="pt-6 border-t border-gray-200 dark:border-gray-700">
                {/* CabeÃ§alho estilizado da seÃ§Ã£o */}
                <div
                  className="md:sticky md:top-16 z-10 -mx-2 px-2 py-2 rounded-xl
                             bg-white/70 dark:bg-gray-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60
                             flex items-center gap-3 sm:gap-4 mb-3"
                >
                  <span
                    aria-hidden
                    className="inline-grid place-items-center w-7 h-7 rounded-lg text-xs font-extrabold text-white
                               bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm select-none"
                  >
                    {prefix}
                  </span>
                  <h4 className="m-0 text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {title}
                  </h4>

                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">
                      {watchedCount}/{visibleCount} vistos
                    </span>
                    {!compact && (
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(buildQuery(sec))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] sm:text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200
                                   hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40"
                      >
                        Ver no YouTube
                      </a>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: Math.max(2, perSection) }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
                        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded mt-3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded mt-2 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : vids.length === 0 ? (
                  <div className="flex items-center justify-between border rounded-lg p-3 border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {err && err !== 'Sem resultados' ? `Erro: ${err}` : 'Nenhum vídeo encontrado para esta seção.'}
                    </p>
                    <a
                      className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded"
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(buildQuery(sec))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver no YouTube
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(() => {
                        const list = vids.slice(0, visibleCount);
                        return list.map((v) => (
                          <a
                            key={v.id}
                            href={`https://www.youtube.com/watch?v=${v.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => { e.preventDefault(); openPlayer(v); }}
                            className={`group rounded-xl ring-1 overflow-hidden
                                        bg-white dark:bg-gray-800 transition-transform transform-gpu
                                        hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 ring-offset-0
                                        ${watched[v.id] ? 'ring-emerald-400 dark:ring-emerald-400' : 'ring-gray-200 dark:ring-gray-700'}`}
                          >
                            <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700">
                              {/* BotÃ£o marcar como visto (nÃ£o abre o player) */}
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatched(v.id); }}
                                title={watched[v.id] ? 'Desmarcar como visto' : 'Marcar como visto'}
                                className="absolute top-2 left-2 z-10 rounded-md px-2 py-1 text-[11px] font-semibold
                                           bg-white/80 dark:bg-black/60 text-emerald-700 dark:text-emerald-300
                                           hover:bg-white/95 dark:hover:bg-black/80 shadow"
                              >
                                {watched[v.id] ? 'Visto ✓' : 'Marcar'}
                              </button>

                              {v.thumbnail && (
                                <img src={v.thumbnail} alt={v.title || ''} loading="lazy" className="w-full h-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-0
                                              group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-0 grid place-items-center">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg width="56" height="56" viewBox="0 0 24 24"
                                       className="fill-white drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:underline">
                                {v.title}
                              </div>
                              {v.channelTitle && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                  {v.channelTitle}
                                </div>
                              )}
                            </div>
                          </a>
                        ));
                      })()}
                    </div>

                    {/* BotÃ£o Mostrar mais */}
                    {((showCountMap[sec] ?? perSection) < 6) && (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => showMoreForSection(sec)}
                          disabled={!!loadingMore[sec]}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md
                                     bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                                     text-gray-800 dark:text-gray-100 disabled:opacity-60"
                        >
                          {loadingMore[sec] ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 008-8v3a5 5 0 00-5 5H4z" />
                              </svg>
                              Carregando...
                            </>
                          ) : 'Mostrar mais'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal com iframe do YouTube, refinado */}
      {player && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closePlayer} />
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div
              className="relative w-full md:max-w-5xl max-h-[100svh] overflow-visible"
              // Limita a largura pelo menor entre 95vw e a largura equivalente Ã  altura disponÃ­vel (16:9)
              style={{ maxWidth: 'min(95vw, calc((100svh - 140px) * 1.7778))' }}
              role="dialog"
              aria-modal="true"
              aria-label="Reprodutor de vídeo"
            >
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10">
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={closePlayer}
                  aria-label="Fechar vídeo"
                  className="absolute top-2 right-2 md:top-3 md:right-3 z-10 px-2.5 py-1.5 rounded-md
                             bg-black/60 text-white hover:bg-black/75 backdrop-blur-sm
                             focus:outline-none focus-visible:ring-2 ring-white/70"
                >
                 Fechar
                </button>

                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${player.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={player.title || 'YouTube player'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-white">
                <div className="text-sm opacity-90 line-clamp-2">{player.title}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleWatched(player.id)}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {compact ? (watched[player.id] ? '✓ Visto' : 'Marcar') : (watched[player.id] ? 'Desmarcar visto' : 'Marcar como visto')}
                  </button>
                  <a
                    className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded"
                    href={`https://www.youtube.com/watch?v=${player.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir no YouTube
                  </a>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-white/80 pb-[env(safe-area-inset-bottom)]">Pressione ESC para fechar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

