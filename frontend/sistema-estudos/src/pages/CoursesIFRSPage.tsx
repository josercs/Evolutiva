import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CourseCard from '../components/cursos/CourseCard';

// Interface para o objeto de matéria do IFRS
type Course = {
  id: number;
  nome: string;
};

const CoursesIFRSPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/materias?course_id=${courseId}`, { signal: controller.signal });
        const data = await res.json();
        setCourses(data.materias || []);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError('Não foi possível carregar as matérias do IFRS.');
      } finally {
        setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [courseId]);

  const filteredCourses = courses.filter((c) =>
    (c.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
  <div className="relative ml-sidebar pt-navbar max-w-6xl mx-auto px-3 sm:px-4 py-8 space-y-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      {/* fundo premium (uma vez por página) */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />
      {/* ...existing header... */}
      {error && (
        <div className="rounded-2xl border border-rose-200/60 dark:border-rose-400/30 bg-rose-50/80 dark:bg-rose-400/10 p-6 text-center">
          <p className="text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-600 to-blue-500 text-white text-sm font-semibold shadow-md hover:from-sky-700 hover:to-blue-700 hover:shadow-lg active:scale-95 transition"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {/* grades com alturas iguais */}
      {isLoading ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-full rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur">
              <div className="h-24 bg-gradient-to-r from-sky-500/8 to-cyan-500/8 dark:from-sky-500/15 dark:to-cyan-500/15 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      ) : filteredCourses.length > 0 ? (
        <>
          {/* Mobile: carrossel */}
          <ul className="mt-2 flex sm:hidden gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none]">
            {filteredCourses.map((course) => (
              <li key={course.id} className="min-w-[84%] snap-start">
                <CourseCard id={course.id} materia={course.nome} conteudo="No seu ritmo" />
              </li>
            ))}
          </ul>
          {/* Desktop: grid com heights iguais */}
          <ul className="mt-2 hidden sm:grid grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
            {filteredCourses.map((course) => (
              <li key={course.id} className="h-full">
                <CourseCard id={course.id} materia={course.nome} conteudo="No seu ritmo" className="h-full" />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="text-center py-16 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur">
          <h3 className="text-base font-medium text-slate-600 dark:text-slate-300">Nenhuma matéria encontrada</h3>
        </div>
      )}
    </div>
  );
};

export default CoursesIFRSPage;