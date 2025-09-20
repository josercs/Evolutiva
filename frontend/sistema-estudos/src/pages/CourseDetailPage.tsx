import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

/* ========= Tipos ========= */
type Conteudo = {
  id: number;
  subject: string;
  topic: string;
  created_at: string;
};

/* ========= Constantes/Utils ========= */
const icons = ["📘","🔬","🌎","🧪","📖","🧬","🧲","🧮","📝","🌱","💡","📚"];
const PAGE_SIZE = 18;

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const normalize = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const highlight = (text: string, q: string) => {
  if (!q) return text;
  const nText = normalize(text), nQ = normalize(q);
  const i = nText.indexOf(nQ);
  if (i === -1) return text;
  const a = text.slice(0, i), b = text.slice(i, i + q.length), c = text.slice(i + q.length);
  return (
    <>
      {a}
      <mark className="rounded px-0.5 bg-sky-200/60 dark:bg-cyan-500/30">{b}</mark>
      {c}
    </>
  );
};

/* ===== Utils elegantes ===== */
const compactTitle = (raw: string, max = 60) => {
  if (!raw) return '';
  let t = raw.replace(/\s*\([^)]{10,}\)/g, '');
  t = t.includes(':') ? t.split(':').slice(0, 2).join(':') : t;
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(' ', max - 1);
  return (cut > 0 ? t.slice(0, cut) : t.slice(0, max - 1)).trim() + '…';
};
const relativeTime = (iso?: string) => {
  if (!iso) return '';
  const s = new Date(iso).getTime();
  if (Number.isNaN(s)) return '';
  const diff = Date.now() - s;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
};

/* ========= AutoScrollRow (hover nas bordas = rola) ========= */
function AutoScrollRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const vx = useRef(0);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const tick = () => {
    const el = ref.current;
    if (!el) return;
    if (vx.current !== 0) {
      el.scrollLeft += vx.current;
    }
    updateArrows();
    frame.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame.current == null) frame.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    vx.current = 0;
    updateArrows();
  };

  const onMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const n = x / rect.width; // 0..1
    const EDGE = 0.18;        // zona de borda (18%)
    const MAX = 14;           // velocidade máx (px/frame)
    let v = 0;
    if (n < EDGE) v = -MAX * (1 - n / EDGE);
    else if (n > 1 - EDGE) v = MAX * ((n - (1 - EDGE)) / EDGE);
    else v = 0;
    vx.current = v;
  };

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 2);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    const onScroll = () => updateArrows();
    const onResize = () => updateArrows();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      stop();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        onMouseEnter={start}
        onMouseLeave={stop}
        onMouseMove={onMove}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory cursor-ew-resize
                   scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] px-0.5"
      >
        {children}
      </div>

      {/* fades nas bordas */}
      {canL && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8
                        bg-gradient-to-r from-white/90 to-transparent dark:from-slate-900/60" />
      )}
      {canR && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8
                        bg-gradient-to-l from-white/90 to-transparent dark:from-slate-900/60" />
      )}
    </div>
  );
}

