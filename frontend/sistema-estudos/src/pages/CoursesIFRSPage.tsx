import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CourseCard from '../components/cursos/CourseCard';

// Interface para o objeto de matéria do IFRS
type Course = {
  id: number;
  nome: string;
};

// Componente principal da página de matérias do IFRS
const CoursesIFRSPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  // Estado para armazenar as matérias carregadas da API
  const [courses, setCourses] = useState<Course[]>([]);
  // Estado para controlar o carregamento (loading)
  const [isLoading, setIsLoading] = useState(true);
  // Estado para o termo de busca digitado pelo usuário
  const [searchTerm, setSearchTerm] = useState('');

  // Efeito que roda ao montar o componente para buscar as matérias do IFRS na API
  useEffect(() => {
    const fetchMaterias = async () => {
      try {
        // Faz a requisição para a API buscando as matérias do IFRS pelo courseId
        const res = await fetch(`/api/materias?course_id=${courseId}`);
        const data = await res.json();
        // Atualiza o estado com as matérias recebidas
        setCourses(data.materias || []);
      } catch (error) {
        // Em caso de erro, exibe no console
        console.error('Erro ao carregar matérias do IFRS:', error);
      } finally {
        // Finaliza o carregamento
        setIsLoading(false);
      }
    };
    fetchMaterias();
  }, [courseId]);

  // Filtra as matérias conforme o termo de busca digitado
  const filteredCourses = courses.filter(
    (course) =>
      course.nome &&
      course.nome.toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  // Renderização do componente
  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-6 py-8 space-y-8">
      {/* Cabeçalho da página com título e campo de busca */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm">
          <span className="text-green-600">Matérias</span> IFRS
        </h1>
        <input
          placeholder="Buscar matéria..."
          className="border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-200 px-4 py-2 rounded-lg shadow-sm transition-all duration-200 w-full max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {/* Exibe o loading enquanto carrega */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#4A90E2]"></div>
        </div>
      ) : filteredCourses.length > 0 ? (
        // Exibe a lista de matérias filtradas em um grid responsivo de cards
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
          {filteredCourses.map((course) => (
            <li
              key={course.id}
              className="w-full transition-transform duration-200 hover:scale-[1.03] hover:z-10"
            >
              {/* Card da matéria, clicável para navegar para o conteúdo */}
              <CourseCard
                id={course.id}
                materia={course.nome} conteudo={''}              />
            </li>
          ))}
        </ul>
      ) : (
        // Caso não haja matérias, exibe mensagem amigável
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold text-gray-500">Nenhuma matéria encontrada</h3>
        </div>
      )}
    </div>
  );
};

export default CoursesIFRSPage;