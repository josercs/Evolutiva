import React, { useState, useEffect } from 'react';
import AuthForm from '../components//autenticacao/AuthForm';

const AuthPage = () => {
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  const backgrounds = [
    'bg-gradient-to-r from-sky-600 to-blue-500',
    'bg-gradient-to-br from-sky-500 to-cyan-500',
    'bg-gradient-to-tr from-blue-600 to-cyan-500'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

  return (
    <main
  className={`ml-sidebar pt-navbar min-h-screen overflow-y-auto flex justify-center items-center py-8 px-2 transition-colors duration-1000 ${backgrounds[backgroundIndex]}`}
      aria-label="Página de autenticação"
    >
      <div className="w-full max-w-lg bg-white/30 rounded-2xl shadow-premium p-4 md:p-8 backdrop-blur-xl flex flex-col items-center border border-white/20">
        <AuthForm
          onLogin={async (user) => {
            localStorage.setItem("userId", String(user.id));
            if (user.curso_id !== undefined && user.curso_id !== null) {
              localStorage.setItem("cursoId", String(user.curso_id));
            } else {
              localStorage.removeItem("cursoId");
            }
          }}
        />
      </div>
    </main>
  );
};

export default AuthPage;
