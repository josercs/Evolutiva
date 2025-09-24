import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AvatarProvider } from "./contexts/AvatarContext";
import { UserProvider } from './contexts/UserContext';
import { NotificationProvider } from "./components/notificacoes/NotificationProvider";
import Navbar from './components/navegacao/Navbar'; // default import
import Sidebar from './components/navegacao/Sidebar';
const HomePage = lazy(() => import('./pages/HomePage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CoursesIFRSPage = lazy(() => import('./pages/CoursesIFRSPage'));
const CoursesCTISMPage = lazy(() => import('./pages/CoursesCTISMPage'));
const CoursesMilitaresPage = lazy(() => import('./pages/CoursesMilitaresPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const TrilhasPage = lazy(() => import('./pages/TrilhasPage'));
const PaginaConteudo = lazy(() => import('./pages/PaginaConteudo_optimized'));
const PainelPage = lazy(() => import('./pages/PainelPage'));
const OnboardingWizard = lazy(() => import('./pages/Onboarding/OnboardingWizard'));
import { PlanoProvider } from "./contexts/PlanoContext";
import AgendasPage from './pages/AgendasPage';
import HabitosPage from './pages/HabitosPage';
import QuestoesPage from './pages/QuestoesPage';

import { AuthRoute } from './components/autenticacao/AuthRoute';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('user');
    setIsAuthenticated(!!user);
  }, []);

  return (
    <NotificationProvider>
      <AvatarProvider>
        <UserProvider>
          <PlanoProvider>
            <Router>
              <Navbar />
              <Sidebar />
              <Suspense fallback={<div className="pt-navbar ml-sidebar p-6 text-sm text-gray-500">Carregando módulo...</div>}>
              <Routes>
                {/* Rotas do aplicativo */}
                <Route
                  path="/login"
                  element={<AuthPage />}
                />
                <Route
                  path="/perfil"
                  element={
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/"
                  element={<HomePage />}
                />
                <Route
                  path="/cursos"
                  element={
                    <PrivateRoute>
                      <CoursesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cursos/ifrs"
                  element={
                    <PrivateRoute>
                      <CoursesIFRSPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cursos/ctism"
                  element={
                    <PrivateRoute>
                      <CoursesCTISMPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cursos/colegios-militares"
                  element={
                    <PrivateRoute>
                      <CoursesMilitaresPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/materias/:materiaId"
                  element={
                    <PrivateRoute>
                      <CourseDetailPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cursos/:courseId/aula/:lessonId"
                  element={
                    <PrivateRoute>
                      <LessonPage />
                    </PrivateRoute>
                  }
                />                
                
                <Route
                  path="/trilhas"
                  element={
                    <PrivateRoute>
                      <TrilhasPage />
                    </PrivateRoute>
                  }
                />
                <Route path="/conteudo/:id" element={<PaginaConteudo />} />
                <Route
                  path="/painel"
                  element={
                    <PrivateRoute>
                      <PainelPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/questoes"
                  element={
                    <PrivateRoute>
                      <QuestoesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/progresso"
                  element={<Navigate to="/painel" replace />}
                />
                <Route
                  path="/onboarding"
                  element={
                    <PrivateRoute>
                      <OnboardingWizard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cursos/:courseId/materias"
                  element={
                    <PrivateRoute>
                      <CoursesIFRSPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/agendas"
                  element={
                    <PrivateRoute>
                      <AgendasPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/habitos"
                  element={
                    <PrivateRoute>
                      <HabitosPage />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              </Suspense>
            </Router>
          </PlanoProvider>
        </UserProvider>
      </AvatarProvider>
    </NotificationProvider>
  );
}

export default App;
