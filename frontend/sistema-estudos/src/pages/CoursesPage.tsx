import { useNavigate } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';

// Exemplos de SVGs customizados para cada instituição
const icons: Record<string, React.ReactNode> = {
  ifrs: (
    <svg
      width="40"
      height="40"
      viewBox="0 0 36 36"
      fill="none"
      role="img"
      aria-labelledby="ifrsTitle ifrsDesc"
    >
      <title id="ifrsTitle">IFRS</title>
      <desc id="ifrsDesc">Grade em F com ponto vermelho</desc>

      <defs>
        {/* gradiente suave dos quadrados */}
        <linearGradient id="ifrsGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CFFAE1" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        {/* sombra discreta (suave) */}
        <filter id="ifrsShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#ifrsShadow)">
        {/* Coluna esquerda (3 blocos) */}
        <rect x="6"  y="6"  width="6.5" height="6.5" rx="2.2" fill="url(#ifrsGrad)" stroke="#fff" strokeWidth=".6"/>
        <rect x="6"  y="14" width="6.5" height="6.5" rx="2.2" fill="url(#ifrsGrad)" stroke="#fff" strokeWidth=".6"/>
        <rect x="6"  y="22" width="6.5" height="6.5" rx="2.2" fill="url(#ifrsGrad)" stroke="#fff" strokeWidth=".6"/>

        {/* Coluna do meio (2 blocos) */}
        <rect x="14" y="14" width="6.5" height="6.5" rx="2.2" fill="url(#ifrsGrad)" stroke="#fff" strokeWidth=".6"/>
        <rect x="14" y="22" width="6.5" height="6.5" rx="2.2" fill="url(#ifrsGrad)" stroke="#fff" strokeWidth=".6"/>

        {/* Coluna direita (1 bloco) */}
        <rect x="22" y="22" width="6.5" height="6.5" rx="2.2" fill="url(#ifrsGrad)" stroke="#fff" strokeWidth=".6"/>

        {/* Ponto vermelho (com anel branco) */}
        <circle cx="9.25" cy="9.25" r="3.1" fill="#EF4444" stroke="#fff" strokeWidth="1.2"/>
      </g>
    </svg>
  ),
  ctism: (
    <svg
      width="40"
      height="40"
      viewBox="0 0 36 36"
      fill="none"
      role="img"
      aria-labelledby="ctismTitle ctismDesc"
    >
      <title id="ctismTitle">CTISM</title>
      <desc id="ctismDesc">Semianel técnico com eixo e marcas de medição</desc>

      <defs>
        {/* gradiente do semianel */}
        <linearGradient id="ctismGrad" x1="6" y1="30" x2="30" y2="6">
          <stop offset="0%" stopColor="#A5D8FF" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        {/* gradiente mais claro para as marcas */}
        <linearGradient id="ctismLine" x1="12" y1="24" x2="24" y2="12">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        {/* sombra suave */}
        <filter id="ctismShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#ctismShadow)">
        {/* Semianel (gauge) */}
        <path
          d="M18 28a10 10 0 1 1 0-20"
          stroke="url(#ctismGrad)"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eixos (horizontal + vertical) */}
        <rect x="12.5" y="11" width="13" height="2.6" rx="1.3" fill="#FFFFFF" />
        <rect x="17" y="12.8" width="2.5" height="9" rx="1.25" fill="#FFFFFF" />

        {/* Marcas de medição (check ticks) */}
        <polyline
          points="13,20 11,24 15,22"
          stroke="url(#ctismLine)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <polyline
          points="23,20 25,24 21,22"
          stroke="url(#ctismLine)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* ponto central */}
        <circle cx="18" cy="18" r="1.2" fill="#fff" opacity="0.9" />
      </g>
    </svg>
  ),
  enem: (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" className="filter drop-shadow-md">
      <circle cx="18" cy="18" r="16" stroke="#fde68a" strokeWidth="3" fill="none"/>
      <path d="M18 8 L24 18 L18 28" stroke="#f59e42" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="18" r="4" fill="#fff"/>
      <text x="18" y="22" textAnchor="middle" fontSize="9" fill="#f59e42" fontWeight="bold" fontFamily="Arial">ENEM</text>
    </svg>
  ),
  'colegios-militares': (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" className="filter drop-shadow-md">
      <rect x="10" y="8" width="16" height="20" rx="6" fill="#fff" stroke="#DC2626" strokeWidth="2"/>
      <polygon points="18,15 19.8,20 25,20 20.8,22.8 22.5,28 18,24.5 13.5,28 15.2,22.8 11,20 16.2,20" fill="#DC2626"/>
      <rect x="13" y="24" width="10" height="3" rx="1.5" fill="#DC2626" opacity="0.7"/>
    </svg>
  ),
};

const slugify = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");

interface CourseApi {
  id: number;
  nome: string;
}

