import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// Tipo dos dados de conteúdo recebidos da API
type Conteudo = {
  id: number;
  subject: string;
  topic: string;
  created_at: string;
};

const icons = [
  "📘", "🔬", "🌎", "🧪", "📖", "🧬", "🧲", "🧮", "📝", "🌱", "💡", "📚"
];

const CourseDetailPage: React.FC = () => {
  // Obtém o parâmetro 'materia' da URL (ex: /cursos/Matematica)
  const { materia } = useParams<{ materia: string }>();

  // State para armazenar os conteúdos retornados da API
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  // State para controlar o carregamento (loading)
  const [loading, setLoading] = useState(true);
  // State para o campo de busca
  const [search, setSearch] = useState('');

  // useEffect para buscar os conteúdos da matéria ao carregar a página ou quando 'materia' mudar
  useEffect(() => {
    if (!materia) return;
    // Faz uma requisição para a API buscando os conteúdos da matéria
    fetch(`http://192.168.0.109:5000/api/conteudo/${encodeURIComponent(materia)}`)
      .then((res) => res.json())
      .then((data) => {
        // Atualiza o state com os conteúdos recebidos ou array vazio
        setConteudos(data.conteudos || []);
        // Marca o carregamento como concluído
        setLoading(false);
      });
  }, [materia]);

  // Filtro de busca
  const filtered = conteudos.filter((c) =>
    c.topic.toLowerCase().includes(search.toLowerCase())
  );

  // Renderização do componente
  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-8">
      {/* Título da página, mostrando o nome da matéria */}
      <h1 className="text-2xl md:text-3xl font-extrabold text-blue-800 mb-6 text-center tracking-tight drop-shadow-sm">
        Conteúdos de <span className="capitalize">{materia}</span>
      </h1>

      {/* Campo de busca e contador */}
      <div className="flex flex-col items-center mb-6 gap-2">
        <input
          type="text"
          placeholder="Buscar conteúdo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition"
        />
        <span className="text-sm text-gray-500">
          {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Se estiver carregando, mostra o spinner */}
      {loading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-400"></div>
        </div>
      ) : filtered.length === 0 ? (
        // Se não houver conteúdos, mostra mensagem amigável
        <div className="text-center py-8">
          <span className="text-4xl block mb-2">🔎</span>
          <h3 className="text-base font-medium text-gray-500">Nenhum conteúdo encontrado.</h3>
        </div>
      ) : (
        // Lista os conteúdos encontrados
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c, idx) => (
            <li key={c.id}>
              {/* Link para a página de detalhes do conteúdo */}
              <Link
                to={`/conteudo/${c.id}`}
                className="
                  flex items-center gap-3 w-full rounded-xl bg-gradient-to-r from-blue-50 to-blue-100
                  hover:from-blue-100 hover:to-blue-200
                  text-blue-800 font-semibold text-lg px-5 py-5 shadow
                  transition-all duration-200 text-left
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                  hover:scale-105 hover:shadow-xl
                  border border-blue-100
                  cursor-pointer
                "
                aria-label={`Acessar conteúdo: ${c.topic}`}
                tabIndex={0}
              >
                <span className="text-2xl" role="img" aria-label="ícone">
                  {icons[idx % icons.length]}
                </span>
                <span className="underline underline-offset-4 decoration-blue-400 hover:decoration-2 break-words">
                  {c.topic}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CourseDetailPage;