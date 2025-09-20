import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { Progress } from "../components/ui/progress";

const API_URL = "http://localhost:5000";

type Progress = {
  completed: number;
  total: number;
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    Promise.all([
      fetch(`/api/progress?email=${user.email}`).then((res) =>
        res.ok ? res.json() : null
      ),
      fetch(`/api/usuarios/avatar?email=${encodeURIComponent(user.email)}`).then(
        (res) => res.json()
      ),
    ]).then(([progressData, avatarData]) => {
      if (progressData?.progress) setProgress(progressData.progress);
      if (avatarData?.avatarUrl) setAvatarUrl(avatarData.avatarUrl);
    });
  }, [user?.email]);

  function handleLogout() {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  if (!user || !user.email) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-xl font-bold mb-4">Perfil</h1>
        <p>Usuário não encontrado.</p>
      </div>
    );
  }

  return (
  <main className="relative ml-sidebar max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-navbar py-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(14,165,233,0.08),transparent),radial-gradient(700px_420px_at_95%_-5%,rgba(37,99,235,0.06),transparent)]" />
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Perfil do Usuário</h1>

        <div className="flex flex-col items-center mb-6">
          {avatarUrl ? (
            <img
              src={
                avatarUrl.startsWith("http")
                  ? avatarUrl
                  : `${API_URL}${avatarUrl}`
              }
              alt="Avatar do estudante"
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
              <User className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        <div className="mb-2">
          <strong>Nome:</strong> {user.name}
        </div>
        <div className="mb-2">
          <strong>Email:</strong> {user.email}
        </div>
        <div className="mb-4">
          <strong>Função:</strong> {user.role}
        </div>

        {progress ? (
          <div className="mt-2">
            <strong>
              Progresso: {progress.completed} de {progress.total} aulas concluídas
            </strong>
            <div className="mt-2">
              <Progress value={Math.min(100, Math.max(0, (progress.completed / progress.total) * 100))} className="h-2 bg-sky-100" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">Carregando progresso...</p>
        )}

    <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <button
      className="px-4 py-2 rounded text-white bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-700 hover:to-blue-600 transition"
            onClick={() => navigate("/cursos")}
          >
            Ver Cursos
          </button>
          <button
      className="px-4 py-2 rounded text-white bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-700 hover:to-blue-600 transition"
            onClick={() => navigate("/progresso")}
          >
            Meu Progresso
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded"
            onClick={() => navigate("/")}
          >
            Voltar para Home
          </button>
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;