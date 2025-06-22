export function useAuth() {
  // Exemplo: pegue o userId do localStorage
  const userId = localStorage.getItem("userId") || "1";
  return { userId };
}