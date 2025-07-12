import React, { useState, useEffect } from 'react';
import AuthForm from '../components//autenticacao/AuthForm';

const AuthPage = () => {
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  const backgrounds = [
    'bg-gradient-to-r from-blue-500 to-indigo-600',
    'bg-gradient-to-r from-purple-500 to-pink-500',
    'bg-gradient-to-r from-green-400 to-blue-500',
    'bg-gradient-to-r from-yellow-400 to-orange-500'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

  return (
    <main
      className={`min-h-screen flex justify-center items-center py-8 px-2 transition-colors duration-1000 ${backgrounds[backgroundIndex]}`}
      aria-label="Página de autenticação"
      style={{ overflowY: 'auto' }}
    >
      <div className="w-full max-w-lg bg-white bg-opacity-30 rounded-2xl shadow-3xl p-4 md:p-8 backdrop-blur-xl flex flex-col items-center">
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
