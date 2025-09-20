import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { BookOpen, CheckCircle, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LessonOption {
  id: number;
  content: string;
  isCorrect: boolean;
}

interface LessonQuestion {
  id: number;
  content: string;
  options: LessonOption[];
}

interface LessonQuiz {
  id: number;
  title: string;
  questions: LessonQuestion[];
}

interface Lesson {
  id: number;
  title: string;
  content: string;
  duration: string;
  hasQuiz: boolean;
  quiz: LessonQuiz;
  prevLesson: number | null;
  nextLesson: number | null;
}

interface Course {
  id: number;
  title: string;
  progress: number;
}

const LessonPage = () => {
  const { courseId, lessonId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  
  useEffect(() => {
    // Simulação de carregamento de dados da lição da API
    const fetchLessonData = async () => {
      try {
        // Em uma implementação real, isso seria uma chamada à API
        setTimeout(() => {
          // Dados simulados da lição
          const mockLesson = {
            id: parseInt(lessonId ?? '0'),
            title: 'Equações de 1º Grau',
            content: `
              <h2>Introdução às Equações de 1º Grau</h2>
              <p>Uma equação de 1º grau, também chamada de equação linear, é uma igualdade que envolve uma expressão algébrica de 1º grau.</p>
              <p>A forma geral de uma equação de 1º grau com uma incógnita é:</p>
              <div class="math-formula">ax + b = 0</div>
              <p>Onde:</p>
              <ul>
                <li><strong>a</strong> é o coeficiente da incógnita (a ≠ 0)</li>
                <li><strong>b</strong> é o termo independente</li>
                <li><strong>x</strong> é a incógnita (valor desconhecido)</li>
              </ul>
              
              <h3>Como resolver uma equação de 1º grau</h3>
              <p>Para resolver uma equação de 1º grau, devemos isolar a incógnita em um dos lados da igualdade. Vamos ver um exemplo:</p>
              
              <div class="example">
                <p><strong>Exemplo 1:</strong> Resolver a equação 3x + 12 = 0</p>
                <p>Passo 1: Subtrair 12 de ambos os lados</p>
                <p>3x + 12 - 12 = 0 - 12</p>
                <p>3x = -12</p>
                <p>Passo 2: Dividir ambos os lados por 3</p>
                <p>3x/3 = -12/3</p>
                <p>x = -4</p>
                <p>Portanto, a solução da equação 3x + 12 = 0 é x = -4</p>
              </div>
            `,
            duration: '20 min',
            hasQuiz: true,
            quiz: {
              id: 1,
              title: 'Quiz - Equações de 1º Grau',
              questions: [
                {
                  id: 1,
                  content: 'Qual é a solução da equação 2x + 6 = 0?',
                  options: [
                    { id: 1, content: 'x = -3', isCorrect: true },
                    { id: 2, content: 'x = 3', isCorrect: false },
                    { id: 3, content: 'x = -6', isCorrect: false },
                    { id: 4, content: 'x = 6', isCorrect: false }
                  ]
                },
                {
                  id: 2,
                  content: 'Se 5x - 10 = 0, então x é igual a:',
                  options: [
                    { id: 5, content: 'x = -2', isCorrect: false },
                    { id: 6, content: 'x = 2', isCorrect: true },
                    { id: 7, content: 'x = -5', isCorrect: false },
                    { id: 8, content: 'x = 5', isCorrect: false }
                  ]
                }
              ]
            },
            prevLesson: parseInt(lessonId ?? '0') > 1 ? parseInt(lessonId ?? '0') - 1 : null,
            nextLesson: parseInt(lessonId ?? '0') < 6 ? parseInt(lessonId ?? '0') + 1 : null
          };
          
          // Dados simulados do curso
          const mockCourse = {
            id: parseInt(courseId ?? '0'),
            title: 'Matemática - Ensino Médio',
            progress: 16
          };
          
          setLesson(mockLesson);
          setCourse(mockCourse);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar dados da lição:', error);
        setIsLoading(false);
      }
    };
    
    fetchLessonData();
  }, [courseId, lessonId]);

  const [activeTab, setActiveTab] = useState('content');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const handleAnswerSelect = (questionId: number, optionId: number) => {
    setQuizAnswers({
      ...quizAnswers,
      [questionId]: optionId
    });
  };

  const handleQuizSubmit = () => {
    if (!lesson || !lesson.quiz) return;
    
    let correctAnswers = 0;
    lesson.quiz.questions.forEach(question => {
      const selectedOptionId = quizAnswers[question.id];
      const correctOption = question.options.find(option => option.isCorrect);
      
      if (correctOption && selectedOptionId === correctOption.id) {
        correctAnswers++;
      }
    });
    
    const score = Math.round((correctAnswers / lesson.quiz.questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  return (
  <div className="relative ml-sidebar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 py-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : lesson && course ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <Link to={`/cursos/${courseId}`} className="text-blue-600 hover:text-blue-800 flex items-center mb-2">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar para {course.title}
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">{lesson.title}</h1>
                <div className="flex items-center mt-2 text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{lesson.duration}</span>
                </div>
              </div>
              <div className="w-full md:w-64">
                <p className="text-sm text-gray-600 mb-1">Progresso do curso</p>
                <Progress value={course.progress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1 text-right">{course.progress}% concluído</p>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="quiz" disabled={!lesson.hasQuiz}>Quiz</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }}></div>
                    
                    <div className="mt-8 flex justify-between">
                      {lesson.prevLesson ? (
                        <Link to={`/cursos/${courseId}/aula/${lesson.prevLesson}`}>
                          <Button variant="outline" className="flex items-center">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Aula Anterior
                          </Button>
                        </Link>
                      ) : (
                        <div></div>
                      )}
                      
                      {lesson.nextLesson ? (
                        <Link to={`/cursos/${courseId}/aula/${lesson.nextLesson}`}>
                          <Button className="flex items-center">
                            Próxima Aula
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      ) : (
                        <Button className="flex items-center">
                          Concluir Módulo
                          <CheckCircle className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="quiz" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {!quizSubmitted ? (
                      <>
                        <h2 className="text-xl font-bold mb-4">{lesson.quiz.title}</h2>
                        <div className="space-y-6">
                          {lesson.quiz.questions.map((question, index) => (
                            <div key={question.id} className="p-4 border rounded-lg">
                              <h3 className="font-medium mb-3">
                                {index + 1}. {question.content}
                              </h3>
                              <div className="space-y-2">
                                {question.options.map((option) => (
                                  <div key={option.id} className="flex items-center">
                                    <input
                                      type="radio"
                                      id={`q${question.id}-o${option.id}`}
                                      name={`question-${question.id}`}
                                      className="mr-2"
                                      checked={quizAnswers[question.id] === option.id}
                                      onChange={() => handleAnswerSelect(question.id, option.id)}
                                    />
                                    <label htmlFor={`q${question.id}-o${option.id}`}>
                                      {option.content}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex justify-end">
                          <Button onClick={handleQuizSubmit}>Enviar Respostas</Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 text-blue-800 text-3xl font-bold">
                            {quizScore}%
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">
                          {quizScore >= 70 ? 'Parabéns!' : 'Continue Praticando!'}
                        </h2>
                        <p className="text-gray-600 mb-6">
                          {quizScore >= 70
                            ? 'Você completou este quiz com sucesso!'
                            : 'Revise o conteúdo e tente novamente.'}
                        </p>
                        <div className="flex justify-center space-x-4">
                          <Button variant="outline" onClick={() => setQuizSubmitted(false)}>
                            Tentar Novamente
                          </Button>
                          {lesson.nextLesson && (
                            <Link to={`/cursos/${courseId}/aula/${lesson.nextLesson}`}>
                              <Button>Próxima Aula</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-700">Aula não encontrada</h3>
            <p className="text-gray-500 mt-2">A aula solicitada não está disponível.</p>
            <Link to={`/cursos/${courseId}`}>
              <Button className="mt-4">Voltar para o Curso</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonPage;
