import React, { useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import '../styles/PaginaConteudoOtimizada.css';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Player } from '@lottiefiles/react-lottie-player';
import { ContentDisplay } from '../components/conteudo/ContentDisplay';
import { StudyTabs } from '../components/conteudo/StudyTabs';
import { PomodoroTimer } from '../components/pomodoro/PomodoroTimer';
import { FloatingActionsBar } from '../components/navegacao/FloatingActionsBar';
import { UserProgress } from '../components/conteudo/UserProgress';
import { StudyAids } from '../components/conteudo/StudyAids';
import { useContentLoader } from '../hooks/useContentLoader';
import { usePomodoro } from '../hooks/usePomodoro';
import { useXPStreak } from '../hooks/useXPStreak';
import { useQuiz } from '../hooks/useQuiz';
import { useNotesQuestions } from '../hooks/useNotesQuestions';
import { useFeynman } from '../hooks/useFeynman';
import { useTTS } from '../hooks/useTTS';
import { useHighlighting } from '../hooks/useHighlighting';
import { useMindMap } from '../hooks/useMindMap';
import { useAuth } from "../hooks/useAuth"; // ajuste o caminho conforme sua estrutura

// Importa animação do mascote (opcional)
import mascotAnimation from '../assets/mascot_study.json';
const ytKey = import.meta.env.VITE_YT_API_KEY;
// Lista de dicas de estudo exibidas para o usuário
const studyTips = [
    "Faça anotações enquanto lê o conteúdo - escrever ajuda a fixar melhor.",
    "Explique o que aprendeu com suas próprias palavras (técnica Feynman).",
    "Resolva exercícios sobre o tema após estudar para aplicar o conhecimento.",
    "Use mapas mentais para organizar visualmente as ideias principais.",
    "Faça pausas de 5 minutos a cada 25-30 minutos de estudo (Técnica Pomodoro).",
    "Revise o conteúdo após 1 dia, 1 semana e 1 mês para melhor retenção.",
    "Relacione o novo conteúdo com algo que você já sabe para criar conexões.",
    "Estude em um ambiente tranquilo e sem distrações para melhor concentração.",
];

// Função auxiliar para tocar sons (placeholder)
const playSound = (type: 'correct' | 'error' | 'pomodoro-end' | 'pomodoro-start' | 'xp') => {
    console.log(`Playing sound: ${type}`);
    // Implemente a lógica real de som aqui
};

// Função auxiliar para mostrar feedback visual animado de XP (com cleanup)
const showXPFloat = (text: string) => {
    const xpTag = document.createElement("div");
    xpTag.textContent = text + " 🎉";
    xpTag.className = "xp-float-anim fixed top-24 right-8 select-none pointer-events-none animate-fade-in";
    document.body.appendChild(xpTag);
    // Remove após animação (~2s) evitando acúmulo no DOM
    setTimeout(() => {
        try { xpTag.remove(); } catch { /* noop */ }
    }, 2000);
};

/**
 * Componente principal da página de conteúdo otimizada.
 * Gerencia exibição do conteúdo, recursos de estudo, progresso, Pomodoro, quiz, etc.
 */
