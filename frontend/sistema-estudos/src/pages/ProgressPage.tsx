import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import ProgressDashboard from '../components/ProgressDashboard';

type Achievement = {
  id: number;
  title: string;
  description: string;
  date: string;
};

type Activity = {
  id: number;
  type: string;
  title: string;
  date: string;
};

type ProgressData = {
  userName: string;
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  studyTime: number;
  achievements: Achievement[];
  recentActivity: Activity[];
};

const ProgressPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  
  useEffect(() => {
    // Simulação de carregamento de dados de progresso da API
    const fetchProgressData = async () => {
      try {
        // Em uma implementação real, isso seria uma chamada à API
        setTimeout(() => {
          const mockProgressData = {
            userName: 'João Silva',
            totalCourses: 6,
            completedCourses: 0,
            totalLessons: 26,
            completedLessons: 3,
            studyTime: 4.5,
            achievements: [
              {
                id: 1,
                title: 'Primeiro Login',
                description: 'Bem-vindo ao EduAutônomo!',
                date: '23 de maio, 2025'
              },
              {
                id: 2,
                title: 'Primeira Lição Concluída',
                description: 'Você concluiu sua primeira lição!',
                date: '23 de maio, 2025'
              }
            ],
            recentActivity: [
              {
                id: 1,
                type: 'lesson',
                title: 'Acessou a lição "Equações de 2º Grau"',
                date: '23 de maio, 2025 - 15:30'
              },
              {
                id: 2,
                type: 'quiz',
                title: 'Completou o quiz "Equações de 1º Grau"',
                date: '23 de maio, 2025 - 14:45'
              },
              {
                id: 3,
                type: 'lesson',
                title: 'Completou a lição "Equações de 1º Grau"',
                date: '23 de maio, 2025 - 14:30'
              }
            ]
          };
          setProgressData(mockProgressData);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar dados de progresso:', error);
        setIsLoading(false);
      }
    };
    
    fetchProgressData();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Meu Progresso</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : progressData ? (
        <ProgressDashboard
          userName={progressData.userName}
          totalCourses={progressData.totalCourses}
          completedCourses={progressData.completedCourses}
          totalLessons={progressData.totalLessons}
          completedLessons={progressData.completedLessons}
          studyTime={progressData.studyTime}
          achievements={progressData.achievements}
          recentActivity={progressData.recentActivity}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-700">Nenhum dado de progresso encontrado</h3>
            <p className="text-gray-500 mt-2">Comece a estudar para ver seu progresso aqui.</p>
            <Button className="mt-4">Explorar Cursos</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProgressPage;
