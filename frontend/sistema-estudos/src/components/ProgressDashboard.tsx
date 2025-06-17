import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { BookOpen, CheckCircle, Clock, Award, BarChart2 } from 'lucide-react';

interface ProgressDashboardProps {
  userName: string;
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  studyTime: number;
  achievements: {
    id: number;
    title: string;
    description: string;
    date: string;
  }[];
  recentActivity: {
    id: number;
    type: string;
    title: string;
    date: string;
  }[];
}

const ProgressDashboard = ({
  userName,
  totalCourses,
  completedCourses,
  totalLessons,
  completedLessons,
  studyTime,
  achievements,
  recentActivity
}: ProgressDashboardProps) => {
  const courseProgress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  const lessonProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-2">Progresso dos Cursos</h3>
            <Progress value={courseProgress} className="h-2 mb-2" />
            <p className="text-sm text-gray-500">{completedCourses} de {totalCourses} cursos concluídos</p>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-2">Progresso das Aulas</h3>
            <Progress value={lessonProgress} className="h-2 mb-2" />
            <p className="text-sm text-gray-500">{completedLessons} de {totalLessons} aulas concluídas</p>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-2">Tempo de Estudo</h3>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-indigo-600 mr-2" />
              <span className="text-2xl font-bold">{studyTime}h</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Total acumulado</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="achievements">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="activity">Atividade Recente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="achievements" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-start">
                    <Award className="h-6 w-6 text-yellow-500 mr-3 mt-1" />
                    <div>
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{achievement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start">
                    {activity.type === 'lesson' ? (
                      <BookOpen className="h-5 w-5 text-blue-500 mr-3 mt-1" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1" />
                    )}
                    <div>
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-xs text-gray-400">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressDashboard;