// Gradientes por slug (fallback roxo) — versão suave
const colorFor = (slug: string) =>
  ({
    ifrs: 'from-emerald-300 to-emerald-500/90',
    ctism: 'from-sky-300 to-sky-500/90',
    enem: 'from-amber-300 to-orange-400/90',
    'colegios-militares': 'from-rose-300 to-red-500/90',
  } as Record<string, string>)[slug] || 'from-[var(--brand-50)] to-[var(--brand-100)]';

// Descrição amigável por slug
const descriptionFor = (slug: string) =>
  ({
    ifrs: 'Preparação para os Institutos Federais (ensino técnico).',
    ctism: 'Foco no Colégio Técnico Industrial de Santa Maria.',
    enem: 'Base forte para o Exame Nacional do Ensino Médio.',
    'colegios-militares': 'Colégios militares (CMPA, Tiradentes)',
  } as Record<string, string>)[slug] || 'Trilha de estudos com plano passo a passo.';

// Card (versão refinada: glass + faixa gradiente + conteúdo à esquerda)
const CourseCard = ({ id, name, onClick }: { id: string; name: string; onClick: () => void }) => {
  const slug = slugify(name);
  const color = colorFor(slug);
  const icon = (icons as any)[slug] || icons.enem;
  const desc = descriptionFor(slug);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={`Abrir curso ${name}`}
      className="group relative w-full min-h-[220px] overflow-hidden rounded-2xl
                 bg-[var(--card)]/80 dark:bg-white/5 backdrop-blur border border-[var(--line)]
                 shadow-[0_8px_20px_-12px_rgba(0,0,0,.25)] hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,.35)] transition-transform duration-200
                 hover:-translate-y-[2px] focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40"
    >
      {/* Faixa gradiente por trilha */}
      <div className={`h-16 bg-gradient-to-br ${color}`} />

      {/* Ícone sobreposto à faixa (lado esquerdo) */}
      <div className="absolute top-4 left-4 w-12 h-12 rounded-2xl bg-white shadow-md ring-1 ring-black/5
              flex items-center justify-center [&>svg]:w-7 [&>svg]:h-7">
        {icon}
      </div>

      {/* Conteúdo */}
        <div className="px-4 pt-5 pb-4">
        {/* Título + badge premium */}
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-slate-900">
            {name}
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-100 px-2.5 py-1 text-xs">
            Solutiva
          </span>
        </div>

        {/* Descrição */}
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400
                      line-clamp-3 max-w-[32ch]">
          {desc}
        </p>

        {/* CTA compacto e direto */}
        <div className="mt-4">
          <div
            role="presentation"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="btn-cta w-full"
          >
            Começar agora
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13.5 4.5l6 6-6 6m-9-6h15" />
            </svg>
          </div>
        </div>
      </div>

      {/* Glow sutil no hover */}
  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-[var(--brand-500)]/20 transition" />
    </article>
  );
};

// Skeleton simples (4 cards)
const Skeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-[180px] rounded-3xl bg-gray-200/70 animate-pulse" />
    ))}
  </div>
);

const TARGETS = ['ifrs', 'enem', 'ctism', 'colegios-militares'] as const;

const CoursesPage = () => {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<CourseApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/cursos", { credentials: "include" });
        const data = await res.json();
        const list: CourseApi[] = Array.isArray(data) ? data : (data.cursos || data.courses || data.items || []);
        setCursos(list);
      } catch {
        setCursos([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Mantém apenas as 4 trilhas na ordem desejada
  const four = useMemo(() => {
    const mapped = cursos
      .map(c => ({ ...c, slug: slugify(c.nome) }))
      .filter(c => TARGETS.includes(c.slug as any));

    mapped.sort((a, b) => TARGETS.indexOf(a.slug as any) - TARGETS.indexOf(b.slug as any));
    return mapped;
  }, [cursos]);

  const handleCourseNavigation = async (courseId: string) => {
    try {
      await fetch(`/api/onboarding`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ curso_id: Number(courseId) })
      });
    } catch {}
    navigate(`/cursos/${courseId}/materias`);
  };

  return (
    <div
      className="pt-navbar ml-sidebar max-w-[1200px] xl:max-w-[1280px] mx-auto px-5 md:px-8 py-8 pb-[env(safe-area-inset-bottom)]"
    >
      <header className="mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-8 mb-2 text-slate-900">
          <span className="text-slate-900">Escolha sua trilha</span>
          <span className="text-[var(--brand-500)]"> de estudos</span>  
        </h1>
        <p className="mt-2 text-base md:text-lg text-slate-600 max-w-3xl">
          Pensado para quem está saindo do fundamental e começando o ensino médio.
        </p>
      </header>

      {loading ? (
        <Skeleton />
      ) : four.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-600">Cursos não encontrados. Tente novamente mais tarde.</p>
        </div>
      ) : (
        <section aria-labelledby="courses-heading">
          <h2 id="courses-heading" className="sr-only">Trilhas disponíveis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
            {four.map((curso) => (
              <CourseCard
                key={curso.id}
                id={String(curso.id)}
                name={curso.nome}
                onClick={() => handleCourseNavigation(String(curso.id))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CoursesPage;
