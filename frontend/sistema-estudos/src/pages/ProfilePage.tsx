import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

type Progress = {
  completed: number;
  total: number;
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    if (user.email) {
      fetch(`/api/progress?email=${user.email}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.progress) setProgress(data.progress);
        });
    }
  }, [user.email]);

  useEffect(() => {
    if (user.email) {
      fetch(`/api/usuarios/avatar?email=${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((data) => setAvatarUrl(data.avatarUrl || ""));
    }
  }, [user.email]);

  if (!user || !user.email) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-xl font-bold mb-4">Perfil</h1>
        <p>Usuário não encontrado.</p>
      </div>
    );
  }

  function handleLogout() {
    // Limpa dados do usuário
    localStorage.removeItem("userEmail");
    localStorage.removeItem("user");
    // Se usar token:
    // localStorage.removeItem("token");
    // Limpe o estado do avatar se estiver em contexto/global
    // setAvatarUrl(""); // Se usar useState ou contexto
    // Redirecione
    window.location.href = "/";
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Perfil do Usuário</h1>
      <div className="mb-2">
        <strong>Nome:</strong> {user.name}
      </div>
      <div className="mb-2">
        <strong>Email:</strong> {user.email}
      </div>
      <div className="mb-4">
        <strong>Função:</strong> {user.role}
      </div>
      {progress && (
        <div className="mt-2">
          <strong>
            Progresso: {progress.completed} de {progress.total} aulas concluídas
          </strong>
          <div className="w-full bg-gray-200 rounded h-2 mt-1">
            <div
              className="bg-green-500 h-2 rounded"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      <div className="flex flex-col items-center mb-6">
        {avatarUrl ? (
          <img
            src={
              avatarUrl.startsWith("http")
                ? avatarUrl
                : `http://localhost:5000${avatarUrl}`
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
      <div className="mt-4 flex gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => navigate("/cursos")}
        >
          Ver Cursos
        </button>
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded"
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
  );
};

export default ProfilePage;