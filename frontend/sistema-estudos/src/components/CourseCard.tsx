import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type CourseCardProps = {
  id: number;
  materia: string;
  conteudo: string;
  className?: string;
};

const CourseCard = ({ id, materia, className = '' }: CourseCardProps) => {
  return (
    <Link
      to={`/cursos/${encodeURIComponent(materia)}`}
      className={`
        group block rounded-2xl shadow-lg border border-blue-200 
        bg-gradient-to-br from-white via-blue-50 to-blue-100 overflow-hidden
        ${className}
        transition-transform duration-300 hover:-translate-y-1 hover:scale-105
        hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2
        w-full
      `}
      aria-label={`Acessar curso de ${materia}`}
      tabIndex={0}
    >
      <div className="relative flex flex-col justify-between h-full min-h-[120px]">
        {/* Gradiente sutil no topo */}
        <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-300" aria-hidden="true" />

        {/* Efeito de brilho dinâmico */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none -rotate-12 -translate-x-1/3 transition-opacity duration-300"
          aria-hidden="true"
        />

        {/* Conteúdo do card */}
        <div className="flex-1 flex flex-col justify-center items-center px-3 pt-5 pb-2">
          <h3 className="
            text-base md:text-lg font-extrabold text-blue-800 mb-3 transition-colors duration-200
            group-hover:text-blue-900 dark:text-white dark:group-hover:text-blue-400
            text-center tracking-tight drop-shadow-sm
            sm:text-sm
          ">
            {materia}
          </h3>
        </div>

        {/* CTA elegante */}
        <div className="relative z-10 flex justify-center px-3 pb-4">
          <button
            tabIndex={0}
            className="
              flex items-center justify-center w-full max-w-xs
              text-xs md:text-sm font-semibold
              text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg px-3 py-2
              transition-all duration-300
              group-hover:from-blue-700 group-hover:to-blue-600
              active:brightness-90
              shadow-md
              cursor-pointer
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400
              focus-visible:ring-offset-2
              sm:text-xs
            "
          >
            Ver conteúdo completo
            <ArrowRight className="ml-2 w-4 h-4 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;