const PaginaConteudoOtimizada: React.FC = () => {
    const navigate = useNavigate();
    const mainContentRef = useRef<HTMLDivElement>(null);

    // --- Hooks de estado ---
    const [activeTab, setActiveTab] = useState<'content' | 'summary' | 'qa'>('content');
    const [showTips, setShowTips] = useState(false);
    const [darkMode, setDarkMode] = useState(false); // Tema escuro/claro
    // Estado para mostrar/ocultar o Pomodoro flutuante
    const [showPomodoro, setShowPomodoro] = useState(false);

    // --- Hooks personalizados ---
    // Carrega o conteúdo da API/backend
    const { id, conteudo, loading } = useContentLoader();
    // Gerencia XP e streak do usuário
    // Substitua 'userId' pela variável/campo correto que representa o ID do usuário logado
    const { userId } = useAuth();
    const userIdNum = Number(userId) || 0;
    const { xp, streak, addXp, incrementStreak, resetStreak } = useXPStreak(String(userIdNum)); // ou simplesmente use userId se já for string

    // Callback chamado ao finalizar um ciclo de foco (Pomodoro)
    const handleWorkComplete = useCallback(() => {
        addXp(15);
        showXPFloat("+15 XP por focar!");
        playSound('pomodoro-end');
    }, [addXp]);

    // Callback para tocar som ao iniciar/finalizar foco
    const handlePlaySound = useCallback((isFocusDone: boolean) => {
        playSound(isFocusDone ? 'pomodoro-end' : 'pomodoro-start');
    }, []);

    // Hook do Pomodoro, recebe callbacks para eventos
    const pomodoroHook = usePomodoro({
        onWorkComplete: handleWorkComplete,
        playSound: handlePlaySound,
    });

    // Callback chamado ao finalizar um quiz
    const handleQuizComplete = useCallback((correctCount: number, totalQuestions: number) => {
        if (totalQuestions > 0 && correctCount >= Math.ceil(totalQuestions / 2)) {
            const scoreXp = correctCount * 10;
            addXp(scoreXp);
            incrementStreak();
            showXPFloat(`+${scoreXp} XP pelo Quiz!`);
            playSound('correct');
            toast.success(`Parabéns! Você ganhou ${scoreXp} XP e aumentou seu streak!`);
        } else {
            resetStreak();
            playSound('error');
            toast.warn("Continue estudando! Você não atingiu a pontuação mínima no quiz.");
        }
    }, [addXp, incrementStreak, resetStreak]);

    // Hook do quiz, recebe callbacks e dados do conteúdo
    const quizHook = useQuiz({
        contentId: id,
        contentHtml: conteudo?.content_html,
        onQuizComplete: handleQuizComplete,
    });

    // Hook para anotações e perguntas do usuário
    const notesQuestionsHook = useNotesQuestions({ contentId: id });
    // Hook para técnica Feynman (explicação com suas próprias palavras)
    const feynmanHook = useFeynman({ contentHtml: conteudo?.content_html });
    const ttsHook = useTTS({ contentRef: mainContentRef });
    // Hook para marcação de texto
    const highlightingHook = useHighlighting({ contentRef: mainContentRef });
    // Hook para mapas mentais
    const mindMapHook = useMindMap({ contentId: id, contentHtml: conteudo?.content_html, fallbackTopic: conteudo?.topic });

    // --- Video suggestions area (YouTube) ---
    const VideoAreaLazy = lazy(() => import('../components/video/VideoArea').then(m => ({ default: m.VideoArea })));
    const VideoGridAreaLazy = lazy(() => import('../components/video/VideoGridArea').then(m => ({ default: m.VideoGridArea })));

    // Lazy imports for modal components to fix missing names and reduce bundle size
    const QuizModalWrapper = lazy(() => import('../components/quiz/QuizModalWrapper').then(m => ({ default: m.QuizModalWrapper })));
    const MindMapViewer = lazy(() => import('../components/mapas_mentais/MindMapViewer').then(m => ({ default: m.MindMapViewer })));

    // Alterna exibição das dicas de estudo
    const toggleTipsCallback = useCallback(() => setShowTips(prev => !prev), []);

    // Geração local de questões removida: usamos o backend via `quizHook` (Gemini) para gerar quizzes.

    // Memoiza o conteúdo de perguntas/anotações para evitar re-renderizações desnecessárias
    const qaContent = useMemo(() => (
        <StudyAids
            studyTips={studyTips}
            showTips={showTips}
            toggleTips={toggleTipsCallback}
            feynmanText={feynmanHook.feynmanText}
            setFeynmanText={feynmanHook.setFeynmanText}
            feynmanFeedback={feynmanHook.feynmanFeedback}
            getFeynmanFeedback={feynmanHook.getFeynmanFeedback}
            isFetchingFeynmanFeedback={feynmanHook.isFetchingFeedback}
            userNotes={notesQuestionsHook.userNotes}
            setUserNotes={notesQuestionsHook.setUserNotes}
            questions={notesQuestionsHook.questions}
            currentQuestion={notesQuestionsHook.currentQuestion}
            setCurrentQuestion={notesQuestionsHook.setCurrentQuestion}
            addQuestion={notesQuestionsHook.addQuestion}
            removeQuestion={notesQuestionsHook.removeQuestion}
        />
    ), [
        showTips, toggleTipsCallback, feynmanHook.feynmanText, feynmanHook.feynmanFeedback,
        feynmanHook.getFeynmanFeedback, feynmanHook.isFetchingFeedback, feynmanHook.setFeynmanText,
        notesQuestionsHook.userNotes, notesQuestionsHook.setUserNotes, notesQuestionsHook.questions,
        notesQuestionsHook.currentQuestion, notesQuestionsHook.setCurrentQuestion,
        notesQuestionsHook.addQuestion, notesQuestionsHook.removeQuestion
    ]);

    // Alterna tema escuro/claro
    const toggleTheme = () => setDarkMode((prev) => !prev);

    // Adiciona ou remove a classe 'dark' no elemento root do HTML conforme o tema
    React.useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // --- Renderização principal ---
    if (loading) {
        // Exibe tela de loading com mascote animado
        return (
            <div className="ml-sidebar pt-20 flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
                <Player
                    autoplay
                    loop
                    src={mascotAnimation}
                    style={{ height: '120px', width: '120px' }}
                />
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mt-4"></div>
                <span className="mt-4 text-lg font-semibold text-blue-600 dark:text-blue-300 font-sans">Carregando conteúdo...</span>
            </div>
        );
    }

    if (!conteudo) {
        // Exibe mensagem de erro caso não encontre o conteúdo
        return (
            <div className="ml-sidebar pt-20 flex flex-col justify-center items-center min-h-screen text-center px-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
                <Player
                    autoplay
                    loop
                    src={mascotAnimation}
                    style={{ height: '120px', width: '120px' }}
                />
                <p className="text-red-600 font-semibold mt-4 font-sans">Erro ao carregar o conteúdo. Por favor, tente voltar ou recarregar a página.</p>
            </div>
        );
    }

    console.log("conteudo:", conteudo);

    // Função para retornar ícone de acordo com a matéria
    function getSubjectIcon(subject: string) {
        switch (subject) {
            case 'Ciências da Natureza': return '🌋';
            case 'Matemática': return '📐';
            case 'Linguagens': return '📚';
            case 'Humanas': return '🌎';
            default: return '📖';
        }
    }

    return (
        <div
            className={`ml-sidebar pt-20 min-h-screen transition-colors duration-500 font-sans custom-font-family ${darkMode
                ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
                : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50'
                }`}
        >

            {/* Botão para alternar tema escuro/claro */}
            <button
                onClick={toggleTheme}
                className="fixed top-20 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-full p-3 transition-colors"
                aria-label="Alternar tema"
                title={darkMode ? "Tema claro" : "Tema escuro"}
            >
                {darkMode ? (
                    <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                )}
            </button>

            {/* Mascote animado no canto inferior esquerdo */}
            <div className="fixed bottom-6 left-6 z-40 hidden md:block pointer-events-none select-none">
                <Player
                    autoplay
                    loop
                    src={mascotAnimation}
                    style={{ height: '90px', width: '90px' }}
                />
            </div>

            {/* Conteúdo principal da página */}
            <div className="container mx-auto p-2 flex flex-col lg:flex-row gap-4 lg:gap-8">
                {/* Área principal de estudo */}
                <main className="flex-grow w-full lg:w-2/3 order-1 flex justify-center">
                    <div className="w-full max-w-4xl px-2 sm:px-4 md:px-8 py-4 sm:py-8 bg-white/95 dark:bg-gray-900/90 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-2xl border border-gray-200 dark:border-gray-800 font-sans">
                        {/* Título do conteúdo com ícone e badge de dificuldade */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl" title={conteudo.materia}>{getSubjectIcon(conteudo.materia)}</span>
                            {conteudo.difficulty && (
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-bold ${conteudo.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
                                        conteudo.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}
                                    title={`Dificuldade: ${conteudo.difficulty === 'basic'
                                        ? 'Fácil'
                                        : conteudo.difficulty === 'intermediate'
                                            ? 'Médio'
                                            : conteudo.difficulty === 'advanced'
                                                ? 'Difícil'
                                                : conteudo.difficulty
                                        }`}
                                >
                                    {conteudo.difficulty === 'basic'
                                        ? 'Fácil'
                                        : conteudo.difficulty === 'intermediate'
                                            ? 'Médio'
                                            : conteudo.difficulty === 'advanced'
                                                ? 'Difícil'
                                                : conteudo.difficulty}
                                </span>
                            )}
                        </div>
                        {/* Título principal do conteúdo */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 drop-shadow-lg font-sans tracking-tight custom-content-title-shadow">
                            {conteudo.topic}
                        </h1>
                        {/* Subtítulo com nome da matéria e dificuldade */}
                        <p className="text-base text-gray-700 dark:text-gray-300 mb-4 font-medium">
                            {conteudo.materia} {conteudo.difficulty && `| ${conteudo.difficulty}`}
                        </p>

                        {/* Barra de progresso do usuário */}
                        <UserProgress xp={xp} streak={streak} />

                        {/* Abas de navegação: conteúdo, resumo, perguntas/anotações */}
                        <StudyTabs
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            summaryContent={(
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">Quiz do conteúdo</h3>
                                            <p className="text-sm text-slate-600">Perguntas geradas automaticamente pelo sistema (IA Gemini).</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={quizHook.generateQuiz} disabled={quizHook.quizLoading} className="px-3 py-1.5 rounded-md text-sm border bg-blue-600 text-white hover:bg-blue-700">
                                                {quizHook.quizLoading ? 'Gerando…' : 'Gerar novo quiz'}
                                            </button>
                                        </div>
                                    </div>
                                    {!quizHook.quizQuestions.length ? (
                                        <div className="rounded-xl border border-slate-200 p-4 text-slate-600">Clique em “Gerar novo quiz” para começar.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-slate-700">Quiz pronto — abra o modal para responder.</div>
                                                                                                <div>
                                                                                                        <button
                                                                                                            onClick={() => quizHook.showQuiz ? quizHook.closeQuiz() : quizHook.openQuiz()}
                                                                                                            className="px-3 py-1.5 rounded-md text-sm border"
                                                                                                        >
                                                                                                            {quizHook.showQuiz ? 'Fechar Quiz' : 'Responder Quiz'}
                                                                                                        </button>
                                                                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            qaContent={qaContent}
                            contentDisplay={
                                <ContentDisplay contentHtml={conteudo.content_html} contentRef={mainContentRef} />
                            }
                            middleTabLabel="Questões"
                            renderMiddleHeader={false}
                        />

                        {/* Video suggestions related to the topic */}
                        <div className="mt-6">
                            <Suspense fallback={<div className="text-center text-sm text-gray-500">Carregando vídeos relacionados...</div>}>
                                <VideoGridAreaLazy
                                    topic={conteudo.topic}
                                    contentHtml={conteudo.content_html}
                                    materia={conteudo.materia}
                                    fallbackLink={`https://www.youtube.com/results?search_query=${encodeURIComponent(conteudo.topic)}`}
                                />
                            </Suspense>
                            <div className="mt-4">
                                <Suspense fallback={<div className="text-center text-xs text-gray-500">Carregando sugestão de vídeo...</div>}>
                                    <VideoAreaLazy
                                        topic={conteudo.topic}
                                        contentHtml={conteudo.content_html}
                                        materia={conteudo.materia}
                                    />
                                </Suspense>
                            </div>
                        </div>



                        {/* Cards de recursos adicionais: vídeo, exercícios, Wikipedia */}
                        <div className="mt-8 p-4 sm:p-6 bg-white/90 dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl sm:text-2xl font-extrabold mb-4 sm:mb-6 text-center text-blue-700 dark:text-blue-300 tracking-tight">
                                Potencialize seu aprendizado
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                                {/* Card de vídeo aula */}
                                <a
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(conteudo.topic)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-md hover:scale-105 hover:shadow-2xl transition-all flex flex-col items-center text-center cursor-pointer border border-gray-100 dark:border-gray-800"
                                    title="Assista a uma vídeo aula sobre o tema"
                                >
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-100 to-pink-200 dark:from-gray-800 dark:to-gray-900 rounded-full flex items-center justify-center mb-3 shadow-md group-hover:animate-bounce">
                                        {/* Ícone de vídeo */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-7 w-7 sm:h-8 sm:w-8 text-red-500"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-14a6 6 0 110 12 6 6 0 010-12z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1">Vídeo Aula</h4>
                                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                                        Clique para buscar no YouTube vídeos sobre este tópico
                                    </p>
                                </a>

                                {/* Card de exercícios */}
                                <a
                                    href="https://www.todamateria.com.br/exercicios/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group p-4 sm:p-6 bg-gradient-to-br from-green-100 to-teal-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-md hover:scale-105 hover:shadow-2xl transition-all flex flex-col items-center text-center cursor-pointer"
                                    tabIndex={0}
                                    title="Pratique com exercícios sobre este conteúdo"
                                >
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 dark:bg-gray-900 rounded-full flex items-center justify-center mb-3 shadow-md group-hover:animate-bounce">
                                        {/* Ícone de exercícios */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-7 w-7 sm:h-8 sm:w-8 text-green-500"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1">Exercícios</h4>
                                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                                        Pratique com exercícios sobre este conteúdo
                                    </p>
                                </a>
                                {/* Card de Wikipedia */}
                                <a
                                    href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(conteudo.topic)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group p-4 sm:p-6 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-md hover:scale-105 hover:shadow-2xl transition-all flex flex-col items-center text-center cursor-pointer"
                                    tabIndex={0}
                                    title="Consulte informações adicionais na Wikipedia"
                                >
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 dark:bg-gray-900 rounded-full flex items-center justify-center mb-3 shadow-md group-hover:animate-bounce">
                                        {/* Ícone de Wikipedia */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-7 w-7 sm:h-8 sm:w-8 text-blue-500"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 005.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1">Wikipedia</h4>
                                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                                        Consulte informações adicionais na enciclopédia livre
                                    </p>
                                </a>
                            </div>
                        </div>
                        {/* Fim dos recursos adicionais */}

                        {/* Botão para marcar conteúdo como concluído */}
                        <button
                            onClick={async () => {
                                const userId = localStorage.getItem("userId"); // Certifique-se que está salvo corretamente após login/cadastro

                                if (!userId || userId === "undefined") {
                                    alert("Usuário não autenticado. Faça login novamente.");
                                    return;
                                }

                                await fetch('/api/conteudos/concluir', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                        user_id: userId,       // deve ser o id real do usuário
                                        content_id: conteudo.id  // id do conteúdo que está sendo concluído
                                    })
                                });
                                toast.success("Conteúdo marcado como concluído!");
                            }}
                            className={`mt-4 px-4 py-2 rounded-lg transition-colors ${conteudo.is_completed
                                ? 'bg-green-500 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                            disabled={conteudo.is_completed}
                        >
                            {conteudo.is_completed ? '✓ Concluído' : 'Marcar como concluído'}
                        </button>
                    </div>
                </main>

                {/* Remova o <aside> aqui */}
            </div>

            {/* Pomodoro flutuante */}
            <div>
                {/* Botão flutuante para abrir/fechar o Pomodoro */}
                <button
                    className="fixed bottom-56 right-4 z-40 bg-red-500 hover:bg-red-600 text-white rounded-full p-3 shadow-lg transition-all
                        w-12 h-12 flex items-center justify-center text-xl pomodoro-float-btn"
                    title="Abrir Pomodoro"
                    onClick={() => setShowPomodoro((prev) => !prev)}
                >
                    ⏲️
                </button>
                {/* Card Pomodoro flutuante - versão ultra compacta */}
                {showPomodoro && (
                    <div
                        className="fixed bottom-60 right-4 z-50 bg-white/90 dark:bg-gray-800/90 rounded shadow border border-gray-200 dark:border-gray-700 p-1 w-24 max-w-[60vw] animate-fade-in backdrop-blur-sm pomodoro-compact-card"
                    >
                        <div className="flex justify-between items-center mb-0.5 text-[9px]">
                            <span className="font-bold text-red-500">⏲️</span>
                            <button
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xs"
                                onClick={() => setShowPomodoro(false)}
                                title="Fechar"
                                aria-label="Fechar Pomodoro"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <PomodoroTimer
                                pomodoro={{
                                    ...pomodoroHook.pomodoro,
                                    isBreak: pomodoroHook.pomodoro.mode === 'break',
                                }}
                                toggleTimer={pomodoroHook.toggleTimer}
                                resetTimer={pomodoroHook.resetTimer}
                                switchToBreak={pomodoroHook.switchToBreak}
                                switchToWork={pomodoroHook.switchToWork}
                                compact
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Barra de ações flutuantes ( TTS, quiz, etc) */}
            <FloatingActionsBar
                onHighlight={highlightingHook.applyHighlight}
                onToggleTTS={ttsHook.toggleTTS}
                isTTSActive={ttsHook.ttsActive}
                onGenerateQuiz={quizHook.generateQuiz}

                onToggleMindMap={mindMapHook.toggleMindMapVisibility}
            />

            {/* Modais carregados sob demanda */}
            <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-20 flex justify-center items-center z-50"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div></div>}>
                {quizHook.quizLoading && (
                    <div className="fixed inset-0 bg-gradient-to-br from-blue-100 via-cyan-100 to-sky-100 bg-opacity-80 flex items-center justify-center z-50">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-blue-300 flex flex-col items-center animate-fade-in">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mb-6"></div>
                            <span className="text-xl font-semibold text-blue-700 mb-2">Gerando quiz...</span>
                            <span className="text-gray-500 text-base">Aguarde enquanto as perguntas são preparadas para você.</span>
                        </div>
                    </div>
                )}
                {quizHook.showQuiz && (
                    <QuizModalWrapper
                        showQuiz={quizHook.showQuiz}
                        quizQuestions={quizHook.quizQuestions}
                        quizLoading={quizHook.quizLoading}
                        selectedAnswers={quizHook.selectedAnswers}
                        showResults={quizHook.showResults}
                        quizFeedback={quizHook.quizFeedback}
                        isSubmitting={quizHook.isSubmitting}
                        handleSelectAnswer={quizHook.handleSelectAnswer}
                        handleSubmitQuiz={quizHook.handleSubmitQuiz}
                        closeQuiz={quizHook.closeQuiz}
                        currentQuizIdx={quizHook.currentQuizIdx}
                        nextQuestion={quizHook.nextQuestion}
                    />
                )}
                {mindMapHook.showMindMap && (
                    <MindMapViewer
                        show={mindMapHook.showMindMap}
                        data={mindMapHook.mindMapData}
                        isLoading={mindMapHook.isLoadingMap}
                        isAdvancedMode={mindMapHook.isAdvancedMode}
                        onClose={mindMapHook.toggleMindMapVisibility}
                        onToggleMode={mindMapHook.toggleMindMapMode}
                        onRegenerate={mindMapHook.generateMap}
                    />
                )}
            </Suspense>

            {/* Barra de dicas de estudo */}
            <div className={`fixed bottom-0 left-0 w-full p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg transition-transform duration-300 ${showTips ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={toggleTipsCallback}
                        className="text-blue-600 dark:text-blue-300 font-semibold hover:underline focus:outline-none"
                        title="Alternar dicas de estudo"

                    >
                        {showTips ? "Ocultar dicas" : "Mostrar dicas de estudo"}
                    </button>
                </div>
            </div>

            {/* Área para feedback visual animado de XP */}
            <div id="xp-feedback" className="fixed top-16 right-4 z-50 pointer-events-none"></div>
        </div>
    );
};

export default PaginaConteudoOtimizada;

