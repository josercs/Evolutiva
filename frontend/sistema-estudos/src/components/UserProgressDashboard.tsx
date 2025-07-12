import { BookOpen, Clock, Star, Award } from "lucide-react";
import { Progress } from "./ui/progress";
import { UserProgress } from "./conteudo/UserProgress";

interface UserProgressDashboardProps {
  user: {
    name: string;
    avatarUrl?: string;
    level: number;
    badges: string[];
    xp: number;
    streak: number;
  };
  progresso: { materia: string; percent: number }[];
  achievements: { id: number; title: string; description: string; date: string }[];
  studyTime?: string;
}

const UserProgressDashboard = ({
  user,
  progresso,
  achievements,
  studyTime = "2h15min"
}: UserProgressDashboardProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl.startsWith("http") ? user.avatarUrl : `http://localhost:5000${user.avatarUrl}`}
            alt="Avatar"
            className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
            <Star className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div>
          <div className="font-bold text-lg">{user.name}</div>
          <div className="flex items-center gap-1">
            <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">XP: {user.xp}</span>
            <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">Nível {user.level}</span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">🔥 {user.streak} dias</span>
          </div>
          <div className="flex gap-1 mt-1">
            {user.badges.map(badge => (
              <span key={badge} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{badge}</span>
            ))}
          </div>
        </div>
      </div>

      {/* UserProgress component for XP and streak */}
      <UserProgress xp={user.xp} streak={user.streak} />

      <div>
        <h3 className="text-lg font-bold mb-2">Progresso por Matéria</h3>
        <div className="space-y-2">
          {progresso.map((item) => (
            <div key={item.materia}>
              <div className="flex justify-between text-sm font-medium">
                <span>{item.materia}</span>
                <span>{item.percent}%</span>
              </div>
              <Progress value={item.percent} className="h-2 bg-indigo-100" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold mb-2">Conquistas</h3>
        <div className="flex flex-wrap gap-2">
          {achievements.map((ach) => (
            <div key={ach.id} className="bg-yellow-100 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Award className="h-4 w-4 text-yellow-400" /> {ach.title}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Clock className="h-6 w-6 text-indigo-600" />
        <span className="font-semibold">Tempo de estudo hoje: {studyTime}</span>
      </div>
    </div>
  );
};

export default UserProgressDashboard;
