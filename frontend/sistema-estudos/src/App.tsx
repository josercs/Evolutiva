import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AvatarProvider } from "./contexts/AvatarContext";
import { UserProvider } from './contexts/UserContext';
import { NotificationProvider } from "./components/notificacoes/NotificationProvider";
import Navbar from './components/navegacao/Navbar'; // default import
import Sidebar from './components/navegacao/Sidebar';
import HomePage from './pages/HomePage';
import CoursesPage from './pages/CoursesPage';
import CoursesIFRSPage from './pages/CoursesIFRSPage';
import CoursesCTISMPage from './pages/CoursesCTISMPage';
import CoursesMilitaresPage from './pages/CoursesMilitaresPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LessonPage from './pages/LessonPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import TrilhasPage from './pages/TrilhasPage';
import PaginaConteudo from "./pages/PaginaConteudo_optimized";
import PainelPage from "./pages/PainelPage";
import OnboardingWizard from './pages/Onboarding/OnboardingWizard';
import { PlanoProvider } from "./contexts/PlanoContext";

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
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </PlanoProvider>
        </UserProvider>
      </AvatarProvider>
    </NotificationProvider>
  );
}

export default App;
