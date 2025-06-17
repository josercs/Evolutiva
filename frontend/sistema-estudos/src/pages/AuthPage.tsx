import React, { useState, useEffect } from 'react';
import AuthForm from '../components/AuthForm';

const AuthPage = ({ onLogin }: { onLogin: () => void }) => {
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [courses, setCourses] = useState<{ name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Exemplo de backgrounds, ajuste conforme necessário
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

  const handleLogin = async (email: string, password: string) => {
    // LOGIN
    const response = await fetch("http://192.168.0.109:5000/api/login", {
      method: "POST",
      credentials: "include", // ESSENCIAL para o cookie de sessão ser enviado e recebido!
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data: { error?: string } | null = null;
    try {
      data = await response.json();
    } catch (e) {
      // Se não for JSON, segue fluxo normal
    }

    if (!response.ok || (data && data.error)) {
      alert(data?.error || "Login inválido. Verifique seu e-mail e senha.");
      return;
    }

    localStorage.setItem('userEmail', email);
    onLogin();
  };

 return (
  <main
    className={`min-h-screen flex justify-center items-center py-8 px-2 transition-colors duration-1000 ${backgrounds[backgroundIndex]}`}
    aria-label="Página de autenticação"
    style={{ overflowY: 'auto' }}
  >
    <div className="w-full max-w-lg bg-white bg-opacity-30 rounded-2xl shadow-3xl p-4 md:p-8 backdrop-blur-xl flex flex-col items-center">
      <AuthForm onLogin={handleLogin} />
    </div>
  </main>
);
};

export default AuthPage;
