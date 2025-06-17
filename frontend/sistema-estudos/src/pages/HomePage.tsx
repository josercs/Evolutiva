import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Flame, Clock, Trophy, Star, CheckCircle,
  FlaskConical, Calculator, BookOpen, Sun, Moon,
  Smartphone, User, Zap, Brain, Quote, Shield,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

// Saudação dinâmica
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

type Progress = {
  completed: number;
  total: number;
  streak: number;
  achievements: string[];
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  let user: any = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch {
    user = null;
  }
  const [progress, setProgress] = useState<Progress | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [depoimentoIdx, setDepoimentoIdx] = useState(0);

  const greeting = getGreeting();

  const depoimentos = [
    {
      nome: "João, Engenharia",
      avatar: "/avatars/joao.jpg",
      texto: '"Passei direto em cálculo com metade do tempo de estudo!"',
      estrelas: 5,
    },
    {
      nome: "Ana, Medicina",
      avatar: "/avatars/ana.jpg",
      texto: '"O Evolutiva me ajudou a manter o foco e não perder o ritmo!"',
      estrelas: 5,
    },
    {
      nome: "Lucas, Direito",
      avatar: "/avatars/lucas.jpg",
      texto: '"A gamificação me motivou a estudar todos os dias. Recomendo!"',
      estrelas: 5,
    },
  ];

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light';

    if (user && user.email) {
      fetch(`/api/progress?email=${user.email}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.progress) {
            setProgress(data.progress);
            if (data.newAchievement) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3000);
            }
          }
        });
    }
  }, [user, darkMode]);

  // Auto-slide a cada 6s
  useEffect(() => {
    const timer = setTimeout(() => {
      setDepoimentoIdx((prev) => (prev + 1) % depoimentos.length);
    }, 6000);
    return () => clearTimeout(timer);
  }, [depoimentoIdx]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Percentual de progresso
  const progressPercent = progress && progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  // Dias do mês dinâmico para o calendário
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
// Se não estiver logado, mostra tela de boas-vindas

if (!user?.email) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 text-white p-5 pt-0">

      {/* Cabeçalho da página */}
      <header className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2 px-1 sm:px-10 py-1">
        <span className="flex items-center justify-center rounded-full shadow-lg bg-gradient-to-br from-cyan-400 to-blue-500 mb-1 w-14 h-14">
          <svg viewBox="0 0 32 32" fill="white" className="w-8 h-8" aria-hidden="true">
            <title>Logo Evolutiva</title>
            <desc>Logo em formato de livro aberto</desc>
            <path d="M16 3L4 9.5l12 6.5 12-6.5L16 3zM4 22.5l12 6.5 12-6.5M4 16l12 6.5 12-6.5" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight font-poppins">Evolutiva</h1>
      </header>

      <main className="w-full max-w-4xl mx-auto flex flex-col gap-3 px-1 sm:px-10 py-1 rounded-lg shadow-lg bg-white/10 backdrop-blur-md border border-white/20">

        {/* Hero / Mensagem principal */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-400">
            Desbloqueie seu potencial!
          </h2>
          <p className="text-white/90 text-base leading-snug">
            <span className="block"><span className="text-yellow-300 font-semibold">Estude menos.</span> Aprenda mais.</span>
            <span className="block">Resultados reais, no seu ritmo.</span>
          </p>
        </motion.div>

        {/* Indicador de progresso */}
        <div className="text-xs text-white/80 text-center">
          🎓 <span className="text-yellow-300 font-semibold">5.000+</span> alunos e <span className="text-yellow-300 font-semibold">10.000+</span> horas de estudo guiado!
        </div>

        {/* Diferenciais da plataforma */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {[
            { icon: <Trophy className="h-6 w-6 md:h-7 md:w-7 text-yellow-400" />, title: 'Gamificação', highlight: 'Badges', link: '/tour/gamificacao' },
            { icon: <Flame className="h-6 w-6 md:h-7 md:w-7 text-orange-400" />, title: 'Motivação', highlight: 'Streaks', link: '/tour/motivacao' },
            { icon: <Star className="h-6 w-6 md:h-7 md:w-7 text-blue-400" />, title: 'Personalizado', highlight: 'Para você', link: '/tour/personalizado' },
            { icon: <Smartphone className="h-6 w-6 md:h-7 md:w-7 text-green-400" />, title: 'Tour Virtual', highlight: 'Veja por dentro', link: '/tour' }
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.06 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20 flex flex-col items-center text-center hover:bg-white/20 cursor-pointer transition-all duration-200"
              onClick={() => navigate(item.link)}
              role="button"
              tabIndex={0}
              aria-label={`Ver mais sobre ${item.title}`}
              onKeyPress={e => e.key === 'Enter' && navigate(item.link)}
            >
              <div className="mb-1">{item.icon}</div>
              <h3 className="font-bold text-xs mb-0.5">{item.title}</h3>
              <span className="text-[11px] text-yellow-300">{item.highlight}</span>
            </motion.div>
          ))}
        </section>

        {/* Botões de chamada para ação */}
        <div className="space-y-2 mt-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-2 rounded-xl shadow-lg flex items-center justify-center gap-2"
            onClick={() => navigate('/cadastro')}
          >
            <Zap className="h-4 w-4" />
            <span>COMEÇAR AGORA</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full border-2 border-white/30 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2 bg-white/5 hover:bg-white/20"
            onClick={() => navigate('/login')}
          >
            <User className="h-4 w-4" />
            <span>JÁ SOU CADASTRADO</span>
          </motion.button>
        </div>

        {/* Rodapé */}
        <footer className="text-xs text-white/60 mt-2 flex items-center justify-center gap-1">
          <Shield className="h-3 w-3 text-green-400" />
          <span>Plataforma segura</span>
        </footer>

        {/* Frase final + scroll indicador */}
        <div className="text-xs text-white/50 mt-1 text-center italic">
          Você no controle do seu futuro 💡
        </div>
        <div className="flex justify-center mt-2 animate-bounce text-white/30">
          <ChevronDown className="h-5 w-5" />
        </div>
      </main>

      {/* Botão flutuante "Começar Agora" */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-full shadow-lg flex items-center gap-2 md:hidden"
        onClick={() => navigate('/cadastro')}
        aria-label="Começar agora"
      >
        <Zap className="h-5 w-5" />
        Começar Agora
      </motion.button>

      {/* Botão de alternar tema */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 md:top-6 md:right-6"
        aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
        type="button"
      >
        {darkMode ? (
          <Sun className="h-6 w-6 text-yellow-300" />
        ) : (
          <Moon className="h-6 w-6 text-blue-400" />
        )}
      </button>
    </div>
  );
}



  // Usuário logado: dashboard
  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          colors={['#FFD700', '#FF5E5E', '#8A2BE2', '#00FFFF']}
        />
      )}

      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting}, <span className="text-blue-600">{user.name}</span>!
            </h1>
            <p className="text-sm opacity-80">Pronto para bater sua meta de hoje?</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar modo escuro"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        {/* Cards principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Meta diária */}
          <div className={`rounded-xl shadow-lg p-6 transition-all hover:shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Flame className="text-orange-500" /> Meta diária
              </h2>
              <span className="text-sm font-medium">
                {progress?.completed || 0}/{progress?.total || 1} concluídos
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2.5 rounded-lg shadow hover:opacity-90 transition flex items-center justify-center gap-2"
              onClick={() => navigate('/study')}
              aria-label="Iniciar sessão de estudo"
            >
              <Clock className="h-5 w-5" /> Iniciar sessão
            </button>
          </div>

          {/* Progresso semanal */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Progresso semanal
            </h2>
            <div className="flex items-center justify-between">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={darkMode ? '#374151' : '#e5e7eb'}
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    strokeDasharray={`${progressPercent}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold text-xl">
                    {progressPercent}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Flame className="text-orange-500" />
                  <span className="font-bold">{progress?.streak || 0} dias</span>
                </div>
                <p className="text-sm opacity-80 mt-1">Sequência atual</p>
              </div>
            </div>
          </div>

          {/* Recomendações */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Star className="text-blue-500" /> Recomendações
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <FlaskConical className="text-purple-600" />
                  <span>Química: Ligações químicas</span>
                </div>
                <span className="text-sm bg-blue-100 px-2 py-1 rounded">15 min</span>
              </li>
              <li className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                <div className="flex items-center gap-3">
                  <Calculator className="text-blue-600" />
                  <span>Matemática: Funções</span>
                </div>
                <span className="text-sm bg-green-100 px-2 py-1 rounded">30 min</span>
              </li>
              <li className="flex items-center justify-between p-3 rounded-lg bg-yellow-50/50">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-green-600" />
                  <span>Português: Gramática</span>
                </div>
                <span className="text-sm bg-yellow-100 px-2 py-1 rounded">20 min</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Continue de onde parou */}
        <div className={`rounded-xl shadow-lg p-6 mt-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="font-bold text-lg mb-4">Continue de onde parou</h2>
          <div className="flex items-center justify-between p-4 rounded-lg bg-indigo-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium">Literatura Brasileira</h3>
                <p className="text-sm opacity-80">Modernismo - Parte 2</p>
              </div>
            </div>
            <button className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              Continuar
            </button>
          </div>
        </div>

        {/* Conquistas */}
        <div className={`rounded-xl shadow-lg p-6 mt-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="font-bold text-lg mb-4">Conquistas</h2>
          <div className="flex flex-wrap gap-3">
            {progress?.achievements?.length ? (
              progress.achievements.map((ach, index) => (
                <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-yellow-100 to-yellow-50 border border-yellow-200">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-sm">{ach}</span>
                </div>
              ))
            ) : (
              <p className="text-sm opacity-80">Complete lições para desbloquear conquistas!</p>
            )}
            {progress?.streak && progress.streak >= 3 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-orange-100 to-yellow-50 border border-orange-200 animate-pulse">
                <Flame className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-sm">🔥 {progress.streak} dias de streak!</span>
              </div>
            )}
          </div>
        </div>

        {/* Calendário de Estudos */}
        <div className={`rounded-xl shadow-lg p-6 mt-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="font-bold text-lg mb-4">Calendário de Estudos</h2>
          <div className="grid grid-cols-7 gap-2 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
              <div key={i} className="font-medium text-sm">{day}</div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => (
              <div
                key={i}
                className={`h-10 rounded-full flex items-center justify-center text-sm ${
                  i === today.getDate() - 1
                    ? 'bg-blue-600 text-white font-bold'
                    : i < today.getDate() - 1
                      ? darkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                      : darkMode
                        ? 'bg-gray-800'
                        : 'bg-white'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>       
      </div>
    </div>
  );
};

export default HomePage;