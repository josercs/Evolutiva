import { API_BASE_URL } from "../../config";

export async function enviarOnboarding(dados: any) {
  console.log("Enviando para o backend:", dados); // Adicione este log
  const resp = await fetch("/api/onboarding", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro ao enviar onboarding");
  }
  return resp.json();
}

export async function getOnboardingStatus(userId: string) {
  const resp = await fetch(`/api/onboarding/status/${userId}`, {
    method: "GET",
    credentials: "include",
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro ao obter status do onboarding");
  }
  return resp.json();
}

// Exemplo de uso:
// fetch(`${API_BASE_URL}/api/usuarios/avatar?email=${encodeURIComponent(email)}`)