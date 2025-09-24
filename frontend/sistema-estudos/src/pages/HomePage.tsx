import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, ChevronDown, Zap, User, Shield, Flame, Trophy, Star, Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import UserProgressDashboard from '../components/UserProgressDashboard';

// Saudação dinâmica
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
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
  const [darkMode, setDarkMode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Dados para dashboard centralizado
  const [userData, setUserData] = useState({
    name: user?.name || "",
    avatarUrl: user?.avatar || "",
    level: user?.level || 1,
    badges: user?.badges || [],
    xp: user?.xp || 0,
    streak: user?.streak || 0,
  });
  const [progresso, setProgresso] = useState<{ materia: string; percent: number }[]>([]);
  const [achievements, setAchievements] = useState<{ id: number; title: string; description: string; date: string }[]>([]);

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
  }, [darkMode]);

  // Busca dados reais do usuário logado e progresso
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!(user && user.email)) return;
      try {
        const meRes = await fetch("/api/user/me", { credentials: "include" });
        if (!meRes.ok) return;
        const me = await meRes.json();
        if (!mounted) return;
        setUserData({
          name: me.nome || user.name || "",
          avatarUrl: me.avatar || user.avatar || "",
          level: me.level || 1,
          badges: me.badges || [],
          xp: me.xp || 0,
          streak: me.streak || 0,
        });
        const userId = me.id;
        if (!userId) return;
        // Descobre curso do usuário e depois busca progresso por matéria
        const cursoRes = await fetch(`/api/progresso/user/${userId}/curso`, { credentials: "include" });
        if (!cursoRes.ok) return;
        const curso = await cursoRes.json();
        if (!curso?.id) return;
        const [progRes, achRes] = await Promise.all([
          fetch(`/api/progresso/materias/${userId}/${curso.id}`, { credentials: "include" }),
          fetch(`/api/progresso/achievements/${userId}`, { credentials: "include" })
        ]);
        const prog = progRes.ok ? await progRes.json() : null;
        const ach = achRes.ok ? await achRes.json() : null;
        if (!mounted) return;
        setProgresso(prog?.progresso || []);
        setAchievements(
          (ach?.achievements || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            date: a.earned_at,
          }))
        );
      } catch {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  const greeting = getGreeting();

  // Se não estiver logado, mostra tela de boas-vindas
  if (!user?.email) {
    return (
  <div className="ml-sidebar pt-20 min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 text-white p-5">
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
          <div className="text-xs text-white/80 text-center">
            🎓 <span className="text-yellow-300 font-semibold">5.000+</span> alunos e <span className="text-yellow-300 font-semibold">10.000+</span> horas de estudo guiado!
          </div>
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
          <footer className="text-xs text-white/60 mt-2 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3 text-green-400" />
            <span>Plataforma segura</span>
          </footer>
          <div className="text-xs text-white/50 mt-1 text-center italic">
            Você no controle do seu futuro 💡
          </div>
          <div className="flex justify-center mt-2 animate-bounce text-white/30">
            <ChevronDown className="h-5 w-5" />
          </div>
        </main>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-full shadow-lg flex items-center gap-2 md:hidden"
          onClick={() => navigate('/cadastro')}
          aria-label="Começar agora"
        >
          <Zap className="h-5 w-5" />
          Começar Agora
        </motion.button>
        <button
          onClick={() => setDarkMode((prev) => !prev)}
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

  // Usuário logado: dashboard centralizado
  return (
  <div className={`ml-sidebar pt-20 min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          colors={['#FFD700', '#FF5E5E', '#8A2BE2', '#00FFFF']}
        />
      )}
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting}, <span className="text-blue-600">{userData.name}</span>!
            </h1>
            <p className="text-sm opacity-80">Pronto para bater sua meta de hoje?</p>
          </div>
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar modo escuro"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>
        {/* Painel centralizado de progresso, conquistas, XP, streak, badges */}
        <UserProgressDashboard
          user={userData}
          progresso={progresso}
          achievements={achievements}
          studyTime="2h15min"
        />
      </div>
    </div>
  );
};

export default HomePage;