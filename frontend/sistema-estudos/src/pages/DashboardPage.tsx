import { Award, User, BarChart2, BookOpen, Clock, Star, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const user = {
  name: "João",
  streak: 7,
  avatarUrl: "/uploads/avatar_joao.png", // ou vazio para mostrar ícone
  level: 3,
  badges: ["Matemática", "Química"],
  xp: 1200, // valor de exemplo
};

const recommendations = [
  { subject: "Matemática", time: "30min", icon: <BookOpen className="h-5 w-5 text-blue-600" /> },
  { subject: "Química", time: "20min", icon: <BookOpen className="h-5 w-5 text-purple-600" /> },
];

const data = [
  { day: 'Seg', minutos: 40 },
  { day: 'Ter', minutos: 30 },
  { day: 'Qua', minutos: 50 },
  { day: 'Qui', minutos: 20 },
  { day: 'Sex', minutos: 60 },
  { day: 'Sáb', minutos: 10 },
  { day: 'Dom', minutos: 0 },
];

const DashboardPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const onboardingDone = localStorage.getItem("onboardingDone") === "true";
    if (!onboardingDone) {
      navigate("/onboarding");
    }
  }, [navigate]);

  return (
    <div className="bg-gradient-to-br from-blue-900 to-purple-800 min-h-screen p-0 md:p-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 py-8 md:py-4 bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg rounded-b-3xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl.startsWith("http") ? user.avatarUrl : `http://localhost:5000${user.avatarUrl}`}
                alt="Avatar"
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                <User className="h-12 w-12 text-gray-400" />
              </div>
            )}
            {/* Badge de streak */}
            <span className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full shadow-lg text-xs flex items-center gap-1 animate-bounce">
              <Award className="h-4 w-4" /> {user.streak} dias
            </span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow">
              Boa tarde, {user.name}! 👋
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                <Clock className="h-4 w-4" /> Hoje: 2h15min de estudo
              </span>
              <span className="bg-green-400 text-green-900 px-2 py-1 rounded-full text-xs font-bold ml-2 shadow">
                Nível {user.level}
              </span>
            </div>
          </div>
        </div>
        {/* Badges */}
        <div className="flex gap-2 mt-4 md:mt-0">
          {user.badges.map((badge) => (
            <span key={badge} className="bg-white/30 text-white px-3 py-1 rounded-full text-xs font-semibold shadow">
              <Star className="h-4 w-4 inline mr-1 text-yellow-300" /> {badge}
            </span>
          ))}
        </div>
      </header>

      {/* Cards principais */}
      <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Meta diária */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center relative overflow-hidden group">
          <span className="text-lg font-bold text-blue-800 mb-2">Meta diária</span>
          <div className="w-full bg-blue-100 rounded-full h-4 mb-4">
            <div className="bg-green-400 h-4 rounded-full transition-all duration-700" style={{ width: '75%' }} />
          </div>
          <button className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow hover:bg-blue-700 transition">
            Iniciar agora
          </button>
          {/* Animação de confete ao completar meta */}
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
            <span className="text-3xl">🎉</span>
          </div>
        </div>
        {/* Progresso da semana */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <span className="text-lg font-bold text-purple-700 mb-2">Progresso da semana</span>
          {/* Gráfico fake */}
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-2xl font-bold text-purple-700 shadow-inner">
            72%
          </div>
          <span className="mt-2 text-sm text-gray-500">Você está acima da média!</span>
        </div>
        {/* Recomendações do dia */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
          <span className="text-lg font-bold text-indigo-700 mb-2">Recomendações do dia</span>
          <ul className="text-gray-700 w-full">
            {recommendations.map((rec) => (
              <li key={rec.subject} className="flex items-center gap-2 py-1">
                {rec.icon}
                <span className="font-semibold">{rec.subject}</span>
                <span className="ml-auto bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{rec.time}</span>
              </li>
            ))}
          </ul>
          <button className="mt-4 flex items-center gap-1 text-blue-700 font-bold hover:underline">
            Ver plano completo <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </main>

      {/* Gráfico semanal */}
      <div className="max-w-6xl mx-auto mt-10 bg-white rounded-2xl shadow-lg p-6">
        <span className="text-lg font-bold text-purple-700 mb-4 block">Seu progresso esta semana</span>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="minutos" fill="#6366f1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conquistas e gamificação */}
      <section className="max-w-6xl mx-auto mt-10 flex flex-wrap gap-4">
        <div className="bg-yellow-100 rounded-xl px-6 py-3 flex items-center gap-3 shadow animate-pulse">
          <Award className="h-8 w-8 text-yellow-400" />
          <span className="font-bold text-yellow-700">🔥 7 dias de streak!</span>
        </div>
        <div className="bg-blue-100 rounded-xl px-6 py-3 flex items-center gap-3 shadow">
          <BarChart2 className="h-8 w-8 text-blue-400" />
          <span className="font-bold text-blue-700">Meta semanal batida!</span>
        </div>
        {/* Outras conquistas */}
      </section>

      {/* Atalhos rápidos */}
      <section className="max-w-6xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl shadow-lg p-6 flex flex-col items-center hover:scale-105 transition">
          <BookOpen className="h-10 w-10 mb-2" />
          <span className="font-bold text-lg">Quiz Rápido</span>
          <span className="text-xs mt-1">Teste seus conhecimentos</span>
        </button>
        <button className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-2xl shadow-lg p-6 flex flex-col items-center hover:scale-105 transition">
          <Clock className="h-10 w-10 mb-2" />
          <span className="font-bold text-lg">Pomodoro</span>
          <span className="text-xs mt-1">Cronômetro de foco</span>
        </button>
        <button className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-2xl shadow-lg p-6 flex flex-col items-center hover:scale-105 transition">
          <Star className="h-10 w-10 mb-2" />
          <span className="font-bold text-lg">Flashcards</span>
          <span className="text-xs mt-1">Revisão rápida</span>
        </button>
      </section>

      {/* Exemplo de badges e XP ao lado do avatar */}
      <div className="flex items-center gap-2 max-w-6xl mx-auto mt-10">
        <img src={user.avatarUrl.startsWith("http") ? user.avatarUrl : `http://localhost:5000${user.avatarUrl}`} className="w-16 h-16 rounded-full border-4 border-white shadow-lg" />
        <div>
          <div className="font-bold text-lg">{user.name}</div>
          <div className="flex items-center gap-1">
            <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">XP: {user.xp}</span>
            <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">Nível {user.level}</span>
          </div>
          <div className="flex gap-1 mt-1">
            {user.badges.map(badge => (
              <span key={badge} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{badge}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Ícones de navegação */}
      <div className="fixed bottom-0 left-0 w-full flex justify-around bg-blue-900 md:hidden">
        {/* Ícones de navegação */}
      </div>

      {/* Dica do dia */}
      <div className="bg-indigo-100 rounded-xl p-4 mt-4 flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-indigo-600" />
        <span className="font-semibold">Hoje foque em revisão de exatas!</span>
      </div>
      <div className="bg-gradient-rainbow rounded-xl p-4 text-white shadow-lg">
        {/* Conteúdo do card */}
      </div>
    </div>
  );
};

export default DashboardPage;