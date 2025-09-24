import React, { useEffect } from "react";
import WeeklyQuizWidget from "../components/quiz/WeeklyQuizWidget";

const QuestoesPage: React.FC = () => {
  // Support deep-linking like /questoes#revisao-semanal
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        // small delay to ensure layout paints
        const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return () => clearTimeout(t);
      }
    }
  }, []);

  return (
    <main className="relative ml-sidebar pt-20 max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.06),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.05),transparent)]" />

      <header className="rounded-3xl overflow-hidden bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 border border-blue-100/60">
        <div className="px-6 py-8 md:px-10 md:py-10">
          <h1 className="text-2xl md:text-[2rem] font-extrabold tracking-tight bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
            Questões
          </h1>
          <p className="mt-2 text-slate-600">Resolva questões para reforçar o aprendizado. Comece pela revisão semanal.</p>
        </div>
      </header>

      <section id="revisao-semanal" aria-labelledby="revisao-semanal-titulo" className="grid grid-cols-1 gap-6">
        <h2 id="revisao-semanal-titulo" className="sr-only">Revisão da Semana</h2>
        <WeeklyQuizWidget />
      </section>

      {/* Espaço para futuras seções da página de Questões */}
      {/* <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm min-h-[120px]">Banco de questões (em breve)</div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm min-h-[120px]">Simulados rápidos (em breve)</div>
      </section> */}
    </main>
  );
};

export default QuestoesPage;