/* ========= Card moderno/compacto ========= */
function ContentCard({ c, idx, q }: { c: Conteudo; idx: number; q: string }) {
  const durationMin = (c as any).duration_min as number | undefined;
  const format = (c as any).format as 'vídeo' | 'leitura' | 'quiz' | undefined;
  const level = (c as any).level as 'iniciante' | 'intermediário' | 'avançado' | undefined;
  const progress = (c as any).progress as number | undefined;
  const tagline = (c as any).tagline as string | undefined;

  const short = compactTitle(c.topic);
  const subtitle =
    tagline ||
    (c.subject ? `Objetivo: revisar ${c.subject.toLowerCase()}` : 'Resumo rápido');

  return (
    <Link
      to={`/conteudo/${c.id}`}
      className="group block rounded-xl overflow-hidden shadow-sm hover:shadow-lg
                 transition-transform hover:-translate-y-0.5 focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-sky-400"
      aria-label={`Acessar conteúdo: ${short}`}
    >
      <div className="p-px rounded-xl bg-gradient-to-r from-sky-500/25 to-cyan-500/25">
        <div className="rounded-xl bg-white/90 dark:bg-white/5 backdrop-blur border border-white/10">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xl" aria-hidden="true">{icons[idx % icons.length]}</span>
            {typeof progress === 'number' && progress >= 0 && (
              <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90">
                <circle cx="18" cy="18" r="15" stroke="rgba(0,0,0,.08)" strokeWidth="3" fill="none" />
                <defs>
                  <linearGradient id="ringBlue" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <circle
                  cx="18" cy="18" r="15"
                  stroke="url(#ringBlue)" strokeWidth="3" fill="none" strokeLinecap="round"
                  strokeDasharray="94.2"
                  strokeDashoffset={94.2 - (progress / 100) * 94.2}
                />
              </svg>
            )}
          </div>

          <div className="px-3">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight line-clamp-1">
              {highlight(short, q)}
            </p>
            <p className="text-xs text-slate-600/90 dark:text-slate-400 mt-0.5 line-clamp-1">
              {subtitle}
            </p>
          </div>

          <div className="px-3 mt-2 mb-3 flex flex-wrap items-center gap-1.5">
            {format && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-[11px]">
                {format}
              </span>
            )}
            {typeof durationMin === 'number' && durationMin > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-[11px]">
                {durationMin} min
              </span>
            )}
            {level && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-[11px] capitalize">
                {level}
              </span>
            )}
            {c.subject && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-[11px]">
                {c.subject}
              </span>
            )}
            <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
              {relativeTime(c.created_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ========= Página ========= */
const CourseDetailPage: React.FC = () => {
  const { materiaId } = useParams<{ materiaId: string }>();
  const navigate = useNavigate();

  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 250); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    if (!materiaId) return;
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await fetch(`/api/materias/${materiaId}/conteudos`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setConteudos(Array.isArray(data) ? data : (data.conteudos || []));
      } catch (e: any) {
        if (e.name !== 'AbortError') setError('Não foi possível carregar os conteúdos.');
      } finally { setLoading(false); }
    })();
    return () => controller.abort();
  }, [materiaId]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    conteudos.forEach(c => set.add(c.subject || 'Geral'));
    return ['Todos', ...Array.from(set).sort((a,b) => a.localeCompare(b))];
  }, [conteudos]);

  const prepared = useMemo(() => {
    const q = normalize(debounced);
    let arr = conteudos.filter(c => {
      const okQ = q ? normalize(c.topic).includes(q) : true;
      const okS = subjectFilter === 'Todos' ? true : (c.subject || 'Geral') === subjectFilter;
      return okQ && okS;
    });
    arr = (sortBy === 'recent')
      ? arr.slice().sort((a,b) => (new Date(b.created_at).getTime()||0) - (new Date(a.created_at).getTime()||0))
      : arr.slice().sort((a,b) => a.topic.localeCompare(b.topic));
    return arr;
  }, [conteudos, debounced, subjectFilter, sortBy]);

  const visible = useMemo(() => prepared.slice(0, page * PAGE_SIZE), [prepared, page]);
  const hasMore = prepared.length > visible.length;
  useEffect(() => { setPage(1); }, [debounced, subjectFilter, sortBy]);

  if (!materiaId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur p-6 text-center">
          <p className="text-slate-700 dark:text-slate-200">Matéria não informada.</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-600 to-blue-500 text-white text-sm font-semibold shadow-md hover:shadow-lg active:scale-95 transition"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
  className="relative ml-sidebar pt-navbar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8
                 pb-[calc(env(safe-area-inset-bottom)+2rem)]"
    >
      {/* BG premium sutil */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />

      {/* Header */}
    <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Conteúdos de <span className="capitalize">{materiaId}</span>
        </h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-900/10 dark:hover:bg-white/15 transition"
          aria-label="Voltar"
        >
          ← Voltar
        </button>
      </div>

      {/* Toolbar sticky */}
  <div className="sticky top-navbar">
        <div className="p-[1px] rounded-2xl bg-gradient-to-r from-sky-500/40 to-cyan-500/40">
          <div className="rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur border border-white/10 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Busca */}
                <div className="relative w-full sm:max-w-xl">
                  <input
                    type="text"
                    placeholder="Buscar conteúdo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 bg-white/90 dark:bg-white/5 text-slate-900 dark:text-white shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200/60 dark:focus:ring-sky-400/30 focus-visible:ring-yellow-400 transition"
                    aria-label="Buscar conteúdo"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white text-sm"
                      aria-label="Limpar busca"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* Ordenação */}
                <div>
                  <label className="sr-only" htmlFor="sort">Ordenar por</label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'alpha')}
                    className="w-full sm:w-auto border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 
                               bg-white/90 dark:bg-white/5 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="alpha">A–Z</option>
                  </select>
                </div>
              </div>

              {/* Chips horizontais com auto-scroll por hover */}
              <AutoScrollRow className="mt-1">
                {['Todos', ...subjects.slice(1)].map(sub => {
                  const active = sub === subjectFilter;
                  return (
                    <button
                      key={sub}
                      onClick={() => setSubjectFilter(sub)}
                      className={[
                        "snap-start whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition",
                        active
                          ? "bg-gradient-to-r from-sky-600 to-blue-500 text-white shadow-sm"
                          : "bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-900/10 dark:hover:bg-white/15"
                      ].join(' ')}
                      aria-pressed={active}
                    >
                      {sub}
                    </button>
                  );
                })}
              </AutoScrollRow>

              <div className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
                {prepared.length} resultado{prepared.length === 1 ? '' : 's'} • mostrando {visible.length}{prepared.length > visible.length ? ` de ${prepared.length}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estados */}
      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200/60 dark:border-rose-400/30 bg-rose-50/80 dark:bg-rose-400/10 p-6 text-center">
          <p className="text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-600 to-blue-500 text-white text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.99] transition"
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5" aria-busy="true" aria-live="polite">
          {Array.from({ length: 9 }).map((_, i) => (
            <li key={i} className="rounded-xl overflow-hidden">
              <div className="p-px rounded-xl bg-gradient-to-r from-sky-500/30 to-cyan-500/30">
                <div className="rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur border border-white/10">
                  <div className="h-12 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : prepared.length === 0 ? (
        <div className="mt-6 text-center py-10 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur">
          <span className="text-4xl block mb-2">🔎</span>
          <h3 className="text-base font-medium text-slate-600 dark:text-slate-300">Nenhum conteúdo encontrado.</h3>
          {(search || subjectFilter !== 'Todos') && (
            <button
              onClick={() => { setSearch(''); setSubjectFilter('Todos'); }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-900/10 dark:hover:bg-white/15 transition"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: carrossel horizontal premium */}
          <ul className="mt-6 flex sm:hidden gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none]">
            {visible.map((c, idx) => (
              <li key={c.id} className="min-w-[84%] snap-start">
                <ContentCard c={c} idx={idx} q={debounced} />
              </li>
            ))}
          </ul>

          {/* Desktop: grid compacto */}
          <ul className="mt-6 hidden sm:grid grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
            {visible.map((c, idx) => (
              <li key={c.id}><ContentCard c={c} idx={idx} q={debounced} /></li>
            ))}
          </ul>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => setPage(p => p + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-600 to-blue-500 text-white text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.99] transition"
              >
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CourseDetailPage;
