import React, { useState } from "react";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogIn, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

type AuthFormProps = {
  onLogin: (email: string) => void;
};

const AuthForm = ({ onLogin }: AuthFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        // Salva o usuário no localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        onLogin(data.user.email); // Chama a função onLogin passada como prop

        // Após login bem-sucedido, verifica o estado do onboarding
        const userResponse = await fetch(`/api/auth/user/me?email=${encodeURIComponent(email)}`);
        const user = await userResponse.json();
        if (!user.user.onboarding_done) {
          window.location.href = "/onboarding";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        setLoginError(data.message || "Erro ao fazer login");
      }
    } catch (err) {
      setLoginError("Erro de conexão com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRegisterError(null);

    const name = (document.getElementById("name") as HTMLInputElement).value;
    const email = (document.getElementById("register-email") as HTMLInputElement).value;
    const password = (document.getElementById("register-password") as HTMLInputElement).value;
    const confirmPassword = (document.getElementById("confirm-password") as HTMLInputElement).value;

    if (password !== confirmPassword) {
      setRegisterError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    try {
      // Cadastro do usuário
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }), // Corrija aqui!
      });
      const data = await response.json();

      if (!response.ok) {
        setRegisterError(data.message || "Erro ao cadastrar");
        setIsLoading(false);
        return;
      }

      // Login automático após cadastro
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        setRegisterError(loginData.message || "Erro ao logar após cadastro");
        setIsLoading(false);
        return;
      }

      // Salva usuário no localStorage
      localStorage.setItem("user", JSON.stringify(loginData.user));

      // Checa se já fez onboarding
      const userResponse = await fetch(`/api/auth/user/me?email=${encodeURIComponent(email)}`);
      const user = await userResponse.json();

      if (!user.user.onboarding_done) {
        window.location.href = "/onboarding";
      } else {
        window.location.href = "/painel"; // ou "/dashboard"
      }
    } catch (err) {
      setRegisterError("Erro inesperado ao cadastrar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto shadow-lg rounded-xl border border-gray-200 bg-white/90 backdrop-blur-md py-4 px-2 md:px-4">
      <CardHeader className="space-y-1">
        <div className="flex flex-col items-center mb-1">
          {/* Logo SVG personalizado */}
          <span className="flex items-center justify-center rounded-full shadow-lg bg-gradient-to-br from-cyan-400 to-blue-500 mb-2 w-12 h-12">
            <svg
              viewBox="0 0 32 32"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              aria-hidden="true"
              focusable="false"
            >
              <title>Logo Evolutiva</title>
              <desc>Logo em formato de livro aberto, representando estudo</desc>
              <path d="M16 3L4 9.5l12 6.5 12-6.5L16 3zM4 22.5l12 6.5 12-6.5M4 16l12 6.5 12-6.5" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </span>
          <CardTitle className="text-lg font-bold text-center">Evolutiva</CardTitle>
          <CardDescription className="text-center text-sm">
            Plataforma de estudos autônomos
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800">
                    Esqueceu a senha?
                  </a>
                </div>
                <Input id="password" type="password" required />
              </div>
              {loginError && (
                <div className="text-red-500 text-sm mt-2">
                  {loginError}
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 4px 24px 0 rgba(59,130,246,0.15)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg mt-4 transition"
                type="submit"
              >
                Entrar
              </motion.button>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" type="text" placeholder="Seu nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" type="email" placeholder="seu@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Senha</Label>
                <Input id="register-password" type="password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input id="confirm-password" type="password" required />
              </div>
              {registerError && (
                <div className="text-red-500 text-sm mt-2">
                  {registerError}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cadastrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar
                  </span>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-gray-500">
          Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </div>
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
