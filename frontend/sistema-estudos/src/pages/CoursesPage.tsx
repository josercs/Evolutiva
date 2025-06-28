import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

// Exemplos de SVGs customizados para cada instituição
const icons: Record<string, React.ReactNode> = {
  ifrs: (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" className="filter drop-shadow-md">
      {/* Quadrados verdes claros para contraste */}
      <rect x="6" y="6" width="6" height="6" rx="2" fill="#bbf7d0"/>
      <rect x="6" y="14" width="6" height="6" rx="2" fill="#bbf7d0"/>
      <rect x="6" y="22" width="6" height="6" rx="2" fill="#bbf7d0"/>
      <rect x="14" y="14" width="6" height="6" rx="2" fill="#bbf7d0"/>
      <rect x="14" y="22" width="6" height="6" rx="2" fill="#bbf7d0"/>
      <rect x="22" y="22" width="6" height="6" rx="2" fill="#bbf7d0"/>
      {/* Círculo vermelho destacado */}
      <circle cx="9" cy="9" r="3" fill="#f87171" stroke="#fff" strokeWidth="1"/>
    </svg>
  ),
  ctism: (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" className="filter drop-shadow-md">
      {/* Engrenagem cinza claro para contraste */}
      <path d="M18 28a10 10 0 1 1 0-20" stroke="#e0e7ef" strokeWidth="2" fill="none"/>
      {/* T branco */}
      <rect x="13" y="10" width="10" height="2.5" rx="1" fill="#fff"/>
      <rect x="17" y="12.5" width="2" height="8" rx="1" fill="#fff"/>
      {/* Raios azul claro */}
      <polyline points="13,20 11,24 15,22" stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
      <polyline points="23,20 25,24 21,22" stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  enem: (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" className="filter drop-shadow-md">
      {/* Círculo externo amarelo claro */}
      <circle cx="18" cy="18" r="16" stroke="#fde68a" strokeWidth="3" fill="none"/>
      {/* Seta laranja */}
      <path d="M18 8 L24 18 L18 28" stroke="#f59e42" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Centro do ENEM branco */}
      <circle cx="18" cy="18" r="4" fill="#fff"/>
      {/* Letras ENEM laranja escuro */}
      <text x="18" y="22" textAnchor="middle" fontSize="9" fill="#f59e42" fontWeight="bold" fontFamily="Arial">ENEM</text>
    </svg>
  ),
  'colegios-militares': (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" className="filter drop-shadow-md">
      {/* Escudo branco com borda vermelha */}
      <rect x="10" y="8" width="16" height="20" rx="6" fill="#fff" stroke="#DC2626" strokeWidth="2"/>
      {/* Estrela central vermelha */}
      <polygon points="18,15 19.8,20 25,20 20.8,22.8 22.5,28 18,24.5 13.5,28 15.2,22.8 11,20 16.2,20" fill="#DC2626"/>
      {/* Faixa inferior vermelha clara */}
      <rect x="13" y="24" width="10" height="3" rx="1.5" fill="#DC2626" opacity="0.7"/>
    </svg>
  ),
};

/**
 * Interface que define a estrutura de um objeto curso.
 */
interface Course {
  id: string;
  title: string;
  description: string;
  color: string;
  icon?: React.ReactNode;
  isNew?: boolean; // Adicionado para indicar cursos novos
}

/**
 * Lista de cursos.
 */
const COURSE_LIST: Course[] = [
  {
    id: 'ifrs',
    title: 'IFRS',
    description: 'Instituto Federal do Rio Grande do Sul',
    color: 'from-green-500 to-green-700',
    icon: icons.ifrs,
  },
  {
    id: 'ctism',
    title: 'CTISM',
    description: 'Colégio Técnico Industrial de Santa Maria',
    color: 'from-blue-500 to-blue-700',
    icon: icons.ctism,
  },
  {
    id: 'enem',
    title: 'ENEM',
    description: 'Exame Nacional do Ensino Médio',
    color: 'from-yellow-500 to-yellow-700',
    icon: icons.enem,
  },
  {
    id: 'colegios-militares',
    title: 'Colégios Militares',
    description: 'CMPA, Tiradentes e outros',
    color: 'from-red-500 to-red-700',
    icon: icons['colegios-militares'],
  },
];

/**
 * Card de curso refinado com efeito de hover, SVG customizado e botão de favoritar.
 */
const CourseCard = ({ course, onClick }: { course: Course; onClick: () => void }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center">
      <button
        onClick={onClick}
        className={`
          w-full h-full min-h-[210px] max-h-[340px] flex flex-col justify-center items-center rounded-3xl
          border border-white/20
          shadow-md bg-gradient-to-br ${course.color} text-white
          transition-all duration-300
          hover:shadow-2xl hover:scale-105 hover:brightness-110 hover:saturate-150
          focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:ring-offset-2
          px-5 py-8 group relative
        `}
        aria-label={`Ver detalhes do curso ${course.title}`}
        tabIndex={0}
        type="button"
      >
        {/* Ícone SVG customizado centralizado com drop-shadow */}
        <span className="mb-3 flex justify-center items-center">
          {course.icon}
        </span>
        <h3 className="text-2xl font-extrabold text-white mb-2 text-center tracking-tight">
          {course.title}
        </h3>
        <p className="text-base font-medium text-white/90 text-center leading-snug">
          {course.description}
        </p>
        {/* Badge corporativo, só para cursos novos */}
        {course.isNew && (
          <span className="absolute top-3 right-3 bg-white/90 text-blue-700 text-xs font-bold px-2 py-1 rounded-full shadow-sm backdrop-blur-sm">
            Novo
          </span>
        )}
      </button>
    </div>
  );
};

/**
 * Cabeçalho da página.
 */
const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
}) => (
  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-5">
    <div>
      <h1 className="text-4xl font-black text-gray-900 tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-xl text-gray-600 max-w-3xl">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex-shrink-0 mt-4 md:mt-0">{actions}</div>}
  </header>
);

/**
 * Página de cursos.
 */
const CoursesPage = () => {
  const navigate = useNavigate();

  const handleCourseNavigation = (courseId: string) => {
    navigate(`/cursos/${courseId}`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-2 mt-8">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <PageHeader
          title={
            <>
              <span className="text-blue-600">Cursos</span> Disponíveis
            </>
          }
          description="Monte seu cronograma de estudos personalizado e alcance seu objetivo: aprovação nas melhores escolas técnicas de ensino médio e um excelente desempenho no ENEM."
        />

        <section aria-labelledby="courses-heading">
          <h2 id="courses-heading" className="sr-only">
            Nossos Cursos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {COURSE_LIST.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => handleCourseNavigation(course.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CoursesPage;
