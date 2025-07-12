import React, { useState } from "react";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from "react-router-dom";

interface UserLoginData {
  id: string | number;
  curso_id?: string | number | null;
  email: string;
  name: string;
  has_onboarding: boolean;
  avatar_url?: string | null; // <--- ajuste aqui
  created_at?: string;
  updated_at?: string;
}

interface AuthFormProps {
  onLogin: (user: UserLoginData) => void;
}

const sanitizeInput = (input: string) => input.replace(/<[^>]*>?/gm, '');

const AuthForm = ({ onLogin }: AuthFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const validateLogin = () => {
    if (!formData.email.includes('@')) {
      setLoginError('Email inválido');
      return false;
    }
    if (formData.password.length < 4) {
      setLoginError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    return true;
  };

  interface UserData {
    id: number;
    name: string;
    email: string;
    has_onboarding: boolean;
    curso_id: number | null;
    avatar_url?: string | null; // <-- permite string, null ou undefined
    role: string;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setIsLoading(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const user: UserData = await response.json();
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(user);

      setLoginSuccess("Login realizado com sucesso!");
      setTimeout(() => navigate(user.has_onboarding ? "/dashboard" : "/onboarding"), 1000);

    } catch (err) {
      if (err instanceof Error) setLoginError(err.message);
      else setLoginError('Ocorreu um erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRegisterError(null);

    if (formData.password !== formData.confirmPassword) {
      setRegisterError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sanitizeInput(formData.name),
          email: sanitizeInput(formData.email),
          password: formData.password
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || "Erro ao cadastrar");
      }

      // Login automático após cadastro
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sanitizeInput(formData.email),
          password: formData.password
        }),
      });
      const loginData = await loginResponse.json();

      if (!loginResponse.ok || !loginData.id) {
        throw new Error(loginData.error || "Erro ao logar após cadastro.");
      }

      localStorage.setItem("user", JSON.stringify(loginData));
      localStorage.setItem("userId", String(loginData.id));
      if (loginData.curso_id !== undefined && loginData.curso_id !== null) {
        localStorage.setItem("cursoId", String(loginData.curso_id));
      } else {
        localStorage.removeItem("cursoId");
      }
      onLogin(loginData);

      setLoginSuccess("Cadastro e login realizados com sucesso!");
      setTimeout(() => navigate(loginData.has_onboarding ? "/dashboard" : "/onboarding"), 1000);

    } catch (err) {
      if (err instanceof Error) setRegisterError(err.message);
      else setRegisterError('Erro inesperado ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto shadow-lg rounded-xl border border-gray-200 bg-white/90 backdrop-blur-md py-4 px-2 md:px-4">
      <CardHeader className="space-y-1">
        <div className="flex flex-col items-center mb-1">
          <span className="flex items-center justify-center rounded-full shadow-lg bg-gradient-to-br from-cyan-400 to-blue-500 mb-2 w-12 h-12">
            <svg viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" aria-hidden="true" focusable="false">
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
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  required
                  className={loginError ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800">
                    Esqueceu a senha?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={loginError ? 'border-red-500' : ''}
                />
              </div>
              {loginError && (
                <div className="text-red-500 text-sm mt-2">
                  {loginError}
                </div>
              )}
              {loginSuccess && (
                <div className="text-green-600 text-sm mt-2">
                  {loginSuccess}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !formData.email || !formData.password}
                variant={loginError ? 'destructive' : 'default'}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Entrar
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" // <-- troque de "register-email" para "email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password" // <-- troque de "register-password" para "password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword" // <-- troque de "confirm-password" para "confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
              {registerError && (
                <div className="text-red-500 text-sm mt-2">
                  {registerError}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
