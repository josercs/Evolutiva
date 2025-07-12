import { useState, useEffect } from 'react';
import CourseCard from '../components/cursos/CourseCard';

type Course = {
  id: number;
  materia: string;
  conteudo: string;
};

const CoursesMilitaresPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Buscar apenas Matemática, Língua Portuguesa e Redação para curso_id=4
        const res = await fetch(
          'http://192.168.0.109:5000/api/courses?curso_id=4&materias=Matemática,Língua%20Portuguesa,Redação'
        );
        const data = await res.json();
        setCourses(data.courses || []);
      } catch (error) {
        console.error('Erro ao carregar matérias dos Colégios Militares:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(
    (course) =>
      (course.materia === 'Matemática' ||
        course.materia === 'Língua Portuguesa' ||
        course.materia === 'Redação') &&
      course.materia.toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm">
          <span className="text-[#4A90E2]">Matérias</span> Colégios Militares
        </h1>
        <input
          placeholder="Buscar matéria..."
          className="border border-gray-300 focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2]/30 px-4 py-2 rounded-lg shadow-sm transition-all duration-200 w-full max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#4A90E2]"></div>
        </div>
      ) : filteredCourses.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filteredCourses.map((course) => (
            <li key={course.id} className="w-full">
              <CourseCard id={course.id} materia={course.materia} conteudo={course.conteudo} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold text-gray-500">Nenhuma matéria encontrada</h3>
        </div>
      )}
    </div>
  );
};

export default CoursesMilitaresPage;